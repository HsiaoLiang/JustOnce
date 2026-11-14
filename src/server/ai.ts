// The one place that talks to an AI provider. Server-only: API keys never
// reach the browser. Every AI feature goes through `askVisionModel`, and every
// caller must cope with it throwing, so the app works the same with no key set.
// Only import this from server code (routes, server actions, server components).
//
// Two providers are supported and the features don't care which is in use:
//   - Anthropic (ANTHROPIC_API_KEY), paid per call.
//   - Google Gemini (GEMINI_API_KEY), which has a free tier.
// With both keys set, Anthropic is used unless AI_PROVIDER="gemini".

// Vision calls with a little model "thinking" can take well over ten seconds on a free tier.
const TIMEOUT_MS = 25_000;

type Provider = "anthropic" | "gemini";

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-5-5",
  // Fast and answers reliably on a free key. gemini-3.6-flash is a step up in quality if it is quick for you;
  // gemini-3.7-flash and 3.8-flash stalled without answering on a free key when we tried them (Nov 2026).
  gemini: "gemini-3.5-flash-lite",
};
const MODEL_PREFIX: Record<Provider, string> = { anthropic: "claude", gemini: "gemini" };

/**
 * Why an AI call failed, in terms someone can act on. Safe to show and to return from APIs:
 * it never contains the key or the provider's raw message.
 *   quota   the key's rate or daily limit is used up (or, on Anthropic, the credit balance)
 *   key     the key is missing, wrong, revoked or not allowed to use this API
 *   model   the configured model doesn't exist (any more) for this key
 *   timeout the provider took too long
 *   provider anything else: the provider had a problem or returned something unusable
 */
export type AiFailure = "quota" | "key" | "model" | "timeout" | "provider";

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
    readonly kind: AiFailure = "provider",
  ) {
    super(message);
  }
}

/** Reads the provider's status code and error body into an AiFailure. */
export function classifyAiFailure(status: number, detail: string): AiFailure {
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit|credit balance/i.test(detail)) return "quota";
  if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|API key expired|PERMISSION_DENIED|authentication_error|invalid x-api-key/i.test(detail)) return "key";
  if (status === 404 || /is not found for API version|not supported for generateContent|not_found_error|model: /i.test(detail)) return "model";
  return "provider";
}

export function aiFailureKind(error: unknown): AiFailure {
  return error instanceof AiUnavailableError ? error.kind : "provider";
}

/** One plain sentence for people, by failure kind. Callers add what to do instead. */
export function aiProblemSentence(kind: AiFailure): string {
  switch (kind) {
    case "quota":
      return "The AI has used up its quota for now.";
    case "key":
    case "model":
      return "The AI isn't set up correctly right now.";
    case "timeout":
      return "The AI took too long to answer.";
    default:
      return "The AI couldn't answer just now.";
  }
}

// After a quota error, background lookups (buy prices) stand down for a while so the features people
// are actively using get whatever quota is left. In memory, so it's per server instance: best effort.
const QUOTA_PAUSE_MS = 15 * 60_000;
let quotaPausedUntil = 0;
export function aiQuotaPaused(): boolean {
  return Date.now() < quotaPausedUntil;
}

/** Which provider is configured, or null when no usable key is set. */
export function aiProvider(): Provider | null {
  const anthropic = !!process.env.ANTHROPIC_API_KEY;
  const gemini = !!process.env.GEMINI_API_KEY;
  const wanted = process.env.AI_PROVIDER?.toLowerCase();
  if (wanted === "gemini" && gemini) return "gemini";
  if (wanted === "anthropic" && anthropic) return "anthropic";
  if (anthropic) return "anthropic";
  if (gemini) return "gemini";
  return null;
}

/** The underlying reason for a failed call, for the browser's network tab. Only in development, never in production. */
export function devDetail(error: unknown): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  return error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400);
}

/** AI features hide themselves when this is false. */
export function aiEnabled(): boolean {
  return aiProvider() !== null;
}

/** AI_MODEL only applies when it names a model from the provider in use, so a leftover value can't break the other one. */
function modelFor(provider: Provider): string {
  const chosen = process.env.AI_MODEL?.trim();
  return chosen && chosen.startsWith(MODEL_PREFIX[provider]) ? chosen : DEFAULT_MODELS[provider];
}

export interface AiImage {
  mimeType: string;
  data: Uint8Array;
}

interface AskOptions {
  system: string;
  prompt: string;
  /** Photos to look at. Pass an empty list for a text-only question. */
  images: AiImage[];
  /**
   * The model must answer by filling in this JSON schema. Keep it plain so both
   * providers accept it: one type per field, no nulls (use "" or leave optional
   * fields out of `required`).
   */
  schema: { name: string; description: string; json: object };
}

const base64 = (image: AiImage) => Buffer.from(image.data).toString("base64");

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs = TIMEOUT_MS): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // 429 on a free tier usually means the per-minute or per-day quota is used up.
    const retryable = response.status >= 500;
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    const kind = classifyAiFailure(response.status, detail);
    if (kind === "quota") quotaPausedUntil = Date.now() + QUOTA_PAUSE_MS;
    // The status and the provider's own words go to the server log (Vercel → Logs), never to the browser in production.
    throw new AiUnavailableError(`AI provider answered ${response.status}: ${detail}`, retryable, kind);
  }
  return response.json();
}

