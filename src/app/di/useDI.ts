import { use } from "react";

import { DIContext } from "./DIContext";

import type { DIServices } from "./DIServices";

/**
 * Hook accessor for the DI surface. Throws if no `DIProvider` is in
 * the tree — that's a configuration bug, not a runtime fallback case.
 *
 * Plan §"React idioms (v19)": uses `use(Context)` instead of
 * `useContext`. The plan's "UI service access (DI)" row pins this as
 * the canonical pattern.
 */
export function useDI(): DIServices {
  const services = use(DIContext);
  if (!services) {
    throw new Error(
      "useDI: no <DIProvider> in the tree. Wrap the surface entrypoint in <AppProviders> (which mounts DIProvider) or in your own <DIProvider services={…}>.",
    );
  }
  return services;
}
