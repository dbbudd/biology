import type { Beat } from "../types";
import type { ModelProvider } from "./complete";
import { evaluate, pickBridge, pickMove } from "../pacing";
import { SYSTEM, userMessage } from "./prompt";
import { bankProvider } from "./bank";
import { deepseekProvider } from "./deepseek";
import { ollamaProvider } from "./ollama";
import {
  coerce,
  inputFor,
  type TutorDecision,
  type TutorProvider,
  type TutorResult,
} from "./types";

const PROVIDERS: Record<string, TutorProvider | ModelProvider> = {
  bank: bankProvider,
  ollama: ollamaProvider,
  deepseek: deepseekProvider,
};

export const DEFAULT_PROVIDER = process.env.TUTOR_PROVIDER ?? "bank";

export function providerFor(id?: string): TutorProvider | ModelProvider {
  return PROVIDERS[id ?? DEFAULT_PROVIDER] ?? bankProvider;
}

/** What the bank would say. Used as the shape every provider must respect. */
function bankDecision(beat: Beat, text: string): TutorDecision {
  const ev = evaluate(text, beat.concepts);
  const move = pickMove(beat, ev, 0);
  const needsReading = ev.strength === "thin" || ev.strength === "empty";
  const bridge = needsReading ? pickBridge(beat, ev) : undefined;
  return {
    depth: ev.strength === "empty" ? "empty" : ev.strength === "thin" ? "label" : "mechanism",
    strength: ev.strength,
    missing: ev.missing.slice(0, 6),
    moveId: move.id,
    bridgeId: bridge?.id ?? null,
    note: "authored bank",
  };
}

/**
 * Whether a step shows reading is a product rule, not a judgement to delegate.
 * A model that classifies well can still hand a student a section they did not
 * need, so the decision is applied here, after classification.
 */
function applyPolicy(decision: TutorDecision, fallback: TutorDecision): TutorDecision {
  const needsReading = decision.strength === "thin" || decision.strength === "empty";

  if (!needsReading) {
    return decision.bridgeId === null
      ? decision
      : { ...decision, bridgeId: null, note: `${decision.note ?? ""} reading withheld`.trim() };
  }

  // An empty answer gives the model nothing to match on, so the beat's own
  // first bridge is used rather than a guess.
  if (decision.strength === "empty") {
    return {
      ...decision,
      bridgeId: fallback.bridgeId,
      moveId: decision.moveId || fallback.moveId,
    };
  }

  return decision.bridgeId ? decision : { ...decision, bridgeId: fallback.bridgeId };
}

export async function decide(
  beat: Beat,
  text: string,
  providerId?: string,
): Promise<TutorResult> {
  const started = Date.now();
  const provider = providerFor(providerId);
  const input = inputFor(beat, text);
  const fallback = bankDecision(beat, text);

  if (provider.id === "bank") {
    return {
      decision: fallback,
      provider: provider.id,
      latencyMs: Date.now() - started,
      fellBack: false,
    };
  }

  if (!("complete" in provider)) return { decision: fallback, provider: "bank", latencyMs: 0, fellBack: true, error: "No model" };

  if (!(await provider.available())) {
    return {
      decision: fallback,
      provider: "bank",
      latencyMs: Date.now() - started,
      fellBack: true,
      error: `${provider.label} is not available`,
    };
  }

  try {
    const raw = (await (provider as ModelProvider).complete({
      system: SYSTEM,
      user: userMessage(input),
    })) as Partial<TutorDecision>;
    return {
      decision: applyPolicy(coerce(raw, input, fallback), fallback),
      provider: provider.id,
      model: provider.model,
      latencyMs: Date.now() - started,
      fellBack: false,
    };
  } catch (error) {
    return {
      decision: fallback,
      provider: "bank",
      latencyMs: Date.now() - started,
      fellBack: true,
      error: error instanceof Error ? error.message : "The provider failed",
    };
  }
}

/** A model provider, or null when the configured one is the authored bank. */
export function modelProvider(id?: string): ModelProvider | null {
  const provider = providerFor(id);
  if (!("complete" in provider)) return null;
  return provider as ModelProvider;
}

export async function providerStatus() {
  const provider = providerFor();
  return {
    provider: provider.id,
    label: provider.label,
    model: provider.model ?? null,
    available: await provider.available(),
    configured: [...Object.keys(PROVIDERS)],
  };
}
