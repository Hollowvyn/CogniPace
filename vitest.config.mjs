import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.react.test.tsx"],
    setupFiles: ["tests/ui/support/setup.tsx"],
  },
});
