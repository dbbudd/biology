"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { readPrefs, type ReaderTheme } from "../lib/prefs";
import { referenceUrl } from "../lib/reader";

/**
 * One reference page from the reader, shown inside the tale.
 *
 * The reader owns these three pages: its interactive glossary map, its
 * standards matrix, and its change log. Rebuilding them here would mean
 * reimplementing the map and the GitHub-backed log, and keeping two copies of
 * the same page in step forever. So the page is the reader's own document in a
 * frame, with the reader's own stylesheet and scripts, which is the only way
 * for the two systems to look the same by construction rather than by
 * maintenance.
 *
 * Two parameters make that work:
 *   chrome=0  the reader renders the content without its toolbar and sidebar,
 *             because the tale already has a header above the frame.
 *   theme=…   the reader draws in the theme the tale is already showing, so the
 *             frame does not sit in a different colour from its surroundings.
 *
 * The frame is cross-origin, so nothing here can read or restyle its contents.
 * That is deliberate: the point is that the reader stays the source of truth.
 */

export type ReferencePage = "glossary" | "standards" | "changelog";

interface Props {
  page: ReferencePage;
  title: string;
}

const THEME_EVENT = "bio-theme-change";

/**
 * The theme is the tale's stored preference, which is an external store rather
 * than React state, so it is read as one. The subscription also keeps the frame
 * in step if the preference changes in another tab.
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function currentTheme(): ReaderTheme {
  try {
    return readPrefs().theme;
  } catch {
    return "light";
  }
}

export default function ReaderEmbed({ page, title }: Props) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as ReaderTheme);

  return (
    <div className="st-root st-embedded" data-theme={theme} suppressHydrationWarning>
      <div className="st-embed-bar">
        <Link className="st-embed-back" href="/">
          Back to Explore
        </Link>
        <span className="st-embed-title">{title}</span>
      </div>

      {/* The frame carries the whole page, so it needs a real title for a
          screen reader, and it takes the height the bar leaves. */}
      <iframe className="st-embed-frame" src={referenceUrl(page, theme)} title={title} />
    </div>
  );
}
