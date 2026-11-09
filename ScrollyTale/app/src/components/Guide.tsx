"use client";

import type { Move } from "../lib/types";

interface Props {
  move: Move;
  nudges: number;
  onPark: (question: string) => void;
  parked: boolean;
}

export function Guide({ move, nudges, onPark, parked }: Props) {
  return (
    <div className="st-guide">
      <div className="st-guide-head">
        <span className="st-guide-dot" aria-hidden="true" />
        <h2>Guide</h2>
        <code>{move.id}</code>
      </div>
      <p className="st-guide-say">{move.say}</p>
      <div className="st-guide-foot">
        <span>
          {nudges === 0
            ? "First attempt"
            : nudges === 1
              ? "One nudge given"
              : "Two nudges given"}
        </span>
        {!parked && (
          <button type="button" onClick={() => onPark(move.say)}>
            Park this instead
          </button>
        )}
      </div>
    </div>
  );
}
