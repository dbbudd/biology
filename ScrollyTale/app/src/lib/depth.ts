/**
 * How far a student has moved towards each learning target, read from the words
 * they have written.
 *
 * This is a heuristic over the student's own sentences, and nothing more. It is
 * not a grade and not a judgement of the student. It cannot see understanding:
 * all it can see is which of a target's vocabulary words appear in a message,
 * and the strength the model judged that message to have. A student who
 * understands a target but writes about something else reads as untouched, and
 * a sentence that repeats a target's word without an idea behind it still
 * counts as touching it. Treat the band as a hint about what to read or say
 * next, never as a verdict on the student.
 *
 * Depth is not reachable from one sentence. A target needs at least two messages
 * that touch it before it can read Exhibiting with Depth: one sentence can name
 * both of a target's words, and naming both words is not depth.
 *
 * No target is ever dropped. If a target's anchors match no section of the
 * reader, its vocabulary is empty and it is still returned, as not started.
 */
import concepts from "../data/concepts.generated.json";
import generated from "../data/targets.generated.json";
import { bandFor } from "./pacing";
import type { Band, Strength } from "./types";

export interface Message {
  text: string;
  strength?: Strength;
}

export interface TargetState {
  text: string;
  group: string;
  standard: string | null;
  kind: string | null;
  anchors: string[];
  band: Band | null;
  /** target vocabulary actually used, lowercased, alphabetical, at most 8 */
  touched: string[];
  /** up to 2 of the student's own sentences, verbatim, at most 160 characters */
  evidence: string[];
}

export interface Edge {
  text: string;
  why: string;
}

/** One learning target, flattened out of its unit and group. */
export interface Target {
  text: string;
  group: string;
  standard: string | null;
  kind: string | null;
  anchors: string[];
  unit: string;
  source: string;
}

/** The unit the reader opens on, and the default for a request that names none. */
export const DEFAULT_UNIT = "u2";

const DEPTH: Band = "Exhibiting with Depth";

const BAND_RANK: Record<Band, number> = {
  Emerging: 1,
  Developing: 2,
  Exhibiting: 3,
  "Exhibiting with Depth": 4,
};

const TOUCHED_MAX = 8;
const EVIDENCE_MAX = 2;
const EVIDENCE_CHARS = 160;

// ---------------------------------------------------------------- targets
interface GeneratedTarget {
  text: string;
  at: string[];
  kind: string | null;
}

interface GeneratedGroup {
  heading: string;
  standard: string | null;
  targets: GeneratedTarget[];
}

interface GeneratedUnit {
  unit: string;
  source: string;
  groups: GeneratedGroup[];
}

const UNITS = (generated as unknown as { units?: GeneratedUnit[] }).units ?? [];

/** Every target in the reader, in authored order: unit, then group, then target. */
export const TARGETS: Target[] = UNITS.flatMap((entry) =>
  entry.groups.flatMap((group) =>
    group.targets.map((target) => ({
      text: target.text,
      group: group.heading,
      standard: group.standard,
      kind: target.kind,
      anchors: target.at,
      unit: entry.unit,
      source: entry.source,
    })),
  ),
);

export const TARGET_UNITS: string[] = [...new Set(TARGETS.map((target) => target.unit))];

/** True when the reader was generated with learning targets for this unit. */
export function hasUnit(unit: string): boolean {
  return TARGET_UNITS.includes(unit);
}

/** The targets of one unit, in authored order. */
export function targetsFor(unit: string = DEFAULT_UNIT): Target[] {
  return TARGETS.filter((target) => target.unit === unit);
}

// ---------------------------------------------------------------- vocabulary
interface SectionRecord {
  chapter: string;
  id: string;
  terms: string[];
}

/** chapter#section -> the glossary words that section teaches. */
const SECTION_VOCABULARY = new Map<string, Set<string>>();
for (const section of concepts.sections as SectionRecord[]) {
  const key = `${section.chapter}#${section.id}`;
  let words = SECTION_VOCABULARY.get(key);
  if (!words) {
    words = new Set<string>();
    SECTION_VOCABULARY.set(key, words);
  }
  for (const term of section.terms) words.add(term.toLowerCase());
}

/** Function words that carry no target meaning when the target's own wording is
 *  added to its vocabulary. Literal list, no stemming. */
const STOP = new Set([
  "can", "the", "and", "between", "that", "not", "only", "one", "place",
  "another", "from", "into", "with", "for", "its", "use", "using",
  "a", "an", "i", "of", "to", "in", "on", "at", "by", "or", "but", "so", "as",
  "is", "are", "be", "been", "it", "this", "these", "those", "there", "then",
  "than", "if", "when", "where", "which", "what", "how", "why", "who", "do",
  "does", "did", "has", "have", "had", "was", "were", "will", "would",
  "should", "could", "may", "might", "must", "more", "most", "very", "also",
  "just", "like", "about", "both", "no", "all", "any", "each", "such", "used",
  "over", "within", "across", "through", "during", "after", "before", "while",
  "among", "onto", "upon", "per", "via", "other", "same", "rather", "whether",
]);

