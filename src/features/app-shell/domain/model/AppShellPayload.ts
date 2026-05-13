import type { PopupShellPayload } from "./PopupShellPayload";
import type { AnalyticsSummary } from "@features/analytics";
import type {
  CompanyLabel,
  LibraryProblemRow,
  RecommendedProblemView,
  TopicLabel,
} from "@features/problems";
import type { TodayQueue } from "@features/queue";
import type { TrackView } from "@features/tracks";

export interface AppShellPayload extends PopupShellPayload {
  queue: TodayQueue;
  analytics: AnalyticsSummary;
  recommendedCandidates: RecommendedProblemView[];
  library: LibraryProblemRow[];
  /** Every Track hydrated for the dashboard's Tracks tab. */
  tracks: TrackView[];
  /** v7 — flat list of every Topic, sorted by name; for Autocomplete inputs. */
  topicChoices: TopicLabel[];
  /** v7 — flat list of every Company, sorted by name; for Autocomplete inputs. */
  companyChoices: CompanyLabel[];
}
