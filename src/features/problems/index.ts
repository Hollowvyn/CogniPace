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

export { problemRepository } from "./data/repository/ProblemRepository";
export type { ProblemRepository } from "./data/repository/ProblemRepository";

export { LibraryScreen } from "./ui/screens/library/LibraryScreen";
export {
  LibraryProblemTable,
  TrackProblemTable,
  type ProblemTableCommands,
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
