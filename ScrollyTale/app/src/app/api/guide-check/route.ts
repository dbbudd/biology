import { NextResponse } from "next/server";
import { evaluate, pickBridge, pickMove } from "../../../lib/pacing";
import { sealedGardenTale } from "../../../data/tales/u2-sealed-garden";

/**
 * Authoring aid, development only. Answers "what would the guide do with this
 * sentence?" without opening the player. It reads the tale and returns a
 * decision; it writes nothing.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const beatId = searchParams.get("beat") ?? "";
  const text = searchParams.get("text") ?? "";

  const beat = sealedGardenTale.beats.find((b) => b.id === beatId);
  if (!beat) {
    return NextResponse.json(
      { error: "Unknown beat", beats: sealedGardenTale.beats.map((b) => b.id) },
      { status: 404 },
    );
  }

  const ev = evaluate(text, beat.concepts);
  const bridge = pickBridge(beat, ev);
  const move = pickMove(beat, ev, 0);

  return NextResponse.json({
    beat: beat.id,
    evaluation: {
      strength: ev.strength,
      wordCount: ev.wordCount,
      matched: ev.matched,
      missing: ev.missing,
    },
    bridge: bridge
      ? { id: bridge.id, frame: bridge.frame, ask: bridge.ask, source: bridge.source }
      : null,
    move: { id: move.id, say: move.say },
    bridgesAvailable: (beat.bridges ?? []).map((b) => b.id),
  });
}
