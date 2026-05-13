/**
 * Architecture-boundary tests.
 *
 * Every test here asserts a behavioral RULE, not a file fixture. A
 * non-malicious refactor (rename a method, add a sub-type, collapse
 * a folder) must NOT turn this suite red — only a real rule violation
 * should. If a failure leaves a reader guessing why the rule exists,
 * fix the message before merging.
 *
 * Convention for messages: state the rule, then point at the doc
 * section that explains it: `…rule…; see docs/architecture.md#<id>`.
 *
 * Groupings preserve the migration phase that introduced each rule —
 * the rules themselves outlive the phases.
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
      expect(
        tsconfig.includes(`"${alias}"`),
        `tsconfig.json is missing path alias \`${alias}\` — cross-feature imports go through aliases, not relative paths. See docs/architecture.md#path-aliases`,
      ).toBe(true);
    }
  });

  it("no source file imports forwardRef from react", () => {
    // React 19: atoms accept `ref` as a typed prop. See docs/architecture.md#react-19-idioms
    for (const file of srcFiles()) {
      const text = read(file);
      expect(
        /import\s*\{[^}]*\bforwardRef\b[^}]*\}\s*from\s*['"]react['"]/.test(
          text,
        ),
        `${rel(file)} imports \`forwardRef\` — React 19 atoms accept \`ref\` as a typed prop directly. See docs/architecture.md#react-19-idioms`,
      ).toBe(false);
    }
  });

  it("no source file uses a @mui/material or @mui/icons-material barrel import", () => {
    // Deep paths only — barrel imports blow up the popup bundle.
    // See docs/architecture.md#bundle-hygiene
    for (const file of srcFiles()) {
      const text = read(file);
      for (const pattern of [
        /from\s*['"]@mui\/material['"]/,
        /from\s*['"]@mui\/icons-material['"]/,
      ]) {
        expect(
          pattern.test(text),
          `${rel(file)} uses a MUI barrel import — use deep paths like \`@mui/material/Button\`. See docs/architecture.md#bundle-hygiene`,
        ).toBe(false);
      }
    }
  });
});

describe("architecture / Phase 1 boundaries", () => {
  it("@shared/ids exposes branded ID types via a single barrel", () => {
    const idsBarrel = path.join(repoRoot, "src/shared/ids/index.ts");
    expect(
      fs.existsSync(idsBarrel),
      "src/shared/ids/index.ts is missing — branded IDs are the kernel that every feature imports. See docs/architecture.md#shared-ids",
    ).toBe(true);
    const text = read(idsBarrel);
    expect(
      /Id\b/.test(text),
      "src/shared/ids/index.ts does not export any type with `Id` in its name — the barrel is the single import surface for branded IDs. See docs/architecture.md#shared-ids",
    ).toBe(true);
  });
});

describe("architecture / Phase 2 boundaries", () => {
  // Phase 6 transition: a small allowlist of libs/* files that still
  // import a feature *type*. Phase 8's per-feature contracts.ts split
  // lifts every entry here.
  const LIBS_FEATURE_TYPE_LEAKS = new Set([
    "src/libs/runtime-rpc/contracts/MessageRequestMap.ts",
  ]);

  it("libs/** does not import from features/, app/, or platform/", () => {
    // Libs are dep-light; if a lib needs a feature, it isn't a lib.
    // See docs/architecture.md#layer-ownership
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
        expect(
          re.test(text),
          `${rel(file)} crosses the libs boundary (${re}) — libs are standalone; if a lib needs a feature, it isn't a lib. See docs/architecture.md#layer-ownership`,
        ).toBe(false);
      }
    }
  });

  it("libs/event-bus exposes useTickQuery", () => {
    // The bus primitive is the seam Phase 9 may swap (TanStack / Zustand).
    // useTickQuery is the contract; other exports may evolve.
    const barrel = path.join(repoRoot, "src/libs/event-bus/index.ts");
    expect(
      fs.existsSync(barrel),
      "src/libs/event-bus/index.ts is missing — the tick primitive is a load-bearing seam. See docs/architecture.md#event-bus",
    ).toBe(true);
    expect(
      read(barrel).includes("useTickQuery"),
      "libs/event-bus does not export useTickQuery — feature hooks subscribe via this hook only. See docs/architecture.md#event-bus",
    ).toBe(true);
  });

  it("no caller references the deleted broadcast.ts / appDataChangeRepository.ts", () => {
    // Regression guard: these paths moved to libs/event-bus in Phase 2.
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
        `${rel(file)} references the removed broadcast module — use libs/event-bus instead. See docs/architecture.md#event-bus`,
      ).toBe(false);
    }
  });
});

describe("architecture / Phase 3 boundaries", () => {
  // Phase 6 transition: platform/db/instance.ts calls feature seed helpers.
  // Phase 8 lifts seeding to the SW entrypoint, after which this set drops to zero.
  const PLATFORM_FEATURE_LEAKS = new Set(["src/platform/db/instance.ts"]);

  it("platform/** does not import from features/ or app/", () => {
    // Platform is infrastructure adapters; features build on top.
    // See docs/architecture.md#layer-ownership
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
        expect(
          re.test(text),
          `${rel(file)} crosses the platform boundary (${re}) — platform is infrastructure, features depend on it (not the other way). See docs/architecture.md#layer-ownership`,
        ).toBe(false);
      }
    }
  });

  it("platform/db does not ship a grab-bag schema.ts", () => {
    // Schema is split per-table under schema/. See docs/architecture.md#db-schema
    expect(
      fs.existsSync(path.join(repoRoot, "src/platform/db/schema.ts")),
      "src/platform/db/schema.ts exists as a top-level file — tables must be split into per-file modules under schema/. See docs/architecture.md#db-schema",
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/platform/db/schema/index.ts")),
      "src/platform/db/schema/index.ts is missing — schema modules are barreled from here. See docs/architecture.md#db-schema",
    ).toBe(true);
  });

  it("no caller references the moved src/data/{db,datasources}/* paths", () => {
    // Regression guard: those folders moved to platform/ in Phase 3.
    const files = [
      ...listFiles(path.join(repoRoot, "src")),
      ...listFiles(path.join(repoRoot, "tests")),
    ].filter(isSource);
    const archTestDir = path.join(repoRoot, "tests/architecture");
    for (const file of files) {
      if (file.startsWith(archTestDir)) continue;
      expect(
        /from\s+['"][^'"]*\bdata\/(db|datasources)\//.test(read(file)),
        `${rel(file)} imports from the moved data/{db,datasources}/* paths — use @platform/* aliases. See docs/architecture.md#path-aliases`,
      ).toBe(false);
    }
  });
});

describe("architecture / Phase 4 boundaries", () => {
  it("design-system/atoms ships at least one a11y test", () => {
    // Atoms own accessibility primitives — focus, ARIA, keyboard.
    // See docs/architecture.md#a11y-ownership
    const atomsRoot = path.join(repoRoot, "src/design-system/atoms");
    if (!fs.existsSync(atomsRoot)) return;
    const a11yTests = listFiles(atomsRoot).filter((f) =>
      /\.a11y\.test\.tsx$/.test(f),
    );
    expect(
      a11yTests.length,
      "src/design-system/atoms/ has zero *.a11y.test.tsx — atoms own a11y primitives and must ship axe coverage. See docs/architecture.md#a11y-ownership",
    ).toBeGreaterThan(0);
  });

  it("design-system/theme exports createCogniTheme", () => {
    // The theme factory is the contract; the token folder shape can evolve.
    // See docs/architecture.md#theming
    const barrel = path.join(repoRoot, "src/design-system/theme/index.ts");
    expect(
      fs.existsSync(barrel),
      "src/design-system/theme/index.ts is missing — every surface theme flows through this factory. See docs/architecture.md#theming",
    ).toBe(true);
    expect(
      read(barrel).includes("createCogniTheme"),
      "design-system/theme does not export createCogniTheme — surface entrypoints call this. See docs/architecture.md#theming",
    ).toBe(true);
  });

  it("design-system/** does not import from features/, app/, or platform/", () => {
    // Design system is visual primitives only; no business logic.
    // See docs/architecture.md#layer-ownership
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
        expect(
          re.test(text),
          `${rel(file)} crosses the design-system boundary (${re}) — atoms are visual primitives with no business knowledge. See docs/architecture.md#layer-ownership`,
        ).toBe(false);
      }
    }
  });
});

describe("architecture / Phase 5 boundaries", () => {
  it("no grab-bag types.ts or views.ts at the domain root", () => {
    // One model per file. See docs/architecture.md#one-model-per-file
    for (const file of ["src/domain/types.ts", "src/domain/views.ts"]) {
      expect(
        fs.existsSync(path.join(repoRoot, file)),
        `${file} exists as a grab-bag — types and views are one-per-file under their owning feature (or domain/types/ during the transition). See docs/architecture.md#one-model-per-file`,
      ).toBe(false);
    }
  });

  it("runtime-rpc contracts is split per concern, not a single contracts.ts", () => {
    // Splitting contracts unlocks per-feature ownership in Phase 7-8.
    // See docs/architecture.md#messaging-contracts
    expect(
      fs.existsSync(path.join(repoRoot, "src/libs/runtime-rpc/contracts.ts")),
      "src/libs/runtime-rpc/contracts.ts exists as a top-level file — contract types must be split into the contracts/ folder. See docs/architecture.md#messaging-contracts",
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(repoRoot, "src/libs/runtime-rpc/contracts/index.ts"),
      ),
      "src/libs/runtime-rpc/contracts/index.ts is missing — the barrel re-exports each split contract. See docs/architecture.md#messaging-contracts",
    ).toBe(true);
  });

  it("files under domain/types/ and domain/views/ export at most 1 named symbol", () => {
    // One model per file. See docs/architecture.md#one-model-per-file
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
        const text = read(file);
        const exportCount = (
          text.match(
            /^export (interface|type|enum|const|function)\s+\w+/gm,
          ) ?? []
        ).length;
        expect(
          exportCount,
          `${rel(file)} exports ${exportCount} named symbols — files under domain/types/ and domain/views/ are one-model-per-file. See docs/architecture.md#one-model-per-file`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("architecture / Phase 6 boundaries", () => {
  it("features/settings has the four canonical feature layers", () => {
    // Every feature: data/ + domain/ + messaging/ + ui/.
    // See docs/architecture.md#feature-template
    const root = path.join(repoRoot, "src/features/settings");
    expect(fs.existsSync(root)).toBe(true);
    for (const layer of ["data", "domain", "messaging", "ui"]) {
      expect(
        fs.existsSync(path.join(root, layer)),
        `features/settings is missing the \`${layer}/\` layer — every feature ships data/ + domain/ + messaging/ + ui/. See docs/architecture.md#feature-template`,
      ).toBe(true);
    }
  });

  it("features/settings/data splits Repository (UI side) from DataSource (SW side)", () => {
    // Android-style split: Repository abstracts above the wire,
    // DataSource is the SW-side I/O. See docs/architecture.md#repository-vs-datasource
    const dataDir = path.join(repoRoot, "src/features/settings/data");
    expect(
      fs.existsSync(path.join(dataDir, "repository")),
      "features/settings/data/repository/ is missing — UI-side abstractions live here. See docs/architecture.md#repository-vs-datasource",
    ).toBe(true);
    expect(
      fs.existsSync(path.join(dataDir, "datasource")),
      "features/settings/data/datasource/ is missing — SW-side I/O lives here. See docs/architecture.md#repository-vs-datasource",
    ).toBe(true);
  });

  it("SettingsRepository is shipped as an interface + class implementing it", () => {
    // The interface is the contract a contributor codes against; the
    // class is the default impl. See docs/architecture.md#repositories
    const file = read(
      path.join(
        repoRoot,
        "src/features/settings/data/repository/SettingsRepository.ts",
      ),
    );
    expect(
      /export interface SettingsRepository/.test(file),
      "SettingsRepository.ts does not export an interface — Repositories ship as interface + class for DI-friendly swap. See docs/architecture.md#repositories",
    ).toBe(true);
    expect(
      /implements SettingsRepository/.test(file),
      "SettingsRepository.ts has no class implementing the interface — the default impl must be testable in isolation. See docs/architecture.md#repositories",
    ).toBe(true);
  });

  it("features without cross-repo composition do not ship a domain/usecases/ folder", () => {
    // Actions on a single aggregate live as Repository methods.
    // domain/usecases/ is reserved for actions that compose multiple repos.
    // See docs/architecture.md#usecases-vs-repository-methods
    const usecasesDir = path.join(
      repoRoot,
      "src/features/settings/domain/usecases",
    );
    expect(
      fs.existsSync(usecasesDir),
      "features/settings/domain/usecases/ exists — settings has no cross-repo composition, so every action belongs as a Repository method. See docs/architecture.md#usecases-vs-repository-methods",
    ).toBe(false);
  });

  it("files under domain/model/ export at most 1 named symbol (excluding identity ops)", () => {
    // One DomainModel per file. Identity ops (defaults, clone, merge,
    // equality) live alongside the type — those count as part of the
    // model. Boundary parsers live in model/utils/.
    // See docs/architecture.md#one-model-per-file
    const modelDir = path.join(
      repoRoot,
      "src/features/settings/domain/model",
    );
    if (!fs.existsSync(modelDir)) return;
    const files = fs
      .readdirSync(modelDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".ts") && e.name !== "index.ts")
      .map((e) => path.join(modelDir, e.name));
    for (const file of files) {
      const text = read(file);
      const typeExports = (
        text.match(/^export (interface|type|enum)\s+\w+/gm) ?? []
      ).length;
      expect(
        typeExports,
        `${rel(file)} exports ${typeExports} named types — one DomainModel per file. Helpers and parsers belong in model/utils/. See docs/architecture.md#one-model-per-file`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("the UserSettings boundary parser lives in model/utils/, not next to the model", () => {
    // Identity ops stay with the type; parsers over `unknown` live
    // under utils/. See docs/architecture.md#utils-convention
    const utilsParser = path.join(
      repoRoot,
      "src/features/settings/domain/model/utils/sanitizeStoredUserSettings.ts",
    );
    expect(
      fs.existsSync(utilsParser),
      "model/utils/sanitizeStoredUserSettings.ts is missing — boundary parsers (anything coercing `unknown` into a DomainModel) live under model/utils/. See docs/architecture.md#utils-convention",
    ).toBe(true);
  });

  it("features/settings exposes both UI (index.ts) and SW (server.ts) barrels", () => {
    // The two-barrel split keeps React out of the SW bundle.
    // See docs/architecture.md#two-barrel-split
    const root = path.join(repoRoot, "src/features/settings");
    expect(
      fs.existsSync(path.join(root, "index.ts")),
      "features/settings/index.ts is missing — UI surfaces import from here. See docs/architecture.md#two-barrel-split",
    ).toBe(true);
    expect(
      fs.existsSync(path.join(root, "server.ts")),
      "features/settings/server.ts is missing — SW entrypoint imports from here. See docs/architecture.md#two-barrel-split",
    ).toBe(true);
  });

  it("features/settings/data/ is consumed only via the index/server barrels", () => {
    // No external caller may deep-import the Repository or DataSource —
    // the barrel is the contract. See docs/architecture.md#feature-template
    for (const file of srcFiles()) {
      const relPath = rel(file);
      if (relPath.startsWith("src/features/settings/")) continue;
      expect(
        /from\s+['"]@features\/settings\/data\//.test(read(file)),
        `${relPath} imports features/settings/data/* directly — use @features/settings (UI) or @features/settings/server (SW). See docs/architecture.md#feature-template`,
      ).toBe(false);
    }
  });

  it("app/di/index.ts exposes DIProvider and useDI", () => {
    // The DI surface is the contract; internal file shape can evolve.
    // See docs/architecture.md#dependency-injection
    const barrel = path.join(repoRoot, "src/app/di/index.ts");
    expect(
      fs.existsSync(barrel),
      "src/app/di/index.ts is missing — every UI hook receives services through this barrel. See docs/architecture.md#dependency-injection",
    ).toBe(true);
    const text = read(barrel);
    for (const name of ["DIProvider", "useDI", "DIServices"]) {
      expect(
        text.includes(name),
        `src/app/di/index.ts does not export \`${name}\` — the DI surface (Provider, hook, services type) flows through this barrel. See docs/architecture.md#dependency-injection`,
      ).toBe(true);
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
