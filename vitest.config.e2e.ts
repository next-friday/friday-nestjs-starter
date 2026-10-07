import {defineConfig} from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    root: "./",
    globals: true,
    include: ["test/**/*.e2e.test.ts"],
  },
});
