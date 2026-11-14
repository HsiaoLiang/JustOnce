import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyAiFailure } from "../ai";

// Error bodies in the shape Google's and Anthropic's APIs return them.
const gemini = (code: number, status: string, message: string, reason = "") =>
  JSON.stringify({ error: { code, message, status, ...(reason ? { details: [{ reason }] } : {}) } });
const anthropic = (type: string, message: string) => JSON.stringify({ type: "error", error: { type, message } });

test("a used-up quota is recognised for both providers", () => {
  assert.equal(classifyAiFailure(429, gemini(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota. Quota exceeded for metric: generate_content_free_tier_requests, limit: 20, model: gemini-3.5-flash-lite")), "quota");
  assert.equal(classifyAiFailure(429, anthropic("rate_limit_error", "Number of requests has exceeded your rate limit")), "quota");
  assert.equal(classifyAiFailure(400, anthropic("invalid_request_error", "Your credit balance is too low to access the Anthropic API.")), "quota");
});

test("a wrong or revoked key is recognised", () => {
  assert.equal(classifyAiFailure(400, gemini(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", "API_KEY_INVALID")), "key");
  assert.equal(classifyAiFailure(403, gemini(403, "PERMISSION_DENIED", "Generative Language API has not been used in project 123 before or it is disabled.")), "key");
  assert.equal(classifyAiFailure(401, anthropic("authentication_error", "invalid x-api-key")), "key");
});

test("a model that doesn't exist is recognised", () => {
  assert.equal(classifyAiFailure(404, gemini(404, "NOT_FOUND", "models/gemini-9-flash is not found for API version v1beta, or is not supported for generateContent.")), "model");
  assert.equal(classifyAiFailure(404, anthropic("not_found_error", "model: claude-nonexistent")), "model");
});

test("anything else is a provider problem", () => {
  assert.equal(classifyAiFailure(400, gemini(400, "INVALID_ARGUMENT", "Invalid JSON payload received.")), "provider");
  assert.equal(classifyAiFailure(500, gemini(500, "INTERNAL", "An internal error has occurred.")), "provider");
  assert.equal(classifyAiFailure(529, anthropic("overloaded_error", "Overloaded")), "provider");
});
