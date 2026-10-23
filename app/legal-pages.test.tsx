import { isValidElement, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

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

function render(page: () => unknown): { notFound: boolean } {
  try {
    page();
    return { notFound: false };
  } catch (error) {
    if (isNotFound(error)) return { notFound: true };
    throw error;
  }
}

describe("the legal pages on production with placeholders left", () => {
  it("answer 404 instead of printing the placeholders", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(render(PrivacyPage)).toEqual({ notFound: true });
    expect(render(TermsPage)).toEqual({ notFound: true });
  });
});

describe("the legal pages anywhere else", () => {
  it("render, so the text can be reviewed on a preview", () => {
    for (const env of ["preview", "development", ""]) {
      vi.stubEnv("VERCEL_ENV", env);
      expect(render(PrivacyPage)).toEqual({ notFound: false });
      expect(render(TermsPage)).toEqual({ notFound: false });
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
