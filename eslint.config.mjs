import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy cPanel Passenger entry point (CommonJS by necessity).
    "app.js",
    // CommonJS patch script run by postinstall.
    "scripts/patch-base-ui.js",
  ]),
  {
    rules: {
      // Legacy fetch-on-mount pattern across dashboard clients; migrate to
      // server components/server actions before re-enabling.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
