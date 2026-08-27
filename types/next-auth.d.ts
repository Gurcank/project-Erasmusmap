import type { Role } from "@prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string | null;
      role?: Role;
      banned?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    username?: string | null;
    role?: Role;
    banned?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    username?: string | null;
    role?: Role;
    banned?: boolean;
    /** Unix seconds of the last database refresh of the claims above. */
    refreshedAt?: number;
  }
}
