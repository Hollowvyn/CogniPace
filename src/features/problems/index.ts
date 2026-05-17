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
  ProblemFormDialog,
  type ProblemFormDialogCloseReason,
} from "./ui/screens/editcreateform/ProblemFormDialog";
export { createProblemFormViewModel } from "./ui/screens/editcreateform/viewmodel/problemFormStore";
export type {
  ProblemFormIntent,
  ProblemFormStore,
} from "./ui/screens/editcreateform/viewmodel/problemFormStore";
export { LibraryProblemTable } from "./ui/screens/library/components/LibraryProblemTable";
export type { LibraryProblemTableProps } from "./ui/screens/library/components/LibraryProblemTable";
export {
  TrackProblemTable,
  type ProblemTableCommands,
} from "./ui/components/problemsTable";
export { RecommendedProblemCard } from "./ui/components/RecommendedProblemCard";
export type { RecommendedProblemCardProps } from "./ui/components/RecommendedProblemCard";

export { formatDisplayDate } from "./ui/presentation/studyState";
