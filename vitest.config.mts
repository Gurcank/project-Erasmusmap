import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Playwright specs, run by `npm run e2e` against a built app.
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
  },
});
