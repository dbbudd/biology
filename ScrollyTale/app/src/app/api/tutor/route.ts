import { NextResponse } from "next/server";
import { decide, providerStatus } from "../../../lib/tutor";
import { sealedGardenTale } from "../../../data/tales/u2-sealed-garden";

/**
 * The tutor. Takes a beat id and capped student text, returns ids only.
 *
 * No explanation is ever returned, so nothing here can hand a student the
 * answer the step is holding back. The key, when there is one, stays in this
 * process and is never sent to the browser.
 */

const MAX_TEXT = 1200;
const MAX_BEAT = 40;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function GET() {
  return NextResponse.json(await providerStatus());
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute." },
      { status: 429 },
    );
  }

  let body: { beatId?: unknown; text?: unknown; provider?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  }

  const beatId = String(body.beatId ?? "");
  const text = String(body.text ?? "");

  if (!beatId || beatId.length > MAX_BEAT) {
    return NextResponse.json({ error: "Unknown beat" }, { status: 400 });
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json(
      { error: `Text is longer than ${MAX_TEXT} characters` },
      { status: 413 },
    );
  }

  const beat = sealedGardenTale.beats.find((b) => b.id === beatId);
  if (!beat) {
    return NextResponse.json({ error: "Unknown beat" }, { status: 404 });
  }

  // A provider override is a development convenience for the fixture harness.
  const override =
    process.env.NODE_ENV !== "production" && typeof body.provider === "string"
      ? body.provider
      : undefined;

  const result = await decide(beat, text, override);
  return NextResponse.json({ beatId, ...result });
}
