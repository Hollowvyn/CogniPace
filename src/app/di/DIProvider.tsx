import { DIContext } from "./DIContext";

import type { DIServices } from "./DIServices";
import type { ReactNode } from "react";

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
