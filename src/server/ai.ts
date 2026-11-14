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

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
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

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // 429 on a free tier usually means the per-minute or per-day quota is used up.
    const retryable = response.status >= 500;
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new AiUnavailableError(`AI provider answered ${response.status}: ${detail}`, retryable);
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
  if (!provider) throw new AiUnavailableError("No AI key set");
  const ask = provider === "gemini" ? askGemini : askAnthropic;
  try {
    return await ask(options);
  } catch (first) {
    // Server hiccups and dropped connections are worth one more go. A rejected request is not,
    // and neither is a timeout: a second 25 seconds would outlast the page waiting for us.
    if (first instanceof AiUnavailableError && !first.retryable) throw first;
    const name = (first as { name?: string } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new AiUnavailableError(`The AI provider took longer than ${TIMEOUT_MS / 1000} seconds to answer`);
    }
    try {
      return await ask(options);
    } catch (second) {
      if (second instanceof AiUnavailableError) throw second;
      throw new AiUnavailableError(second instanceof Error ? second.message : "AI call failed");
    }
  }
}
