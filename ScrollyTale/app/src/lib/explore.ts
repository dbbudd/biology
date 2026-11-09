import concepts from "../data/concepts.generated.json";

export interface Teaches {
  chapter: string;
  section: string;
  heading: string;
  unit: string;
}

interface TermRecord {
  definition: string;
  builtOn: string[];
  leadsTo: string[];
  teaches: Teaches | null;
}

export interface ConceptNode {
  term: string;
  definition: string;
  teaches: Teaches | null;
  /** set when a question named no term and a section had to be opened first */
  openedSection?: Teaches;
}

interface SectionRecord {
  chapter: string;
  unit: string;
  id: string;
  heading: string;
  terms: string[];
}

export interface Reveal {
  term: string;
  /** why this came next, in a few words. Never the content of the step. */
  because: string;
  definition: string;
}

const TERMS = concepts.terms as Record<string, TermRecord>;
const SECTIONS = (concepts as { sections?: SectionRecord[] }).sections ?? [];
const KEYS = Object.keys(TERMS);
const LOWER = new Map(KEYS.map((k) => [k.toLowerCase(), k]));

export function node(term: string): ConceptNode | null {
  const key = LOWER.get(term.toLowerCase());
  if (!key) return null;
  const rec = TERMS[key];
  return { term: key, definition: rec.definition, teaches: rec.teaches };
}

function usable(term: string, seen: string[]): boolean {
  return !seen.some((s) => s.toLowerCase() === term.toLowerCase());
}

/**
 * The next thing to reveal. Exactly one, chosen so the student never sees a
 * menu of what is coming.
 *
 * Order of preference: a word this definition leads to, then a word it is
 * built on, then anything else nearby. Words with a teaching section win,
 * because a reveal should open content rather than a bare definition. When the
 * student has written something, words they touched outrank the rest.
 */
export function chooseNext(
  term: string,
  seen: string[],
  focus: string[] = [],
): Reveal | null {
  const key = LOWER.get(term.toLowerCase());
  if (!key) return null;
  const rec = TERMS[key];

  const focusSet = new Set(focus.map((f) => f.toLowerCase()));
  const candidates = [...new Set([...rec.leadsTo, ...rec.builtOn])].filter((c) =>
    usable(c, seen),
  );
  if (candidates.length === 0) return null;

  const scored = candidates.map((candidate) => {
    const r = TERMS[candidate];
    let score = 0;
    if (rec.leadsTo.includes(candidate)) score += 4;
    if (r?.teaches) score += 3;
    if (focusSet.has(candidate.toLowerCase())) score += 6;
    if (r) {
      const words = r.definition.toLowerCase().split(/\s+/);
      score += focus.filter((f) => words.includes(f)).length;
    }
    return { candidate, score };
  });

  scored.sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate));
  const chosen = scored[0].candidate;

  return {
    term: chosen,
    because: rec.leadsTo.includes(chosen) ? "follows from this" : "underneath this",
    definition: TERMS[chosen].definition,
  };
}

/** One different option, so a student can change thread without a menu. */
export function chooseAlternative(
  term: string,
  seen: string[],
  avoid: string,
): Reveal | null {
  const key = LOWER.get(term.toLowerCase());
  if (!key) return null;
  const rec = TERMS[key];
  const candidates = [...new Set([...rec.leadsTo, ...rec.builtOn])].filter(
    (c) => usable(c, seen) && c.toLowerCase() !== avoid.toLowerCase(),
  );
  const withContent = candidates.filter((c) => TERMS[c]?.teaches);
  const pool = withContent.length > 0 ? withContent : candidates;
  if (pool.length === 0) return null;
  const chosen = pool[0];
  return {
    term: chosen,
    because: "another thread",
    definition: TERMS[chosen].definition,
  };
}

const STOP = new Set([
  "the", "and", "but", "for", "with", "that", "this", "these", "those", "from",
  "what", "why", "how", "when", "where", "does", "did", "not", "cannot", "can",
  "will", "would", "should", "could", "have", "has", "had", "was", "were", "are",
  "is", "be", "been", "being", "into", "out", "about", "more", "most", "some",
  "any", "all", "its", "it", "you", "your", "they", "them", "then", "than",
  "there", "here", "which", "who", "because", "make", "makes", "made", "get",
  "gets", "like", "just", "very", "also", "run", "runs", "work", "works",
]);

/**
 * Turn a student's own words into one concept.
 *
 * A word from the term itself outranks overlap with a definition, because a
 * student naming an idea is stronger evidence than one word in common with a
 * sentence about something else. Definition overlap only counts when at least
 * two distinct words match, which keeps a single common word from deciding it.
 */
