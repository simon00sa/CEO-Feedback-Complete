import { NextRequest, NextResponse } from 'next/server';

// Configure for Netlify serverless functions
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Define headers for all responses with Netlify-specific cache settings
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'feedback-api'
};

// Helper function to capture and log errors with Netlify context
function captureError(error: unknown, context: string) {
  console.error(`[Netlify:${context}]`, error);
  // Add your error monitoring service here if needed
}

// Generate unique feedback ID with Netlify deployment info
function generateFeedbackId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const netlifyBuildId = process.env.BUILD_ID ? process.env.BUILD_ID.slice(0, 6) : '';
  return `fb-${timestamp}-${random}-${netlifyBuildId}`;
}

// Helper for caching control
function getCacheHeaders(maxAge = 0) {
  return {
    ...headers,
    'Cache-Control': maxAge > 0 
      ? `public, max-age=${maxAge}, s-maxage=${maxAge * 2}` 
      : 'no-store, must-revalidate'
  };
}

// --- POST /api/feedback - Submit new feedback ---
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse the request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      captureError(parseError, 'feedback-body-parse');
      return NextResponse.json(
        { 
          error: 'Invalid request format. JSON body expected.',
          timestamp: new Date().toISOString()
        }, 
        { status: 400, headers }
      );
    }
    
    const { content, metadata } = body;
    
    // Validate required fields
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Feedback content cannot be empty.',
          timestamp: new Date().toISOString()
        }, 
        { status: 400, headers }
      );
    }
    
    // Generate a unique ID that includes Netlify deployment information
    const feedbackId = generateFeedbackId();
    
    // Store origin information for debugging
    const origin = request.headers.get('origin') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Create a response with all the information
    return NextResponse.json(
      { 
        message: 'Feedback submitted successfully. Analysis will be performed.',
        feedbackId,
        received: {
          timestamp: new Date().toISOString(),
          contentLength: content.length,
          hasMetadata: !!metadata,
          origin: origin.includes('localhost') ? 'localhost' : origin,
          responseTimeMs: responseTime
        },
        netlifyContext: process.env.CONTEXT || 'unknown'
      }, 
      { status: 201, headers: getCacheHeaders() }
    );
  } catch (error) {
    captureError(error, 'feedback-submit');
    console.error("Error submitting feedback:", error instanceof Error ? error.message : String(error));
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      { 
        error: 'Failed to submit feedback.',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime
      }, 
      { status: 500, headers: getCacheHeaders() }
    );
  }
}

// --- GET /api/feedback - Retrieve feedback ---
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const format = url.searchParams.get('format') || 'json';
    
    // Basic validation
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { 
          error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.',
          timestamp: new Date().toISOString()
        }, 
        { status: 400, headers: getCacheHeaders() }
      );
    }
    
    // Add Netlify-specific headers for longer caching of this read-only endpoint
    // This helps reduce cold starts for frequently accessed data
    const cacheableHeaders = getCacheHeaders(60); // Cache for 60 seconds
    
    // Include information about the deployment environment
    const environmentInfo = {
      netlifyContext: process.env.CONTEXT || 'unknown',
      buildId: process.env.BUILD_ID || 'unknown',
      deployId: process.env.DEPLOY_ID || 'unknown',
      netlifyEnvironment: process.env.NODE_ENV || 'unknown'
    };
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Return a response with Netlify-specific information
    // Use the correct content type based on format parameter
    if (format === 'csv') {
      // Example CSV response
      const csvHeaders = {
        ...cacheableHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="feedback.csv"'
      };
      
      return new NextResponse(
        'id,content,created_at\n', // CSV header row
        { status: 200, headers: csvHeaders }
      );
    } else {
      // Default JSON response
      return NextResponse.json(
        {
          message: "Feedback API is operational on Netlify. This is a temporary implementation until database integration is complete.",
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          },
          performance: {
            responseTimeMs: responseTime,
            cached: false
          },
          environment: environmentInfo,
          timestamp: new Date().toISOString()
        }, 
        { status: 200, headers: cacheableHeaders }
      );
    }
  } catch (error) {
    captureError(error, 'feedback-fetch');
    console.error("Error fetching feedback:", error instanceof Error ? error.message : String(error));
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch feedback.',
        details: error instanceof Error ? error.message : 'Unknown error',
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime
      }, 
      { status: 500, headers: getCacheHeaders() }
    );
  }
}
