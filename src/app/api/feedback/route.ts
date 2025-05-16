import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma'; // Use shared Prisma instance
import aiInstance from '@/lib/ai'; // Import the AIImplementation instance

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 60; // Max execution time in seconds

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

// Timeout constant for long-running operations
const TIMEOUT = 30000; // 30 seconds

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), TIMEOUT)
    )
  ]) as Promise<T>;
}

// Helper function to capture and log errors
function captureError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  // Add your error monitoring service here if needed
}

// --- Types ---
type FeedbackRequestBody = {
  content: string;
};

// --- Helper function for async AI analysis ---
async function triggerFeedbackAnalysis(feedbackId: string, feedbackContent: string) {
  console.log(`[Async Task Start] Analyzing feedback ID: ${feedbackId}`);
  try {
    // Wrap AI analysis with timeout to prevent hanging
    const analysisResult = await withTimeout(
      aiInstance.analyzeSingleFeedback(feedbackContent)
    );

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: analysisResult.status,
        analysisSummary: analysisResult.analysisSummary,
        sentiment: analysisResult.sentiment,
        topics: analysisResult.topics,
        processingLog: { 
          lastAnalysis: new Date().toISOString(), 
          status: 'Success',
          aiVersion: aiInstance.version || '1.0'
        },
      },
    });

    console.log(`[Async Task Success] Analysis complete for feedback ID: ${feedbackId}`);
  } catch (error) {
    captureError(error, `feedback-analysis-${feedbackId}`);
    console.error(`[Async Task Error] Failed to analyze feedback ID: ${feedbackId}`, error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorType = error instanceof Error ? error.name : "Unknown";

    try {
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          processingLog: {
            lastAnalysis: new Date().toISOString(),
            status: 'Error',
            errorType,
            message: errorMessage,
            retryCount: 0, // Initialize retry count for potential retry mechanism
          },
        },
      });
    } catch (dbError) {
      captureError(dbError, `feedback-update-error-${feedbackId}`);
      console.error(`[Async Task Error] Failed to update feedback ${feedbackId} with error status`, dbError);
    }
  }
}

// --- POST /api/feedback - Submit new feedback ---
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in to submit feedback.' }, 
        { status: 401, headers }
      );
    }

    const body: FeedbackRequestBody = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback content cannot be empty.' }, 
        { status: 400, headers }
      );
    }

    // Sanitize and limit content length
    const sanitizedContent = content.trim().substring(0, 10000); // Limit to 10k chars

    // Extract IP with privacy focus
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim().substring(0, 50) || 
              request.headers.get('remote-addr')?.substring(0, 50) || 
              'Unknown IP';
              
    const userAgent = (request.headers.get('user-agent') || 'Unknown User Agent').substring(0, 255);

    // Use transaction for better data integrity
    const feedback = await prisma.$transaction(async (tx) => {
      // Create the feedback record
      const newFeedback = await tx.feedback.create({
        data: {
          content: sanitizedContent,
          submittedFromIP: ip,
          userAgent: userAgent,
          status: 'PENDING',
        },
      });
      
      // Update user's activity (optional)
      await tx.user.update({
        where: { id: session.user?.id },
        data: { 
          lastActive: new Date(),
          // Increment activity metrics if needed
        }
      });
      
      return newFeedback;
    });

    // Trigger background analysis - don't await
    triggerFeedbackAnalysis(feedback.id, feedback.content).catch(err => {
      captureError(err, `feedback-analysis-trigger-${feedback.id}`);
      console.error("Error initiating background feedback analysis:", err instanceof Error ? err.message : String(err));
    });

    return NextResponse.json(
      { 
        message: 'Feedback submitted successfully. Analysis will be performed.',
        feedbackId: feedback.id 
      }, 
      { status: 201, headers }
    );

  } catch (error) {
    captureError(error, 'feedback-submit');
    console.error("Error submitting feedback:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to submit feedback.' }, 
      { status: 500, headers }
    );
  }
}

// --- GET /api/feedback - Retrieve feedback based on user role ---
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.role) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in with a valid role.' }, 
        { status: 401, headers }
      );
    }

    const userRole = session.user.role;

    // Parse pagination and filtering parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const sentiment = url.searchParams.get('sentiment');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    const skip = (page - 1) * limit;
    
    // Build the where clause based on filters
    let whereClause: any = {};
    
    if (sentiment) {
      whereClause.sentiment = sentiment;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.createdAt = {
        lte: new Date(endDate),
      };
    }

    // Define select fields based on role
    const commonSelectFields = {
      id: true,
      createdAt: true,
      status: true,
      analysisSummary: true,
      sentiment: true,
      topics: true,
    };

    let feedbackData;
    let totalCount = 0;

    if (userRole === 'Leadership') {
      // For leadership, only show analyzed feedback
      whereClause.status = { notIn: ['PENDING'] };
      
      // Get count for pagination
      totalCount = await prisma.feedback.count({ where: whereClause });
      
      // Get paginated results
      feedbackData = await withTimeout(prisma.feedback.findMany({
        where: whereClause,
        select: commonSelectFields,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }));
    } else if (userRole === 'Admin') {
      // Get count for pagination
      totalCount = await prisma.feedback.count({ where: whereClause });
      
      // Get paginated results with additional admin fields
      feedbackData = await withTimeout(prisma.feedback.findMany({
        where: whereClause,
        select: {
          ...commonSelectFields,
          content: true,
          // Limit sensitive data exposure
          submittedFromIP: true,
          userAgent: true,
          processingLog: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }));
    } else {
      return NextResponse.json(
        { error: 'Forbidden: Your role does not have permission to view feedback.' }, 
        { status: 403, headers }
      );
    }

    // For GET requests that can be cached in certain scenarios
    const cacheHeaders = {
      ...headers,
      'Cache-Control': 'private, max-age=60' // Cache for 1 minute on client
    };

    return NextResponse.json(
      {
        data: feedbackData,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        filters: {
          sentiment,
          status,
          startDate,
          endDate
        }
      }, 
      { status: 200, headers: cacheHeaders }
    );

  } catch (error) {
    captureError(error, 'feedback-fetch');
    console.error("Error fetching feedback:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to fetch feedback.' }, 
      { status: 500, headers }
    );
  }
}
