import { expect, test } from "@playwright/test";

// A city that is in the seed's primary list.
const CITY = { slug: "berlin", name: "Berlin" };

test.describe("pages anyone can open", () => {
  test("the health check reaches the database", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
  });

  test("the square renders its heading and the main landmark", async ({
    page,
  }) => {
    await page.goto("/meydan");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("the sign-in page offers Google, and is kept out of search", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("a city page renders, names itself and has one canonical address", async ({
    page,
  }) => {
    const response = await page.goto(`/c/${CITY.slug}?reviews=2`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(new RegExp(CITY.name));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/c/${CITY.slug}$`),
    );
  });

  test("a city or a profile that does not exist is a real 404", async ({
    request,
  }) => {
    // Not a 200 with a "not found" page: that is what a loading.tsx on these
    // routes would turn it into, and search engines would index it.
    expect((await request.get("/c/no-such-city")).status()).toBe(404);
    expect((await request.get("/u/no-such-person")).status()).toBe(404);
  });

  test("a page for signed-in people sends a visitor to the sign-in page", async ({
    page,
  }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("accessibility landmarks", () => {
  test("the skip link is the first stop, appears on focus and lands on main", async ({
    page,
  }) => {
    await page.goto("/meydan");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
  });

  test("the map is a labelled region", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Map of Europe" }),
    ).toBeAttached();
  });
});

test.describe("language", () => {
  test("follows the browser when nothing has been chosen", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "de-DE" });
    const page = await context.newPage();
    await page.goto("/meydan");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await context.close();
  });

  test("falls back to English for a language that is not offered", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "ja-JP" });
    const page = await context.newPage();
    await page.goto("/meydan");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await context.close();
  });

  test("the lang cookie beats the browser", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ locale: "de-DE" });
    await context.addCookies([{ name: "lang", value: "fr", url: baseURL! }]);
    const page = await context.newPage();
    await page.goto("/meydan");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await context.close();
  });
});

test.describe("cookie choice", () => {
  test("is asked once, remembered, and does not come back", async ({
    page,
    context,
  }) => {
    await page.goto("/meydan");
    const banner = page.getByRole("region", { name: "Cookie preferences" });
    await expect(banner).toBeVisible();

    await banner.getByRole("button", { name: "Refuse" }).click();
    await expect(banner).toBeHidden();

    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === "consent")?.value).toBe(
      "denied",
    );

    await page.reload();
    await expect(banner).toBeHidden();
  });

  test("keeps the usage-statistics host out of the policy until it is allowed", async ({
    request,
  }) => {
    const csp = (await request.get("/meydan")).headers()[
      "content-security-policy"
    ];
    expect(csp).not.toContain("events.mapbox.com");

    const allowed = (
      await request.get("/meydan", { headers: { cookie: "consent=granted" } })
    ).headers()["content-security-policy"];
    expect(allowed).toContain("events.mapbox.com");
  });
});

test.describe("search engines", () => {
  test("the sitemap lists cities and leaves the sign-in form out", async ({
    request,
  }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    expect(body).toContain(`/c/${CITY.slug}</loc>`);
    expect(body).not.toContain("/login</loc>");
  });

  test("robots.txt points at the sitemap and hides private areas", async ({
    request,
  }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toContain("Sitemap:");
    expect(body).toMatch(/Disallow: \/admin/);
  });
});
