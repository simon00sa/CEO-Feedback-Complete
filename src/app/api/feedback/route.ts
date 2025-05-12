import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import aiInstance from '@/lib/ai'; // Import the AIImplementation instance

const prisma = new PrismaClient();

// --- Types ---
type FeedbackRequestBody = {
  content: string;
};

// --- Helper function for async AI analysis ---
async function triggerFeedbackAnalysis(feedbackId: string, feedbackContent: string) {
  console.log(`[Async Task Start] Analyzing feedback ID: ${feedbackId}`);
  try {
    const analysisResult = await aiInstance.analyzeSingleFeedback(feedbackContent);

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: analysisResult.status,
        analysisSummary: analysisResult.analysisSummary,
        sentiment: analysisResult.sentiment,
        topics: analysisResult.topics,
        processingLog: { lastAnalysis: new Date().toISOString(), status: 'Success' },
      },
    });

    console.log(`[Async Task Success] Analysis complete for feedback ID: ${feedbackId}`);
  } catch (error) {
    console.error(`[Async Task Error] Failed to analyze feedback ID: ${feedbackId}`, error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    try {
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          processingLog: {
            lastAnalysis: new Date().toISOString(),
            status: 'Error',
            message: errorMessage,
          },
        },
      });
    } catch (dbError) {
      console.error(`[Async Task Error] Failed to update feedback ${feedbackId} with error status`, dbError);
    }
  }
}

// --- POST /api/feedback - Submit new feedback ---
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: You must be logged in to submit feedback.' }, { status: 401 });
  }

  try {
    const body: FeedbackRequestBody = await request.json();

    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Feedback content cannot be empty.' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('remote-addr') || 'Unknown IP';
    const userAgent = request.headers.get('user-agent') || 'Unknown User Agent';

    const feedback = await prisma.feedback.create({
      data: {
        content: content.trim(),
        submittedFromIP: ip,
        userAgent: userAgent,
      },
    });

    triggerFeedbackAnalysis(feedback.id, feedback.content).catch(err => {
      console.error("Error initiating background feedback analysis:", err instanceof Error ? err.message : String(err));
    });

    return NextResponse.json({ message: 'Feedback submitted successfully. Analysis will be performed.' }, { status: 201 });

  } catch (error) {
    console.error("Error submitting feedback:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to submit feedback.' }, { status: 500 });
  }
}

// --- GET /api/feedback - Retrieve feedback based on user role ---
export async function GET() {
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
        where: { status: { notIn: ['PENDING'] } },
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
    console.error("Error fetching feedback:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to fetch feedback.' }, { status: 500 });
  }
}
