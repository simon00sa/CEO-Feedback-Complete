// This file contains the database schema for the anonymous feedback platform

// User model
interface User {
  id: string;
  role: 'staff' | 'manager' | 'executive' | 'admin';
  department: string;
  position: string;
  priorityLevel: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Message model
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: string;
  metadata?: {
    category?: string;
    priority?: number;
    department?: string;
    status?: 'new' | 'in-progress' | 'resolved' | 'escalated';
  }
}

// Feedback model
interface Feedback {
  id: string;
  originalText: string;
  anonymizedText: string;
  category: string;
  priority: number;
  department: string;
  status: 'new' | 'in-progress' | 'resolved' | 'escalated';
  conversation: Message[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  responses?: Response[];
  userId: string; // Anonymized but tracked for status updates
}

// Response model
interface Response {
  id: string;
  text: string;
  createdAt: string;
  responderId: string; // The ID of the leadership member who responded
  feedbackId: string; // The ID of the feedback being responded to
}

// Department model
interface Department {
  id: string;
  name: string;
  leaderId: string; // The ID of the department leader
}

// Organization model
interface Organization {
  id: string;
  name: string;
  departments: Department[];
  hierarchy: any; // JSON structure representing org hierarchy
}

// Settings model
interface Settings {
  id: string;
  anonymizationLevel: 'low' | 'medium' | 'high';
  aiFollowupQuestions: boolean;
  feedbackPreview: boolean;
  autoCategorization: boolean;
  dataRetention: number; // Number of days to retain feedback
}

// Analytics model
interface Analytics {
  id: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  data: {
    totalFeedback: number;
    categoryCounts: Record<string, number>;
    departmentCounts: Record<string, number>;
    priorityCounts: Record<number, number>;
    statusCounts: Record<string, number>;
    resolutionRate: number;
    averageResponseTime: number;
  };
  createdAt: string;
}

// Export models
export type {
  User,
  Message,
  Feedback,
  Response,
  Department,
  Organization,
  Settings,
  Analytics
};
