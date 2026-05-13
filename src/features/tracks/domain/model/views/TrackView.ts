import type { TrackGroupView } from "./TrackGroupView";

/**
 * Hydrated UI shape for a Track. Slim per the charter: every Track is a
 * named, ordered collection of TrackGroups; each group is a named,
 * ordered list of problems with derived per-group completion counts.
 * Single-group tracks render flat (no tab bar) — the UI just omits the
 * Tabs component when `groups.length === 1`.
 */
export interface TrackView {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  isCurated: boolean;
  groups: TrackGroupView[];
}
