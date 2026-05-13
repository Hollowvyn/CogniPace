import type { Problem } from "./Problem";
import type { Company } from "../companies/model";
import type { Topic } from "../topics/model";
import type { UserSettings } from "@features/settings";
import type { StudyState } from "@features/study";


/**
 * Transitional AppData root — hydrated by the dashboard handler from
 * SQLite (every aggregate that survived Phase 5). The blob shape is
 * deliberately slim now; new aggregates do NOT get added here.
 */
export interface AppData {
  schemaVersion: number;
  /** Problem aggregate, hydrated from SQLite at read time. */
  problemsBySlug: Record<string, Problem>;
  /** StudyState aggregate, hydrated from SQLite at read time. */
  studyStatesBySlug: Record<string, StudyState>;
  /** Topic registry, hydrated from SQLite at read time. */
  topicsById: Record<string, Topic>;
  /** Company registry, hydrated from SQLite at read time. */
  companiesById: Record<string, Company>;
  settings: UserSettings;
  /** Set by the v6→v7 migration; surfaces in support diagnostics. */
  lastMigrationAt?: string;
}
