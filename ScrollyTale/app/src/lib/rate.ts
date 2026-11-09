/** Per-address request ceiling. A class shares one address, so this is a
 *  burst guard, not a per-student quota. In-memory and per process. */
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

export function addressOf(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
