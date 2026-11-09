import type { Beat, Strength } from "../types";

export type Depth =
  | "empty"
  | "label"
  | "mechanism"
  | "contradiction"
  | "transfer"
  | "off-topic";

/**
 * What the tutor may return. Ids, never prose, and never the explanation the
 * step is trying to get the student to build.
 */
export interface TutorDecision {
  depth: Depth;
  strength: Strength;
  /** concepts the answer did not touch, from the beat's own list */
  missing: string[];
  /** one of the beat's move ids */
  moveId: string;
  /** one of the beat's bridge ids, or null when no reading is needed */
  bridgeId: string | null;
  /** short internal note. Never shown to a student. */
  note?: string;
}

const DEPTHS: Depth[] = [
  "empty", "label", "mechanism", "contradiction", "transfer", "off-topic",
];
const STRENGTHS: Strength[] = ["empty", "thin", "emerging", "strong"];

/** Everything a provider is allowed to see. No target explanation is included. */
export interface TutorInput {
  beatId: string;
  prompt: string;
  concepts: string[];
  text: string;
  bridgeIds: string[];
  moveIds: string[];
  bridgeHints: { id: string; triggers: string[] }[];
}

export interface TutorProvider {
  id: string;
  label: string;
  model?: string;
  available(): Promise<boolean>;
  decide(input: TutorInput, beat: Beat): Promise<TutorDecision>;
}

export interface TutorResult {
  decision: TutorDecision;
  provider: string;
  model?: string;
  latencyMs: number;
  /** true when the named provider failed and the authored bank answered */
  fellBack: boolean;
  error?: string;
}

export function inputFor(beat: Beat, text: string): TutorInput {
  return {
    beatId: beat.id,
    prompt: beat.prompt,
    concepts: beat.concepts,
    text,
    bridgeIds: (beat.bridges ?? []).map((b) => b.id),
    moveIds: beat.moves.map((m) => m.id),
    bridgeHints: (beat.bridges ?? []).map((b) => ({ id: b.id, triggers: b.triggers })),
  };
}

/**
 * Reject anything outside the beat. A provider that invents an id, or a model
 * that answers in prose, cannot leak past this.
 */
export function coerce(
  raw: Partial<TutorDecision>,
  input: TutorInput,
  fallback: TutorDecision,
): TutorDecision {
  const depth = DEPTHS.includes(raw.depth as Depth) ? (raw.depth as Depth) : fallback.depth;
  const strength = STRENGTHS.includes(raw.strength as Strength)
    ? (raw.strength as Strength)
    : fallback.strength;

  const missing = (Array.isArray(raw.missing) ? raw.missing : [])
    .map((m) => String(m).trim().toLowerCase())
    .filter((m) => input.concepts.includes(m))
    .slice(0, 6);

  const moveId = input.moveIds.includes(String(raw.moveId ?? ""))
    ? String(raw.moveId)
    : fallback.moveId;

  const bridge = raw.bridgeId == null ? null : String(raw.bridgeId).trim();
  const bridgeId =
    bridge && input.bridgeIds.includes(bridge)
      ? bridge
      : bridge === null || bridge === ""
        ? null
        : fallback.bridgeId;

  return {
    depth,
    strength,
    missing: missing.length > 0 ? missing : fallback.missing,
    moveId,
    bridgeId,
    note: typeof raw.note === "string" ? raw.note.slice(0, 200) : undefined,
  };
}
