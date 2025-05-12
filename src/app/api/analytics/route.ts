import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isUserAdmin } from '@/lib/utils';

// Define the FeedbackItem type according to your database schema
type FeedbackItem = {
  id: string;
  content: string;
  sentiment?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  teamId?: string;
  anonymityLevel: number;
  // Add other fields based on your Prisma schema
};

// Type for analytics response
type AnalyticsResponse = {
  feedbackCount: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  categoryBreakdown: Record<string, number>;
  recentFeedback: FeedbackItem[];
  // Add other analytics data as needed
};

// Type for raw query result if using raw SQL
type FeedbackQueryResult = {
  id: string;
  content: string;
  sentiment: string | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  teamId: string | null;
  anonymityLevel: number;
  // Add other fields as needed
};

export async function GET() {
  try {
    // Only allow executives or admins to view analytics
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or executive
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['executive', 'admin'].includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get organization ID from user
    const orgId = user.orgId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch feedback items for the user's organization
    const feedbackItems: FeedbackItem[] = await prisma.feedback.findMany({
      where: {
        organization: {
          id: orgId
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to most recent 100 items
    });

    // Calculate analytics
    const sentimentBreakdown = {
      positive: feedbackItems.filter(item => item.sentiment === 'positive').length,
      neutral: feedbackItems.filter(item => item.sentiment === 'neutral').length,
      negative: feedbackItems.filter(item => item.sentiment === 'negative').length
    };

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    feedbackItems.forEach(item => {
      if (item.category) {
        categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1;
      }
    });

    // Format response
    const analyticsResponse: AnalyticsResponse = {
      feedbackCount: feedbackItems.length,
      sentimentBreakdown,
      categoryBreakdown,
      recentFeedback: feedbackItems.slice(0, 10).map(item => ({
        ...item,
        // Apply anonymity rules based on anonymityLevel
        userId: item.anonymityLevel > 1 ? undefined : item.userId,
        // Add other anonymity transformations as needed
      }))
    };

    return NextResponse.json(analyticsResponse);
  } catch (error) {
    console.error('Error in analytics route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
