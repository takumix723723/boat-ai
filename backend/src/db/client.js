import { PrismaClient } from '@prisma/client';

/** @type {PrismaClient | null} */
let prisma = null;

export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.PRISMA_LOG === 'true' ? ['error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
