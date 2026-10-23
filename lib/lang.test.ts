import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANG,
  LANG_MAX_AGE_SECONDS,
  langCookie,
  langFromAcceptLanguage,
  parseLang,
  readLangCookie,
  resolveLang,
} from "@/lib/lang";

describe("parseLang", () => {
  it("accepts the offered languages and nothing else", () => {
    expect(parseLang("de")).toBe("de");
    expect(parseLang("tr")).toBe("tr");
    expect(parseLang("pt")).toBeNull();
    expect(parseLang("DE")).toBeNull();
    expect(parseLang("")).toBeNull();
    expect(parseLang(undefined)).toBeNull();
  });
});

describe("langFromAcceptLanguage", () => {
  it("takes the first language we offer, in the visitor's order", () => {
    expect(langFromAcceptLanguage("tr-TR,tr;q=0.9,en;q=0.8")).toBe("tr");
    expect(langFromAcceptLanguage("pt-BR,fr;q=0.8,en;q=0.5")).toBe("fr");
  });

  it("treats a regional tag as its language", () => {
    expect(langFromAcceptLanguage("de-AT")).toBe("de");
  });

  it("orders by weight, not by position", () => {
    expect(langFromAcceptLanguage("en;q=0.4,es;q=0.9")).toBe("es");
  });

  it("skips languages marked not acceptable", () => {
    expect(langFromAcceptLanguage("de;q=0,fr;q=0.5")).toBe("fr");
  });

  it("returns null when nothing matches or the header is unusable", () => {
    expect(langFromAcceptLanguage("pt-BR,ja;q=0.8")).toBeNull();
    expect(langFromAcceptLanguage("*")).toBeNull();
    expect(langFromAcceptLanguage("")).toBeNull();
    expect(langFromAcceptLanguage(null)).toBeNull();
    expect(langFromAcceptLanguage("en;q=abc")).toBeNull();
  });
});

describe("resolveLang", () => {
  it("prefers the cookie over the browser", () => {
    expect(resolveLang("it", "tr-TR,tr;q=0.9")).toBe("it");
  });

  it("uses the browser's language without a cookie, or with a bad one", () => {
    expect(resolveLang(undefined, "tr-TR")).toBe("tr");
    expect(resolveLang("klingon", "fr-FR")).toBe("fr");
  });

  it("falls back to English", () => {
    expect(DEFAULT_LANG).toBe("en");
    expect(resolveLang(undefined, "ja-JP")).toBe("en");
    expect(resolveLang(undefined, undefined)).toBe("en");
  });
});

describe("the language cookie", () => {
  it("is readable out of a cookie string", () => {
    expect(readLangCookie("theme=dark; lang=es; consent=granted")).toBe("es");
    expect(readLangCookie("lang=xx")).toBeNull();
    expect(readLangCookie("consent=granted")).toBeNull();
  });

  it("is written for a year, site-wide, and Secure only on https", () => {
    const plain = langCookie("de", false);
    expect(plain).toContain("lang=de");
    expect(plain).toContain(`Max-Age=${LANG_MAX_AGE_SECONDS}`);
    expect(plain).toContain("Path=/");
    expect(plain).toContain("SameSite=Lax");
    expect(plain).not.toContain("Secure");
    expect(langCookie("de", true)).toContain("Secure");
  });
});
