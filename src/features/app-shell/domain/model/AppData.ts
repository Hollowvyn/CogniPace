import type { Problem, Company, Topic } from "@features/problems";
import type { UserSettings } from "@features/settings";
import type { StudyState } from "@features/study";
import type { TrackId } from "@shared/ids";

/**
 * App-shell read model. `problems` is the canonical list (rich — carries
 * studyState, topics, companies via Drizzle relations). The lookup maps
 * are derived from it in `loadAppShellData` for backward-compat with
 * queue/analytics consumers; they will be removed as those features
 * are updated to use `problems` directly.
 */
export interface AppData {
  /** Rich problems — studyState, topics, companies populated by Drizzle RQB. */
  problems: Problem[];
  /** Derived from problems — for backward-compat with queue/analytics. */
  problemsBySlug: Record<string, Problem>;
  studyStatesBySlug: Record<string, StudyState>;
  topicsById: Record<string, Topic>;
  companiesById: Record<string, Company>;
  settings: UserSettings;
  activeTrackId: TrackId | null;
  /** Set by the v6→v7 migration; surfaces in support diagnostics. */
  lastMigrationAt?: string;
}
