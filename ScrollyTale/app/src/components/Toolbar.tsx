"use client";

import type { ReaderFont, ReaderTheme, UnitProgress } from "../lib/prefs";

export type Mode = "guided" | "explore";

interface Props {
  mode: Mode;
  onMode: (m: Mode) => void;
  theme: ReaderTheme;
  font: ReaderFont;
  scale: number;
  focus: boolean;
  listening: boolean;
  listenAvailable: boolean;
  progress: UnitProgress;
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

export default function Toolbar({
  mode,
  onMode,
  theme,
  font,
  scale,
  focus,
  listening,
  listenAvailable,
  progress,
  onTheme,
  onFont,
  onScale,
  onFocus,
  onListen,
}: Props) {
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <header className="st-header">
      <div className="st-brand">
        <span className="st-mark">ScrollyTale</span>
        <span className="st-sub">Unit 2 · Energy flows and matter cycles</span>
      </div>

      <div className="st-tools">
        <div className="st-group" role="group" aria-label="Mode">
          <button
            type="button"
            className={mode === "guided" ? "is-on" : undefined}
            aria-pressed={mode === "guided"}
            onClick={() => onMode("guided")}
          >
            Guided
          </button>
          <button
            type="button"
            className={mode === "explore" ? "is-on" : undefined}
            aria-pressed={mode === "explore"}
            onClick={() => onMode("explore")}
          >
            Explore
          </button>
        </div>
        <div className="st-progress-meter" title={`${progress.done} of ${progress.total} tracked sections in Unit 2`}>
          <span className="st-progress-bar">
            <span style={{ width: `${pct}%` }} />
          </span>
          <span className="st-progress-text">
            {progress.done}/{progress.total}
          </span>
        </div>

        <div className="st-group" role="group" aria-label="Colors">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              className={t === theme ? "is-on" : undefined}
              aria-pressed={t === theme}
              onClick={() => onTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="st-group" role="group" aria-label="Typeface">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={f.id === font ? "is-on" : undefined}
              aria-pressed={f.id === font}
              onClick={() => onFont(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="st-group" role="group" aria-label="Text size">
          <button type="button" onClick={() => onScale(scale - 0.1)} aria-label="Smaller text">
            A−
          </button>
          <span className="st-size">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => onScale(scale + 0.1)} aria-label="Larger text">
            A+
          </button>
        </div>

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
