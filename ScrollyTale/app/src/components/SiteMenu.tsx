"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The unit label the panel is about, in the tale's own words. */
  unit: string;
  /** The header toggle, so focus has somewhere to land when the panel closes. */
  toggleRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * The reader's sidebar, as a slide-over.
 *
 * The reader pins a long unit list beside every page. This app has one unit and
 * one surface, so the panel carries what actually exists — the unit, the
 * surface, and the reference routes — rather than a list that would be empty.
 * The structure is the reader's: section labels, a sliding panel over a scrim,
 * and the Reference group held at the foot where it cannot scroll out of reach.
 */
export default function SiteMenu({ open, onClose, unit, toggleRef }: Props) {
  const panelRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) toggleRef.current?.focus();
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;
    const panel = panelRef.current;
    const items = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [],
      );

    // Focus moves in, and stays in: the page behind is modal while it is open.
    (items()[0] ?? panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = items();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    // A modal panel does not let the page scroll behind it.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
    };
  }, [open, onClose, toggleRef]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="st-scrim"
          aria-label="Close the course menu"
          tabIndex={-1}
          onClick={onClose}
        />
      )}

      <nav
        id="st-course-menu"
        ref={panelRef}
        className={`st-menu${open ? " is-open" : ""}`}
        aria-label="Course navigation"
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
      >
        <div className="st-menu-head">
          <div className="st-menu-label">{unit}</div>
          <button
            type="button"
            className="st-menu-close"
            aria-label="Close the course menu"
            onClick={onClose}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <ul className="st-menu-list">
          <li>
            <Link
              className="st-menu-link is-current"
              href="/"
              aria-current="page"
              onClick={onClose}
            >
              Explore
            </Link>
          </li>
        </ul>

        <div className="st-menu-reference">
          <div className="st-menu-label">Reference</div>
          <ul className="st-menu-list">
            <li>
              <Link className="st-menu-link" href="/glossary" onClick={onClose}>
                Glossary
              </Link>
            </li>
            <li>
              <Link className="st-menu-link" href="/curriculum" onClick={onClose}>
                Curriculum Mapping
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
