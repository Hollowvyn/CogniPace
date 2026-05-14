/** Imperative host setup for the overlay surface. Creates (or reuses)
 *  the shadow-root host, the emotion style container, and the React
 *  mount node. Lives at the surface layer so the entrypoint stays a
 *  thin mount file. */
import createCache from "@emotion/cache";
import { createRoot, Root } from "react-dom/client";

const OVERLAY_ID = "lcsr-overlay-root";
const STYLE_CONTAINER_KEY = "lcsr-overlay";

export interface OverlayHost {
  cache: ReturnType<typeof createCache>;
  portalContainer: HTMLElement;
  root: Root;
}

export function createOverlayHost(): OverlayHost {
  const existingHost = document.getElementById(OVERLAY_ID);
  if (existingHost?.shadowRoot) {
    const mountNode = existingHost.shadowRoot.querySelector(
      "[data-overlay-mount]",
    );
    const styleContainer = existingHost.shadowRoot.querySelector(
      "[data-overlay-styles]",
    );

    if (
      mountNode instanceof HTMLDivElement &&
      styleContainer instanceof HTMLElement
    ) {
      return {
        cache: createCache({
          key: STYLE_CONTAINER_KEY,
          container: styleContainer,
        }),
        portalContainer: mountNode,
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
      key: STYLE_CONTAINER_KEY,
      container: styleContainer,
    }),
    portalContainer: mountNode,
    root: createRoot(mountNode),
  };
}
