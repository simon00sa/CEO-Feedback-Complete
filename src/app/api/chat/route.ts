import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth"; // Fixed import
import { authOptions } from '@/lib/auth'; // Updated import path
import prisma from '@/lib/prisma';

// Configure for Netlify serverless functions
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'chat-api'
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

// Define a type for the request body
type ChatRequestBody = {
  message: string;
  conversation?: Array<{
    id: string;
    text: string;
    sender: string;
    timestamp?: string;
    metadata?: any;
  }>;
};

// Define types for message structures
type UserMessage = {
  id: string;
  text: string;
  sender: 'user';
  timestamp: string;
};

type AIMessage = {
  id: string;
  text: string;
  sender: 'ai';
  timestamp: string;
  metadata: {
    category: string;
    priority: number;
  };
};

type SystemMessage = {
  id: string;
  text: string;
  sender: 'system';
  timestamp: string;
  metadata: {
    category?: string;
    priority?: number;
    department?: string;
    status: string;
  };
};

// Generate a UUID with Edge compatibility
function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch (e) {
    // Fallback for environments where crypto.randomUUID isn't available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          timestamp: new Date().toISOString()
        },
        { status: 401, headers }
      );
    }
    
    // Get user with role information with timeout protection
    const user = await withTimeout(
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { role: true, team: true }
      }),
      8000 // 8 second timeout
    );
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          timestamp: new Date().toISOString()
        },
        { status: 404, headers }
      );
    }
    
    // Parse and type the request body
    const body: ChatRequestBody = await request.json();
    const { message, conversation } = body;
    
    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Valid message is required',
          timestamp: new Date().toISOString()
        },
        { status: 400, headers }
      );
    }
    
    // Validate conversation format
    if (conversation !== undefined && !Array.isArray(conversation)) {
      return NextResponse.json(
        { 
          error: 'Invalid conversation format',
          timestamp: new Date().toISOString()
        },
        { status: 400, headers }
      );
    }
    
    // Process message with AI
    // Wrap AI processing in timeout to prevent hanging
    const aiResult = await withTimeout(
      Promise.resolve({
        response: `Thank you for your feedback: "${message}"`,
        metadata: {
          category: 'General',
          priority: 1
        }
      }),
      10000 // 10 second timeout for AI processing
    );
    
    // Generate timestamps
    const timestamp = new Date().toISOString();
    
    // Create user message
    const userMessage: UserMessage = {
      id: generateUUID(),
      text: message,
      sender: 'user',
      timestamp
    };
    
    // Create AI response
    const aiMessage: AIMessage = {
      id: generateUUID(),
      text: aiResult.response,
      sender: 'ai',
      timestamp: new Date(Date.now() + 1000).toISOString(),
      metadata: aiResult.metadata
    };
    
    // Check if this is the final message in the conversation
    let systemMessage: SystemMessage | null = null;
    
    // Use transaction for data integrity when storing feedback
    if (Array.isArray(conversation) && conversation.length >= 6) {
      // For production, implement proper anonymization
      const anonymizedText = message; // TODO: Implement actual anonymization
      
      // Create system message
      systemMessage = {
        id: generateUUID(),
        text: anonymizedText,
        sender: 'system',
        timestamp: new Date(Date.now() + 2000).toISOString(),
        metadata: {
          category: aiResult.metadata?.category,
          priority: aiResult.metadata?.priority,
          department: user.team?.name,
          status: 'new'
        }
      };
      
      // Create feedback record in database with transaction
      // Wrap transaction in timeout to prevent hanging
      await withTimeout(
        prisma.$transaction(async (tx) => {
          await tx.feedback.create({
            data: {
              content: anonymizedText,
              // Limit IP address storage for privacy
              submittedFromIP: request.headers.get('x-forwarded-for')?.split(',')[0].trim().substring(0, 50) || '',
              userAgent: (request.headers.get('user-agent') || '').substring(0, 255),
              status: 'PENDING',
              // Store essential conversation data
              processingLog: {
                timestamp: timestamp,
                messageCount: conversation.length + 2,
                aiCategory: aiResult.metadata?.category,
                aiPriority: aiResult.metadata?.priority
              }
            }
          });
          
          // You could also update user's lastActive timestamp here
          await tx.user.update({
            where: { id: user.id },
            data: { 
              lastActive: new Date(),
              activityLevel: 'MEDIUM' // Adjust based on your business logic
            }
          });
        }),
        15000 // 15 second timeout for database transaction
      );
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      userMessage,
      aiMessage,
      systemMessage,
      meta: {
        responseTimeMs: responseTime,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString()
      }
    }, { 
      headers: {
        ...headers,
        'X-Response-Time': `${responseTime}ms`
      }
    });
  } catch (error) {
    captureError(error, 'chat-api');
    console.error('Error processing chat message:', error);
    
    const responseTime = Date.now() - startTime;
    
    // Provide different error messages based on error type
    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json(
        { 
          error: 'Request timed out', 
          details: 'The AI processing took too long',
          responseTimeMs: responseTime,
          timestamp: new Date().toISOString()
        },
        { status: 408, headers }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process message', 
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTimeMs: responseTime,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500, headers }
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if this is a health check
    const url = new URL(request.url);
    const isHealthCheck = url.searchParams.get('health') === 'check';
    
    if (isHealthCheck) {
      return NextResponse.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        netlifyContext: process.env.CONTEXT || 'unknown'
      }, { 
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Regular status endpoint
    return NextResponse.json({ 
      status: 'Chat service operational',
      version: '1.0.0',
      responseTimeMs: responseTime,
      netlifyContext: process.env.CONTEXT || 'unknown',
      timestamp: new Date().toISOString()
    }, { 
      headers: {
        ...headers,
        'X-Response-Time': `${responseTime}ms`
      }
    });
  } catch (error) {
    captureError(error, 'chat-api-status');
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({ 
      status: 'error',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs: responseTime,
      netlifyContext: process.env.CONTEXT || 'unknown',
      timestamp: new Date().toISOString()
    }, { status: 500, headers });
  }
}
