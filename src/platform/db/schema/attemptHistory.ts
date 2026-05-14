import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { studyStates } from "./studyStates";

export const attemptHistory = sqliteTable(
  "attempt_history",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    problemSlug: text("problem_slug")
      .notNull()
      .references(() => studyStates.problemSlug, { onDelete: "cascade" }),
    reviewedAt: text("reviewed_at").notNull(),
    rating: integer().$type<0 | 1 | 2 | 3>().notNull(),
    solveTimeMs: integer("solve_time_ms"),
    mode: text({ enum: ["RECALL", "FULL_SOLVE"] }).notNull(),
    logSnapshot: text("log_snapshot", { mode: "json" }).$type<{
      interviewPattern?: string;
      timeComplexity?: string;
      spaceComplexity?: string;
      languages?: string;
      notes?: string;
    }>(),
  },
  (t) => [
    index("idx_attempt_history_slug_reviewed_at").on(
      t.problemSlug,
      t.reviewedAt,
    ),
  ],
);

export const attemptHistoryRelations = relations(attemptHistory, ({ one }) => ({
  studyState: one(studyStates, {
    fields: [attemptHistory.problemSlug],
    references: [studyStates.problemSlug],
  }),
}));
