import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../..");

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
      fs.existsSync(path.join(repoRoot, "src/app/popup/PopupShell.tsx"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/app/dashboard/DashboardShell.tsx"))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(repoRoot, "src/app/dashboard/navigation/routes.ts")
      )
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/app/overlay/OverlayShell.tsx"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, "src/app/overlay/createOverlayHost.ts"))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          repoRoot,
          "src/features/overlay-session/ui/hooks/useOverlayPanelVM.ts",
        ),
      )
    ).toBe(true);

    // OverlayRoot.tsx (the pre-Phase-A overlay screen) is gone.
    expect(
      fs.existsSync(
        path.join(repoRoot, "src/features/overlay-session/ui/screens/OverlayRoot.tsx")
      )
    ).toBe(false);

    // Old locations from the v6 layout are gone.
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/screens/popup/PopupApp.tsx"))
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/popup/PopupApp.tsx"))
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/screens/dashboard/DashboardApp.tsx"))
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/dashboard/DashboardApp.tsx"))
    ).toBe(false);
    expect(
      fs.existsSync(path.join(repoRoot, "src/ui/navigation/dashboardRoutes.ts"))
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
    const domainFiles = listFiles(path.join(repoRoot, "src/domain")).filter(
      (file) => /\.(ts|tsx)$/.test(file)
    );

    for (const file of domainFiles) {
      const text = read(file);
      expect(text).not.toMatch(/from "react"|from 'react'/);
      expect(text).not.toMatch(/\bchrome\./);
      expect(text).not.toMatch(/\bdocument\./);
      expect(text).not.toMatch(/\bwindow\./);
    }
  });

  it("routes runtime and storage access through repositories and platform adapters", () => {
    const appDataRepository = read(
      path.join(repoRoot, "src/data/repositories/appDataRepository.ts")
    );
    const storageDatasource = read(
      path.join(repoRoot, "src/platform/chrome/storage.ts")
    );
    const appShellRepository = read(
      path.join(
        repoRoot,
        "src/features/app-shell/data/repository/AppShellRepository.ts",
      ),
    );

    expect(appDataRepository).toContain("@platform/chrome/storage");
    expect(storageDatasource).toContain("chrome.storage.local");
    // Repositories now reach the SW via the typed proxy exposed by @app/api,
    // not the legacy @libs/runtime-rpc/client `sendMessage` wrapper.
    expect(appShellRepository).toContain("@app/api");
  });

  it("uses explicit overlay variants instead of a shared boolean mode prop", () => {
    const overlayPanel = read(
      path.join(repoRoot, "src/features/overlay-session/ui/screens/OverlayPanel.tsx")
    );
    const overlayRenderModel = read(
      path.join(
        repoRoot,
        "src/features/overlay-session/ui/screens/types/OverlayRenderModel.ts",
      ),
    );

    expect(overlayRenderModel).toContain('variant: "collapsed"');
    expect(overlayRenderModel).toContain('variant: "expanded"');
    expect(overlayRenderModel).not.toContain("collapsed: boolean");
    expect(overlayPanel).toContain('renderModel.variant === "collapsed"');
  });
});
