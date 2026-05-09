import { ReactNode } from "react";

import { Tone } from "../../presentation/studyState";
import { InsetSurface } from "../layout/InsetSurface";

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
