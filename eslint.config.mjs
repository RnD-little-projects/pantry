import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Mongoose models return loosely-typed documents; enforcing strict 
      // no-any across the whole codebase is impractical without a full 
      // Mongoose-to-Prisma migration. Downgraded to warning.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/workbox-*.js",
    "public/sw.js",
  ]),
]);

export default eslintConfig;
