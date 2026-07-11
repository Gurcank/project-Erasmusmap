import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cityId } = await req.json();

  if (!cityId || typeof cityId !== "string") {
    return NextResponse.json({ error: "Invalid cityId" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        visitedCities: { where: { id: cityId }, select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAlreadyVisited = user.visitedCities.length > 0;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        visitedCities: isAlreadyVisited
          ? { disconnect: { id: cityId } }
          : { connect: { id: cityId } },
      },
    });

    return NextResponse.json(isAlreadyVisited ? { removed: true } : { added: true });
  } catch {
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
