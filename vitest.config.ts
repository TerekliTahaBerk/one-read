import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      // `text` for the CI log, `html` for the downloadable artifact, `lcov` and
      // `json-summary` so external tooling can read the run without re-parsing
      // the HTML.
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      exclude: ["scripts/**", ".next/**", "prisma/**", "**/*.config.ts"],
    },
  },
});
