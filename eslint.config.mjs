import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

const importRules = {
  "import/first": "error",
  "import/newline-after-import": "error",
  "import/no-duplicates": "error",
  "import/order": [
    "error",
    {
      alphabetize: {
        order: "asc",
        caseInsensitive: true,
      },
      groups: [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "index",
        "object",
        "type",
      ],
      "newlines-between": "always",
    },
  ],
};

const phaseZeroTsRules = {
  "@typescript-eslint/no-floating-promises": "off",
  "@typescript-eslint/no-misused-promises": "off",
  "@typescript-eslint/no-unnecessary-type-assertion": "off",
};

/**
 * Architecture refactor lint rules — see docs/architecture refactor plan.
 *
 * - Forbid MUI barrel imports (use deep paths so tree-shaking works
 *   reliably and the popup bundle stays under budget).
 * - Forbid `forwardRef` import from React (React 19 accepts `ref` as a
 *   plain prop; no compat shim needed).
 * - Forbid deep cross-feature imports (Phase 6+ enforces; harmless
 *   today because no feature folders exist yet).
 */
const archImportRules = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["@features/*/!(index|server)", "@features/*/!(index|server)/**"],
          message:
            "Cross-feature imports must go through features/<x>/index.ts (UI side) or features/<x>/server.ts (SW side).",
        },
      ],
      paths: [
        {
          name: "@mui/material",
          message:
            'Use deep paths: import Button from "@mui/material/Button". Barrel imports defeat tree-shaking.',
        },
        {
          name: "@mui/icons-material",
          message:
            'Use deep paths: import StarIcon from "@mui/icons-material/Star". Barrel imports defeat tree-shaking.',
        },
        {
          name: "react",
          importNames: ["forwardRef"],
          message:
            "No forwardRef in React 19 — accept a typed `ref` prop directly on the component.",
        },
      ],
    },
  ],
};

const reactHookRules = reactHooks.configs.flat.recommended.rules;

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".tmp/**",
      "tests/.tmp/**",
      "stitch_leetcode_reviews_mvp_popup 2/**",
    ],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.cjs"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: globals.node,
      sourceType: "commonjs",
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...importRules,
    },
  },
  {
    ...js.configs.recommended,
    files: ["**/*.mjs", "**/*.js"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: globals.node,
      sourceType: "module",
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...importRules,
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    plugins: {
      ...(config.plugins ?? {}),
      import: importPlugin,
    },
    rules: {
      ...(config.rules ?? {}),
      ...phaseZeroTsRules,
      ...importRules,
      ...archImportRules,
    },
  })),
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      ...(config.languageOptions ?? {}),
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.webextensions,
      },
      parserOptions: {
        ...(config.languageOptions?.parserOptions ?? {}),
        projectService: true,
        tsconfigRootDir,
      },
    },
    plugins: {
      ...(config.plugins ?? {}),
      import: importPlugin,
      "no-unsanitized": noUnsanitized,
      "react-hooks": reactHooks,
    },
    rules: {
      ...(config.rules ?? {}),
      ...phaseZeroTsRules,
      ...importRules,
      ...archImportRules,
      ...reactHookRules,
      "no-unsanitized/method": "warn",
      "no-unsanitized/property": "warn",
    },
  })),
  eslintConfigPrettier,
];
