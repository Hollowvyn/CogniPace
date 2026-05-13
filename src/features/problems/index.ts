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
} from "./domain/model";
export {
  applyEdit,
  mergeImported,
  listEditedFields,
  normalizeSlug,
  normalizeProblemSlug,
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

// UI-side catalog actions (parse input, etc.) the dashboard library uses.
export { parseProblemInput } from "./data/repository/ProblemRepository";

export { LibraryView as LibraryScreen } from "./ui/screens/library/LibraryView";
export {
  ProblemsTable,
  type ProblemRowData,
} from "./ui/components/problemsTable";
