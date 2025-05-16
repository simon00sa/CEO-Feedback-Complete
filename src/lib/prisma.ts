// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Set options for PrismaClient
const prismaOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  // Add connection pooling settings
  connectionLimit: 5,
};

// Create a singleton pattern for the Prisma client
const prismaClientSingleton = () => {
  const client = new PrismaClient(prismaOptions);
  
  // Add connection event handlers for better debugging
  client.$on('query', (e) => {
    if (process.env.DEBUG_PRISMA === 'true') {
      console.log('Query: ' + e.query);
      console.log('Duration: ' + e.duration + 'ms');
    }
  });
  
  // Handle connection errors
  client.$on('error', (e) => {
    console.error('Prisma Client error:', e);
    
    // Attempt reconnection if needed
    if (e.message && e.message.includes('connection')) {
      console.warn('Attempting to recover from Prisma connection error');
    }
  });
  
  return client;
};

// Type definition for the singleton
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Define global variable to store the singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Initialize the singleton or reuse existing instance
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Add connection health check method
const healthCheck = async () => {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1 as connected`;
    return true;
  } catch (error) {
    console.error('Prisma health check failed:', error);
    return false;
  }
};

// Add connection pool management
const disconnect = async () => {
  await prisma.$disconnect();
};

// Export as default and as named exports with additional utilities
export default prisma;
export { prisma, healthCheck, disconnect };

// Only store the instance in development to prevent hot-reloading issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} else {
  // Register process termination handlers for clean shutdown in production
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      prisma.$disconnect().then(() => {
        console.log('Prisma disconnected');
        process.exit(0);
      });
    });
  });
}
