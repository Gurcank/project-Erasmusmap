import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth-guards";
import { parseRequestBody, visitSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const auth = await requireActiveUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!(await rateLimit(`visit:${auth.user.email}`, 20))) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseRequestBody(visitSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { cityId } = parsed.data;
  const identity = { userId_cityId: { userId: auth.user.id, cityId } };

  try {
    const existing = await prisma.visit.findUnique({
      where: identity,
      select: { id: true },
    });

    if (existing) {
      await prisma.visit.delete({ where: { id: existing.id } });
      return NextResponse.json({ removed: true });
    }

    await prisma.visit.create({ data: { userId: auth.user.id, cityId } });
    return NextResponse.json({ added: true });
  } catch (error) {
    // P2003 is a foreign key violation — the city id does not exist.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json({ error: "Şehir bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
