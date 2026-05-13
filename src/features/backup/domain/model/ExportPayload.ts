import type { Company } from "../../../../domain/companies/model";
import type { Topic } from "../../../../domain/topics/model";
import type { TrackWithGroups } from "../../../../domain/tracks/model";
import type { Problem } from "../../../../domain/types/Problem";
import type { StudyState } from "../../../../domain/types/StudyState";
import type { UserSettings } from "@features/settings";

export interface ExportPayload {
  version?: number;
  problems: Problem[];
  studyStatesBySlug: Record<string, StudyState>;
  settings?: Partial<UserSettings>;
  topicsById?: Record<string, Topic>;
  companiesById?: Record<string, Company>;
  tracks?: TrackWithGroups[];
}
