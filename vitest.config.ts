import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      exclude: ["scripts/**", ".next/**", "prisma/**", "**/*.config.ts"],
    },
  },
});
