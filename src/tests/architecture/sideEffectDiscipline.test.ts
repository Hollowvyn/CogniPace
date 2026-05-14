/**
 * Architecture-boundary test: no direct host-environment side effects
 * in features/app. Every banned API has a @platform/* wrapper.
 *
 * This duplicates the ESLint `no-restricted-syntax` rules in
 * eslint.config.mjs so the discipline survives a future config edit.
 * If a contributor lifts the lint rule, this test still trips.
 *
 * Patterns banned in src/features/** and src/app/**:
 *   - Date.now()                 → systemClock.nowMs() from @platform/time
 *   - Math.random()              → @platform/rand (when needed)
 *   - chrome.tabs.*              → @platform/chrome/tabs
 *   - chrome.runtime.getURL      → extensionUrl from @platform/chrome/tabs
 *   - chrome.storage.*           → @platform/chrome/storage
 *   - fetch                      → @platform/* (when needed)
 *   - localStorage               → @platform/chrome/storage
 *   - crypto.*                   → @platform/crypto (when needed)
 *
 * Explicitly NOT banned (and what to look for in test failures):
 *   - new Date() (no args) as a default-parameter value — testable form
 *   - new Date(value) for parsing
 *   - chrome.runtime.MessageSender type annotation (types, not runtime)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../../..");

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

function inScopeFiles(): string[] {
  const featureFiles = walk(path.join(repoRoot, "src/features"));
  const appFiles = walk(path.join(repoRoot, "src/app"));
  return [...featureFiles, ...appFiles].filter(
    (file) => file.endsWith(".ts") || file.endsWith(".tsx"),
  );
}

// Use regex (not a real parser) — fast, simple, good enough for these
// well-known textual patterns. The trade-off: a string literal like
// "Date.now()" embedded in a comment would false-positive. We strip
// line comments and block comments cheaply.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "Date.now()", regex: /\bDate\.now\s*\(/ },
  { name: "Math.random()", regex: /\bMath\.random\s*\(/ },
  { name: "chrome.tabs.*", regex: /\bchrome\.tabs\./ },
  { name: "chrome.runtime.getURL", regex: /\bchrome\.runtime\.getURL\b/ },
  { name: "chrome.storage.*", regex: /\bchrome\.storage\./ },
  { name: "fetch(", regex: /(?<![.\w])fetch\s*\(/ },
  { name: "localStorage", regex: /\blocalStorage\./ },
  { name: "crypto.", regex: /\bcrypto\.[a-z]/i },
];

describe("side-effect discipline", () => {
  const files = inScopeFiles();

  for (const { name, regex } of PATTERNS) {
    it(`${name} has no call sites in features/app`, () => {
      const violations: string[] = [];
      for (const file of files) {
        const source = stripComments(fs.readFileSync(file, "utf-8"));
        if (regex.test(source)) {
          violations.push(path.relative(repoRoot, file));
        }
      }
      expect(violations).toEqual([]);
    });
  }
});
