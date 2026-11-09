import { NextResponse } from "next/server";
import {
  DEFAULT_UNIT,
  hasUnit,
  nearestEdge,
  scoreTargets,
  type Message,
} from "../../../lib/depth";
import { addressOf, rateLimited } from "../../../lib/rate";
import type { Strength } from "../../../lib/types";

/**
 * What the student has uncovered so far, and the one target to aim at next.
 *
 * Read-only report: it scores the messages it is sent and writes nothing at all
 * — no state, no file, no model call. The score is a heuristic over the words
 * the student used (see lib/depth), so this route never grades anyone.
 *
 * Request:  { "unit": "u2", "messages": [{ "text": "…", "strength": "thin" }] }
 * Response: { unit, targets, edge, coverage }
 */

const STRENGTHS: string[] = ["empty", "thin", "emerging", "strong"];
const MAX_MESSAGES = 40;
const MAX_TEXT = 1200;

export async function POST(request: Request) {
  if (rateLimited(addressOf(request))) {
    return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }

  // A malformed body is treated as no messages rather than a throw, so a stale
  // client never blanks the panel with a 500.
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body !== null && typeof body === "object" ? body : {}) as {
    unit?: unknown;
    messages?: unknown;
  };

  const unit = typeof input.unit === "string" && input.unit.trim() !== "" ? input.unit.trim() : DEFAULT_UNIT;
  if (!hasUnit(unit)) {
    return NextResponse.json({ error: "Unknown unit" }, { status: 404 });
  }

  const messages: Message[] = (Array.isArray(input.messages) ? input.messages : [])
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => ({
      text: typeof item.text === "string" ? item.text.slice(0, MAX_TEXT) : "",
      strength:
        typeof item.strength === "string" && STRENGTHS.includes(item.strength)
          ? (item.strength as Strength)
          : undefined,
    }))
    .filter((message) => message.text.trim() !== "")
    .slice(-MAX_MESSAGES);

  const targets = scoreTargets(messages, 0, unit);

  return NextResponse.json({
    unit,
    targets,
    edge: nearestEdge(targets),
    coverage: {
      messages: messages.length,
      targetsTouched: targets.filter((target) => target.band !== null).length,
      targetsTotal: targets.length,
    },
  });
}
