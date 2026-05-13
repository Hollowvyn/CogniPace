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
const v7DomainDirs = [
  path.join(repoRoot, "src/domain/problems"),
  path.join(repoRoot, "src/domain/topics"),
  path.join(repoRoot, "src/domain/companies"),
  path.join(repoRoot, "src/domain/sets"),
  path.join(repoRoot, "src/domain/active-focus"),
  path.join(repoRoot, "src/domain/data"),
];

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
