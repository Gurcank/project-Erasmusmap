import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);

/**
 * A smoke test of the pages anyone can open, run against the production build.
 * It needs a built app and a seeded database (see the `e2e` job in
 * .github/workflows/ci.yml); locally, `npm run build` first, then `npm run e2e`.
 *
 * Signing in goes through Google, which a test cannot do, so everything that
 * needs a session stays with the unit tests.
 */
export default defineConfig({
  testDir: "e2e",
  // Named *.spec.ts so Vitest, which picks up *.test.ts, leaves them alone.
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
