import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { generateUniqueUsername } from "@/lib/user";

// How long the claims copied into the token stay valid before being re-read.
// Reading on every request defeats the point of a JWT session; never re-reading
// would let a ban sit unnoticed for the lifetime of the token. Authorization
// itself never trusts these claims — see requireActiveUser in lib/auth-guards.
const TOKEN_REFRESH_INTERVAL_SECONDS = 5 * 60;

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email ve şifre gerekli");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Kullanıcı bulunamadı");
        }

        if (user.banned) {
          throw new Error("Hesabınız askıya alınmış");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          throw new Error("Şifre yanlış");
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
        where: { email: user.email },
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
        where: { email: token.email },
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
