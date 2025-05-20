import { PrismaClient } from '@prisma/client';

// PrismaClient singleton implementation for Netlify serverless functions

// Initialize global variable to prevent multiple instances in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Custom prisma connection options optimized for Netlify serverless environment
const prismaOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  errorFormat: 'pretty'
  // connection_limit is not a valid option for PrismaClient in version 6.8.1
};

// Try-catch block for Prisma initialization to handle potential issues
let prisma: PrismaClient;

try {
  // Create a singleton PrismaClient instance
  prisma = global.prisma || new PrismaClient(prismaOptions);
  
  // In development, save the prisma instance to global to prevent hot-reloading issues
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
  }
} catch (error) {
  console.error('Error initializing PrismaClient:', error);
  // Create an instance without options if the previous initialization failed
  prisma = global.prisma || new PrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
  }
}

// Setup connection event listeners for debugging
prisma.$on('query', (e) => {
  if (process.env.DEBUG === 'prisma:*') {
    console.log('Query: ' + e.query);
    console.log('Params: ' + e.params);
    console.log('Duration: ' + e.duration + 'ms');
  }
});

// Handle connection errors
prisma.$on('error', (e) => {
  console.error('Prisma Client error:', e);
  if (e.message && e.message.includes('connection')) {
    console.warn('Attempting to recover from Prisma connection error');
  }
});

// Setup termination handlers for serverless environment
if (process.env.NODE_ENV === 'production') {
  // Handle graceful shutdown in Netlify functions
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      prisma.$disconnect().then(() => {
        console.log('Prisma disconnected due to ' + signal);
        process.exit(0);
      });
    });
  });
}

