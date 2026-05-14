import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { nowSql } from "./utils/nowSql";

export const settingsKv = sqliteTable("settings_kv", {
  key: text().primaryKey(),
  value: text().notNull(),
  updatedAt: text("updated_at").notNull().default(nowSql),
});