async function askAnthropic({ system, prompt, images, schema }: AskOptions): Promise<unknown> {
  const body = (await post(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    {
      model: modelFor("anthropic"),
      max_tokens: 1024,
      system,
      tools: [{ name: schema.name, description: schema.description, input_schema: schema.json }],
      tool_choice: { type: "tool", name: schema.name },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((image) => ({ type: "image", source: { type: "base64", media_type: image.mimeType, data: base64(image) } })),
            { type: "text", text: prompt },
          ],
        },
      ],
    },
  )) as { content?: { type: string; name?: string; input?: unknown }[] };
  const answer = body.content?.find((block) => block.type === "tool_use" && block.name === schema.name);
  if (!answer) throw new AiUnavailableError("AI provider returned no structured answer");
  return answer.input;
}

async function askGemini({ system, prompt, images, schema }: AskOptions): Promise<unknown> {
  const model = modelFor("gemini");
  const body = (await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": process.env.GEMINI_API_KEY! },
    {
      system_instruction: { parts: [{ text: system }] },
      contents: [
        {
          role: "user",
          parts: [...images.map((image) => ({ inline_data: { mime_type: image.mimeType, data: base64(image) } })), { text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: schema.json,
        // These are quick look-and-label jobs. Gemini 3+ thinks at a medium level by default, which is slow.
        ...(/^gemini-([3-9]|\d\d)/.test(model) ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
      },
    },
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) throw new AiUnavailableError("AI provider returned no structured answer");
  try {
    return JSON.parse(text);
  } catch {
    throw new AiUnavailableError("AI provider returned an answer that isn't valid JSON");
  }
}

/**
 * Sends photos and a prompt to the configured model and returns its structured
 * answer, unvalidated: callers parse it with their own zod schema. One retry on
 * timeouts and provider hiccups, then it throws AiUnavailableError.
 */
export async function askVisionModel(options: AskOptions): Promise<unknown> {
  const provider = aiProvider();
  if (!provider) throw new AiUnavailableError("No AI key set", false, "key");
  const ask = provider === "gemini" ? askGemini : askAnthropic;
  try {
    return await ask(options);
  } catch (first) {
    // Server hiccups and dropped connections are worth one more go. A rejected request is not,
    // and neither is a timeout: a second 25 seconds would outlast the page waiting for us.
    if (first instanceof AiUnavailableError && !first.retryable) throw first;
    const name = (first as { name?: string } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new AiUnavailableError(`The AI provider took longer than ${TIMEOUT_MS / 1000} seconds to answer`, false, "timeout");
    }
    try {
      return await ask(options);
    } catch (second) {
      if (second instanceof AiUnavailableError) throw second;
      throw new AiUnavailableError(second instanceof Error ? second.message : "AI call failed");
    }
  }
}

// ---------------------------------------------------------------- questions answered from a web search

export interface WebSource {
  title: string;
  url: string;
}

export interface WebAnswer {
  /** The structured answer, unvalidated, as with askVisionModel. */
  answer: unknown;
  /** Pages the model's web search returned. Empty when it answered without searching. */
  sources: WebSource[];
}

// Searching takes longer than a plain answer, but the fallback below still has to fit in the route's time limit.
const SEARCH_TIMEOUT_MS = 20_000;

/** Models sometimes wrap JSON in a code fence or a sentence when a tool is in play. */
function parseLooseJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new AiUnavailableError("AI provider returned no structured answer");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AiUnavailableError("AI provider returned an answer that isn't valid JSON");
  }
}

async function askGeminiWithSearch({ system, prompt, schema }: Omit<AskOptions, "images">): Promise<WebAnswer> {
  const model = modelFor("gemini");
  const body = (await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": process.env.GEMINI_API_KEY! },
    {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // Grounding with Google Search: the model runs searches, reads the results, then answers.
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema.json },
    },
    SEARCH_TIMEOUT_MS,
  )) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
    }[];
  };
  const candidate = body.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const sources = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((chunk) => ({ title: chunk.web?.title ?? "", url: chunk.web?.uri ?? "" }))
    .filter((source) => source.url);
  return { answer: parseLooseJson(text), sources };
}

/**
 * A text question the model answers after searching the web (retrieve, then
 * generate). Search is Gemini's "Grounding with Google Search". When that isn't
 * available (Anthropic is the provider, the key's plan doesn't include search, or
 * the search call fails), the same question is asked without it and `sources` is
 * empty, so callers can say whether the answer had a search behind it.
 * Throws AiUnavailableError like askVisionModel.
 */
export async function askWithWebSearch(options: Omit<AskOptions, "images">): Promise<WebAnswer> {
  const provider = aiProvider();
  if (!provider) throw new AiUnavailableError("No AI key set", false, "key");
  if (provider === "gemini") {
    try {
      return await askGeminiWithSearch(options);
    } catch (error) {
      // Asking again without search only helps when search itself was the problem. With the quota used up,
      // a bad key or a missing model, the second call fails the same way and just uses up more quota.
      const kind = aiFailureKind(error);
      if (kind === "quota" || kind === "key" || kind === "model") throw error;
      if (process.env.NODE_ENV !== "production") console.warn("[ai] web search unavailable, asking without it:", error instanceof Error ? error.message.slice(0, 300) : error);
    }
  }
  return { answer: await askVisionModel({ ...options, images: [] }), sources: [] };
}
