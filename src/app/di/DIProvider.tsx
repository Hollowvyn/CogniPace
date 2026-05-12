
import { DIContext } from "./DIContext";

import type { DIServices } from "./DIServices";
import type { ReactNode } from "react";

/**
 * Wraps a subtree with a DI surface. Every Hook in the subtree can
 * call `useDI()` to receive the same `services` reference.
 *
 * Production code passes the default services from `AppProviders`;
 * tests pass a `services` value built from fakes / spies.
 */
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
