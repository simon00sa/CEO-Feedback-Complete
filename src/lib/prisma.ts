// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Create a singleton pattern for the Prisma client
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error']
  });
};

// Type definition for the singleton
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Define global variable to store the singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Initialize the singleton or reuse existing instance
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Export as default and as named export
export default prisma;
export { prisma };

// Only store the instance in development to prevent hot-reloading issues
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
