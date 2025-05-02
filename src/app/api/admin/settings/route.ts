import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

// Helper to check for Admin role
async function isAdmin(request: Request): Promise<boolean> {
  const session = await getServerSession(authOptions);
  // Ensure user is logged in and has the 'Admin' role
  // Note: Role name comparison should be case-insensitive or standardized
  return !!session?.user?.role && session.user.role.toUpperCase() === 'ADMIN';
}

// GET /api/admin/settings - Fetch all application settings
export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
  }
  
  try {
    const settings = await prisma.setting.findMany();
    // Convert array of {key, value} to a single object {key1: value1, key2: value2}
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json(settingsObject, { status: 200 });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: 'Failed to fetch settings.' }, { status: 500 });
  }
}

// PUT /api/admin/settings - Update application settings (bulk update)
export async function PUT(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
  }
  
  try {
    const body = await request.json() as Record<string, any>;
    
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body. Expected an object of settings.' }, { status: 400 });
    }
    
    const updatePromises = Object.entries(body).map(([key, value]) => {
      // Basic validation: ensure key is string and value is not undefined
      if (typeof key !== 'string' || value === undefined) {
        console.warn(`Skipping invalid setting update: key=${key}, value=${value}`);
        return Promise.resolve(null); // Skip invalid entries
      }
      
      // Use upsert to create or update the setting
      return prisma.setting.upsert({
        where: { key: key },
        update: { value: value as any }, // Prisma expects JsonValue type
        create: { key: key, value: value as any },
      });
    });
    
    await Promise.all(updatePromises.filter(p => p !== null));
    
    // Fetch the updated settings to return
    const updatedSettings = await prisma.setting.findMany();
    const settingsObject = updatedSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json(settingsObject, { status: 200 });
  } catch (error) {
    console.error("Error updating settings:", error);
    // Check for specific Prisma errors if needed
    return NextResponse.json({ error: 'Failed to update settings.' }, { status: 500 });
  }
}
