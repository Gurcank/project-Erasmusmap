import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createAuthAdapter } from "@/lib/auth-adapter";
import { prisma } from "@/lib/prisma";
import { assignInitialUsername } from "@/lib/user";
import { normalizeEmail } from "@/lib/email";

// How long the claims copied into the token stay valid before being re-read.
// Reading on every request defeats the point of a JWT session; never re-reading
// would let a ban sit unnoticed for the lifetime of the token. Authorization
// itself never trusts these claims — see requireActiveUser in lib/auth-guards.
const TOKEN_REFRESH_INTERVAL_SECONDS = 5 * 60;

/**
 * Google is the only way in, deliberately.
 *
 * Email and password sign-in was removed rather than fixed. It needed an email
 * verification flow to stop anyone registering with someone else's address, and
 * a reset flow so a forgotten password did not mean a lost account — both of
 * which need a verified sending domain this deployment does not have. Delegating
 * to a provider that has already verified the address answers both, and leaves
 * no password in this database to brute force, stuff or leak.
 */
export const authOptions: NextAuthOptions = {
  adapter: createAuthAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  events: {
    async createUser({ user }) {
      await assignInitialUsername(user);
    },
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user }) {
      if (!user.email) return true;
      const existing = await prisma.user.findUnique({
        where: { email: normalizeEmail(user.email) },
        select: { banned: true },
      });
      return !existing?.banned;
    },

    async jwt({ token, user, trigger }) {
      // Google's profile photo arrives on the token at sign-in. It is never
      // shown or stored, so it does not get to ride along in the cookie either.
      delete token.picture;

      if (!token.email) return token;

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const isStale =
        !token.refreshedAt ||
        nowInSeconds - token.refreshedAt > TOKEN_REFRESH_INTERVAL_SECONDS;

      if (!user && trigger !== "update" && !isStale) return token;

      const dbUser = await prisma.user.findUnique({
        where: { email: normalizeEmail(token.email) },
        select: {
          id: true,
          username: true,
          role: true,
          banned: true,
          avatar: true,
        },
      });

      if (dbUser) {
        token.id = dbUser.id;
        token.username = dbUser.username;
        token.role = dbUser.role;
        token.banned = dbUser.banned;
        token.avatar = dbUser.avatar;
        token.refreshedAt = nowInSeconds;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.banned = token.banned;
        session.user.avatar = token.avatar ?? null;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
