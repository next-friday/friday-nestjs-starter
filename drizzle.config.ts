import {defineConfig} from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/**/*.schema.ts",
  dbCredentials: {
    // Only commands that connect (migrate, studio) read this, so `db:generate`
    // and static tools such as Knip load the config without a database.
    get url() {
      const url = process.env.DATABASE_URL;

      if (!url) {
        throw new Error("DATABASE_URL environment variable is required.");
      }

      return url;
    },
  },
});
