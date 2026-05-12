import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

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
      "@features": path.resolve(here, "src/features"),
      "@libs": path.resolve(here, "src/libs"),
      "@platform": path.resolve(here, "src/platform"),
      "@design-system": path.resolve(here, "src/design-system"),
      "@shared": path.resolve(here, "src/shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "tests/**/*.react.test.tsx",
      "src/features/**/__tests__/**/*.react.test.tsx",
      "src/design-system/**/__tests__/**/*.{react.test,a11y.test}.tsx",
    ],
    setupFiles: ["tests/ui/support/setup.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/entrypoints/**/*"],
    },
  },
});
