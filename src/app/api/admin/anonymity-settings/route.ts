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
  activityRequirements: z.any().optional(), // Accept any valid JSON
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

// Helper function to check for admin privileges
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
  settings: Prisma.AnonymitySettings // Use the correct Prisma model type
): AnonymitySettingsResponse {
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
      settings = await prisma
