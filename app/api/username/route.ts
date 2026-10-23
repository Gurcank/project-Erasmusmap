import { setUsername } from "@/lib/user";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth-guards";
import { parseRequestBody, usernameRequestSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const auth = await requireActiveUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!(await rateLimit(`username:${auth.user.id}`))) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseRequestBody(usernameRequestSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { username } = parsed.data;

  try {
    if ((await setUsername(auth.user.id, username)) === "taken") {
      return NextResponse.json({ error: "Username alınmış" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
