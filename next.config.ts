import type { NextConfig } from "next";
import { imageHosts, STATIC_SECURITY_HEADERS } from "./lib/security-headers";

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