export function routeText(text: string): ConceptNode | null {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  if (words.length === 0) return null;

  const joined = words.join(" ");
  let best: { key: string; score: number } | null = null;

  for (const key of KEYS) {
    const lower = key.toLowerCase();
    let score = 0;

    if (joined.includes(lower)) score += 12;

    const nameWords = lower.split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
    score += nameWords.filter((w) => words.includes(w)).length * 6;

    const defWords = new Set(TERMS[key].definition.toLowerCase().split(/[^a-z]+/));
    const overlap = words.filter((w) => defWords.has(w));
    if (overlap.length >= 2) score += overlap.length;

    if (score > 0 && (!best || score > best.score)) best = { key, score };
  }

  if (best && best.score >= 6) return node(best.key);

  // No word matched a glossary term. Find the section the question is about and
  // open the most central concept in it, so curiosity still reaches content.
  const section = matchSection(words, joined);
  if (section) {
    const teaches: Teaches = {
      chapter: section.chapter,
      section: section.id,
      heading: section.heading,
      unit: section.unit,
    };
    // Prefer the word in that section the question itself touched, then the
    // most connected word, so a section does not open on an incidental term.
    const ranked = [...section.terms]
      .map((t) => {
        const rec = TERMS[t];
        const touched = words.some((w) => t.toLowerCase().includes(w)) ? 6 : 0;
        const degree = rec ? rec.builtOn.length + rec.leadsTo.length : 0;
        return { t, score: touched + Math.min(degree, 8) };
      })
      .sort((a, b) => b.score - a.score || a.t.localeCompare(b.t));

    const first = ranked.find((r) => TERMS[r.t]?.teaches) ?? ranked[0];
    if (first) {
      const found = node(first.t);
      if (found) return { ...found, openedSection: teaches };
    }
  }

  return best ? node(best.key) : null;
}

/**
 * One concept from a phenomenon's own vocabulary, for a student's first
 * thought.
 *
 * The search is restricted to the authored candidate list on purpose. Measured
 * against the live glossary, "the sun shines in and the plant grows" and "water
 * and air get recycled inside the bottle" both routed to `Cell`, because a
 * generic biology word outscored the idea the author meant to open first. A
 * door the author did not choose is worse than no door, so an answer that
 * matches nothing opens the first strand that has teaching content.
 *
 * Scoring mirrors routeText: naming the concept outranks overlapping its
 * definition. Ties keep the earlier candidate, because the authored order is
 * the teaching order.
 */
export function routeWithin(text: string, candidates: string[]): ConceptNode | null {
  const list = [
    ...new Set(
      candidates
        .map((c) => LOWER.get(c.trim().toLowerCase()))
        .filter((c): c is string => Boolean(c)),
    ),
  ];
  if (list.length === 0) return null;

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  let best: { key: string; score: number } | null = null;

  if (words.length > 0) {
    const joined = words.join(" ");

    for (const key of list) {
      const lower = key.toLowerCase();
      let score = 0;

      if (joined.includes(lower)) score += 12;

      const nameWords = lower.split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
      score += nameWords.filter((w) => words.includes(w)).length * 6;

      // A single distinctive word from the definition is real evidence, so the
      // first overlap scores 2 and each further word 1. No stemming: a word the
      // definition does not contain does not count.
      const defWords = new Set(TERMS[key].definition.toLowerCase().split(/[^a-z]+/));
      const overlap = words.filter((w) => defWords.has(w));
      if (overlap.length > 0) score += overlap.length + 1;

      // Strictly greater, so the earlier candidate wins a tie.
      if (score > 0 && (!best || score > best.score)) best = { key, score };
    }
  }

  if (best) return node(best.key);

  const fallback = list.find((key) => TERMS[key]?.teaches) ?? list[0];
  return node(fallback);
}

function matchSection(words: string[], joined: string): SectionRecord | null {
  let best: { section: SectionRecord; score: number } | null = null;

  for (const section of SECTIONS) {
    const headingWords = section.heading
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      // Short heading words are noise: "blue" in a heading about blue eyes
      // should not match a question about the sky.
      .filter((w) => w.length >= 5 && !STOP.has(w));

    let score = 0;
    if (joined.includes(section.heading.toLowerCase())) score += 10;
    score += headingWords.filter((w) => words.includes(w)).length * 3;
    score += section.terms.filter((t) => words.includes(t.toLowerCase())).length * 3;

    if (score > 0 && (!best || score > best.score)) best = { section, score };
  }

  if (!best || best.score < 3) return null;
  return best.section;
}

/**
 * The one word this concept rests on that a student most likely does not have
 * yet. Chosen by how connected it is, so the foundation comes before the detail.
 */
export function prerequisiteOf(term: string, seen: string[] = []): ConceptNode | null {
  const key = LOWER.get(term.toLowerCase());
  if (!key) return null;
  const rec = TERMS[key];

  const candidates = rec.builtOn
    .filter((c) => c.toLowerCase() !== key.toLowerCase())
    .filter((c) => !seen.some((s) => s.toLowerCase() === c.toLowerCase()))
    .filter((c) => TERMS[c]?.teaches);

  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((c) => {
      const r = TERMS[c];
      return { c, degree: r.builtOn.length + r.leadsTo.length };
    })
    .sort((a, b) => b.degree - a.degree || a.c.localeCompare(b.c));

  return node(ranked[0].c);
}

export function termCount(): number {
  return KEYS.length;
}
