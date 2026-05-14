/** Dashboard entrypoint that mounts the dashboard screen into the extension document. */
import { AppProviders } from "@app/providers";
import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";

import { DashboardShell } from "../app/dashboard/DashboardShell";

const mountNode = document.getElementById("app-shell");
if (!mountNode) {
  throw new Error("Missing dashboard root.");
}

createRoot(mountNode).render(
  createElement(
    StrictMode,
    null,
    createElement(AppProviders, { surface: "dashboard" }, createElement(DashboardShell))
  )
);
