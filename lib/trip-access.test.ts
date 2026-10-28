import { beforeEach, describe, expect, it, vi } from "vitest";

const tripFindUnique = vi.hoisted(() => vi.fn());
const memberFindUnique = vi.hoisted(() => vi.fn());
const isBlockedBetween = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: { findUnique: tripFindUnique },
    tripMember: { findUnique: memberFindUnique },
  },
}));
vi.mock("@/lib/social", () => ({ isBlockedBetween }));

import {
  atLeast,
  memberAccess,
  newShareToken,
  requireTripRole,
  SHARE_TOKEN_PATTERN,
  TRIP_NOT_FOUND,
} from "@/lib/trip-access";

const TRIP = { id: "t1", userId: "owner" };
const DAY = new Date("2027-01-01T00:00:00Z");

beforeEach(() => {
  vi.resetAllMocks();
  isBlockedBetween.mockResolvedValue(false);
  memberFindUnique.mockResolvedValue(null);
  tripFindUnique.mockResolvedValue({
    ...TRIP,
    startDate: DAY,
    endDate: DAY,
  });
});

describe("memberAccess", () => {
  it("gives the owner owner access without looking at members", async () => {
    expect(await memberAccess(TRIP, "owner")).toBe("owner");
    expect(memberFindUnique).not.toHaveBeenCalled();
  });

  it("gives a stranger nothing", async () => {
    expect(await memberAccess(TRIP, "stranger")).toBeNull();
  });

  it("maps an accepted member's role", async () => {
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "ACCEPTED" });
    expect(await memberAccess(TRIP, "friend")).toBe("editor");
    memberFindUnique.mockResolvedValue({ role: "VIEWER", status: "ACCEPTED" });
    expect(await memberAccess(TRIP, "friend")).toBe("viewer");
  });

  it("gives a pending invitation nothing, whatever role it carries", async () => {
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "PENDING" });
    expect(await memberAccess(TRIP, "friend")).toBeNull();
  });

  it("takes membership away across a block", async () => {
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "ACCEPTED" });
    isBlockedBetween.mockResolvedValue(true);
    expect(await memberAccess(TRIP, "friend")).toBeNull();
  });

  it("looks the member up by the trip and the caller together", async () => {
    await memberAccess(TRIP, "friend");
    expect(memberFindUnique.mock.calls[0][0].where).toEqual({
      tripId_userId: { tripId: "t1", userId: "friend" },
    });
  });
});

describe("requireTripRole", () => {
  it("lets the owner do everything", async () => {
    for (const minimum of ["viewer", "editor", "owner"] as const) {
      const result = await requireTripRole("t1", "owner", minimum);
      expect(result).toMatchObject({ id: "t1", access: "owner" });
    }
  });

  it("lets an editor edit contents but not what belongs to the owner", async () => {
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "ACCEPTED" });
    await expect(
      requireTripRole("t1", "friend", "editor"),
    ).resolves.toBeTruthy();
    await expect(requireTripRole("t1", "friend", "owner")).rejects.toThrow(
      TRIP_NOT_FOUND,
    );
  });

  it("keeps a viewer read-only", async () => {
    memberFindUnique.mockResolvedValue({ role: "VIEWER", status: "ACCEPTED" });
    await expect(requireTripRole("t1", "friend", "editor")).rejects.toThrow(
      TRIP_NOT_FOUND,
    );
  });

  it("answers a stranger, a pending invitee and a missing trip alike", async () => {
    const messages: string[] = [];
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "PENDING" });
    for (const [tripId, user] of [
      ["t1", "stranger"],
      ["t1", "friend"],
      ["missing", "owner"],
      ["", "owner"],
    ]) {
      if (tripId === "missing") tripFindUnique.mockResolvedValue(null);
      await requireTripRole(tripId, user, "viewer").catch((error: Error) =>
        messages.push(error.message),
      );
    }
    expect(messages).toEqual(Array(4).fill(TRIP_NOT_FOUND));
  });
});

describe("atLeast", () => {
  it("orders viewer, editor, owner", () => {
    expect(atLeast("editor", "viewer")).toBe(true);
    expect(atLeast("viewer", "editor")).toBe(false);
    expect(atLeast("owner", "owner")).toBe(true);
    expect(atLeast("editor", "owner")).toBe(false);
  });
});

describe("share tokens", () => {
  it("are 43 url-safe characters, the shape the database check accepts", () => {
    for (let i = 0; i < 50; i++) {
      expect(newShareToken()).toMatch(SHARE_TOKEN_PATTERN);
    }
    expect(SHARE_TOKEN_PATTERN.source).toBe("^[A-Za-z0-9_-]{43}$");
  });

  it("never repeat", () => {
    const tokens = new Set(Array.from({ length: 500 }, newShareToken));
    expect(tokens.size).toBe(500);
  });
});
