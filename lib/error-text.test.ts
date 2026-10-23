import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OFFERED_LANGUAGES, type Lang } from "@/lib/i18n";
import { localizeError } from "@/lib/error-text";
import { errorTranslations } from "@/lib/translations/errors";
import { GENERIC_ERROR_MESSAGE } from "@/lib/action-result";
import { RATE_LIMITED_MESSAGE } from "@/lib/action-guard";
import { LAST_ADMIN_MESSAGE } from "@/lib/account-deletion";
import { bioSchema, firstIssueMessage, usernameSchema } from "@/lib/schemas";

const LANGS = OFFERED_LANGUAGES.map((language) => language.code);
const OTHER_THAN_TURKISH = LANGS.filter((code) => code !== "tr") as Lang[];

describe("the translation table", () => {
  it("has every language for every message", () => {
    for (const [message, entry] of Object.entries(errorTranslations)) {
      for (const code of OTHER_THAN_TURKISH) {
        expect(
          entry[code as Exclude<Lang, "tr">],
          `${message} (${code})`,
        ).toBeTruthy();
      }
    }
  });

  it("keeps the same number of # placeholders in every language", () => {
    const count = (text: string) => (text.match(/#/g) ?? []).length;
    for (const [message, entry] of Object.entries(errorTranslations)) {
      for (const code of OTHER_THAN_TURKISH) {
        expect(
          count(entry[code as Exclude<Lang, "tr">]),
          `${message} (${code})`,
        ).toBe(count(message));
      }
    }
  });
});

describe("localizeError", () => {
  it("leaves Turkish alone, since that is what the server writes", () => {
    expect(localizeError("Şehir bulunamadı", "tr")).toBe("Şehir bulunamadı");
  });

  it("translates a fixed message", () => {
    expect(localizeError("Şehir bulunamadı", "en")).toBe("City not found");
    expect(localizeError("Şehir bulunamadı", "de")).toBe(
      "Stadt nicht gefunden",
    );
  });

  it("puts the number of a limit back into the translation", () => {
    expect(localizeError("En fazla 4 şehir seçebilirsin", "en")).toBe(
      "You can pick at most 4 cities",
    );
    expect(localizeError("Yorum en fazla 2000 karakter olabilir", "fr")).toBe(
      "Un avis peut contenir 2000 caractères au maximum",
    );
  });

  it("finds a message whose digits are part of its wording first", () => {
    expect(
      localizeError("Puanlar 0,5 ile 5 yıldız arasında olmalı", "en"),
    ).toBe("Ratings must be between 0.5 and 5 stars");
  });

  it("gives a Turkish version of a message that was written in English", () => {
    expect(localizeError("Invalid cityId", "tr")).toBe("Geçersiz şehir");
    expect(localizeError("Invalid cityId", "es")).toBe("Ciudad no válida");
  });

  it("returns a message it does not know unchanged, rather than blank", () => {
    expect(localizeError("Bilinmeyen bir mesaj", "en")).toBe(
      "Bilinmeyen bir mesaj",
    );
  });
});

describe("the messages the server really produces", () => {
  it("are all known: shared constants", () => {
    for (const message of [
      GENERIC_ERROR_MESSAGE,
      RATE_LIMITED_MESSAGE,
      LAST_ADMIN_MESSAGE,
    ]) {
      expect(localizeError(message, "en"), message).not.toBe(message);
    }
  });

  it("are all known: validation, with the real limits", () => {
    const username = firstIssueMessage(usernameSchema.safeParse("a").error!);
    expect(localizeError(username, "en")).toMatch(
      /^Must be at least \d+ characters long$/,
    );

    const bio = firstIssueMessage(bioSchema.safeParse("x".repeat(5000)).error!);
    expect(localizeError(bio, "de")).toMatch(
      /^Die Bio darf höchstens \d+ Zeichen/,
    );
  });

  // A message added to the server and not to the table would show up in Turkish
  // for everybody else. This reads the source for every one that is a plain
  // string and fails if it has no translation.
  it("are all known: every UserFacingError written as a string", () => {
    const sources = fs
      .readdirSync("lib")
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .map((file) => path.join("lib", file));
    const missing: string[] = [];

    for (const file of sources) {
      const text = fs.readFileSync(file, "utf8");
      for (const match of text.matchAll(
        /UserFacingError\(\s*(["`])((?:\\.|(?!\1).)*)\1/g,
      )) {
        const literal = match[2].replace(/\$\{[^}]*\}/g, "0");
        if (localizeError(literal, "en") === literal) {
          missing.push(`${file}: ${match[2]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
