/** Popup entrypoint that mounts the popup screen into the extension document. */
import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "../ui/providers";
import { PopupApp } from "../ui/screens/popup/PopupApp";

const mountNode = document.getElementById("popup-root");
if (!mountNode) {
  throw new Error("Missing popup root.");
}

createRoot(mountNode).render(
  createElement(
    StrictMode,
    null,
    createElement(AppProviders, null, createElement(PopupApp))
  )
);
