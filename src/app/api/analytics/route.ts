import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { JsonValue } from '@prisma/client/runtime/library';
import { $Enums } from '@prisma/client'; // Import Prisma's enums

// Define the FeedbackItem type using Prisma's enums
type FeedbackItem = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: $Enums.FeedbackStatus; // Use Prisma's enum type
  analysisSummary: string | null;
  sentiment: string | null;
  topics: string[];
  submittedFromIP: string | null;
  userAgent: string | null;
  processingLog: JsonValue;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      include: { role: true },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!['executive', 'admin'].includes(user.role?.name || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Fetch feedback from Prisma
    const prismaFeedbackItems = await prisma.feedback.findMany({
      where: {
        // Add filters if needed based on user's org or team
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to recent items
    });
    
    // Transform the data to match the FeedbackItem type
    const feedbackItems: FeedbackItem[] = prismaFeedbackItems.map(item => ({
      ...item,
      sentiment: item.sentiment ?? null,
      topics: item.topics || [],
      processingLog: item.processingLog || {}
    }));
    
    // Calculate basic analytics
    const totalFeedback = feedbackItems.length;
    
    const sentimentBreakdown = {
      positive: feedbackItems.filter(item => item.sentiment === 'positive').length,
      neutral: feedbackItems.filter(item => item.sentiment === 'neutral').length,
      negative: feedbackItems.filter(item => item.sentiment === 'negative').length,
      unknown: feedbackItems.filter(item => item.sentiment === null).length
    };
    
    // Calculate status breakdown
    const statusBreakdown: Record<string, number> = {};
    feedbackItems.forEach(item => {
      statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
    });
    
    // Calculate topic frequency
    const topicsFrequency: Record<string, number> = {};
    feedbackItems.forEach(item => {
      item.topics.forEach(topic => {
        topicsFrequency[topic] = (topicsFrequency[topic] || 0) + 1;
      });
    });
    
    return NextResponse.json({ 
      totalFeedback,
      sentimentBreakdown,
      statusBreakdown,
      topicsFrequency,
      recentFeedback: feedbackItems.slice(0, 10) // Return only 10 most recent items
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in analytics route:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
