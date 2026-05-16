import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { tracks } from "./tracks";
import { nowSql } from "./utils/nowSql";

/**
 * Single-row entity holding the user's active track selection.
 * `singleton = 1` is the only valid primary key — enforced by the
 * datasource via insert().onConflictDoUpdate() on the PK.
 *
 * Intentionally separate from settings: track selection is a tracks
 * domain concern, not a user preference.
 */
export const trackSession = sqliteTable("track_session", {
  singleton: integer().primaryKey().default(1),
  activeTrackId: text("active_track_id").references(() => tracks.id, {
    onDelete: "set null",
  }),
  updatedAt: text("updated_at").notNull().default(nowSql),
});
