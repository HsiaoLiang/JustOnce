import { timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { seedDatabase } from "./seed";

export function demoResetEnabled() {
  return Boolean(process.env.DEMO_RESET_KEY);
}

export function checkResetKey(candidate: string) {
  const expected = process.env.DEMO_RESET_KEY ?? "";
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Wipes everything (including accounts made during a demo) and reloads the seed data. */
export function resetDemoData() {
  return seedDatabase(db);
}
