/**
 * Prisma reconnect + retry for long-running production jobs (Neon idle disconnects).
 */

import { prisma } from "@/lib/prisma";

const RETRYABLE = /closed the connection|Connection terminated|ECONNRESET|connection reset|Server has closed/i;

export function isPrismaConnectionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return RETRYABLE.test(msg);
}

export async function reconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  await prisma.$connect();
}

export async function withPrismaProductionRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 4
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isPrismaConnectionError(error) || attempt >= maxAttempts - 1) {
        throw error;
      }
      console.warn(`[prisma-production-retry] ${label} attempt ${attempt + 1} reconnecting…`);
      await reconnectPrisma();
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function prismaProductionHeartbeat(): Promise<void> {
  await withPrismaProductionRetry("heartbeat", () => prisma.$queryRaw`SELECT 1`);
}
