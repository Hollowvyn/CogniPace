import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import TableContainer from "@mui/material/TableContainer";
import { ReactNode } from "react";

import { cognipaceTokens } from "../../theme";

export function SurfaceTableContainer(props: {
  children: ReactNode;
  sx?: object;
}) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: alpha(cognipaceTokens.backgroundAlt, 0.86),
        border: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.38)}`,
        borderRadius: 2,
        boxSizing: "border-box",
        display: "block",
        boxShadow: "0 22px 54px rgba(0, 0, 0, 0.28)",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "auto",
        width: "100%",
        "& .MuiTableCell-root": {
          verticalAlign: "top",
        },
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </TableContainer>
  );
}
