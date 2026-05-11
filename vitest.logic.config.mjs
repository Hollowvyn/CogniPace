import * as fs from "node:fs";

import { defineConfig } from "vitest/config";

/**
 * Vite plugin: mirrors the esbuild `.sql` text loader configured in
 * build.cjs so tests can `import migrationSql from "./*.sql"` and
 * receive the file contents as a string.
 */
const sqlTextLoader = {
  name: "sql-text-loader",
  enforce: "pre",
  load(id) {
    if (id.endsWith(".sql")) {
      const sql = fs.readFileSync(id, "utf-8");
      return `export default ${JSON.stringify(sql)};`;
    }
    return null;
  },
};

export default defineConfig({
  plugins: [sqlTextLoader],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/entrypoints/**/*"],
    },
  },
});
