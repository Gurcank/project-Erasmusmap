import { describe, expect, it } from "vitest";
import { avatarPathFromUrl, newAvatarPath } from "@/lib/storage";

const USER_ID = "3f7c1a24-9b0e-4d51-8a6f-2c5d9e10b7a3";
const BUCKET_URL =
  "https://project.supabase.co/storage/v1/object/public/avatars";

describe("newAvatarPath", () => {
  // The reason the scheme changed: the bucket is public, so the key is visible
  // to anyone who can see the avatar.
  it("reveals nothing about the account it belongs to", () => {
    const path = newAvatarPath();
    expect(path).not.toContain(USER_ID);
    expect(path).toMatch(/^[0-9a-f]{32}\.webp$/);
  });

  it("is different every time, so a replaced avatar gets a new URL", () => {
    const paths = new Set(Array.from({ length: 100 }, () => newAvatarPath()));
    expect(paths.size).toBe(100);
  });
});

describe("avatarPathFromUrl", () => {
  it("recovers the key from a stored public URL", () => {
    expect(avatarPathFromUrl(`${BUCKET_URL}/abc123.webp`)).toBe("abc123.webp");
  });

  // Rows written before this change carry the old cache-busting query.
  it("ignores the query string", () => {
    expect(
      avatarPathFromUrl(`${BUCKET_URL}/${USER_ID}.webp?v=1700000000`),
    ).toBe(`${USER_ID}.webp`);
  });

  it("returns null for an avatar hosted elsewhere", () => {
    expect(
      avatarPathFromUrl("https://lh3.googleusercontent.com/a/photo=s96-c"),
    ).toBe(null);
  });

  it("returns null for a value that is not a URL", () => {
    expect(avatarPathFromUrl("not a url")).toBe(null);
    expect(avatarPathFromUrl("")).toBe(null);
  });
});
