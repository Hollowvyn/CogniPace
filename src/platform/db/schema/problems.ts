import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { studyStates } from "./studyStates";
import { trackGroupProblems } from "./trackGroupProblems";
import { nowSql } from "./utils/nowSql";

export const problems = sqliteTable(
  "problems",
  {
    slug: text().primaryKey(),
    leetcodeId: text("leetcode_id"),
    title: text().notNull().default("Untitled"),
    difficulty: text({ enum: ["Easy", "Medium", "Hard", "Unknown"] })
      .notNull()
      .default("Unknown"),
    isPremium: integer("is_premium", { mode: "boolean" })
      .notNull()
      .default(false),
    url: text().notNull().default(""),
    topicIds: text("topic_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$default(() => []),
    companyIds: text("company_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$default(() => []),
    userEdits: text("user_edits", { mode: "json" })
      .$type<Record<string, true>>()
      .notNull()
      .$default(() => ({})),
    createdAt: text("created_at").notNull().default(nowSql),
    updatedAt: text("updated_at").notNull().default(nowSql),
  },
  (t) => [
    index("idx_problems_difficulty").on(t.difficulty),
    index("idx_problems_is_premium").on(t.isPremium),
  ],
);

export const problemsRelations = relations(problems, ({ one, many }) => ({
  studyState: one(studyStates, {
    fields: [problems.slug],
    references: [studyStates.problemSlug],
  }),
  trackMemberships: many(trackGroupProblems),
}));
