import { PrismaClient } from './generated/prisma/index.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], 
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;