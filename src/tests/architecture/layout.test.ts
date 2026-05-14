import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../..");

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

  // The old "ui layer free of runtime transport" and "domain layer free
  // of react/browser" checks targeted `src/ui/` and `src/domain/`, both
  // being retired during the legacy-dir cleanup. The feature-sliced
  // equivalents live in `featureBoundaries.test.ts` (no chrome / @platform/db
  // in features/<x>/domain/, no @platform/db in features/<x>/ui/). The
  // "appDataRepository routes through @platform/chrome/storage" check is
  // dropped along with that legacy file.

  it("storage / chrome / DB side-effects flow through @platform wrappers", () => {
    const storageAdapter = read(
      path.join(repoRoot, "src/platform/chrome/storage.ts")
    );
    const appShellRepository = read(
      path.join(
        repoRoot,
        "src/features/app-shell/data/repository/AppShellRepository.ts",
      ),
    );
    expect(storageAdapter).toContain("chrome.storage.local");
    // UI repositories reach the SW via the typed proxy at @app/api, not
    // raw chrome.runtime.sendMessage.
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
