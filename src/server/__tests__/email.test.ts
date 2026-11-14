import { test } from "node:test";
import assert from "node:assert/strict";
import { verificationEmail } from "../email";

test("verification email carries the code and its lifetime", () => {
  const e = verificationEmail({ code: "482913", communityName: "London Business School", minutes: 15 });
  assert.match(e.subject, /^482913 /);
  assert.ok(e.html.includes("482913") && e.text.includes("15 minutes"));
});

test("community names are escaped in the HTML body", () => {
  const e = verificationEmail({ code: "000001", communityName: "<script>", minutes: 15 });
  assert.ok(!e.html.includes("<script>"));
});
