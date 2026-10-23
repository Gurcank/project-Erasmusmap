import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { getClientAddress } from "@/lib/request-ip";

// A health check that never touches its dependencies only reports that the
// process is up, which the platform already knows.
export const dynamic = "force-dynamic";

// Enough for a monitor polling every few seconds, low enough that the endpoint
// cannot be used to drive database load from outside.
const HEALTH_CHECKS_PER_MINUTE = 30;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  if (
    !(await rateLimit(
      `health:${getClientAddress(req.headers)}`,
      HEALTH_CHECKS_PER_MINUTE,
    ))
  ) {
    return NextResponse.json(
      { status: "error" },
      { status: 429, headers: NO_STORE },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "up" },
      { headers: NO_STORE },
    );
  } catch (error) {
    // The one place a down database is noticed by something other than a visitor.
    logError("Health check: database unreachable", error, {
      route: "/api/health",
      routeType: "route",
    });
    return NextResponse.json(
      { status: "error", database: "down" },
      { status: 503, headers: NO_STORE },
    );
  }
}
