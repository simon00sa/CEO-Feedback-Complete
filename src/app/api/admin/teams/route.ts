import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 60; // Max execution time in seconds

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

// Validation schema for team creation
const TeamCreateSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  displayGroup: z.string().optional(),
});

// Timeout constant for long-running operations
const TIMEOUT = 30000; // 30 seconds

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), TIMEOUT)
    )
  ]) as Promise<T>;
}

// Helper function to capture and log errors
function captureError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  // Add your error monitoring service here if needed
}

// Helper to check for Admin role
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  });
  
  return !!user && user.role?.name?.toUpperCase() === 'ADMIN';
}

// GET /api/admin/teams - Fetch all teams
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403, headers });
    }
    
    // Parse pagination parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Apply timeout to database query
    // FIXED: Cannot use both include and select at the root level
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
    
    return NextResponse.json(formattedTeams, { 
      status: 200, 
      headers: cacheHeaders
    });
  } catch (error) {
    captureError(error, 'teams-api');
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: 'Failed to fetch teams.' }, { status: 500, headers });
  }
}

// POST /api/admin/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403, headers });
    }
    
    const body = await request.json();
    const validatedData = TeamCreateSchema.parse(body);
    
    const { name, displayGroup } = validatedData;
    const trimmedName = name.trim();
    const trimmedDisplayGroup = displayGroup?.trim() || trimmedName;
    
    // Use Prisma transaction for data integrity
    const newTeam = await prisma.$transaction(async (tx) => {
      // Check for existing team within transaction
      const existingTeam = await tx.team.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' } }
      });
      
      if (existingTeam) {
        throw new Error(`Team with name "${trimmedName}" already exists.`);
      }
      
      // Create new team
      return tx.team.create({
        data: {
          name: trimmedName,
          displayGroup: trimmedDisplayGroup,
          isAnonymous: true,
          lastActiveCheck: new Date(),
        },
      });
    });
    
    return NextResponse.json(newTeam, { status: 201, headers });
  } catch (error) {
    captureError(error, 'teams-api');
    console.error("Error creating team:", error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409, headers });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400, headers });
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A team with this name already exists.' }, { status: 409, headers });
    }
    
    return NextResponse.json({ error: 'Failed to create team.' }, { status: 500, headers });
  }
}

// PUT /api/admin/teams/[teamId] - Update a team
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403, headers });
    }
    
    const url = new URL(request.url);
    const teamId = url.pathname.split('/').pop();
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400, headers });
    }
    
    const body = await request.json();
    const validatedData = TeamCreateSchema.parse(body);
    
    const { name, displayGroup } = validatedData;
    const trimmedName = name.trim();
    const trimmedDisplayGroup = displayGroup?.trim() || trimmedName;
    
    // Use Prisma transaction for data integrity
    const updatedTeam = await prisma.$transaction(async (tx) => {
      const existingTeam = await tx.team.findUnique({ where: { id: teamId } });
      
      if (!existingTeam) {
        throw new Error('Team not found.');
      }
      
      if (trimmedName !== existingTeam.name) {
        const nameConflict = await tx.team.findFirst({
          where: { name: { equals: trimmedName, mode: 'insensitive' }, id: { not: teamId } }
        });
        
        if (nameConflict) {
          throw new Error(`Team with name "${trimmedName}" already exists.`);
        }
      }
      
      return tx.team.update({
        where: { id: teamId },
        data: {
          name: trimmedName,
          displayGroup: trimmedDisplayGroup,
        },
      });
    });
    
    return NextResponse.json(updatedTeam, { status: 200, headers });
  } catch (error) {
    captureError(error, 'teams-api');
    console.error("Error updating team:", error);
    
    if (error instanceof Error) {
      if (error.message === 'Team not found.') {
        return NextResponse.json({ error: error.message }, { status: 404, headers });
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409, headers });
      }
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400, headers });
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Team not found.' }, { status: 404, headers });
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'A team with this name already exists.' }, { status: 409, headers });
      }
    }
    
    return NextResponse.json({ error: 'Failed to update team.' }, { status: 500, headers });
  }
}

// DELETE /api/admin/teams/[teamId] - Delete a team
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403, headers });
    }
    
    const url = new URL(request.url);
    const teamId = url.pathname.split('/').pop();
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400, headers });
    }
    
    // Use Prisma transaction for data integrity
    await prisma.$transaction(async (tx) => {
      const existingTeam = await tx.team.findUnique({
        where: { id: teamId },
        include: { _count: { select: { members: true } } }
      });
      
      if (!existingTeam) {
        throw new Error('Team not found.');
      }
      
      if (existingTeam._count.members > 0) {
        throw new Error('Cannot delete team with active members. Please reassign members first.');
      }
      
      await tx.team.delete({ where: { id: teamId } });
    });
    
    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (error) {
    captureError(error, 'teams-api');
    console.error("Error deleting team:", error);
    
    if (error instanceof Error) {
      if (error.message === 'Team not found.') {
        return NextResponse.json({ error: error.message }, { status: 404, headers });
      }
      if (error.message.includes('Cannot delete team with active members')) {
        return NextResponse.json({ 
          error: error.message 
        }, { status: 400, headers });
      }
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404, headers });
    }
    
    return NextResponse.json({ error: 'Failed to delete team.' }, { status: 500, headers });
  }
}
