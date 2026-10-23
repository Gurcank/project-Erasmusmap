import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_FAVORITE_CITIES } from "@/lib/profile";
import { MAX_RATING_VALUE, RATING_FIELDS } from "@/lib/review";
import { TRIP_CURRENCIES } from "@/lib/trip-types";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/username";

/**
 * The CHECK constraints live in a migration and nowhere in the schema, so
 * nothing but this keeps them in step with the rules in lib/. When a rule that
 * is repeated in the database changes in code, one of these fails and says
 * which migration to write.
 */
const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const folder = readdirSync(MIGRATIONS).find((name) =>
  name.endsWith("_check_constraints_and_indexes"),
);
const sql = readFileSync(
  join(MIGRATIONS, folder ?? "missing", "migration.sql"),
  "utf8",
);

describe("the CHECK constraints migration", () => {
  it("exists", () => {
    expect(folder).toBeDefined();
  });

  it("checks every rating column on the scale the code stores", () => {
    for (const field of RATING_FIELDS) {
      expect(sql).toMatch(
        new RegExp(`"${field}"\\s+BETWEEN 1 AND ${MAX_RATING_VALUE}`),
      );
    }
  });

  it("allows exactly the favourite slots the code hands out", () => {
    expect(sql).toContain(
      `"position" BETWEEN 0 AND ${MAX_FAVORITE_CITIES - 1}`,
    );
  });

  it("matches the username length and shape the code enforces", () => {
    expect(sql).toContain(
      `'^[A-Za-z0-9_-]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$'`,
    );
    // The same character set as the application's own pattern.
    expect(USERNAME_PATTERN.source).toBe("^[a-zA-Z0-9_-]+$");
  });

  it("accepts every currency the code offers", () => {
    const pattern = /^[A-Z]{3}$/;
    expect(sql).toContain(`"currency" ~ '^[A-Z]{3}$'`);
    for (const currency of TRIP_CURRENCIES) {
      expect(currency).toMatch(pattern);
    }
  });

  it("declares every constraint with a name that says what it checks", () => {
    const names = [...sql.matchAll(/ADD CONSTRAINT "([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(names.length).toBeGreaterThanOrEqual(14);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[A-Za-z]+_\w+_check$/);
  });

  it("does not repeat limits that are tuned in code", () => {
    for (const tuned of [
      "MAX_ITEMS_PER_TRIP",
      "MAX_TRIP_DAYS",
      "char_length",
      "length(",
    ]) {
      expect(sql).not.toContain(tuned);
    }
  });
});

describe("the foreign-key indexes in the same migration", () => {
  it("cover the tables that were scanned on every cascade", () => {
    for (const index of [
      '"Account_userId_idx" ON "Account"("userId")',
      '"Session_userId_idx" ON "Session"("userId")',
      '"FavoriteCity_cityId_idx" ON "FavoriteCity"("cityId")',
      '"TripCity_cityId_idx" ON "TripCity"("cityId")',
      '"TripExpense_cityId_idx" ON "TripExpense"("cityId")',
      '"TripItem_cityId_idx" ON "TripItem"("cityId")',
      '"TripItem_toCityId_idx" ON "TripItem"("toCityId")',
    ]) {
      expect(sql).toContain(`CREATE INDEX ${index}`);
    }
  });

  it("are declared in the Prisma schema too, so migrate dev does not drop them", () => {
    const schema = readFileSync(
      join(process.cwd(), "prisma", "schema.prisma"),
      "utf8",
    );
    const blocks = (model: string) =>
      schema.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
    expect(blocks("Account")).toContain("@@index([userId])");
    expect(blocks("Session")).toContain("@@index([userId])");
    expect(blocks("FavoriteCity")).toContain("@@index([cityId])");
    expect(blocks("TripCity")).toContain("@@index([cityId])");
    expect(blocks("TripExpense")).toContain("@@index([cityId])");
    expect(blocks("TripItem")).toContain("@@index([cityId])");
    expect(blocks("TripItem")).toContain("@@index([toCityId])");
  });
});
