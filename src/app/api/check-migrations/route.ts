import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 60; // Max execution time in seconds

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
};

// Timeout constant for database operations
const TIMEOUT = 15000; // 15 seconds

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<T>;
}

// Helper function to capture and log errors
function captureError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  // Add your error monitoring service here if needed
}

export async function GET(request: NextRequest) {
  try {
    // Only allow on non-production environments unless explicitly requested
    const url = new URL(request.url);
    const forceCheck = url.searchParams.get('force') === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && !forceCheck) {
      return NextResponse.json({
        success: false,
        message: "Migration check disabled in production. Add ?force=true to override."
      }, { status: 403, headers });
    }
    
    // Check database connection with timeout
    const dbTest = await withTimeout(prisma.$queryRaw`SELECT 1 as connected`);
    
    // Get a list of database tables with timeout
    const tables = await withTimeout(prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Convert tables result to a simple array for easier reading
    const tablesList = Array.isArray(tables) 
      ? tables.map((t: any) => t.table_name) 
      : [];
    
    // Get table counts for key tables
    const tableCounts = await withTimeout(Promise.all([
      prisma.user.count(),
      prisma.invitation.count(),
      prisma.team.count(),
      prisma.feedback.count(),
      prisma.setting.count(),
      prisma.anonymitySettings.count(),
    ].map(p => p.catch(e => ({ error: e.message })))));
    
    // Check key model structures
    const modelChecks: Record<string, any> = {};
    const modelsToCheck = ['User', 'Invitation', 'Team', 'Feedback'];
    
    for (const modelName of modelsToCheck) {
      try {
        const columns = await withTimeout(prisma.$queryRaw`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = ${modelName}
        `);
        
        // Get Prisma model info for comparison
        const dmmf = (prisma as any)._baseDmmf;
        const model = dmmf?.datamodel?.models?.find(
          (m: any) => m.name === modelName
        );
        
        const modelFields = model?.fields?.map((field: any) => ({
          name: field.name,
          type: field.type,
          kind: field.kind,
          isRequired: field.isRequired,
        }));
        
        modelChecks[modelName] = {
          dbColumns: columns,
          prismaFields: modelFields,
          columnsCount: Array.isArray(columns) ? columns.length : 0,
          fieldsCount: Array.isArray(modelFields) ? modelFields.length : 0,
          match: Array.isArray(columns) && Array.isArray(modelFields) 
            ? columns.length === modelFields.length 
            : false
        };
      } catch (error) {
        modelChecks[modelName] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
    
    // Include server information
    const serverInfo = {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      prismaVersion: prisma.$clientVersion || 'unknown', // Fixed: Use $clientVersion instead of _engineConfig
      databaseUrl: process.env.DATABASE_URL 
        ? (process.env.DATABASE_URL.includes('://') 
            ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'masked' 
            : 'masked')
        : 'not set',
    };
    
    return NextResponse.json({
      success: true,
      dbConnection: dbTest,
      tables: tablesList,
      tableCounts: {
        user: tableCounts[0],
        invitation: tableCounts[1],
        team: tableCounts[2],
        feedback: tableCounts[3],
        setting: tableCounts[4],
        anonymitySettings: tableCounts[5],
      },
      modelChecks,
      serverInfo,
      message: "Migration check completed successfully"
    }, { status: 200, headers });
  } catch (error) {
    captureError(error, 'migration-check');
    console.error('Error checking migrations:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined,
      message: "Failed to check migrations"
    }, { status: 500, headers });
  }
}
