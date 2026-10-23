const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The origin NextAuth builds its callback addresses from, for the case where the
 * environment variable it reads is wrong.
 *
 * `NEXTAUTH_URL` is easy to copy over from `.env.example` with its local value.
 * On production that sends Google's answer to `http://localhost:3000`, on the
 * visitor's own machine, and nobody can sign in. A loopback or missing value is
 * therefore replaced there by the site's own address; anything else, and every
 * environment other than production, is left alone and `null` is returned.
 *
 * Only production: a preview deployment has its own host that Google does not
 * know, and sending it to the production address would be worse than failing.
 */
export function authUrlOverride(
  env: Record<string, string | undefined>,
  siteUrl: string,
): string | null {
  if (env.VERCEL_ENV !== "production") return null;

  const configured = env.NEXTAUTH_URL?.trim();
  if (configured) {
    try {
      if (!LOOPBACK_HOSTS.has(new URL(configured).hostname)) return null;
    } catch {
      // Not a URL at all: as good as missing.
    }
  }
  return siteUrl;
}
