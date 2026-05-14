import { ReactNode } from "react";

import { InsetSurface } from "../layout/InsetSurface";
import { Tone } from "../tone";

export function StatusSurface(props: {
  children: ReactNode;
  tone?: Tone;
  sx?: object;
}) {
  return (
    <InsetSurface
      sx={{
        boxShadow: "none",
        ...(props.sx ?? {}),
      }}
      tone={props.tone}
    >
      {props.children}
    </InsetSurface>
  );
}
