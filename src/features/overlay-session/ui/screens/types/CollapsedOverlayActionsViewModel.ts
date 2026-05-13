export interface CollapsedOverlayActionsViewModel {
  canFail: boolean;
  onHide: () => void;
  canSubmit: boolean;
  onExpand: () => void;
  onFail: () => void;
  onSubmit: () => void;
}
