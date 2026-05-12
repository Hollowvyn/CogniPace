import { defineConfig } from "drizzle-kit";

// Schema columns carry explicit snake_case names (see src/data/db/schema.ts),
// so the `casing` option is unnecessary here — every column already has its
// canonical DB name. This is also a deliberate sidestep of a bug in
// drizzle-orm@0.45.2's sqlite-proxy runtime that silently drops the option.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/data/db/schema.ts",
  out: "./src/data/db/migrations",
  strict: true,
  verbose: true,
});
