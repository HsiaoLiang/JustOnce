// AI photo comparison at pickup and return: the shapes and pure rules shared by
// the server route and the booking page. Nothing here calls a model; see
// src/server/photo-comparison.ts for that.
//
// The result is advice for the two people, never a decision. Nothing in the app
// reads it to change a booking or a deposit.

export type CheckStageId = "PICKUP" | "RETURN";
export type Confidence = "low" | "medium" | "high";
export type ListingMatch = "yes" | "unsure" | "no";

/** How many photos from each side of the comparison are sent to the model. */
export const MAX_REFERENCE_PHOTOS = 3;
export const MAX_NEW_PHOTOS = 3;
/** A comparison still marked as running after this long is treated as lost and may be started again. */
export const PENDING_TIMEOUT_MS = 90_000;

export interface Difference {
  description: string;
  /** 1-based position among the return photos that were compared, or null when it isn't tied to one photo. */
  photoIndex: number | null;
  confidence: Confidence;
}

interface DoneBase {
  v: 1;
  status: "done";
  at: string;
  /** False when the photos were too dark, blurred or differently framed to compare fairly. */
  comparable: boolean;
  /** The earlier photos (listing photos at pickup, pickup photos at return). */
  referencePhotos: string[];
  /** This check's photos, in the order `photoIndex` refers to. */
  photos: string[];
}

export interface ReturnComparison extends DoneBase {
  stage: "RETURN";
  differences: Difference[];
  /** Parts that were visible at pickup and can't be seen in the return photos. */
  missingParts: string[];
}

export interface PickupComparison extends DoneBase {
  stage: "PICKUP";
  matchesListing: ListingMatch;
  note: string;
}

export type DoneComparison = ReturnComparison | PickupComparison;

/** What is kept in `HandoverCheck.aiComparison`. Null in the database means "never tried". */
export type StoredComparison = { v: 1; status: "pending"; at: string } | { v: 1; status: "failed"; at: string } | DoneComparison;

// ---------------------------------------------------------------- what we ask the model for

