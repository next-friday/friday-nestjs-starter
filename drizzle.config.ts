import {defineConfig} from "drizzle-kit";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL environment variable is required.");
}

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/**/*.schema.ts",
  dbCredentials: {
    url,
  },
});
