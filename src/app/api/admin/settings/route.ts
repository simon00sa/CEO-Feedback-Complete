import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper to check for Admin role - removed unused request parameter
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
export async function GET() {
  if (!(await isAdmin())) {
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
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
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
    
    // Safer error handling without instanceof
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      return NextResponse.json({ 
        error: `Database error: ${prismaError.message || 'Unknown error'}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Failed to update settings.' }, { status: 500 });
  }
}
