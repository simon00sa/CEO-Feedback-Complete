import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import aiInstance from '@/lib/ai'; // Import the default export (AIImplementation instance)

const prisma = new PrismaClient();

// --- Helper function for async AI analysis (fire-and-forget) ---
// NOTE: This is a simplified async approach. For production, a proper queue system (e.g., BullMQ, Vercel Background Functions) is recommended.
async function triggerFeedbackAnalysis(feedbackId: string, feedbackContent: string) {
  console.log(`[Async Task Start] Analyzing feedback ID: ${feedbackId}`);
  try {
    // Use the instance directly
    const analysisResult = await aiInstance.analyzeSingleFeedback(feedbackContent);
    
    // Update the feedback record with the analysis results
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: analysisResult.status,
        analysisSummary: analysisResult.analysisSummary,
        sentiment: analysisResult.sentiment,
        topics: analysisResult.topics,
        // Optionally add analysis timestamp or log success
        processingLog: { lastAnalysis: new Date().toISOString(), status: 'Success' } 
      },
    });
    console.log(`[Async Task Success] Analysis complete for feedback ID: ${feedbackId}`);
  } catch (error) {
    console.error(`[Async Task Error] Failed to analyze feedback ID: ${feedbackId}`, error);
    // Optionally update the feedback record to indicate analysis failure
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          processingLog: { 
            lastAnalysis: new Date().toISOString(), 
            status: 'Error', 
            message: errorMessage 
          }
        },
      });
    } catch (dbError) {
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      console.error(`[Async Task Error] Failed to update feedback ${feedbackId} with error status: ${dbErrorMessage}`);
    }
  }
}
// ----------------------------------------------------------------

// POST /api/feedback - Submit new feedback
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: You must be logged in to submit feedback.' }, { status: 401 });
  }

  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Feedback content cannot be empty.' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('remote-addr');
    const userAgent = request.headers.get('user-agent');

    // Create the feedback record (status defaults to PENDING)
    const feedback = await prisma.feedback.create({
      data: {
        content: content.trim(),
        submittedFromIP: ip,
        userAgent: userAgent,
      },
    });

    // Trigger AI analysis asynchronously (fire-and-forget)
    // IMPORTANT: This runs in the background *after* the response is sent.
    // It does NOT block the response to the user.
    triggerFeedbackAnalysis(feedback.id, feedback.content).catch(err => {
      // Log errors from the async task initiation itself (rare)
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error("Error initiating background feedback analysis:", errMessage);
    });
    
    console.log(`Feedback ${feedback.id} created. AI analysis triggered asynchronously.`);

    // Return success response immediately to the user
    return NextResponse.json({ message: 'Feedback submitted successfully. Analysis will be performed.' }, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error submitting feedback:", errorMessage);
    return NextResponse.json({ error: 'Failed to submit feedback.' }, { status: 500 });
  }
}

// GET /api/feedback - Retrieve feedback based on user role
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.role) {
    return NextResponse.json({ error: 'Unauthorized: You must be logged in with a valid role.' }, { status: 401 });
  }

  const userRole = session.user.role;

  try {
    let feedbackData;
    const commonSelectFields = {
      id: true,
      createdAt: true,
      status: true,
      analysisSummary: true,
      sentiment: true,
      topics: true,
    };

    if (userRole === 'Leadership') {
      feedbackData = await prisma.feedback.findMany({
        where: {
          // Optionally filter status for Leadership
          status: { notIn: ['PENDING'] } // Example: Don't show pending to Leadership
        },
        select: commonSelectFields,
        orderBy: { createdAt: 'desc' },
      });
    } else if (userRole === 'Admin') {
      feedbackData = await prisma.feedback.findMany({
        select: {
          ...commonSelectFields,
          content: true,
          submittedFromIP: true,
          userAgent: true,
          processingLog: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return NextResponse.json({ error: 'Forbidden: Your role does not have permission to view feedback.' }, { status: 403 });
    }

    return NextResponse.json(feedbackData, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching feedback:", errorMessage);
    return NextResponse.json({ error: 'Failed to fetch feedback.' }, { status: 500 });
  }
}
