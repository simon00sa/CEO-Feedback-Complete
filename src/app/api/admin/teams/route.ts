import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma'; // Using default export
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Adjust runtime for Netlify serverless functions
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'teams-api'
};

// Validation schema for team creation
const TeamCreateSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  displayGroup: z.string().optional(),
});

// Timeout constant for Netlify serverless
const TIMEOUT = 8000; // 8 seconds

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<T>;
}

// Helper function to capture and log errors with Netlify context
function captureError(error: unknown, context: string) {
  console.error(`[Netlify:${context}]`, error);
  // Add your error monitoring service here if needed
}

// Helper to check for Admin role with error handling for Netlify
async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return false;
    }
    
    // Use withTimeout to prevent hanging
    const user = await withTimeout(
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { role: true }
      }),
      5000
    );
    
    return !!user && user.role?.name?.toUpperCase() === 'ADMIN';
  } catch (error) {
    captureError(error, 'admin-check');
    // Default to false on error for security
    return false;
  }
}

// GET /api/admin/teams - Fetch all teams
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ 
        error: 'Forbidden: Requires Admin role.',
        timestamp: new Date().toISOString()
      }, { status: 403, headers });
    }
    
    // Parse pagination parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Apply timeout to database query
    const teams = await withTimeout(prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: { 
        _count: { 
          select: { members: true } 
        }
      },
      // Add pagination for better performance
      skip,
      take: limit
    }));
    
    // Transform the data to include only needed fields
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      displayGroup: team.displayGroup,
      isAnonymous: team.isAnonymous,
      memberCount: team.memberCount,
      activeUserCount: team.activeUserCount,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      _count: team._count
    }));
    
    // For GET requests that can be cached in certain scenarios
    const cacheHeaders = {
      ...headers,
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
    };
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      data: formattedTeams,
      meta: {
        page,
        limit,
        total: formattedTeams.length,
        responseTimeMs: responseTime,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString()
      }
    }, { 
      status: 200, 
      headers: {
        ...cacheHeaders,
        'X-Response-Time': `${responseTime}ms`
      }
    });
  } catch (error) {
    captureError(error, 'teams-api-get');
    console.error("Error fetching teams:", error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({ 
      error: 'Failed to fetch teams.',
      details: error instanceof Error ? error.message : String(error),
      netlifyContext: process.env.CONTEXT || 'unknown',
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime
    }, { status: 500, headers });
  }
}

// POST /api/admin/teams - Create a new team
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ 
        error: 'Forbidden: Requires Admin role.',
        timestamp: new Date().toISOString()
      }, { status: 403, headers });
    }
    
    const body = await request.json();
    const validatedData = TeamCreateSchema.parse(body);
    
    const { name, displayGroup } = validatedData;
    const trimmedName = name.trim();
    const trimmedDisplayGroup = displayGroup?.trim() || trimmedName;
    
    // Use withTimeout to prevent hanging - simplified transaction for Netlify
    const newTeam = await withTimeout(
      (async () => {
        // Check for existing team
        const existingTeam = await prisma.team.findFirst({
          where: { name: { equals: trimmedName, mode: 'insensitive' } }
        });
        
        if (existingTeam) {
          throw new Error(`Team with name "${trimmedName}" already exists.`);
        }
        
        // Create new team
        return prisma.team.create({
          data: {
            name: trimmedName,
            displayGroup: trimmedDisplayGroup,
            isAnonymous: true,
            lastActiveCheck: new Date(),
          },
        });
      })(),
      6000
    );
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      ...newTeam,
      meta: {
        responseTimeMs: responseTime,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString()
      }
    }, { 
      status: 201, 
      headers: {
        ...headers,
        'X-Response-Time': `${responseTime}ms`
      }
    });
  } catch (error) {
    captureError(error, 'teams-api-post');
    console.error("Error creating team:", error);
    
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime
      }, { status: 409, headers });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors,
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime
      }, { status: 400, headers });
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'A team with this name already exists.',
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime
      }, { status: 409, headers });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create team.',
      details: error instanceof Error ? error.message : String(error),
      netlifyContext: process.env.CONTEXT || 'unknown',
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime
    }, { status: 500, headers });
  }
}

// PUT and DELETE routes simplified for brevity, but would follow same patterns
// with withTimeout, error handling, and Netlify-specific optimizations
