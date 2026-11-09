/**
 * Deterministic rules in front of the model.
 *
 * The model still writes the language, but moving the student through the
 * lesson is decided by these rules first, so a probabilistic judge cannot
 * advance a lesson on "ok" or rush a switch to a term the glossary does not
 * hold. Every rule either returns a complete decision or `null`, which means
 * "no rule fired, let the model decide".
 *
 * Rules, first match wins:
 *   A. empty or contentless            -> stay
 *   B. acknowledgement or "ok"         -> stay
 *   C. only the concept already open   -> stay
 *   D. only the name of another term   -> switch
 *   E. anything else                   -> null (the model decides)
 *
 * A message that merely contains a glossary word is not a request to leave it.
 * "energy is released" is a thought about the concept on screen, so it reaches
 * the model; "energy" alone switches. Preferring a false negative over a false
 * positive is deliberate: an unwanted jump costs the student their thread.
 *
 * The module is pure and synchronous: no network, no timers, and no import
 * from ./index, so it can run before any provider check and can be tested on
 * its own.
 */
import type { ConceptDecision } from "./concept";

export interface GuardOptions {
  /** The concept on screen, for example "Cellular respiration". */
  current: string;
  /** Canonical glossary name, or null. Pass (t) => node(t)?.term ?? null. */
  known: (term: string) => string | null;
}

/** Rule A: a neutral invitation. Reveals nothing and contains no contraction. */
export const SAY_EMPTY = "Write a sentence about this idea. A guess is enough.";

/** Rule B: a neutral request for content. Reveals nothing. */
export const SAY_ACKNOWLEDGED =
  "Add one sentence about this idea, or ask what does not fit.";

/** Rule C: the message only repeats the concept already on screen. */
export const SAY_ALREADY_HERE =
  "That is what this page is about. Write what you make of it so far.";

/** Rule D, first half of the bridge. Never defines the new term. */
export const SAY_SWITCH_PREFIX = "That is a different idea. Moving to ";
/** Rule D, second half of the bridge, after the term. */
export const SAY_SWITCH_SUFFIX = ".";

/** The bridge to a new term. Short, no praise, no definition. */
export function switchSay(term: string): string {
  return `${SAY_SWITCH_PREFIX}${term}${SAY_SWITCH_SUFFIX}`;
}

/**
 * A letter in any script a student here is likely to type. Digits, punctuation,
 * symbols and emoji are deliberately outside this set, so "???" and "123" are
 * contentless while "酶" is a real attempt.
 */
const LETTER =
  /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

/** Rules A and B both fill "no substance"; the caller treats strength alike. */
const EMPTY_STRENGTH = "empty" as const;

/** Filler that may sit between acknowledgement words. Interjections that are
 *  themselves acknowledgements ("um", "hmm") are not filler. */
const FILLER = new Set(["umm", "uhh", "er", "erm", "ah", "oh", "well", "so"]);

/** Bare acknowledgements and non-answers. Longest phrases are tried first. */
const ACK_PHRASES: string[][] = [
  ["got", "it"],
  ["i", "see"],
  ["thank", "you"],
  ["no", "idea"],
  ["not", "sure"],
  ["ok"],
  ["okay"],
  ["k"],
  ["yes"],
  ["yeah"],
  ["yep"],
  ["yea"],
  ["sure"],
  ["cool"],
  ["right"],
  ["fine"],
  ["thanks"],
  ["hmm"],
  ["hm"],
  ["um"],
  ["uh"],
  ["idk"],
  ["dunno"],
  ["maybe"],
].sort((a, b) => b.length - a.length);

/** Openings a question puts in front of the term it asks about. */
const LEAD = new Set(["a", "an", "the", "this", "that", "these", "those"]);

/** Words a question leaves behind the term. */
const TRAIL = new Set([
  "then",
  "mean",
  "means",
  "do",
  "does",
  "work",
  "works",
  "for",
  "actually",
  "really",
  "please",
]);

