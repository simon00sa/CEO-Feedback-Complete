import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

// Helper to check for Admin role
async function isAdmin(request: Request): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session?.user?.role && session.user.role.toUpperCase() === 'ADMIN';
}

// GET /api/admin/anonymity-settings - Fetch the global anonymity settings
export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
  }

  try {
    // There should ideally be only one record for global settings
    // We can enforce this by always fetching/updating the first record or using a fixed ID
    let settings = await prisma.anonymitySettings.findFirst();

    // If no settings exist yet, create the default one
    if (!settings) {
      console.log("No anonymity settings found, creating default settings.");
      settings = await prisma.anonymitySettings.create({
        data: {
          // Default values are set in the schema, but we can specify them here too
          minGroupSize: 8,
          minActiveUsers: 5,
          activityThresholdDays: 30,
          combinationLogic: "DEPARTMENT",
          enableGrouping: true,
          // activityRequirements: { login: true, feedbackSubmission: true } // Example JSON value
        }
      });
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Error fetching anonymity settings:", error);
    return NextResponse.json({ error: 'Failed to fetch anonymity settings.' }, { status: 500 });
  }
}

// PUT /api/admin/anonymity-settings - Update the global anonymity settings
export async function PUT(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate input (ensure types match the schema)
    const updateData: Partial<typeof body> = {};
    if (body.minGroupSize !== undefined && typeof body.minGroupSize === 'number' && body.minGroupSize > 0) {
      updateData.minGroupSize = body.minGroupSize;
    }
    if (body.minActiveUsers !== undefined && typeof body.minActiveUsers === 'number' && body.minActiveUsers > 0) {
      updateData.minActiveUsers = body.minActiveUsers;
    }
    if (body.activityThresholdDays !== undefined && typeof body.activityThresholdDays === 'number' && body.activityThresholdDays > 0) {
      updateData.activityThresholdDays = body.activityThresholdDays;
    }
    if (body.combinationLogic !== undefined && typeof body.combinationLogic === 'string') {
      updateData.combinationLogic = body.combinationLogic;
    }
    if (body.enableGrouping !== undefined && typeof body.enableGrouping === 'boolean') {
      updateData.enableGrouping = body.enableGrouping;
    }
    if (body.activityRequirements !== undefined && typeof body.activityRequirements === 'object') { // Basic check for JSON
      updateData.activityRequirements = body.activityRequirements;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update.' }, { status: 400 });
    }

    // Find the existing settings record (should be only one)
    const existingSettings = await prisma.anonymitySettings.findFirst();

    if (!existingSettings) {
      // Should not happen if GET is called first, but handle defensively
      return NextResponse.json({ error: 'Anonymity settings not found. Cannot update.' }, { status: 404 });
    }

    // Update the settings
    const updatedSettings = await prisma.anonymitySettings.update({
      where: { id: existingSettings.id },
      data: updateData,
    });

    return NextResponse.json(updatedSettings, { status: 200 });

  } catch (error) {
    console.error("Error updating anonymity settings:", error);
    return NextResponse.json({ error: 'Failed to update anonymity settings.' }, { status: 500 });
  }
}

