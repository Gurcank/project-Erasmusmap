import { randomUUID } from "node:crypto";
import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { generateUniqueUsername } from "@/lib/user";
import { normalizeEmail } from "@/lib/email";
import { BCRYPT_SALT_ROUNDS } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { getClientAddress } from "@/lib/request-ip";

// How long the claims copied into the token stay valid before being re-read.
// Reading on every request defeats the point of a JWT session; never re-reading
// would let a ban sit unnoticed for the lifetime of the token. Authorization
// itself never trusts these claims — see requireActiveUser in lib/auth-guards.
const TOKEN_REFRESH_INTERVAL_SECONDS = 5 * 60;

// Every credentials failure answers with this one string. Distinguishing
// "no such user" from "wrong password" tells an attacker which addresses are
// registered, which is the first half of a targeted brute force.
const INVALID_CREDENTIALS = "Email veya şifre hatalı";
const TOO_MANY_ATTEMPTS =
  "Çok fazla giriş denemesi. Lütfen biraz sonra tekrar dene.";
const ACCOUNT_SUSPENDED = "Hesabınız askıya alınmış";

// Two windows, because either one alone leaves a hole: the address limit stops
// a single account being ground through a password list, and the client limit
// stops one caller spreading the same list across many accounts.
//
// The address window is a rate, not a lock — someone who knows a victim's
// email can cost them a wait, never a locked-out account.
const LOGIN_ATTEMPTS_PER_ADDRESS = 8;
const LOGIN_ADDRESS_WINDOW_MS = 15 * 60_000;
const LOGIN_ATTEMPTS_PER_CLIENT = 20;
const LOGIN_CLIENT_WINDOW_MS = 60_000;

// A hash to compare against when no account matched, so the request still pays
// for one bcrypt round. Skipping it makes "no such user" measurably faster
// than "wrong password", which leaks exactly what the shared error message
// hides. Built once per process from a value nothing can know.
let absentUserHash: Promise<string> | undefined;
function getAbsentUserHash(): Promise<string> {
  absentUserHash ??= bcrypt.hash(randomUUID(), BCRYPT_SALT_ROUNDS);
  return absentUserHash;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(INVALID_CREDENTIALS);
        }

        const email = normalizeEmail(credentials.email);
        const clientAddress = getClientAddress(request?.headers);

        const withinLimits = await Promise.all([
          rateLimit(
            `login:address:${email}`,
            LOGIN_ATTEMPTS_PER_ADDRESS,
            LOGIN_ADDRESS_WINDOW_MS,
          ),
          rateLimit(
            `login:client:${clientAddress}`,
            LOGIN_ATTEMPTS_PER_CLIENT,
            LOGIN_CLIENT_WINDOW_MS,
          ),
        ]);
        if (withinLimits.some((allowed) => !allowed)) {
          throw new Error(TOO_MANY_ATTEMPTS);
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            username: true,
            role: true,
            banned: true,
            password: true,
          },
        });

        // Runs whether or not an account matched — see getAbsentUserHash.
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user?.password ?? (await getAbsentUserHash()),
        );

        if (!user?.password || !isPasswordValid) {
          throw new Error(INVALID_CREDENTIALS);
        }

        // Checked only after the password proves the caller owns the account:
        // telling an anonymous caller that an address is suspended still tells
        // them it is registered.
        if (user.banned) {
          throw new Error(ACCOUNT_SUSPENDED);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],

  events: {
    async createUser({ user }) {
      const username = await generateUniqueUsername(user.name ?? "");
      await prisma.user.update({
        where: { id: user.id },
        data: { username, usernameLower: username.toLowerCase() },
      });
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
          image: true,
        },
      });

      if (dbUser) {
        token.id = dbUser.id;
        token.username = dbUser.username;
        token.role = dbUser.role;
        token.banned = dbUser.banned;
        token.picture = dbUser.image;
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
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
