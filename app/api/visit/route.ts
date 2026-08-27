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

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        visitedCities: { where: { id: cityId }, select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAlreadyVisited = user.visitedCities.length > 0;

    await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        visitedCities: isAlreadyVisited
          ? { disconnect: { id: cityId } }
          : { connect: { id: cityId } },
      },
    });

    return NextResponse.json(
      isAlreadyVisited ? { removed: true } : { added: true },
    );
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
