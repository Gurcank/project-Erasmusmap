import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActiveUser = {
  id: string;
  email: string;
  username: string | null;
  role: Role;
};

export type GuardResult =
  { ok: true; user: ActiveUser } | { ok: false; status: number; error: string };

/**
 * Resolves the signed-in user from a fresh database read. The JWT is
 * deliberately not trusted for the ban check — an admin banning someone must
 * take effect on their next request, not whenever their token happens to be
 * refreshed.
 */
export async function requireActiveUser(): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "Giriş yapmalısın" };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      banned: true,
    },
  });

  if (!user) {
    return { ok: false, status: 401, error: "Kullanıcı bulunamadı" };
  }
  if (user.banned) {
    return { ok: false, status: 403, error: "Hesabınız askıya alınmış" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  };
}

export async function requireAdmin(): Promise<GuardResult> {
  const result = await requireActiveUser();
  if (!result.ok) return result;

  if (result.user.role !== "ADMIN") {
    return { ok: false, status: 403, error: "Bu işlem için yetkiniz yok" };
  }

  return result;
}
