import { describe, expect, it } from "vitest";
import { OFFERED_LANGUAGES } from "@/lib/i18n";
import { OG_LOCALES, canonicalFor, socialMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

describe("OG_LOCALES", () => {
  it("has a locale for every offered language", () => {
    for (const { code } of OFFERED_LANGUAGES) {
      expect(OG_LOCALES[code]).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
  });
});

describe("socialMetadata", () => {
  const base = {
    lang: "de",
    title: "Berlin",
    description: "Beschreibung",
  } as const;

  it("carries the whole card, so an overriding page loses nothing", () => {
    const { openGraph, twitter } = socialMetadata(base);
    expect(openGraph).toMatchObject({
      title: "Berlin",
      description: "Beschreibung",
      siteName: SITE_NAME,
      locale: "de_DE",
      type: "website",
      url: SITE_URL,
    });
    expect(twitter).toMatchObject({
      card: "summary_large_image",
      title: "Berlin",
    });
  });

  it("names the page's own address when given a path", () => {
    const { openGraph } = socialMetadata({ ...base, path: "/c/berlin" });
    expect(openGraph).toMatchObject({ url: `${SITE_URL}/c/berlin` });
  });
});

describe("canonicalFor", () => {
  it("is a relative path, resolved against metadataBase", () => {
    expect(canonicalFor("/c/berlin")).toEqual({
      alternates: { canonical: "/c/berlin" },
    });
  });
});
