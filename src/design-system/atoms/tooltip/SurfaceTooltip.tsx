import Tooltip, { TooltipProps } from "@mui/material/Tooltip";

export function SurfaceTooltip(props: TooltipProps) {
  return (
    <Tooltip
      arrow
      enterDelay={250}
      enterNextDelay={150}
      placement={props.placement ?? "top"}
      {...props}
    />
  );
}
