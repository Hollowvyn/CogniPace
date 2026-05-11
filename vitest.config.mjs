import * as fs from "node:fs";

import { defineConfig } from "vitest/config";

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
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.react.test.tsx"],
    setupFiles: ["tests/ui/support/setup.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/entrypoints/**/*"],
    },
  },
});
