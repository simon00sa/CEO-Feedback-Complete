import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
// Remove the unused Prisma import since we're not using it
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
    anonymityLevel: settings.anonymityLevel,
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
      // Using standard Prisma create with the fields we know exist in schema
      try {
        settings = await prisma.anonymitySettings.create({
          data: {
            minGroupSize: 8,
            minActiveUsers: 5,
            activityThresholdDays: 30,
            combinationLogic: "DEPARTMENT",
            enableGrouping: true,
            activityRequirements: null,
            anonymityLevel: "MEDIUM"
          },
        });
      } catch (error) {
        console.error("Error creating anonymity settings:", error);
        
        // If the above fails, try with a SQL query but use DEFAULT for id
        settings = await prisma.$queryRaw`
          INSERT INTO "AnonymitySettings" (
            "minGroupSize",
            "minActiveUsers",
            "activityThresholdDays",
            "combinationLogic",
            "enableGrouping",
            "activityRequirements",
            "anonymityLevel",
            "createdAt",
            "updatedAt"
          ) VALUES (
            8,
            5,
            30,
            'DEPARTMENT',
            true,
            NULL,
            'MEDIUM',
            NOW(),
            NOW()
          )
          RETURNING *;
        `;
        
        // If we get an array back from raw query, get the first element
        if (Array.isArray(settings)) {
          settings = settings[0];
        }
      }
      
      // Add the frontend fields manually if they don't exist in the DB
      settings = {
        ...settings,
        enableAnonymousComments: true,
        enableAnonymousVotes: true,
        enableAnonymousAnalytics: false
      };
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
      // Update using raw SQL to bypass Prisma type checking, don't try to set ID
      settings = await prisma.$queryRaw`
        UPDATE "AnonymitySettings"
        SET
          "minGroupSize" = ${validatedData.minGroupSize},
          "minActiveUsers" = ${validatedData.minActiveUsers},
          "activityThresholdDays" = ${validatedData.activityThresholdDays},
          "combinationLogic" = ${validatedData.combinationLogic},
          "enableGrouping" = ${validatedData.enableGrouping},
          "activityRequirements" = ${validatedData.activityRequirements ? JSON.stringify(validatedData.activityRequirements) : null},
          "anonymityLevel" = ${validatedData.anonymityLevel},
          "updatedAt" = NOW()
        WHERE "id" = ${existingSettings.id}
        RETURNING *;
      `;
      
      // If we get an array back from raw query, get the first element
      if (Array.isArray(settings)) {
        settings = settings[0];
      }
      
      // Add the frontend fields back
      settings = {
        ...settings,
        enableAnonymousComments: validatedData.enableAnonymousComments,
        enableAnonymousVotes: validatedData.enableAnonymousVotes,
        enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics
      };
    } else {
      // Try to create using standard Prisma
      try {
        settings = await prisma.anonymitySettings.create({
          data: {
            minGroupSize: validatedData.minGroupSize,
            minActiveUsers: validatedData.minActiveUsers,
            activityThresholdDays: validatedData.activityThresholdDays,
            combinationLogic: validatedData.combinationLogic,
            enableGrouping: validatedData.enableGrouping,
            activityRequirements: validatedData.activityRequirements ?? null,
            anonymityLevel: validatedData.anonymityLevel
          },
        });
      } catch (error) {
        console.error("Error creating anonymity settings:", error);
        
        // If that fails, use raw SQL without specifying ID (let Postgres use DEFAULT)
        settings = await prisma.$queryRaw`
          INSERT INTO "AnonymitySettings" (
            "minGroupSize",
            "minActiveUsers",
            "activityThresholdDays",
            "combinationLogic",
            "enableGrouping",
            "activityRequirements",
            "anonymityLevel",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${validatedData.minGroupSize},
            ${validatedData.minActiveUsers},
            ${validatedData.activityThresholdDays},
            ${validatedData.combinationLogic},
            ${validatedData.enableGrouping},
            ${validatedData.activityRequirements ? JSON.stringify(validatedData.activityRequirements) : null},
            ${validatedData.anonymityLevel},
            NOW(),
            NOW()
          )
          RETURNING *;
        `;
        
        // If we get an array back from raw query, get the first element
        if (Array.isArray(settings)) {
          settings = settings[0];
        }
      }
      
      // Add the frontend fields
      settings = {
        ...settings,
        enableAnonymousComments: validatedData.enableAnonymousComments,
        enableAnonymousVotes: validatedData.enableAnonymousVotes,
        enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics
      };
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
