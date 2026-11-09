"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FONTS, type ReaderFont, type ReaderTheme } from "../lib/prefs";

/**
 * The glossary's one interactive part: the search.
 *
 * The server page hands this component a flat, already-slugged and already
 * capped list, so the client never re-reads the concept graph and nothing here
 * touches the network. Filtering is local and instant: a term matches when the
 * query appears in its name or in its definition.
 *
 * The list is grouped A–Z with a jump row. Only the first PER_LETTER entries of
 * each letter render at first, so the initial page is about a third of the
 * 297-term DOM; "Show all" reveals the rest, and a search always renders every
 * match rather than a capped slice.
 */

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const THEMES: ReaderTheme[] = ["light", "sepia", "dark"];

function applyReaderPrefs(root: HTMLElement | null): void {
  if (!root) return;
  try {
    const theme = window.localStorage.getItem("bio_theme");
    if (THEMES.includes(theme as ReaderTheme)) root.dataset.theme = theme as string;
    const scale = Number(window.localStorage.getItem("bio_fontScale"));
    if (scale > 0) root.style.setProperty("--font-scale", String(Math.min(1.5, Math.max(0.75, scale))));
    const font = window.localStorage.getItem("bio_font") as ReaderFont | null;
    if (font && FONTS[font]) {
      root.style.setProperty("--body-font", FONTS[font]);
      root.style.setProperty("--heading-font", FONTS[font]);
    }
  } catch {
    /* a blocked storage keeps the page's own light default */
  }
}

/**
 * Puts the reader's saved theme, font and text size on the reference shell.
 *
 * A full page load is already handled by the inline script in each page, which
 * runs before paint. This covers the other way in: a client-side navigation from
 * the tale's sidebar, where a server-rendered script does not run. A layout
 * effect applies the preferences before the browser paints, so the page never
 * flashes the light theme on the way in.
 */
export function ReferencePrefs() {
  useIsomorphicLayoutEffect(() => {
    applyReaderPrefs(document.querySelector<HTMLElement>(".ref-page"));
  }, []);
  return null;
}

export interface Neighbour {
  term: string;
  slug: string;
}

export interface GlossaryEntry {
  term: string;
  slug: string;
  definition: string;
  builtOn: Neighbour[];
  builtOnMore: number;
  leadsTo: Neighbour[];
  leadsToMore: number;
  teaches: { chapter: string; heading: string; unit: string } | null;
}

const PER_LETTER = 6;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function groupByLetter(entries: GlossaryEntry[]): { letter: string; entries: GlossaryEntry[] }[] {
  const groups = new Map<string, GlossaryEntry[]>();
  for (const entry of entries) {
    const letter = entry.term.charAt(0).toUpperCase();
    const list = groups.get(letter);
    if (list) list.push(entry);
    else groups.set(letter, [entry]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "en"))
    .map(([letter, list]) => ({ letter, entries: list }));
}

function NeighbourLinks({ items, more }: { items: Neighbour[]; more: number }) {
  return (
    <>
      {items.map((item, index) => (
        <span key={item.slug}>
          {index > 0 && ", "}
          <a href={`#term-${item.slug}`}>{item.term}</a>
        </span>
      ))}
      {more > 0 && <span className="ref-more-count"> and {more} more</span>}
    </>
  );
}

function GlossEntry({ entry }: { entry: GlossaryEntry }) {
  const hasNeighbours = entry.builtOn.length > 0 || entry.leadsTo.length > 0;

  return (
    <article className="ref-entry" id={`term-${entry.slug}`}>
      <h3 className="ref-term">{entry.term}</h3>
      <p className="ref-def">{entry.definition}</p>

      {entry.teaches && (
        <p className="ref-teaches">
          Taught in {entry.teaches.chapter} · {entry.teaches.unit}
          {entry.teaches.heading ? ` · ${entry.teaches.heading}` : ""}
        </p>
      )}

      {hasNeighbours && (
        <p className="ref-nbrs">
          {entry.builtOn.length > 0 && (
            <span className="ref-nbr">
              <span className="ref-nbr-label">Built on </span>
              <NeighbourLinks items={entry.builtOn} more={entry.builtOnMore} />
            </span>
          )}
          {entry.leadsTo.length > 0 && (
            <span className="ref-nbr">
              <span className="ref-nbr-label">Leads to </span>
              <NeighbourLinks items={entry.leadsTo} more={entry.leadsToMore} />
            </span>
          )}
        </p>
      )}
    </article>
  );
}

export default function GlossaryView({ entries }: { entries: GlossaryEntry[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const needle = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!needle) return entries;
    return entries.filter(
      (entry) =>
        entry.term.toLowerCase().includes(needle) ||
        entry.definition.toLowerCase().includes(needle),
    );
  }, [entries, needle]);

  const groups = useMemo(() => groupByLetter(matches), [matches]);
  const present = useMemo(() => new Set(groups.map((group) => group.letter)), [groups]);

  const capped = !needle && !showAll;

  const countText = needle
    ? `${matches.length} ${matches.length === 1 ? "term matches" : "terms match"} “${query.trim()}”`
    : showAll
      ? `All ${entries.length} terms`
      : `Showing the first ${PER_LETTER} terms of each letter, ${entries.length} terms in all`;

  return (
    <>
      <div className="ref-toolbar">
        <div className="ref-search">
          <label className="ref-label" htmlFor="ref-q">
            Search the glossary
          </label>
          <div className="ref-findrow">
            <input
              id="ref-q"
              className="ref-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a word or phrase, for example glucose"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="ref-count ref-search-hint"
            />
            {!needle && (
              <button
                type="button"
                className="ref-button"
                aria-pressed={showAll}
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? `Show fewer terms` : `Show all ${entries.length} terms`}
              </button>
            )}
          </div>
          <p className="ref-hint" id="ref-search-hint">
            Matches a term when the search appears in its name or its definition.
          </p>
        </div>
      </div>

      <p className="ref-count" id="ref-count" role="status">
        {countText}
      </p>

      <nav className="ref-letters" aria-label="Jump to a letter">
        {LETTERS.map((letter) =>
          present.has(letter) ? (
            <a key={letter} className="ref-letter" href={`#ref-letter-${letter}`}>
              {letter}
            </a>
          ) : (
            <span key={letter} className="ref-letter ref-letter-off" aria-hidden="true">
              {letter}
            </span>
          ),
        )}
      </nav>

      {matches.length === 0 ? (
        <p className="ref-empty">
          No term matches “{query.trim()}”. Try one word from the reading, or clear the search to
          see every term.
        </p>
      ) : (
        groups.map((group) => {
          const visible = capped ? group.entries.slice(0, PER_LETTER) : group.entries;
          const hidden = group.entries.length - visible.length;

          return (
            <section className="ref-entrygroup" key={group.letter} aria-labelledby={`ref-letter-${group.letter}`}>
              <h2 className="ref-letterhead" id={`ref-letter-${group.letter}`}>
                {group.letter}
              </h2>
              {visible.map((entry) => (
                <GlossEntry key={entry.slug} entry={entry} />
              ))}
              {hidden > 0 && (
                <p className="ref-more-count">
                  {hidden} more {group.letter} terms are hidden. Choose Show all above to include
                  them.
                </p>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
