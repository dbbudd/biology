import type { Beat } from "../types";
import { SYSTEM, extractJson, userMessage } from "./prompt";
import type { TutorDecision, TutorInput, TutorProvider } from "./types";

const BASE = (process.env.DEEPSEEK_BASE ?? "https://api.deepseek.com").replace(/\/$/, "");
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
const TIMEOUT_MS = Number(process.env.TUTOR_TIMEOUT_MS ?? 30000);

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
async function decide(input: TutorInput, _beat: Beat): Promise<TutorDecision> {
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
          { role: "system", content: SYSTEM },
          { role: "user", content: userMessage(input) },
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
    return parsed as TutorDecision;
  } finally {
    clearTimeout(timer);
  }
}

export const deepseekProvider: TutorProvider = {
  id: "deepseek",
  label: `DeepSeek · ${MODEL}`,
  model: MODEL,
  available: async () => Boolean(key()),
  decide,
};
