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

/**
 * The shape every provider shares, whichever of the two interfaces it comes
 * from. It is all the availability cache needs, and all it touches.
 */
interface ProviderBase {
  id: string;
  label: string;
  model?: string;
  available(): Promise<boolean>;
}

const AVAILABILITY_TTL_MS = 10_000;

interface Probe {
  /** when this answer stops being trusted */
  expires: number;
  /** the shared in-flight or settled answer, so callers join one probe */
  answer: Promise<boolean>;
}

const probes = new Map<string, Probe>();

/**
 * An availability probe is free for the bank, cheap for DeepSeek, and a real
 * HTTP request with a 1500 ms ceiling for Ollama. A single message used to ask
 * up to three times — the route, decide(), and providerStatus() — so students
 * paid for that probe on every message. The answer is now shared per provider
 * id for ten seconds.
 *
 * The promise is stored, not just its value, so two callers in the same tick
 * join one probe rather than racing two. Unavailable is cached like anything
 * else and expires with the TTL; nothing here is cached permanently.
 */
function withCachedAvailability<T extends ProviderBase>(provider: T): T {
  const available = (): Promise<boolean> => {
    const now = Date.now();
    const cached = probes.get(provider.id);
    if (cached && cached.expires > now) return cached.answer;

    const answer = provider.available();
    probes.set(provider.id, { expires: now + AVAILABILITY_TTL_MS, answer });
    // A rejected probe says something about the probe, not about the provider,
    // so its entry is dropped and the next call tries again instead of caching
    // the error for ten seconds.
    answer.catch(() => {
      if (probes.get(provider.id)?.answer === answer) probes.delete(provider.id);
    });
    return answer;
  };

  return { ...provider, available };
}

const PROVIDERS: Record<string, TutorProvider | ModelProvider> = {
  bank: withCachedAvailability(bankProvider),
  ollama: withCachedAvailability(ollamaProvider),
  deepseek: withCachedAvailability(deepseekProvider),
};

export const DEFAULT_PROVIDER = process.env.TUTOR_PROVIDER ?? "bank";

export function providerFor(id?: string): TutorProvider | ModelProvider {
  return PROVIDERS[id ?? DEFAULT_PROVIDER] ?? PROVIDERS.bank;
}

/**
 * The bank decides; the model providers complete. This is the one place the
 * union is told apart, so the callers below never need a cast.
 */
function isModelProvider(
  provider: TutorProvider | ModelProvider,
): provider is ModelProvider {
  return "complete" in provider;
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

  if (!isModelProvider(provider)) {
    return { decision: fallback, provider: "bank", latencyMs: 0, fellBack: true, error: "No model" };
  }

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
    const raw = (await provider.complete({
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
  return isModelProvider(provider) ? provider : null;
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
