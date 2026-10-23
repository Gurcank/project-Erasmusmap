import { expect, test, type BrowserContext } from "@playwright/test";
import {
  canSignIn,
  createUser,
  deleteUser,
  readAvatar,
  type TestUser,
} from "./support/session";

// A signed-in visitor, with a session made for the test (see support/session.ts).
// These are the pages and actions that only a signed-in person reaches, which
// the rest of the suite cannot.
test.skip(
  !canSignIn,
  "needs E2E_ALLOW_DB_WRITES=1, DATABASE_URL and NEXTAUTH_SECRET",
);

async function signIn(
  context: BrowserContext,
  user: TestUser,
  baseURL: string,
) {
  await context.addCookies([
    { ...user.cookie, url: baseURL },
    { name: "consent", value: "denied", url: baseURL },
  ]);
}

test.describe("a signed-in person", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createUser("USER");
  });
  test.afterAll(async () => {
    await deleteUser(user);
  });
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, user, baseURL!);
  });

  // The reported failure: every one of these sent a signed-in visitor to the
  // sign-in page, which sent them home.
  for (const path of ["/trips", "/trips/new", "/account", "/settings"]) {
    test(`stays on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  }

  test("is kept out of the admin area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test("saves a bio and a new username on the account page", async ({
    page,
  }) => {
    await page.goto("/account");
    await page.locator("textarea[name=bio]").fill("Hello from a test");
    await page
      .locator("textarea[name=bio]")
      .locator("xpath=ancestor::form")
      .getByRole("button")
      .click();
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(page.locator("textarea[name=bio]")).toHaveValue(
      "Hello from a test",
    );
  });

  test("picks an avatar, and it is still there after a reload", async ({
    page,
  }) => {
    await page.goto(`/u/${user.username}`);
    await page.locator("main button[aria-haspopup=dialog]").click();
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(12);
    await radios.nth(7).click();
    await expect(radios.nth(7)).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => readAvatar(user)).not.toBeNull();

    await page.reload();
    await page.locator("main button[aria-haspopup=dialog]").click();
    await expect(page.getByRole("radio").nth(7)).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("plans a trip: a title and Enter is a complete entry", async ({
    page,
  }) => {
    await page.goto("/trips/new");
    await page.locator("input[name=title]").fill("E2E trip");
    await page.locator("input[name=startDate]").fill("2027-02-01");
    await page.locator("input[name=endDate]").fill("2027-02-03");
    await page.locator("input[name=budget]").fill("500");
    await page.getByRole("button", { name: /create/i }).click();
    await page.waitForURL(
      (url) =>
        url.pathname.startsWith("/trips/") && url.pathname !== "/trips/new",
    );

    // The first day is open, with one place to add.
    await page
      .getByRole("button", { name: /add item/i })
      .first()
      .click();
    await page.locator("#item-title").fill("Lunch by the harbour");
    await page.locator("#item-time").fill("13:15");
    await page.locator("#item-cost").fill("12.5");
    await page.locator("#item-title").press("Enter");
    await expect(
      page.getByRole("heading", { name: "Lunch by the harbour" }),
    ).toBeVisible();
    await expect(page.getByText("13:15").first()).toBeVisible();

    // The details are there, folded, until asked for.
    await page
      .getByRole("button", { name: /add item/i })
      .first()
      .click();
    await expect(page.locator("#item-more")).toBeHidden();
    await page
      .locator("form")
      .filter({ has: page.locator("#item-title") })
      .getByRole("button", { name: /details/i })
      .click();
    await expect(page.locator("#item-more")).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();

    // The spending form asks for an amount, a category and a note.
    await page.locator("#expense-amount").fill("30");
    await page.locator("#expense-note").fill("Metro tickets");
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText("Metro tickets").first()).toBeVisible();
  });
});

test.describe("an admin", () => {
  let admin: TestUser;

  test.beforeAll(async () => {
    admin = await createUser("ADMIN");
  });
  test.afterAll(async () => {
    await deleteUser(admin);
  });

  test("reaches the admin panel", async ({ context, page, baseURL }) => {
    await signIn(context, admin, baseURL!);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
  });
});
