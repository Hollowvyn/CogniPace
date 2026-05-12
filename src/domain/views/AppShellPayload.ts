
import type { CompanyLabel } from "./CompanyLabel";
import type { LibraryProblemRow } from "./LibraryProblemRow";
import type { PopupShellPayload } from "./PopupShellPayload";
import type { RecommendedProblemView } from "./RecommendedProblemView";
import type { TopicLabel } from "./TopicLabel";
import type { TrackView } from "./TrackView";
import type { AnalyticsSummary } from "../types/AnalyticsSummary";
import type { TodayQueue } from "../types/TodayQueue";

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
