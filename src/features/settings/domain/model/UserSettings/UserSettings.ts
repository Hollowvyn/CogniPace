
import type { ExperimentalSettings } from "./ExperimentalSettings";
import type { MemoryReviewSettings } from "./MemoryReviewSettings";
import type { NotificationSettings } from "./NotificationSettings";
import type { QuestionFilterSettings } from "./QuestionFilterSettings";
import type { StudyMode } from "./StudyMode";
import type { TimingSettings } from "./TimingSettings";
import type { ActiveFocus } from "../../../../../domain/active-focus/model";

/**
 * The aggregate DomainModel for user-tunable settings.
 *
 * Layer note (Android-style):
 *   - Entity (persistence) = the `settings_kv` row (key/value/updated_at)
 *     in `platform/db/schema/settingsKv.ts`. The DataSource serializes
 *     this aggregate to/from JSON in `value`.
 *   - DomainModel = this file. Business shape; what every layer above
 *     `data/` consumes.
 *   - UiModel = (not separate for settings — the View renders this
 *     DomainModel directly). For features whose UI needs a projected
 *     shape (resolved labels, formatted values), define a sibling
 *     `<Name>View.ts` under `ui/model/`.
 */
export interface UserSettings {
  dailyQuestionGoal: number;
  studyMode: StudyMode;
  /** @deprecated v6 — replaced by `tracks.enabled` (SQLite). Kept on the
   * settings shape for legacy import compat; new code consults the
   * tracks repo. */
  setsEnabled: Record<string, boolean>;
  /** Discriminated current selection across all Tracks. The single source
   * of truth for "which Track is the user focused on right now". */
  activeFocus: ActiveFocus;
  notifications: NotificationSettings;
  memoryReview: MemoryReviewSettings;
  questionFilters: QuestionFilterSettings;
  timing: TimingSettings;
  experimental: ExperimentalSettings;
}
