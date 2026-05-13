import { use } from "react";

import { DIContext } from "./DIContext";

import type { DIServices } from "./DIServices";

/** Throws when no <DIProvider> is in the tree — a misconfigured tree
 *  is a bug, not a fallback case. */
export function useDI(): DIServices {
  const services = use(DIContext);
  if (!services) {
    throw new Error("useDI: no <DIProvider> in the tree.");
  }
  return services;
}
