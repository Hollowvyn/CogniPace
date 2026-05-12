import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { problems } from "./problems";
import { trackGroups } from "./trackGroups";

export const trackGroupProblems = sqliteTable(
  "track_group_problems",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => trackGroups.id, { onDelete: "cascade" }),
    problemSlug: text("problem_slug")
      .notNull()
      .references(() => problems.slug, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.problemSlug] }),
    index("idx_tgp_group_id_order").on(t.groupId, t.orderIndex),
    index("idx_tgp_problem_slug").on(t.problemSlug),
  ],
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
