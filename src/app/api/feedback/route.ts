import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllFeedback, 
  getFeedbackById, 
  getFeedbackByStatus, 
  getFeedbackByDepartment,
  updateFeedbackStatus,
  getResponsesByFeedbackId,
  createResponse
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Get all feedback or filtered by query parameters
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
    
    // Check if user has permission to view feedback
    if (!['manager', 'executive', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status') as 'new' | 'in-progress' | 'resolved' | 'escalated' | null;
    const department = searchParams.get('department');
    
    // Get feedback based on query parameters
    if (id) {
      const feedback = await getFeedbackById(id);
      if (!feedback) {
        return NextResponse.json(
          { error: 'Feedback not found' },
          { status: 404 }
        );
      }
      
      // Get responses for this feedback
      const responses = await getResponsesByFeedbackId(id);
      
      return NextResponse.json({ feedback, responses });
    } else if (status) {
      const feedbackItems = await getFeedbackByStatus(status);
      return NextResponse.json({ feedbackItems });
    } else if (department) {
      const feedbackItems = await getFeedbackByDepartment(department);
      return NextResponse.json({ feedbackItems });
    } else {
      // For executives and admins, return all feedback
      if (['executive', 'admin'].includes(user.role)) {
        const feedbackItems = await getAllFeedback();
        return NextResponse.json({ feedbackItems });
      } 
      // For managers, return only their department's feedback
      else if (user.role === 'manager') {
        const feedbackItems = await getFeedbackByDepartment(user.department);
        return NextResponse.json({ feedbackItems });
      }
    }
  } catch (error) {
    console.error('Error getting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to get feedback' },
      { status: 500 }
    );
  }
}

// Update feedback status
export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    
    // Get current user (in a real implementation, this would be from the session)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has permission to update feedback
    if (!['manager', 'executive', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Update feedback status
    const updatedFeedback = await updateFeedbackStatus(id, status);
    if (!updatedFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ feedback: updatedFeedback });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

// Create a response to feedback
export async function POST(request: NextRequest) {
  try {
    const { feedbackId, text } = await request.json();
    
    // Get current user (in a real implementation, this would be from the session)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has permission to respond to feedback
    if (!['manager', 'executive', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Create response
    const response = await createResponse({
      text,
      responderId: user.id,
      feedbackId
    });
    
    // Update feedback status to in-progress if it's new
    const feedback = await getFeedbackById(feedbackId);
    if (feedback && feedback.status === 'new') {
      await updateFeedbackStatus(feedbackId, 'in-progress');
    }
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error creating response:', error);
    return NextResponse.json(
      { error: 'Failed to create response' },
      { status: 500 }
    );
  }
}
