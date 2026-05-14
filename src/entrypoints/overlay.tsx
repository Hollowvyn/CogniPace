/** Overlay entrypoint — mounts the overlay shell into the shadow-root
 * host on LeetCode pages. Runtime host creation stays in the
 * entrypoint bootstrap; the React shell lives in `src/app/overlay/`. */
import { AppProviders } from "@app/bootstrap";
import { CacheProvider } from "@emotion/react";
import { createElement } from "react";

import { OverlayShell } from "../app/overlay/OverlayShell";

import { createOverlayHost } from "./overlay/createOverlayHost";

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
