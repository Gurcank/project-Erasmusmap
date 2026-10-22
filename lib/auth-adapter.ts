import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "@prisma/client";

/**
 * The Prisma adapter with one change: linking a Google account stores who the
 * account is, and nothing the provider handed over along with it.
 *
 * The adapter writes every field NextAuth passes it, which includes the access
 * token and an ID token — a signed JWT carrying the person's email, name and
 * photo. This application signs people in and never calls a Google API on their
 * behalf, so none of it is ever read; keeping it would only mean a database
 * leak also leaks live credentials and a copy of the profile.
 *
 * The columns stay in the schema, always null: the adapter's contract expects
 * them, and dropping them is a migration that buys nothing here.
 *
 * The same goes for the profile photo. Google sends its URL when the account is
 * created, and the adapter would store it on the user. People choose one of the
 * site's own avatars instead, so the photo is dropped before it is written.
 */
function withoutImage<T extends { image?: unknown }>(
  user: T,
): Omit<T, "image"> {
  const copy = { ...user };
  delete copy.image;
  return copy;
}

export function createAuthAdapter(
  prisma: PrismaClient,
): ReturnType<typeof PrismaAdapter> {
  const adapter = PrismaAdapter(prisma);

  return {
    ...adapter,
    createUser: (user) => adapter.createUser!(withoutImage(user)),
    updateUser: (user) => adapter.updateUser!(withoutImage(user)),
    linkAccount: (account) =>
      adapter.linkAccount!({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      }),
  };
}
