import { PrismaClient } from '@prisma/client';

// Set options for PrismaClient
const prismaOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  // connectionLimit is not a valid PrismaClient option and will be ignored
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
    if (e.message && e.message.includes('connection')) {
      console.warn('Attempting to recover from Prisma connection error');
    }
  });

  return client;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1 as connected`;
    return true;
  } catch (error) {
    console.error('Prisma health check failed:', error);
    return false;
  }
};

const disconnect = async () => {
  await prisma.$disconnect();
};

export default prisma;
export { prisma, healthCheck, disconnect };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} else {
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      prisma.$disconnect().then(() => {
        console.log('Prisma disconnected');
        process.exit(0);
      });
    });
  });
}
