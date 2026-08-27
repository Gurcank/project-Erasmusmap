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
      where: { username: candidate },
      select: { id: true },
    })
  ) {
    candidate = withUsernameSuffix(base, counter);
    counter++;
  }

  return candidate;
}
