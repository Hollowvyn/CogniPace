/**
 * UI-side view types for the settings screen.
 *
 * Layer note: per the "model/ at every layer" convention, view types
 * (props shapes, draft helpers, sealed-state classes) live in a
 * `model/` folder next to the screen they belong to. These are NOT
 * DomainModels — they describe how the UI projects the domain.
 */
export type { SettingsUpdate } from "./SettingsUpdate";
export {
  createGoalTextDraft,
  minutesToMs,
  msToMinutes,
  parseGoalMinutes,
  resolveGoalTextDraft,
} from "./GoalTextDraft";
export type { GoalTextDraft } from "./GoalTextDraft";
