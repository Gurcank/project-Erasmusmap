// Reads `prisma migrate status` and says which migrations are waiting, and which
// of those can destroy data. It is the safety gate of the production migration
// workflow (.github/workflows/migrations.yml); the pure functions are tested in
// pending-migrations.test.ts, the command line at the bottom only wires them up.
//
//   node scripts/ci/pending-migrations.mjs report   # list what is pending, never fails
//   node scripts/ci/pending-migrations.mjs gate     # fail if a destructive one is pending
//   node scripts/ci/pending-migrations.mjs verify   # fail if anything is still pending

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATION_NAME = /^\d{14}_[\w-]+$/;

/**
 * The names under a "... have not yet been applied:" heading. Prisma words that
 * heading two ways ("Following migration have not yet been applied" and, when
 * the history differs from the database, "The migration have not yet been
 * applied"), and the list ends at the first blank line.
 *
 * @param {string} statusOutput
 * @returns {string[]}
 */
export function parsePendingMigrations(statusOutput) {
  const match = statusOutput.match(
    /have not yet been applied:\s*\n([\s\S]*?)(?:\n\s*\n|$)/,
  );
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => MIGRATION_NAME.test(line));
}

/** Migrations the database has applied that this checkout does not contain. *
 * @param {string} statusOutput
 * @returns {string[]}
 */
export function parseUnknownToThisCheckout(statusOutput) {
  const match = statusOutput.match(
    /not found locally in prisma\/migrations:\s*\n([\s\S]*?)(?:\n\s*\n|$)/,
  );
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => MIGRATION_NAME.test(line));
}

/** Prisma reports a migration that started and did not finish. *
 * @param {string} statusOutput
 * @returns {boolean}
 */
export function hasFailedMigration(statusOutput) {
  return /migration[^\n]*\bfailed\b|have failed|failed to apply/i.test(
    statusOutput,
  );
}

/** SQL without its comments, so a word in a comment cannot trip a statement check. *
 * @param {string} sql
 * @returns {string}
 */
export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

/**
 * Why a migration can destroy data, or an empty list. Two ways to be flagged:
 * the author said so with a "-- DESTRUCTIVE" comment, or it contains a statement
 * that removes data, which catches a generated migration nobody marked.
 *
 * @param {string} sql
 * @returns {string[]}
 */
export function destructiveReasons(sql) {
  const reasons = [];
  if (/^--\s*DESTRUCTIVE\b/im.test(sql)) reasons.push("marked DESTRUCTIVE");

  const code = stripSqlComments(sql);
  const statements = [
    [/\bDROP\s+TABLE\b/i, "drops a table"],
    [/\bDROP\s+COLUMN\b/i, "drops a column"],
    [/\bDROP\s+(SCHEMA|DATABASE)\b/i, "drops a schema or database"],
    [/\bTRUNCATE\b/i, "truncates a table"],
    [/\bDELETE\s+FROM\b/i, "deletes rows"],
  ];
  for (const [pattern, reason] of statements) {
    if (pattern.test(code)) reasons.push(reason);
  }
  return reasons;
}

/** The destructive ones among `names`, each with why. *
 * @param {string[]} names
 * @param {(name: string) => string} readSql
 * @returns {{ name: string, reasons: string[] }[]}
 */
export function findDestructive(names, readSql) {
  return names
    .map((name) => ({ name, reasons: destructiveReasons(readSql(name)) }))
    .filter((entry) => entry.reasons.length > 0);
}

// ─── command line ───────────────────────────────────────────────────────────

function runStatus() {
  const result = spawnSync("npx", ["prisma", "migrate", "status"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  // The exit code is non-zero whenever something is pending, which is the very
  // thing being asked about, so only the text is read.
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function summary(lines) {
  const text = `${lines.join("\n")}\n`;
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  }
}

const readMigrationSql = (name) => {
  const file = join("prisma", "migrations", name, "migration.sql");
  return existsSync(file) ? readFileSync(file, "utf8") : "";
};

function main(command) {
  const output = runStatus();
  const pending = parsePendingMigrations(output);
  const ahead = parseUnknownToThisCheckout(output);
  const destructive = findDestructive(pending, readMigrationSql);

  if (hasFailedMigration(output)) {
    summary([
      "### Production database: a migration has failed",
      "",
      "Prisma reports a migration that started and did not finish. Do not run",
      "anything else until it is resolved (`prisma migrate resolve`).",
      "",
      "```",
      output.trim().slice(0, 2000),
      "```",
    ]);
    process.exit(1);
  }

  if (command === "verify") {
    if (pending.length > 0) {
      summary([
        "### Migrations are still pending after the deploy",
        ...pending.map((name) => `- \`${name}\``),
      ]);
      process.exit(1);
    }
    summary(["### Production database is up to date", ""]);
    return;
  }

  if (command === "gate") {
    const allowed = process.env.ALLOW_DESTRUCTIVE === "true";
    if (destructive.length > 0 && !allowed) {
      summary([
        "### Refusing to apply: a pending migration can destroy data",
        "",
        ...destructive.map(
          (entry) => `- \`${entry.name}\`: ${entry.reasons.join(", ")}`,
        ),
        "",
        "Run the workflow again with **allow_destructive** ticked once you have",
        "checked the migration, and the Storage and backup side of it.",
      ]);
      process.exit(1);
    }
    summary([
      pending.length === 0
        ? "### Nothing to apply"
        : `### Applying ${pending.length} migration(s)`,
      ...pending.map((name) => `- \`${name}\``),
    ]);
    return;
  }

  // report
  const lines = [
    pending.length === 0
      ? "### Production database: no pending migrations"
      : `### Production database: ${pending.length} pending migration(s)`,
    ...pending.map((name) => {
      const flagged = destructive.find((entry) => entry.name === name);
      return flagged
        ? `- \`${name}\` **(destructive: ${flagged.reasons.join(", ")})**`
        : `- \`${name}\``;
    }),
  ];
  if (ahead.length > 0) {
    lines.push(
      "",
      "The database has applied migrations this commit does not contain yet",
      "(applied from a branch that is not merged):",
      ...ahead.map((name) => `- \`${name}\``),
    );
  }
  summary(lines);
  if (pending.length > 0) {
    console.log(
      `::warning title=Pending production migrations::${pending.length} migration(s) are not applied to the production database yet`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (!["report", "gate", "verify"].includes(command)) {
    console.error("usage: pending-migrations.mjs report|gate|verify");
    process.exit(2);
  }
  main(command);
}
