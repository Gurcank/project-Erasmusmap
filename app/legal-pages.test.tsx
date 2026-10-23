import { isValidElement, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

/** What notFound() throws: an error whose digest says 404. */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    String((error as { digest?: unknown }).digest).includes("404")
  );
}

async function render(page: () => unknown): Promise<{ notFound: boolean }> {
  try {
    await page();
    return { notFound: false };
  } catch (error) {
    if (isNotFound(error)) return { notFound: true };
    throw error;
  }
}

describe("the legal pages on production with placeholders left", () => {
  it("answer 404 instead of printing the placeholders", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(await render(PrivacyPage)).toEqual({ notFound: true });
    expect(await render(TermsPage)).toEqual({ notFound: true });
  });
});

describe("the legal pages anywhere else", () => {
  it("render, so the text can be reviewed on a preview", async () => {
    for (const env of ["preview", "development", ""]) {
      vi.stubEnv("VERCEL_ENV", env);
      expect(await render(PrivacyPage)).toEqual({ notFound: false });
      expect(await render(TermsPage)).toEqual({ notFound: false });
    }
  });
});

describe("the sign-in page", () => {
  /** The LoginClient element inside the page's Suspense. */
  function loginClientProps() {
    const page = LoginPage() as ReactElement<{ children: unknown }>;
    const client = page.props.children;
    expect(isValidElement(client)).toBe(true);
    return (client as ReactElement<{ showLegalNotice: boolean }>).props;
  }

  it("hides the notice about terms and policy that it cannot link to", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(loginClientProps().showLegalNotice).toBe(false);
  });

  it("shows it where the pages exist", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(loginClientProps().showLegalNotice).toBe(true);
  });
});
