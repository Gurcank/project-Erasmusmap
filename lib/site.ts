export const SITE_NAME = "ErasmusMap";
export const SITE_DESCRIPTION =
  "Erasmus öğrencileri için Avrupa şehirlerini keşfetme ve değerlendirme platformu.";

const FALLBACK_SITE_URL = "https://erasmusmap.vercel.app";

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
 */
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return FALLBACK_SITE_URL;

  try {
    return new URL(configured).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();
