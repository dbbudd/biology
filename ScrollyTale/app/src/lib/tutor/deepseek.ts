import type { Completion, ModelProvider } from "./complete";
import { extractJson } from "./prompt";


const BASE = (process.env.DEEPSEEK_BASE ?? "https://api.deepseek.com").replace(/\/$/, "");
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

/**
 * setTimeout(fn, NaN) fires on the next tick, so a malformed TUTOR_TIMEOUT_MS
 * would abort every request immediately instead of letting it run. Anything
 * that is not a finite positive number falls back to the default. The same
 * helper is inlined in ollama.ts, so neither provider imports the other.
 */
function timeoutMs(fallback: number): number {
  const configured = Number(process.env.TUTOR_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

const TIMEOUT_MS = timeoutMs(30_000);

function key(): string | undefined {
  return process.env.DEEPSEEK_API_KEY?.trim() || undefined;
}

/**
 * The same contract as the local provider, over HTTPS.
 *
 * The key is read from the server environment and travels as a header. It is
 * never placed in the prompt, never logged, and never reaches the browser. With
 * no key the provider reports itself unavailable and the bank answers instead.
 */
async function complete(request: Completion): Promise<unknown> {
  const secret = key();
  if (!secret) throw new Error("No key configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      }),
    });

    if (!res.ok) throw new Error(`The provider returned ${res.status}`);

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("The model returned no object");
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

export const deepseekProvider: ModelProvider = {
  id: "deepseek",
  label: `DeepSeek · ${MODEL}`,
  model: MODEL,
  complete,
  available: async () => Boolean(key()),
};
