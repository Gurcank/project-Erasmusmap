import type { Role } from "@prisma/client";
import { UserFacingError } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

export const LAST_ADMIN_MESSAGE =
  "Son admin hesabı silinemez. Önce başka bir hesabı admin yap.";

/**
 * Deletes a user and everything of theirs. The foreign keys do the work: the
 * account links, sessions, reviews, comments, likes, visits, lists, follows,
 * blocks and trips all cascade from the user row, so there is no list of tables
 * here to fall out of date when one is added.
 *
 * The last admin is refused, or the site would be left with nobody who can
 * moderate it and no way to make another admin short of editing the database.
 */
export async function deleteUserAccount(user: {
  id: string;
  role: Role;
}): Promise<void> {
  if (user.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", id: { not: user.id } },
    });
    if (otherAdmins === 0) throw new UserFacingError(LAST_ADMIN_MESSAGE);
  }

  await prisma.user.delete({ where: { id: user.id } });
}
