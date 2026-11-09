import type { Beat } from "../types";
import { SYSTEM, extractJson, userMessage } from "./prompt";
import type { TutorDecision, TutorInput, TutorProvider } from "./types";

const BASE = (process.env.OLLAMA_BASE ?? "http://localhost:11434").replace(/\/$/, "");
export const OLLAMA_MODEL = process.env.TUTOR_MODEL ?? "qwen3:30b-a3b";
const TIMEOUT_MS = Number(process.env.TUTOR_TIMEOUT_MS ?? 60000);

/**
 * The model classifies one answer and returns ids. The system prompt carries no
 * answer key, so a model that ignores every instruction still cannot state the
 * explanation the step is holding back.
 */
async function decide(input: TutorInput, _beat: Beat): Promise<TutorDecision> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        think: false,
        options: { temperature: 0.2, num_ctx: 4096, num_predict: 300 },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMessage(input) },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

    const body = (await res.json()) as { message?: { content?: string } };
    const parsed = extractJson(body.message?.content ?? "");
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("The model returned no object");
    }
    return parsed as TutorDecision;
  } finally {
    clearTimeout(timer);
  }
}

export const ollamaProvider: TutorProvider = {
  id: "ollama",
  label: `Ollama · ${OLLAMA_MODEL}`,
  model: OLLAMA_MODEL,
  available: async () => {
    try {
      const res = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) return false;
      const body = (await res.json()) as { models?: { name: string }[] };
      return (body.models ?? []).some((m) => m.name === OLLAMA_MODEL);
    } catch {
      return false;
    }
  },
  decide,
};
