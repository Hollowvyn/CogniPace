import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { problemTopics } from "./problemTopics";
import { trackGroups } from "./trackGroups";
import { nowSql } from "./utils/nowSql";

export const topics = sqliteTable("topics", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text(),
  isCustom: integer("is_custom", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull().default(nowSql),
  updatedAt: text("updated_at").notNull().default(nowSql),
});

export const topicsRelations = relations(topics, ({ many }) => ({
  trackGroups: many(trackGroups),
  problems: many(problemTopics),
}));
