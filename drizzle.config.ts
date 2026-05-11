import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/data/db/schema.ts",
  out: "./src/data/db/migrations",
  casing: "snake_case",
  strict: true,
  verbose: true,
});
