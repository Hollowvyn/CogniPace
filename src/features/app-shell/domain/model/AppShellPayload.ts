import type { PopupShellPayload } from "./PopupShellPayload";
import type { CompanyLabel } from "../../../../domain/views/CompanyLabel";
import type { LibraryProblemRow } from "../../../../domain/views/LibraryProblemRow";
import type { RecommendedProblemView } from "../../../../domain/views/RecommendedProblemView";
import type { TopicLabel } from "../../../../domain/views/TopicLabel";
import type { TrackView } from "../../../../domain/views/TrackView";
import type { AnalyticsSummary } from "@features/analytics";
import type { TodayQueue } from "@features/queue";

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
