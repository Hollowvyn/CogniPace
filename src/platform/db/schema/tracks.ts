import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { trackGroups } from "./trackGroups";
import { nowSql } from "./utils/nowSql";

export const tracks = sqliteTable(
  "tracks",
  {
    id: text().primaryKey(),
    name: text().notNull().default("Untitled Track"),
    description: text(),
    enabled: integer({ mode: "boolean" }).notNull().default(true),
    isCurated: integer("is_curated", { mode: "boolean" })
      .notNull()
      .default(false),
    orderIndex: integer("order_index"),
    createdAt: text("created_at").notNull().default(nowSql),
    updatedAt: text("updated_at").notNull().default(nowSql),
  },
  (t) => [
    index("idx_tracks_enabled").on(t.enabled),
    index("idx_tracks_order_index").on(t.orderIndex),
  ],
);

export const tracksRelations = relations(tracks, ({ many }) => ({
  groups: many(trackGroups),
}));
