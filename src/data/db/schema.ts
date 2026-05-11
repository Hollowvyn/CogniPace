/**
 * SQLite + Drizzle schema for the CogniPace data layer.
 *
 * Source of truth for column types, defaults, constraints, and
 * relationships. Generated migrations under ./migrations/ are derived
 * from this file via `npx drizzle-kit generate` — never hand-edit the
 * SQL migrations. See docs/drizzle-data-shape.md for the full rationale.
 *
 * Naming: camelCase keys in TypeScript map to snake_case columns in
 * SQLite via the `casing: "snake_case"` option set at `drizzle()` init
 * and in drizzle.config.ts. No per-column aliases except where the
 * mapping is non-trivial.
 */
import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const topics = sqliteTable("topics", {
  id: text().primaryKey(),
  name: text().notNull(),
});

export const companies = sqliteTable("companies", {
  id: text().primaryKey(),
  name: text().notNull(),
});

export const problems = sqliteTable(
  "problems",
  {
    slug: text().primaryKey(),
    leetcodeId: text(),
    title: text().notNull().default("Untitled"),
    difficulty: text({ enum: ["Easy", "Medium", "Hard", "Unknown"] })
      .notNull()
      .default("Unknown"),
    isPremium: integer({ mode: "boolean" }).notNull().default(false),
    url: text().notNull().default(""),
    topicIds: text({ mode: "json" })
      .$type<string[]>()
      .notNull()
      .$default(() => []),
    companyIds: text({ mode: "json" })
      .$type<string[]>()
      .notNull()
      .$default(() => []),
    userEdits: text({ mode: "json" })
      .$type<Record<string, true>>()
      .notNull()
      .$default(() => ({})),
    createdAt: text().notNull().default(nowSql),
    updatedAt: text().notNull().default(nowSql),
  },
  (t) => [
    index("idx_problems_difficulty").on(t.difficulty),
    index("idx_problems_is_premium").on(t.isPremium),
  ],
);

export const studyStates = sqliteTable(
  "study_states",
  {
    problemSlug: text()
      .primaryKey()
      .references(() => problems.slug, { onDelete: "cascade" }),
    suspended: integer({ mode: "boolean" }).notNull().default(false),
    tags: text({ mode: "json" })
      .$type<string[]>()
      .notNull()
      .$default(() => []),
    bestTimeMs: integer(),
    lastSolveTimeMs: integer(),
    lastRating: integer().$type<0 | 1 | 2 | 3>(),
    confidence: real(),
    fsrsDue: text(),
    fsrsStability: real(),
    fsrsDifficulty: real(),
    fsrsElapsedDays: real(),
    fsrsScheduledDays: real(),
    fsrsLearningSteps: integer(),
    fsrsReps: integer(),
    fsrsLapses: integer(),
    fsrsState: text({ enum: ["New", "Learning", "Review", "Relearning"] }),
    fsrsLastReview: text(),
    interviewPattern: text(),
    timeComplexity: text(),
    spaceComplexity: text(),
    languages: text(),
    notes: text(),
    createdAt: text().notNull().default(nowSql),
    updatedAt: text().notNull().default(nowSql),
  },
  (t) => [
    index("idx_study_states_due")
      .on(t.fsrsDue)
      .where(sql`${t.suspended} = 0`),
    index("idx_study_states_suspended").on(t.suspended),
  ],
);

export const attemptHistory = sqliteTable(
  "attempt_history",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    problemSlug: text()
      .notNull()
      .references(() => studyStates.problemSlug, { onDelete: "cascade" }),
    reviewedAt: text().notNull(),
    rating: integer().$type<0 | 1 | 2 | 3>().notNull(),
    solveTimeMs: integer(),
    mode: text({ enum: ["RECALL", "FULL_SOLVE"] }).notNull(),
    logSnapshot: text({ mode: "json" }).$type<{
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

export const tracks = sqliteTable(
  "tracks",
  {
    id: text().primaryKey(),
    name: text().notNull().default("Untitled Track"),
    description: text(),
    enabled: integer({ mode: "boolean" }).notNull().default(true),
    isCurated: integer({ mode: "boolean" }).notNull().default(false),
    orderIndex: integer(),
    createdAt: text().notNull().default(nowSql),
    updatedAt: text().notNull().default(nowSql),
  },
  (t) => [
    index("idx_tracks_enabled").on(t.enabled),
    index("idx_tracks_order_index").on(t.orderIndex),
  ],
);

export const trackGroups = sqliteTable(
  "track_groups",
  {
    id: text().primaryKey(),
    trackId: text()
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    topicId: text().references(() => topics.id, { onDelete: "set null" }),
    name: text(),
    description: text(),
    orderIndex: integer().notNull(),
  },
  (t) => [
    index("idx_track_groups_track_id_order").on(t.trackId, t.orderIndex),
  ],
);

export const trackGroupProblems = sqliteTable(
  "track_group_problems",
  {
    groupId: text()
      .notNull()
      .references(() => trackGroups.id, { onDelete: "cascade" }),
    problemSlug: text()
      .notNull()
      .references(() => problems.slug, { onDelete: "restrict" }),
    orderIndex: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.problemSlug] }),
    index("idx_tgp_group_id_order").on(t.groupId, t.orderIndex),
    index("idx_tgp_problem_slug").on(t.problemSlug),
  ],
);

export const settingsKv = sqliteTable("settings_kv", {
  key: text().primaryKey(),
  value: text().notNull(),
  updatedAt: text().notNull().default(nowSql),
});

export const problemsRelations = relations(problems, ({ one, many }) => ({
  studyState: one(studyStates, {
    fields: [problems.slug],
    references: [studyStates.problemSlug],
  }),
  trackMemberships: many(trackGroupProblems),
}));

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

export const attemptHistoryRelations = relations(attemptHistory, ({ one }) => ({
  studyState: one(studyStates, {
    fields: [attemptHistory.problemSlug],
    references: [studyStates.problemSlug],
  }),
}));

export const tracksRelations = relations(tracks, ({ many }) => ({
  groups: many(trackGroups),
}));

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

export const trackGroupProblemsRelations = relations(
  trackGroupProblems,
  ({ one }) => ({
    group: one(trackGroups, {
      fields: [trackGroupProblems.groupId],
      references: [trackGroups.id],
    }),
    problem: one(problems, {
      fields: [trackGroupProblems.problemSlug],
      references: [problems.slug],
    }),
  }),
);

export const topicsRelations = relations(topics, ({ many }) => ({
  trackGroups: many(trackGroups),
}));
