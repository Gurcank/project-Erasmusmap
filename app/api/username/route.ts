import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getUsernameError } from "@/lib/username";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`username:${session.user.email}`)) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen biraz sonra tekrar dene." }, { status: 429 });
  }

  const { username } = await req.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Kullanıcı adı gerekli" }, { status: 400 });
  }

  const validationError = getUsernameError(username);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const isTaken = await prisma.user.findUnique({ where: { username } });

    if (isTaken) {
      return NextResponse.json(
        { error: "Username alınmış" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { username },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
