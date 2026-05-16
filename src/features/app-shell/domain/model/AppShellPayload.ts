import type { PopupShellPayload } from "./PopupShellPayload";
import type { AnalyticsSummary } from "@features/analytics";
import type {
  CompanyLabel,
  RecommendedProblemView,
  TopicLabel,
} from "@features/problems";
import type { TodayQueue } from "@features/queue";
import type { Track } from "@features/tracks";

export interface AppShellPayload extends PopupShellPayload {
  queue: TodayQueue;
  analytics: AnalyticsSummary;
  recommendedCandidates: RecommendedProblemView[];
  /** Every Track aggregate for the dashboard's Tracks tab. */
  tracks: Track[];
  /** v7 — flat list of every Topic, sorted by name; for Autocomplete inputs. */
  topicChoices: TopicLabel[];
  /** v7 — flat list of every Company, sorted by name; for Autocomplete inputs. */
  companyChoices: CompanyLabel[];
}
