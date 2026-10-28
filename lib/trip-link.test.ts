import { beforeEach, describe, expect, it, vi } from "vitest";

const tripFindUnique = vi.hoisted(() => vi.fn());
const tripUpdate = vi.hoisted(() => vi.fn());
const tripUpdateMany = vi.hoisted(() => vi.fn());
const tripFindMany = vi.hoisted(() => vi.fn());
const memberFindUnique = vi.hoisted(() => vi.fn());
const itemDeleteMany = vi.hoisted(() => vi.fn());
const isBlockedBetween = vi.hoisted(() => vi.fn());
const authorizeAction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trip: {
      findUnique: tripFindUnique,
      update: tripUpdate,
      updateMany: tripUpdateMany,
      findMany: tripFindMany,
    },
    tripMember: { findUnique: memberFindUnique },
    tripItem: { deleteMany: itemDeleteMany },
    review: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock("@/lib/social", () => ({ isBlockedBetween }));
vi.mock("@/lib/action-guard", () => ({ authorizeAction }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { newShareToken } from "@/lib/trip-access";
import {
  deleteTripItem,
  rotateShareLink,
  setTripVisibility,
} from "@/lib/trip-actions";
import {
  getTripByShareToken,
  getTripForViewer,
  getUserTrips,
} from "@/lib/trips";

const DAY = new Date("2027-01-01T00:00:00Z");
const TOKEN = newShareToken();
const NOT_FOUND = { ok: false, error: "Plan bulunamadı" };

const row = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  userId: "owner",
  title: "Trip",
  description: null,
  startDate: DAY,
  endDate: DAY,
  budget: 0,
  currency: "EUR",
  visibility: "PRIVATE",
  shareToken: null,
  user: { id: "owner", username: "ada", name: null },
  items: [],
  expenses: [],
  cities: [],
  ...over,
});

const linked = () => row({ visibility: "LINK", shareToken: TOKEN });

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.resetAllMocks();
  isBlockedBetween.mockResolvedValue(false);
  memberFindUnique.mockResolvedValue(null);
  tripUpdate.mockResolvedValue({});
  tripUpdateMany.mockResolvedValue({ count: 1 });
  itemDeleteMany.mockResolvedValue({ count: 1 });
});

describe("getTripForViewer", () => {
  it("shows a private plan to nobody but the owner and members", async () => {
    tripFindUnique.mockResolvedValue(row());
    expect(await getTripForViewer("t1", null, [])).toBeNull();
    expect(await getTripForViewer("t1", "stranger", [])).toBeNull();
    expect((await getTripForViewer("t1", "owner", []))?.access).toBe("owner");
  });

  it("does not open a link-only plan at its own address to a stranger", async () => {
    tripFindUnique.mockResolvedValue(linked());
    expect(await getTripForViewer("t1", null, [])).toBeNull();
    expect(await getTripForViewer("t1", "stranger", [])).toBeNull();
  });

  it("opens a public plan to everyone, read-only, except across a block", async () => {
    tripFindUnique.mockResolvedValue(row({ visibility: "PUBLIC" }));
    expect((await getTripForViewer("t1", null, []))?.access).toBe("viewer");
    isBlockedBetween.mockResolvedValue(true);
    expect(await getTripForViewer("t1", "stranger", [])).toBeNull();
  });

  it("opens a private plan to an accepted member only", async () => {
    tripFindUnique.mockResolvedValue(row());
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "ACCEPTED" });
    expect((await getTripForViewer("t1", "friend", []))?.access).toBe("editor");
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "PENDING" });
    expect(await getTripForViewer("t1", "friend", [])).toBeNull();
  });

  it("sends the share token to the owner and to no one else", async () => {
    tripFindUnique.mockResolvedValue(linked());
    expect((await getTripForViewer("t1", "owner", []))?.trip.shareToken).toBe(
      TOKEN,
    );
    memberFindUnique.mockResolvedValue({ role: "VIEWER", status: "ACCEPTED" });
    expect(
      (await getTripForViewer("t1", "friend", []))?.trip.shareToken,
    ).toBeNull();
  });
});

