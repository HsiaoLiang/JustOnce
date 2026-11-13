// Runs the Prisma CLI, filling in DATABASE_URL_UNPOOLED from DATABASE_URL when a
// host only gives you one connection string (Railway, Render, local Postgres).
import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the real environment (Vercel, CI).
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env or add it to your host's environment variables.");
  process.exit(1);
}
process.env.DATABASE_URL_UNPOOLED ||= process.env.DATABASE_URL;

const result = spawnSync("npx", ["prisma", ...process.argv.slice(2)], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
