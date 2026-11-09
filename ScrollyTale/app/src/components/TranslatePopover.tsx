"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  LANGUAGES,
  TranslateError,
  availability,
  supported,
  translateStrings,
  type Availability,
  type TranslateLanguage,
} from "../lib/translate";

/**
 * The Translate control, as one toolbar button and its popover.
 *
 * The translation happens on this device, in Chrome 138 or later, through the
 * builder in `../lib/translate`. There is no server call and no fallback that
 * sends text anywhere, so when the API is missing the panel says so instead of
 * offering a button that quietly does nothing.
 *
 * What gets translated is the reader text the student can see: the
 * `.st-thread-content` blocks inside the thread. The tutor's replies and the
 * student's own sentences are theirs, not ours to rewrite, and they stay as
 * written. The original markup of every block is snapshotted before it changes,
 * so "Back to English" restores it exactly.
 */

const PANEL_ID = "st-tr-panel";
const LABEL_ID = "st-tr-label";
const LANG_ID = "st-tr-lang";

/** The API list never changes in a session, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};
const clientSupported = () => supported();
const serverSupported = () => false;

const ICON = (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 5.5h8" />
    <path d="M7.5 4v1.5" />
    <path d="M9.6 5.5c-.5 3.2-2.7 5.7-6.1 6.8" />
    <path d="M5.2 8.4c.9 1.9 2.8 3.2 5 3.7" />
    <path d="M12.2 20l3.9-9 3.9 9" />
    <path d="M13.6 17h5" />
  </svg>
);

interface Snapshot {
  element: HTMLElement;
  html: string;
  lang: string | null;
  dir: string | null;
}

function nativeName(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.native ?? code;
}

function optionLabel(language: TranslateLanguage): string {
  return `${language.native} (${language.english})`;
}

function setOrRemove(element: HTMLElement, name: "lang" | "dir", value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/** The reader blocks the student can see. Scoped to the thread for a reason. */
function collectTargets(): HTMLElement[] {
  const thread = document.querySelector(".st-thread");
  if (!thread) return [];
  return Array.from(thread.querySelectorAll<HTMLElement>(".st-thread-content"));
}

/**
 * The text inside those blocks, as text nodes.
 *
 * Changing a text node leaves its tags, ids and table structure intact. Code,
 * formulas and SVG labels are skipped: a translated formula, or a label that no
 * longer fits its diagram, is worse than one in English.
 */
function textNodesIn(elements: readonly HTMLElement[]): Text[] {
  const nodes: Text[] = [];
  for (const element of elements) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue ?? "";
      if (text.trim() === "") continue;
      if (node.parentElement?.closest("svg, code, pre, kbd, samp")) continue;
      nodes.push(node as Text);
    }
  }
  return nodes;
}

