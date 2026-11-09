"use client";

import { useEffect, useRef, useState } from "react";
import { READER_BASE } from "../lib/reader";

const GUIDE_URL = `${READER_BASE}/reference/glossary.html`;
const THEMES = ["light", "sepia", "dark"] as const;
type Theme = (typeof THEMES)[number];

/**
 * The reader's two progress indicators, drawn for the tale.
 *
 * The thin line under the header is the reader's page bar: how much of the
 * page has gone past. The bar at the foot of the screen is the reader's
 * position bar: the concept being read, the reading label, a short track, the
 * same percentage, and the one link out to the reader's reference.
 *
 * Both numbers are the page's own scroll fraction, exactly as in the reader,
 * so the two indicators can never disagree. Nothing is passed in: the concept
 * name is the page's own title, which the shell owns, so it is read from the
 * DOM and followed with a MutationObserver instead of a prop.
 *
 * Every listener, frame and observer is released on unmount. The percentage is
 * exposed once per bar: the visible readout is hidden from assistive
 * technology and the value travels on aria-valuenow instead.
 */
export default function ReadingBar() {
  const [pct, setPct] = useState(0);
  const [concept, setConcept] = useState("");
  const [top, setTop] = useState(0);
  const [theme, setTheme] = useState<Theme | null>(null);
  const shown = useRef(-1);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      const header = document.querySelector<HTMLElement>(".st-header");
      setTop(header ? Math.round(header.getBoundingClientRect().bottom) : 0);

      const doc = document.documentElement;
      const room = doc.scrollHeight - window.innerHeight;
      const next = room > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / room) * 100))) : 0;
      if (next !== shown.current) {
        shown.current = next;
        setPct(next);
      }
    };

    // The page's own title. It renders after the shell finishes loading, so it
    // is read here and re-read whenever the page changes underneath us.
    const readConcept = () => {
      const title = document.querySelector<HTMLElement>(".st-title");
      setConcept(title?.textContent?.trim() ?? "");
    };

    // The bars sit in the page whether or not they are inside .st-root, so the
    // theme is mirrored onto them and their fallback tokens follow it.
    const readTheme = () => {
      const shell = document.querySelector<HTMLElement>(".st-root");
      const value = shell?.dataset.theme;
      setTheme(THEMES.includes(value as Theme) ? (value as Theme) : null);
    };

    const tick = () => {
      frame = 0;
      measure();
      readConcept();
      readTheme();
    };

    // One frame per burst of scrolling, resizing or page changes.
    const ask = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    const watcher = new MutationObserver(ask);
    watcher.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    ask();

    return () => {
      window.removeEventListener("scroll", ask);
      window.removeEventListener("resize", ask);
      if (frame) window.cancelAnimationFrame(frame);
      watcher.disconnect();
    };
  }, []);

  return (
    <>
      {/* The page bar: the reader's .progress-bar, 3px under the header. */}
      <div
        className="st-progress-bar st-read-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Reading progress"
        data-theme={theme ?? undefined}
        style={top ? { top } : undefined}
      >
        <div className="st-read-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* The position bar: the reader's .reading-pos, at the foot of the page. */}
      <div className="st-readbar" data-theme={theme ?? undefined}>
        <span className="st-readbar-section" title={concept || undefined}>
          {concept}
        </span>
        <span className="st-readbar-progress">
          <span className="st-readbar-label">Reading</span>
          <span
            className="st-readbar-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Reading progress in this concept"
          >
            <span className="st-readbar-fill" style={{ width: `${pct}%` }} />
          </span>
          <span className="st-readbar-pct" aria-hidden="true">
            {pct}%
          </span>
          <a
            className="st-readbar-link"
            href={GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Reader guide
            <span className="st-readbar-sr"> (opens in a new tab)</span>
          </a>
        </span>
      </div>
    </>
  );
}
