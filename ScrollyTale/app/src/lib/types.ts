export type BeatKind =
  | "phenomenon"
  | "evidence"
  | "revision"
  | "recall"
  | "transfer"
  | "snapshot";

export type CommitKind =
  | "model"
  | "observation"
  | "revision"
  | "retrieval"
  | "transfer"
  | "snapshot";

/** A move the guide may pick. These ids are the allow-list a future
 *  /api/tutor route is allowed to return instead of prose. */
export type MoveWhen = "empty" | "thin" | "partial" | "always";

export interface Move {
  id: string;
  when: MoveWhen;
  say: string;
}

export interface SimRef {
  /** file name in the reader's sims/ directory, without .js */
  key: string;
  title: string;
  /** what the student does inside it, one line */
  task: string;
}

export type ReaderBlockName =
  | "prompts" | "key" | "note" | "example" | "misconception"
  | "check" | "figure" | "table" | "details";

/**
 * A bridge is shown when an answer is thin. It pulls reader content that closes
 * the specific gap the answer exposed, then asks a narrower question.
 *
 * `triggers` are phrases in the student's words; `covers` are concepts the
 * bridge supplies. The bridge whose triggers and gaps match best is the one
 * that appears, so the content answers what was actually written.
 */
export interface Bridge {
  id: string;
  triggers: string[];
  covers: string[];
  /** what to look for in the section, one sentence. Never the answer. */
  frame: string;
  /** the narrower question that follows the reading */
  ask: string;
  /** the narrower question is judged on these, not on the whole beat */
  concepts: string[];
  source: SourceRef;
  omit?: ReaderBlockName[];
}

export interface SourceRef {
  /** chapter id from assets/toc.js */
  chapter: string;
  /** section id inside that chapter */
  section?: string;
}

export interface Beat {
  id: string;
  kind: BeatKind;
  eyebrow: string;
  title: string;
  prompt: string;
  helper?: string;
  minutes: number;
  commit: CommitKind;
  source?: SourceRef;
  /** "open" pulls the reader text into the step; "collapsed" offers it.
   *  Absent on beats where reading would answer the step for the student. */
  readInline?: "open" | "collapsed";
  /** Reader components this step leaves out, on top of the default
   *  (focus-question prompts and quick checks). */
  omit?: ReaderBlockName[];
  bridges?: Bridge[];
  sim?: SimRef;
  /** words that signal the idea is present in a response */
  concepts: string[];
  moves: Move[];
  /** plain-language criterion shown to the student */
  closeEnough: string;
  standards: string[];
}

export interface Tale {
  id: string;
  unit: string;
  title: string;
  subtitle: string;
  phenomenon: string;
  drivingQuestion: string;
  budgetMinutes: number;
  beats: Beat[];
}

export type Strength = "empty" | "thin" | "emerging" | "strong";

export interface Evaluation {
  strength: Strength;
  matched: string[];
  missing: string[];
  wordCount: number;
  normalised: string;
  repeated: boolean;
}

export interface Commit {
  id: string;
  beatId: string;
  kind: CommitKind;
  text: string;
  at: string;
  strength: Strength;
  matched: string[];
  nudges: number;
}

export interface ParkedQuestion {
  id: string;
  beatId: string;
  text: string;
  at: string;
}

export type Band = "Emerging" | "Developing" | "Exhibiting" | "Exhibiting with Depth";

export interface StandardEvidence {
  standard: string;
  band: Band;
  beatId: string;
  at: string;
}

export interface TaleState {
  taleId: string;
  version: number;
  startedAt: string;
  updatedAt: string;
  currentBeat: number;
  commits: Commit[];
  parked: ParkedQuestion[];
  nudges: Record<string, number>;
  beatStartedAt: Record<string, string>;
  evidence: StandardEvidence[];
}
