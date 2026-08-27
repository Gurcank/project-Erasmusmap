import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// The app keeps its secrets in .env.local (Next.js convention), but the Prisma
// CLI only reads .env — without this, every CLI command fails with
// "Environment variable not found: DATABASE_URL".
loadEnv({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "ts-node prisma/seed.ts",
  },
});
