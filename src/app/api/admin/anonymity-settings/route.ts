import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ensureAdmin, handlePrismaError } from '@/lib/utils';

// Define the schema for anonymity settings
const AnonymitySettingsSchema = z.object({
  minGroupSize: z.number().default(8),
  minActiveUsers: z.number().default(5),
  activityThresholdDays: z.number().default(30),
  combinationLogic: z.string().default('DEPARTMENT'),
  enableGrouping: z.boolean().default(true),
});

// Define the type for the response
type AnonymitySettingsResponse = {
  id: string;
  minGroupSize: number;
  minActiveUsers: number;
  activityThresholdDays: number;
  combinationLogic: string;
  enableGrouping: boolean;
};

// GET /api/admin/anonymity-settings - Retrieve anonymity settings
export async function GET() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Ensure the user is an admin
    if (!(await ensureAdmin(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch the anonymity settings
    let settings = await prisma.anonymitySettings.findFirst();

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.anonymitySettings.create({
        data: {
          minGroupSize: 8,
          minActiveUsers: 5,
          activityThresholdDays: 30,
          combinationLogic: 'DEPARTMENT',
          enableGrouping: true,
        },
      });
    }

    const response: AnonymitySettingsResponse = {
      id: settings.id,
      minGroupSize: settings.minGroupSize,
      minActiveUsers: settings.minActiveUsers,
      activityThresholdDays: settings.activityThresholdDays,
      combinationLogic: settings.combinationLogic,
      enableGrouping: settings.enableGrouping,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching anonymity settings:', error);
    return handlePrismaError(error);
  }
}

// PUT /api/admin/anonymity-settings - Update anonymity settings
export async function PUT(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Ensure the user is an admin
    if (!(await ensureAdmin(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse and validate the request body
    const body = await req.json();
    const validatedData = AnonymitySettingsSchema.parse(body);

    // Use a Prisma transaction to update or create anonymity settings
    const settings = await prisma.$transaction(async (prisma) => {
      const existingSettings = await prisma.anonymitySettings.findFirst();

      if (existingSettings) {
        // Update existing settings
        return prisma.anonymitySettings.update({
          where: { id: existingSettings.id },
          data: validatedData,
        });
      } else {
        // Create new settings
        return prisma.anonymitySettings.create({
          data: validatedData,
        });
      }
    });

    const response: AnonymitySettingsResponse = {
      id: settings.id,
      minGroupSize: settings.minGroupSize,
      minActiveUsers: settings.minActiveUsers,
      activityThresholdDays: settings.activityThresholdDays,
      combinationLogic: settings.combinationLogic,
      enableGrouping: settings.enableGrouping,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating anonymity settings:', error);
    return handlePrismaError(error);
  }
}
