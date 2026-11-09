"use client";

import { useEffect, useState } from "react";
import { rememberTracked } from "../lib/prefs";

interface Props {
  chapter: string;
  section: string;
  /** open pulls the text immediately; collapsed offers it and waits for a click */
  mode: "open" | "collapsed";
  /** reader components this step does not need */
  omit?: string[];
  label: string;
}

interface Payload {
  chapter: string;
  sectionId: string;
  html: string;
  heading: string;
  wordCount: number;
  tracked: boolean;
}

const cache = new Map<string, Payload>();

export default function ReaderSection({ chapter, section, mode, omit, label }: Props) {
  const omitKey = (omit ?? []).join(",");
  const key = `${chapter}#${section}|${omitKey}`;
  const [open, setOpen] = useState(mode === "open");
  const [payload, setPayload] = useState<Payload | null>(cache.get(key) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || payload) return;
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const query = new URLSearchParams({ chapter, section });
        if (omitKey) query.set("omit", omitKey);
        const res = await fetch(`/api/content?${query.toString()}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as Payload & { error?: string };
        if (!res.ok) throw new Error(body.error ?? "The section did not load");
        if (cancelled) return;
        cache.set(key, body);
        rememberTracked(chapter, section, body.tracked);
        setPayload(body);
      } catch (e) {
        if (cancelled || (e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "The section did not load");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, payload, chapter, section, key, omitKey, attempt]);

  if (!open) {
    return (
      <div className="st-reader-closed">
        <button type="button" onClick={() => setOpen(true)}>
          {label}
        </button>
      </div>
    );
  }

  return (
    <section className="st-reader-wrap">
      <div className="st-reader-head">
        <span className={`st-reader-label${payload?.heading ? " is-heading" : ""}`}>
          {payload?.heading || label}
        </span>
        {payload && <span className="st-reader-count">{payload.wordCount} words</span>}
      </div>

      {!payload && !error && <p className="st-reader-note">Pulling the section from the reader.</p>}

      {error && (
        <div className="st-reader-error">
          <p>{error}</p>
          <p className="st-reader-note">
            The reader must be running at the address in NEXT_PUBLIC_READER_BASE.
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}

      {payload && (
        <div className="st-reader" dangerouslySetInnerHTML={{ __html: payload.html }} />
      )}
    </section>
  );
}
