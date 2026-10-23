import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LEGAL_CONFIG,
  legalPagesAvailable,
  legalPlaceholdersLeft,
} from "@/lib/legal/config";
import { getLegalDocument, legalLangFor, type LegalKind } from "@/lib/legal";
import { CONSENT_COOKIE } from "@/lib/consent";
import { imageHosts } from "@/lib/security-headers";
import type { LegalDocument } from "@/lib/legal/types";

const KINDS: LegalKind[] = ["privacy", "terms"];
const LANGS = ["tr", "en"] as const;

const text = (doc: LegalDocument) =>
  [
    doc.title,
    doc.updated,
    doc.intro ?? "",
    ...doc.sections.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.items ?? []),
      ...(section.after ?? []),
    ]),
  ].join("\n");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("legal documents", () => {
  it("exist in Turkish and English with the same structure", () => {
    for (const kind of KINDS) {
      const tr = getLegalDocument(kind, "tr");
      const en = getLegalDocument(kind, "en");
      expect(tr.sections.length).toBe(en.sections.length);
      expect(tr.title).not.toBe(en.title);
    }
  });

  it("have no empty section, heading or paragraph", () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        const doc = getLegalDocument(kind, lang);
        expect(doc.sections.length).toBeGreaterThan(5);
        for (const section of doc.sections) {
          expect(section.heading.trim()).not.toBe("");
          const body = [
            ...(section.paragraphs ?? []),
            ...(section.items ?? []),
            ...(section.after ?? []),
          ];
          expect(body.length).toBeGreaterThan(0);
          for (const line of body) expect(line.trim()).not.toBe("");
        }
      }
    }
  });

  it("leave no unfilled {token} behind", () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        expect(text(getLegalDocument(kind, lang))).not.toMatch(/[{}]/);
      }
    }
  });

  it("read English for every language that has no text of its own", () => {
    for (const lang of ["de", "fr", "es", "it", "xx", ""]) {
      expect(legalLangFor(lang)).toBe("en");
    }
    expect(legalLangFor("tr")).toBe("tr");
  });

  it("name each provider the site actually sends data to", () => {
    for (const lang of LANGS) {
      const privacy = text(getLegalDocument("privacy", lang));
      for (const provider of [
        "Vercel",
        "Supabase",
        "Google",
        "Upstash",
        "Mapbox",
        "Unsplash",
      ]) {
        expect(privacy).toContain(provider);
      }
    }
  });

  it("mention the host of every remote image the site is allowed to load", () => {
    const privacy = text(getLegalDocument("privacy", "en"));
    const providerFor = (host: string) =>
      host.includes("unsplash")
        ? "Unsplash"
        : host.includes("googleusercontent")
          ? "Google"
          : host.includes("supabase")
            ? "Supabase"
            : undefined;
    for (const host of imageHosts()) {
      const provider = providerFor(host);
      expect(provider, `no provider named for ${host}`).toBeTruthy();
      expect(privacy).toContain(provider);
    }
  });

  it("describe the consent cookie and the opt-in statistics the banner controls", () => {
    for (const lang of LANGS) {
      const privacy = text(getLegalDocument("privacy", lang));
      expect(privacy).toContain(CONSENT_COOKIE);
      expect(privacy).toContain("Vercel Analytics");
    }
    expect(text(getLegalDocument("privacy", "en"))).toMatch(
      /only if you accept/i,
    );
    expect(text(getLegalDocument("privacy", "tr"))).toMatch(
      /yalnızca kabul edersen/,
    );
  });

  it("say Mapbox usage events are sent only to those who accept", () => {
    expect(text(getLegalDocument("privacy", "en"))).toMatch(
      /Mapbox's map usage events[^.]*only if you accept/,
    );
    expect(text(getLegalDocument("privacy", "tr"))).toMatch(
      /harita kullanım olayları[^.]*yalnızca isteğe bağlı istatistikleri kabul edersen/,
    );
  });

  it("point to the controls that actually exist", () => {
    const tr = text(getLegalDocument("privacy", "tr"));
    expect(tr).toContain("Verilerimi indir");
    expect(tr).toContain("Hesabımı sil");
  });
});

