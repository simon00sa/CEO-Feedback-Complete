import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Define a type for feedback items to fix the TypeScript error
type FeedbackItem = {
  id: string;
  content: string;
  sentiment?: string;
  createdAt: Date;
  userId?: string;
  anonymizedContent?: string;
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
    
    // Use explicit typing for feedbackItems to fix the TypeScript error
    const feedbackItems: FeedbackItem[] = await prisma.feedback.findMany({
      where: {
        // Add filters if needed
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to recent items
    });
    
    // Basic analytics calculation
    const totalFeedback = feedbackItems.length;
    
    const sentimentBreakdown = {
      positive: feedbackItems.filter(item => item.sentiment === 'positive').length,
      neutral: feedbackItems.filter(item => item.sentiment === 'neutral').length,
      negative: feedbackItems.filter(item => item.sentiment === 'negative').length,
    };
    
    return NextResponse.json({ 
      totalFeedback,
      sentimentBreakdown,
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
