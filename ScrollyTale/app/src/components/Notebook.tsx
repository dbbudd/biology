"use client";

import type { Commit, ParkedQuestion, StandardEvidence, TaleState } from "../lib/types";

interface Props {
  state: TaleState;
  onUnpark: (id: string) => void;
  onReset: () => void;
}

const KIND_LABEL: Record<string, string> = {
  model: "First model",
  observation: "Evidence",
  revision: "Revision",
  retrieval: "Recall",
  transfer: "Transfer",
  snapshot: "Snapshot",
};

export function Notebook({ state, onUnpark, onReset }: Props) {
  const written = state.commits.filter((c) => c.text.trim().length > 0);
  const byStandard = groupEvidence(state.evidence);

  return (
    <aside className="st-notebook">
      <div className="st-notebook-head">
        <h2>My model</h2>
        <span>{written.length} entries</span>
      </div>

      {written.length === 0 && (
        <p className="st-empty">Nothing written yet. Your explanations collect here.</p>
      )}

      <ol className="st-commits">
        {written
          .slice()
          .reverse()
          .map((c: Commit) => (
            <li key={c.id} className={`st-commit st-commit-${c.kind}`}>
              <div className="st-commit-meta">
                <span>{KIND_LABEL[c.kind] ?? c.kind}</span>
                <time>{new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              </div>
              <p>{c.text}</p>
              {c.matched.length > 0 && (
                <div className="st-tags">
                  {c.matched.slice(0, 6).map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              )}
            </li>
          ))}
      </ol>

      {state.parked.length > 0 && (
        <section className="st-parked">
          <h3>Parked questions</h3>
          <p className="st-note">Kept for later. None of these is answered yet.</p>
          <ul>
            {state.parked.map((q: ParkedQuestion) => (
              <li key={q.id}>
                <p>{q.text}</p>
                <button type="button" onClick={() => onUnpark(q.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(byStandard).length > 0 && (
        <section className="st-standards">
          <h3>Standards evidence</h3>
          <p className="st-note">Provisional, scored on this device from your writing.</p>
          <ul>
            {Object.entries(byStandard).map(([code, rows]) => (
              <li key={code}>
                <span className="st-code">{code}</span>
                <span className="st-band">{rows.at(-1)?.band}</span>
                <span className="st-count">{rows.length}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="st-reset" onClick={onReset}>
        Clear this tale from this device
      </button>
    </aside>
  );
}

function groupEvidence(evidence: StandardEvidence[]) {
  const out: Record<string, StandardEvidence[]> = {};
  for (const row of evidence) {
    (out[row.standard] ??= []).push(row);
  }
  return out;
}
