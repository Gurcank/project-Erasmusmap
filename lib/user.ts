import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toUsernameBase, withUsernameSuffix } from "@/lib/username";

/**
 * Finds a free username derived from a display name. Used by both sign-up
 * paths — the OAuth adapter's createUser event and the credentials register
 * route — so that every account has a reachable profile URL from the start.
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
