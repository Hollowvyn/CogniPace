/**
 * Architecture-boundary tests for the FEATURE-SLICED layout that landed
 * during Phases A–E. The older `layout.test.ts` targeted the v7-era
 * `src/ui/` and `src/domain/` directories (both mostly retired); this
 * suite tests the live structure: `src/features/<x>/{ui,domain,data}/`.
 *
 * Rules enforced here:
 *   1. `features/<x>/ui/` doesn't import `@platform/db` or `drizzle-orm`
 *      (UI never reaches the DB directly — it goes through the typed
 *      RPC proxy and repositories).
 *   2. `features/<x>/domain/` doesn't import react, chrome, drizzle,
 *      or `@platform/db` (domain is pure — testable without browser
 *      or DB).
 *   3. `features/<x>/data/repository/` doesn't import `@platform/db`
 *      (repositories are UI-side; they route through @app/api).
 *
 * A failure here names the file and the forbidden import. The plan in
 * docs/architecture.md (or the constraints doc in Phase G) explains why
 * each rule earns its keep.
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

function isSourceFile(file: string): boolean {
  return (
    (file.endsWith(".ts") || file.endsWith(".tsx")) &&
    !file.endsWith(".test.ts") &&
    !file.endsWith(".test.tsx") &&
    !file.endsWith(".a11y.test.tsx")
  );
}

function read(file: string): string {
  return fs.readFileSync(file, "utf-8");
}

function listFeatureSubdir(subdir: string): string[] {
  const featuresRoot = path.join(repoRoot, "src/features");
  if (!fs.existsSync(featuresRoot)) return [];
  return fs
    .readdirSync(featuresRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((feature) =>
      walk(path.join(featuresRoot, feature.name, subdir)).filter(isSourceFile),
    );
}

describe("feature-sliced boundaries", () => {
  it("features/<x>/ui/ never imports @platform/db or drizzle-orm", () => {
    const violations: string[] = [];
    for (const file of listFeatureSubdir("ui")) {
      const source = read(file);
      if (
        /from\s+["']@platform\/db/.test(source) ||
        /from\s+["']drizzle-orm/.test(source)
      ) {
        violations.push(path.relative(repoRoot, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it("features/<x>/domain/ never imports react, chrome, drizzle, or @platform/db", () => {
    const violations: Array<{ file: string; reason: string }> = [];
    for (const file of listFeatureSubdir("domain")) {
      const source = read(file);
      if (/from\s+["']react["']/.test(source)) {
        violations.push({ file: path.relative(repoRoot, file), reason: "react" });
      }
      if (/from\s+["']@platform\/db/.test(source)) {
        violations.push({
          file: path.relative(repoRoot, file),
          reason: "@platform/db",
        });
      }
      if (/from\s+["']drizzle-orm/.test(source)) {
        violations.push({
          file: path.relative(repoRoot, file),
          reason: "drizzle-orm",
        });
      }
      // chrome.* live access (the type annotation chrome.runtime.MessageSender
      // appears as a TSQualifiedName, not as a value access — only the value
      // form matches `\bchrome\.` followed by lowercase letter).
      if (/\bchrome\.[a-z]/.test(source)) {
        violations.push({
          file: path.relative(repoRoot, file),
          reason: "chrome.* runtime access",
        });
      }
    }
    expect(violations).toEqual([]);
  });

  it("features/<x>/data/repository/ never imports @platform/db (repositories are UI-side)", () => {
    const violations: string[] = [];
    for (const file of listFeatureSubdir("data/repository")) {
      const source = read(file);
      if (/from\s+["']@platform\/db/.test(source)) {
        violations.push(path.relative(repoRoot, file));
      }
    }
    expect(violations).toEqual([]);
  });
});
