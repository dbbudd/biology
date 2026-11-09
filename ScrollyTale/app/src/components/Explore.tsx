"use client";

import { useCallback, useEffect, useState } from "react";
import ReaderSection from "./ReaderSection";

interface Teaches {
  chapter: string;
  section: string;
  heading: string;
  unit: string;
}

interface Reveal {
  term: string;
  because: string;
  definition: string;
}

interface Node {
  term: string;
  definition: string;
  teaches: Teaches | null;
  openedSection?: Teaches;
}

interface Payload {
  node: Node;
  next: Reveal | null;
}

/** Where a first visit begins. Fixed, so two students in a room start in the
 *  same place and a teacher can talk to the screen they are all looking at. */
const SEED = "Cellular respiration";
const LAST_KEY = "bio_explore";

/**
 * Curiosity-led traversal.
 *
 * The student never sees what is coming: no chapter list, no step count, no
 * neighbour menu. Each screen shows one idea, the content that teaches it, and
 * exactly one thing the guide is willing to reveal next.
 */
export default function Explore() {
  const [node, setNode] = useState<Node | null>(null);
  const [next, setNext] = useState<Reveal | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [curiosity, setCuriosity] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (params: Record<string, string>) => {
      setLoading(true);
      setNote(null);
      try {
        const query = new URLSearchParams(params);
        const res = await fetch(`/api/concept?${query.toString()}`);
        if (!res.ok) {
          setNote("Nothing in the course matches that yet. Try naming the idea in one or two words.");
          return;
        }
        const body = (await res.json()) as Payload;
        setNode(body.node);
        setNext(body.next);
        window.localStorage.setItem(LAST_KEY, body.node.term);
        setSeen((prev) =>
          prev.some((p) => p.toLowerCase() === body.node.term.toLowerCase())
            ? prev
            : [...prev, body.node.term],
        );
      } catch {
        setNote("Could not reach the concept index.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    // Return to where this student left off, so a thread is not lost on reload.
    const last = window.localStorage.getItem(LAST_KEY);
    void load({ term: last || SEED });
  }, [load]);

  function open(term: string) {
    void load({ term, seen: seen.join(",") });
    setCuriosity("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function elsewhere() {
    if (!node || !next) return;
    void load({ term: node.term, seen: seen.join(","), alternative: next.term });
  }

  function ask(event: React.FormEvent) {
    event.preventDefault();
    const text = curiosity.trim();
    if (text.length < 3) return;
    void load({ q: text });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading && !node) {
    return <p className="st-loading">Following a thread</p>;
  }

  const teaches = node?.openedSection ?? node?.teaches ?? null;

  return (
    <div className="st-explore">
      <div className="st-eyebrow">Explore</div>

      {node && (
        <>
          <h1 className="st-title">{node.term}</h1>
          <p className="st-definition">{node.definition}</p>

          {teaches && (
            <ReaderSection
              chapter={teaches.chapter}
              section={teaches.section}
              mode="open"
              omit={["prompts", "check"]}
              label="Open this idea in the reader"
            />
          )}

          {next ? (
            <div className="st-reveal">
              <div className="st-reveal-head">
                <span className="st-reveal-dot" aria-hidden="true" />
                <span>There is more here</span>
              </div>
              <p className="st-reveal-term">{next.term}</p>
              <p className="st-reveal-line">{next.definition}</p>
              <div className="st-reveal-actions">
                <button type="button" className="st-primary" onClick={() => open(next.term)}>
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
