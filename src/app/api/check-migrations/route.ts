import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
};

// Simplified migration check endpoint that doesn't rely on Prisma or dynamic imports
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceCheck = searchParams.get('force') === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !forceCheck) {
      return NextResponse.json(
        { success: false, message: "Migration check disabled in production. Add ?force=true to override." },
        { status: 403, headers }
      );
    }

    // Return a simplified response that doesn't rely on Prisma interactions
    const serverInfo = {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL
        ? 'masked for security'
        : 'not set',
    };

    return NextResponse.json(
      {
        success: true,
        serverInfo,
        message: "Migration check endpoint responding (simplified version)"
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error in migration check:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "Failed to check migrations"
      },
      { status: 500, headers }
    );
  }
}