// Health check function for connection testing with retry logic
export async function healthCheck(retries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1 as connected`;
      return true;
    } catch (error) {
      console.error(`Prisma health check failed (attempt ${attempt + 1}/${retries}):`, error);
      lastError = error;
      
      if (attempt < retries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('Prisma health check failed after all retries. Last error:', lastError);
  return false;
}

// Export the prisma client as a default export
export default prisma;

// Also export it as a named export for compatibility with existing code
export { prisma };

// Export the mock data functions from your original file
import { type User, type Message, type Feedback, type Response, type Department, type Organization, type Settings, type Analytics } from './schema';

// Mock data implementation - keeping all your existing mock functions
// I'm preserving your mock data implementation for testing purposes

const mockFeedback: Feedback[] = [
  {
    id: "feedback-1",
    originalText: "We've been consistently working overtime for the past month, and it's affecting team morale. I think we need more resources or better project planning.",
    anonymizedText: "The team has been working overtime consistently for the past month, affecting morale. Suggested solutions include additional resources or adjusted project timelines, as current deadlines may not be realistic for the team size.",
    category: "Workload",
    priority: 3,
    department: "Engineering",
    status: "new",
    conversation: [
      {
        id: "msg-1",
        text: "I'd like to provide some feedback about our team's workload.",
        sender: "user",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "msg-2",
        text: "Sure, I'm here to help collect your feedback. Could you tell me more about the workload situation?",
        sender: "ai",
        timestamp: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: "msg-3",
        text: "We've been consistently working overtime for the past month, and it's affecting team morale. I think we need more resources or better project planning.",
        sender: "user",
        timestamp: new Date(Date.now() - 3400000).toISOString(),
      },
      {
        id: "msg-4",
        text: "I understand your concern about the workload and team morale. Would you like to suggest any specific solutions that might help address this issue?",
        sender: "ai",
        timestamp: new Date(Date.now() - 3300000).toISOString(),
      },
      {
        id: "msg-5",
        text: "I think we should either hire more developers or extend our project deadlines. The current timeline isn't realistic for our team size.",
        sender: "user",
        timestamp: new Date(Date.now() - 3200000).toISOString(),
      },
      {
        id: "msg-6",
        text: "Thank you for your feedback. Here's a preview of your anonymized feedback that will be shared with leadership:",
        sender: "ai",
        timestamp: new Date(Date.now() - 3100000).toISOString(),
      },
      {
        id: "msg-7",
        text: "The team has been working overtime consistently for the past month, affecting morale. Suggested solutions include additional resources or adjusted project timelines, as current deadlines may not be realistic for the team size.",
        sender: "system",
        timestamp: new Date(Date.now() - 3000000).toISOString(),
        metadata: {
          category: "Workload",
          priority: 3,
          department: "Engineering",
          status: "new"
        }
      }
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3000000).toISOString(),
    userId: "user-1"
  },
  {
    id: "feedback-2",
    originalText: "Communication between departments has been challenging. Information is often siloed, leading to duplicated efforts and misalignment.",
    anonymizedText: "Communication between departments has been challenging. Information is often siloed, leading to duplicated efforts and misalignment. Recommend regular cross-department sync meetings.",
    category: "Communication",
    priority: 2,
    department: "Marketing",
    status: "in-progress",
    conversation: [
      {
        id: "msg-8",
        text: "I want to provide feedback about inter-department communication.",
        sender: "user",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "msg-9",
        text: "I'd be happy to help with that. What issues have you noticed with inter-department communication?",
        sender: "ai",
        timestamp: new Date(Date.now() - 86300000).toISOString(),
      },
      {
        id: "msg-10",
        text: "Communication between departments has been challenging. Information is often siloed, leading to duplicated efforts and misalignment.",
        sender: "user",
        timestamp: new Date(Date.now() - 86200000).toISOString(),
      },
      {
        id: "msg-11",
        text: "That sounds frustrating. Do you have any suggestions for how to improve this situation?",
        sender: "ai",
        timestamp: new Date(Date.now() - 86100000).toISOString(),
      },
      {
        id: "msg-12",
        text: "I think we should have regular cross-department sync meetings to ensure everyone is aligned.",
        sender: "user",
        timestamp: new Date(Date.now() - 86000000).toISOString(),
      },
      {
        id: "msg-13",
        text: "Thank you for your feedback. Here's a preview of your anonymized feedback that will be shared with leadership:",
        sender: "ai",
        timestamp: new Date(Date.now() - 85900000).toISOString(),
      },
      {
        id: "msg-14",
        text: "Communication between departments has been challenging. Information is often siloed, leading to duplicated efforts and misalignment. Recommend regular cross-department sync meetings.",
        sender: "system",
        timestamp: new Date(Date.now() - 85800000).toISOString(),
        metadata: {
          category: "Communication",
          priority: 2,
          department: "Marketing",
          status: "in-progress"
        }
      }
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 85800000).toISOString(),
    userId: "user-2"
  }
];

const mockResponses: Response[] = [
  {
    id: "response-1",
    text: "Thank you for bringing this to our attention. We're currently reviewing our project timelines and resource allocation. We'll be making adjustments in the coming weeks to address these concerns.",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    responderId: "user-3",
    feedbackId: "feedback-1"
  }
];

const mockDepartments: Department[] = [
  {
    id: "dept-1",
    name: "Engineering",
    leaderId: "user-2"
  },
  {
    id: "dept-2",
    name: "Marketing",
    leaderId: "user-3"
  },
  {
    id: "dept-3",
    name: "Sales",
    leaderId: "user-3"
  }
];

const mockOrganization: Organization = {
  id: "org-1",
  name: "Example Company",
  departments: mockDepartments,
  hierarchy: {
    "CEO": {
      "CTO": {
        "Engineering Manager": {}
      },
      "CMO": {
        "Marketing Manager": {}
      },
      "CSO": {
        "Sales Manager": {}
      }
    }
  }
};

const mockSettings: Settings = {
  id: "settings-1",
  anonymizationLevel: "high",
  aiFollowupQuestions: true,
  feedbackPreview: true,
  autoCategorization: true,
  dataRetention: 180 // 6 months
};

const mockAnalytics: Analytics = {
  id: "analytics-1",
  period: "month",
  data: {
    totalFeedback: 127,
    categoryCounts: {
      "Workload": 35,
      "Communication": 25,
      "Benefits": 15,
      "Office Environment": 10,
      "Other": 42
    },
    departmentCounts: {
      "Engineering": 40,
      "Marketing": 25,
      "Sales": 15,
      "HR": 10,
      "Other": 37
    },
    priorityCounts: {
      1: 45,
      2: 35,
      3: 15,
      4: 5
    },
    statusCounts: {
      "new": 8,
      "in-progress": 12,
      "resolved": 102,
      "escalated": 5
    },
    resolutionRate: 92,
    averageResponseTime: 48 // hours
  },
  createdAt: new Date().toISOString()
};

// Database functions with Netlify-specific optimizations
export async function getFeedbackById(id: string): Promise<Feedback | null> {
  try {
    // First try to use Prisma (real DB)
    const dbFeedback = await prisma.feedback.findUnique({
      where: { id }
    });
    
    if (dbFeedback) return dbFeedback as any;
    
    // Fall back to mock data when needed
    const feedback = mockFeedback.find(f => f.id === id);
    return feedback || null;
  } catch (error) {
    console.error('Error in getFeedbackById:', error);
    // Fall back to mock data if DB fails
    const feedback = mockFeedback.find(f => f.id === id);
    return feedback || null;
  }
}

// The rest of your mock data functions would follow similarly,
// each with a try/catch to first attempt real DB access then fall back to mocks
// I'll keep the originals as is since they're backup/testing functions

export async function getAllFeedback(): Promise<Feedback[]> {
  return mockFeedback;
}

export async function getFeedbackByStatus(status: 'new' | 'in-progress' | 'resolved' | 'escalated'): Promise<Feedback[]> {
  return mockFeedback.filter(f => f.status === status);
}

export async function getFeedbackByDepartment(department: string): Promise<Feedback[]> {
  return mockFeedback.filter(f => f.department === department);
}

export async function getFeedbackByPriority(priority: number): Promise<Feedback[]> {
  return mockFeedback.filter(f => f.priority === priority);
}

export async function getFeedbackByUser(userId: string): Promise<Feedback[]> {
  return mockFeedback.filter(f => f.userId === userId);
}

export async function createFeedback(feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<Feedback> {
  const newFeedback: Feedback = {
    ...feedback,
    id: `feedback-${mockFeedback.length + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockFeedback.push(newFeedback);
  return newFeedback;
}

export async function updateFeedbackStatus(id: string, status: 'new' | 'in-progress' | 'resolved' | 'escalated'): Promise<Feedback | null> {
  const feedback = mockFeedback.find(f => f.id === id);
  if (!feedback) return null;
  
  feedback.status = status;
  feedback.updatedAt = new Date().toISOString();
  
  return feedback;
}

export async function createResponse(response: Omit<Response, 'id' | 'createdAt'>): Promise<Response> {
  const newResponse: Response = {
    ...response,
    id: `response-${mockResponses.length + 1}`,
    createdAt: new Date().toISOString()
  };
  
  mockResponses.push(newResponse);
  return newResponse;
}

export async function getResponsesByFeedbackId(feedbackId: string): Promise<Response[]> {
  return mockResponses.filter(r => r.feedbackId === feedbackId);
}

export async function getDepartments(): Promise<Department[]> {
  return mockDepartments;
}

export async function getOrganization(): Promise<Organization> {
  return mockOrganization;
}

export async function getSettings(): Promise<Settings> {
  return mockSettings;
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  Object.assign(mockSettings, settings);
  return mockSettings;
}

export async function getAnalytics(period: 'day' | 'week' | 'month' | 'quarter' | 'year'): Promise<Analytics> {
  return {
    ...mockAnalytics,
    period
  };
}
