// Builds or serves the static portfolio demo in /demo (no database, no server).
//   node scripts/demo.mjs build   -> demo/out, ready for GitHub Pages
//   node scripts/demo.mjs dev     -> http://localhost:3100
// Set DEMO_BASE_PATH=/<repo-name> when building for a GitHub Pages project site.

import { cpSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const demo = join(root, "demo");
const mode = process.argv[2] === "dev" ? "dev" : "build";

// The demo serves the app's own seed photos and icons.
rmSync(join(demo, "public"), { recursive: true, force: true });
cpSync(join(root, "public"), join(demo, "public"), { recursive: true });

const next = join(root, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const args = mode === "dev" ? ["dev", demo, "--port", process.env.PORT ?? "3100"] : ["build", demo];
const result = spawnSync(next, args, { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
if (result.status !== 0) process.exit(result.status ?? 1);

// GitHub Pages runs Jekyll by default, which hides folders starting with "_" (like _next).
if (mode === "build") writeFileSync(join(demo, "out", ".nojekyll"), "");
