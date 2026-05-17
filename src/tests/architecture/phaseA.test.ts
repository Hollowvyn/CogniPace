/**
 * Phase A architecture tests — the rules that landed when surface
 * shells moved to src/app/<surface>/ and capability features adopted
 * explicit UI state boundaries through VM hooks or feature stores.
 *
 * Each test name IS the rule. Per-assertion messages carry only the
 * file path of the violation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../../..");

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
  return /\.(ts|tsx)$/.test(file) && !/\.d\.ts$/.test(file) && !/\/tests\//.test(file) && !/\.test\.(ts|tsx)$/.test(file);
}

function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

function rel(absolute: string): string {
  return path.relative(repoRoot, absolute);
}

function hasLocalReactState(text: string): boolean {
  return /\b(useEffect|useMemo|useReducer|useState|useStore)\b/.test(text);
}

describe("architecture / Phase A — surface shells + UI state boundary", () => {
  it("stateful capability-feature *Screen.tsx delegates state to a VM hook or UI store", () => {
    const featuresRoot = path.join(repoRoot, "src/features");
    if (!fs.existsSync(featuresRoot)) return;

    const screenFiles = listFiles(featuresRoot).filter(
      (file) => /\/ui\/screens\/.*Screen\.tsx$/.test(file),
    );
    expect(screenFiles.length, "no *Screen.tsx files found").toBeGreaterThan(0);

    for (const screenFile of screenFiles) {
      const featureRoot = screenFile.slice(
        0,
        screenFile.indexOf("/ui/screens/"),
      );
      const screenName = path.basename(screenFile, ".tsx");
      const baseName = screenName.replace(/Screen$/, "");
      const expectedVmFile = path.join(
        featureRoot,
        "ui",
        "hooks",
        `use${baseName}VM.ts`,
      );
      const expectedStoreDir = path.join(featureRoot, "ui", "store");
      if (!hasLocalReactState(read(screenFile))) {
        continue;
      }
      expect(
        fs.existsSync(expectedVmFile) || fs.existsSync(expectedStoreDir),
        `${rel(screenFile)} → expected sibling ${rel(expectedVmFile)} or ${rel(expectedStoreDir)}`,
      ).toBe(true);
    }
  });

  it("each surface shell ships a sibling use*ShellVM.ts", () => {
    const popupVm = path.join(repoRoot, "src/app/popup/usePopupShellVM.ts");
    const dashboardVm = path.join(
      repoRoot,
      "src/app/dashboard/useDashboardShellVM.ts",
    );
    const overlayVm = path.join(
      repoRoot,
      "src/app/overlay/useOverlayShellVM.ts",
    );
    expect(fs.existsSync(popupVm), rel(popupVm)).toBe(true);
    expect(fs.existsSync(dashboardVm), rel(dashboardVm)).toBe(true);
    expect(fs.existsSync(overlayVm), rel(overlayVm)).toBe(true);
  });

  it("src/app/<surface>/ never imports @platform/db, drizzle-orm, or a feature's data/datasource/", () => {
    const surfacesRoot = path.join(repoRoot, "src/app");
    if (!fs.existsSync(surfacesRoot)) return;
    // app/bootstrap is shared composition; it legitimately references
    // repositories for DI wiring. Surface folders are popup/,
    // dashboard/, overlay/, env/.
    const surfaceDirs = fs
      .readdirSync(surfacesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "bootstrap")
      .map((entry) => path.join(surfacesRoot, entry.name));

    for (const dir of surfaceDirs) {
      for (const file of listFiles(dir).filter(isSource)) {
        const text = read(file);
        for (const re of [
          /from\s+['"]@platform\/db['"]/,
          /from\s+['"]drizzle-orm['"]/,
          /from\s+['"]@features\/[^'"/]+\/data\/datasource\//,
          /\bsrc\/platform\/db\b/,
          /\bsrc\/features\/[^/'"]+\/data\/datasource\//,
        ]) {
          expect(re.test(text), `${rel(file)} :: ${re}`).toBe(false);
        }
      }
    }
  });

  it("src/features/<x>/ui/ never imports src/app/<surface>/ files", () => {
    // Capability features know nothing about which surface mounts them.
    // app/bootstrap is the shared composition barrel and *is* allowed
    // (features call useDI() from there).
    const featuresRoot = path.join(repoRoot, "src/features");
    if (!fs.existsSync(featuresRoot)) return;
    for (const file of listFiles(featuresRoot).filter(isSource)) {
      if (!/\/ui\//.test(file)) continue;
      const text = read(file);
      for (const re of [
        /from\s+['"]@app\/(popup|dashboard|overlay|env)\//,
        /\bsrc\/app\/(popup|dashboard|overlay|env)\//,
      ]) {
        expect(re.test(text), `${rel(file)} :: ${re}`).toBe(false);
      }
    }
  });

  it("useDI() is called only inside ui/hooks/ or app/<surface>/ VM hooks", () => {
    // Components and screens read intents off the Model, not the DI
    // container. Surface VMs in src/app/<surface>/use*ShellVM.ts and
    // feature VMs in src/features/<x>/ui/hooks/use*.ts are the allowed
    // callers (plus src/app/bootstrap itself, which defines useDI).
    const candidates = listFiles(path.join(repoRoot, "src")).filter(isSource);
    for (const file of candidates) {
      const relPath = rel(file);
      const callsUseDI = /\buseDI\s*\(/.test(read(file));
      if (!callsUseDI) continue;
      const isAllowed =
        relPath.startsWith("src/app/bootstrap/") ||
        /\/ui\/hooks\/use[^/]+\.ts$/.test(relPath) ||
        /\/app\/[^/]+\/use[^/]+VM\.ts$/.test(relPath);
      expect(isAllowed, `${relPath} :: useDI() called outside a VM hook`).toBe(
        true,
      );
    }
  });

  it("each entrypoint imports exactly one shell from src/app/<surface>/", () => {
    const entrypointPairs: Array<[string, string]> = [
      ["src/entrypoints/popup.tsx", "@app/popup/PopupShell|../app/popup/PopupShell"],
      [
        "src/entrypoints/dashboard.tsx",
        "@app/dashboard/DashboardShell|../app/dashboard/DashboardShell",
      ],
      [
        "src/entrypoints/overlay.tsx",
        "@app/overlay/OverlayShell|../app/overlay/OverlayShell",
      ],
    ];
    for (const [entrypoint, shellHint] of entrypointPairs) {
      const file = path.join(repoRoot, entrypoint);
      expect(fs.existsSync(file), entrypoint).toBe(true);
      const text = read(file);
      const pattern = new RegExp(`from\\s+['"](${shellHint})['"]`);
      expect(pattern.test(text), `${entrypoint} :: imports ${shellHint}`).toBe(
        true,
      );
    }
  });

  it("product entrypoints do not import features, api proxies, or repositories directly", () => {
    const productEntrypoints = [
      "src/entrypoints/popup.tsx",
      "src/entrypoints/dashboard.tsx",
      "src/entrypoints/overlay.tsx",
    ];
    for (const relPath of productEntrypoints) {
      const file = path.join(repoRoot, relPath);
      expect(fs.existsSync(file), relPath).toBe(true);
      const text = read(file);
      for (const re of [
        /from\s+['"]@features\//,
        /from\s+['"]@app\/api['"]/,
        /from\s+['"][^'"]*\/data\/repository\//,
        /from\s+['"][^'"]*\/messaging\/handlers['"]/,
      ]) {
        expect(re.test(text), `${relPath} :: ${re}`).toBe(false);
      }
    }
  });

  it("src/ui/screens/ has been retired — screens live under a surface or a feature", () => {
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/screens")),
      "src/ui/screens",
    ).toBe(false);
  });

  it("src/ui/navigation/ has been retired — surface routing lives under app/<surface>/navigation/", () => {
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/navigation")),
      "src/ui/navigation",
    ).toBe(false);
  });
});
