import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/db';
import { EdenAI } from '@/lib/ai';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get current user (in a real implementation, this would be from the session)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has permission to view analytics
    // Fix: Access the role.name property instead of using role directly
    if (!['executive', 'admin'].includes(user.role?.name || '')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';
    
    // Get analytics data
    const analytics = await getAnalytics(period);
    
    // Get AI analysis of feedback trends
    const feedbackItems = []; // In a real implementation, this would be fetched from the database
    const aiAnalysis = await EdenAI.analyzeFeedback(feedbackItems);
    
    return NextResponse.json({
      analytics,
      aiAnalysis
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
