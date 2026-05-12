import type { Problem } from "./Problem";
import type { StudyState } from "./StudyState";
import type { Company } from "../companies/model";
import type { UserSettings } from "../settings/model";
import type { Topic } from "../topics/model";
import type { TrackWithGroups } from "../tracks/model";


export interface ExportPayload {
  version?: number;
  problems: Problem[];
  studyStatesBySlug: Record<string, StudyState>;
  settings?: Partial<UserSettings>;
  topicsById?: Record<string, Topic>;
  companiesById?: Record<string, Company>;
  /** Curated + user-defined tracks. Slim post-Phase-5: each track
   * carries its groups, each group carries an ordered slug list. */
  tracks?: TrackWithGroups[];
}
