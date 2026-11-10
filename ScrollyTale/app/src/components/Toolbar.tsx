"use client";

import { useEffect, useRef, useState } from "react";
import type { ReaderFont, ReaderTheme, UnitProgress } from "../lib/prefs";
import { figureUrl } from "../lib/reader";
import TranslatePopover from "./TranslatePopover";

/** The two surfaces. The guided one is a URL escape hatch now, not a choice. */
export type Mode = "guided" | "explore";

interface Props {
  theme: ReaderTheme;
  font: ReaderFont;
  scale: number;
  focus: boolean;
  listening: boolean;
  listenAvailable: boolean;
  progress: UnitProgress;
  menuOpen: boolean;
  onMenuToggle: () => void;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onTheme: (t: ReaderTheme) => void;
  onFont: (f: ReaderFont) => void;
  onScale: (s: number) => void;
  onFocus: () => void;
  onListen: () => void;
}

const THEMES: ReaderTheme[] = ["light", "sepia", "dark"];
const FONTS: { id: ReaderFont; label: string }[] = [
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "dyslexic", label: "Dyslexic" },
];

/**
 * The reader's toolbar.
 *
 * The course menu, the logo and the brand on the left; the controls a student
 * needs while writing on the right. Size, font and theme sit behind one Text
 * button, as they do in the reader, so a crowded header is not a menu of its
 * own. Nothing here changes what a control does — only where it is grouped.
 */
export default function Toolbar({
  theme,
  font,
  scale,
  focus,
  listening,
  listenAvailable,
  progress,
  menuOpen,
  onMenuToggle,
  menuButtonRef,
  onTheme,
  onFont,
  onScale,
  onFocus,
  onListen,
}: Props) {
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const [textOpen, setTextOpen] = useState(false);
  const textWrapRef = useRef<HTMLDivElement | null>(null);
  const textButtonRef = useRef<HTMLButtonElement | null>(null);

  // Escape and a click outside close the reading panel. Same drawer idea as the
  // reader's Text menu, with focus landing back on the button that opened it.
  useEffect(() => {
    if (!textOpen) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!textWrapRef.current?.contains(event.target as Node)) setTextOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setTextOpen(false);
      textButtonRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [textOpen]);

  return (
    <header className="st-header">
      <div className="st-toolbar-left">
        <button
          ref={menuButtonRef}
          type="button"
          className="st-menu-toggle"
          aria-label="Open the course menu"
          aria-expanded={menuOpen}
          aria-controls="st-course-menu"
          onClick={onMenuToggle}
        >
          <span aria-hidden="true">&#9776;</span>
        </button>
        <img
          className="st-toolbar-logo"
          src={figureUrl("HKIS-logo.png")}
          alt="HKIS logo"
          width={32}
          height={32}
        />
        <span className="st-brand">
          <span className="st-mark">Biology</span>
          <span className="st-sub">Unit 2 · Energy flows and matter cycles</span>
        </span>
      </div>

      <div className="st-tools">
        <div
          className="st-progress-meter"
          title={`${progress.done} of ${progress.total} tracked sections in Unit 2`}
        >
          <span className="st-progress-bar">
            <span style={{ width: `${pct}%` }} />
          </span>
          <span className="st-progress-text">
            {progress.done}/{progress.total}
          </span>
        </div>

        <div className="st-text-wrap" ref={textWrapRef}>
          <button
            ref={textButtonRef}
            type="button"
            className={`st-tool st-text-toggle${textOpen ? " is-on" : ""}`}
            aria-expanded={textOpen}
            aria-haspopup="true"
            aria-controls="st-aa-popover"
            onClick={() => setTextOpen((open) => !open)}
          >
            Text
          </button>

          {textOpen && (
            <div className="st-aa-popover" id="st-aa-popover">
              <div className="st-aa-section">
                <div className="st-aa-label">Text Size</div>
                <div className="st-aa-row" role="group" aria-label="Text size">
                  <button
                    type="button"
                    className="st-aa-opt"
                    onClick={() => onScale(scale - 0.1)}
                    aria-label="Smaller text"
                  >
                    A−
                  </button>
                  <span className="st-aa-size">{Math.round(scale * 100)}%</span>
                  <button
                    type="button"
                    className="st-aa-opt"
                    onClick={() => onScale(scale + 0.1)}
                    aria-label="Larger text"
                  >
                    A+
                  </button>
                </div>
              </div>

              <div className="st-aa-section">
                <div className="st-aa-label">Font</div>
                <div className="st-aa-row" role="group" aria-label="Typeface">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`st-aa-opt${f.id === font ? " is-on" : ""}`}
                      aria-pressed={f.id === font}
                      onClick={() => onFont(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="st-aa-section">
                <div className="st-aa-label">Theme</div>
                <div className="st-aa-row" role="group" aria-label="Colors">
                  {THEMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`st-aa-opt${t === theme ? " is-on" : ""}`}
                      aria-pressed={t === theme}
                      onClick={() => onTheme(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <TranslatePopover />

        <button
          type="button"
          className={`st-tool${focus ? " is-on" : ""}`}
          aria-pressed={focus}
          onClick={onFocus}
        >
          Focus
        </button>

        {listenAvailable && (
          <button
            type="button"
            className={`st-tool${listening ? " is-on" : ""}`}
            aria-pressed={listening}
            onClick={onListen}
          >
            {listening ? "Stop" : "Listen"}
          </button>
        )}
      </div>
    </header>
  );
}
