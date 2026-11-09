export const READER_BASE = (
  process.env.NEXT_PUBLIC_READER_BASE ?? "http://localhost:4321"
).replace(/\/$/, "");

/**
 * The reader's own cache-busting version, and it must match `ASSET_V` in
 * `assets/course.js` plus the `?v=` on the reader's script tags.
 *
 * It lives here because the tale asks the reader for pages as well as assets.
 * When the reader ships a change it bumps its version, and a stale copy of a
 * reference page in a frame is exactly as wrong as a stale script: the frame
 * URL has to change with it or the browser keeps the old document.
 */
export const READER_ASSET_V = "335";

export type ReaderTheme = "light" | "sepia" | "dark";

/** A chapter page in the reader, optionally scrolled to a section. */
export function chapterUrl(file: string, section?: string): string {
  const base = `${READER_BASE}/${file}`;
  return section ? `${base}#${encodeURIComponent(section)}` : base;
}

/** One interactive on its own, using the reader's own embed page. */
export function embedUrl(sim: string, theme: ReaderTheme): string {
  const q = new URLSearchParams({ sim, theme, v: READER_ASSET_V });
  return `${READER_BASE}/embed.html?${q.toString()}`;
}

/**
 * One reference page from the reader, without its toolbar, in the theme the
 * tale is showing. Both parameters are read by `assets/course.js`.
 */
export function referenceUrl(
  page: "glossary" | "standards" | "changelog",
  theme: ReaderTheme,
): string {
  const q = new URLSearchParams({ chrome: "0", theme, v: READER_ASSET_V });
  return `${READER_BASE}/reference/${page}.html?${q.toString()}`;
}

export function figureUrl(path: string): string {
  return `${READER_BASE}/images/${path}`;
}
