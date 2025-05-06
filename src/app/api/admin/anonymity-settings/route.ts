// src/app/api/admin/anonymity-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema with only core fields we know exist
const AnonymitySettingsSchema = z.object({
  minGroupSize: z.number().default(8),
  minActiveUsers: z.number().default(5),
  activityThresholdDays: z.number().default(30),
  combinationLogic: z.string().default('DEPARTMENT'),
  enableGrouping: z.boolean().default(true),
});

// Helper to check if user is admin
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });
  
  return user?.role?.name === "ADMIN";
}

// GET /api/admin/anonymity-settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const settings = await prisma.anonymitySettings.findFirst();
    
    if (!settings) {
      // Create default settings with absolute minimal fields
      const defaultSettings = await prisma.anonymitySettings.create({
        data: {
          minGroupSize: 8,
          minActiveUsers: 5,
          activityThresholdDays: 30,
          combinationLogic: 'DEPARTMENT',
          enableGrouping: true,
        },
      });
      return NextResponse.json(defaultSettings);
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching anonymity settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anonymity settings' }, 
      { status: 500 }
    );
  }
}

// PUT /api/admin/anonymity-settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validatedData = AnonymitySettingsSchema.parse(body);
    
    // First, find an existing record
    const existingSettings = await prisma.anonymitySettings.findFirst();
    
    let settings;
    if (existingSettings) {
      // Update with absolute minimal fields
      settings = await prisma.anonymitySettings.update({
        where: { id: existingSettings.id },
        data: {
          minGroupSize: validatedData.minGroupSize,
          minActiveUsers: validatedData.minActiveUsers,
          activityThresholdDays: validatedData.activityThresholdDays,
          combinationLogic: validatedData.combinationLogic,
          enableGrouping: validatedData.enableGrouping,
        },
      });
    } else {
      // Create with absolute minimal fields
      settings = await prisma.anonymitySettings.create({
        data: {
          minGroupSize: validatedData.minGroupSize,
          minActiveUsers: validatedData.minActiveUsers,
          activityThresholdDays: validatedData.activityThresholdDays,
          combinationLogic: validatedData.combinationLogic,
          enableGrouping: validatedData.enableGrouping,
        },
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors }, 
        { status: 400 }
      );
    }
    
    console.error('Error updating anonymity settings:', error);
    return NextResponse.json(
      { error: 'Failed to update anonymity settings' }, 
      { status: 500 }
    );
  }
}
