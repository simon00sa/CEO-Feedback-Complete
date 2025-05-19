import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Use consistent prisma import

export const config = {
  runtime: 'edge',
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
    // Add cache headers for improved performance
    const headers = new Headers();
    headers.append('Cache-Control', 'max-age=300'); // Cache for 5 minutes since settings rarely change
    
    const settings = await prisma.anonymitySettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      try {
        const defaultSettings = await prisma.anonymitySettings.create({
          data: {
            minGroupSize: 5,
            minActiveUsers: 10,
            activityThresholdDays: 30,
            combinationLogic: "OR",
            enableGrouping: true,
            activityRequirements: {}
          }
        });
        
        const response: AnonymitySettingsResponse = {
          id: defaultSettings.id,
          minGroupSize: defaultSettings.minGroupSize,
          minActiveUsers: defaultSettings.minActiveUsers,
          activityThresholdDays: defaultSettings.activityThresholdDays,
          combinationLogic: defaultSettings.combinationLogic,
          enableGrouping: defaultSettings.enableGrouping,
          activityRequirements: defaultSettings.activityRequirements
        };
        
        return NextResponse.json(response, { headers });
      } catch (createError) {
        console.error('Error creating default anonymity settings:', createError);
        return NextResponse.json(
          { error: "Could not create default anonymity settings" }, 
          { status: 500 }
        );
      }
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
    
    return NextResponse.json(response, { headers });
  } catch (error) {
    // Enhanced error handling for Netlify environment
    const errorMessage = (error as Error).message;
    console.error('Error fetching anonymity settings:', errorMessage);
    
    // Check for specific Prisma errors
    if (errorMessage.includes("Prisma Client")) {
      return NextResponse.json(
        { error: "Database connection error", details: "Could not connect to the database" },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage }, 
      { status: 500 }
    );
  }
}
