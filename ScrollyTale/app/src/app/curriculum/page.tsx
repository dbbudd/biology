import type { Metadata } from "next";
import Link from "next/link";
import CurriculumMap from "../../components/CurriculumMap";
import { ReferencePrefs } from "../../components/GlossaryView";
import { FONTS } from "../../lib/prefs";
import "../globals-reference.css";

export const metadata: Metadata = {
  title: "Curriculum standards · ScrollyTale",
  description:
    "The NGSS standards this course teaches, set against its six units, with the learning targets that address each one.",
};

/**
 * Same shell script as the glossary page: the reader keeps theme, font and text
 * size in localStorage (lib/prefs mirrors course.js), and these server-rendered
 * pages carry those preferences onto the shell before it paints.
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

export default function CurriculumPage() {
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

        <h1 className="ref-title">Curriculum standards</h1>
        <p className="ref-lead">
          The NGSS standards for this course, set against its six units. A cell counts that
          unit&rsquo;s learning targets under that standard, and every cell prints its number, so
          the shade is never the only cue. Open a row for the targets behind the count, with the
          reading sections that teach them.
        </p>

        <CurriculumMap />
      </main>
    </div>
  );
}
