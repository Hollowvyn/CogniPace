import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "..");

function listFiles(root: string): string[] {
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

describe("architecture layout", () => {
  it("keeps canonical entrypoints and screen roots", () => {
    expect(
      fs.existsSync(path.join(repoRoot, "src/entrypoints/popup.tsx"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/entrypoints/dashboard.tsx"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/entrypoints/overlay.tsx"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/screens/popup/PopupApp.tsx"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/screens/dashboard/DashboardApp.tsx"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/screens/overlay/OverlayRoot.tsx"))
    ).toBe(true);

    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/popup/PopupApp.tsx"))
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/dashboard/DashboardApp.tsx"))
    ).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, "src/content.ts"))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, "src/background.ts"))).toBe(false);
  });

  it("keeps the ui layer free of runtime transport and storage imports", () => {
    const uiFiles = listFiles(path.join(repoRoot, "src/ui")).filter((file) =>
      /\.(ts|tsx)$/.test(file)
    );

    for (const file of uiFiles) {
      const text = read(file);
      expect(text).not.toMatch(/\bsendMessage\s*\(/);
      expect(text).not.toMatch(/extension\/runtime\/client/);
      expect(text).not.toMatch(/chrome\.storage/);
      expect(text).not.toMatch(/datasources\/chrome\/storage/);
    }
  });

  it("keeps the domain layer free of react and browser dependencies", () => {
    const domainFiles = listFiles(path.join(repoRoot, "src/domain")).filter((file) =>
      /\.(ts|tsx)$/.test(file)
    );

    for (const file of domainFiles) {
      const text = read(file);
      expect(text).not.toMatch(/from "react"|from 'react'/);
      expect(text).not.toMatch(/\bchrome\./);
      expect(text).not.toMatch(/\bdocument\./);
      expect(text).not.toMatch(/\bwindow\./);
    }
  });

  it("routes runtime and storage access through repositories and datasources", () => {
    const appDataRepository = read(
      path.join(repoRoot, "src/data/repositories/appDataRepository.ts")
    );
    const storageDatasource = read(
      path.join(repoRoot, "src/data/datasources/chrome/storage.ts")
    );
    const appShellRepository = read(
      path.join(repoRoot, "src/data/repositories/appShellRepository.ts")
    );

    expect(appDataRepository).toContain("datasources/chrome/storage");
    expect(storageDatasource).toContain("chrome.storage.local");
    expect(appShellRepository).toContain("extension/runtime/client");
  });

  it("uses explicit overlay variants instead of a shared boolean mode prop", () => {
    const overlayPanel = read(
      path.join(repoRoot, "src/ui/screens/overlay/OverlayPanel.tsx")
    );
    const overlayTypes = read(
      path.join(repoRoot, "src/ui/screens/overlay/overlayPanel.types.ts")
    );

    expect(overlayTypes).toContain('variant: "collapsed"');
    expect(overlayTypes).toContain('variant: "expanded"');
    expect(overlayTypes).not.toContain("collapsed: boolean");
    expect(overlayPanel).toContain('renderModel.variant === "collapsed"');
  });
});
