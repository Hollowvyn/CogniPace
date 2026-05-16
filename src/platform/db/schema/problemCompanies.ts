import { relations } from "drizzle-orm";
import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { companies } from "./companies";
import { problems } from "./problems";

export const problemCompanies = sqliteTable(
  "problem_companies",
  {
    problemSlug: text("problem_slug")
      .notNull()
      .references(() => problems.slug, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.problemSlug, t.companyId] })],
);

export const problemCompaniesRelations = relations(problemCompanies, ({ one }) => ({
  problem: one(problems, {
    fields: [problemCompanies.problemSlug],
    references: [problems.slug],
  }),
  company: one(companies, {
    fields: [problemCompanies.companyId],
    references: [companies.id],
  }),
}));
