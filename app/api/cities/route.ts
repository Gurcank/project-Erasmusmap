import { NextResponse } from "next/server";
import { getCities } from "@/lib/cities";

export async function GET() {
  try {
    return NextResponse.json(await getCities());
  } catch {
    return NextResponse.json(
      { error: "Cities could not be fetched" },
      { status: 500 },
    );
  }
}
