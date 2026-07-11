import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // ThemeToggle/LanguageSelect/useT intentionally read localStorage in an
      // effect and gate the first paint on it — the standard pattern for
      // SSR-safe client-only state. Rewriting them to satisfy this rule
      // (e.g. useSyncExternalStore) would change the hydration render
      // timeline, so it's downgraded to a warning pending that follow-up
      // rather than blocking CI on an intentional pattern.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
