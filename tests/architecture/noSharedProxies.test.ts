/**
 * Phase 0 scaffolding for the eventual rule:
 *
 *   "no file in src/ may import from any src/shared/*.ts proxy module
 *    (the 13 re-export files that earlier phases left behind)."
 *
 * The proxies still exist today; Phase 1 deletes them and flips the
 * assertion in this file to strict-zero. Until then, this test:
 *
 *   - locks in the current allowlist (each proxy module + its known
 *     importer count) so a NEW caller importing through a proxy fails
 *     CI immediately;
 *   - serves as a record of the cleanup target for Phase 1.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../..");
const srcDir = path.join(repoRoot, "src");
const sharedDir = path.join(srcDir, "shared");

function listFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return listFiles(absolute);
    return absolute;
  });
}

function isTsLike(file: string): boolean {
  return /\.(ts|tsx)$/.test(file) && !/\.d\.ts$/.test(file);
}

function listSharedProxyModules(): string[] {
  if (!fs.existsSync(sharedDir)) return [];
  return fs
    .readdirSync(sharedDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isTsLike(entry.name))
    .map((entry) => entry.name.replace(/\.tsx?$/, ""));
}

function countImportersOf(proxyModule: string): number {
  const srcFiles = listFiles(srcDir).filter(isTsLike);
  let count = 0;
  for (const file of srcFiles) {
    if (file.startsWith(sharedDir)) continue; // skip intra-shared
    const text = fs.readFileSync(file, "utf8");
    const importRegex = new RegExp(
      String.raw`from\s+['"][^'"]*\bshared/${proxyModule}\b['"]`,
    );
    if (importRegex.test(text)) count += 1;
  }
  return count;
}

/**
 * Baseline captured at Phase 0. Phase 1 deletes each proxy and reduces
 * every entry here to 0; this file then flips to `expect(count).toBe(0)`.
 */
const PHASE_0_IMPORTER_BASELINE: Record<string, number> = {
  analytics: 0,
  backup: 0,
  constants: 0,
  curatedSets: 0,
  queue: 0,
  recommendations: 0,
  repository: 0,
  runtime: 0,
  runtimeValidation: 0,
  scheduler: 0,
  storage: 0,
  studyState: 0,
  types: 2,
  utils: 0,
};

describe("architecture / shared proxy modules", () => {
  it("captures the proxy modules that Phase 1 must delete", () => {
    const proxies = listSharedProxyModules();
    expect(proxies.sort()).toEqual(
      Object.keys(PHASE_0_IMPORTER_BASELINE).sort(),
    );
  });

  it("no new importer is added through a shared proxy beyond Phase 0 baseline", () => {
    for (const [proxyModule, baseline] of Object.entries(
      PHASE_0_IMPORTER_BASELINE,
    )) {
      const actual = countImportersOf(proxyModule);
      expect(
        actual,
        `src/shared/${proxyModule} importers (baseline ${baseline})`,
      ).toBeLessThanOrEqual(baseline);
    }
  });
});
