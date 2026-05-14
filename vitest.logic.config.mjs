import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

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
  resolve: {
    alias: {
      "@app": path.resolve(here, "src/app"),
      "@extension": path.resolve(here, "src/extension"),
      "@features": path.resolve(here, "src/features"),
      "@libs": path.resolve(here, "src/libs"),
      "@platform": path.resolve(here, "src/platform"),
      "@design-system": path.resolve(here, "src/design-system"),
      "@shared": path.resolve(here, "src/shared"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/tests/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/entrypoints/**/*"],
    },
  },
});
