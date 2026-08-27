import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// A health check that never touches its dependencies only reports that the
// process is up, which the platform already knows.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch {
    return NextResponse.json(
      { status: "error", database: "down" },
      { status: 503 },
    );
  }
}
