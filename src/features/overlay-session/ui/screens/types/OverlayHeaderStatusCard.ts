import type { OverlayHeaderStatusTone } from "./OverlayHeaderStatusTone";

export interface OverlayHeaderStatusCard {
  emphasized?: boolean;
  label: string;
  primary: string;
  secondary: string;
  tone: OverlayHeaderStatusTone;
}
