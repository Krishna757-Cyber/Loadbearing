import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 70,
        statements: 90,
      },
      include: ["packages/router/src/**/*.ts"],
      exclude: ["**/__tests__/**", "**/*.test.ts", "**/index.ts"],
    },
  },
});
