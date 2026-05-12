import { createContext } from "react";

import type { DIServices } from "./DIServices";

/**
 * React context carrying the DI surface. Null when no provider is in
 * the tree — `useDI()` throws in that case so misconfigured trees
 * fail loudly rather than silently fall through to a global singleton.
 */
export const DIContext = createContext<DIServices | null>(null);
