import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const tripFindUnique = vi.hoisted(() => vi.fn());
const userFindUnique = vi.hoisted(() => vi.fn());
const memberFindUnique = vi.hoisted(() => vi.fn());
const memberFindFirst = vi.hoisted(() => vi.fn());
const memberCount = vi.hoisted(() => vi.fn());
const memberCreate = vi.hoisted(() => vi.fn());
const memberDeleteMany = vi.hoisted(() => vi.fn());
const memberUpdateMany = vi.hoisted(() => vi.fn());
const isBlockedBetween = vi.hoisted(() => vi.fn());
const authorizeAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: { findUnique: tripFindUnique },
    user: { findUnique: userFindUnique },
    tripMember: {
      findUnique: memberFindUnique,
      findFirst: memberFindFirst,
      count: memberCount,
      create: memberCreate,
      deleteMany: memberDeleteMany,
      updateMany: memberUpdateMany,
    },
  },
}));
vi.mock("@/lib/social", () => ({ isBlockedBetween }));
vi.mock("@/lib/action-guard", () => ({ authorizeAction }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import {
  acceptTripInvite,
  declineTripInvite,
  inviteToTrip,
  leaveTrip,
  removeTripMember,
  setTripMemberRole,
} from "@/lib/trip-member-actions";
import { MAX_TRIP_MEMBERS } from "@/lib/trip-limits";

const DAY = new Date("2027-01-01T00:00:00Z");
const CANNOT = { ok: false, error: "Bu kullanıcı davet edilemiyor" };
const NOT_FOUND = { ok: false, error: "Plan bulunamadı" };
const GONE = { ok: false, error: "Davet bulunamadı" };

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const asUser = (id: string) =>
  authorizeAction.mockResolvedValue({ id, username: id });

beforeEach(() => {
  vi.resetAllMocks();
  isBlockedBetween.mockResolvedValue(false);
  tripFindUnique.mockResolvedValue({
    id: "t1",
    userId: "owner",
    startDate: DAY,
    endDate: DAY,
  });
  memberFindUnique.mockResolvedValue(null);
  userFindUnique.mockResolvedValue({ id: "friend", banned: false });
  memberCount.mockResolvedValue(0);
  memberCreate.mockResolvedValue({});
  memberDeleteMany.mockResolvedValue({ count: 1 });
  memberUpdateMany.mockResolvedValue({ count: 1 });
});

describe("inviteToTrip", () => {
  const invite = (extra: Record<string, string> = {}) =>
    inviteToTrip(
      null,
      form({ tripId: "t1", username: "Friend", role: "EDITOR", ...extra }),
    );

  it("creates a pending invitation, looked up by lowercase username", async () => {
    asUser("owner");
    expect(await invite()).toEqual({ ok: true });
    expect(userFindUnique.mock.calls[0][0].where).toEqual({
      usernameLower: "friend",
    });
    expect(memberCreate.mock.calls[0][0].data).toEqual({
      tripId: "t1",
      userId: "friend",
      role: "EDITOR",
      status: "PENDING",
      invitedById: "owner",
    });
  });

  it("reads any role but EDITOR as viewer", async () => {
    asUser("owner");
    await invite({ role: "OWNER" });
    expect(memberCreate.mock.calls[0][0].data.role).toBe("VIEWER");
  });

  it("is for the owner only", async () => {
    asUser("friend");
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "ACCEPTED" });
    expect(await invite()).toEqual(NOT_FOUND);
    expect(memberCreate).not.toHaveBeenCalled();
  });

  it("answers every way it can fail the same, so it reveals nothing", async () => {
    asUser("owner");
    const answers: unknown[] = [];

    userFindUnique.mockResolvedValue(null); // no such user
    answers.push(await invite());
    userFindUnique.mockResolvedValue({ id: "friend", banned: true });
    answers.push(await invite()); // banned
    userFindUnique.mockResolvedValue({ id: "owner", banned: false });
    answers.push(await invite()); // oneself
    userFindUnique.mockResolvedValue({ id: "friend", banned: false });
    isBlockedBetween.mockResolvedValue(true);
    answers.push(await invite()); // blocked
    isBlockedBetween.mockResolvedValue(false);
    answers.push(await invite({ username: "no spaces!" })); // not a username
    answers.push(await invite({ username: "a".repeat(40) })); // too long

    expect(answers).toEqual(Array(6).fill(CANNOT));
    expect(memberCreate).not.toHaveBeenCalled();
  });

  it("stops at the plan's size and at the invitee's own limit", async () => {
    asUser("owner");
    memberCount
      .mockResolvedValueOnce(MAX_TRIP_MEMBERS)
      .mockResolvedValueOnce(0);
    expect(await invite()).toEqual(CANNOT);
    memberCount.mockResolvedValueOnce(0).mockResolvedValueOnce(100);
    expect(await invite()).toEqual(CANNOT);
    expect(memberCreate).not.toHaveBeenCalled();
  });

  it("does not invite twice", async () => {
    asUser("owner");
    memberCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    expect(await invite()).toEqual(CANNOT);
  });
});

