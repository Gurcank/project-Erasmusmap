import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { MAX_COMMENTS_PER_REVIEW } from "@/lib/engagement";
import {
  COMMENT_QUERY,
  buildCommentTree,
  type CommentRow,
} from "@/lib/review-shape";

const row = (
  id: string,
  minute: number,
  parentId: string | null = null,
  userId: string | null = "u1",
): CommentRow =>
  ({
    id,
    content: id,
    createdAt: new Date(Date.UTC(2026, 9, 1, 12, minute)),
    parentId,
    user: userId
      ? { id: userId, name: null, image: null, username: userId }
      : null,
    _count: { likes: 0 },
  }) as unknown as CommentRow;

const ids = (comments: { id: string }[]) => comments.map((c) => c.id);

describe("COMMENT_QUERY", () => {
  it("bounds a thread, newest first, so the oldest are what is left out", () => {
    expect(COMMENT_QUERY.take).toBe(MAX_COMMENTS_PER_REVIEW);
    expect(COMMENT_QUERY.orderBy).toEqual({ createdAt: "desc" });
    expect(MAX_COMMENTS_PER_REVIEW).toBeGreaterThan(0);
  });
});

describe("buildCommentTree", () => {
  it("reads oldest first however the rows arrive", () => {
    const newestFirst = [row("c3", 30), row("c2", 20), row("c1", 10)];
    const tree = buildCommentTree(newestFirst, new Set());
    expect(ids(tree)).toEqual(["c1", "c2", "c3"]);
  });

  it("puts each reply under its parent, oldest reply first", () => {
    const rows = [
      row("r2", 40, "c1"),
      row("r1", 30, "c1"),
      row("c2", 20),
      row("c1", 10),
    ];
    const tree = buildCommentTree(rows, new Set());
    expect(ids(tree)).toEqual(["c1", "c2"]);
    expect(ids(tree[0].replies)).toEqual(["r1", "r2"]);
  });

  it("keeps a reply whose parent fell outside the page, at the top level", () => {
    // The parent was among the oldest comments, cut off by the cap.
    const tree = buildCommentTree([row("r1", 30, "gone")], new Set());
    expect(ids(tree)).toEqual(["r1"]);
  });

  it("drops comments by people the viewer must not see", () => {
    const rows = [row("c1", 10, null, "blocked"), row("c2", 20, null, "ok")];
    const tree = buildCommentTree(rows, new Set(), new Set(["blocked"]));
    expect(ids(tree)).toEqual(["c2"]);
  });

  it("does not mutate the rows it was given", () => {
    const rows = [row("c2", 20), row("c1", 10)];
    buildCommentTree(rows, new Set());
    expect(ids(rows)).toEqual(["c2", "c1"]);
  });
});
