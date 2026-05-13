import { createContext, use } from "react";

import type { SettingsRepository } from "@features/settings";
import type { ReactNode } from "react";

/** The DI surface every UI hook receives via `useDI()`. Phase 7 features
 *  add their Repositories here as they migrate. */
export interface DIServices {
  readonly settingsRepository: SettingsRepository;
}

/** Null when no provider is in the tree; `useDI()` throws in that case
 *  so misconfigured trees fail loudly rather than fall back to a global. */
const DIContext = createContext<DIServices | null>(null);

export function DIProvider(props: {
  readonly services: DIServices;
  readonly children?: ReactNode;
}) {
  return (
    <DIContext.Provider value={props.services}>
      {props.children}
    </DIContext.Provider>
  );
}

export function useDI(): DIServices {
  const services = use(DIContext);
  if (!services) {
    throw new Error("useDI: no <DIProvider> in the tree.");
  }
  return services;
}
