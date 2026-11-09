export const READER_BASE = (
  process.env.NEXT_PUBLIC_READER_BASE ?? "http://localhost:4321"
).replace(/\/$/, "");

export type ReaderTheme = "light" | "sepia" | "dark";

/** A chapter page in the reader, optionally scrolled to a section. */
export function chapterUrl(file: string, section?: string): string {
  const base = `${READER_BASE}/${file}`;
  return section ? `${base}#${encodeURIComponent(section)}` : base;
}

/** One interactive on its own, using the reader's own embed page. */
export function embedUrl(sim: string, theme: ReaderTheme): string {
  const q = new URLSearchParams({ sim, theme, v: "333" });
  return `${READER_BASE}/embed.html?${q.toString()}`;
}

export function figureUrl(path: string): string {
  return `${READER_BASE}/images/${path}`;
}
