export interface ExpandedOverlayActionsViewModel {
  canFail: boolean;
  canRestart: boolean;
  canSubmit: boolean;
  canUpdate: boolean;
  onFail: () => void;
  onRestart: () => void;
  onSubmit: () => void;
  onUpdate: () => void;
}
