"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Move, Tale } from "../lib/types";
import { writeUncovered } from "../lib/uncovered";

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

type OriginStatus = "loading" | "ready" | "failed";

interface OriginState {
  status: OriginStatus;
  blocks: Block[];
}

const HINT_ID = "st-say-hint";

/* The one line that names where the first answer leads. It names the term and
   stops, so the reading on the next screen is still the thing that defines it. */
const guideInto = (term: string) => `Let us follow that into ${term}.`;

/* What the opening asks for. The beat's own helper is not used here: it ends by
   stating the answer ("The bottle is a wall to matter and a window to energy"),
   which is the sentence the student is being asked to produce. This keeps the
   invitation and withholds the conclusion. */
const OPENING_HINT = "Write what you think now. You will change it later.";

/* A move that assumes a widget this screen does not render would send the
   student looking for a table or a diagram that is not on the page. */
const assumesWidget = (move: Move): boolean => move.needsWidget === true;

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
 *
 * The screen opens on the unit's phenomenon, not on a concept. The first
 * answer chooses which strand of it opens, and from then on the thread holds
 * the case study at the top of the page so it is never lost.
 */
export default function Explore({ tale }: { tale: Tale }) {
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [origin, setOrigin] = useState<OriginState>(() =>
    tale.beats[0]?.source
      ? { status: "loading", blocks: [] }
      : { status: "failed", blocks: [] },
  );
  const endRef = useRef<HTMLDivElement | null>(null);
  const sayRef = useRef<HTMLTextAreaElement | null>(null);

  const beat0 = tale.beats[0];
  /* Each distinct concept visited moves the authored arc on by one beat, so the
     quiet moments of a session are answered from the unit's own teaching order. */
  const checkpoint = Math.max(0, Math.min(seen.length - 1, tale.beats.length - 1));
  const beat = tale.beats[checkpoint];

  /**
   * Open a concept.
   *
   * A new topic replaces the thread, which is what a switch or a "go back"
   * needs. `keep` appends instead: the student's first sentence stays where
   * they wrote it, with the guide line and the first block under it.
   */
  const load = useCallback(
    async (params: Record<string, string>, options: { keep?: boolean } = {}) => {
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
        setSeen((prev) =>
          prev.some((p) => p.toLowerCase() === body.node.term.toLowerCase())
            ? prev
            : [...prev, body.node.term],
        );

        const opening: Line[] = [];
        let guide = "";
        const pushGuide = (text: string) => {
          guide = text;
          opening.push({ id: nextId(), kind: "guide", text });
        };
        if (options.keep) pushGuide(guideInto(body.node.term));
        if (body.prerequisite) {
          pushGuide(`This rests on ${body.prerequisite.term}: ${body.prerequisite.definition}`);
        }
        if (body.blocks[0]) {
          opening.push({ id: nextId(), kind: "content", html: body.blocks[0].html });
        }

        setLines((prev) => (options.keep ? [...prev, ...opening] : opening));
        // Keep the live region reading the newest guide line, or clear it when a
        // new topic opens with no guide line of its own.
        setAnnouncement(guide);
        setRevealed(body.blocks.length > 0 ? 1 : 0);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setNote("Could not reach the course index.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /* The phenomenon, fetched once. A failure still leaves the case on the page:
   the tale carries the same story as plain text. */
  useEffect(() => {
    const source = beat0?.source;
    if (!source) return;

    let cancelled = false;
    const query = new URLSearchParams({
      chapter: source.chapter,
      section: source.section ?? "",
      blocks: "1",
      omit: (beat0?.omit ?? []).join(","),
    });

    fetch(`/api/content?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("no content"))))
      .then((body: { blocks?: Block[] }) => {
        if (cancelled) return;
        setOrigin({ status: "ready", blocks: Array.isArray(body.blocks) ? body.blocks : [] });
      })
      .catch(() => {
        if (cancelled) return;
        setOrigin({ status: "failed", blocks: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [tale, beat0]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines.length]);

  /* Mirror what the student has opened and written into the Focus store. The
     panel reads it; nothing here reads it back. Only the student's own
     sentences travel: the guide's replies and the reader text are not theirs
     to claim, and no strength is invented for a sentence no model judged. */
  useEffect(() => {
    writeUncovered({
      terms: seen,
      messages: lines.flatMap((line) => (line.kind === "student" ? [{ text: line.text }] : [])),
    });
  }, [seen, lines]);

  function pushBlock(index: number) {
    const block = ladder?.blocks[index];
    if (!block) return false;
    setLines((prev) => [...prev, { id: nextId(), kind: "content", html: block.html }]);
    setRevealed(index + 1);
    return true;
  }

  /**
   * The unit's authored moves become the tutor's nudge.
   *
   * Each beat already says what to ask when an answer is empty or thin. Using
   * that sentence keeps the seven-step teaching arc inside the one box the
   * student is already writing in, so the arc survives without a second
   * interface to visit.
   */
  function nudgeFor(strength: string): string | null {
    if (!beat) return null;
    const usable = beat.moves.filter((move) => !assumesWidget(move));
    const pick =
      (strength === "empty" ? usable.find((move) => move.when === "empty") : undefined) ??
      usable.find((move) => move.when === "thin") ??
      usable[0];
    return pick?.say ?? null;
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

  /**
   * The first answer chooses the thread.
   *
   * The beat's own concepts are offered as candidates, so the paragraph the
   * student reaches first is the one their own sentence touched.
   */
  async function beginFromOrigin(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (busy || text.length === 0) return;

    setNote(null);
    setDraft("");
    // Their sentence is the first model of the unit. It stays on screen.
    setLines((prev) => [...prev, { id: nextId(), kind: "student", text }]);

    await load(
      { q: text, candidates: (beat0?.concepts ?? []).join(",") },
      { keep: true },
    );
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

      // A held position is a stall: the beat's own move speaks instead of the
      // generic line. The announcement follows the text on screen, never a
      // sentence the student cannot see.
      const held = decision.reveal === "stay" || decision.reveal === "none";
      const say = (held ? nudgeFor(decision.strength) : null) ?? decision.say;

      setLines((prev) => [...prev, { id: nextId(), kind: "guide", text: say }]);
      setAnnouncement(say);

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

  /* The phenomenon, capped so the question comes quickly.
   *
   * The opening shows the story and nothing else. The section also carries the
   * summary figure, whose caption states the two ideas outright ("a wall to
   * matter and a window to energy"), and a diagram whose labels name the same
   * answer. A student is asked to write what they think before any of this is
   * taught, so the figure would answer the question they have not been asked
   * yet. It stays one click away in the closed case-study panel below instead. */
  const storyBlocks = origin.blocks.filter((block) => block.kind === "text").slice(0, 2);
  const caseBlocks = origin.blocks
    .filter((block) => block.kind === "text" || block.kind === "figure")
    .slice(0, 3);

  function story() {
    if (storyBlocks.length === 0) {
      return <p className="st-origin-lead">{tale.phenomenon}</p>;
    }
    return storyBlocks.map((block, index) => (
      <div
        key={`story-${index}`}
        className="st-reader st-origin-block"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    ));
  }

  function caseStudy() {
    if (origin.status === "loading") {
      return <p className="st-loading">Opening the case study</p>;
    }
    if (caseBlocks.length === 0) {
      return <p className="st-origin-lead">{tale.phenomenon}</p>;
    }
    return (
      <>
        {caseBlocks.map((block, index) => (
          <div
            key={`case-${index}`}
            className="st-reader st-origin-block"
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        ))}
      </>
    );
  }

  return (
    <div className="st-explore">
      <div className="st-eyebrow">Explore</div>

      {ladder ? (
        <>
          <h1 className="st-title">{ladder.node.term}</h1>
          <p className="st-origin-question">{tale.drivingQuestion}</p>
          {/* The case study stays on the page, closed until the student asks. */}
          <details className="st-case">
            <summary>The bottle</summary>
            {caseStudy()}
          </details>
        </>
      ) : (
        <>
          <h1 className="st-title">{tale.drivingQuestion}</h1>
          <div className="st-origin">
            {origin.status === "loading" ? (
              <p className="st-loading">Opening the case study</p>
            ) : (
              story()
            )}
          </div>
        </>
      )}

      {lines.length > 0 && (
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
      )}

      <p className="st-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {note && <p className="st-warn">{note}</p>}

      <form className="st-composer" onSubmit={ladder ? send : beginFromOrigin}>
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
            // Enter sends, Shift+Enter breaks the line. isComposing keeps
            // Chinese and Japanese input methods from sending mid-word.
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (!busy && draft.trim()) e.currentTarget.form?.requestSubmit();
            }}
            aria-describedby={HINT_ID}
            placeholder="A guess, a question, anything."
          />
          <button type="submit" className="st-primary" disabled={busy || !draft.trim()}>
            {busy ? "…" : "Send"}
          </button>
        </div>
        <p id={HINT_ID} className="st-composer-hint">
          {ladder ? "Press Enter to send. Press Shift and Enter for a new line." : OPENING_HINT}
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
