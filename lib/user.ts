import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { toUsernameBase, withUsernameSuffix } from "@/lib/username";

/**
 * Finds a free username derived from a display name, so that every account has
 * a reachable profile URL from the start.
 */
export async function generateUniqueUsername(
  displayName: string,
): Promise<string> {
  const base = toUsernameBase(displayName);

  let candidate = base;
  let counter = 1;

  while (
    await prisma.user.findUnique({
      where: { usernameLower: candidate.toLowerCase() },
      select: { id: true },
    })
  ) {
    candidate = withUsernameSuffix(base, counter);
    counter++;
  }

  return candidate;
}

/**
 * Gives the user a new username, or reports that someone else already has it.
 *
 * The lookup answers the common case without a failed write, but two people
 * can pass it with the same name at once; the unique index is what actually
 * decides, so its violation is the same answer rather than a server error.
 * Callers have already validated the shape of `username`.
 */
export async function setUsername(
  userId: string,
  username: string,
): Promise<"updated" | "taken"> {
  const usernameLower = username.toLowerCase();

  const owner = await prisma.user.findUnique({
    where: { usernameLower },
    select: { id: true },
  });
  if (owner && owner.id !== userId) return "taken";

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { username, usernameLower },
    });
    return "updated";
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "taken";
    }
    throw error;
  }
}

/**
 * A username that needs no lookup: derived from the id alone, which is already
 * unique. Ids are lowercase alphanumeric, so the result is always a valid
 * username (`user-` plus eight characters).
 */
export function fallbackUsername(userId: string): string {
  return `user-${userId.slice(-8).toLowerCase()}`;
}

/**
 * Gives a newly created user their first username. Nobody is asked to pick one,
 * so this must not fail: if the name-based search throws (the database hiccups
 * between the lookups), the id-derived fallback is used instead of leaving the
 * account without a profile address. The person can change it on the account
 * page.
 */
export async function assignInitialUsername(user: {
  id: string;
  name?: string | null;
}): Promise<void> {
  let username: string;
  try {
    username = await generateUniqueUsername(user.name ?? "");
  } catch (error) {
    logError("Username generation failed, using the fallback", error, {
      routeType: "auth",
    });
    username = fallbackUsername(user.id);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { username, usernameLower: username.toLowerCase() },
  });
}
