import type { OverlayHeaderStatusCard } from "./OverlayHeaderStatusCard";

export type OverlayHeaderStatus =
  | {
      cards: OverlayHeaderStatusCard[];
      kind: "empty";
    }
  | {
      cards: OverlayHeaderStatusCard[];
      kind: "history";
    };
