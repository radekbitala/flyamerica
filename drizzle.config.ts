import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Pro "drizzle-kit generate" se nepoužije, migrace vzniknou jen ze schématu.
    url: process.env.DATABASE_URL ?? "",
  },
});
