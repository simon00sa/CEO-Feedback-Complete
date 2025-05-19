import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Add runtime specification for Netlify serverless functions
export const runtime = 'nodejs';
// Increase max duration for Netlify functions which can run up to 26 seconds by default
export const maxDuration = 25; // Slightly below Netlify's 26 second limit

// Define headers for all responses with Netlify-specific cache settings
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'db-health-check',
};

// Timeout constant reduced for Netlify's serverless functions
const TIMEOUT = 8000; // 8 seconds to allow for response packaging

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<T>;
}

// Helper function to capture and log errors with Netlify context
function captureError(error: unknown, context: string) {
  console.error(`[Netlify:${context}]`, error);
  // Add your error monitoring service here if needed
  // Most Netlify users integrate with services like Sentry or LogRocket
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Only allow on non-production environments unless explicitly requested
    const url = new URL(request.url);
    const forceCheck = url.searchParams.get('force') === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const minimal = url.searchParams.get('minimal') === 'true';
    const netlifyContext = process.env.CONTEXT || 'unknown'; // Netlify-specific environment variable
    
    if (isProduction && !forceCheck) {
      return NextResponse.json({
        success: false,
        message: "Health check detailed view disabled in production. Add ?force=true to override or use ?minimal=true for basic check."
      }, { status: 403, headers });
    }
    
    // Basic health check that just verifies connection
    // Perfect for Netlify's periodic health pings
    if (minimal) {
      try {
        // Quick connection test with shorter timeout for minimal check
        await withTimeout(prisma.$queryRaw`SELECT 1 as connected`, 4000);
        
        return NextResponse.json({
          success: true,
          message: "Database connection successful",
          netlifyContext,
          timestamp: new Date().toISOString()
        }, { headers });
      } catch (error) {
        captureError(error, 'db-minimal-health-check');
        
        return NextResponse.json({
          success: false,
          message: "Database connection failed",
          netlifyContext,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }, { status: 503, headers });
      }
    }
    
    // Full health check with detailed diagnostics
    // Test the database connection with a simple query and timeout
    const connectionTest = await withTimeout(prisma.$queryRaw`SELECT 1 as connected`);
    
    // Check if tables exist in the public schema with timeout
    // Handle potential schema differences in Netlify environments
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
    // Use Promise.allSettled instead of Promise.all for better error handling in serverless
    const countsPromises = await withTimeout(Promise.allSettled([
      prisma.role.count(),
      prisma.user.count(),
      prisma.team.count(),
      prisma.feedback.count()
    ]));
    
    // Process results to handle partial failures gracefully
    const counts = countsPromises.map(result => 
      result.status === 'fulfilled' ? result.value : { error: (result.reason as Error).message }
    );
    
    // Get roles with timeout
    const roles = await withTimeout(prisma.role.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { users: true }
        }
      }
    }).catch(error => {
      captureError(error, 'roles-query');
      return { error: error.message };
    }));
    
    // Check database version - wrap in try/catch for better resilience
    let version;
    try {
      version = await withTimeout(prisma.$queryRaw`SHOW server_version`);
    } catch (error) {
      captureError(error, 'db-version-query');
      version = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Calculate query performance time
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
        // Adjust thresholds for Netlify's serverless functions which may have cold starts
        connectionStatus: queryTime < 500 ? 'good' : queryTime < 2000 ? 'moderate' : 'slow'
      },
      databaseInfo: {
        version: version,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        netlifyContext,
        netlifyBuildId: process.env.BUILD_ID || 'unknown',
        netlifyDeployId: process.env.DEPLOY_ID || 'unknown'
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
      } else if (error.message.includes('Too many')) {
        // Specific to Netlify serverless - connection pool exhaustion
        statusCode = 429; // Too Many Requests
        errorType = 'connection_limit';
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType,
      responseTimeMs: totalTime,
      netlifySite: process.env.SITE_NAME || 'unknown',
      netlifyContext: process.env.CONTEXT || 'unknown',
      timestamp: new Date().toISOString(),
      message: "Failed to connect to the database"
    }, { status: statusCode, headers });
  }
}
