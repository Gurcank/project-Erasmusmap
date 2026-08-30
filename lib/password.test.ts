import { describe, expect, it } from "vitest";
import {
  getWeakPasswordReason,
  passwordSchema,
  PASSWORD_MAX_BYTES,
} from "@/lib/password";

describe("passwordSchema", () => {
  it("accepts a password of reasonable length", () => {
    expect(passwordSchema.safeParse("correct-horse-battery").success).toBe(
      true,
    );
  });

  it("rejects a short password", () => {
    expect(passwordSchema.safeParse("short7").success).toBe(false);
  });

  // bcrypt ignores everything past 72 bytes, so anything longer is not the
  // password the user believes they set.
  it("rejects a password longer than bcrypt hashes", () => {
    expect(
      passwordSchema.safeParse("a".repeat(PASSWORD_MAX_BYTES)).success,
    ).toBe(true);
    expect(
      passwordSchema.safeParse("a".repeat(PASSWORD_MAX_BYTES + 1)).success,
    ).toBe(false);
  });

  it("counts bytes, not characters", () => {
    // Each "ö" is two bytes in UTF-8, so 40 of them exceed the ceiling that
    // 40 ASCII characters would sit comfortably under.
    expect(passwordSchema.safeParse("ö".repeat(40)).success).toBe(false);
    expect(passwordSchema.safeParse("ö".repeat(36)).success).toBe(true);
  });
});

describe("getWeakPasswordReason", () => {
  it("accepts a password with no known weakness", () => {
    expect(getWeakPasswordReason("mavi-tren-42-kule", "ada@example.com")).toBe(
      null,
    );
  });

  it("rejects a password from the common list", () => {
    expect(getWeakPasswordReason("password123")).not.toBe(null);
    expect(getWeakPasswordReason("Sifre123")).not.toBe(null);
  });

  it("rejects a single repeated character", () => {
    expect(getWeakPasswordReason("aaaaaaaaaa")).not.toBe(null);
  });

  it("rejects a password built from the account's own address", () => {
    expect(getWeakPasswordReason("ada12345678", "Ada@example.com")).not.toBe(
      null,
    );
  });

  it("ignores a local part too short to mean anything", () => {
    expect(getWeakPasswordReason("ab-mavi-tren-42", "ab@example.com")).toBe(
      null,
    );
  });
});
