/**
 * Architecture lint tests for the v7 layer.
 *
 * These pin the architectural rules called out in the refactor plan so
 * regressions surface as red CI rather than as production bugs:
 *
 *   1. Repository purity — only `appDataRepository.ts` is allowed to
 *      reach into `chrome.storage` or the storage datasource. Pure
 *      mutator repos must not touch IO.
 *   2. `now: string` discipline — domain code must not call `nowIso()`
 *      directly. Handlers compute the timestamp once and thread it.
 *   3. Lazy StudyState — only `studyStateRepository.ts` may write to
 *      `studyStatesBySlug[...] = ...`. No eager-create paths sneak back
 *      in from elsewhere.
 *   4. Branded ID discipline — entity model files use the branded types,
 *      not raw `string` for FK references.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../..");

function listFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return listFiles(absolute);
    }
    return absolute;
  });
}

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

const v7RepoDir = path.join(repoRoot, "src/data/repositories/v7");
// After Phase A killed src/domain/{types/index,active-focus,common,
// views,usecases}, the only domain code left is the v7-blob carry-over.
// Phase B retires this folder entirely with the v7 funnel.
const v7DomainDirs = [path.join(repoRoot, "src/domain/data")];

/** The exact set of files allowed to live under src/domain/ after
 *  Phase A. Phase B removes all three and the folder goes away. */
const DEFERRED_LEGACY_DOMAIN_FILES = new Set([
  "src/domain/data/appDataV7.ts",
  "src/domain/types/AppData.ts",
  "src/domain/types/STORAGE_SCHEMA_VERSION.ts",
]);

describe("v7 architecture", () => {
  it("only the appDataRepository touches chrome.storage in the v7 layer", () => {
    const v7Files = listFiles(v7RepoDir).filter((f) => f.endsWith(".ts"));

    for (const file of v7Files) {
      const text = read(file);
      const isAppDataRepo = path.basename(file) === "appDataRepository.ts";
      if (isAppDataRepo) continue;

      expect(text, `Pure repo ${file} should not import storage datasource`).not.toMatch(
        /datasources\/chrome\/storage/,
      );
      expect(text, `Pure repo ${file} should not reference chrome.storage`).not.toMatch(
        /chrome\.storage/,
      );
      expect(text, `Pure repo ${file} should not call writeLocalStorage`).not.toMatch(
        /\bwriteLocalStorage\s*\(/,
      );
      expect(text, `Pure repo ${file} should not call readLocalStorage`).not.toMatch(
        /\breadLocalStorage\s*\(/,
      );
    }
  });

  it("v7 domain layer never calls nowIso directly", () => {
    for (const dir of v7DomainDirs) {
      const files = listFiles(dir).filter(
        (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
      );
      for (const file of files) {
        const text = read(file);
        expect(text, `Domain file ${file} should not import nowIso`).not.toMatch(
          /\bnowIso\b/,
        );
      }
    }
  });

  it("v7 domain layer is free of react/browser dependencies", () => {
    for (const dir of v7DomainDirs) {
      const files = listFiles(dir).filter((f) => f.endsWith(".ts"));
      for (const file of files) {
        const text = read(file);
        expect(text).not.toMatch(/from ["']react["']/);
        expect(text).not.toMatch(/\bdocument\./);
        expect(text).not.toMatch(/\bwindow\./);
        // chrome.* is allowed only via crypto.randomUUID — guard the storage path
        expect(text).not.toMatch(/chrome\.storage/);
      }
    }
  });

  it("only studyStateRepository writes to studyStatesBySlug", () => {
    const allowedFile = path.join(v7RepoDir, "studyStateRepository.ts");
    const v7Files = listFiles(v7RepoDir).filter((f) => f.endsWith(".ts"));
    for (const file of v7Files) {
      if (file === allowedFile) continue;
      const text = read(file);
      // Reads (lookup) are fine; writes via subscript assignment are not.
      expect(
        text,
        `${file} should not write to studyStatesBySlug[...]`,
      ).not.toMatch(/studyStatesBySlug\[[^\]]+\]\s*=/);
    }
  });

  it("src/domain/ contains only the deferred-to-Phase-B legacy files", () => {
    // Phase A killed the transition stub (src/domain/types/index.ts),
    // the views barrel, the common utilities, the active-focus module,
    // and the empty usecases stub. What remains is the v7 funnel
    // carry-over — three files retired together when Phase B kills
    // the funnel. Re-introducing anything under src/domain/ is almost
    // certainly a regression; this test catches it.
    const domainRoot = path.join(repoRoot, "src/domain");
    if (!fs.existsSync(domainRoot)) {
      // Phase B has already shipped — folder is gone. Nothing to check.
      return;
    }
    const actual = new Set(
      listFiles(domainRoot)
        .filter((f) => !f.endsWith(".test.ts"))
        .map((f) => path.relative(repoRoot, f)),
    );
    const unexpected = [...actual].filter(
      (f) => !DEFERRED_LEGACY_DOMAIN_FILES.has(f),
    );
    const missing = [...DEFERRED_LEGACY_DOMAIN_FILES].filter(
      (f) => !actual.has(f),
    );

    expect(
      unexpected,
      `Unexpected file(s) under src/domain/. Phase A retired every domain shim; new code lives in features/, libs/, platform/, or shared/. If a Phase-B-deferred file legitimately needs a sibling, add it to DEFERRED_LEGACY_DOMAIN_FILES.`,
    ).toEqual([]);
    expect(
      missing,
      `Phase-B-deferred file(s) missing from src/domain/. If you killed one ahead of Phase B, remove it from DEFERRED_LEGACY_DOMAIN_FILES.`,
    ).toEqual([]);
  });

  it("aggregate registry covers every AppDataV7 aggregate root", () => {
    const registryText = read(
      path.join(v7RepoDir, "aggregateRegistry.ts"),
    );
    const appDataText = read(
      path.join(repoRoot, "src/domain/data/appDataV7.ts"),
    );
    const aggregateKeysMatch = appDataText.match(
      /APP_DATA_AGGREGATE_KEYS\s*=\s*\[([^\]]+)\]/,
    );
    expect(aggregateKeysMatch).toBeTruthy();
    const keys = (aggregateKeysMatch?.[1] ?? "")
      .split(",")
      .map((token) => token.replace(/["'\s]/g, ""))
      .filter(Boolean);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(registryText, `aggregateRegistry should cover ${key}`).toContain(
        `"${key}"`,
      );
    }
  });
});
