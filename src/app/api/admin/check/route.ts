import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Use correct import

// Adjust runtime for Netlify serverless functions
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'admin-check'
};

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

// Helper function to capture and log errors with Netlify context
function captureError(error: unknown, context: string) {
  console.error(`[Netlify:${context}]`, error);
  // Add your error monitoring service here if needed
}

// Simple API to check if admin services are working
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get Netlify-specific environment info
    const netlifyContext = process.env.CONTEXT || 'unknown';
    const netlifyBuildId = process.env.BUILD_ID || 'unknown';
    
    // Basic database check with timeout
    let dbStatus = 'unknown';
    let dbError = null;
    
    try {
      await withTimeout(
        prisma.$queryRaw`SELECT 1 as connected`,
        5000
      );
      dbStatus = 'connected';
    } catch (error) {
      captureError(error, 'admin-check-db');
      dbStatus = 'error';
      dbError = error instanceof Error ? error.message : String(error);
    }
    
    // Check basic environment setup
    const envCheck = {
      hasDatabase: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      hasNextAuth: !!process.env.NEXTAUTH_SECRET && !!process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV
    };
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'ok',
      message: 'Admin API check successful',
      timestamp: new Date().toISOString(),
      environment: {
        netlifyContext,
        netlifyBuildId,
        nodeEnv: process.env.NODE_ENV
      },
      database: {
        status: dbStatus,
        error: dbError,
        connectionStringConfigured: !!process.env.DATABASE_URL
      },
      envCheck,
      performance: {
        responseTimeMs: responseTime,
        status: responseTime < 200 ? 'good' : responseTime < 1000 ? 'moderate' : 'slow'
      }
    }, { 
      status: 200, 
      headers: {
        ...headers,
        'X-Response-Time': `${responseTime}ms`
      }
    });
  } catch (error) {
    captureError(error, 'admin-check');
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'error',
      message: 'Admin API check failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      netlifyContext: process.env.CONTEXT || 'unknown',
      responseTimeMs: responseTime
    }, { 
      status: 500, 
      headers
    });
  }
}
