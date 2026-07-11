import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { rateLimit } from "@/lib/rate-limit";

const BCRYPT_SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`register:${ip}`, 5)) {
    return NextResponse.json(
      { error: "Çok fazla deneme. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    );
  }

  const { name, email, password } = await req.json();

  if (
    !email ||
    !password ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return NextResponse.json(
      { error: "Email ve şifre gerekli" },
      { status: 400 },
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Geçerli bir email adresi gir" },
      { status: 400 },
    );
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { error: `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı` },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { error: "Bu email zaten kayıtlı" },
      { status: 400 },
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    return NextResponse.json({ message: "Kayıt başarılı" });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
