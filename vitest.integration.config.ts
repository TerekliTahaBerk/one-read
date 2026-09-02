import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["test/integration/**/*.test.ts"],
    fileParallelism: false,
  },
});