describe("owner-only member changes", () => {
  it("removes and re-roles only rows of the owner's own trip", async () => {
    asUser("owner");
    await removeTripMember(null, form({ tripId: "t1", memberId: "m1" }));
    expect(memberDeleteMany.mock.calls[0][0].where).toEqual({
      id: "m1",
      tripId: "t1",
    });
    await setTripMemberRole(
      null,
      form({ tripId: "t1", memberId: "m1", role: "EDITOR" }),
    );
    expect(memberUpdateMany.mock.calls[0][0]).toEqual({
      where: { id: "m1", tripId: "t1" },
      data: { role: "EDITOR" },
    });
  });

  it("refuses an editor, so nobody promotes themselves or removes others", async () => {
    asUser("friend");
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "ACCEPTED" });
    const a = await setTripMemberRole(
      null,
      form({ tripId: "t1", memberId: "mine", role: "EDITOR" }),
    );
    const b = await removeTripMember(
      null,
      form({ tripId: "t1", memberId: "other" }),
    );
    expect([a, b]).toEqual([NOT_FOUND, NOT_FOUND]);
    expect(memberUpdateMany).not.toHaveBeenCalled();
    expect(memberDeleteMany).not.toHaveBeenCalled();
  });
});

describe("answering an invitation", () => {
  const invite = { id: "m1", tripId: "t1", trip: { userId: "owner" } };

  it("accepts only the caller's own pending invitation", async () => {
    asUser("friend");
    memberFindFirst.mockResolvedValue(invite);
    expect(await acceptTripInvite(null, form({ memberId: "m1" }))).toEqual({
      ok: true,
    });
    expect(memberFindFirst.mock.calls[0][0].where).toEqual({
      id: "m1",
      userId: "friend",
      status: "PENDING",
    });
    const update = memberUpdateMany.mock.calls[0][0];
    expect(update.where).toEqual({
      id: "m1",
      userId: "friend",
      status: "PENDING",
    });
    expect(update.data.status).toBe("ACCEPTED");
  });

  it("cannot accept someone else's invitation or one already answered", async () => {
    asUser("stranger");
    memberFindFirst.mockResolvedValue(null);
    expect(await acceptTripInvite(null, form({ memberId: "m1" }))).toEqual(
      GONE,
    );
    expect(memberUpdateMany).not.toHaveBeenCalled();
  });

  it("drops an invitation from someone who has since blocked or been blocked", async () => {
    asUser("friend");
    memberFindFirst.mockResolvedValue(invite);
    isBlockedBetween.mockResolvedValue(true);
    expect(await acceptTripInvite(null, form({ memberId: "m1" }))).toEqual(
      GONE,
    );
    expect(memberUpdateMany).not.toHaveBeenCalled();
    expect(memberDeleteMany).toHaveBeenCalled();
  });

  it("declines only the caller's own pending invitation", async () => {
    asUser("friend");
    await declineTripInvite(null, form({ memberId: "m1" }));
    expect(memberDeleteMany.mock.calls[0][0].where).toEqual({
      id: "m1",
      userId: "friend",
      status: "PENDING",
    });
  });
});

describe("leaveTrip", () => {
  it("removes the caller's own membership and nobody else's", async () => {
    asUser("friend");
    await expect(
      leaveTrip(null, form({ tripId: "t1", userId: "owner" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(memberDeleteMany.mock.calls[0][0].where).toEqual({
      tripId: "t1",
      userId: "friend",
    });
  });
});