describe("getTripByShareToken", () => {
  it("never reaches the database for a token of the wrong shape", async () => {
    const bad = ["", "abc", `${TOKEN}x`, TOKEN.slice(1), `${TOKEN.slice(1)}!`];
    for (const token of bad) {
      expect(await getTripByShareToken(token, null, [])).toBeNull();
    }
    expect(tripFindUnique).not.toHaveBeenCalled();
  });

  it("answers an unknown token as nothing", async () => {
    tripFindUnique.mockResolvedValue(null);
    expect(await getTripByShareToken(TOKEN, null, [])).toBeNull();
  });

  it("ignores a plan that is no longer in link mode", async () => {
    tripFindUnique.mockResolvedValue(
      row({ visibility: "PRIVATE", shareToken: TOKEN }),
    );
    expect(await getTripByShareToken(TOKEN, null, [])).toBeNull();
  });

  it("opens a link-mode plan read-only without sending the token on", async () => {
    tripFindUnique.mockResolvedValue(linked());
    const result = await getTripByShareToken(TOKEN, null, []);
    expect(result?.access).toBe("viewer");
    expect(result?.trip.shareToken).toBeNull();
    expect(tripFindUnique.mock.calls[0][0].where).toEqual({
      shareToken: TOKEN,
    });
  });

  it("refuses across a block", async () => {
    tripFindUnique.mockResolvedValue(linked());
    isBlockedBetween.mockResolvedValue(true);
    expect(await getTripByShareToken(TOKEN, "blocked", [])).toBeNull();
  });
});

describe("trip actions and roles", () => {
  const asUser = (id: string) =>
    authorizeAction.mockResolvedValue({ id, username: id });

  it("turns link mode on with a fresh token, keeps it on repeat, drops it on leaving", async () => {
    asUser("owner");
    tripFindUnique
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce({ shareToken: null });
    await setTripVisibility(null, form({ tripId: "t1", visibility: "LINK" }));
    const created = tripUpdate.mock.calls[0][0].data;
    expect(created.visibility).toBe("LINK");
    expect(created.shareToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    tripFindUnique
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce({ shareToken: TOKEN });
    await setTripVisibility(null, form({ tripId: "t1", visibility: "LINK" }));
    expect(tripUpdate.mock.calls[1][0].data.shareToken).toBe(TOKEN);

    tripFindUnique
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce({ shareToken: TOKEN });
    await setTripVisibility(null, form({ tripId: "t1", visibility: "PUBLIC" }));
    expect(tripUpdate.mock.calls[2][0].data).toEqual({
      visibility: "PUBLIC",
      shareToken: null,
    });
  });

  it("reads an unknown visibility as private and keeps no link", async () => {
    asUser("owner");
    tripFindUnique
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce({ shareToken: TOKEN });
    await setTripVisibility(null, form({ tripId: "t1", visibility: "ADMIN" }));
    expect(tripUpdate.mock.calls[0][0].data).toEqual({
      visibility: "PRIVATE",
      shareToken: null,
    });
  });

  it("lets only the owner change visibility or the link", async () => {
    asUser("friend");
    tripFindUnique.mockResolvedValue(row());
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "ACCEPTED" });
    const a = await setTripVisibility(
      null,
      form({ tripId: "t1", visibility: "PUBLIC" }),
    );
    const b = await rotateShareLink(null, form({ tripId: "t1" }));
    expect(a).toEqual(NOT_FOUND);
    expect(b).toEqual(NOT_FOUND);
    expect(tripUpdate).not.toHaveBeenCalled();
    expect(tripUpdateMany).not.toHaveBeenCalled();
  });

  it("replaces the link only on a plan that is in link mode", async () => {
    asUser("owner");
    tripFindUnique.mockResolvedValue(row());
    await rotateShareLink(null, form({ tripId: "t1" }));
    const call = tripUpdateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "t1", visibility: "LINK" });
    expect(call.data.shareToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    tripUpdateMany.mockResolvedValue({ count: 0 });
    expect(await rotateShareLink(null, form({ tripId: "t1" }))).toEqual(
      NOT_FOUND,
    );
  });

  it("keeps a viewer, a pending invitee and a stranger from changing contents", async () => {
    asUser("friend");
    tripFindUnique.mockResolvedValue(row());
    for (const member of [
      { role: "VIEWER", status: "ACCEPTED" },
      { role: "EDITOR", status: "PENDING" },
      null,
    ]) {
      memberFindUnique.mockResolvedValue(member);
      const result = await deleteTripItem(
        null,
        form({ tripId: "t1", itemId: "i1" }),
      );
      expect(result.ok).toBe(false);
    }
    expect(itemDeleteMany).not.toHaveBeenCalled();
  });

  it("lets an accepted editor change contents, scoped to the trip", async () => {
    asUser("friend");
    tripFindUnique.mockResolvedValue(row());
    memberFindUnique.mockResolvedValue({ role: "EDITOR", status: "ACCEPTED" });
    const data = form({ tripId: "t1", itemId: "i1", userId: "owner" });
    expect(await deleteTripItem(null, data)).toEqual({ ok: true });
    expect(itemDeleteMany.mock.calls[0][0].where).toEqual({
      id: "i1",
      tripId: "t1",
    });
  });
});

describe("getUserTrips", () => {
  it("lists only public plans on someone else's profile, never link-only ones", async () => {
    tripFindMany.mockResolvedValue([]);
    await getUserTrips("owner", false);
    expect(tripFindMany.mock.calls[0][0].where).toEqual({
      userId: "owner",
      visibility: "PUBLIC",
    });
  });
});
