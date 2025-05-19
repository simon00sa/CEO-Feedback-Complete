import { NextResponse } from 'next/server';

// Adjust runtime for Netlify serverless functions
export const runtime = 'nodejs';
// Reduce maxDuration to fit within Netlify's 26-second limit
export const maxDuration = 25;

// Define headers with Netlify-specific cache settings
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'migration-check',
};

// Helper function to capture and log errors with Netlify context
function captureError(error: unknown, context: string) {
  console.error(`[Netlify:${context}]`, error);
  // Add your error monitoring service here if needed
}

// Simplified migration check endpoint that doesn't rely on Prisma or dynamic imports
export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const forceCheck = searchParams.get('force') === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const netlifyContext = process.env.CONTEXT || 'unknown';
    
    if (isProduction && !forceCheck) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Migration check disabled in production. Add ?force=true to override." 
        },
        { status: 403, headers }
      );
    }
    
    // Gather Netlify-specific environment information
    const serverInfo = {
      nodeEnv: process.env.NODE_ENV,
      netlifyContext,
      netlifyBuildId: process.env.BUILD_ID || 'unknown',
      netlifyDeployId: process.env.DEPLOY_ID || 'unknown',
      netlifySite: process.env.SITE_NAME || 'unknown',
      timestamp: new Date().toISOString(),
      // Only include masked database URL info
      databaseUrl: process.env.DATABASE_URL
        ? 'masked for security'
        : 'not set',
    };
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: true,
        serverInfo,
        responseTimeMs: responseTime,
        message: "Migration check endpoint responding (Netlify optimized version)",
        // Include function instance ID to help debug cold starts
        functionInstanceId: process.env.AWS_LAMBDA_FUNCTION_NAME 
          ? `${process.env.AWS_LAMBDA_FUNCTION_NAME}:${process.env.AWS_LAMBDA_LOG_STREAM_NAME || 'unknown'}`
          : 'not-serverless'
      },
      { status: 200, headers }
    );
  } catch (error) {
    captureError(error, 'migration-check');
    console.error('Error in migration check:', error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        responseTimeMs: responseTime,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString(),
        message: "Failed to check migrations"
      },
      { status: 500, headers }
    );
  }
}
