// The one place that talks to the AI provider. Server-only: the API key never
// reaches the browser. Every AI feature goes through `askVisionModel`, and every
// caller must cope with it throwing, so the app works the same with no key set.
// Only import this from server code (routes, server actions, server components).

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-5-5";
const TIMEOUT_MS = 10_000;

export class AiUnavailableError extends Error {}

/** AI features hide themselves when this is false. */
export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface AiImage {
  mimeType: string;
  data: Uint8Array;
}

interface AskOptions {
  system: string;
  prompt: string;
  images: AiImage[];
  /** The model must answer by filling in this JSON schema. */
  schema: { name: string; description: string; json: object };
}

async function callOnce({ system, prompt, images, schema }: AskOptions): Promise<unknown> {
  const response = await fetch(API_URL, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || DEFAULT_MODEL,
      max_tokens: 1024,
      system,
      tools: [{ name: schema.name, description: schema.description, input_schema: schema.json }],
      tool_choice: { type: "tool", name: schema.name },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((image) => ({
              type: "image",
              source: { type: "base64", media_type: image.mimeType, data: Buffer.from(image.data).toString("base64") },
            })),
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw Object.assign(new AiUnavailableError(`AI provider answered ${response.status}`), { retryable });
  }
  const body = (await response.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
  const answer = body.content?.find((block) => block.type === "tool_use" && block.name === schema.name);
  if (!answer) throw new AiUnavailableError("AI provider returned no structured answer");
  return answer.input;
}

/**
 * Sends photos and a prompt to the vision model and returns its structured
 * answer, unvalidated: callers parse it with their own zod schema. One retry on
 * timeouts and provider hiccups, then it throws AiUnavailableError.
 */
export async function askVisionModel(options: AskOptions): Promise<unknown> {
  if (!aiEnabled()) throw new AiUnavailableError("No ANTHROPIC_API_KEY set");
  try {
    return await callOnce(options);
  } catch (first) {
    const retryable = !(first instanceof AiUnavailableError) || (first as { retryable?: boolean }).retryable;
    if (!retryable) throw first;
    try {
      return await callOnce(options);
    } catch (second) {
      if (second instanceof AiUnavailableError) throw second;
      throw new AiUnavailableError(second instanceof Error ? second.message : "AI call failed");
    }
  }
}
