import { createContext } from "react";

import type { DIServices } from "./DIServices";

/** Null when no provider is in the tree; `useDI()` throws in that case. */
export const DIContext = createContext<DIServices | null>(null);
