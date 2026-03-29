import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import noUnsanitized from "eslint-plugin-no-unsanitized";
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
    files: ["tests/**/*.ts"],
    plugins: {
      ...(config.plugins ?? {}),
      import: importPlugin,
    },
    rules: {
      ...(config.rules ?? {}),
      ...phaseZeroTsRules,
      ...importRules,
    },
  })),
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
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
    },
    rules: {
      ...(config.rules ?? {}),
      ...phaseZeroTsRules,
      ...importRules,
      "no-unsanitized/method": "warn",
      "no-unsanitized/property": "warn",
    },
  })),
  eslintConfigPrettier,
];
