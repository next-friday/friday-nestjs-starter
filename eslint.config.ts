import {defineConfig, globalIgnores} from "eslint/config";
import friday from "@next-friday/eslint-config-friday";

export default defineConfig(
  globalIgnores([".agents/**", ".claude/**", "dist/**", "coverage/**"]),
  friday({
    browser: false,
    nestjs: true,
  }),
  {
    name: "friday/dependency-cruiser-config",
    rules: {
      "sonarjs/file-name-differ-from-class": "off",
    },
    files: [".dependency-cruiser.ts"],
  },
);
