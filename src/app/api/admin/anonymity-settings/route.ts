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
  activityRequirements: z.any().optional(),
  enableAnonymousComments: z.boolean().default(true),
  enableAnonymousVotes: z.boolean().default(true),
  enableAnonymousAnalytics: z.boolean().default(false),
  anonymityLevel: z.string().default("MEDIUM"),
});

// Define the type for the response
type AnonymitySettingsResponse = {
  id: string;
  minGroupSize: number;
  minActiveUsers: number;
  activityThresholdDays: number;
  combinationLogic: string;
  enableGrouping: boolean;
  activityRequirements: unknown | null;
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
  settings: any
): AnonymitySettingsResponse {
  // Ensure the id is a string to prevent type errors
  if (!settings || typeof settings.id !== "string") {
    throw new Error("Invalid or missing id in AnonymitySettings object");
  }
  
  return {
    id: settings.id,
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

// GET /api/admin/anonymity-settings - Retrieve anonymity settings
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let settings = await prisma.anonymitySettings.findFirst();

    if (!settings) {
      // Skip Prisma and go straight to raw SQL for maximum compatibility
      const rawSettings = await prisma.$queryRaw`
        INSERT INTO "AnonymitySettings" (
          "minGroupSize",
          "minActiveUsers",
          "activityThresholdDays",
          "combinationLogic",
          "enableGrouping",
          "activityRequirements",
          "createdAt",
          "updatedAt"
        ) VALUES (
          8,
          5,
          30,
          'DEPARTMENT',
          true,
          NULL,
          NOW(),
          NOW()
        )
        RETURNING *;
      `;
      
      // If we get an array back from raw query, get the first element
      const dbSettings = Array.isArray(rawSettings) ? rawSettings[0] : rawSettings;
      
      // Use type assertion to add the frontend fields manually
      settings = {
        ...dbSettings,
        // These fields aren't in the database, so we add them manually
        enableAnonymousComments: true,
        enableAnonymousVotes: true,
        enableAnonymousAnalytics: false,
        anonymityLevel: "MEDIUM"
      } as AnonymitySettingsResponse; // Type assertion to tell TypeScript we know what we're doing
    }

    return NextResponse.json(formatAnonymitySettingsResponse(settings));
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

    const existingSettings = await prisma.anonymitySettings.findFirst();
    let settings;

    if (existingSettings) {
      // Update using raw SQL to bypass Prisma type checking
      const rawSettings = await prisma.$queryRaw`
        UPDATE "AnonymitySettings"
        SET
          "minGroupSize" = ${validatedData.minGroupSize},
          "minActiveUsers" = ${validatedData.minActiveUsers},
          "activityThresholdDays" = ${validatedData.activityThresholdDays},
          "combinationLogic" = ${validatedData.combinationLogic},
          "enableGrouping" = ${validatedData.enableGrouping},
          "activityRequirements" = ${validatedData.activityRequirements ? JSON.stringify(validatedData.activityRequirements) : null},
          "updatedAt" = NOW()
        WHERE "id" = ${existingSettings.id}
        RETURNING *;
      `;
      
      // If we get an array back from raw query, get the first element
      const dbSettings = Array.isArray(rawSettings) ? rawSettings[0] : rawSettings;
      
      // Use type assertion to add the frontend fields back
      settings = {
        ...dbSettings,
        // Add these fields that aren't in the database
        enableAnonymousComments: validatedData.enableAnonymousComments,
        enableAnonymousVotes: validatedData.enableAnonymousVotes,
        enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics,
        anonymityLevel: validatedData.anonymityLevel
      } as AnonymitySettingsResponse; // Type assertion
    } else {
      // Use raw SQL without specifying fields that might not exist in schema
      const rawSettings = await prisma.$queryRaw`
        INSERT INTO "AnonymitySettings" (
          "minGroupSize",
          "minActiveUsers",
          "activityThresholdDays",
          "combinationLogic",
          "enableGrouping",
          "activityRequirements",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${validatedData.minGroupSize},
          ${validatedData.minActiveUsers},
          ${validatedData.activityThresholdDays},
          ${validatedData.combinationLogic},
          ${validatedData.enableGrouping},
          ${validatedData.activityRequirements ? JSON.stringify(validatedData.activityRequirements) : null},
          NOW(),
          NOW()
        )
        RETURNING *;
      `;
      
      // If we get an array back from raw query, get the first element
      const dbSettings = Array.isArray(rawSettings) ? rawSettings[0] : rawSettings;
      
      // Use type assertion to add the frontend fields
      settings = {
        ...dbSettings,
        // Add these fields that aren't in the database
        enableAnonymousComments: validatedData.enableAnonymousComments,
        enableAnonymousVotes: validatedData.enableAnonymousVotes,
        enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics,
        anonymityLevel: validatedData.anonymityLevel
      } as AnonymitySettingsResponse; // Type assertion
    }

    return NextResponse.json(formatAnonymitySettingsResponse(settings));
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
