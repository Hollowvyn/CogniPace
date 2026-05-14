export type {
  Problem,
  Difficulty,
  SourceSet,
  Topic,
  Company,
  CuratedProblemInput,
  ProblemSnapshot,
  EditableProblemField,
  ProblemEditFlags,
  ProblemEditPatch,
  ProblemView,
  RecommendedProblemView,
  RecommendedReason,
  LibraryProblemRow,
  TopicLabel,
  CompanyLabel,
  ProblemContextResponse,
  ProblemMutationResponse,
} from "./domain/model";
export {
  applyEdit,
  mergeImported,
  listEditedFields,
  normalizeSlug,
  slugToTitle,
  slugToUrl,
  leetcodeProblemUrl,
  isProblemPage,
  parseDifficulty,
  difficultyGoalMs,
} from "./domain/model";

// UI-side wire-dispatch session actions (problem context, page upsert,
// review submit, etc.) — used by overlay/popup callers.
export {
  upsertProblemFromPage,
  getProblemContext,
  saveReviewResult,
  saveOverlayLogDraft,
  overrideLastReviewResult,
  openProblemPage,
  openExtensionPage,
} from "./data/repository/ProblemSessionRepository";

export { LibraryScreen } from "./ui/screens/library/LibraryScreen";
export { useLibraryVM } from "./ui/hooks/useLibraryVM";
export type { LibraryScreenModel } from "./ui/hooks/useLibraryVM";
export {
  ProblemsTable,
  type ProblemRowData,
} from "./ui/components/problemsTable";
export { RecommendedProblemCard } from "./ui/components/RecommendedProblemCard";
export type { RecommendedProblemCardProps } from "./ui/components/RecommendedProblemCard";

// UI-presentation helpers — cross-feature consumers (tracks cards, popup,
// queue, overlay-session) map problem-domain values (Difficulty,
// RecommendedReason, retrievability) to the shared design-system Tone.
export {
  difficultyTone,
  formatDisplayDate,
} from "./ui/presentation/studyState";
