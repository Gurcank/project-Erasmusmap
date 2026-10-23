import type { NextConfig } from "next";
import { legalPlaceholdersLeft } from "./lib/legal/config";
import { imageHosts, STATIC_SECURITY_HEADERS } from "./lib/security-headers";

// The privacy policy and the terms name who runs the site and how to reach them.
// Those facts live in lib/legal/config.ts. While any of them is still a
// placeholder the production deployment does not show the pages or link to them
// (legalPagesAvailable); the build itself goes ahead, because a stuck build also
// holds back every security fix behind it. Set REQUIRE_LEGAL_CONFIG=1 on the
// project to make it refuse instead, once the values are in and a regression
// should be loud.
const placeholders = legalPlaceholdersLeft();
if (process.env.VERCEL_ENV === "production" && placeholders.length > 0) {
  const message = `Legal placeholders not filled in lib/legal/config.ts: ${placeholders.join(", ")}`;
  if (process.env.REQUIRE_LEGAL_CONFIG === "1") throw new Error(message);
  console.warn(
    `WARNING: ${message}. The privacy policy and the terms are NOT published until they are.`,
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
