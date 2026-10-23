import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clampPage, pageCount, pageOffset } from "@/lib/pagination";

export const ADMIN_USERS_PAGE_SIZE = 25;
const MAX_QUERY_LENGTH = 100;

/** The search box text, trimmed and capped; empty means no filter. */
export function normalizeUserQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

/** Matches a name, a username or an email, ignoring case. */
export function userSearchWhere(query: string): Prisma.UserWhereInput {
  if (!query) return {};
  const contains = { contains: query, mode: "insensitive" as const };
  return {
    OR: [{ username: contains }, { name: contains }, { email: contains }],
  };
}

/**
 * One page of users for the admin panel, newest first. The panel used to load
 * every user at once, which stops being a page long before it stops being a
 * database.
 */
export async function getAdminUsers(query: string, requestedPage: number) {
  const where = userSearchWhere(query);
  const total = await prisma.user.count({ where });
  const pages = pageCount(total, ADMIN_USERS_PAGE_SIZE);
  const page = clampPage(requestedPage, pages);

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      banned: true,
      createdAt: true,
      _count: { select: { reviews: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: pageOffset(page, ADMIN_USERS_PAGE_SIZE),
    take: ADMIN_USERS_PAGE_SIZE,
  });

  return { users, total, page, pages, query };
}
