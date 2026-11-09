"use client";

import type { TocChapter } from "../data/toc.generated";

interface Props {
  chapters: TocChapter[];
  activeId?: string;
  done?: Record<string, Record<string, boolean>>;
}

export function ReaderTrail({ chapters, activeId, done = {} }: Props) {
  return (
    <section className="st-trail">
      <h2>Where this step sits in Unit 2</h2>
      <p className="st-note">
        The tale brings in the reading each step needs. Nothing here opens another page, so the
        inquiry is not interrupted.
      </p>
      <ul>
        {chapters
          .filter((c) => c.status === "ready")
          .map((c) => (
            <li key={c.id} className={c.id === activeId ? "is-active" : undefined}>
              <div className="st-trail-row">
                <span className="st-trail-title">{c.title}</span>
                <span className="st-trail-meta">
                  {c.time}
                  {c.standards.length > 0 && ` · ${c.standards.join(" · ")}`}
                  {(() => {
                    const n = Object.values(done[c.id] ?? {}).filter(Boolean).length;
                    return n > 0 ? ` · ${n}/${c.sections} done` : "";
                  })()}
                </span>
                {c.question && <span className="st-trail-q">{c.question}</span>}
              </div>
            </li>
          ))}
      </ul>
    </section>
  );
}
