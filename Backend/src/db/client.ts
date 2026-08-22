import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// SQL query logging is opt-in via PRISMA_LOG_QUERIES=true — it is far too
// noisy (and a potential data-exposure risk) for everyday output.
const logConfig =
  process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'error', 'warn']
    : ['error', 'warn'];

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: logConfig as ('query' | 'error' | 'warn')[],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export async function connectDb(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
