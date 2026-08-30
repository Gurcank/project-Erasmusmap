import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { contentSecurityPolicy } from "@/lib/security-headers";

/**
 * Runs before every page render to attach a fresh CSP nonce.
 *
 * Next.js reads the nonce back out of the `Content-Security-Policy` request
 * header set below and applies it to the framework's own script tags, which is
 * why the policy has to be set on the request as well as the response.
 */

// Pages that have nothing to show a signed-out visitor. This is a convenience
// redirect, not the security boundary: Next's own documentation warns that a
// matcher change silently removes proxy coverage from a route, and that server
// functions must therefore check authorization themselves — which every action
// in lib/ already does through requireActiveUser.
const SIGNED_IN_ONLY = [
  "/account",
  "/admin",
  "/settings",
  "/choose-username",
] as const;

function isSignedInOnly(pathname: string): boolean {
  return SIGNED_IN_ONLY.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );

  // Only document requests are redirected. A server action arrives as a POST to
  // the page it lives on, and answering that with a redirect would break the
  // action's response rather than deny it.
  if (request.method === "GET" && isSignedInOnly(request.nextUrl.pathname)) {
    const secret = process.env.NEXTAUTH_SECRET;
    // Fail open when the secret is missing: getToken would return null for
    // everyone and lock signed-in users out of their own account pages. The
    // page-level guard still refuses the request.
    if (secret) {
      const token = await getToken({ req: request, secret });
      if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Skips API routes (JSON, no CSP to enforce), Next's own static output,
      // and the files served straight from public/ — the map's geojson alone
      // would otherwise cost a proxy invocation per load.
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|map/|globe-backdrop).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
