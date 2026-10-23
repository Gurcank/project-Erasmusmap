import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Both the pool and the client are cached on globalThis in development —
// caching only the client would still leak a new pg pool on every HMR reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const pool =
  globalForPrisma.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    // Prisma's own error printing is off. It writes the failing call to stderr,
    // and for a validation error that includes the values that were sent, with
    // nothing between them and the log. Every error is thrown anyway, and what
    // catches it logs it through lib/logger.ts, which keeps those values out.
    log: [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
