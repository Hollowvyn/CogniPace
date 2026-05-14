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

/**
 * Side-effect discipline (Phase E). Forbid direct calls to host-environment
 * APIs from inside features and app code — they must go through the
 * `@platform/*` wrappers so the side-effect surface is one folder away from
 * domain code and trivially fake-able in tests.
 *
 * Why:
 *   - `Date.now()` calls deep in business logic bind tests to real time.
 *     Use `systemClock.nowMs()` or `nowIso()` from `@platform/time`.
 *     Note: `now = new Date()` as a default-parameter value is deliberately
 *     NOT banned — that pattern IS the testable form (callers inject).
 *   - `Math.random()` makes order non-deterministic. Route through a
 *     `@platform/rand` wrapper when a feature actually needs randomness.
 *   - `chrome.tabs.*` / `chrome.runtime.getURL` go through
 *     `@platform/chrome/tabs` (`openTab`, `updateTabUrl`, `extensionUrl`,
 *     `isExtensionContext`).
 *   - `chrome.storage.*` goes through `@platform/chrome/storage`.
 *   - `fetch` / `localStorage` / `crypto` would each grow their own
 *     `@platform/*` wrapper the day a feature actually needs them.
 *
 * Allowed:
 *   - `new Date(value)` for parsing — there's no "what time is it" here.
 *   - `new Date()` (no args) as a default-parameter value — that's the
 *     testable form; callers inject the time when needed.
 *   - `chrome.runtime.MessageSender` type annotations — types are erased
 *     and the AST sees them as TSQualifiedName, not MemberExpression.
 */
const sideEffectRules = {
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "CallExpression[callee.object.name='Date'][callee.property.name='now']",
      message: "Date.now() is forbidden in features/app. Use systemClock.nowMs() from @platform/time.",
    },
    {
      selector:
        "CallExpression[callee.object.name='Math'][callee.property.name='random']",
      message: "Math.random() is forbidden in features/app. Route through a @platform/rand wrapper when actually needed.",
    },
    {
      selector: "MemberExpression[object.name='chrome'][property.name='tabs']",
      message: "chrome.tabs.* is forbidden in features/app. Use @platform/chrome/tabs (openTab, updateTabUrl).",
    },
    {
      selector:
        "MemberExpression[object.object.name='chrome'][object.property.name='runtime'][property.name='getURL']",
      message: "chrome.runtime.getURL is forbidden in features/app. Use extensionUrl from @platform/chrome/tabs.",
    },
    {
      selector: "MemberExpression[object.name='chrome'][property.name='storage']",
      message: "chrome.storage.* is forbidden in features/app. Use @platform/chrome/storage.",
    },
    {
      selector: "CallExpression[callee.name='fetch']",
      message: "fetch is forbidden in features/app. Add a @platform/* wrapper when a feature needs HTTP.",
    },
    {
      selector: "MemberExpression[object.name='localStorage']",
      message: "localStorage is forbidden in features/app. Use @platform/chrome/storage (chrome.storage.local-backed).",
    },
    {
      selector: "MemberExpression[object.name='crypto']",
      message: "crypto.* is forbidden in features/app. Add a @platform/crypto wrapper when actually needed.",
    },
  ],
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
  // Side-effect discipline: features and app code may only touch the host
  // environment through @platform/* wrappers.
  {
    files: ["src/features/**/*.ts", "src/features/**/*.tsx", "src/app/**/*.ts", "src/app/**/*.tsx"],
    rules: sideEffectRules,
  },
  eslintConfigPrettier,
];
