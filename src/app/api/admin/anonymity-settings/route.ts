import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
// Use a more specific type instead of Prisma.AnonymitySettingsOmit which was causing issues
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
    enableAnonymousComments: settings.enableAnonymousComments,
    enableAnonymousVotes: settings.enableAnonymousVotes,
    enableAnonymousAnalytics: settings.enableAnonymousAnalytics,
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
      settings = await prisma.anonymitySettings.create({
        data: {
          minGroupSize: 8,
          minActiveUsers: 5,
          activityThresholdDays: 30,
          combinationLogic: "DEPARTMENT",
          enableGrouping: true,
          activityRequirements: Prisma.JsonNull,
          enableAnonymousComments: true,
          enableAnonymousVotes: true,
          enableAnonymousAnalytics: false,
          anonymityLevel: "MEDIUM",
        },
      });
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

    const settings = await prisma.$transaction(async (transactionPrisma) => {
      const existingSettings =
        await transactionPrisma.anonymitySettings.findFirst();

      if (existingSettings) {
        return transactionPrisma.anonymitySettings.update({
          where: { id: existingSettings.id },
          data: {
            ...validatedData,
            activityRequirements:
              validatedData.activityRequirements ?? Prisma.JsonNull,
          },
        });
      }

      return transactionPrisma.anonymitySettings.create({
        data: {
          ...validatedData,
          activityRequirements: Prisma.JsonNull,
        },
      });
    });

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
