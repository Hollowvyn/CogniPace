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

export * from "./data/datasource/ProblemDataSource";
export * from "./data/datasource/TopicDataSource";
export * from "./data/datasource/CompanyDataSource";

export { buildProblemSeed } from "./data/seed/problems";
export {
  buildTopicSeed,
  resolveSeedTopicId,
  listSeedTopicIds,
  listCatalogTopicSeeds,
} from "./data/seed/topics";
export {
  buildCompanySeed,
  listSeedCompanyIds,
  listCatalogCompanySeeds,
} from "./data/seed/companies";
export {
  CURATED_SETS,
  getCuratedSet,
  listCuratedSetNames,
  listStudyPlans,
  getProblemCatalog,
  getDefaultCurriculumSteps,
  listCatalogPlans,
  type StudyPlanSummary,
  type CurriculumStep,
  type ProblemCatalogEntry,
  type CatalogPlan,
} from "./data/seed/curatedSets";

export * from "./messaging/handlers";
