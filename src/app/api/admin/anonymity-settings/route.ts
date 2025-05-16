import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Define the schema for anonymity settings
const AnonymitySettingsSchema = z.object({
  minGroupSize: z.number().default(8),
  minActiveUsers: z.number().default(5),
  activityThresholdDays: z.number().default(30),
  combinationLogic: z.string().default("DEPARTMENT"),
  enableGrouping: z.boolean().default(true),
  activityRequirements: z.record(z.any()).optional(), // Better typed than z.any()
  enableAnonymousComments: z.boolean().default(true),
  enableAnonymousVotes: z.boolean().default(true),
  enableAnonymousAnalytics: z.boolean().default(false),
  anonymityLevel: z.string().default("MEDIUM"),
});

// Define the type for the API response
type AnonymitySettingsResponse = {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  minGroupSize: number;
  minActiveUsers: number;
  activityThresholdDays: number;
  combinationLogic: string;
  enableGrouping: boolean;
  activityRequirements: Record<string, any> | null;
  enableAnonymousComments: boolean;
  enableAnonymousVotes: boolean;
  enableAnonymousAnalytics: boolean;
  anonymityLevel: string;
};

// Helper function to check admin privileges
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });

  return !!user && user.role?.name?.toUpperCase() === "ADMIN";
}

// Helper function to format the response
function formatAnonymitySettingsResponse(
  settings: Record<string, any>
): AnonymitySettingsResponse {
  // Ensure the id is a string to prevent type errors
  if (!settings || typeof settings.id !== "string") {
    throw new Error("Invalid or missing id in AnonymitySettings object");
  }
  
  return {
    id: settings.id,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
    minGroupSize: settings.minGroupSize,
    minActiveUsers: settings.minActiveUsers,
    activityThresholdDays: settings.activityThresholdDays,
    combinationLogic: settings.combinationLogic,
    enableGrouping: settings.enableGrouping,
    activityRequirements: settings.activityRequirements ?? null,
    enableAnonymousComments: settings.enableAnonymousComments ?? true,
    enableAnonymousVotes: settings.enableAnonymousVotes ?? true,
    enableAnonymousAnalytics: settings.enableAnonymousAnalytics ?? false,
    anonymityLevel: settings.anonymityLevel ?? "MEDIUM",
  };
}

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 60; // Max execution time in seconds

// GET /api/admin/anonymity-settings - Retrieve anonymity settings
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Use Prisma's typed queries instead of raw SQL
    let settings: AnonymitySettingsResponse;
    const existingSettings = await prisma.anonymitySettings.findFirst();

    if (!existingSettings) {
      // Use upsert for better type safety and to avoid raw SQL
      const createdSettings = await prisma.anonymitySettings.upsert({
        where: { id: 'default' },
        create: {
          minGroupSize: 8,
          minActiveUsers: 5,
          activityThresholdDays: 30,
          combinationLogic: 'DEPARTMENT',
          enableGrouping: true,
          activityRequirements: null,
        },
        update: {},
      });
      
      // Add the frontend fields manually
      settings = {
        ...createdSettings,
        enableAnonymousComments: true,
        enableAnonymousVotes: true,
        enableAnonymousAnalytics: false,
        anonymityLevel: "MEDIUM"
      };
    } else {
      // Add the frontend fields manually
      settings = {
        ...existingSettings,
        enableAnonymousComments: true,
        enableAnonymousVotes: true,
        enableAnonymousAnalytics: false,
        anonymityLevel: "MEDIUM"
      };
    }

    // Add response headers
    const headers = {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    };

    return NextResponse.json(settings, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Error fetching anonymity settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch anonymity settings." },
      { status: 500 }
    );
  }
}

// PUT /api/admin/anonymity-settings - Update anonymity settings
export async function PUT(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = AnonymitySettingsSchema.parse(body);

    // Use Prisma's typed queries instead of raw SQL
    const existingSettings = await prisma.anonymitySettings.findFirst();
    let settings: AnonymitySettingsResponse;

    if (existingSettings) {
      const updatedSettings = await prisma.anonymitySettings.update({
        where: { id: existingSettings.id },
        data: {
          minGroupSize: validatedData.minGroupSize,
          minActiveUsers: validatedData.minActiveUsers,
          activityThresholdDays: validatedData.activityThresholdDays,
          combinationLogic: validatedData.combinationLogic,
          enableGrouping: validatedData.enableGrouping,
          activityRequirements: validatedData.activityRequirements 
            ? JSON.stringify(validatedData.activityRequirements) 
            : null,
        },
      });
      
      // Add the frontend fields
      settings = {
        ...updatedSettings,
        enableAnonymousComments: validatedData.enableAnonymousComments,
        enableAnonymousVotes: validatedData.enableAnonymousVotes,
        enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics,
        anonymityLevel: validatedData.anonymityLevel
      };
    } else {
      const createdSettings = await prisma.anonymitySettings.create({
        data: {
          minGroupSize: validatedData.minGroupSize,
          minActiveUsers: validatedData.minActiveUsers,
          activityThresholdDays: validatedData.activityThresholdDays,
          combinationLogic: validatedData.combinationLogic,
          enableGrouping: validatedData.enableGrouping,
          activityRequirements: validatedData.activityRequirements 
            ? JSON.stringify(validatedData.activityRequirements) 
            : null,
        },
      });
      
      // Add the frontend fields
      settings = {
        ...createdSettings,
        enableAnonymousComments: validatedData.enableAnonymousComments,
        enableAnonymousVotes: validatedData.enableAnonymousVotes,
        enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics,
        anonymityLevel: validatedData.anonymityLevel
      };
    }

    // Add response headers
    const headers = {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    };

    return NextResponse.json(settings, {
      status: 200,
      headers
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating anonymity settings:", error);
    return NextResponse.json(
      { error: "Failed to update anonymity settings." },
      { status: 500 }
    );
  }
}
