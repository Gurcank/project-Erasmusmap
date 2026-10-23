import { describe, expect, it, vi } from "vitest";
import { createAuthAdapter } from "@/lib/auth-adapter";
import type { PrismaClient } from "@prisma/client";

function fakePrisma() {
  const accountCreate = vi.fn().mockResolvedValue({});
  const userCreate = vi.fn().mockResolvedValue({ id: "u1" });
  const prisma = {
    account: { create: accountCreate },
    user: { create: userCreate },
  } as unknown as PrismaClient;
  return { prisma, accountCreate, userCreate };
}

const googleAccount = {
  userId: "u1",
  type: "oauth" as const,
  provider: "google",
  providerAccountId: "1234567890",
  access_token: "ya29.live-access-token",
  refresh_token: "1//live-refresh-token",
  id_token: "eyJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6ImFkYUBleGFtcGxlLmNvbSJ9.sig",
  session_state: "abc",
  expires_at: 1792670000,
  token_type: "bearer" as const,
  scope: "openid email profile",
};

describe("createAuthAdapter", () => {
  it("stores only who the account is when linking", async () => {
    const { prisma, accountCreate } = fakePrisma();
    await createAuthAdapter(prisma).linkAccount!(googleAccount);

    expect(accountCreate).toHaveBeenCalledTimes(1);
    expect(accountCreate).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        type: "oauth",
        provider: "google",
        providerAccountId: "1234567890",
      },
    });
  });

  it("never passes a token, however many the provider sent", async () => {
    const { prisma, accountCreate } = fakePrisma();
    await createAuthAdapter(prisma).linkAccount!(googleAccount);

    const written = JSON.stringify(accountCreate.mock.calls[0][0]);
    for (const secret of [
      googleAccount.access_token,
      googleAccount.refresh_token,
      googleAccount.id_token,
    ]) {
      expect(written).not.toContain(secret);
    }
    const data = accountCreate.mock.calls[0][0].data;
    for (const field of [
      "access_token",
      "refresh_token",
      "id_token",
      "session_state",
      "expires_at",
      "token_type",
      "scope",
    ]) {
      expect(data).not.toHaveProperty(field);
    }
  });

  it("drops the Google profile photo when the user is created or updated", async () => {
    const { prisma, userCreate } = fakePrisma();
    const userUpdate = vi.fn().mockResolvedValue({ id: "u1" });
    (prisma.user as unknown as { update: typeof userUpdate }).update =
      userUpdate;
    const adapter = createAuthAdapter(prisma);
    const photo = "https://lh3.googleusercontent.com/a/photo";

    await adapter.createUser!({
      id: "ignored",
      email: "ada@example.com",
      emailVerified: null,
      name: "Ada",
      image: photo,
    });
    await adapter.updateUser!({ id: "u1", name: "Ada L", image: photo });

    expect(userCreate.mock.calls[0][0].data).toMatchObject({ name: "Ada" });
    expect(userCreate.mock.calls[0][0].data).not.toHaveProperty("image");
    expect(userUpdate.mock.calls[0][0].data).toMatchObject({ name: "Ada L" });
    expect(userUpdate.mock.calls[0][0].data).not.toHaveProperty("image");
  });

  it("leaves the rest of the adapter untouched", async () => {
    const { prisma, userCreate } = fakePrisma();
    const adapter = createAuthAdapter(prisma);

    await adapter.createUser!({
      id: "ignored",
      email: "ada@example.com",
      emailVerified: null,
    });

    expect(userCreate).toHaveBeenCalledTimes(1);
    expect(adapter.getUserByAccount).toBeTypeOf("function");
    expect(adapter.getSessionAndUser).toBeTypeOf("function");
  });
});
