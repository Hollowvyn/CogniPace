/**
 * Architecture-boundary tests.
 *
 * Each test name IS the rule. Per-assertion messages carry only the
 * file path of the violation. The "why" for every rule lives in
 * docs/architecture.md, read once at onboarding.
 *
 * A non-malicious refactor (rename, file move, API change) must not
 * turn this suite red — only a real rule violation should. If a test
 * fails for a clean refactor, the test is wrong, not the code.
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
  if (!/\.(ts|tsx)$/.test(file)) return false;
  if (/\.d\.ts$/.test(file)) return false;
  // Architecture rules govern runtime-code boundaries. Test files
  // inside production directories (e.g. `__tests__/`) frequently need
  // to import providers, mocks, or fixtures across layers — that's
  // legitimate test setup, not a boundary violation.
  if (/\.test\.(ts|tsx)$/.test(file)) return false;
  if (/\/__tests__\//.test(file)) return false;
  return true;
}

function srcFiles(): string[] {
  return listFiles(path.join(repoRoot, "src")).filter(isSource);
}

function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

function rel(absolute: string): string {
  return path.relative(repoRoot, absolute);
}

describe("architecture / Phase 0 boundaries", () => {
  it("tsconfig declares the six refactor path aliases", () => {
    const tsconfig = read(path.join(repoRoot, "tsconfig.json"));
    for (const alias of [
      "@app/*",
      "@features/*",
      "@libs/*",
      "@platform/*",
      "@design-system/*",
      "@shared/*",
    ]) {
      expect(tsconfig.includes(`"${alias}"`), alias).toBe(true);
    }
  });

  it("no source file imports forwardRef from react", () => {
    for (const file of srcFiles()) {
      expect(
        /import\s*\{[^}]*\bforwardRef\b[^}]*\}\s*from\s*['"]react['"]/.test(
          read(file),
        ),
        rel(file),
      ).toBe(false);
    }
  });

  it("no source file uses a @mui/material or @mui/icons-material barrel import", () => {
    for (const file of srcFiles()) {
      const text = read(file);
      for (const pattern of [
        /from\s*['"]@mui\/material['"]/,
        /from\s*['"]@mui\/icons-material['"]/,
      ]) {
        expect(pattern.test(text), rel(file)).toBe(false);
      }
    }
  });
});

describe("architecture / Phase 1 boundaries", () => {
  it("@shared/ids exposes branded ID types via a single barrel", () => {
    const idsBarrel = path.join(repoRoot, "src/shared/ids/index.ts");
    expect(fs.existsSync(idsBarrel)).toBe(true);
    expect(/Id\b/.test(read(idsBarrel))).toBe(true);
  });
});

describe("architecture / Phase 2 boundaries", () => {
  // A handful of libs/ files cross the libs→features boundary by
  // design (per-entry rationale below). The long-term fix is to invert
  // ownership so StudyState/UserSettings/Difficulty live in libs and
  // features re-export.
  const LIBS_FEATURE_TYPE_LEAKS = new Set([
    // Re-exports `nowIso` from @platform/time so the FSRS scheduler can
    // fall back to system time when callers don't pass `now`.
    "src/libs/fsrs/utils.ts",
    // Internal barrel for FSRS lib consumers; re-exports StudyState /
    // Difficulty / UserSettings and the createDefaultStudyState factory
    // from their owning features.
    "src/libs/fsrs/types.ts",
  ]);

  it("libs/** does not import from features/, app/, or platform/", () => {
    const libsRoot = path.join(repoRoot, "src/libs");
    if (!fs.existsSync(libsRoot)) return;
    for (const file of listFiles(libsRoot).filter(isSource)) {
      if (LIBS_FEATURE_TYPE_LEAKS.has(rel(file))) continue;
      const text = read(file);
      for (const re of [
        /@features\//,
        /@app\//,
        /@platform\//,
        /\bsrc\/features\//,
        /\bsrc\/app\//,
        /\bsrc\/platform\//,
      ]) {
        expect(re.test(text), `${rel(file)} :: ${re}`).toBe(false);
      }
    }
  });

  it("libs/event-bus exposes useTickQuery", () => {
    const barrel = path.join(repoRoot, "src/libs/event-bus/index.ts");
    expect(fs.existsSync(barrel)).toBe(true);
    expect(read(barrel).includes("useTickQuery")).toBe(true);
  });

  it("no caller references the deleted broadcast.ts / appDataChangeRepository.ts", () => {
    const files = [
      ...listFiles(path.join(repoRoot, "src")),
      ...listFiles(path.join(repoRoot, "tests")),
    ].filter(isSource);
    const archTestDir = path.join(repoRoot, "tests/architecture");
    for (const file of files) {
      if (file.startsWith(archTestDir)) continue;
      expect(
        /\bdb\/broadcast\b|appDataChangeRepository|broadcastDbTick|subscribeToAppDataChanges/.test(
          read(file),
        ),
        rel(file),
      ).toBe(false);
    }
  });
});

describe("architecture / Phase 3 boundaries", () => {
  // Phase 6 transition: platform/db/instance.ts seeds via features.
  // Phase 8 lifts seeding to the SW entrypoint and this set drops to zero.
  const PLATFORM_FEATURE_LEAKS = new Set(["src/platform/db/instance.ts"]);

  it("platform/** does not import from features/ or app/", () => {
    const platformRoot = path.join(repoRoot, "src/platform");
    if (!fs.existsSync(platformRoot)) return;
    for (const file of listFiles(platformRoot).filter(isSource)) {
      if (PLATFORM_FEATURE_LEAKS.has(rel(file))) continue;
      const text = read(file);
      for (const re of [
        /@features\//,
        /@app\//,
        /\bsrc\/features\//,
        /\bsrc\/app\//,
      ]) {
        expect(re.test(text), `${rel(file)} :: ${re}`).toBe(false);
      }
    }
  });

  it("platform/db does not ship a grab-bag schema.ts", () => {
    expect(
      fs.existsSync(path.join(repoRoot, "src/platform/db/schema.ts")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/platform/db/schema/index.ts")),
    ).toBe(true);
  });

  it("no caller references the moved src/data/{db,datasources}/* paths", () => {
    const files = [
      ...listFiles(path.join(repoRoot, "src")),
      ...listFiles(path.join(repoRoot, "tests")),
    ].filter(isSource);
    const archTestDir = path.join(repoRoot, "tests/architecture");
    for (const file of files) {
      if (file.startsWith(archTestDir)) continue;
      expect(
        /from\s+['"][^'"]*\bdata\/(db|datasources)\//.test(read(file)),
        rel(file),
      ).toBe(false);
    }
  });
});

describe("architecture / Phase 4 boundaries", () => {
  it("design-system/atoms ships at least one a11y test", () => {
    const atomsRoot = path.join(repoRoot, "src/design-system/atoms");
    if (!fs.existsSync(atomsRoot)) return;
    const a11yTests = listFiles(atomsRoot).filter((f) =>
      /\.a11y\.test\.tsx$/.test(f),
    );
    expect(a11yTests.length).toBeGreaterThan(0);
  });

  it("design-system/theme exports createCogniTheme", () => {
    const barrel = path.join(repoRoot, "src/design-system/theme/index.ts");
    expect(fs.existsSync(barrel)).toBe(true);
    expect(read(barrel).includes("createCogniTheme")).toBe(true);
  });

  it("design-system/** does not import from features/, app/, or platform/", () => {
    const dsRoot = path.join(repoRoot, "src/design-system");
    if (!fs.existsSync(dsRoot)) return;
    for (const file of listFiles(dsRoot).filter(isSource)) {
      const text = read(file);
      for (const re of [
        /@features\//,
        /@app\//,
        /@platform\//,
        /\bsrc\/features\//,
        /\bsrc\/app\//,
        /\bsrc\/platform\//,
      ]) {
        expect(re.test(text), `${rel(file)} :: ${re}`).toBe(false);
      }
    }
  });
});

describe("architecture / Phase 5 boundaries", () => {
  it("no grab-bag types.ts or views.ts at the domain root", () => {
    for (const file of ["src/domain/types.ts", "src/domain/views.ts"]) {
      expect(fs.existsSync(path.join(repoRoot, file)), file).toBe(false);
    }
  });

  it("runtime-rpc has no contracts directory or god-file — handler signatures ARE the wire contract", () => {
    expect(
      fs.existsSync(path.join(repoRoot, "src/libs/runtime-rpc/contracts.ts")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/libs/runtime-rpc/contracts")),
    ).toBe(false);
  });

  it("files under domain/types/ and domain/views/ export at most 1 named symbol", () => {
    for (const root of [
      path.join(repoRoot, "src/domain/types"),
      path.join(repoRoot, "src/domain/views"),
    ]) {
      if (!fs.existsSync(root)) continue;
      const files = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".ts"))
        .map((e) => path.join(root, e.name));
      for (const file of files) {
        if (file.endsWith("/index.ts")) continue;
        const exportCount = (
          read(file).match(
            /^export (interface|type|enum|const|function)\s+\w+/gm,
          ) ?? []
        ).length;
        expect(exportCount, `${rel(file)} :: ${exportCount} exports`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("architecture / Phase 6 boundaries", () => {
  it("features/settings has the four canonical feature layers", () => {
    const root = path.join(repoRoot, "src/features/settings");
    expect(fs.existsSync(root)).toBe(true);
    for (const layer of ["data", "domain", "messaging", "ui"]) {
      expect(fs.existsSync(path.join(root, layer)), layer).toBe(true);
    }
  });

  it("features/settings/data splits Repository (UI side) from DataSource (SW side)", () => {
    const dataDir = path.join(repoRoot, "src/features/settings/data");
    expect(fs.existsSync(path.join(dataDir, "repository"))).toBe(true);
    expect(fs.existsSync(path.join(dataDir, "datasource"))).toBe(true);
  });

  it("SettingsRepository ships as interface + conforming singleton so DI can swap it in tests", () => {
    const file = read(
      path.join(
        repoRoot,
        "src/features/settings/data/repository/SettingsRepository.ts",
      ),
    );
    expect(/export interface SettingsRepository/.test(file)).toBe(true);
    expect(
      /export const settingsRepository:\s*SettingsRepository/.test(file),
    ).toBe(true);
  });

  it("settings has no domain/usecases/ — single-repo features inline orchestration in the Repository", () => {
    expect(
      fs.existsSync(
        path.join(repoRoot, "src/features/settings/domain/usecases"),
      ),
    ).toBe(false);
  });

  it("files under domain/model/ export at most 1 named type each", () => {
    const modelDir = path.join(
      repoRoot,
      "src/features/settings/domain/model",
    );
    if (!fs.existsSync(modelDir)) return;
    const files = fs
      .readdirSync(modelDir, { withFileTypes: true })
      .filter(
        (e) => e.isFile() && e.name.endsWith(".ts") && e.name !== "index.ts",
      )
      .map((e) => path.join(modelDir, e.name));
    for (const file of files) {
      const typeExports = (
        read(file).match(/^export (interface|type|enum)\s+\w+/gm) ?? []
      ).length;
      expect(typeExports, `${rel(file)} :: ${typeExports} type exports`).toBeLessThanOrEqual(1);
    }
  });

  it("the UserSettings boundary parser lives next to the model under domain/model/", () => {
    const parser = path.join(
      repoRoot,
      "src/features/settings/domain/model/sanitizeStoredUserSettings.ts",
    );
    expect(fs.existsSync(parser)).toBe(true);
  });

  it("features/settings exposes both UI (index.ts) and SW (server.ts) barrels", () => {
    const root = path.join(repoRoot, "src/features/settings");
    expect(fs.existsSync(path.join(root, "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(root, "server.ts"))).toBe(true);
  });

  it("features/settings/data/ is consumed only via the index/server barrels", () => {
    for (const file of srcFiles()) {
      const relPath = rel(file);
      if (relPath.startsWith("src/features/settings/")) continue;
      expect(
        /from\s+['"]@features\/settings\/data\//.test(read(file)),
        relPath,
      ).toBe(false);
    }
  });

  it("app/di barrel exposes DIProvider, useDI, and DIServices", () => {
    const tsBarrel = path.join(repoRoot, "src/app/di/index.ts");
    const tsxBarrel = path.join(repoRoot, "src/app/di/index.tsx");
    const barrel = fs.existsSync(tsBarrel) ? tsBarrel : tsxBarrel;
    expect(fs.existsSync(barrel), "src/app/di/index.{ts,tsx}").toBe(true);
    const text = read(barrel);
    for (const name of ["DIProvider", "useDI", "DIServices"]) {
      expect(text.includes(name), name).toBe(true);
    }
  });
});

describe("architecture / Phase 7+ generic feature rules", () => {
  function featureRoots(): string[] {
    const featuresDir = path.join(repoRoot, "src/features");
    if (!fs.existsSync(featuresDir)) return [];
    return fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(featuresDir, e.name));
  }

  it("every feature exposes UI (index.ts) and SW (server.ts) barrels", () => {
    for (const feature of featureRoots()) {
      const name = path.basename(feature);
      expect(fs.existsSync(path.join(feature, "index.ts")), `${name}/index.ts`).toBe(true);
      expect(fs.existsSync(path.join(feature, "server.ts")), `${name}/server.ts`).toBe(true);
    }
  });

  it("every feature has at least domain/", () => {
    // Universal rule: every feature owns at least types. data/, messaging/,
    // and ui/ are present only when the feature needs them — pure-compute
    // orchestrators (analytics) can ship with just domain/.
    for (const feature of featureRoots()) {
      const name = path.basename(feature);
      expect(fs.existsSync(path.join(feature, "domain")), `${name}/domain/`).toBe(true);
    }
  });

  it("no file outside a feature deep-imports its data/", () => {
    for (const feature of featureRoots()) {
      const name = path.basename(feature);
      const featurePrefix = `src/features/${name}/`;
      const importPattern = new RegExp(
        `from\\s+['"]@features/${name}/data/`,
      );
      for (const file of srcFiles()) {
        const relPath = rel(file);
        if (relPath.startsWith(featurePrefix)) continue;
        expect(importPattern.test(read(file)), `${relPath} → ${name}/data/*`).toBe(false);
      }
    }
  });

  it("files under every feature's domain/model/ export at most 1 named type", () => {
    for (const feature of featureRoots()) {
      const modelDir = path.join(feature, "domain", "model");
      if (!fs.existsSync(modelDir)) continue;
      const files = fs
        .readdirSync(modelDir, { withFileTypes: true })
        .filter(
          (e) => e.isFile() && e.name.endsWith(".ts") && e.name !== "index.ts",
        )
        .map((e) => path.join(modelDir, e.name));
      for (const file of files) {
        const typeExports = (
          read(file).match(/^export (interface|type|enum)\s+\w+/gm) ?? []
        ).length;
        expect(typeExports, `${rel(file)} :: ${typeExports} type exports`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe.skip("architecture / future placeholders", () => {
  it.todo("features/<x>/ui does not import features/<x>/data");
  it.todo("features/<x>/domain does not import features/<x>/data impls");
  it.todo("tick() calls pass a TickScope literal with a known table name");
  it.todo("app/entrypoints/background.ts graph excludes react, react-dom, @mui/*, design-system/*");
});
