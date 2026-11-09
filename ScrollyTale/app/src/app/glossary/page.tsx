import type { Metadata } from "next";
import Link from "next/link";
import concepts from "../../data/concepts.generated.json";
import GlossaryView, {
  ReferencePrefs,
  type GlossaryEntry,
  type Neighbour,
} from "../../components/GlossaryView";
import { CHAPTERS, UNITS } from "../../data/toc.generated";
import { FONTS } from "../../lib/prefs";
import "../globals-reference.css";

export const metadata: Metadata = {
  title: "Glossary · ScrollyTale",
  description:
    "Every term marked in the reading, with its definition, what it is built on and what it leads to.",
};

interface TermRecord {
  definition: string;
  builtOn: string[];
  leadsTo: string[];
  teaches: { chapter: string; section: string; heading: string; unit: string } | null;
}

/** Neighbours shown per term before an "and N more" count. */
const NEIGHBOURS = 4;

const SLUG = (term: string): string =>
  term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const CHAPTER_TITLES = new Map(CHAPTERS.map((chapter) => [chapter.id, chapter.title]));
const UNIT_SHORT = new Map(UNITS.map((unit) => [unit.id, unit.short]));

function neighbours(terms: string[]): { shown: Neighbour[]; more: number } {
  const shown = terms.slice(0, NEIGHBOURS).map((term) => ({ term, slug: SLUG(term) }));
  return { shown, more: Math.max(0, terms.length - NEIGHBOURS) };
}

const TERMS = concepts.terms as unknown as Record<string, TermRecord>;

const ENTRIES: GlossaryEntry[] = Object.keys(TERMS)
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
  .map((term) => {
    const record = TERMS[term];
    const builtOn = neighbours(record.builtOn ?? []);
    const leadsTo = neighbours(record.leadsTo ?? []);
    return {
      term,
      slug: SLUG(term),
      definition: record.definition,
      builtOn: builtOn.shown,
      builtOnMore: builtOn.more,
      leadsTo: leadsTo.shown,
      leadsToMore: leadsTo.more,
      teaches: record.teaches
        ? {
            chapter: CHAPTER_TITLES.get(record.teaches.chapter) ?? record.teaches.chapter,
            heading: record.teaches.heading,
            unit: UNIT_SHORT.get(record.teaches.unit) ?? record.teaches.unit,
          }
        : null,
    };
  });

/**
 * The reader keeps its theme, font and text size in localStorage (see
 * lib/prefs, which mirrors course.js). These pages are server components, so a
 * few lines of inline script carry those preferences onto the page shell before
 * it paints. If the browser blocks storage the page stays on its light default.
 */
const PREFS_SCRIPT = `
try {
  var root = document.currentScript && document.currentScript.parentElement;
  if (root) {
    var saved = localStorage.getItem("bio_theme");
    if (saved === "light" || saved === "sepia" || saved === "dark") root.setAttribute("data-theme", saved);
    var scale = Number(localStorage.getItem("bio_fontScale"));
    if (scale > 0) root.style.setProperty("--font-scale", String(Math.min(1.5, Math.max(0.75, scale))));
    var fonts = ${JSON.stringify(FONTS)};
    var font = localStorage.getItem("bio_font");
    if (font && fonts[font]) {
      root.style.setProperty("--body-font", fonts[font]);
      root.style.setProperty("--heading-font", fonts[font]);
    }
  }
} catch (error) {}
`;

export default function GlossaryPage() {
  return (
    // The saved theme is applied to this element by the script below, before
    // paint, so its data-theme can differ from the server-rendered default.
    <div className="st-root ref-page" data-theme="light" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      {/* Covers a client-side navigation in from the tale, where the script
          above does not run. */}
      <ReferencePrefs />
      <main className="ref-main">
        <div className="ref-top">
          <Link className="ref-back" href="/">
            ← Back to Explore
          </Link>
          <span className="ref-eyebrow">Reference</span>
        </div>

        <h1 className="ref-title">Glossary</h1>
        <p className="ref-lead">
          Every term marked in the reading, with the same definition a chapter shows when you hover
          it. Each entry names what the idea is built on and what it leads to, so a word is a door
          to the words around it rather than a dead end.
        </p>

        <GlossaryView entries={ENTRIES} />
      </main>
    </div>
  );
}
