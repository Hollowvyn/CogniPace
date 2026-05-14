import type { OverlayHeaderStatus } from "./OverlayHeaderStatus";
import type { Difficulty } from "@features/problems";


export interface OverlayHeaderSectionViewModel {
  difficulty: Difficulty;
  onCollapse: () => void;
  onHide: () => void;
  onOpenSettings: () => void;
  sessionLabel: string;
  status: OverlayHeaderStatus;
  title: string;
}