export default function TranslatePopover() {
  const onDevice = useSyncExternalStore(noSubscribe, clientSupported, serverSupported);

  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("");
  const [probe, setProbe] = useState<Availability | "checking" | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const root = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const snapshots = useRef<Snapshot[]>([]);
  const probeToken = useRef(0);

  /* Escape closes and returns focus; a click outside closes without stealing
     focus from whatever the student clicked next. */
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const element = root.current;
      if (element && event.target instanceof Node && element.contains(event.target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      // If the thread was replaced while the panel was shut, the translated
      // blocks are gone with it; do not keep claiming a translation is showing.
      if (applied !== null && snapshots.current.every((snap) => !snap.element.isConnected)) {
        snapshots.current = [];
        setApplied(null);
        setStatus("");
      } else if (applied !== null && status === "") {
        setStatus(`Showing ${nativeName(applied)}.`);
      }
    }
    setOpen(!open);
  }

  /** Put the English markup back. The snapshot is exact, so this is a true undo. */
  function restoreDom() {
    for (const snapshot of snapshots.current) {
      if (!snapshot.element.isConnected) continue;
      snapshot.element.innerHTML = snapshot.html;
      setOrRemove(snapshot.element, "lang", snapshot.lang);
      setOrRemove(snapshot.element, "dir", snapshot.dir);
    }
    snapshots.current = [];
  }

  function backToEnglish() {
    restoreDom();
    setApplied(null);
    setStatus("Back to English.");
  }

  async function chooseLanguage(code: string) {
    setLang(code);
    setProbe(null);
    const token = ++probeToken.current;

    if (code === "") {
      setStatus("");
      return;
    }

    setProbe("checking");
    setStatus(`Checking ${nativeName(code)}…`);
    const state = await availability(code);
    if (probeToken.current !== token) return;

    setProbe(state);
    setStatus(messageForAvailability(state, code));
  }

  async function run() {
    if (busy || lang === "") return;

    // Always translate from the English source, never from a translation.
    if (snapshots.current.length > 0) {
      restoreDom();
      setApplied(null);
    }

    const targets = collectTargets();
    if (targets.length === 0) {
      setStatus("There is no reading to translate yet.");
      return;
    }

    const nodes = textNodesIn(targets);
    if (nodes.length === 0) {
      setStatus("There is no reading to translate yet.");
      return;
    }

    setBusy(true);
    setStatus(`Translating into ${nativeName(lang)}…`);

    try {
      const snapshot: Snapshot[] = targets.map((element) => ({
        element,
        html: element.innerHTML,
        lang: element.getAttribute("lang"),
        dir: element.getAttribute("dir"),
      }));

      const { texts, keptEnglish } = await translateStrings(
        nodes.map((node) => node.nodeValue ?? ""),
        lang,
        {
          onDownload: (fraction) =>
            setStatus(`Getting ${nativeName(lang)} ready… ${Math.round(fraction * 100)}%`),
          onProgress: (done, total) =>
            setStatus(`Translating… ${total === 0 ? 0 : Math.round((done / total) * 100)}%`),
        },
      );

      // Nothing is written until the whole batch returns, so a failure below
      // leaves every block exactly as it was.
      nodes.forEach((node, index) => {
        const text = texts[index];
        if (text !== undefined) node.nodeValue = text;
      });

      for (const element of targets) {
        element.setAttribute("lang", lang);
        // Arabic reads right to left; the rest keep the page's direction.
        if (lang === "ar") element.setAttribute("dir", "rtl");
      }

      snapshots.current = snapshot;
      setApplied(lang);
      setStatus(
        keptEnglish > 0
          ? `Done. Biology terms stay in English. ${keptEnglish} sentences stayed in English.`
          : "Done. Biology terms stay in English.",
      );
    } catch (error) {
      setStatus(messageForFailure(error, lang));
    } finally {
      setBusy(false);
    }
  }

  const cannotTranslate = probe === "unavailable" || probe === "unsupported";
  const triggerLabel = applied ? "Translate. A translation is showing." : "Translate the reading";

  return (
    <div className="st-tr-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`st-tool st-tr-trigger${applied ? " is-on" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={PANEL_ID}
        aria-label={triggerLabel}
        title={applied ? "A translation is showing" : "Translate the reading"}
        onClick={toggle}
      >
        <span className="st-tr-icon" aria-hidden="true">
          {ICON}
        </span>
        Translate
      </button>

      {open && (
        <div
          className="st-tr-panel"
          id={PANEL_ID}
          role="dialog"
          aria-labelledby={LABEL_ID}
          aria-busy={busy}
        >
          <p className="st-tr-label" id={LABEL_ID}>
            Translate the reading
          </p>

          {onDevice ? (
            <>
              <label className="st-tr-field" htmlFor={LANG_ID}>
                Language
              </label>
              <div className="st-tr-row">
                <select
                  id={LANG_ID}
                  className="st-tr-select"
                  value={lang}
                  disabled={busy}
                  onChange={(event) => void chooseLanguage(event.target.value)}
                >
                  <option value="">Choose a language</option>
                  {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>
                      {optionLabel(language)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="st-primary st-tr-btn"
                  disabled={busy || lang === "" || cannotTranslate}
                  onClick={() => void run()}
                >
                  Translate
                </button>
              </div>

              {applied !== null && (
                <button
                  type="button"
                  className="st-secondary st-tr-btn st-tr-back"
                  disabled={busy}
                  onClick={backToEnglish}
                >
                  Back to English
                </button>
              )}

              <p className="st-tr-status" role="status" aria-live="polite">
                {status}
              </p>
              <p className="st-tr-note">
                The translation runs on this device. Nothing is sent anywhere.
              </p>
            </>
          ) : (
            <>
              <p className="st-tr-status">
                Translation needs Chrome 138 or later. Open this page in Chrome to translate the
                reading.
              </p>
              <p className="st-tr-note">
                The translation runs on this device. Nothing is sent anywhere.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function messageForAvailability(state: Availability, code: string): string {
  const name = nativeName(code);
  switch (state) {
    case "available":
      return `${name} is ready.`;
    case "downloadable":
      return `The first translation into ${name} downloads a language pack once.`;
    case "downloading":
      return `The ${name} language pack is downloading.`;
    case "timeout":
      return "The translator did not answer. Try again.";
    case "unsupported":
      return "This browser has no on-device translator.";
    default:
      return `This browser cannot translate into ${name} yet.`;
  }
}

function messageForFailure(error: unknown, code: string): string {
  const name = nativeName(code);
  if (error instanceof TranslateError) {
    switch (error.reason) {
      case "unavailable":
        return `This browser cannot translate into ${name} yet. The reading stays in English.`;
      case "unsupported":
        return "This browser has no on-device translator. The reading stays in English.";
      case "timeout":
        return "The translator did not answer in time. The reading stays in English.";
      default:
        break;
    }
  }
  return "The translation did not finish. The reading stays in English.";
}
