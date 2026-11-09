"use client";

import { useEffect, useState } from "react";
import { embedUrl, READER_BASE } from "../lib/reader";
import type { ReaderTheme } from "../lib/reader";

interface Props {
  sim: string;
  title: string;
  task: string;
  theme: ReaderTheme;
}

/** The reader's own embed.html draws one interactive. Nothing is copied here. */
export default function SimFrame({ sim, title, task, theme }: Props) {
  const [height, setHeight] = useState(520);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; sim?: string; height?: number };
      if (data?.type !== "bio-embed-size" || data.sim !== sim) return;
      const next = Number(data.height);
      if (!Number.isFinite(next)) return;
      setHeight(Math.max(320, Math.min(1500, next + 8)));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sim]);

  return (
    <div className="st-sim">
      <div className="st-sim-bar">
        <div>
          <div className="st-sim-title">{title}</div>
          <div className="st-sim-task">{task}</div>
        </div>
        <div className="st-sim-actions">
          <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
            Reload
          </button>
          <a
            href={`${READER_BASE}/embed.html?sim=${encodeURIComponent(sim)}&theme=${theme}`}
            target="_blank"
            rel="noreferrer"
          >
            Open full size
          </a>
        </div>
      </div>
      <iframe
        key={`${sim}-${theme}-${reloadKey}`}
        title={title}
        src={embedUrl(sim, theme)}
        style={{ height }}
        loading="lazy"
        allow="fullscreen"
      />
    </div>
  );
}
