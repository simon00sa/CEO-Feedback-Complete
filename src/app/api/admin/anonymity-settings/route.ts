import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Ensure using the same prisma import as other files

export const config = {
  runtime: 'edge', // For Netlify Edge Functions support
  regions: ['auto'], // This instructs Netlify to deploy to the edge location closest to the user
};

interface AnonymitySettingsResponse { 
  id: string;
  minGroupSize: number;
  minActiveUsers: number;
  activityThresholdDays: number;
  combinationLogic: string;
  enableGrouping: boolean;
  activityRequirements: any;
}

export async function GET() {
  try {
    const settings = await prisma.anonymitySettings.findFirst();
    
    if (!settings) {
      return NextResponse.json(
        { error: "Anonymity settings not found" }, 
        { status: 404 }
      );
    }
    
    const response: AnonymitySettingsResponse = {
      id: settings.id,
      minGroupSize: settings.minGroupSize,
      minActiveUsers: settings.minActiveUsers,
      activityThresholdDays: settings.activityThresholdDays,
      combinationLogic: settings.combinationLogic,
      enableGrouping: settings.enableGrouping,
      activityRequirements: settings.activityRequirements
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching anonymity settings:', error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}
