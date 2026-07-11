import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// City list changes rarely (seed-time only), so cache it instead of hitting
// the DB on every Navbar mount across every visitor.
export const revalidate = 3600;

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      select: { id: true, name: true, slug: true, country: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(cities);
  } catch {
    return NextResponse.json(
      { error: "Cities could not be fetched" },
      { status: 500 },
    );
  }
}
