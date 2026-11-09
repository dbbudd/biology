/**
 * What the student has uncovered, kept in one small place.
 *
 * Explore writes here; the Focus panel reads here. The store holds only what the
 * student can claim: the concepts they opened, and the sentences they wrote
 * themselves. Nothing in this file talks to the network or to React.
 *
 * The snapshot `readUncovered` returns keeps the same identity until something
 * actually changes, which is what `useSyncExternalStore` needs to render the
 * panel without a loop. It is frozen, so a reader cannot edit the store by
 * accident; use `writeUncovered` to change it.
 */

export interface UncoveredMessage {
  text: string;
  strength?: string;
}

export interface UncoveredState {
  terms: string[];
  messages: UncoveredMessage[];
}

const STORAGE_KEY = "bio_uncovered";
/** The last 40 terms and messages are enough for a sitting; older ones fall off. */
const LIMIT = 40;

const empty = (): UncoveredState => ({ terms: [], messages: [] });

let cached: UncoveredState | null = null;
const listeners = new Set<(state: UncoveredState) => void>();

const copy = (state: UncoveredState): UncoveredState => ({
  terms: [...state.terms],
  messages: state.messages.map(({ text, strength }) => ({ text, strength })),
});

const clipped = (state: UncoveredState): UncoveredState => ({
  terms: state.terms.slice(-LIMIT),
  messages: state.messages.slice(-LIMIT).map(({ text, strength }) => ({ text, strength })),
});

/** The one object a subscriber renders: copied, clipped, and frozen. */
function settle(state: UncoveredState): UncoveredState {
  const next = clipped(state);
  Object.freeze(next.terms);
  Object.freeze(next.messages);
  next.messages.forEach((message) => Object.freeze(message));
  Object.freeze(next);
  return next;
}

/**
 * A value read from storage, reduced to the fields this store knows. Anything
 * else in the record is dropped rather than trusted.
 */
function parse(value: unknown): UncoveredState {
  if (typeof value !== "object" || value === null) return empty();
  const record = value as { terms?: unknown; messages?: unknown };

  const terms = Array.isArray(record.terms)
    ? record.terms.filter(
        (term): term is string => typeof term === "string" && term.trim() !== "",
      )
    : [];

  const messages: UncoveredMessage[] = [];
  if (Array.isArray(record.messages)) {
    for (const entry of record.messages) {
      if (typeof entry !== "object" || entry === null) continue;
      const message = entry as { text?: unknown; strength?: unknown };
      if (typeof message.text !== "string" || message.text.trim() === "") continue;
      messages.push(
        typeof message.strength === "string"
          ? { text: message.text, strength: message.strength }
          : { text: message.text },
      );
    }
  }

  return clipped({ terms, messages });
}

/** Read storage. Private mode, a quota error or bad JSON all read as empty. */
function load(): UncoveredState {
  if (typeof window === "undefined") return settle(empty());
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return settle(empty());
    return settle(parse(JSON.parse(stored) as unknown));
  } catch {
    return settle(empty());
  }
}

const emit = (state: UncoveredState) => {
  for (const listener of listeners) {
    listener(copy(state));
  }
};

export function readUncovered(): UncoveredState {
  if (!cached) cached = load();
  return cached;
}

export function writeUncovered(next: UncoveredState): void {
  const state = settle({
    terms: [...next.terms],
    messages: next.messages.map(({ text, strength }) => ({ text, strength })),
  });
  cached = state;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota. The page keeps working from the copy in
    // memory above; the next visit simply starts with nothing.
  }

  emit(state);
}

/**
 * Listen for changes in this tab and in any other tab showing the reader.
 *
 * The unsubscribe function removes both, so a panel that unmounts leaves no
 * listener behind.
 */
export function subscribeUncovered(
  listener: (state: UncoveredState) => void,
): () => void {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const onStorage = (event: StorageEvent) => {
    // A null key is a full clear, which is also a change to report.
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cached = load();
    listener(copy(cached));
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
