/**
 * The reader's own preference keys, reused rather than reinvented.
 *
 * A student who set up the reader should not have to set up the tale. These are
 * the same names course.js writes: bio_theme, bio_font, bio_fontScale, bio_focus.
 * Course progress stays in bio_progress, in the reader's shape.
 */

export type ReaderTheme = "light" | "sepia" | "dark";
export type ReaderFont = "sans" | "serif" | "dyslexic";

export const FONTS: Record<ReaderFont, string> = {
  sans: "'Segoe UI',system-ui,-apple-system,sans-serif",
  serif: "Georgia,'Times New Roman',serif",
  dyslexic: "'OpenDyslexic','Comic Sans MS',sans-serif",
};

export interface Prefs {
  theme: ReaderTheme;
  font: ReaderFont;
  scale: number;
  focus: boolean;
}

const DEFAULT_PREFS: Prefs = { theme: "light", font: "sans", scale: 1, focus: false };

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* a blocked storage should not break reading */
  }
}

export function readPrefs(): Prefs {
  const scale = Number(get("bio_fontScale"));
  return {
    theme: (get("bio_theme") as ReaderTheme) ?? DEFAULT_PREFS.theme,
    font: (get("bio_font") as ReaderFont) ?? DEFAULT_PREFS.font,
    scale: Number.isFinite(scale) && scale > 0 ? Math.min(1.5, Math.max(0.75, scale)) : 1,
    focus: get("bio_focus") === "true",
  };
}

export function writeTheme(theme: ReaderTheme): void {
  set("bio_theme", theme);
}

export function writeFont(font: ReaderFont): void {
  set("bio_font", font);
}

export function writeScale(scale: number): void {
  set("bio_fontScale", String(Number(scale.toFixed(2))));
}

export function writeFocus(focus: boolean): void {
  set("bio_focus", String(focus));
}

/* ---------------- course progress ---------------- */

type ProgressStore = Record<string, Record<string, boolean>>;

export function readProgressStore(): ProgressStore {
  return readProgress();
}

function readProgress(): ProgressStore {
  try {
    return (JSON.parse(get("bio_progress") ?? "{}") as ProgressStore) ?? {};
  } catch {
    return {};
  }
}

/**
 * The reader tracks sections that opt in with data-track, keyed by chapter then
 * section id. The tale records the same thing when a student works that section,
 * so the tick appears in the reader as well.
 */
export function markSectionRead(chapterId: string, sectionId: string): void {
  const store = readProgress();
  store[chapterId] = store[chapterId] ?? {};
  if (store[chapterId][sectionId]) return;
  store[chapterId][sectionId] = true;
  set("bio_progress", JSON.stringify(store));
}

export interface UnitProgress {
  done: number;
  total: number;
  chaptersStarted: number;
  chapters: number;
}

export function unitProgress(
  chapters: { id: string; sections: number }[],
): UnitProgress {
  const store = readProgress();
  let done = 0;
  let total = 0;
  let started = 0;

  for (const chapter of chapters) {
    total += chapter.sections;
    const entries = Object.keys(store[chapter.id] ?? {}).filter(
      (k) => store[chapter.id][k],
    );
    if (entries.length > 0) started++;
    done += Math.min(entries.length, chapter.sections || entries.length);
  }

  return { done, total, chaptersStarted: started, chapters: chapters.length };
}

/* ---------------- which sections the reader tracks ---------------- */

const tracked = new Set<string>();

export function rememberTracked(chapterId: string, sectionId: string, isTracked: boolean): void {
  if (isTracked) tracked.add(`${chapterId}#${sectionId}`);
}

export function wasTracked(chapterId: string, sectionId: string): boolean {
  return tracked.has(`${chapterId}#${sectionId}`);
}
