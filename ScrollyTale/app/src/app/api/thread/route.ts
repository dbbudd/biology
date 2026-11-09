import { NextResponse } from "next/server";
import { node, prerequisiteOf } from "../../../lib/explore";
import { addressOf, rateLimited } from "../../../lib/rate";
import { modelProvider, DEFAULT_PROVIDER } from "../../../lib/tutor";
import {
  BANK_REPLIES,
  coerceConcept,
  completionFor,
  type ConceptDecision,
} from "../../../lib/tutor/concept";

/**
 * One box for everything the student writes.
 *
 * It decides how much the student can take next and reveals accordingly. It
 * never returns the explanation: the reply is one sentence, and the content is
 * released a piece at a time.
 */
export async function POST(request: Request) {
  if (rateLimited(addressOf(request), 60)) {
    return NextResponse.json({ error: "Too many messages. Wait a minute." }, { status: 429 });
  }

  let body: {
    term?: unknown;
    text?: unknown;
    revealed?: unknown;
    total?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  }

  const term = String(body.term ?? "");
  const text = String(body.text ?? "").slice(0, 1200);
  const revealed = Number(body.revealed ?? 0);
  const total = Number(body.total ?? 0);

  const concept = node(term);
  if (!concept) {
    return NextResponse.json({ error: "Unknown concept" }, { status: 404 });
  }

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2).length;

  const prerequisites = prerequisiteOf(concept.term)?.term
    ? [prerequisiteOf(concept.term)!.term]
    : [];

  const fallback: ConceptDecision = {
    strength: words === 0 ? "empty" : words < 5 ? "thin" : words < 15 ? "emerging" : "strong",
    say: words === 0 ? BANK_REPLIES.empty : words < 5 ? BANK_REPLIES.thin : BANK_REPLIES.next,
    reveal: words === 0 ? "none" : words < 5 ? "simpler" : "next",
  };

  const provider = modelProvider();
  if (!provider) {
    return NextResponse.json({ decision: fallback, provider: DEFAULT_PROVIDER, fellBack: false });
  }

  if (!(await provider.available())) {
    return NextResponse.json({
      decision: fallback,
      provider: "bank",
      fellBack: true,
      error: "The model is not available",
    });
  }

  try {
    const raw = (await provider.complete(
      completionFor({
        term: concept.term,
        definition: concept.definition,
        text,
        revealed,
        total,
        prerequisites,
      }),
    )) as Record<string, unknown>;

    return NextResponse.json({
      decision: coerceConcept(raw, fallback, (t) => Boolean(node(t))),
      provider: provider.id,
      fellBack: false,
    });
  } catch (error) {
    return NextResponse.json({
      decision: fallback,
      provider: "bank",
      fellBack: true,
      error: error instanceof Error ? error.message : "The model failed",
    });
  }
}
