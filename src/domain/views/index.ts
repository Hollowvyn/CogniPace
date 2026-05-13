/**
 * Domain views barrel. One model per file under this folder; the
 * grab-bag `src/domain/views.ts` was split in Phase 5. View shapes
 * are the UI-facing read models assembled by domain + background
 * use cases — Phase 6+ migrates each to its owning feature's
 * `ui/viewmodels/` folder.
 *
 * Helper functions (hydrate, questionStatus) live under `utils/`
 * per the project convention; consumers import them directly from
 * `domain/views/utils/<helper>` (or via this barrel below).
 */
export type { RecommendedReason } from "./RecommendedReason";
export type { RecommendedProblemView } from "./RecommendedProblemView";
export type { TrackQuestionStatusView } from "./TrackQuestionStatusView";
export type { TrackQuestionView } from "./TrackQuestionView";
export type { TrackChapterStatusView } from "./TrackChapterStatusView";
export type { TrackChapterView } from "./TrackChapterView";
export type { TrackCardView } from "./TrackCardView";
export type { ActiveTrackView } from "./ActiveTrackView";
export type { TopicLabel } from "./TopicLabel";
export type { CompanyLabel } from "./CompanyLabel";
export type { ProblemView } from "./ProblemView";
export type { StudyStateView } from "./StudyStateView";
export type { TrackMembership } from "./TrackMembership";
export type { LibraryProblemRow } from "./LibraryProblemRow";
export type { TrackGroupView } from "./TrackGroupView";
export type { TrackView } from "./TrackView";

export type { PopupViewData } from "./PopupViewData";
export type { PopupShellPayload } from "./PopupShellPayload";
export type { AppShellPayload } from "./AppShellPayload";

export type { SaveReviewResultResponse } from "./SaveReviewResultResponse";
export type { ProblemContextResponse } from "./ProblemContextResponse";
export type { ProblemMutationResponse } from "./ProblemMutationResponse";
export type { ImportSummaryResponse } from "./ImportSummaryResponse";
export type { SettingsUpdateResponse } from "./SettingsUpdateResponse";
export type { OpenedResponse } from "./OpenedResponse";
export type { StudyStateMutationResponse } from "./StudyStateMutationResponse";
export type { StudyHistoryResetResponse } from "./StudyHistoryResetResponse";
export type { PopupModeLabel } from "./PopupModeLabel";
