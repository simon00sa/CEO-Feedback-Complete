import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma'; // Import Prisma client instance
import { Prisma } from '@prisma/client'; // Import Prisma namespace directly from @prisma/client

// Configure for Netlify serverless functions
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'admin-settings'
};

// Timeout constant for Netlify serverless
const TIMEOUT = 20000; // 20 seconds (below Netlify's limit)

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

// Helper to check for Admin role
async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return false;
    }
    
    // Use withTimeout to prevent hanging in serverless
    const user = await withTimeout(
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { role: true },
      }),
      8000 // 8 seconds timeout
    );
    
    return !!user && user.role?.name?.toUpperCase() === 'ADMIN';
  } catch (error) {
    captureError(error, 'admin-check');
    return false; // Default to false on error for security
  }
}

// POST /api/admin/settings - Update application settings
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { 
          error: 'Forbidden: Requires Admin role.',
          timestamp: new Date().toISOString()
        },
        { status: 403, headers }
      );
    }
    
    const body = await request.json();
    
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { 
          error: 'Invalid request body. Expected an object of settings.',
          timestamp: new Date().toISOString()
        },
        { status: 400, headers }
      );
    }
    
    // Use a transaction for all updates to ensure atomicity
    // Add timeout to prevent hanging in serverless environment
    const updatedSettings = await withTimeout(
      prisma.$transaction(async (tx) => {
        return Object.entries(body).reduce(async (accPromise, [key, value]) => {
          const acc = await accPromise;
          
          // Ensure value is not null and cast it to InputJsonValue
          const normalizedValue = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
          
          await tx.setting.upsert({
            where: { key },
            update: { value: normalizedValue },
            create: { key, value: normalizedValue },
          });
          
          return { ...acc, [key]: normalizedValue };
        }, Promise.resolve({}));
      }),
      15000 // 15 seconds for transaction timeout
    );
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        ...updatedSettings,
        meta: {
          responseTimeMs: responseTime,
          netlifyContext: process.env.CONTEXT || 'unknown',
          timestamp: new Date().toISOString()
        }
      }, 
      { 
        status: 200, 
        headers: {
          ...headers,
          'X-Response-Time': `${responseTime}ms`
        }
      }
    );
  } catch (error) {
    captureError(error, 'admin-settings-update');
    console.error('Error updating settings:', error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      { 
        error: 'Failed to update settings.',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime
      },
      { status: 500, headers }
    );
  }
}
