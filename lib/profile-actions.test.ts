import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizeAction = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/action-guard", () => ({ authorizeAction }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update } } }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/unsplash", () => ({ fetchCityPhoto: vi.fn() }));

import { setAvatar } from "@/lib/profile-actions";

const form = (avatar?: string) => {
  const data = new FormData();
  if (avatar !== undefined) data.set("avatar", avatar);
  return data;
};

beforeEach(() => {
  vi.resetAllMocks();
  authorizeAction.mockResolvedValue({ id: "u1", username: "ada" });
  update.mockResolvedValue({});
});

describe("setAvatar", () => {
  it("stores a valid avatar for the signed-in user only", async () => {
    expect(await setAvatar(null, form("hiker"))).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { avatar: "hiker" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/u/ada");
  });

  it("ignores any user id in the form: the target is always the caller", async () => {
    const data = form("hiker");
    data.set("userId", "someone-else");
    await setAvatar(null, data);
    expect(update.mock.calls[0][0].where).toEqual({ id: "u1" });
  });

  it("rejects a value that is not in the list, without writing", async () => {
    for (const value of ["", "nope", "https://evil.example/a.png", "<svg>"]) {
      const result = await setAvatar(null, form(value));
      expect(result).toEqual({ ok: false, error: "Geçersiz avatar" });
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a missing field", async () => {
    expect(await setAvatar(null, form())).toMatchObject({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a file where a string was expected", async () => {
    const data = new FormData();
    data.set("avatar", new File(["x"], "hiker"));
    expect(await setAvatar(null, data)).toMatchObject({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });

  it("is rate limited and authenticated through the shared guard", async () => {
    await setAvatar(null, form("hiker"));
    expect(authorizeAction).toHaveBeenCalledWith("avatar", { limit: 20 });
  });

  it("does not write when the guard refuses", async () => {
    authorizeAction.mockRejectedValue(new Error("nope"));
    const result = await setAvatar(null, form("hiker"));
    expect(result).toMatchObject({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });
});