/** JSON schemas handed to the model. Kept null-free so every provider accepts them. */
export const RETURN_COMPARISON_JSON_SCHEMA = {
  type: "object",
  properties: {
    comparable: { type: "boolean", description: "False if the photos are too dark, blurred or differently framed to compare fairly." },
    differences: {
      type: "array",
      description: "Visible changes to the item itself since pickup. Empty if nothing visible changed.",
      items: {
        type: "object",
        properties: {
          description: { type: "string", description: "One short line worded as a possibility, e.g. 'Possible new scratch on the lens ring'." },
          photoIndex: { type: "integer", description: "Which return photo shows it, counting from 1. 0 if it isn't tied to one photo." },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["description", "photoIndex", "confidence"],
      },
    },
    missingParts: {
      type: "array",
      description: "Parts clearly visible at pickup that cannot be seen in the return photos, named briefly, e.g. 'Lens cap'.",
      items: { type: "string" },
    },
  },
  required: ["comparable", "differences", "missingParts"],
} as const;

export const PICKUP_MATCH_JSON_SCHEMA = {
  type: "object",
  properties: {
    comparable: { type: "boolean", description: "False if the photos are too dark, blurred or differently framed to tell." },
    matchesListing: { type: "string", enum: ["yes", "unsure", "no"], description: "Whether the pickup photos appear to show the same item as the listing photos." },
    note: { type: "string", description: "One short, cautious line saying what was noticed. Empty when it simply matches." },
  },
  required: ["comparable", "matchesListing", "note"],
} as const;

// ---------------------------------------------------------------- reading the model's answer

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const clean = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
const CONFIDENCES: readonly Confidence[] = ["low", "medium", "high"];
const MATCHES: readonly ListingMatch[] = ["yes", "unsure", "no"];

// The model is told to hedge. This catches the times it states a difference as a fact anyway.
const HEDGED = /\b(possibl[ey]|may|might|could|appears?|seems?|looks?|likely|not (clearly )?visible|can(no|')t (be seen|see)|unclear)\b/i;

/** Makes sure a finding reads as a possibility, because lighting and angle differ between photos. */
export function hedge(description: string): string {
  const text = description.replace(/[.\s]+$/, "");
  if (!text || HEDGED.test(text)) return text;
  return `Possible change: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

/**
 * Turns the model's answer about return photos into the fields we keep, or null
 * when the answer isn't usable. Anything unexpected is dropped rather than trusted.
 */
export function readReturnAnswer(answer: unknown, photoCount: number): Pick<ReturnComparison, "comparable" | "differences" | "missingParts"> | null {
  if (!isRecord(answer) || typeof answer.comparable !== "boolean") return null;
  // "Can't compare" and a list of findings contradict each other; the cautious reading wins.
  if (!answer.comparable) return { comparable: false, differences: [], missingParts: [] };

  const differences: Difference[] = [];
  for (const item of Array.isArray(answer.differences) ? answer.differences : []) {
    if (!isRecord(item)) continue;
    const description = hedge(clean(item.description, 200));
    if (!description) continue;
    const index = typeof item.photoIndex === "number" && Number.isInteger(item.photoIndex) ? item.photoIndex : 0;
    differences.push({
      description,
      photoIndex: index >= 1 && index <= photoCount ? index : null,
      confidence: CONFIDENCES.includes(item.confidence as Confidence) ? (item.confidence as Confidence) : "low",
    });
    if (differences.length === 6) break;
  }

  const missingParts: string[] = [];
  for (const item of Array.isArray(answer.missingParts) ? answer.missingParts : []) {
    const part = clean(item, 80).replace(/[.\s]+$/, "");
    if (part && !missingParts.some((p) => p.toLowerCase() === part.toLowerCase())) missingParts.push(part);
    if (missingParts.length === 6) break;
  }
  return { comparable: true, differences, missingParts };
}

/** The same for the light "is this the listed item" check at pickup. */
export function readPickupAnswer(answer: unknown): Pick<PickupComparison, "comparable" | "matchesListing" | "note"> | null {
  if (!isRecord(answer) || typeof answer.comparable !== "boolean") return null;
  if (!answer.comparable) return { comparable: false, matchesListing: "unsure", note: "" };
  const matchesListing = MATCHES.includes(answer.matchesListing as ListingMatch) ? (answer.matchesListing as ListingMatch) : "unsure";
  const note = clean(answer.note, 200).replace(/[.\s]+$/, "");
  return { comparable: true, matchesListing, note: matchesListing === "yes" ? "" : note };
}

// ---------------------------------------------------------------- reading what's stored

const photoList = (value: unknown) => (Array.isArray(value) ? value.filter((p): p is string => typeof p === "string") : []);

/** Reads `HandoverCheck.aiComparison` defensively: it is JSON, so nothing about its shape is guaranteed. */
export function parseStoredComparison(value: unknown): StoredComparison | null {
  if (!isRecord(value) || value.v !== 1 || typeof value.at !== "string") return null;
  if (value.status === "pending" || value.status === "failed") return { v: 1, status: value.status, at: value.at };
  if (value.status !== "done" || typeof value.comparable !== "boolean") return null;
  const base = { v: 1 as const, status: "done" as const, at: value.at, comparable: value.comparable, referencePhotos: photoList(value.referencePhotos), photos: photoList(value.photos) };
  if (value.stage === "RETURN") {
    const read = readReturnAnswer(value, base.photos.length);
    return read ? { ...base, stage: "RETURN", ...read } : null;
  }
  if (value.stage === "PICKUP") {
    const read = readPickupAnswer(value);
    return read ? { ...base, stage: "PICKUP", ...read } : null;
  }
  return null;
}

export type ComparisonState = "run" | "waiting" | "failed" | "done";

/** What the booking page should do for a check: start a comparison, wait for one, offer a retry, or show the result. */
export function comparisonState(stored: StoredComparison | null, now: number): ComparisonState {
  if (!stored) return "run";
  if (stored.status === "done" || stored.status === "failed") return stored.status;
  const started = Date.parse(stored.at);
  return Number.isFinite(started) && now - started < PENDING_TIMEOUT_MS ? "waiting" : "run";
}

// ---------------------------------------------------------------- choosing photos and wording

/** The first few distinct photos, in order. */
export function pickPhotos(photos: string[], max: number): string[] {
  return [...new Set(photos)].slice(0, max);
}

/**
 * True when every return photo is the very same file as a pickup photo. Uploads
 * get a new id each time, so this only happens when a stored photo is reused
 * (the demo's "use the listing photo" button). There is nothing to compare, so
 * no model is asked.
 */
export function sameFiles(referencePhotos: string[], photos: string[]): boolean {
  return photos.length > 0 && photos.every((p) => referencePhotos.includes(p));
}

export function findingCount(c: ReturnComparison): number {
  return c.differences.length + c.missingParts.length;
}

/** The one-line result, used as the panel heading and in the booking timeline. */
export function comparisonHeadline(c: DoneComparison): string {
  if (c.stage === "PICKUP") {
    if (!c.comparable || c.matchesListing === "unsure") return "Couldn't tell from the photos whether this is the listed item";
    return c.matchesListing === "yes" ? "This looks like the listed item" : "This may not be the listed item";
  }
  if (!c.comparable) return "Couldn't compare these photos reliably";
  const count = findingCount(c);
  if (count === 0) return "Looks the same as at pickup";
  return `${count} possible ${count === 1 ? "difference" : "differences"} to check`;
}

/** "Lens cap" → "Lens cap not visible in the return photos". */
export function missingPartLine(part: string): string {
  return `${part.charAt(0).toUpperCase()}${part.slice(1)} not visible in the return photos`;
}

/** Shown under every result, so nobody reads it as a ruling. */
export const ADVISORY_NOTE = "An AI suggestion, not a verdict. Lighting and angle differ between photos, so it can miss things or flag something that isn't there. Check the photos yourselves.";
