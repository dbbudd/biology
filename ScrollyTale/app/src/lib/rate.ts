/**
 * A per-address request ceiling, and nothing more.
 *
 * What it is: a burst guard. It counts the requests arriving from one address
 * and refuses the ones over the ceiling. The route calls it before it reads the
 * body, so it limits requests, not messages or model calls.
 *
 * What it is not:
 * - Not a per-student quota. A class arrives through the school's address and
 *   shares one counter, so the ceiling is effectively per class, not per person.
 * - Not shared. The counters are one map in one Node process: a restart forgets
 *   them, and two server instances each allow the full ceiling, so the real
 *   ceiling across a deployment is max x instances.
 * - Not a security control. The address is taken from X-Forwarded-For, which the
 *   caller controls, so a determined client can rotate it.
 *
 * Memory is bounded rather than growing for the life of the process: expired
 * keys are swept on call (never on a timer, so nothing keeps the process alive),
 * the sweep runs at most once every SWEEP_EVERY_CALLS calls — or sooner, but no
 * more than once every CROWDED_MIN_GAP calls, when the map is crowded — and each
 * key stores at most max + 1 timestamps. Live keys are still bounded by how many
 * distinct addresses arrive inside one window, not by the sweep, so a flood of
 * rotating spoofed addresses grows the map until those entries age out. That is
 * another reason this is a burst guard and not a wall.
 */

const DEFAULT_MAX = 60;
const DEFAULT_WINDOW_MS = 60_000;

/** Calls between sweeps when the map is a normal size. */
const SWEEP_EVERY_CALLS = 200;
/** Above this many keys, sweep more eagerly than the regular cadence. */
const CROWDED_KEYS = 2_000;
/** But not more often than this, so a crowded map cannot cost a sweep per call. */
const CROWDED_MIN_GAP = 25;

const hits = new Map<string, number[]>();
let callsSinceSweep = 0;
/** The widest window any caller has used, so a sweep never drops a timestamp
 *  that a caller with a longer window would still count. */
let widestWindowMs = DEFAULT_WINDOW_MS;

function usable(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** An entry whose newest hit has left the window cannot affect any decision. */
function sweepExpired(now: number): void {
  for (const [key, times] of hits) {
    const newest = times[times.length - 1];
    if (newest === undefined || now - newest >= widestWindowMs) hits.delete(key);
  }
}

function maybeSweep(now: number): void {
  callsSinceSweep += 1;
  const due = callsSinceSweep >= SWEEP_EVERY_CALLS;
  const crowded = hits.size >= CROWDED_KEYS && callsSinceSweep >= CROWDED_MIN_GAP;
  if (!due && !crowded) return;
  callsSinceSweep = 0;
  sweepExpired(now);
}

export function rateLimited(key: string, max = DEFAULT_MAX, windowMs = DEFAULT_WINDOW_MS): boolean {
  const now = Date.now();
  const limit = Number.isFinite(max) && max >= 0 ? Math.floor(max) : DEFAULT_MAX;
  const window = usable(windowMs, DEFAULT_WINDOW_MS);
  if (window > widestWindowMs) widestWindowMs = window;

  maybeSweep(now);

  const recent = (hits.get(key) ?? []).filter((t) => now - t < window);
  recent.push(now);
  // A client that floods must not grow its own array without limit. Keeping the
  // newest max + 1 timestamps still answers "over the ceiling" exactly, and the
  // extra one says when the burst will have slid out of the window.
  if (recent.length > limit + 1) recent.splice(0, recent.length - limit - 1);
  hits.set(key, recent);
  return recent.length > limit;
}

export function addressOf(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
