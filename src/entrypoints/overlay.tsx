/** Overlay entrypoint — mounts the overlay shell into the shadow-root
 *  host on LeetCode pages. Shadow-root + emotion cache setup lives in
 *  `src/app/overlay/createOverlayHost.ts`; the React shell lives in
 *  `src/app/overlay/OverlayShell.tsx`. */
import { CacheProvider } from "@emotion/react";
import { createElement } from "react";

import { createOverlayHost } from "../app/overlay/createOverlayHost";
import { OverlayShell } from "../app/overlay/OverlayShell";
import { AppProviders } from "../ui/providers";

const host = createOverlayHost();
host.root.render(
  createElement(
    CacheProvider,
    { value: host.cache },
    createElement(
      AppProviders,
      { portalContainer: host.portalContainer, surface: "overlay" },
      createElement(OverlayShell, {
        documentRef: document,
        windowRef: window,
      }),
    ),
  ),
);
