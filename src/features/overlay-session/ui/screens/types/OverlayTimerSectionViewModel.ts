export interface OverlayTimerSectionViewModel {
  canPause: boolean;
  canReset: boolean;
  canStart: boolean;
  display: string;
  isRunning: boolean;
  onPause: () => void;
  onReset: () => void;
  onStart: () => void;
  startLabel: string;
  targetDisplay?: string;
}
