/**
 * Every host the browser is allowed to reach, in one place.
 *
 * Shared by next.config.ts (which needs the image hosts for next/image's
 * remotePatterns) and proxy.ts (which builds the per-request CSP). Keeping the
 * two in one module is what stops them drifting: a host allowed by one and
 * refused by the other produces a broken image either way, and the failure is
 * silent.
 */

// Avatars are served from the project's own Supabase Storage bucket, whose
// host is only known from the environment.
function supabaseHost(): string | null {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function imageHosts(): string[] {
  const storageHost = supabaseHost();
  return [
    "images.unsplash.com",
    "*.googleusercontent.com",
    ...(storageHost ? [storageHost] : []),
  ];
}

// @vercel/analytics serves its production script from /_vercel/insights on our
// own origin, which 'self' already covers. Only its development build reaches
// out to this host, and leaving that blocked would put a permanent CSP error in
// the dev console — the fastest way to teach everyone to ignore CSP errors.
const VERCEL_ANALYTICS_DEV = "https://va.vercel-scripts.com";

// Mapbox serves the basemap style, its sprite sheet, its glyphs and its tiles
// from these. Both tile hosts are listed for images as well as for fetches:
// the style declares its sources as `mapbox://` URLs that the library resolves
// at runtime, and which host it picks — and whether a raster tile arrives as a
// fetch or as an <img> — depends on the library version. Allowing both in both
// places costs nothing and is the difference between a working basemap and a
// silently blank one.
const MAPBOX_TILE_HOSTS = [
  "https://api.mapbox.com",
  "https://*.tiles.mapbox.com",
];
// Telemetry only, and never an image.
const MAPBOX_CONNECT = [...MAPBOX_TILE_HOSTS, "https://events.mapbox.com"];

/**
 * Headers that are the same for every request, so they can stay in
 * next.config.ts rather than costing a proxy invocation.
 */
export const STATIC_SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    // `preload` only takes effect once the apex domain is submitted to the
    // preload list; on a *.vercel.app subdomain it is inert but harmless, and
    // it is the setting a custom domain will want.
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // allow-popups rather than same-origin: OAuth here is a full-page redirect
  // today, but a popup-based provider would break silently under the stricter
  // value, and the isolation this buys is the same for our purposes.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

/**
 * The per-request policy. The nonce is what lets the one inline script in the
 * application (the theme initialiser in app/layout.tsx) run while every other
 * inline script stays blocked.
 *
 * `'strict-dynamic'` is deliberately absent. It would cause the browser to
 * ignore `'self'`, and @vercel/analytics injects a plain `<script>` element it
 * gives no nonce to — the policy would kill analytics silently. Without it,
 * `'self'` does the allowlisting, and here that is a tight list rather than the
 * usual weak one: the application loads no script from any external origin, so
 * there is no third-party host on the list to smuggle a payload through.
 */
export function contentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean,
): string {
  const directives = [
    "default-src 'self'",
    // React rebuilds server error stacks with eval in development only.
    `script-src 'self' 'nonce-${nonce}'${
      isDevelopment ? ` 'unsafe-eval' ${VERCEL_ANALYTICS_DEV}` : ""
    }`,
    // No nonce here on purpose: a nonce in style-src makes browsers ignore
    // 'unsafe-inline', and React writes real `style` attributes (next/image
    // with `fill`, among others) that would then be dropped. Style injection
    // is a far smaller problem than script injection.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${MAPBOX_TILE_HOSTS.join(" ")} ${imageHosts()
      .map((host) => `https://${host}`)
      .join(" ")}`,
    // next/font self-hosts the Google fonts at build time, so no font host.
    "font-src 'self' data:",
    // Unsplash is absent: it is only ever called from the server.
    `connect-src 'self' ${MAPBOX_CONNECT.join(" ")}${
      isDevelopment ? ` ws: wss: ${VERCEL_ANALYTICS_DEV}` : ""
    }`,
    // Mapbox GL runs its tile parser in a worker created from a blob URL.
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Google is listed because next-auth starts the OAuth flow by submitting a
    // form that redirects there, and some browsers apply form-action across
    // the redirect.
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
  ];

  // Would try to upgrade http://localhost in development.
  if (!isDevelopment) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}
