import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { JsonValue } from '@prisma/client/runtime/library';
import { $Enums } from '@prisma/client';

// Configure for Netlify serverless functions
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'analytics-api'
};

// Timeout constant for Netlify serverless
const TIMEOUT = 20000; // 20 seconds (below Netlify's limit)

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

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      }, { status: 401, headers });
    }
    
    // Shorter timeout for user query
    const user = await withTimeout(
      prisma.user.findUnique({
        where: { email: session.user.email || '' },
        include: { role: true },
      }),
      8000 // 8 second timeout
    );
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        timestamp: new Date().toISOString()
      }, { status: 404, headers });
    }
    
    if (!['executive', 'admin'].includes(user.role?.name || '')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      }, { status: 403, headers });
    }
    
    // Parse query parameters for filtering
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const sentiment = url.searchParams.get('sentiment');
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');
    
    // Create filter condition
    let whereClause: any = {};
    
    if (sentiment) {
      whereClause.sentiment = sentiment;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }
    
    // Fetch feedback from Prisma with timeout protection
    const prismaFeedbackItems = await withTimeout(
      prisma.feedback.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        // Select only needed fields for performance
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          analysisSummary: true,
          sentiment: true,
          topics: true,
          // Omit submittedFromIP for privacy unless specifically needed
          userAgent: true,
          processingLog: true
        }
      }),
      15000 // 15 second timeout for data query
    );
    
    // Transform the data to match the FeedbackItem type
    const feedbackItems: FeedbackItem[] = prismaFeedbackItems.map(item => ({
      ...item,
      submittedFromIP: null, // Don't expose IPs by default for privacy
      sentiment: item.sentiment ?? null,
      topics: item.topics || [],
      processingLog: item.processingLog || {}
    }));
    
    // Calculate basic analytics more efficiently
    // Count sentiments in a single pass
    const sentimentBreakdown = {
      positive: 0,
      neutral: 0,
      negative: 0,
      unknown: 0
    };
    
    const statusBreakdown: Record<string, number> = {};
    const topicsFrequency: Record<string, number> = {};
    
    feedbackItems.forEach(item => {
      // Update sentiment counts
      if (item.sentiment === 'positive') sentimentBreakdown.positive++;
      else if (item.sentiment === 'neutral') sentimentBreakdown.neutral++;
      else if (item.sentiment === 'negative') sentimentBreakdown.negative++;
      else sentimentBreakdown.unknown++;
      
      // Update status counts
      statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
      
      // Update topic frequency
      item.topics.forEach(topic => {
        topicsFrequency[topic] = (topicsFrequency[topic] || 0) + 1;
      });
    });
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Custom cache headers for analytics - shorter cache time
    const analyticsHeaders = {
      ...headers,
      'Cache-Control': 'private, max-age=300, s-maxage=600', // 5 minutes private, 10 minutes shared
      'X-Response-Time': `${responseTime}ms`
    };
    
    return NextResponse.json({ 
      totalFeedback: feedbackItems.length,
      sentimentBreakdown,
      statusBreakdown,
      topicsFrequency,
      recentFeedback: feedbackItems.slice(0, 10), // Return only 10 most recent items
      meta: {
        responseTimeMs: responseTime,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString(),
        limit
      }
    }, { status: 200, headers: analyticsHeaders });
    
  } catch (error) {
    captureError(error, 'analytics-api');
    console.error('Error in analytics route:', error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({ 
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : String(error),
      responseTimeMs: responseTime,
      netlifyContext: process.env.CONTEXT || 'unknown',
      timestamp: new Date().toISOString()
    }, { status: 500, headers });
  }
}
