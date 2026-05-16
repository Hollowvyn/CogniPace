import { relations } from "drizzle-orm";
import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { problems } from "./problems";
import { topics } from "./topics";

export const problemTopics = sqliteTable(
  "problem_topics",
  {
    problemSlug: text("problem_slug")
      .notNull()
      .references(() => problems.slug, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.problemSlug, t.topicId] })],
);

export const problemTopicsRelations = relations(problemTopics, ({ one }) => ({
  problem: one(problems, {
    fields: [problemTopics.problemSlug],
    references: [problems.slug],
  }),
  topic: one(topics, {
    fields: [problemTopics.topicId],
    references: [topics.id],
  }),
}));