/** The content words of one sentence: lowercase, punctuation stripped, tokens of
 *  three characters or fewer and stopwords dropped. No stemming, no synonyms. */
function contentWords(text: string): string[] {
  const words = new Set<string>();
  for (const token of text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)) {
    if (token.length <= 3 || STOP.has(token)) continue;
    words.add(token);
  }
  return [...words];
}

/**
 * The vocabulary a student would use when meeting this target: the union of the
 * terms of every section its anchors name, plus the content words of the
 * target's own wording, lowercased and sorted. An anchor that matches no section
 * contributes nothing, so a sparse target is still reachable through the words
 * of the statement itself.
 */
export function vocabularyOf(anchors: string[], text = ""): string[] {
  const words = new Set<string>();
  for (const anchor of anchors) {
    for (const word of SECTION_VOCABULARY.get(anchor) ?? []) words.add(word);
  }
  for (const word of contentWords(text)) words.add(word);
  return [...words].sort();
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const wordPattern = (word: string): RegExp => new RegExp(`\\b${escapeRegExp(word)}\\b`);

/** How many of a target's own sections list each word. A word its sections keep
 *  returning to is more central to the target than one mentioned once. */
function centralityOf(anchors: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const anchor of anchors) {
    for (const word of SECTION_VOCABULARY.get(anchor) ?? []) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * The order in which to name words at a student: first the words the target's
 * own wording uses, then the words its sections return to most often, then
 * alphabetical. A target about energy and matter therefore talks about matter,
 * not about some other term its section happened to mention once.
 */
function orderForGuide(words: string[], state: TargetState): string[] {
  const text = normalise(state.text);
  const counts = centralityOf(state.anchors);
  const named = (word: string): number => (wordPattern(word).test(text) ? 1 : 0);
  return words
    .slice()
    .sort(
      (a, b) =>
        named(b) - named(a) || (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b),
    );
}

interface PreparedTarget {
  target: Target;
  words: string[];
  patterns: RegExp[];
}

/** Built once, so scoring a message does not rebuild a regex per target. */
const PREPARED: PreparedTarget[] = TARGETS.map((target) => {
  const words = vocabularyOf(target.anchors, target.text);
  return {
    target,
    words,
    patterns: words.map(wordPattern),
  };
});

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A message with no usable strength still carried words, so it is not empty. */
function strengthOf(strength: Strength | undefined): Strength {
  const known: Strength[] = ["empty", "thin", "emerging", "strong"];
  return strength && known.includes(strength) ? strength : "thin";
}

function rankOf(state: TargetState): number {
  return state.band ? BAND_RANK[state.band] : 0;
}

// ---------------------------------------------------------------- scoring
interface Written {
  /** position among the messages that carried any text */
  index: number;
  text: string;
  strength: Strength;
  normalised: string;
}

/**
 * Score every target of one unit against the student's messages.
 *
 * Per target:
 * - a message touches it when it contains at least one word of its vocabulary,
 *   matched on word boundaries so "energy" does not fire inside "energetic";
 * - the band is the maximum bandFor(strength, nudges) over the touching
 *   messages, so the best evidence a student has produced is the one that
 *   counts, and nudges (the guide's prompts) only ever pull a band down;
 * - depth needs more than one sentence. A target with exactly one touching
 *   message is scored one nudge higher than the caller asked for, so
 *   bandFor("strong", 1) gives Exhibiting, not Exhibiting with Depth. Two or
 *   more touching messages score with the caller's nudges unchanged;
 * - untouched targets are returned with band null, never removed.
 *
 * `nudges` defaults to 0, `unit` to DEFAULT_UNIT. The two optional parameters
 * extend the brief's signature; every existing call keeps working.
 */
export function scoreTargets(messages: Message[], nudges = 0, unit: string = DEFAULT_UNIT): TargetState[] {
  const promptCount = Number.isFinite(nudges) ? Math.max(0, Math.floor(nudges)) : 0;

  const written: Written[] = (Array.isArray(messages) ? messages : [])
    .filter((message) => Boolean(message) && typeof message.text === "string" && message.text.trim() !== "")
    .slice(-40)
    .map((message, index) => ({
      index,
      text: message.text,
      strength: strengthOf(message.strength),
      normalised: normalise(message.text),
    }));

  /* The same sentence sent twice is one sentence. Without this, pressing send
     again reaches Exhibiting with Depth on its own evidence, and the panel
     would report progress the student did not make. */
  const distinct: Written[] = [];
  const seenText = new Set<string>();
  for (const message of written) {
    if (seenText.has(message.normalised)) continue;
    seenText.add(message.normalised);
    distinct.push(message);
  }

  const states: TargetState[] = [];

  for (const entry of PREPARED) {
    if (entry.target.unit !== unit) continue;

    const touched = new Set<string>();
    const hits: { index: number; text: string; strength: Strength }[] = [];

    for (const message of distinct) {
      const matched = entry.words.filter((_, i) => entry.patterns[i].test(message.normalised));
      if (matched.length === 0) continue;

      for (const word of matched) touched.add(word);
      hits.push({ index: message.index, text: message.text, strength: message.strength });
    }

    // One sentence can name both words, and naming both words is not depth: a
    // single touching message is judged with one nudge more, so the same
    // strength lands on Exhibiting instead of Exhibiting with Depth.
    const effectiveNudges = hits.length >= 2 ? promptCount : promptCount + 1;
    const touching = hits.map((hit) => ({ ...hit, band: bandFor(hit.strength, effectiveNudges) }));

    let band: Band | null = null;
    for (const message of touching) {
      if (band === null || BAND_RANK[message.band] > BAND_RANK[band]) band = message.band;
    }

    // The evidence supports the band, so the strongest touching sentences win;
    // then they are shown in the order the student wrote them.
    const evidence = touching
      .slice()
      .sort((a, b) => BAND_RANK[b.band] - BAND_RANK[a.band] || a.index - b.index)
      .slice(0, EVIDENCE_MAX)
      .sort((a, b) => a.index - b.index)
      .map((message) => message.text.slice(0, EVIDENCE_CHARS));

    states.push({
      text: entry.target.text,
      group: entry.target.group,
      standard: entry.target.standard,
      kind: entry.target.kind,
      anchors: entry.target.anchors,
      band,
      touched: [...touched].sort().slice(0, TOUCHED_MAX),
      evidence,
    });
  }

  const started = states.filter((state) => state.band !== null).sort((a, b) => rankOf(b) - rankOf(a) || b.touched.length - a.touched.length);
  const notStarted = states.filter((state) => state.band === null);

  return [...started, ...notStarted];
}

// ---------------------------------------------------------------- the edge
/** True when this word is a term of one of the target's own sections, rather
 *  than a content word lifted from the "I can" statement itself. */
function isSectionWord(anchors: string[], word: string): boolean {
  return anchors.some((anchor) => SECTION_VOCABULARY.get(anchor)?.has(word) ?? false);
}

/**
 * One short factual sentence naming what would move the target on. No praise,
 * no contraction, American spelling, and never more than about 20 words.
 *
 * When naming a word to write next, curriculum vocabulary comes first: the
 * statement's own wording can make a target reachable, but telling a student to
 * use the verb "explain" is not a next step.
 */
function whyFor(state: TargetState): string {
  const words = vocabularyOf(state.anchors, state.text);

  if (words.length === 0) {
    return "No section of the reader is mapped to this target, so written work is the only evidence.";
  }

  const curriculum = words.filter((word) => isSectionWord(state.anchors, word));
  const guideWords = curriculum.length > 0 ? curriculum : words;

  if (state.band === null) {
    const [first, second] = orderForGuide(guideWords, state);
    return second
      ? `Nothing written yet uses ${first} or ${second}. Name both in one sentence.`
      : `Nothing written yet uses ${first}. Name it in one sentence.`;
  }

  const used = state.touched;
  const lead = used.length > 0 ? used[0] : words[0];
  const missing =
    orderForGuide(
      guideWords.filter((word) => !used.includes(word)),
      state,
    )[0] ??
    (guideWords === words
      ? undefined
      : orderForGuide(
          words.filter((word) => !used.includes(word)),
          state,
        )[0]);

  if (state.band === "Exhibiting") {
    return `You have used ${used.slice(0, 2).join(" and ")}; add the reason and the result in one sentence.`;
  }
  if (missing) {
    return `You have used ${lead} but not ${missing}. Put both in one sentence.`;
  }
  return `You have used ${used.slice(0, 2).join(" and ")}; connect them in one longer sentence.`;
}

/**
 * The one target to guide towards: the highest-band target that is not yet
 * Exhibiting with Depth. When nothing has been started, the first target the
 * unit authored. When every started target is already at depth but untouched
 * targets remain, the first of those, so the guide never reports a unit as
 * finished while most of it is blank. Null means there is nothing left.
 */
export function nearestEdge(states: TargetState[]): Edge | null {
  if (!Array.isArray(states) || states.length === 0) return null;

  const started = states.filter((state) => state.band !== null);
  const ranked = [...started].sort((a, b) => rankOf(b) - rankOf(a) || b.touched.length - a.touched.length);

  const next = ranked.find((state) => state.band !== DEPTH) ?? states.find((state) => state.band === null) ?? null;
  return next ? { text: next.text, why: whyFor(next) } : null;
}
