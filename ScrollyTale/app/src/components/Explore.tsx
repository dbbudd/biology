"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

type Line =
  | { id: string; kind: "content"; html: string }
  | { id: string; kind: "guide"; text: string }
  | { id: string; kind: "student"; text: string };

interface Reply {
  decision: {
    strength: string;
    say: string;
    reveal: "next" | "simpler" | "switch" | "none";
    term?: string;
  };
}

const SEED = "Cellular respiration";
const LAST_KEY = "bio_explore";

let counter = 0;
const nextId = () => `l${++counter}`;

/**
 * One box, any thought.
 *
 * The student writes whatever they are thinking: a guess, a question, a
 * complaint. The model judges how much they can take next and the reader
 * content is revealed a piece at a time, in the order it is discovered.
 */
export default function Explore() {
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (params: Record<string, string>) => {
    setBusy(true);
    setNote(null);
    setDraft("");
    try {
      const query = new URLSearchParams(params);
      const res = await fetch(`/api/ladder?${query.toString()}`);
      if (!res.ok) {
        setNote("Nothing in the course matches that yet. Name the idea in one or two words.");
        return;
      }
      const body = (await res.json()) as Ladder;
      setLadder(body);
      window.localStorage.setItem(LAST_KEY, body.node.term);
      setSeen((prev) =>
        prev.some((p) => p.toLowerCase() === body.node.term.toLowerCase())
          ? prev
          : [...prev, body.node.term],
      );

      const opening: Line[] = [];
      if (body.prerequisite) {
        opening.push({
          id: nextId(),
          kind: "guide",
          text: `This rests on ${body.prerequisite.term}: ${body.prerequisite.definition}`,
        });
      }
      if (body.blocks[0]) {
        opening.push({ id: nextId(), kind: "content", html: body.blocks[0].html });
      }
      setLines(opening);
      setRevealed(body.blocks.length > 0 ? 1 : 0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setNote("Could not reach the course index.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const last = window.localStorage.getItem(LAST_KEY);
    void load({ term: last || SEED });
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines.length]);

  function pushBlock(index: number) {
    const block = ladder?.blocks[index];
    if (!block) return false;
    setLines((prev) => [...prev, { id: nextId(), kind: "content", html: block.html }]);
    setRevealed(index + 1);
    return true;
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!ladder || busy) return;
    if (text.length === 0) return;

    setDraft("");
    setBusy(true);
    setLines((prev) => [...prev, { id: nextId(), kind: "student", text }]);

    try {
      const res = await fetch("/api/thread", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          term: ladder.node.term,
          text,
          revealed,
          total: ladder.blocks.length,
        }),
      });
      if (!res.ok) throw new Error("no reply");
      const body = (await res.json()) as Reply;
      const decision = body.decision;

      setLines((prev) => [...prev, { id: nextId(), kind: "guide", text: decision.say }]);

      if (decision.reveal === "switch" && decision.term) {
        await load({ term: decision.term, seen: seen.join(",") });
        return;
      }

      if (decision.reveal === "simpler") {
        if (revealed <= 1 && ladder.prerequisite) {
          await load({ term: ladder.prerequisite.term, seen: seen.join(",") });
          return;
        }
        setRevealed(1);
        setLines((prev) => [
          ...prev,
          {
            id: nextId(),
            kind: "content",
            html: ladder.blocks[0].html,
          },
        ]);
        return;
      }

      if (decision.reveal === "next") {
        const target = Math.min(revealed, ladder.blocks.length - 1);
        if (revealed < ladder.blocks.length) {
          pushBlock(target);
        } else if (ladder.next) {
          setLines((prev) => [
            ...prev,
            { id: nextId(), kind: "guide", text: `There is more here: ${ladder.next!.term}` },
          ]);
        }
      }
    } catch {
      setNote("That did not reach the guide. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!ladder && busy) return <p className="st-loading">Following a thread</p>;

  return (
    <div className="st-explore">
      <div className="st-eyebrow">Explore</div>
      {ladder && <h1 className="st-title">{ladder.node.term}</h1>}

      <div className="st-thread">
        {lines.map((line) =>
          line.kind === "content" ? (
            <div
              key={line.id}
              className="st-reader st-thread-content"
              dangerouslySetInnerHTML={{ __html: line.html }}
            />
          ) : (
            <p key={line.id} className={`st-thread-${line.kind}`}>
              {line.text}
            </p>
          ),
        )}
        <div ref={endRef} />
      </div>

      {note && <p className="st-warn">{note}</p>}

      <form className="st-composer" onSubmit={send}>
        <label htmlFor="st-say" className="st-composer-label">
          What are you thinking or wondering?
        </label>
        <div className="st-composer-row">
          <textarea
            id="st-say"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="A guess, a question, anything."
          />
          <button type="submit" className="st-primary" disabled={busy || !draft.trim()}>
            {busy ? "…" : "Send"}
          </button>
        </div>
        {ladder?.prerequisite && (
          <button
            type="button"
            className="st-composer-alt"
            onClick={() => load({ term: ladder.prerequisite!.term, seen: seen.join(",") })}
          >
            Go back to {ladder.prerequisite.term}
          </button>
        )}
      </form>

      {seen.length > 1 && (
        <details className="st-been">
          <summary>Where this has taken you</summary>
          <ul>
            {seen.slice(0, -1).map((term) => (
              <li key={term}>
                <button type="button" onClick={() => load({ term, seen: seen.join(",") })}>
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
