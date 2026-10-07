import {defineConfig} from "vitest/config";

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    root: "./",
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        branches: 90,
        functions: 95,
        lines: 95,
        statements: 95,
      },
      include: ["src/**/*.ts"],
      // Composition roots: wiring only, exercised by the e2e suite.
      exclude: ["src/main.ts", "src/app.module.ts", "src/app.setup.ts"],
    },
  },
});
