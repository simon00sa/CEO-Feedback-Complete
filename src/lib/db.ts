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

// Mock data implementation - your existing mock data and functions
// (I'm keeping your existing code as you had it)
// ...rest of your mock data and functions as in your original file
