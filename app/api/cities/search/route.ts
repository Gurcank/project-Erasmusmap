import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { latinize } from "@/lib/latinize";
import type { CitySuggestion } from "@/types";

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH) return NextResponse.json([]);

  // Aliases are stored already lowercased and de-accented, so the query is
  // normalized the same way before matching them. The city's own name keeps
  // its original spelling, so that side uses a case-insensitive match.
  const namePattern = `%${query}%`;
  const aliasPattern = `%${latinize(query).toLowerCase()}%`;

  try {
    const cities = await prisma.$queryRaw<CitySuggestion[]>`
      SELECT id, name, slug, country
      FROM "City"
      WHERE name ILIKE ${namePattern}
         OR EXISTS (
           SELECT 1 FROM unnest("searchAliases") AS alias
           WHERE alias LIKE ${aliasPattern}
         )
      ORDER BY
        CASE WHEN name ILIKE ${query + "%"} THEN 0 ELSE 1 END,
        population DESC NULLS LAST
      LIMIT ${RESULT_LIMIT}
    `;

    return NextResponse.json(cities);
  } catch {
    return NextResponse.json({ error: "Arama yapılamadı" }, { status: 500 });
  }
}
