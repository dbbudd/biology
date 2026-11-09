import type { Commit, TaleState } from "./types";

const KEY = "bio_tale";

function blank(taleId: string): TaleState {
  const now = new Date().toISOString();
  return {
    taleId,
    version: 1,
    startedAt: now,
    updatedAt: now,
    currentBeat: 0,
    commits: [],
    parked: [],
    nudges: {},
    beatStartedAt: { [taleId]: now },
    evidence: [],
  };
}

export function loadState(taleId: string): TaleState {
  if (typeof window === "undefined") return blank(taleId);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return blank(taleId);
    const parsed = JSON.parse(raw) as TaleState;
    if (parsed.taleId !== taleId) return blank(taleId);
    return { ...blank(taleId), ...parsed };
  } catch {
    return blank(taleId);
  }
}

export function saveState(state: TaleState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
  );
}

export function commitsFor(state: TaleState, beatId: string): Commit[] {
  return state.commits.filter((c) => c.beatId === beatId);
}

export function latestCommit(state: TaleState, beatId: string): Commit | undefined {
  return commitsFor(state, beatId).at(-1);
}

export function modelHistory(state: TaleState): Commit[] {
  return state.commits.filter(
    (c) => c.kind === "model" || c.kind === "revision" || c.kind === "transfer",
  );
}

export function exportState(state: TaleState): string {
  return JSON.stringify(state, null, 2);
}
