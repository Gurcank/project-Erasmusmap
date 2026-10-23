import { describe, expect, it } from "vitest";
import { parseAdminTab } from "@/lib/admin-tabs";
import { clampPage, pageCount, pageOffset, parsePage } from "@/lib/pagination";

describe("parsePage", () => {
  it("reads a positive whole number", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("7")).toBe(7);
    expect(parsePage(["3", "9"])).toBe(3);
  });

  it("falls back to the first page for anything else", () => {
    for (const value of [
      undefined,
      "",
      "0",
      "-2",
      "1.5",
      "abc",
      "1e3",
      " 2",
      "2 ",
      "NaN",
      "Infinity",
      "9999999",
    ]) {
      expect(parsePage(value)).toBe(1);
    }
  });
});

describe("pageCount, clampPage and pageOffset", () => {
  it("counts at least one page, even with no rows", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(1, 25)).toBe(1);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
    expect(pageCount(100, 25)).toBe(4);
  });

  it("clamps a page past the end back to the last one", () => {
    expect(clampPage(99, 4)).toBe(4);
    expect(clampPage(0, 4)).toBe(1);
    expect(clampPage(3, 4)).toBe(3);
  });

  it("offsets by whole pages", () => {
    expect(pageOffset(1, 25)).toBe(0);
    expect(pageOffset(3, 25)).toBe(50);
  });
});

describe("parseAdminTab", () => {
  it("accepts the four tabs", () => {
    for (const tab of ["overview", "users", "reviews", "comments"]) {
      expect(parseAdminTab(tab)).toBe(tab);
    }
  });

  it("opens the overview for anything else", () => {
    for (const value of [undefined, "", "settings", "USERS", "__proto__"]) {
      expect(parseAdminTab(value)).toBe("overview");
    }
  });
});
