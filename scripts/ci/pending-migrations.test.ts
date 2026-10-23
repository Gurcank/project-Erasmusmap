import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  destructiveReasons,
  findDestructive,
  hasFailedMigration,
  parsePendingMigrations,
  parseUnknownToThisCheckout,
  stripSqlComments,
} from "./pending-migrations.mjs";

// The three shapes of `prisma migrate status` this was written against, copied
// from real runs against the production database.
const UP_TO_DATE = `Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public"

22 migrations found in prisma/migrations

Database schema is up to date!
`;

const ONE_PENDING = `Datasource "db": PostgreSQL database "postgres", schema "public"

24 migrations found in prisma/migrations

Following migration have not yet been applied:
20261022140000_add_user_avatar

To apply migrations in development run prisma migrate dev.
To apply migrations in production run prisma migrate deploy.
`;

const DIVERGED = `23 migrations found in prisma/migrations
Your local migration history and the migrations table from your database are different:

The last common migration is: 20261017130000_trip_planner

The migration have not yet been applied:
20261022170000_delete_content_with_user
20261022180000_check_constraints_and_indexes

The migrations from the database are not found locally in prisma/migrations:
20261022120000_clear_oauth_tokens
20261022140000_add_user_avatar
`;

describe("parsePendingMigrations", () => {
  it("finds nothing when the database is up to date", () => {
    expect(parsePendingMigrations(UP_TO_DATE)).toEqual([]);
  });

  it("reads the usual wording", () => {
    expect(parsePendingMigrations(ONE_PENDING)).toEqual([
      "20261022140000_add_user_avatar",
    ]);
  });

  it("reads the wording used when the history differs, and several names", () => {
    expect(parsePendingMigrations(DIVERGED)).toEqual([
      "20261022170000_delete_content_with_user",
      "20261022180000_check_constraints_and_indexes",
    ]);
  });

  it("does not take prose or the other list for a migration", () => {
    const pending = parsePendingMigrations(DIVERGED);
    expect(pending).not.toContain("20261022120000_clear_oauth_tokens");
    expect(pending.every((name) => /^\d{14}_/.test(name))).toBe(true);
  });

  it("copes with Windows line endings and empty input", () => {
    expect(parsePendingMigrations(ONE_PENDING.replace(/\n/g, "\r\n"))).toEqual([
      "20261022140000_add_user_avatar",
    ]);
    expect(parsePendingMigrations("")).toEqual([]);
  });
});

describe("parseUnknownToThisCheckout", () => {
  it("lists what the database has that this checkout lacks", () => {
    expect(parseUnknownToThisCheckout(DIVERGED)).toEqual([
      "20261022120000_clear_oauth_tokens",
      "20261022140000_add_user_avatar",
    ]);
    expect(parseUnknownToThisCheckout(ONE_PENDING)).toEqual([]);
  });
});

describe("hasFailedMigration", () => {
  it("recognises a half-applied migration", () => {
    expect(
      hasFailedMigration(
        "Following migrations have failed:\n20261022_x\n\nThe migration failed to apply",
      ),
    ).toBe(true);
  });

  it("is quiet for a healthy database", () => {
    expect(hasFailedMigration(UP_TO_DATE)).toBe(false);
    expect(hasFailedMigration(ONE_PENDING)).toBe(false);
    expect(hasFailedMigration(DIVERGED)).toBe(false);
  });
});

describe("destructiveReasons", () => {
  it("flags the statements that remove data", () => {
    expect(destructiveReasons('DROP TABLE "TripPhoto";')).toContain(
      "drops a table",
    );
    expect(
      destructiveReasons('ALTER TABLE "User" DROP COLUMN "image";'),
    ).toContain("drops a column");
    expect(destructiveReasons('TRUNCATE "Review";')).toContain(
      "truncates a table",
    );
    expect(destructiveReasons('DELETE FROM "Review" WHERE 1=1;')).toContain(
      "deletes rows",
    );
    expect(destructiveReasons("drop schema public cascade;")).toContain(
      "drops a schema or database",
    );
  });

  it("flags a migration its author marked, whatever it contains", () => {
    expect(destructiveReasons("-- DESTRUCTIVE: be careful\nSELECT 1;")).toEqual(
      ["marked DESTRUCTIVE"],
    );
  });

  it("does not flag additive migrations", () => {
    for (const sql of [
      'ALTER TABLE "User" ADD COLUMN "avatar" TEXT;',
      'CREATE INDEX "A_idx" ON "A"("b");',
      'ALTER TABLE "T" ADD CONSTRAINT "c" CHECK ("n" >= 0);',
      'ALTER TABLE "T" DROP CONSTRAINT "c";',
      'DROP INDEX "A_idx";',
    ]) {
      expect(destructiveReasons(sql)).toEqual([]);
    }
  });

  it("ignores the word in a comment", () => {
    expect(
      destructiveReasons(
        '-- we used to DROP TABLE here\n/* DELETE FROM x */\nCREATE INDEX "A_idx" ON "A"("b");',
      ),
    ).toEqual([]);
  });
});

describe("stripSqlComments", () => {
  it("removes line and block comments and keeps the code", () => {
    expect(stripSqlComments("A; -- note\n/* b\nc */ D;")).toBe("A; \n D;");
  });
});

describe("findDestructive", () => {
  it("returns only the flagged ones, each with its reasons", () => {
    const sql: Record<string, string> = {
      "20260101000000_add": 'ALTER TABLE "A" ADD COLUMN "b" INT;',
      "20260102000000_drop": 'DROP TABLE "A";',
    };
    const found = findDestructive(
      Object.keys(sql),
      (name: string) => sql[name],
    );
    expect(found).toEqual([
      { name: "20260102000000_drop", reasons: ["drops a table"] },
    ]);
  });
});

describe("the migrations in this repository", () => {
  const folder = join(process.cwd(), "prisma", "migrations");
  const names = readdirSync(folder).filter((name) => /^\d{14}_/.test(name));

  it("all have a name the parser would recognise", () => {
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(
        parsePendingMigrations(`have not yet been applied:\n${name}\n`),
      ).toEqual([name]);
    }
  });

  it("can be classified without error", () => {
    const found = findDestructive(names, (name: string) =>
      readFileSync(join(folder, name, "migration.sql"), "utf8"),
    );
    for (const entry of found) {
      expect(entry.reasons.length).toBeGreaterThan(0);
    }
  });
});
