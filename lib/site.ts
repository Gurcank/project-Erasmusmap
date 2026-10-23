export const SITE_NAME = "ErasmusMap";
export const SITE_DESCRIPTION =
  "Erasmus öğrencileri için Avrupa şehirlerini keşfetme ve değerlendirme platformu.";

const FALLBACK_SITE_URL = "https://erasmusmap.vercel.app";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseOrigin(value: string | undefined): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

/**
 * Canonical origin behind the metadata, Open Graph tags, robots.txt and the
 * sitemap.
 *
 * Resolved through a guard rather than `??`, which only falls back on null and
 * undefined. An environment variable that is defined but empty — what a blank
 * field in a hosting dashboard leaves behind — went straight to `new URL("")`
 * and failed the production build while Next was collecting page data.
 * Whitespace and malformed values are treated the same way.
 *
 * Normalized to the origin, so a configured trailing slash cannot turn into
 * `https://host//c/slug` in the sitemap.
 *
 * A loopback address is ignored on Vercel. The value is easy to copy over from
 * `.env.example`, and on a deployment it put `http://localhost:3000` into every
 * canonical URL, Open Graph tag and sitemap entry. The production domain Vercel
 * exposes is used instead, then the fallback.
 */
function resolveSiteUrl(): string {
  const configured = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const onVercel = Boolean(process.env.VERCEL_ENV);

  if (configured && !(onVercel && LOOPBACK_HOSTS.has(configured.hostname))) {
    return configured.origin;
  }

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const fromVercel = vercelDomain && parseOrigin(`https://${vercelDomain}`);
  return fromVercel ? fromVercel.origin : FALLBACK_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();
