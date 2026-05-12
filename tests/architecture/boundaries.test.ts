/**
 * Architecture-boundary tests.
 *
 * Grow these phase-by-phase. The rules a phase ships green ride here so
 * regressions surface as red CI rather than as a runtime bug.
 *
 * Phase 0:
 *   - path aliases exist in tsconfig and resolve from src
 *   - no `forwardRef` import from "react"
 *   - no barrel import of "@mui/material" or "@mui/icons-material"
 *
 * Phase 1+ adds (placeholder describe.skip blocks live here as a TODO
 * list for the agent landing each phase):
 *   - features/<x> may only be imported via index.ts / server.ts
 *   - features/<x>/ui may not import features/<x>/data
 *   - libs/** may not import features/, app/, platform/
 *   - app/entrypoints/background.ts walks a graph free of react,
 *     react-dom, @mui/*, design-system/*
 *   - design-system/atoms/* each have a sibling *.a11y.test.tsx
 *   - tick() calls pass a TickScope literal whose table matches schema
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
    if (entry.isDirectory()) return listFiles(absolute);
    return absolute;
  });
}

function isSource(file: string): boolean {
  return /\.(ts|tsx)$/.test(file) && !/\.d\.ts$/.test(file);
}

function srcFiles(): string[] {
  return listFiles(path.join(repoRoot, "src")).filter(isSource);
}

function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

describe("architecture / Phase 0 boundaries", () => {
  it("tsconfig declares the six refactor path aliases", () => {
    const tsconfig = JSON.parse(
      read(path.join(repoRoot, "tsconfig.json")),
    ) as { compilerOptions?: { paths?: Record<string, string[]> } };
    const paths = tsconfig.compilerOptions?.paths ?? {};
    expect(Object.keys(paths).sort()).toEqual(
      [
        "@app/*",
        "@design-system/*",
        "@features/*",
        "@libs/*",
        "@platform/*",
        "@shared/*",
      ].sort(),
    );
  });

  it("no source file imports forwardRef from react", () => {
    for (const file of srcFiles()) {
      const text = read(file);
      // Catch: import { forwardRef } from "react"
      // and:    import { forwardRef as fr } from "react"
      expect(
        /import\s*\{[^}]*\bforwardRef\b[^}]*\}\s*from\s*['"]react['"]/.test(
          text,
        ),
        `forwardRef imported in ${path.relative(repoRoot, file)}`,
      ).toBe(false);
    }
  });

  it("no source file uses a @mui/material or @mui/icons-material barrel import", () => {
    for (const file of srcFiles()) {
      const text = read(file);
      expect(
        /from\s*['"]@mui\/material['"]/.test(text),
        `@mui/material barrel import in ${path.relative(repoRoot, file)} — use deep path`,
      ).toBe(false);
      expect(
        /from\s*['"]@mui\/icons-material['"]/.test(text),
        `@mui/icons-material barrel import in ${path.relative(repoRoot, file)} — use deep path`,
      ).toBe(false);
    }
  });
});

describe("architecture / Phase 1 boundaries", () => {
  it("@shared/ids resolves to a real folder with the expected ID modules", () => {
    const ids = path.join(repoRoot, "src/shared/ids");
    expect(fs.existsSync(ids)).toBe(true);
    // Convention: main models at the top of the folder; pure helpers
    // (Brand utility, slugify) under utils/. See plan §"utils/ helpers
    // convention".
    for (const name of [
      "ProblemSlug.ts",
      "TopicId.ts",
      "CompanyId.ts",
      "TrackId.ts",
      "TrackGroupId.ts",
      "index.ts",
      "utils/Brand.ts",
      "utils/slugify.ts",
    ]) {
      expect(fs.existsSync(path.join(ids, name))).toBe(true);
    }
  });
});

describe("architecture / Phase 2 boundaries", () => {
  it("libs/** does not import from features/, app/, or platform/", () => {
    const libsRoot = path.join(repoRoot, "src/libs");
    if (!fs.existsSync(libsRoot)) return;
    const files = listFiles(libsRoot).filter(isSource);
    for (const file of files) {
      const text = read(file);
      const forbidden = [/@features\//, /@app\//, /@platform\//, /\bsrc\/features\//, /\bsrc\/app\//, /\bsrc\/platform\//];
      for (const re of forbidden) {
        expect(
          re.test(text),
          `${path.relative(repoRoot, file)} imports across the libs boundary (${re})`,
        ).toBe(false);
      }
    }
  });

  it("libs/fsrs, libs/runtime-rpc, libs/screen-parsing, libs/event-bus all exist", () => {
    for (const lib of [
      "src/libs/fsrs",
      "src/libs/runtime-rpc",
      "src/libs/screen-parsing/dom",
      "src/libs/event-bus",
    ]) {
      expect(fs.existsSync(path.join(repoRoot, lib))).toBe(true);
    }
  });

  it("libs/event-bus exposes tick + subscribeToTick + useTickQuery", () => {
    const index = read(path.join(repoRoot, "src/libs/event-bus/index.ts"));
    expect(index).toContain("export { tick }");
    expect(index).toContain("subscribeToTick");
    expect(index).toContain("useTickQuery");
    expect(index).toContain("TickScope");
  });

  it("no caller still references the deleted broadcast.ts / appDataChangeRepository.ts", () => {
    const files = [
      ...listFiles(path.join(repoRoot, "src")),
      ...listFiles(path.join(repoRoot, "tests")),
    ].filter(isSource);
    const archTestDir = path.join(repoRoot, "tests/architecture");
    for (const file of files) {
      if (file.startsWith(archTestDir)) continue;
      const text = read(file);
      expect(
        /\bdb\/broadcast\b|appDataChangeRepository|broadcastDbTick|subscribeToAppDataChanges/.test(
          text,
        ),
        `${path.relative(repoRoot, file)} still references the removed broadcast module`,
      ).toBe(false);
    }
  });
});

describe.skip("architecture / Phase 3+ boundaries (placeholder)", () => {
  // Filled in as phases land. Listed by phase below.
  it.todo("Phase 3: platform/** does not import features/, app/");
  it.todo("Phase 4: every design-system/atoms/*.tsx has a sibling *.a11y.test.tsx");
  it.todo("Phase 4: no forwardRef anywhere in src/");
  it.todo("Phase 6+: features/<x>/ui does not import features/<x>/data");
  it.todo("Phase 6+: features/<x>/domain does not import features/<x>/data impls");
  it.todo("Phase 6+: cross-feature imports go through features/<x>/index.ts or server.ts");
  it.todo("Phase 6+: tick() calls pass a TickScope literal with a known table name");
  it.todo("Phase 8: app/entrypoints/background.ts graph excludes react, react-dom, @mui/*, design-system/*");
});
