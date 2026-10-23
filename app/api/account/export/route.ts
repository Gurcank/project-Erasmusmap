import { NextResponse } from "next/server";
import { buildAccountExport } from "@/lib/account-export";
import { requireActiveUser } from "@/lib/auth-guards";
import { logError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

// Builds a dozen queries and the whole file in memory, and is only ever wanted
// now and then.
const EXPORTS_PER_MINUTE = 5;

/**
 * The signed-in user's own data as a JSON download. Only ever their own: the id
 * comes from the session, never from the request.
 */
export async function GET() {
  const auth = await requireActiveUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (
    !(await rateLimit(`account-export:${auth.user.id}`, EXPORTS_PER_MINUTE))
  ) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    );
  }

  try {
    const data = await buildAccountExport(auth.user.id);
    const day = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="erasmusmap-data-${day}.json"`,
        // Personal data: never let a shared cache keep a copy.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logError("Account export failed", error, {
      route: "/api/account/export",
      routeType: "route",
    });
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
