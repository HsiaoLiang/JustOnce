import { test } from "node:test";
import assert from "node:assert/strict";
import { canSeeListing, checkEmailCode, codeCooldownLeft, communityWords, emailMatchesDomains, maskEmail, normaliseEmail } from "../communities";

test("LBS addresses match, including subdomains and any case", () => {
  assert.equal(emailMatchesDomains("Martin.Hsiao@London.edu", ["london.edu"]), true);
  assert.equal(emailMatchesDomains("m@student.london.edu", ["london.edu"]), true);
});

test("look-alike and personal domains don't match", () => {
  assert.equal(emailMatchesDomains("m@notlondon.edu", ["london.edu"]), false);
  assert.equal(emailMatchesDomains("m@london.edu.evil.com", ["london.edu"]), false);
  assert.equal(emailMatchesDomains("m@gmail.com", ["london.edu"]), false);
  assert.equal(normaliseEmail("not an email"), null);
});

test("emails are masked", () => {
  assert.equal(maskEmail("martin@london.edu"), "ma•••@london.edu");
});

const now = new Date("2026-11-14T12:00:00Z");
const entry = { codeHash: "abc", codeExpiresAt: new Date("2026-11-14T12:10:00Z"), codeAttempts: 0 };

test("the right code is accepted before it expires", () => {
  assert.equal(checkEmailCode(entry, "abc", now), "ok");
  assert.equal(checkEmailCode(entry, "xyz", now), "wrong");
});

test("expired codes are rejected and 5 wrong tries lock the code", () => {
  assert.equal(checkEmailCode(entry, "abc", new Date("2026-11-14T12:20:00Z")), "expired");
  assert.equal(checkEmailCode({ ...entry, codeAttempts: 5 }, "abc", now), "too-many");
});

const membersOnly = { ownerId: "owner", communityId: "lbs", communityOnly: true };

test("members-only listings are hidden from signed-out people and other communities", () => {
  assert.equal(canSeeListing(membersOnly, null), false);
  assert.equal(canSeeListing(membersOnly, { id: "x", communityIds: ["ucl"] }), false);
});

test("members-only listings are visible to verified members and the owner", () => {
  assert.equal(canSeeListing(membersOnly, { id: "x", communityIds: ["lbs"] }), true);
  assert.equal(canSeeListing(membersOnly, { id: "owner", communityIds: [] }), true);
});

test("community listings that aren't members-only are public", () => {
  assert.equal(canSeeListing({ ...membersOnly, communityOnly: false }, null), true);
});

test("a new code can only be sent a minute after the last one", () => {
  const issued = new Date("2026-11-14T12:00:00Z");
  const expires = new Date(issued.getTime() + 15 * 60_000);
  assert.equal(codeCooldownLeft(expires, new Date("2026-11-14T12:00:20Z")), 40);
  assert.equal(codeCooldownLeft(expires, new Date("2026-11-14T12:01:00Z")), 0);
  assert.equal(codeCooldownLeft(null, issued), 0);
});

test("companies get work wording, schools get school wording", () => {
  assert.equal(communityWords("COMPANY").email, "work email");
  assert.equal(communityWords("UNIVERSITY").idCard, "student ID card");
});
