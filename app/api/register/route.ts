import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { rateLimit } from "@/lib/rate-limit";
import { generateUniqueUsername } from "@/lib/user";
import { parseRequestBody, registerSchema } from "@/lib/schemas";
import { BCRYPT_SALT_ROUNDS } from "@/lib/password";
import { getClientAddress } from "@/lib/request-ip";

export async function POST(req: Request) {
  const clientAddress = getClientAddress(req.headers);
  if (!(await rateLimit(`register:${clientAddress}`, 5))) {
    return NextResponse.json(
      { error: "Çok fazla deneme. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseRequestBody(registerSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Bu email zaten kayıtlı" },
      { status: 400 },
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    // Credentials sign-up bypasses the adapter, so the createUser event that
    // assigns usernames to OAuth accounts never fires here — without this the
    // account would have no reachable profile URL at all.
    const username = await generateUniqueUsername(name || email.split("@")[0]);

    await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        username,
        usernameLower: username.toLowerCase(),
      },
    });

    return NextResponse.json({ message: "Kayıt başarılı" });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
