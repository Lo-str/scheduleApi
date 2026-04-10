import { PrismaClient } from './generated/prisma/client.js';
import { withAccelerate } from "@prisma/extension-accelerate"

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
    accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
