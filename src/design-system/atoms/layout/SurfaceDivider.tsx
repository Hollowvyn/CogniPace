import { cognipaceTokens } from "@design-system/theme";
import Divider from "@mui/material/Divider";
import { alpha } from "@mui/material/styles";


export function SurfaceDivider(props: { sx?: object }) {
  return (
    <Divider
      sx={{
        borderColor: alpha(cognipaceTokens.outlineStrong, 0.2),
        ...(props.sx ?? {}),
      }}
    />
  );
}
