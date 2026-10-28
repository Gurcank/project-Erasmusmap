import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/action-result";
import { isBlockedBetween } from "@/lib/social";
import { dateToDay } from "@/lib/trip-schemas";

/**
 * Who may do what on a trip — the one place that decides it. Every read and
 * every write of a trip goes through here, and the answer is always worked out
 * from the signed-in user's id, never from anything the request carries.
 *
 * Anyone without access (a stranger, a pending invitee, someone across a block,
 * a trip that does not exist) gets the same answer, so a trip id cannot be
 * probed to learn that it exists.
 */

export type TripAccess = "owner" | "editor" | "viewer";

const RANK: Record<TripAccess, number> = { viewer: 1, editor: 2, owner: 3 };

export const TRIP_NOT_FOUND = "Plan bulunamadı";

export function atLeast(access: TripAccess, minimum: TripAccess): boolean {
  return RANK[access] >= RANK[minimum];
}

type MemberAccess = { role: "EDITOR" | "VIEWER"; status: string } | null;

/**
 * The access a signed-in user has by who they are to the trip: the owner, an
 * accepted member, or nothing. A pending invitation grants nothing, and a block
 * in either direction removes membership's effect.
 */
export async function memberAccess(
  trip: { id: string; userId: string },
  userId: string,
): Promise<TripAccess | null> {
  if (trip.userId === userId) return "owner";

  const member: MemberAccess = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId: trip.id, userId } },
    select: { role: true, status: true },
  });
  if (!member || member.status !== "ACCEPTED") return null;
  if (await isBlockedBetween(userId, trip.userId)) return null;
  return member.role === "EDITOR" ? "editor" : "viewer";
}

/**
 * The trip's dates and the caller's access to it, or a "not found" error when
 * the caller has less than `minimum`. Writes call this first.
 */
export async function requireTripRole(
  tripId: string,
  userId: string,
  minimum: TripAccess,
) {
  if (!tripId) throw new UserFacingError(TRIP_NOT_FOUND);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, userId: true, startDate: true, endDate: true },
  });
  const access = trip ? await memberAccess(trip, userId) : null;
  if (!trip || !access || !atLeast(access, minimum)) {
    throw new UserFacingError(TRIP_NOT_FOUND);
  }
  return {
    id: trip.id,
    access,
    startDate: dateToDay(trip.startDate),
    endDate: dateToDay(trip.endDate),
  };
}

/** What a share link looks like: 32 random bytes, base64url, 43 characters. */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** 256 bits from the system's CSPRNG — not guessable, not derived from the id. */
export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}
