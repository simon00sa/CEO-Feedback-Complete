import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with role information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true, team: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { message, conversation } = await request.json();
    
    // Process message with AI (Note: You may need to implement AI functionality)
    // For now, let's create a basic response
    const aiResult = {
      response: `Thank you for your feedback: "${message}"`,
      metadata: {
        category: 'General',
        priority: 1
      }
    };
    
    // Generate timestamps
    const timestamp = new Date().toISOString();
    
    // Create user message
    const userMessage = {
      id: crypto.randomUUID(),
      text: message,
      sender: 'user',
      timestamp
    };
    
    // Create AI response
    const aiMessage = {
      id: crypto.randomUUID(),
      text: aiResult.response,
      sender: 'ai',
      timestamp: new Date(Date.now() + 1000).toISOString(),
      metadata: aiResult.metadata
    };
    
    // Check if this is the final message in the conversation
    let systemMessage = null;
    if (conversation?.length >= 6) {
      // For now, let's skip anonymization and just store the feedback
      const anonymizedText = message; // TODO: Implement actual anonymization
      
      // Create system message
      systemMessage = {
        id: crypto.randomUUID(),
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
      
      // Create feedback record in database
      await prisma.feedback.create({
        data: {
          content: anonymizedText,
          submittedFromIP: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '',
          userAgent: request.headers.get('user-agent') || '',
          status: 'PENDING',
          // Add conversation data as JSON if needed
          // processingLog: { conversation: [...conversation, userMessage, aiMessage, systemMessage] }
        }
      });
    }
    
    // Return the messages
    return NextResponse.json({
      userMessage,
      aiMessage,
      systemMessage
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
