import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GENERIC_ERROR_MESSAGE,
  UserFacingError,
  toActionResult,
} from "@/lib/action-result";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toActionResult", () => {
  it("reports success when the body completes", async () => {
    expect(await toActionResult(async () => {})).toEqual({ ok: true });
  });

  it("passes a UserFacingError message through", async () => {
    const result = await toActionResult(async () => {
      throw new UserFacingError("Yorum bulunamadı");
    });
    expect(result).toEqual({ ok: false, error: "Yorum bulunamadı" });
  });

  it("hides the message of any other error and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const leak = new Error(
      "Invalid `prisma.follow.create()`: Unique constraint failed on the fields: (`followerId`,`followingId`)",
    );

    const result = await toActionResult(async () => {
      throw leak;
    });

    expect(result).toEqual({ ok: false, error: GENERIC_ERROR_MESSAGE });
    expect(JSON.stringify(result)).not.toContain("followerId");
    // Logged for the operator, as one structured line.
    expect(log).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(log.mock.calls[0][0]));
    expect(line).toMatchObject({
      level: "error",
      msg: "Server action failed",
      routeType: "action",
    });
    expect(line.error.name).toBe("Error");
  });

  it("hides a thrown value that is not an Error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await toActionResult(async () => {
      throw "boom";
    });
    expect(result).toEqual({ ok: false, error: GENERIC_ERROR_MESSAGE });
  });

  it("re-throws Next.js control-flow errors untouched", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/trips;307;",
    });
    await expect(
      toActionResult(async () => {
        throw redirect;
      }),
    ).rejects.toBe(redirect);
  });
});
