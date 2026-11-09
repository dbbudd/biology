"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Teaches {
  chapter: string;
  section: string;
  heading: string;
  unit: string;
}

interface Node {
  term: string;
  definition: string;
  teaches: Teaches | null;
  openedSection?: Teaches;
}

interface Block {
  kind: string;
  html: string;
}

interface Reveal {
  term: string;
  because: string;
  definition: string;
}

interface Ladder {
  node: Node;
  prerequisite: Node | null;
  blocks: Block[];
  next: Reveal | null;
}

const SEED = "Cellular respiration";
const LAST_KEY = "bio_explore";

const QUESTIONS = [
  "What does that say in your own words?",
  "What did that add to the part before?",
  "What would someone get wrong here?",
];

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "by", "for",
  "with", "is", "are", "was", "were", "be", "it", "its", "this", "that", "as",
  "so", "because", "not", "no", "do", "does", "did", "can", "will", "would",
]);

function contentWords(text: string): number {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w)).length;
}

/**
 * Curiosity-led, one small piece at a time.
 *
 * A section is not shown whole. It opens with the one idea the concept rests
 * on, then a few hundred words become a handful of paragraphs, each with one
 * question, and the answer is what unlocks the next.
 */
export default function Explore() {
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [phase, setPhase] = useState<"probe" | "read" | "done">("read");
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [nudged, setNudged] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const [curiosity, setCuriosity] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (params: Record<string, string>) => {
    setLoading(true);
    setNote(null);
    setAnswer("");
    setNudged(false);
    setStep(0);
    try {
      const query = new URLSearchParams(params);
      const res = await fetch(`/api/ladder?${query.toString()}`);
      if (!res.ok) {
        setNote("Nothing in the course matches that yet. Try naming the idea in one or two words.");
        setLadder(null);
        return;
      }
      const body = (await res.json()) as Ladder;
      setLadder(body);
      setPhase(body.prerequisite ? "probe" : body.blocks.length > 0 ? "read" : "done");
      setSeen((prev) =>
        prev.some((p) => p.toLowerCase() === body.node.term.toLowerCase())
          ? prev
          : [...prev, body.node.term],
      );
      window.localStorage.setItem(LAST_KEY, body.node.term);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setNote("Could not reach the concept index.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const last = window.localStorage.getItem(LAST_KEY);
    void load({ term: last || SEED });
  }, [load]);

  function open(term: string) {
    void load({ term, seen: seen.join(",") });
    setCuriosity("");
  }

  function elsewhere() {
    if (!ladder?.node || !ladder.next) return;
    void load({ term: ladder.node.term, seen: seen.join(","), alternative: ladder.next.term });
  }

  function ask(event: React.FormEvent) {
    event.preventDefault();
    const text = curiosity.trim();
    if (text.length < 3) return;
    void load({ q: text, seen: seen.join(",") });
    setCuriosity("");
  }

  const hidden = useMemo(() => ladder?.blocks.length ?? 0, [ladder]);

  function submitAnswer() {
    if (contentWords(answer) < 3 && !nudged) {
      setNudged(true);
      return;
    }
    setAnswer("");
    setNudged(false);

    if (phase === "probe") {
      setPhase(ladder && ladder.blocks.length > 0 ? "read" : "done");
      setStep(0);
      return;
    }
    if (step + 1 < hidden) {
      setStep(step + 1);
    } else {
      setPhase("done");
    }
  }

  if (loading && !ladder) {
    return <p className="st-loading">Following a thread</p>;
  }

  const prompt =
    phase === "probe"
      ? `Say what ${ladder?.prerequisite?.term} means, in your own words.`
      : QUESTIONS[Math.min(step, QUESTIONS.length - 1)];

  return (
    <div className="st-explore">
      <div className="st-eyebrow">Explore</div>

      {ladder && (
        <>
          <h1 className="st-title">{ladder.node.term}</h1>

          {phase === "probe" && ladder.prerequisite && (
            <>
              <p className="st-micro-lead">
                Start with the idea underneath this one. Everything that follows depends on it.
              </p>
              <div className="st-reveal">
                <div className="st-reveal-head">
                  <span className="st-reveal-dot" aria-hidden="true" />
                  <span>First, the foundation</span>
                </div>
                <p className="st-reveal-term">{ladder.prerequisite.term}</p>
                <p className="st-reveal-line">{ladder.prerequisite.definition}</p>
                <div className="st-reveal-actions">
                  <button
                    type="button"
                    className="st-ghost"
                    onClick={() => open(ladder.prerequisite!.term)}
                  >
                    Go deeper on this first
                  </button>
                </div>
              </div>
            </>
          )}

          {phase === "read" && ladder.blocks[step] && (
            <>
              <div className="st-micro-bar" aria-hidden="true">
                <span style={{ width: `${((step + 1) / hidden) * 100}%` }} />
              </div>
              <div
                className="st-reader st-micro"
                dangerouslySetInnerHTML={{ __html: ladder.blocks[step].html }}
              />
            </>
          )}

          {phase === "done" && (
            <>
              <p className="st-definition">{ladder.node.definition}</p>
              {ladder.next ? (
                <div className="st-reveal">
                  <div className="st-reveal-head">
                    <span className="st-reveal-dot" aria-hidden="true" />
                    <span>There is more here</span>
                  </div>
                  <p className="st-reveal-term">{ladder.next.term}</p>
                  <p className="st-reveal-line">{ladder.next.definition}</p>
                  <div className="st-reveal-actions">
                    <button
                      type="button"
                      className="st-primary"
                      onClick={() => open(ladder.next!.term)}
                    >
                      Open it
                    </button>
                    <button type="button" className="st-ghost" onClick={elsewhere}>
                      Not that one
                    </button>
                  </div>
                </div>
              ) : (
                <p className="st-note">This thread ends here.</p>
              )}
            </>
          )}

          {phase !== "done" && (
            <div className="st-micro-ask">
              <label htmlFor="st-answer">{prompt}</label>
              <textarea
                id="st-answer"
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="One sentence is enough."
              />
              {nudged && (
                <p className="st-micro-nudge">
                  Write a little more. A few words that mean something, not the same words back.
                </p>
              )}
              <div className="st-micro-actions">
                <button type="button" className="st-primary" onClick={submitAnswer}>
                  Continue
                </button>
                {phase === "probe" && (
                  <button
                    type="button"
                    className="st-ghost"
                    onClick={() => {
                      setPhase(ladder.blocks.length > 0 ? "read" : "done");
                      setStep(0);
                      setAnswer("");
                      setNudged(false);
                    }}
                  >
                    I already know this
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {note && <p className="st-warn">{note}</p>}

      <form className="st-curious" onSubmit={ask}>
        <label htmlFor="st-curiosity">What are you curious about?</label>
        <div className="st-curious-row">
          <input
            id="st-curiosity"
            value={curiosity}
            onChange={(e) => setCuriosity(e.target.value)}
            placeholder="Ask about anything that does not make sense"
            autoComplete="off"
          />
          <button type="submit" className="st-secondary">
            Go
          </button>
        </div>
      </form>

      {seen.length > 1 && (
        <details className="st-been">
          <summary>Where this has taken you</summary>
          <ul>
            {seen.slice(0, -1).map((term) => (
              <li key={term}>
                <button type="button" onClick={() => open(term)}>
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
