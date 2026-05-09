import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Paper from "@mui/material/Paper";
import {alpha} from "@mui/material/styles";
import {type PointerEvent, useRef, useState} from "react";

import {BrandMark, SurfaceTooltip} from "../../../components";
import {cognipaceTokens} from "../../../theme";
import {DockedOverlayViewModel} from "../overlayPanel.types";

const DOCK_BOTTOM_OFFSET_PX = 10;
const DOCK_MARGIN_TOP_PX = 16;
const DRAG_THRESHOLD_PX = 5;
const TOOLTIP_AUTO_HIDE_MS = 2400;

function clampDockOffset(offsetY: number, dockHeight: number): number {
  const viewportHeight = globalThis.window?.innerHeight ?? 800;
  const maxUpwardOffset = Math.min(
    0,
    DOCK_MARGIN_TOP_PX + dockHeight + DOCK_BOTTOM_OFFSET_PX - viewportHeight
  );

  return Math.min(0, Math.max(maxUpwardOffset, offsetY));
}

function pointerClientY(event: PointerEvent<HTMLElement>): number | null {
  return Number.isFinite(event.clientY) ? event.clientY : null;
}

function isActivePointer(
  activePointerId: number | null,
  event: PointerEvent<HTMLElement>
): boolean {
  return (
    activePointerId !== null &&
    (event.pointerId === undefined || event.pointerId === activePointerId)
  );
}

export function DockedOverlayPanel(
  props: {
    model: DockedOverlayViewModel;
  }
) {
  const activePointerIdRef = useRef<number | null>(null);
  const dockOffsetRef = useRef(0);
  const dragStartYRef = useRef(0);
  const lastPointerYRef = useRef(0);
  const suppressClickRef = useRef(false);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const wasDraggedRef = useRef(false);
  const [dockOffsetY, setDockOffsetY] = useState(0);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const closeTooltip = () => {
    if (tooltipTimeoutRef.current !== null) {
      globalThis.window?.clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setTooltipOpen(false);
  };

  const openTooltip = () => {
    if (tooltipTimeoutRef.current !== null) {
      globalThis.window?.clearTimeout(tooltipTimeoutRef.current);
    }
    setTooltipOpen(true);
    tooltipTimeoutRef.current =
      globalThis.window?.setTimeout(closeTooltip, TOOLTIP_AUTO_HIDE_MS) ?? null;
  };

  return (
    <Paper
      data-testid="docked-overlay-panel"
      style={{transform: `translateY(${dockOffsetY}px)`}}
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: "18px 0 0 18px",
        overflow: "hidden",
        width: 48,
      }}
    >
      <SurfaceTooltip
        onClose={closeTooltip}
        onOpen={openTooltip}
        open={tooltipOpen}
        placement="left"
        title="Show overlay"
      >
        <ButtonBase
          aria-label="Show overlay"
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }

            props.model.onRestore();
          }}
          onPointerCancel={() => {
            activePointerIdRef.current = null;
            suppressClickRef.current = wasDraggedRef.current;
            wasDraggedRef.current = false;
          }}
          onPointerDown={(event) => {
            closeTooltip();
            const clientY = pointerClientY(event);
            if (clientY === null) {
              return;
            }

            activePointerIdRef.current = event.pointerId ?? 1;
            dragStartYRef.current = clientY;
            lastPointerYRef.current = clientY;
            wasDraggedRef.current = false;
            if (event.pointerId !== undefined) {
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }
          }}
          onPointerMove={(event) => {
            if (!isActivePointer(activePointerIdRef.current, event)) {
              return;
            }

            const clientY = pointerClientY(event);
            if (clientY === null) {
              return;
            }

            const totalDeltaY = clientY - dragStartYRef.current;
            if (!wasDraggedRef.current && Math.abs(totalDeltaY) < DRAG_THRESHOLD_PX) {
              return;
            }

            wasDraggedRef.current = true;
            suppressClickRef.current = true;
            const stepDeltaY = clientY - lastPointerYRef.current;
            lastPointerYRef.current = clientY;

            if (stepDeltaY === 0) {
              return;
            }

            const nextOffset = clampDockOffset(
              dockOffsetRef.current + stepDeltaY,
              event.currentTarget.getBoundingClientRect().height
            );
            dockOffsetRef.current = nextOffset;
            setDockOffsetY(nextOffset);
          }}
          onPointerUp={(event) => {
            if (!isActivePointer(activePointerIdRef.current, event)) {
              return;
            }

            if (event.pointerId !== undefined) {
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }
            activePointerIdRef.current = null;
            suppressClickRef.current = wasDraggedRef.current;
            wasDraggedRef.current = false;
          }}
          sx={{
            alignItems: "center",
            backgroundColor: alpha(cognipaceTokens.backgroundAlt, 0.84),
            cursor: "default",
            display: "flex",
            justifyContent: "center",
            minHeight: 72,
            touchAction: "none",
            transition: "background-color 160ms ease",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
            width: "100%",
            "&:hover": {
              backgroundColor: alpha(cognipaceTokens.accent, 0.08),
            },
            "&:focus-visible": {
              backgroundColor: alpha(cognipaceTokens.accent, 0.12),
              outline: `2px solid ${alpha(cognipaceTokens.info, 0.72)}`,
              outlineOffset: -2,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              transform: "scale(0.88)",
            }}
          >
            <BrandMark/>
          </Box>
        </ButtonBase>
      </SurfaceTooltip>
    </Paper>
  );
}
