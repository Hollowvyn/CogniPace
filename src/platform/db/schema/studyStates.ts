import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { attemptHistory } from "./attemptHistory";
import { problems } from "./problems";
import { nowSql } from "./utils/nowSql";

export const studyStates = sqliteTable(
  "study_states",
  {
    problemSlug: text("problem_slug")
      .primaryKey()
      .references(() => problems.slug, { onDelete: "cascade" }),
    suspended: integer({ mode: "boolean" }).notNull().default(false),
    tags: text({ mode: "json" })
      .$type<string[]>()
      .notNull()
      .$default(() => []),
    bestTimeMs: integer("best_time_ms"),
    lastSolveTimeMs: integer("last_solve_time_ms"),
    lastRating: integer("last_rating").$type<0 | 1 | 2 | 3>(),
    confidence: real(),
    fsrsDue: text("fsrs_due"),
    fsrsStability: real("fsrs_stability"),
    fsrsDifficulty: real("fsrs_difficulty"),
    fsrsElapsedDays: real("fsrs_elapsed_days"),
    fsrsScheduledDays: real("fsrs_scheduled_days"),
    fsrsLearningSteps: integer("fsrs_learning_steps"),
    fsrsReps: integer("fsrs_reps"),
    fsrsLapses: integer("fsrs_lapses"),
    fsrsState: text("fsrs_state", {
      enum: ["New", "Learning", "Review", "Relearning"],
    }),
    fsrsLastReview: text("fsrs_last_review"),
    interviewPattern: text("interview_pattern"),
    timeComplexity: text("time_complexity"),
    spaceComplexity: text("space_complexity"),
    languages: text(),
    notes: text(),
    createdAt: text("created_at").notNull().default(nowSql),
    updatedAt: text("updated_at").notNull().default(nowSql),
  },
  (t) => [
    index("idx_study_states_due")
      .on(t.fsrsDue)
      .where(sql`${t.suspended} = 0`),
    index("idx_study_states_suspended").on(t.suspended),
  ],
);

export const studyStatesRelations = relations(
  studyStates,
  ({ one, many }) => ({
    problem: one(problems, {
      fields: [studyStates.problemSlug],
      references: [problems.slug],
    }),
    attempts: many(attemptHistory),
  }),
);
