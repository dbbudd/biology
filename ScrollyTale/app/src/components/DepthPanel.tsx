"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  readUncovered,
  subscribeUncovered,
  type UncoveredState,
} from "../lib/uncovered";

/**
 * The Focus panel.
 *
 * Two things only: the concepts the student opened, and the one edge of the
 * unit's targets they are closest to. The parent decides when it is on screen.
 *
 * The bands come from `/api/focus`, which judges the student's own sentences.
 * The route is written alongside this component, so the response is read
 * through the small readers below rather than trusted field by field.
 */

type BandName = "Emerging" | "Developing" | "Exhibiting" | "Exhibiting with Depth";

const BAND_LABELS: Record<BandName, string> = {
  Emerging: "Emerging",
  Developing: "Developing",
  Exhibiting: "Exhibiting",
  "Exhibiting with Depth": "Exhibiting with depth",
};

/** The empty state the server renders, so hydration matches before the store loads. */
const EMPTY_SERVER: UncoveredState = { terms: [], messages: [] };
const serverSnapshot = () => EMPTY_SERVER;

interface FocusTarget {
  text: string;
  band: string | null;
  evidence: string[];
}

interface FocusEdge {
  text: string;
  why: string;
}

interface FocusResult {
  edge: FocusEdge | null;
  targets: FocusTarget[];
  touched: number;
  total: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The label and the style key for one band. A null band has not started. */
function bandFor(band: string | null): { label: string; key: string } {
  if (band === null) return { label: "Not yet", key: "not-started" };
  if (band in BAND_LABELS) {
    const name = band as BandName;
    return {
      label: BAND_LABELS[name],
      key: name === "Exhibiting with Depth" ? "depth" : name.toLowerCase(),
    };
  }
  // A band this build does not know yet still shows the student's own wording
  // rather than being reported as not started.
  return { label: band, key: "other" };
}

function readTargets(value: unknown): FocusTarget[] {
  if (!Array.isArray(value)) return [];

  const targets: FocusTarget[] = [];
  for (const entry of value) {
    const row = asRecord(entry);
    if (!row) continue;

    // `text` is the documented field. The two near-synonyms are accepted so a
    // rename on the route cannot blank a target the student has reached.
    const text = readText(row.text) || readText(row.target) || readText(row.statement);
    if (text === "") continue;

    const band = readText(row.band);
    const evidence: string[] = [];
    if (Array.isArray(row.evidence)) {
      for (const item of row.evidence) {
        // A sentence, or a record that carries it in `text`. Two at most.
        const line = readText(item) || readText(asRecord(item)?.text);
        if (line !== "") evidence.push(line);
        if (evidence.length === 2) break;
      }
    }

    targets.push({ text, band: band === "" ? null : band, evidence });
  }
  return targets;
}

function readResult(value: unknown): FocusResult | null {
  const body = asRecord(value);
  // Without a targets list there is nothing to show, so the panel keeps the
  // result it already had instead of drawing an empty one.
  if (!body || !Array.isArray(body.targets)) return null;

  const targets = readTargets(body.targets);

  const edgeRow = asRecord(body.edge);
  const edgeText = edgeRow
    ? readText(edgeRow.text) || readText(edgeRow.target) || readText(edgeRow.statement)
    : "";
  const edge = edgeText === "" ? null : { text: edgeText, why: edgeRow ? readText(edgeRow.why) : "" };

  const coverage = asRecord(body.coverage);
  const started = targets.filter((target) => target.band !== null).length;
  const touched =
    typeof coverage?.targetsTouched === "number" ? coverage.targetsTouched : started;
  const total = typeof coverage?.targetsTotal === "number" ? coverage.targetsTotal : targets.length;

  return { edge, targets, touched, total };
}

export default function DepthPanel() {
  const store = useSyncExternalStore(subscribeUncovered, readUncovered, serverSnapshot);

  const [result, setResult] = useState<FocusResult | null>(null);
  /** The request whose answer has arrived, so "in flight" needs no extra write. */
  const [answered, setAnswered] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});

  /** The signature of the last request, so an unchanged write does not refetch. */
  const sent = useRef("");
  /** Section names, fetched once per term for the life of the panel. */
  const nameCache = useRef(new Map<string, string>());

  const { terms, messages } = store;
  const pending = answered !== JSON.stringify(messages);

  /* Ask for the depth of the unit from the sentences the student wrote. */
  useEffect(() => {
    const request = JSON.stringify(messages);
    if (request === sent.current) return;
    sent.current = request;

    const controller = new AbortController();

    fetch("/api/focus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unit: "u2", messages }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("the depth check did not answer");
        return response.json() as Promise<unknown>;
      })
      .then((body) => {
        const next = readResult(body);
        if (!next) throw new Error("the depth check returned no result");
        setResult(next);
        setFailed(false);
      })
      .catch(() => {
        // Keep the last good result on screen. The quiet line says the check
        // did not answer; the panel does not erase itself.
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAnswered(request);
      });

    return () => {
      controller.abort();
      // Let the next mount ask again, which also keeps a strict-mode re-run
      // from skipping its own request.
      if (sent.current === request) sent.current = "";
    };
  }, [messages]);

  /* Which reader section each concept opened. A failure is silent: the term on
     its own still names the door the student walked through. */
  useEffect(() => {
    let cancelled = false;
    const missing = terms.filter((term) => !nameCache.current.has(term));
    if (missing.length === 0) return;

    void (async () => {
      for (const term of missing) {
        if (nameCache.current.has(term)) continue;
        let heading = "";
        try {
          const response = await fetch(`/api/ladder?term=${encodeURIComponent(term)}`);
          if (response.ok) {
            const body = asRecord(await response.json());
            const node = asRecord(body?.node);
            heading =
              readText(asRecord(node?.teaches)?.heading) ||
              readText(asRecord(node?.openedSection)?.heading);
          }
        } catch {
          heading = "";
        }
        nameCache.current.set(term, heading);
        if (heading !== "" && !cancelled) {
          setNames((previous) => ({ ...previous, [term]: heading }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [terms]);

  const started = result ? result.targets.filter((target) => target.band !== null) : [];
  const notStarted = result ? result.targets.filter((target) => target.band === null) : [];

  return (
    <aside className="st-depth" role="complementary" aria-label="Depth and uncovered concepts">
      {/* The live region holds the edge only, so a new result is announced once
          and the rest of the panel stays quiet. */}
      <div className="st-depth-edge" aria-live="polite">
        {result?.edge && (
          <>
            <h2 className="st-depth-edge-head">The edge you are closest to</h2>
            <p className="st-depth-edge-target">{result.edge.text}</p>
            {result.edge.why !== "" && <p className="st-depth-edge-why">{result.edge.why}</p>}
          </>
        )}
      </div>

      {pending && <p className="st-depth-quiet">Checking your words.</p>}

      {failed && <p className="st-depth-quiet st-depth-fail">The depth check did not answer.</p>}

      {result && (
        <section className="st-depth-block">
          <h2 className="st-depth-head">
            Depth
            <span className="st-depth-count">
              {result.touched} of {result.total} targets started
            </span>
          </h2>

          {started.length > 0 ? (
            <ul className="st-depth-list">
              {started.map((target, index) => {
                const band = bandFor(target.band);
                return (
                  <li
                    key={`${target.text}-${index}`}
                    className={`st-depth-row st-depth-row-${band.key}`}
                  >
                    <span className="st-depth-target">{target.text}</span>
                    <span className={`st-depth-band st-depth-band-${band.key}`}>{band.label}</span>
                    {target.evidence.length > 0 && (
                      <div className="st-depth-evidence">
                        <span className="st-depth-evidence-label">Your words</span>
                        <ul className="st-depth-quotes">
                          {target.evidence.map((line, quoteIndex) => (
                            <li key={quoteIndex}>
                              <q>{line}</q>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="st-depth-quiet">No target has started yet.</p>
          )}

          {notStarted.length > 0 && (
            <details className="st-depth-not-yet">
              <summary>Targets not started yet</summary>
              <ul className="st-depth-list">
                {notStarted.map((target, index) => {
                  const band = bandFor(target.band);
                  return (
                    <li
                      key={`${target.text}-${index}`}
                      className="st-depth-row st-depth-row-not-started"
                    >
                      <span className="st-depth-target">{target.text}</span>
                      <span className={`st-depth-band st-depth-band-${band.key}`}>{band.label}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

          <p className="st-depth-honest">
            These bands come from your own written words. Nothing here is graded.
          </p>
        </section>
      )}

      <section className="st-depth-block">
        <h2 className="st-depth-head">Uncovered</h2>
        {terms.length === 0 ? (
          <p className="st-depth-quiet">You have not opened a concept yet.</p>
        ) : (
          <ul className="st-depth-terms">
            {terms.map((term) => (
              <li key={term} className="st-depth-term-row">
                <span className="st-depth-term">{term}</span>
                {names[term] ? <span className="st-depth-where">{names[term]}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
