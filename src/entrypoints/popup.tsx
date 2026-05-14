/** Popup entrypoint that mounts the popup screen into the extension document. */
import { AppProviders } from "@app/providers";
import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";

import { PopupShell } from "../app/popup/PopupShell";

const mountNode = document.getElementById("popup-root");
if (!mountNode) {
  throw new Error("Missing popup root.");
}

createRoot(mountNode).render(
  createElement(
    StrictMode,
    null,
    createElement(AppProviders, { surface: "popup" }, createElement(PopupShell))
  )
);
