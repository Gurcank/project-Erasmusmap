import { describe, expect, it } from "vitest";
import { moderate } from "./moderation";

describe("moderate", () => {
  it("masks an attack term but keeps the first letter", () => {
    expect(moderate("tam bir orospu").text).toBe("tam bir o*****");
  });

  it("leaves a word that merely contains a listed one alone", () => {
    // The case the whole-word design exists for: "mal" must not star
    // "malzeme", and the same rule protects these.
    for (const text of [
      "malzeme çok pahalı",
      "violoncelle dersleri",
      "putative",
      "grapes",
    ]) {
      expect(moderate(text).text).toBe(text);
    }
  });

  it("matches across the interface languages", () => {
    expect(moderate("this is rape").text).toBe("this is r***");
    expect(moderate("c'est un viol").text).toBe("c'est un v***");
    expect(moderate("è uno stupro").text).toBe("è uno s*****");
    expect(moderate("una violación").text).toBe("una v********");
  });

  it("treats Turkish letters as letters, not as word boundaries", () => {
    // \b would break "tecavüzcü" at the ü and mask only half of it.
    expect(moderate("tecavüzcü").text).toBe("t********");
  });

  it("masks the longest matching form, not a prefix of it", () => {
    expect(moderate("tecavüze uğradı").text).toBe("t******* uğradı");
  });

  it("does not mask self-harm terms, but flags them", () => {
    const result = moderate("intihar önleme hattını aradım");
    expect(result.text).toBe("intihar önleme hattını aradım");
    expect(result.flagged).toBe(true);
  });

  it("flags anything it had to mask", () => {
    expect(moderate("orospu").flagged).toBe(true);
  });

  it("leaves ordinary text untouched and unflagged", () => {
    const text = "Şehir çok güzeldi, ulaşım biraz pahalı ama değer.";
    expect(moderate(text)).toEqual({ text, flagged: false });
  });

  it("is case-insensitive and gives the same answer twice", () => {
    expect(moderate("RAPE and rape").text).toBe("R*** and r***");
    expect(moderate("RAPE and rape").text).toBe("R*** and r***");
  });
});
