import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/schemas";

const validRegistration = {
  name: "Ada",
  email: "ada@example.com",
  password: "mavi-tren-42-kule",
};

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  // Without this, the same person has two accounts and cannot sign in with the
  // casing Google reports.
  it("stores the address lowercased", () => {
    const parsed = registerSchema.parse({
      ...validRegistration,
      email: "  Ada@Example.COM  ",
    });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects a malformed address", () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, email: "ada@" }).success,
    ).toBe(false);
  });

  it("rejects a weak password and blames the password field", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "password123",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("rejects a password containing the address", () => {
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        password: "ada-ada-ada-1",
      }).success,
    ).toBe(false);
  });
});
