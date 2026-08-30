import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { normalizeAvatar } from "../lib/avatar-processing";
import { isStorageConfigured, uploadAvatar } from "../lib/storage";

const prisma = new PrismaClient();

/**
 * One-off migration: moves avatars that were stored as base64 data URIs in
 * User.image into Supabase Storage, replacing the column with a public URL.
 * Safe to re-run — rows already holding a URL are skipped.
 */
async function main() {
  if (!isStorageConfigured()) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set before running this migration",
    );
  }

  const users = await prisma.user.findMany({
    where: { image: { startsWith: "data:" } },
    select: { id: true, image: true },
  });

  console.log(`Found ${users.length} inline avatar(s) to migrate.`);

  let migrated = 0;
  for (const user of users) {
    const base64 = user.image?.split(",")[1];
    if (!base64) {
      console.warn(`Skipping ${user.id}: malformed data URI.`);
      continue;
    }

    try {
      const normalized = await normalizeAvatar(Buffer.from(base64, "base64"));
      const stored = await uploadAvatar(normalized);
      await prisma.user.update({
        where: { id: user.id },
        data: { image: stored.url, imagePath: stored.path },
      });
      migrated++;
    } catch (error) {
      console.error(`Failed to migrate ${user.id}:`, error);
    }
  }

  console.log(`Migrated ${migrated}/${users.length} avatar(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
