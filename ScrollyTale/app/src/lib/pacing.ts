import type {
  Band,
  Beat,
  Bridge,
  Commit,
  Evaluation,
  Move,
  Strength,
  Tale,
  TaleState,
} from "./types";

/** Words too common to signal understanding. */
const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "so", "because",
  "of", "to", "in", "on", "at", "by", "for", "with", "from", "into", "out",
  "is", "are", "was", "were", "be", "been", "being", "it", "its", "this",
  "that", "these", "those", "there", "here", "i", "we", "you", "they", "he",
  "she", "my", "our", "your", "their", "as", "not", "no", "does", "do", "did",
  "can", "could", "will", "would", "should", "may", "might", "must", "have",
  "has", "had", "some", "any", "more", "most", "very", "also", "just", "like",
  "about", "which", "what", "when", "where", "how", "why", "who", "all", "each",
]);

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluate(
  text: string,
  concepts: string[],
  previous?: Commit,
): Evaluation {
  const normalised = normalise(text);
  const words = normalised.split(" ").filter((w) => w.length > 0 && !STOP.has(w));
  const matched = concepts.filter((c) => normalised.includes(c.toLowerCase()));
  const missing = concepts.filter((c) => !matched.includes(c));

  let strength: Strength = "empty";
  if (words.length > 0) strength = "thin";
  if (words.length >= 6 && matched.length >= 1) strength = "emerging";
  if (words.length >= 16 && matched.length >= 2) strength = "strong";

  const repeated =
    !!previous && normalised.length > 0 && normalised === normalise(previous.text);

  return { strength, matched, missing, wordCount: words.length, normalised, repeated };
}

/** Pick one move from the beat's authored bank. This is the whole adaptive
 *  layer while there is no API: the guide chooses a move, never an answer. */
export function pickMove(beat: Beat, ev: Evaluation, nudges: number): Move {
  const byWhen = (w: string) => beat.moves.find((m) => m.when === w);

  if (nudges >= 2) {
    return (
      beat.moves.find((m) => m.id === "move-on") ?? {
        id: "move-on",
        when: "always",
        say: "Move to the next step. This one stays recorded as unfinished.",
      }
    );
  }
  if (ev.strength === "empty") return byWhen("empty") ?? beat.moves[0];
  if (ev.strength === "thin") return byWhen("thin") ?? beat.moves[0];
  return byWhen("partial") ?? byWhen("always") ?? beat.moves[0];
}

/**
 * Choose the piece of reading that answers this response.
 *
 * A phrase the student used counts for more than a concept they left out,
 * because the sentence they wrote is the best evidence of where they are.
 */
export function pickBridge(beat: Beat, ev: Evaluation): Bridge | undefined {
  const bridges = beat.bridges ?? [];
  if (bridges.length === 0) return undefined;

  let best: { bridge: Bridge; score: number } | null = null;

  for (const bridge of bridges) {
    let score = 0;
    for (const trigger of bridge.triggers) {
      if (ev.normalised.includes(trigger.toLowerCase())) score += 3;
    }
    for (const covered of bridge.covers) {
      if (ev.missing.includes(covered)) score += 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { bridge, score };
  }

  return best?.bridge ?? bridges[0];
}

export function bandFor(strength: Strength, nudges: number): Band {
  if (strength === "strong" && nudges === 0) return "Exhibiting with Depth";
  if (strength === "strong") return "Exhibiting";
  if (strength === "emerging" && nudges === 0) return "Exhibiting";
  if (strength === "emerging") return "Developing";
  return "Emerging";
}

export interface BudgetView {
  spentMinutes: number;
  budgetMinutes: number;
  overBudget: boolean;
  beatSpentMinutes: number;
  beatOverBudget: boolean;
}

export function budgetFor(tale: Tale, state: TaleState, beat: Beat, now = Date.now()): BudgetView {
  const started = Date.parse(state.startedAt) || now;
  const beatStart = Date.parse(state.beatStartedAt[beat.id] ?? "") || now;
  const spentMinutes = Math.max(0, (now - started) / 60000);
  const beatSpentMinutes = Math.max(0, (now - beatStart) / 60000);
  return {
    spentMinutes,
    budgetMinutes: tale.budgetMinutes,
    overBudget: spentMinutes > tale.budgetMinutes * 1.25,
    beatSpentMinutes,
    beatOverBudget: beatSpentMinutes > beat.minutes * 2,
  };
}

/** The designed path, shortened or lengthened only by which evidence is shown,
 *  never by an open-ended chat. */
export function nextBeat(tale: Tale, state: TaleState): { index: number; done: boolean } {
  const next = state.currentBeat + 1;
  return { index: next, done: next >= tale.beats.length };
}
