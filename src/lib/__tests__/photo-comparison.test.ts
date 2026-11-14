import assert from "node:assert/strict";
import { test } from "node:test";
import {
  comparisonHeadline,
  comparisonState,
  hedge,
  missingPartLine,
  parseStoredComparison,
  PENDING_TIMEOUT_MS,
  pickPhotos,
  readPickupAnswer,
  readReturnAnswer,
  sameFiles,
  type PickupComparison,
  type ReturnComparison,
} from "../photo-comparison";

const done = (extra: Partial<ReturnComparison> = {}): ReturnComparison => ({
  v: 1,
  status: "done",
  at: "2026-11-14T10:00:00.000Z",
  stage: "RETURN",
  comparable: true,
  differences: [],
  missingParts: [],
  referencePhotos: ["/seed/listings/creator-kit-1.jpg"],
  photos: ["/seed/checks/creator-kit-return-1.jpg"],
  ...extra,
});

test("findings are always worded as possibilities", () => {
  assert.equal(hedge("Possible new scratch on the lens ring."), "Possible new scratch on the lens ring");
  assert.equal(hedge("Lens cap not visible"), "Lens cap not visible");
  assert.equal(hedge("New scratch on the lens ring"), "Possible change: new scratch on the lens ring");
  assert.equal(hedge("The strap is torn."), "Possible change: the strap is torn");
});

test("a return answer keeps only what can be trusted", () => {
  const read = readReturnAnswer(
    {
      comparable: true,
      differences: [
        { description: "Possible new scratch on the lens ring", photoIndex: 2, confidence: "medium" },
        { description: "Dent in the base", photoIndex: 9, confidence: "certain" },
        { description: "   ", photoIndex: 1, confidence: "high" },
        "not an object",
      ],
      missingParts: ["lens cap", "Lens cap.", "", 4],
    },
    2,
  );
  assert.deepEqual(read, {
    comparable: true,
    differences: [
      { description: "Possible new scratch on the lens ring", photoIndex: 2, confidence: "medium" },
      { description: "Possible change: dent in the base", photoIndex: null, confidence: "low" },
    ],
    missingParts: ["lens cap"],
  });
});

test("photos that can't be compared never carry findings", () => {
  assert.deepEqual(readReturnAnswer({ comparable: false, differences: [{ description: "Possible scratch", photoIndex: 1, confidence: "high" }], missingParts: ["Strap"] }, 1), {
    comparable: false,
    differences: [],
    missingParts: [],
  });
});

test("an unusable answer is rejected instead of guessed at", () => {
  assert.equal(readReturnAnswer(null, 1), null);
  assert.equal(readReturnAnswer("looks fine", 1), null);
  assert.equal(readReturnAnswer({ differences: [] }, 1), null);
  assert.equal(readPickupAnswer({ matchesListing: "yes" }), null);
});

test("the pickup check falls back to 'unsure'", () => {
  assert.deepEqual(readPickupAnswer({ comparable: true, matchesListing: "yes", note: "Same camera." }), { comparable: true, matchesListing: "yes", note: "" });
  assert.deepEqual(readPickupAnswer({ comparable: true, matchesListing: "definitely", note: "A different colour strap. " }), {
    comparable: true,
    matchesListing: "unsure",
    note: "A different colour strap",
  });
  assert.deepEqual(readPickupAnswer({ comparable: false, matchesListing: "no", note: "Too dark" }), { comparable: false, matchesListing: "unsure", note: "" });
});

test("headlines match what was found", () => {
  assert.equal(comparisonHeadline(done()), "Looks the same as at pickup");
  assert.equal(comparisonHeadline(done({ missingParts: ["Microphone"] })), "1 possible difference to check");
  assert.equal(
    comparisonHeadline(done({ missingParts: ["Microphone"], differences: [{ description: "Possible new scratch", photoIndex: 1, confidence: "low" }] })),
    "2 possible differences to check",
  );
  assert.equal(comparisonHeadline(done({ comparable: false })), "Couldn't compare these photos reliably");
  const pickup: Omit<PickupComparison, "matchesListing"> = { v: 1, status: "done", at: "2026-11-14T10:00:00.000Z", stage: "PICKUP", comparable: true, note: "", referencePhotos: [], photos: [] };
  assert.equal(comparisonHeadline({ ...pickup, matchesListing: "yes" }), "This looks like the listed item");
  assert.equal(comparisonHeadline({ ...pickup, matchesListing: "no" }), "This may not be the listed item");
  assert.equal(comparisonHeadline({ ...pickup, matchesListing: "unsure" }), "Couldn't tell from the photos whether this is the listed item");
  assert.equal(missingPartLine("lens cap"), "Lens cap not visible in the return photos");
});

test("stored comparisons are read back defensively", () => {
  const stored = done({ missingParts: ["Microphone"] });
  assert.deepEqual(parseStoredComparison(JSON.parse(JSON.stringify(stored))), stored);
  assert.deepEqual(parseStoredComparison({ v: 1, status: "pending", at: "2026-11-14T10:00:00.000Z", extra: true }), { v: 1, status: "pending", at: "2026-11-14T10:00:00.000Z" });
  assert.equal(parseStoredComparison(null), null);
  assert.equal(parseStoredComparison({ v: 2, status: "done" }), null);
  assert.equal(parseStoredComparison({ v: 1, status: "done", at: "x", stage: "RETURN" }), null);
});

test("a comparison runs once, and a stuck one can be started again", () => {
  const now = Date.parse("2026-11-14T10:05:00.000Z");
  assert.equal(comparisonState(null, now), "run");
  assert.equal(comparisonState(done(), now), "done");
  assert.equal(comparisonState({ v: 1, status: "failed", at: new Date(now).toISOString() }, now), "failed");
  assert.equal(comparisonState({ v: 1, status: "pending", at: new Date(now - 5_000).toISOString() }, now), "waiting");
  assert.equal(comparisonState({ v: 1, status: "pending", at: new Date(now - PENDING_TIMEOUT_MS - 1).toISOString() }, now), "run");
});

test("identical files are recognised without asking a model", () => {
  assert.ok(sameFiles(["/a.jpg", "/b.jpg"], ["/b.jpg"]));
  assert.ok(!sameFiles(["/a.jpg"], ["/a.jpg", "/c.jpg"]));
  assert.ok(!sameFiles(["/a.jpg"], []));
  assert.deepEqual(pickPhotos(["/a.jpg", "/a.jpg", "/b.jpg", "/c.jpg"], 2), ["/a.jpg", "/b.jpg"]);
});
