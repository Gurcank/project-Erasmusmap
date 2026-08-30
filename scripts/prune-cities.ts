import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Deletes every City row that is not a primary city.
 *
 * cities.json carries the whole GeoNames dump (~64k places) so the map build
 * can resolve each region to its largest city, but only the ~1550 slugs in
 * primary-city-slugs.json are reachable in the app — search filters to them and
 * the map only links to them. The rest are dead weight.
 *
 * Review / Visit / WishlistItem / FavoriteCity all cascade on City delete, and
 * ReviewComment / ReviewLike cascade again from Review, so any activity that
 * somehow attached to a non-primary city goes with it. That cannot normally
 * happen (nothing surfaces those cities), but every count is printed before
 * anything is removed.
 *
 * Run:  npx ts-node scripts/prune-cities.ts           (dry run)
 *       npx ts-node scripts/prune-cities.ts --apply    (delete)
 */

const apply = process.argv.includes("--apply");

async function main() {
  const primary: string[] = JSON.parse(
    fs.readFileSync(
      path.join("prisma", "data", "primary-city-slugs.json"),
      "utf8",
    ),
  );

  const total = await prisma.city.count();
  const keep = await prisma.city.count({ where: { slug: { in: primary } } });
  const doomed = total - keep;

  const where = { city: { slug: { notIn: primary } } };
  const [reviews, visits, wishlist, favorites, comments] = await Promise.all([
    prisma.review.count({ where }),
    prisma.visit.count({ where }),
    prisma.wishlistItem.count({ where }),
    prisma.favoriteCity.count({ where }),
    // Two cascades deep — these would go silently otherwise.
    prisma.reviewComment.count({ where: { review: where } }),
  ]);

  console.log(
    `City rows: ${total} — keep ${keep} primary, delete ${doomed} non-primary`,
  );
  console.log(
    `Cascades that would be removed: ${reviews} reviews, ${comments} comments, ` +
      `${visits} visits, ${wishlist} wishlist, ${favorites} favorites`,
  );

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to delete.");
    return;
  }

  const result = await prisma.city.deleteMany({
    where: { slug: { notIn: primary } },
  });
  console.log(`\nDeleted ${result.count} cities.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
