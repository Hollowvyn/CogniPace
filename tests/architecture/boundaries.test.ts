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
  // Phase 6 transition: a small allowlist of libs/* files that still
  // import a feature *type*. Phase 8's per-feature contracts.ts split
  // (each feature owns its messaging/contracts) lifts every entry here.
  const LIBS_FEATURE_TYPE_LEAKS = new Set([
    "src/libs/runtime-rpc/contracts/MessageRequestMap.ts",
  ]);

  it("libs/** does not import from features/, app/, or platform/", () => {
    const libsRoot = path.join(repoRoot, "src/libs");
    if (!fs.existsSync(libsRoot)) return;
    const files = listFiles(libsRoot).filter(isSource);
    for (const file of files) {
      const relPath = path.relative(repoRoot, file);
      if (LIBS_FEATURE_TYPE_LEAKS.has(relPath)) continue;
      const text = read(file);
      const forbidden = [/@features\//, /@app\//, /@platform\//, /\bsrc\/features\//, /\bsrc\/app\//, /\bsrc\/platform\//];
      for (const re of forbidden) {
        expect(
          re.test(text),
          `${relPath} imports across the libs boundary (${re})`,
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

describe("architecture / Phase 3 boundaries", () => {
  // Phase 6 transition: platform/db/instance.ts calls seed* helpers
  // straight from features during SW boot. Phase 8 lifts seeding to the
  // SW entrypoint (app/entrypoints/background.ts) which is allowed to
  // import features — at which point this allowlist drops to zero.
  const PLATFORM_FEATURE_LEAKS = new Set([
    "src/platform/db/instance.ts",
  ]);

  it("platform/** does not import from features/ or app/", () => {
    const platformRoot = path.join(repoRoot, "src/platform");
    if (!fs.existsSync(platformRoot)) return;
    const files = listFiles(platformRoot).filter(isSource);
    for (const file of files) {
      const relPath = path.relative(repoRoot, file);
      if (PLATFORM_FEATURE_LEAKS.has(relPath)) continue;
      const text = read(file);
      const forbidden = [/@features\//, /@app\//, /\bsrc\/features\//, /\bsrc\/app\//];
      for (const re of forbidden) {
        expect(
          re.test(text),
          `${relPath} crosses the platform boundary (${re})`,
        ).toBe(false);
      }
    }
  });

  it("platform/db schema is split per table under schema/", () => {
    const schemaDir = path.join(repoRoot, "src/platform/db/schema");
    expect(fs.existsSync(schemaDir)).toBe(true);
    for (const name of [
      "topics.ts",
      "companies.ts",
      "problems.ts",
      "studyStates.ts",
      "attemptHistory.ts",
      "tracks.ts",
      "trackGroups.ts",
      "trackGroupProblems.ts",
      "settingsKv.ts",
      "index.ts",
      "utils/nowSql.ts",
    ]) {
      expect(
        fs.existsSync(path.join(schemaDir, name)),
        `missing src/platform/db/schema/${name}`,
      ).toBe(true);
    }
  });

  it("platform/chrome/storage.ts and platform/time/Clock.ts exist", () => {
    expect(
      fs.existsSync(path.join(repoRoot, "src/platform/chrome/storage.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/platform/time/Clock.ts")),
    ).toBe(true);
  });

  it("no caller still references the moved src/data/{db,datasources}/* paths", () => {
    const files = [
      ...listFiles(path.join(repoRoot, "src")),
      ...listFiles(path.join(repoRoot, "tests")),
    ].filter(isSource);
    const archTestDir = path.join(repoRoot, "tests/architecture");
    for (const file of files) {
      if (file.startsWith(archTestDir)) continue;
      const text = read(file);
      expect(
        /from\s+['"][^'"]*\bdata\/(db|datasources)\//.test(text),
        `${path.relative(repoRoot, file)} imports from moved data/{db,datasources}`,
      ).toBe(false);
    }
  });
});

describe("architecture / Phase 4 boundaries", () => {
  it("no source file imports forwardRef from react", () => {
    // Same assertion as Phase 0's positive check, restated here so the
    // intent is visible on the Phase-4 rollout: atoms moved into
    // design-system in Phase 4 must accept `ref` as a typed prop.
    for (const file of srcFiles()) {
      const text = read(file);
      expect(
        /import\s*\{[^}]*\bforwardRef\b[^}]*\}\s*from\s*['"]react['"]/.test(
          text,
        ),
        `forwardRef imported in ${path.relative(repoRoot, file)}`,
      ).toBe(false);
    }
  });

  it("design-system/atoms/ has at least one *.a11y.test.tsx", () => {
    const atomsRoot = path.join(repoRoot, "src/design-system/atoms");
    if (!fs.existsSync(atomsRoot)) return;
    const a11yTests = listFiles(atomsRoot).filter((f) =>
      /\.a11y\.test\.tsx$/.test(f),
    );
    expect(
      a11yTests.length,
      "expected at least one *.a11y.test.tsx under src/design-system/atoms/",
    ).toBeGreaterThan(0);
  });

  it("design-system/theme exposes the locked token + factory surface", () => {
    const theme = path.join(repoRoot, "src/design-system/theme");
    expect(fs.existsSync(theme)).toBe(true);
    for (const name of [
      "tokens/color.ts",
      "tokens/typography.ts",
      "tokens/spacing.ts",
      "tokens/motion.ts",
      "tokens/elevation.ts",
      "tokens/radius.ts",
      "tokens/zIndex.ts",
      "surfaces/popup.ts",
      "surfaces/dashboard.ts",
      "surfaces/overlay.ts",
      "createCogniTheme.ts",
      "useReducedMotion.ts",
      "index.ts",
    ]) {
      expect(
        fs.existsSync(path.join(theme, name)),
        `missing src/design-system/theme/${name}`,
      ).toBe(true);
    }
  });

  it("design-system/** does not import from features/, app/, or platform/", () => {
    const dsRoot = path.join(repoRoot, "src/design-system");
    if (!fs.existsSync(dsRoot)) return;
    const files = listFiles(dsRoot).filter(isSource);
    for (const file of files) {
      const text = read(file);
      const forbidden = [
        /@features\//,
        /@app\//,
        /@platform\//,
        /\bsrc\/features\//,
        /\bsrc\/app\//,
        /\bsrc\/platform\//,
      ];
      for (const re of forbidden) {
        expect(
          re.test(text),
          `${path.relative(repoRoot, file)} crosses the design-system boundary (${re})`,
        ).toBe(false);
      }
    }
  });
});

describe("architecture / Phase 5 boundaries", () => {
  it("domain/types/ and domain/views/ are folders with no top-level grab-bag .ts", () => {
    expect(
      fs.existsSync(path.join(repoRoot, "src/domain/types.ts")),
      "src/domain/types.ts should be split into the types/ folder",
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/domain/views.ts")),
      "src/domain/views.ts should be split into the views/ folder",
    ).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, "src/domain/types/index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, "src/domain/views/index.ts"))).toBe(true);
  });

  it("libs/runtime-rpc/contracts is a folder (split per concern)", () => {
    expect(
      fs.existsSync(path.join(repoRoot, "src/libs/runtime-rpc/contracts.ts")),
      "contracts.ts should be split into the contracts/ folder",
    ).toBe(false);
    for (const name of [
      "MessageRequestMap.ts",
      "MessageResponseMap.ts",
      "MessageType.ts",
      "RuntimeMessage.ts",
      "index.ts",
    ]) {
      expect(
        fs.existsSync(
          path.join(repoRoot, "src/libs/runtime-rpc/contracts", name),
        ),
        `missing src/libs/runtime-rpc/contracts/${name}`,
      ).toBe(true);
    }
  });

  it("overlay panel types are split under types/", () => {
    const overlayTypes = path.join(
      repoRoot,
      "src/ui/screens/overlay/types",
    );
    expect(fs.existsSync(overlayTypes)).toBe(true);
    const files = fs
      .readdirSync(overlayTypes)
      .filter((n) => n.endsWith(".ts"));
    // Expect ~18 split type files (one per type).
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  it("one named export per file under domain/types/ and domain/views/ (best-effort)", () => {
    const roots = [
      path.join(repoRoot, "src/domain/types"),
      path.join(repoRoot, "src/domain/views"),
    ];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      const files = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".ts"))
        .map((e) => path.join(root, e.name));
      for (const file of files) {
        if (file.endsWith("/index.ts")) continue;
        const text = read(file);
        // Count distinct top-level export statements that declare names.
        const exportCount =
          (text.match(/^export (interface|type|enum|const|function)\s+\w+/gm) ?? [])
            .length;
        expect(
          exportCount,
          `${path.relative(repoRoot, file)} should export exactly 1 named symbol (got ${exportCount})`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("architecture / Phase 6 boundaries", () => {
  it("features/settings/ scaffolds the layered template", () => {
    const root = path.join(repoRoot, "src/features/settings");
    expect(fs.existsSync(root)).toBe(true);
    for (const dir of [
      "data",
      "domain",
      "domain/model",
      "domain/model/UserSettings",
      "domain/usecases",
      "messaging",
      "ui",
    ]) {
      expect(
        fs.existsSync(path.join(root, dir)),
        `missing src/features/settings/${dir}/`,
      ).toBe(true);
    }
  });

  it("UserSettings model folder holds the per-type files + specific helpers", () => {
    const dir = path.join(
      repoRoot,
      "src/features/settings/domain/model/UserSettings",
    );
    for (const name of [
      // per-type files (one DomainModel per file)
      "UserSettings.ts",
      "UserSettingsPatch.ts",
      "StudyMode.ts",
      "ReviewOrder.ts",
      "DifficultyGoalSettings.ts",
      "NotificationSettings.ts",
      "MemoryReviewSettings.ts",
      "QuestionFilterSettings.ts",
      "TimingSettings.ts",
      "ExperimentalSettings.ts",
      // helpers specific to this model (live next to the model, not in
      // a sibling utils/ — they're "what does this model do?")
      "default.ts",
      "equality.ts",
      "sanitize.ts",
      "clone.ts",
      "merge.ts",
      "index.ts",
    ]) {
      expect(
        fs.existsSync(path.join(dir, name)),
        `missing src/features/settings/domain/model/UserSettings/${name}`,
      ).toBe(true);
    }
  });

  it("features/settings exposes both UI (index.ts) and SW (server.ts) barrels", () => {
    const root = path.join(repoRoot, "src/features/settings");
    expect(fs.existsSync(path.join(root, "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(root, "server.ts"))).toBe(true);
  });

  it("curated usecases live under domain/usecases/", () => {
    const usecasesDir = path.join(
      repoRoot,
      "src/features/settings/domain/usecases",
    );
    for (const name of [
      "setActiveTrack.ts",
      "setDailyTarget.ts",
      "setSkipPremium.ts",
      "setStudyMode.ts",
      "saveSettings.ts",
      "resetSettings.ts",
      "index.ts",
    ]) {
      expect(
        fs.existsSync(path.join(usecasesDir, name)),
        `missing src/features/settings/domain/usecases/${name}`,
      ).toBe(true);
    }
  });

  it("domain/ has no top-level grab-bag .ts (everything lives under model/ or usecases/)", () => {
    const domainDir = path.join(repoRoot, "src/features/settings/domain");
    const topLevel = fs
      .readdirSync(domainDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".ts"))
      .map((e) => e.name);
    expect(topLevel.sort()).toEqual(["index.ts"]);
  });

  it("features/settings/data/ is consumed only via the index/server barrels", () => {
    const files = listFiles(path.join(repoRoot, "src")).filter(isSource);
    for (const file of files) {
      const relPath = path.relative(repoRoot, file);
      if (relPath.startsWith("src/features/settings/")) continue;
      const text = read(file);
      // The Repository (UI side) flows out through @features/settings;
      // the DataSource (SW side) flows out through
      // @features/settings/server. Anyone reaching the data/ folder
      // directly is a boundary violation.
      expect(
        /from\s+['"]@features\/settings\/data\//.test(text),
        `${relPath} imports features/settings/data/* directly — go through @features/settings or @features/settings/server`,
      ).toBe(false);
    }
  });

  it("data/ holds the UI-side Repository + the SW-side DataSource", () => {
    const dataDir = path.join(repoRoot, "src/features/settings/data");
    for (const name of ["SettingsRepository.ts", "SettingsDataSource.ts"]) {
      expect(
        fs.existsSync(path.join(dataDir, name)),
        `missing src/features/settings/data/${name}`,
      ).toBe(true);
    }
  });

  it("usecases code against the Repository, not the Client (UDF chain)", () => {
    const usecasesDir = path.join(
      repoRoot,
      "src/features/settings/domain/usecases",
    );
    if (!fs.existsSync(usecasesDir)) return;
    const files = fs
      .readdirSync(usecasesDir)
      .filter((f) => f.endsWith(".ts") && f !== "index.ts");
    for (const name of files) {
      const text = read(path.join(usecasesDir, name));
      expect(
        /SettingsRepository/.test(text),
        `usecases/${name} should accept a SettingsRepository (the abstraction usecases code against)`,
      ).toBe(true);
      expect(
        /SettingsClient/.test(text),
        `usecases/${name} reaches past the Repository to the Client — go through the Repository`,
      ).toBe(false);
    }
  });
});

describe.skip("architecture / Phase 7+ boundaries (placeholder)", () => {
  // Filled in as phases land. Listed by phase below.
  it.todo("Phase 6+: features/<x>/ui does not import features/<x>/data");
  it.todo("Phase 6+: features/<x>/domain does not import features/<x>/data impls");
  it.todo("Phase 6+: cross-feature imports go through features/<x>/index.ts or server.ts");
  it.todo("Phase 6+: tick() calls pass a TickScope literal with a known table name");
  it.todo("Phase 8: app/entrypoints/background.ts graph excludes react, react-dom, @mui/*, design-system/*");
});
