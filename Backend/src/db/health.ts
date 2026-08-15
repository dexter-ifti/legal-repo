import { prisma } from './client.js';

export interface DatabaseHealthStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const startTime = Date.now();
  try {
    // Standard SQL ping query valid on all PostgreSQL engines
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      latencyMs,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Database ping failed';
    return {
      connected: false,
      error: errorMessage,
    };
  }
}
