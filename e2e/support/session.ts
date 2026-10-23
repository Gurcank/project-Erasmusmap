import { randomBytes } from "node:crypto";
import pg from "pg";
import { encode } from "next-auth/jwt";

/**
 * Signing in goes through Google, which a test cannot do. Instead a user is
 * written straight into the database and given the session cookie NextAuth would
 * have issued: the same JWT, signed with the same secret.
 *
 * This writes to whatever DATABASE_URL points at, so it only runs when
 * E2E_ALLOW_DB_WRITES=1 is set, which the CI job does and a developer's machine
 * does not. A local `.env.local` pointing at production must never be written to
 * by accident.
 */
export const canSignIn =
  process.env.E2E_ALLOW_DB_WRITES === "1" &&
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.NEXTAUTH_SECRET);

export type TestUser = {
  id: string;
  username: string;
  cookie: { name: string; value: string };
};

async function connect() {
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL!.replace(
      /[?&]pgbouncer=true/,
      "",
    ),
  });
  await db.connect();
  return db;
}

export async function createUser(
  role: "USER" | "ADMIN" = "USER",
): Promise<TestUser> {
  const suffix = randomBytes(4).toString("hex");
  const username = `e2e-${suffix}`;
  const id = `e2e${randomBytes(10).toString("hex")}`;
  const email = `${username}@example.com`;

  const db = await connect();
  try {
    await db.query(
      `INSERT INTO "User" (id, email, name, username, "usernameLower", role, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6::"Role", now())`,
      [id, email, username, username, username.toLowerCase(), role],
    );
  } finally {
    await db.end();
  }

  const value = await encode({
    secret: process.env.NEXTAUTH_SECRET!,
    token: {
      email,
      name: username,
      id,
      username,
      role,
      banned: false,
      avatar: null,
      refreshedAt: Math.floor(Date.now() / 1000),
    },
  });
  return { id, username, cookie: { name: "next-auth.session-token", value } };
}

/** Everything of the user's goes with the row (the foreign keys cascade). */
export async function deleteUser(user: TestUser): Promise<void> {
  const db = await connect();
  try {
    await db.query(`DELETE FROM "User" WHERE id = $1`, [user.id]);
  } finally {
    await db.end();
  }
}

export async function readAvatar(user: TestUser): Promise<string | null> {
  const db = await connect();
  try {
    const result = await db.query(`SELECT avatar FROM "User" WHERE id = $1`, [
      user.id,
    ]);
    return result.rows[0]?.avatar ?? null;
  } finally {
    await db.end();
  }
}
