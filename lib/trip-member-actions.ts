"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authorizeAction } from "@/lib/action-guard";
import type { ActiveUser } from "@/lib/auth-guards";
import { UserFacingError, toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { requireTripRole } from "@/lib/trip-access";
import { isBlockedBetween } from "@/lib/social";
import { MAX_MEMBERSHIPS_PER_USER, MAX_TRIP_MEMBERS } from "@/lib/trip-limits";
import { USERNAME_PATTERN } from "@/lib/username";

/*
 * Inviting people to a plan and answering the invitations. The caller is always
 * the signed-in user: no user id, role or owner is read from the form except
 * the role an owner picks for an invitee, which is checked against the enum.
 * What an owner does needs the owner role on the trip; what an invitee does is
 * scoped to rows that carry their own user id, so another person's invitation
 * cannot be named.
 */

// Per minute and per user; an owner inviting a group of friends stays far under.
const INVITE_LIMIT = 10;
const RATE_LIMIT = 60;
const CANNOT_INVITE = "Bu kullanıcı davet edilemiyor";
const INVITE_GONE = "Davet bulunamadı";

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

function authorize(key: string, limit = RATE_LIMIT): Promise<ActiveUser> {
  return authorizeAction(`trip-${key}`, { limit });
}

const roleOf = (formData: FormData) =>
  field(formData, "role") === "EDITOR" ? "EDITOR" : "VIEWER";

function revalidateMembers(tripId: string) {
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

/** Owner: invites someone by username. They get nothing until they accept. */
export async function inviteToTrip(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("invite", INVITE_LIMIT);
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "owner",
    );

    // Every way an invitation can fail answers the same, so the form cannot be
    // used to find out who has an account, who is banned or who blocked whom.
    const username = field(formData, "username").replace(/^@/, "");
    if (!USERNAME_PATTERN.test(username) || username.length > 20) {
      throw new UserFacingError(CANNOT_INVITE);
    }
    const target = await prisma.user.findUnique({
      where: { usernameLower: username.toLowerCase() },
      select: { id: true, banned: true },
    });
    if (!target || target.banned || target.id === user.id) {
      throw new UserFacingError(CANNOT_INVITE);
    }
    if (await isBlockedBetween(user.id, target.id)) {
      throw new UserFacingError(CANNOT_INVITE);
    }

    const [onTrip, ofTarget] = await Promise.all([
      prisma.tripMember.count({ where: { tripId: trip.id } }),
      prisma.tripMember.count({ where: { userId: target.id } }),
    ]);
    if (onTrip >= MAX_TRIP_MEMBERS || ofTarget >= MAX_MEMBERSHIPS_PER_USER) {
      throw new UserFacingError(CANNOT_INVITE);
    }

    try {
      await prisma.tripMember.create({
        data: {
          tripId: trip.id,
          userId: target.id,
          role: roleOf(formData),
          status: "PENDING",
          invitedById: user.id,
        },
      });
    } catch (error) {
      // Already invited or already a member: nothing to add.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new UserFacingError(CANNOT_INVITE);
      }
      throw error;
    }
    revalidateMembers(trip.id);
  });
}

/** Owner: takes someone off the plan, whether pending or accepted. */
export async function removeTripMember(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("member");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "owner",
    );
    await prisma.tripMember.deleteMany({
      where: { id: field(formData, "memberId"), tripId: trip.id },
    });
    revalidateMembers(trip.id);
  });
}

/** Owner: switches a member between editor and viewer. */
export async function setTripMemberRole(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("member");
    const trip = await requireTripRole(
      field(formData, "tripId"),
      user.id,
      "owner",
    );
    await prisma.tripMember.updateMany({
      where: { id: field(formData, "memberId"), tripId: trip.id },
      data: { role: roleOf(formData) },
    });
    revalidateMembers(trip.id);
  });
}

/** Invitee: accepts an invitation addressed to them. */
export async function acceptTripInvite(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("invite-answer");
    const invite = await prisma.tripMember.findFirst({
      where: {
        id: field(formData, "memberId"),
        userId: user.id,
        status: "PENDING",
      },
      select: { id: true, tripId: true, trip: { select: { userId: true } } },
    });
    if (!invite) throw new UserFacingError(INVITE_GONE);

    // A block made after the invitation ends it.
    if (await isBlockedBetween(user.id, invite.trip.userId)) {
      await prisma.tripMember.deleteMany({ where: { id: invite.id } });
      throw new UserFacingError(INVITE_GONE);
    }

    await prisma.tripMember.updateMany({
      where: { id: invite.id, userId: user.id, status: "PENDING" },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    revalidateMembers(invite.tripId);
  });
}

/** Invitee: turns an invitation down. */
export async function declineTripInvite(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    const user = await authorize("invite-answer");
    await prisma.tripMember.deleteMany({
      where: {
        id: field(formData, "memberId"),
        userId: user.id,
        status: "PENDING",
      },
    });
    revalidatePath("/trips");
  });
}

/** Member: leaves a plan they were added to. The owner cannot; they delete it. */
export async function leaveTrip(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const tripId = field(formData, "tripId");
  const result = await toActionResult(async () => {
    const user = await authorize("member");
    await prisma.tripMember.deleteMany({
      where: { tripId, userId: user.id },
    });
    revalidateMembers(tripId);
  });
  // Outside toActionResult, like deleteTrip: redirect() throws.
  if (result.ok) redirect("/trips");
  return result;
}
