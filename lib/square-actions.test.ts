import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizeAction = vi.hoisted(() => vi.fn());
const reviewFind = vi.hoisted(() => vi.fn());
const commentFind = vi.hoisted(() => vi.fn());
const commentCreate = vi.hoisted(() => vi.fn());
const isBlockedBetween = vi.hoisted(() => vi.fn());

vi.mock("@/lib/action-guard", () => ({ authorizeAction }));
vi.mock("@/lib/auth-guards", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/social", () => ({ isBlockedBetween }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: { findUnique: reviewFind },
    reviewComment: { findUnique: commentFind, create: commentCreate },
  },
}));

import { addReviewComment } from "@/lib/square-actions";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

// The row the action reads, and revalidateReview reads again for the city slug.
const reviewBy = (userId: string | null) => ({
  userId,
  city: { slug: "berlin" },
});

const reply = (extra: Record<string, string> = {}) =>
  addReviewComment(
    null,
    form({ reviewId: "r1", content: "Katılıyorum", ...extra }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  authorizeAction.mockResolvedValue({ id: "me", username: "me" });
  reviewFind.mockResolvedValue(reviewBy("author"));
  commentCreate.mockResolvedValue({});
  isBlockedBetween.mockResolvedValue(false);
});

describe("addReviewComment and blocks", () => {
  it("comments when nobody is blocked", async () => {
    expect(await reply()).toEqual({ ok: true });
    expect(commentCreate).toHaveBeenCalledTimes(1);
  });

  it("refuses a comment on a review whose author is blocked either way", async () => {
    isBlockedBetween.mockImplementation(
      async (_viewer: string, other: string) => other === "author",
    );
    const result = await reply();
    expect(result).toEqual({ ok: false, error: "Bu yoruma yanıt veremezsin" });
    expect(commentCreate).not.toHaveBeenCalled();
  });

  it("refuses a reply to a comment whose author is blocked, even on an unblocked review", async () => {
    commentFind.mockResolvedValue({
      id: "c1",
      reviewId: "r1",
      parentId: null,
      userId: "blocker",
    });
    isBlockedBetween.mockImplementation(
      async (_viewer: string, other: string) => other === "blocker",
    );
    const result = await reply({ parentId: "c1" });
    expect(result).toMatchObject({ ok: false });
    expect(commentCreate).not.toHaveBeenCalled();
  });

  it("does not check a block against yourself", async () => {
    reviewFind.mockResolvedValue(reviewBy("me"));
    await reply();
    expect(isBlockedBetween).not.toHaveBeenCalled();
    expect(commentCreate).toHaveBeenCalledTimes(1);
  });

  it("allows a comment on a review whose author is gone", async () => {
    reviewFind.mockResolvedValue(reviewBy(null));
    expect(await reply()).toEqual({ ok: true });
    expect(isBlockedBetween).not.toHaveBeenCalled();
  });

  it("reports a missing review before writing anything", async () => {
    reviewFind.mockResolvedValue(null);
    expect(await reply()).toEqual({ ok: false, error: "Yorum bulunamadı" });
    expect(commentCreate).not.toHaveBeenCalled();
  });
});
