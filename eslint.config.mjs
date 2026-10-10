import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import local from "./eslint-rules/require-admin.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/admin/**/*.{ts,tsx}", "src/app/api/admin/**/*.{ts,tsx}"],
    plugins: { local },
    rules: { "local/require-admin": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".local-db/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
