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
    reveal: "next" | "simpler" | "switch" | "none" | "stay";
    term?: string;
  };
}

const SEED = "Cellular respiration";
const LAST_KEY = "bio_explore";
const HINT_ID = "st-say-hint";

/* Starter phrases. Each fills the box and leaves the caret ready for the student
   to finish the sentence. The label is the visible text; the name says what the
   chip does when a screen reader reaches it out of context. */
const STARTERS = [
  { key: "think", label: "I think", text: "I think ", name: "Start a sentence with I think" },
  { key: "what", label: "What is a", text: "What is a ", name: "Start a question with What is a" },
  { key: "lost", label: "I am lost.", text: "I am lost.", name: "Start with I am lost" },
];

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
  const [announcement, setAnnouncement] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const sayRef = useRef<HTMLTextAreaElement | null>(null);

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
      let openingGuide = "";
      if (body.prerequisite) {
        openingGuide = `This rests on ${body.prerequisite.term}: ${body.prerequisite.definition}`;
        opening.push({
          id: nextId(),
          kind: "guide",
          text: openingGuide,
        });
      }
      if (body.blocks[0]) {
        opening.push({ id: nextId(), kind: "content", html: body.blocks[0].html });
      }
      setLines(opening);
      // Keep the live region reading the newest guide line, or clear it when a
      // new topic opens with no guide line of its own.
      setAnnouncement(openingGuide);
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

  function fillDraft(text: string) {
    setDraft(text);
    const box = sayRef.current;
    if (!box) return;
    box.focus();
    // The controlled value lands after this render, so place the caret at the
    // end of the new text once it is in the box. Sending stays the student's job.
    requestAnimationFrame(() => {
      const end = box.value.length;
      box.setSelectionRange(end, end);
    });
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
      setAnnouncement(decision.say);

      if (decision.reveal === "switch" && decision.term) {
        await load({ term: decision.term, seen: seen.join(",") });
        return;
      }

      if (decision.reveal === "stay") {
        // Hold position: the guide asks for more substance and reveals nothing.
        return;
      }

      if (decision.reveal === "simpler") {
        if (revealed <= 1 && ladder.prerequisite) {
          await load({ term: ladder.prerequisite.term, seen: seen.join(",") });
          return;
        }
        // Show the first block only when the student has not seen it yet, so a
        // second "simpler" never repeats a paragraph already on screen.
        if (revealed === 0) {
          const first = ladder.blocks[0];
          if (first) {
            setLines((prev) => [
              ...prev,
              { id: nextId(), kind: "content", html: first.html },
            ]);
            setRevealed(1);
          }
        }
        return;
      }

      if (decision.reveal === "next") {
        // revealed counts the blocks already shown, so the next unseen block
        // sits at blocks[revealed].
        const unseen = ladder.blocks[revealed];
        if (revealed < ladder.blocks.length && unseen) {
          pushBlock(revealed);
        } else if (ladder.next) {
          setLines((prev) => [
            ...prev,
            { id: nextId(), kind: "guide", text: `There is more here: ${ladder.next!.term}` },
          ]);
          setAnnouncement(`There is more here: ${ladder.next!.term}`);
        }
      }

      // Any other reveal value ("none", or one this build does not know yet)
      // changes no content and no count; the guide line above is the reply.
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

      <div className="st-thread" aria-busy={busy}>
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

      <p className="st-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {note && <p className="st-warn">{note}</p>}

      <form className="st-composer" onSubmit={send}>
        <label htmlFor="st-say" className="st-composer-label">
          What are you thinking or wondering?
        </label>
        <div className="st-chips">
          {STARTERS.map((starter) => (
            <button
              key={starter.key}
              type="button"
              className="st-chip"
              aria-label={starter.name}
              onClick={() => fillDraft(starter.text)}
            >
              {starter.label}
            </button>
          ))}
        </div>
        <div className="st-composer-row">
          <textarea
            id="st-say"
            ref={sayRef}
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-describedby={HINT_ID}
            placeholder="A guess, a question, anything."
          />
          <button type="submit" className="st-primary" disabled={busy || !draft.trim()}>
            {busy ? "…" : "Send"}
          </button>
        </div>
        <p id={HINT_ID} className="st-composer-hint">
          Type something to send.
        </p>
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
