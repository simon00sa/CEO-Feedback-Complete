import { NextRequest, NextResponse } from 'next/server';
import { EdenAI } from '@/lib/ai';
import { createFeedback, updateFeedbackStatus } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { message, conversation } = await request.json();
    
    // Get current user (in a real implementation, this would be from the session)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Process message with Eden AI
    const aiResult = await EdenAI.processMessage(message, conversation);
    
    // Generate a timestamp for the message
    const timestamp = new Date().toISOString();
    
    // Create user message
    const userMessage = {
      id: uuidv4(),
      text: message,
      sender: 'user',
      timestamp
    };
    
    // Create AI response
    const aiMessage = {
      id: uuidv4(),
      text: aiResult.response,
      sender: 'ai',
      timestamp: new Date(Date.parse(timestamp) + 1000).toISOString(),
      metadata: aiResult.metadata
    };
    
    // Check if this is the final message in the conversation
    let systemMessage = null;
    if (conversation.length >= 6) {
      // Anonymize the feedback
      const originalText = message;
      const anonymizedText = await EdenAI.anonymizeFeedback(originalText);
      
      // Create system message with anonymized feedback
      systemMessage = {
        id: uuidv4(),
        text: anonymizedText,
        sender: 'system',
        timestamp: new Date(Date.parse(timestamp) + 2000).toISOString(),
        metadata: {
          category: aiResult.metadata?.category,
          priority: aiResult.metadata?.priority,
          department: user.department,
          status: 'new'
        }
      };
      
      // Create feedback record in database
      const newConversation = [...conversation, userMessage, aiMessage, systemMessage];
      await createFeedback({
        originalText,
        anonymizedText,
        category: aiResult.metadata?.category || 'Other',
        priority: aiResult.metadata?.priority || 1,
        department: user.department,
        status: 'new',
        conversation: newConversation,
        userId: user.id
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
