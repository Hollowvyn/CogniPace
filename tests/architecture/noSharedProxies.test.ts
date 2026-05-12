/**
 * Strict (Phase 1+) rule: `src/shared/` is a kernel of one-thing-per-file
 * subfolders (e.g. `ids/`). No top-level proxy modules, and no file
 * outside `src/shared/` imports from a top-level `src/shared/*.ts`
 * shim. If you want to share a type or helper across features, put it
 * in a kebab/PascalCase subfolder of `src/shared/` (see `ids/`).
 *
 * Was a snapshot in Phase 0; flipped to strict-zero when the 14
 * re-export proxies were deleted in Phase 1.
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

function isSource(file: string): boolean {
  return /\.(ts|tsx)$/.test(file) && !/\.d\.ts$/.test(file);
}

describe("architecture / shared kernel", () => {
  it("src/shared/ contains no top-level .ts files (only subfolders)", () => {
    if (!fs.existsSync(sharedDir)) return; // allowed: empty kernel
    const topLevelFiles = fs
      .readdirSync(sharedDir, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
      .map((e) => e.name);
    expect(topLevelFiles).toEqual([]);
  });

  it("contains the ids/ subfolder with branded ID modules", () => {
    const ids = path.join(sharedDir, "ids");
    expect(fs.existsSync(ids)).toBe(true);
    const required = [
      "Brand.ts",
      "ProblemSlug.ts",
      "TopicId.ts",
      "CompanyId.ts",
      "TrackId.ts",
      "TrackGroupId.ts",
      "slugify.ts",
      "index.ts",
    ];
    for (const name of required) {
      expect(
        fs.existsSync(path.join(ids, name)),
        `missing src/shared/ids/${name}`,
      ).toBe(true);
    }
  });

  it("no source file imports from a removed src/shared/<proxy>.ts module", () => {
    const removedProxies = [
      "analytics",
      "backup",
      "constants",
      "curatedSets",
      "queue",
      "recommendations",
      "repository",
      "runtime",
      "runtimeValidation",
      "scheduler",
      "storage",
      "studyState",
      "types",
      "utils",
    ];
    const files = [
      ...listFiles(srcDir),
      ...listFiles(path.join(repoRoot, "tests")),
    ].filter(isSource);
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const proxy of removedProxies) {
        const re = new RegExp(
          String.raw`from\s+['"][^'"]*\bshared/${proxy}['"]`,
        );
        expect(
          re.test(text),
          `${path.relative(repoRoot, file)} imports removed src/shared/${proxy}`,
        ).toBe(false);
      }
    }
  });

  it("no source file uses src/domain/common/ids (moved to @shared/ids)", () => {
    const archTestDir = path.join(repoRoot, "tests/architecture");
    const files = [
      ...listFiles(srcDir),
      ...listFiles(path.join(repoRoot, "tests")),
    ]
      .filter(isSource)
      // Architecture tests legitimately reference removed paths as strings.
      .filter((file) => !file.startsWith(archTestDir));
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      expect(
        /\bcommon\/ids\b/.test(text),
        `${path.relative(repoRoot, file)} references domain/common/ids — use @shared/ids`,
      ).toBe(false);
    }
  });
});
