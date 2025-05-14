import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma, JsonValue } from "@prisma/client";
import { z } from "zod";
import { ensureAdmin, handlePrismaError } from "@/lib/utils";

// Define the schema for anonymity settings
const AnonymitySettingsSchema = z.object({
  minGroupSize: z.number().default(8),
  minActiveUsers: z.number().default(5),
  activityThresholdDays: z.number().default(30),
  combinationLogic: z.string().default("DEPARTMENT"),
  enableGrouping: z.boolean().default(true),
  activityRequirements: z.any().optional(), // Accept any valid JSON
});

// Define the type for the response
type AnonymitySettingsResponse = {
  id: string;
  minGroupSize: number;
  minActiveUsers: number;
  activityThresholdDays: number;
  combinationLogic: string;
  enableGrouping: boolean;
  activityRequirements: JsonValue | null; // Nullable JSON value
};

// Helper function to format the response
function formatAnonymitySettingsResponse(
  settings: Prisma.AnonymitySettingsCreateInput
): AnonymitySettingsResponse {
  return {
    id: settings.id!,
    minGroupSize: settings.minGroupSize ?? 8,
    minActiveUsers: settings.minActiveUsers ?? 5,
    activityThresholdDays: settings.activityThresholdDays ?? 30,
    combinationLogic: settings.combinationLogic ?? "DEPARTMENT",
    enableGrouping: settings.enableGrouping ?? true,
    activityRequirements: settings.activityRequirements ?? null, // Ensure null if undefined
  };
}

// GET /api/admin/anonymity-settings - Retrieve anonymity settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!(await ensureAdmin(session))) {
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
          activityRequirements: null, // Default to null
        },
      });
    }

    return NextResponse.json(formatAnonymitySettingsResponse(settings));
  } catch (error) {
    console.error("Error fetching anonymity settings:", error);
    return handlePrismaError(error);
  }
}

// PUT /api/admin/anonymity-settings - Update anonymity settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(await ensureAdmin(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = AnonymitySettingsSchema.parse(body);

    const settings = await prisma.$transaction(async (transactionPrisma: Prisma.TransactionClient) => {
      const existingSettings = await transactionPrisma.anonymitySettings.findFirst();

      if (existingSettings) {
        return transactionPrisma.anonymitySettings.update({
          where: { id: existingSettings.id },
          data: validatedData,
        });
      }

      return transactionPrisma.anonymitySettings.create({
        data: validatedData,
      });
    });

    return NextResponse.json(formatAnonymitySettingsResponse(settings));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating anonymity settings:", error);
    return handlePrismaError(error);
  }
}
