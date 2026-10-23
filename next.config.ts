import type { NextConfig } from "next";
import { legalPlaceholdersLeft } from "./lib/legal/config";
import { imageHosts, STATIC_SECURITY_HEADERS } from "./lib/security-headers";

// The privacy policy and the terms name who runs the site and how to reach them.
// Those facts live in lib/legal/config.ts, and a production build refuses to go
// out while any of them is still a placeholder: a policy with "[VERİ SORUMLUSU
// ADI]" printed in it is worse than none. Previews and local builds are not
// held up by it.
const placeholders = legalPlaceholdersLeft();
if (process.env.VERCEL_ENV === "production" && placeholders.length > 0) {
  throw new Error(
    `Legal placeholders not filled in lib/legal/config.ts: ${placeholders.join(", ")}`,
  );
}

// The Content-Security-Policy is not here: it carries a per-request nonce and
// is therefore built in proxy.ts. Everything in this file is identical for
// every response.
const nextConfig: NextConfig = {
  // Nothing gains from advertising the framework and version.
  poweredByHeader: false,
  images: {
    remotePatterns: imageHosts().map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: STATIC_SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
