import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Use default export from prisma.ts

// Set to nodejs runtime for better Prisma compatibility on Netlify
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Define headers for all responses
const headers = {
  'Cache-Control': 'max-age=300, s-maxage=300', // Cache for 5 minutes
  'Content-Type': 'application/json',
};

// Helper for error logging
function captureError(error: unknown, context: string) {
  console.error(`[Netlify:${context}]`, error);
  // Add your error monitoring service here if needed
}

// Timeout constant for database operations
const TIMEOUT = 8000; // 8 seconds

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<T>;
}

interface AnonymitySettingsResponse { 
  id: string;
  minGroupSize: number;
  minActiveUsers: number;
  activityThresholdDays: number;
  combinationLogic: string;
  enableGrouping: boolean;
  activityRequirements: any;
  netlifyContext?: string;
  timestamp?: string;
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Get settings with timeout to prevent hanging
    const settings = await withTimeout(
      prisma.anonymitySettings.findFirst(),
      5000
    );
    
    if (!settings) {
      // Create default settings if none exist - with error handling
      try {
        // Use withTimeout to prevent hanging in serverless
        const defaultSettings = await withTimeout(
          prisma.anonymitySettings.create({
            data: {
              minGroupSize: 5,
              minActiveUsers: 10,
              activityThresholdDays: 30,
              combinationLogic: "OR",
              enableGrouping: true,
              activityRequirements: {}
            }
          }),
          6000
        );
        
        const response: AnonymitySettingsResponse = {
          id: defaultSettings.id,
          minGroupSize: defaultSettings.minGroupSize,
          minActiveUsers: defaultSettings.minActiveUsers,
          activityThresholdDays: defaultSettings.activityThresholdDays,
          combinationLogic: defaultSettings.combinationLogic,
          enableGrouping: defaultSettings.enableGrouping,
          activityRequirements: defaultSettings.activityRequirements,
          netlifyContext: process.env.CONTEXT || 'unknown',
          timestamp: new Date().toISOString()
        };
        
        const responseTime = Date.now() - startTime;
        console.log(`Created default anonymity settings in ${responseTime}ms`);
        
        return NextResponse.json(response, { 
          headers: {
            ...headers,
            'X-Response-Time': `${responseTime}ms`
          }
        });
      } catch (createError) {
        captureError(createError, 'anonymity-settings-create');
        console.error('Error creating default anonymity settings:', createError);
        
        // Return fallback settings to prevent crashes
        const fallbackResponse: AnonymitySettingsResponse = {
          id: 'fallback-settings',
          minGroupSize: 5,
          minActiveUsers: 5,
          activityThresholdDays: 30,
          combinationLogic: "OR",
          enableGrouping: true,
          activityRequirements: {},
          netlifyContext: process.env.CONTEXT || 'unknown',
          timestamp: new Date().toISOString()
        };
        
        return NextResponse.json(
          { 
            ...fallbackResponse,
            warning: "Using fallback settings - could not save to database",
            error: createError instanceof Error ? createError.message : "Unknown error"
          }, 
          { 
            status: 200, // Return 200 with fallback settings
            headers
          }
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
      activityRequirements: settings.activityRequirements,
      netlifyContext: process.env.CONTEXT || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(response, { 
      headers: {
        ...headers,
        'X-Response-Time': `${responseTime}ms`
      }
    });
  } catch (error) {
    captureError(error, 'anonymity-settings-get');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching anonymity settings:', errorMessage);
    
    const responseTime = Date.now() - startTime;
    
    // Check for specific Prisma errors
    if (errorMessage.includes("Prisma Client") || errorMessage.includes("timeout")) {
      return NextResponse.json(
        { 
          error: "Database connection error", 
          details: errorMessage,
          netlifyContext: process.env.CONTEXT || 'unknown',
          timestamp: new Date().toISOString(),
          responseTimeMs: responseTime
        },
        { status: 503, headers }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: errorMessage,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime
      }, 
      { status: 500, headers }
    );
  }
}
