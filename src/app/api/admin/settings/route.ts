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

// Helper to check for Admin role
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });

  return !!user && user.role?.name?.toUpperCase() === 'ADMIN';
}

// GET /api/admin/settings - Fetch all application settings
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Forbidden: Requires Admin role.' },
        { status: 403, headers }
      );
    }

    // Fetch all settings from the database
    const settings = await prisma.setting.findMany();
    
    return NextResponse.json(settings, { status: 200, headers });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings.' },
      { status: 500, headers }
    );
  }
}

// POST /api/admin/settings - Update application settings
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Forbidden: Requires Admin role.' },
        { status: 403, headers }
      );
    }

    const body = await request.json();
    
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an object of settings.' },
        { status: 400, headers }
      );
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
          tx.setting.upsert({  // Using singular form "setting"
            where: { key },
            update: { value: value as Prisma.JsonValue },
            create: { key, value: value as Prisma.JsonValue },
          })
        );
      }
      
      // Execute all updates in parallel within the transaction
      await Promise.all(updateOperations);
      
      // Fetch the updated settings to return
      return tx.setting.findMany();  // Using singular form "setting"
    });
    
    // Convert to object format
    const settingsObject = updatedSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json(settingsObject, { status: 200, headers });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings.' },
      { status: 500, headers }
    );
  }
}
