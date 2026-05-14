import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { topics } from "./topics";
import { trackGroupProblems } from "./trackGroupProblems";
import { tracks } from "./tracks";

export const trackGroups = sqliteTable(
  "track_groups",
  {
    id: text().primaryKey(),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    topicId: text("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    name: text(),
    description: text(),
    orderIndex: integer("order_index").notNull(),
  },
  (t) => [
    index("idx_track_groups_track_id_order").on(t.trackId, t.orderIndex),
  ],
);

export const trackGroupsRelations = relations(
  trackGroups,
  ({ one, many }) => ({
    track: one(tracks, {
      fields: [trackGroups.trackId],
      references: [tracks.id],
    }),
    topic: one(topics, {
      fields: [trackGroups.topicId],
      references: [topics.id],
    }),
    problems: many(trackGroupProblems),
  }),
);
