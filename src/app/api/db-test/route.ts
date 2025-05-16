import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 30; // Max execution time in seconds

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
};

// Timeout constant for database operations
const TIMEOUT = 10000; // 10 seconds

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
    const minimal = url.searchParams.get('minimal') === 'true';
    
    if (isProduction && !forceCheck) {
      return NextResponse.json({
        success: false,
        message: "Health check detailed view disabled in production. Add ?force=true to override or use ?minimal=true for basic check."
      }, { status: 403, headers });
    }
    
    // Basic health check that just verifies connection
    if (minimal) {
      try {
        // Quick connection test
        await withTimeout(prisma.$queryRaw`SELECT 1 as connected`, 5000);
        
        return NextResponse.json({
          success: true,
          message: "Database connection successful",
          timestamp: new Date().toISOString()
        }, { headers });
      } catch (error) {
        captureError(error, 'db-minimal-health-check');
        
        return NextResponse.json({
          success: false,
          message: "Database connection failed",
          timestamp: new Date().toISOString()
        }, { status: 503, headers });
      }
    }
    
    // Full health check with detailed diagnostics
    // Test the database connection with a simple query and timeout
    const connectionTest = await withTimeout(prisma.$queryRaw`SELECT 1 as connected`);
    
    // Check if tables exist in the public schema with timeout
    const tables = await withTimeout(prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Convert tables to a simple array
    const tablesList = Array.isArray(tables) 
      ? tables.map((t: any) => t.table_name) 
      : [];
    
    // Check key tables for record counts with timeout
    const counts = await withTimeout(Promise.all([
      prisma.role.count(),
      prisma.user.count(),
      prisma.team.count(),
      prisma.feedback.count()
    ].map(p => p.catch(e => ({ error: e.message })))));
    
    // Get roles with timeout
    const roles = await withTimeout(prisma.role.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { users: true }
        }
      }
    }));
    
    // Check database version
    const version = await withTimeout(prisma.$queryRaw`SHOW server_version`);
    
    // Include performance metrics
    const startTime = Date.now();
    await prisma.user.findFirst(); // Test a simple query for timing
    const queryTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      connection: connectionTest,
      tables: tablesList,
      tableCounts: {
        roles: counts[0],
        users: counts[1],
        teams: counts[2],
        feedback: counts[3]
      },
      roles: roles,
      performance: {
        queryTimeMs: queryTime,
        connectionStatus: queryTime < 200 ? 'good' : queryTime < 1000 ? 'moderate' : 'slow'
      },
      databaseInfo: {
        version: version,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      },
      message: "Database health check successful"
    }, { headers });
  } catch (error) {
    captureError(error, 'db-health-check');
    console.error('Database connection error:', error);
    
    // Determine the appropriate status code
    let statusCode = 500;
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        statusCode = 504; // Gateway Timeout
        errorType = 'timeout';
      } else if (error.message.includes('permission denied')) {
        statusCode = 403; // Forbidden
        errorType = 'permission';
      } else if (error.message.includes('does not exist')) {
        statusCode = 404; // Not Found
        errorType = 'not_found';
      } else if (error.message.includes('connect')) {
        statusCode = 503; // Service Unavailable
        errorType = 'connection';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: errorType,
      timestamp: new Date().toISOString(),
      message: "Failed to connect to the database"
    }, { status: statusCode, headers });
  }
}
