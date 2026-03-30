/** Overlay entrypoint that mounts the React overlay into a shadow-root host on LeetCode pages. */
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { createElement } from "react";
import { createRoot, Root } from "react-dom/client";

import { AppProviders } from "../ui/providers";
import { OverlayRoot } from "../ui/screens/overlay/OverlayRoot";

const OVERLAY_ID = "lcsr-overlay-root";

interface OverlayMount {
  cache: ReturnType<typeof createCache>;
  root: Root;
}

let overlayMount: OverlayMount | null = null;

function createOverlayMount(): OverlayMount {
  const existingHost = document.getElementById(OVERLAY_ID);
  if (existingHost?.shadowRoot) {
    const mountNode = existingHost.shadowRoot.querySelector("[data-overlay-mount]");
    const styleContainer = existingHost.shadowRoot.querySelector(
      "[data-overlay-styles]"
    );

    if (mountNode instanceof HTMLDivElement && styleContainer instanceof HTMLElement) {
      return {
        cache: createCache({
          key: "lcsr-overlay",
          container: styleContainer,
        }),
        root: createRoot(mountNode),
      };
    }
  }

  const host = document.createElement("div");
  host.id = OVERLAY_ID;
  host.style.position = "fixed";
  host.style.right = "20px";
  host.style.bottom = "10px";
  host.style.zIndex = "2147483647";
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const styleContainer = document.createElement("div");
  styleContainer.dataset.overlayStyles = "true";
  const mountNode = document.createElement("div");
  mountNode.dataset.overlayMount = "true";
  shadowRoot.appendChild(styleContainer);
  shadowRoot.appendChild(mountNode);

  return {
    cache: createCache({
      key: "lcsr-overlay",
      container: styleContainer,
    }),
    root: createRoot(mountNode),
  };
}

function ensureOverlayMount(): OverlayMount {
  if (!overlayMount) {
    overlayMount = createOverlayMount();
  }

  return overlayMount;
}

const mount = ensureOverlayMount();
mount.root.render(
  createElement(
    CacheProvider,
    { value: mount.cache },
    createElement(
      AppProviders,
      null,
      createElement(OverlayRoot, {
        documentRef: document,
        windowRef: window,
      })
    )
  )
);
