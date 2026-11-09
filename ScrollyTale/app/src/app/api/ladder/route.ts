import { NextResponse } from "next/server";
import { chooseNext, node, prerequisiteOf, routeText, routeWithin } from "../../../lib/explore";
import { DEFAULT_OMIT, loadSection, splitBlocks } from "../../../lib/extract";
import { CHAPTERS } from "../../../data/toc.generated";

/**
 * One concept, broken into the smallest pieces that still say something.
 *
 * The student is not shown how many pieces there are. They answer a question
 * about one piece, and only then does the next piece appear.
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
  const candidates = (searchParams.get("candidates") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // A first answer is routed inside the phenomenon's own vocabulary when the
  // caller names it, so the door is one the author chose.
  const start = term
    ? node(term)
    : query
      ? candidates.length > 0
        ? routeWithin(query, candidates)
        : routeText(query)
      : null;
  if (!start) {
    return NextResponse.json({ error: "No concept found" }, { status: 404 });
  }

  const teaches = start.openedSection ?? start.teaches;
  let blocks: { kind: string; html: string }[] = [];

  if (teaches) {
    const chapter = CHAPTERS.find((c) => c.id === teaches.chapter);
    if (chapter) {
      try {
        const section = await loadSection(chapter.file, teaches.section, DEFAULT_OMIT);
        blocks = splitBlocks(section.html);
      } catch {
        blocks = [];
      }
    }
  }

  return NextResponse.json({
    node: start,
    prerequisite: prerequisiteOf(start.term, [...seen, start.term]),
    blocks,
    next: chooseNext(start.term, [...seen, start.term]),
  });
}