/** Explicit question forms that name a term. */
const QUESTION_PATTERNS: RegExp[] = [
  /\bwhat\s+(?:actually\s+|really\s+)?(?:is|are)\s+(.+)$/i,
  /\bwhat(?:['\u2019]s|s)\s+(.+)$/i,
  /\bwhat\s+(?:does|do)\s+(.+?)\s+(?:mean|do|work)\b/i,
  /\btell\s+me\s+about\s+(.+)$/i,
  /\bdefine\s+(.+)$/i,
];

/** Longest glossary term, in words, the rules will look for. */
const MAX_TERM_WORDS = 5;

/** How many words a bare mention may run to. */
const MAX_MENTION_WORDS = 8;

/**
 * The decision for one student message, or null when no rule fires.
 *
 * Deterministic by design: the same text and the same options always produce
 * the same answer, with no network call.
 */
export function guardDecision(
  text: string,
  options: GuardOptions,
): ConceptDecision | null {
  const trimmed = text.trim();

  // A. Empty or contentless: no letters at all.
  if (!LETTER.test(trimmed)) {
    return { reveal: "stay", strength: EMPTY_STRENGTH, say: SAY_EMPTY };
  }

  const tokens = words(trimmed);

  // B. Acknowledgement or one-word non-answer. A real sentence such as
  // "I do not understand any of this" deliberately does not match.
  if (isAcknowledgement(tokens)) {
    return { reveal: "stay", strength: EMPTY_STRENGTH, say: SAY_ACKNOWLEDGED };
  }

  // D first half. An explicit question naming another glossary term.
  const asked = termInQuestion(trimmed, options);
  if (asked) {
    return {
      reveal: "switch",
      strength: "emerging",
      term: asked,
      say: switchSay(asked),
    };
  }

  // D second half. The message is the name of a concept and nothing else.
  //
  // Merely containing a glossary word is not a request to leave: "energy is
  // released" is a thought about the concept on screen, and jumping to the
  // Energy page in the middle of it loses the student. The mention only counts
  // when the concept accounts for every content word in the message, so "cell
  // cycle" and "the cell cycle" switch while "energy is released" does not.
  if (tokens.length > 0 && tokens.length <= MAX_MENTION_WORDS) {
    const content = contentWords(tokens);
    if (content.length > 0) {
      const currentWords = contentWords(words(options.current));
      // C. They typed back the name of the page they are already on.
      if (sameWords(content, currentWords)) {
        return { reveal: "stay", strength: EMPTY_STRENGTH, say: SAY_ALREADY_HERE };
      }

      const mentioned = termInWords(content, options);
      if (mentioned && sameWords(content, contentWords(words(mentioned)))) {
        return {
          reveal: "switch",
          strength: "thin",
          term: mentioned,
          say: switchSay(mentioned),
        };
      }
    }
  }

  // E. No rule fired.
  return null;
}

/** Lower-case word tokens. Digits and punctuation are not words here. */
function words(text: string): string[] {
  const found = text.toLowerCase().match(/[a-z']+/g) ?? [];
  return found.filter((token) => /[a-z]/.test(token));
}

/**
 * Words that carry no subject matter: articles, copulas, prepositions, pronouns
 * and the light verbs a student wraps a term in. They are stripped before a
 * message is compared with a glossary name, so "the cell cycle" and
 * "cell cycle" answer the same question.
 */
const GRAMMAR = new Set([
  "a", "an", "the", "this", "that", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "am",
  "do", "does", "did", "can", "could", "would", "should", "will",
  "of", "on", "in", "at", "to", "for", "with", "about", "from", "by",
  "and", "or", "but", "so", "then", "please",
  "i", "we", "you", "it", "they", "me", "my", "our", "your",
]);

/** The tokens of a message that say something about the subject. */
function contentWords(tokens: string[]): string[] {
  return tokens.filter((token) => !GRAMMAR.has(token) && !FILLER.has(token));
}

/** True when two token lists hold the same words in the same order. */
function sameWords(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((word, index) => word === right[index]);
}

/**
 * True when every word is an acknowledgement or filler and at least one word is
 * an acknowledgement. "ok ok" and "yeah ok" match; "yes but why" does not.
 */
function isAcknowledgement(tokens: string[]): boolean {
  const kept = tokens.filter((token) => !FILLER.has(token));
  if (kept.length === 0) return false;

  let index = 0;
  let matched = 0;
  while (index < kept.length) {
    const phrase = ACK_PHRASES.find((candidate) =>
      candidate.every((word, offset) => kept[index + offset] === word),
    );
    if (!phrase) return false;
    index += phrase.length;
    matched += 1;
  }
  return matched > 0;
}

/** The canonical term an explicit question names, if the glossary holds it. */
function termInQuestion(text: string, options: GuardOptions): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  for (const pattern of QUESTION_PATTERNS) {
    const match = pattern.exec(cleaned);
    if (!match?.[1]) continue;
    const found = termInWords(fragmentWords(match[1]), options);
    if (found) return found;
  }
  return null;
}

/** Tokens of a question fragment, with lead-in articles and trailing verbs cut. */
function fragmentWords(fragment: string): string[] {
  const tokens = words(fragment);
  while (tokens.length > 0 && LEAD.has(tokens[0])) tokens.shift();
  while (tokens.length > 0 && TRAIL.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens;
}

/**
 * The longest glossary term held in these tokens, or null. Longest first, so
 * "cell cycle" wins over "cell"; the current concept never matches, so a
 * message about where the student already is does not switch.
 */
function termInWords(tokens: string[], options: GuardOptions): string | null {
  if (tokens.length === 0) return null;
  const current = options.current.trim().toLowerCase();
  const longest = Math.min(MAX_TERM_WORDS, tokens.length);

  for (let size = longest; size >= 1; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const fragment = tokens.slice(start, start + size).join(" ");
      const found = lookup(fragment, options, current);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Resolve one fragment against the glossary, trying the plural and possessive
 * forms a student is likely to type. The glossary spelling is returned, and the
 * current concept is refused.
 */
function lookup(
  fragment: string,
  options: GuardOptions,
  current: string,
): string | null {
  const attempts = [fragment];
  if (fragment.endsWith("'s")) attempts.push(fragment.slice(0, -2));
  if (fragment.endsWith("s")) attempts.push(fragment.slice(0, -1));

  for (const attempt of attempts) {
    const name = options.known(attempt);
    if (!name) continue;
    const canonical = name.trim();
    if (!canonical) continue;
    if (canonical.toLowerCase() === current) continue;
    return canonical;
  }
  return null;
}
