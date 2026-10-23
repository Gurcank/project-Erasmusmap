import { describe, expect, it } from "vitest";
import { formatStayRange } from "@/lib/format";
import { localeFor } from "@/lib/lang";

const start = new Date(2024, 8, 12);
const end = new Date(2025, 1, 3);

describe("formatStayRange", () => {
  it("writes both ends with the month names of the given locale", () => {
    expect(formatStayRange(start, end, localeFor("tr"))).toBe(
      "12 Eyl 2024 – 3 Şub 2025",
    );
    expect(formatStayRange(start, end, localeFor("en"))).toMatch(
      /^12 Sept? 2024 – 3 Feb 2025$/,
    );
  });

  it("collapses a stay of one day", () => {
    expect(formatStayRange(start, start, "en-GB")).not.toContain("–");
  });

  it("degrades to an open range, or to nothing", () => {
    expect(formatStayRange(start, null, "en-GB")).toMatch(/ –$/);
    expect(formatStayRange(null, end, "en-GB")).toMatch(/^– /);
    expect(formatStayRange(null, null, "en-GB")).toBeNull();
  });
});
