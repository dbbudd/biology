import { NextResponse } from "next/server";
import { DEFAULT_OMIT, loadSection, type ReaderBlock } from "../../../lib/extract";
import { CHAPTERS } from "../../../data/toc.generated";

/** Only chapters the reader's own table of contents already lists may be read. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapter") ?? "";
  const sectionId = searchParams.get("section") ?? "";

  const chapter = CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter) {
    return NextResponse.json({ error: "Unknown chapter" }, { status: 404 });
  }
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(sectionId)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  const ALLOWED: ReaderBlock[] = [
    "prompts", "key", "note", "example", "misconception", "check",
    "figure", "table", "details",
  ];
  const requested = (searchParams.get("omit") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x): x is ReaderBlock => (ALLOWED as string[]).includes(x));
  const omit = [...new Set([...DEFAULT_OMIT, ...requested])];

  try {
    const section = await loadSection(chapter.file, sectionId, omit);
    return NextResponse.json({ chapter: chapter.title, sectionId, ...section });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The reader section could not be loaded",
      },
      { status: 502 },
    );
  }
}
