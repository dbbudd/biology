import { NextResponse } from "next/server";
import { chooseAlternative, chooseNext, node, routeText, termCount } from "../../../lib/explore";

/**
 * One concept and one thing to do next. Never a list of what is coming: the
 * student sees the current idea, what it opens, and a single reveal.
 *
 * ?term=Photosynthesis&seen=A,B&q=free+text&alternative=x
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get("term") ?? "";
  const query = searchParams.get("q") ?? "";
  const seen = (searchParams.get("seen") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
  const alternative = searchParams.get("alternative") ?? "";

  const start = term ? node(term) : query ? routeText(query) : null;
  if (!start) {
    return NextResponse.json(
      { error: "No concept found", terms: termCount() },
      { status: 404 },
    );
  }

  const focus = query
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const next = alternative
    ? chooseAlternative(start.term, seen, alternative)
    : chooseNext(start.term, [...seen, start.term], focus);

  return NextResponse.json({ node: start, next });
}
