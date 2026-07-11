import { describe, expect, it } from "vitest";
import { latinize } from "./latinize";

describe("latinize", () => {
  it("strips Turkish diacritics", () => {
    expect(latinize("İstanbul")).toBe("Istanbul");
    expect(latinize("Çanakkale")).toBe("Canakkale");
    expect(latinize("Şırnak")).toBe("Sirnak");
    expect(latinize("Ürgüp")).toBe("Urgup");
  });

  it("strips other European diacritics", () => {
    expect(latinize("Łódź")).toBe("Lodz");
    expect(latinize("Đakovo")).toBe("Dakovo");
    expect(latinize("Straße")).toBe("Strasse");
    expect(latinize("München")).toBe("Munchen");
  });

  it("leaves plain ASCII text unchanged", () => {
    expect(latinize("Amsterdam")).toBe("Amsterdam");
  });
});
