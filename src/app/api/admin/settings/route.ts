import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 60; // Max execution time in seconds

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

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

// GET /api/admin/settings - Fetch all application settings
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403, headers });
    }
    
    // Apply timeout to database query
    const settings = await withTimeout(prisma.setting.findMany());
    
    // Convert array of {key, value} to a single object {key1: value1, key2: value2}
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
    
    // For GET requests that can be cached in certain scenarios
    const cacheHeaders = {
      ...headers,
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
    };
    
    return NextResponse.json(settingsObject, { status: 200, headers: cacheHeaders });
  } catch (error) {
    captureError(error, 'settings-api');
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: 'Failed to fetch settings.' }, { status: 500, headers });
  }
}

// PUT /api/admin/settings - Update application settings (bulk update)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403, headers });
    }
    
    const body = await request.json() as Record<string, any>;
    
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body. Expected an object of settings.' }, { status: 400, headers });
    }
    
    // Use a transaction for all updates to ensure atomicity
    const updatedSettings = await prisma.$transaction(async (tx) => {
      // Array to collect valid updates
      const updateOperations = [];
      
      for (const [key, value] of Object.entries(body)) {
        // Basic validation: ensure key is string and value is not undefined
        if (typeof key !== 'string' || value === undefined) {
          console.warn(`Skipping invalid setting update: key=${key}, value=${value}`);
          continue; // Skip invalid entries
        }
        
        // Add the upsert operation to our array
        updateOperations.push(
          tx.setting.upsert({
            where: { key },
            update: { value: value as Prisma.JsonValue },
            create: { key, value: value as Prisma.JsonValue },
          })
        );
      }
      
      // Execute all updates in parallel within the transaction
      await Promise.all(updateOperations);
      
      // Fetch the updated settings to return
      return tx.setting.findMany();
    });
    
    // Convert to object format
    const settingsObject = updatedSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json(settingsObject, { status: 200, headers });
  } catch (error) {
    captureError(error, 'settings-api');
    console.error("Error updating settings:", error);
    
    // Safer error handling without instanceof
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      return NextResponse.json({ 
        error: `Database error: ${prismaError.message || 'Unknown error'}` 
      }, { status: 500, headers });
    }
    
    return NextResponse.json({ error: 'Failed to update settings.' }, { status: 500, headers });
  }
}
