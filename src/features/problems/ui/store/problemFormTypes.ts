import type {
  CompanyLabel,
  Difficulty,
  TopicLabel,
} from "../../domain/model";
import type { ProblemSlug } from "@shared/ids";

export type ProblemFormMode = "create" | "edit";

export interface ProblemFormValues {
  problemInput: string;
  title: string;
  difficulty: Difficulty;
  url: string;
  topics: TopicLabel[];
  companies: ProblemFormCompanyValue[];
  isPremium: boolean;
}

export type ProblemFormLoadError =
  | { type: "NotFound"; message: string }
  | { type: "Failed"; message: string };

export interface ProblemFormUiState {
  slugId: ProblemSlug | null;
  mode: ProblemFormMode;
  title: string;
  values: ProblemFormValues;
  topicOptions: TopicLabel[];
  companyOptions: CompanyLabel[];
  isLoading: boolean;
  loadError: ProblemFormLoadError | null;
  isSaving: boolean;
  saveError: string | null;
  canRenderForm: boolean;
  canSave: boolean;
}

export type ProblemFormUiEffect =
  | { type: "CloseRequested" }
  | { mode: ProblemFormMode; slugId: ProblemSlug; type: "Saved" };

export type ProblemFormCompanySelection = ReadonlyArray<string | CompanyLabel>;
export type ProblemFormCompanyValue = string | CompanyLabel;

export type ProblemFormIntent =
  | { type: "Load"; slugId?: ProblemSlug }
  | { type: "ChangeProblemInput"; value: string }
  | { type: "ChangeTitle"; value: string }
  | { type: "SetDifficulty"; value: Difficulty }
  | { type: "ChangeUrl"; value: string }
  | { type: "SetTopics"; value: TopicLabel[] }
  | { type: "SetCompanies"; value: ProblemFormCompanySelection }
  | { type: "SetPremium"; value: boolean }
  | { type: "Save" }
  | { type: "Cancel" };

export interface ProblemFormViewModel {
  uiState: ProblemFormUiState;
  dispatch: (intent: ProblemFormIntent) => void;
}
