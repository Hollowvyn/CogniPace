import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { problemCompanies } from "./problemCompanies";
import { nowSql } from "./utils/nowSql";

export const companies = sqliteTable("companies", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text(),
  isCustom: integer("is_custom", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull().default(nowSql),
  updatedAt: text("updated_at").notNull().default(nowSql),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  problems: many(problemCompanies),
}));
