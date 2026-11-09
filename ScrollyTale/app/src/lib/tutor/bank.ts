import { evaluate, pickBridge, pickMove } from "../pacing";
import type { Beat } from "../types";
import type { Depth, TutorDecision, TutorInput, TutorProvider } from "./types";

/** Deterministic, authored, and always available. This is the floor the other
 *  providers are measured against, and the answer when a model is missing. */
function decideFromBank(input: TutorInput, beat: Beat): TutorDecision {
  const ev = evaluate(input.text, beat.concepts);
  const move = pickMove(beat, ev, 0);

  const depth: Depth =
    ev.strength === "empty"
      ? "empty"
      : ev.strength === "thin"
        ? "label"
        : ev.strength === "emerging"
          ? "mechanism"
          : "mechanism";

  // A response that already explains the idea is not given more reading.
  const needsReading = ev.strength === "thin" || ev.strength === "empty";
  const bridge = needsReading ? pickBridge(beat, ev) : undefined;

  return {
    depth,
    strength: ev.strength,
    missing: ev.missing.slice(0, 6),
    moveId: move.id,
    bridgeId: bridge?.id ?? null,
    note: "authored bank",
  };
}

export const bankProvider: TutorProvider = {
  id: "bank",
  label: "Authored bank",
  available: async () => true,
  decide: async (input, beat) => decideFromBank(input, beat),
};