describe("legal placeholders", () => {
  it("are all still unfilled in the shipped config, and each is named", () => {
    expect(legalPlaceholdersLeft().sort()).toEqual(
      [
        "contactEmail",
        "controllerName",
        "governingLaw.en",
        "governingLaw.tr",
        "upstashRegion",
      ].sort(),
    );
  });

  it("show up in the rendered texts, so filling the config is what removes them", () => {
    const rendered = KINDS.map((kind) =>
      text(getLegalDocument(kind, "tr")),
    ).join("\n");
    expect(rendered).toContain(LEGAL_CONFIG.controllerName);
    expect(rendered).toContain(LEGAL_CONFIG.contactEmail);
  });

  it("report nothing once every value is real", () => {
    expect(
      legalPlaceholdersLeft({
        controllerName: "Ada Lovelace",
        contactEmail: "privacy@example.com",
        governingLaw: { tr: "Türk hukuku", en: "Turkish law" },
        lastUpdated: { tr: "1 Ocak 2027", en: "1 January 2027" },
      }),
    ).toEqual([]);
  });

  it("do not mistake ordinary text in brackets inside a sentence for one", () => {
    expect(legalPlaceholdersLeft({ a: "see [1] for details" })).toEqual([]);
    expect(legalPlaceholdersLeft({ a: " [X] " })).toEqual(["a"]);
  });
});

describe("legalPagesAvailable", () => {
  const filled = {
    controllerName: "Ada Lovelace",
    contactEmail: "privacy@example.com",
    governingLaw: { tr: "Türk hukuku", en: "Turkish law" },
  };

  it("withholds the pages on production while a placeholder is left", () => {
    expect(legalPagesAvailable({ VERCEL_ENV: "production" })).toBe(false);
  });

  it("shows them on production once every value is real", () => {
    expect(legalPagesAvailable({ VERCEL_ENV: "production" }, filled)).toBe(
      true,
    );
  });

  it("shows them anywhere else, so the text can be read and reviewed", () => {
    for (const env of [
      { VERCEL_ENV: "preview" },
      { VERCEL_ENV: "development" },
      {},
    ]) {
      expect(legalPagesAvailable(env)).toBe(true);
    }
  });

  it("is not fooled by a half-filled config on production", () => {
    expect(
      legalPagesAvailable(
        { VERCEL_ENV: "production" },
        { ...filled, contactEmail: "[İLETİŞİM E-POSTASI]" },
      ),
    ).toBe(false);
  });
});

describe("the production build in next.config.ts", () => {
  it("goes ahead while a placeholder is left, and says the pages are not published", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("REQUIRE_LEGAL_CONFIG", "");
    await expect(import("../../next.config")).resolves.toBeDefined();
    const text = warn.mock.calls.map((call) => String(call[0])).join("\n");
    expect(text).toMatch(/Legal placeholders not filled.*controllerName/);
    expect(text).toMatch(/NOT published/);
    warn.mockRestore();
  });

  it("refuses when the project asks for it with REQUIRE_LEGAL_CONFIG=1", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("REQUIRE_LEGAL_CONFIG", "1");
    await expect(import("../../next.config")).rejects.toThrow(
      /Legal placeholders not filled.*controllerName/,
    );
  });

  it("does not hold up a preview or a local build, even in strict mode", async () => {
    vi.stubEnv("REQUIRE_LEGAL_CONFIG", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(import("../../next.config")).resolves.toBeDefined();
    vi.resetModules();
    vi.stubEnv("VERCEL_ENV", "");
    await expect(import("../../next.config")).resolves.toBeDefined();
  });
});
