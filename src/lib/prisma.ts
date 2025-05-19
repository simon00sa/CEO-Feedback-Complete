// This is a bridge file that re-exports the Prisma client from db.ts
// This ensures that imports like `import prisma from '@/lib/prisma'` work
// even if some files use `import { prisma } from '@/lib/db'`

import prisma, { healthCheck } from './db';

export default prisma;
export { prisma, healthCheck };
