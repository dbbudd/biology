/**
 * The reader's Translate tool, ported.
 *
 * Chrome 138 and later ship an on-device Translator API: there is no server, no
 * key and no account, and the words never leave the machine. This module is the
 * typed port of `assets/translate-core.js`: the language list, the availability
 * probe, the one-off language-pack download, and one batch call. It is the only
 * place in the app that talks to that API.
 *
 * GLOSSARY SHIELDING. This is a biology course, and "translation" here means
 * mRNA to protein. A general translator renders that as linguistic translation,
 * and does the same disservice to expression, dominant, character, spindle and
 * metaphase plate. So every term in the course glossary is swapped for an opaque
 * token before translating and put back afterwards. The sentence around the term
 * is translated, the term stays the English one students are assessed on, and
 * the result reads bilingually, which is what language scaffolding wants anyway.
 *
 * Where a term cannot be put back exactly, the original English sentence is kept
 * instead. A biology sentence missing its noun is worse than an English one.
 */

const SOURCE_LANGUAGE = "en";
const AVAILABILITY_TIMEOUT_MS = 15_000;
const DOWNLOAD_STALL_MS = 45_000;
const STRING_TIMEOUT_MS = 20_000;

export interface TranslateLanguage {
  code: string;
  /** The name a speaker of that language recognises. */
  native: string;
  /** The English name, so a teacher knows what was chosen. */
  english: string;
}

/**
 * The reader's fourteen targets. `zh-Hant` and `zh` are different languages here:
 * one is the script students read in Hong Kong, the other is the simplified one,
 * and a translator set to the wrong one is no help at all.
 */
export const LANGUAGES: readonly TranslateLanguage[] = [
  { code: "zh-Hant", native: "繁體中文", english: "Traditional Chinese" },
  { code: "zh", native: "简体中文", english: "Simplified Chinese" },
  { code: "ko", native: "한국어", english: "Korean" },
  { code: "ja", native: "日本語", english: "Japanese" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "fr", native: "Français", english: "French" },
  { code: "pt", native: "Português", english: "Portuguese" },
  { code: "de", native: "Deutsch", english: "German" },
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "vi", native: "Tiếng Việt", english: "Vietnamese" },
  { code: "th", native: "ไทย", english: "Thai" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian" },
  { code: "ar", native: "العربية", english: "Arabic" },
  { code: "ru", native: "Русский", english: "Russian" },
];

/**
 * Biology senses the glossary only covers as longer phrases. "Gene expression"
 * and "Spindle fibre" are shielded as phrases; these are the bare words a
 * chapter also uses on their own, and a general translator gets every one of
 * them wrong in the biology sense.
 */
const EXTRA_TERMS: readonly string[] = ["expression", "character", "metaphase plate", "spindle"];

/* ------------------------------------------------------------------ */
/* The Chrome globals, declared here so no dependency is needed.      */
/* ------------------------------------------------------------------ */

declare global {
  /** The object Chrome passes to `monitor`, which reports a pack download. */
  type TranslatorMonitor = EventTarget;

  interface TranslatorSession {
    translate(text: string): Promise<string>;
    destroy?: () => void;
  }

  interface TranslatorApi {
    availability(options: {
      sourceLanguage: string;
      targetLanguage: string;
    }): Promise<string>;
    create(options: {
      sourceLanguage: string;
      targetLanguage: string;
      monitor?: (monitor: TranslatorMonitor) => void;
    }): Promise<TranslatorSession>;
  }

  var Translator: TranslatorApi | undefined;

  interface Window {
    Translator?: TranslatorApi;
  }
}

/** The API, or null when this browser has none. Safe on the server. */
function translatorApi(): TranslatorApi | null {
  if (typeof window === "undefined") return null;
  if (typeof Translator === "undefined") return null;
  return Translator;
}

export function supported(): boolean {
  return translatorApi() !== null;
}

/* ------------------------------------------------------------------ */
/* Failures                                                           */
/* ------------------------------------------------------------------ */

export type TranslateFailure = "unsupported" | "unavailable" | "timeout" | "failed";

/** A translation that could not be done here, with the reason kept separate. */
export class TranslateError extends Error {
  readonly reason: TranslateFailure;

  constructor(reason: TranslateFailure) {
    super(reason);
    this.name = "TranslateError";
    this.reason = reason;
  }
}

/* ------------------------------------------------------------------ */
/* Availability and the one-off download                              */
/* ------------------------------------------------------------------ */

export type Availability =
  | "unsupported"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available"
  /** The API exists but never answered. A browser with the flag off does this. */
  | "timeout";

/**
 * Ask whether this browser can translate into `lang`. This never rejects: a
 * browser that hangs is reported as `"timeout"` rather than leaving the panel on
 * "Checking" forever.
 */
export async function availability(lang: string): Promise<Availability> {
  const api = translatorApi();
  if (!api) return "unsupported";

  try {
    const raw = await deadline(
      api.availability({ sourceLanguage: SOURCE_LANGUAGE, targetLanguage: lang }),
      AVAILABILITY_TIMEOUT_MS,
    );
    if (raw === "available" || raw === "downloadable" || raw === "downloading") return raw;
    return "unavailable";
  } catch {
    return "timeout";
  }
}

function deadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bell = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TranslateError("timeout")), ms);
  });
  return Promise.race([work, bell]).finally(() => clearTimeout(timer));
}

/**
 * Build a translator, allowing a first download to be slow.
 *
 * Each progress event renews the clock, so a real download is never cut off;
 * total silence for 45 seconds is a stall, not patience. A browser with the
 * flag off rejects or never answers, and both cases end here.
 */
async function createSession(
  api: TranslatorApi,
  lang: string,
  options: TranslateOptions,
): Promise<TranslatorSession> {
  let alive = Date.now();

  const made = api.create({
    sourceLanguage: SOURCE_LANGUAGE,
    targetLanguage: lang,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", (event) => {
        alive = Date.now();
        const loaded = (event as ProgressEvent).loaded;
        options.onDownload?.(Number.isFinite(loaded) ? Math.min(1, Math.max(0, loaded)) : 0);
      });
    },
  });

  const stall = new Promise<never>((_, reject) => {
    const timer = setInterval(() => {
      if (Date.now() - alive > DOWNLOAD_STALL_MS) {
        clearInterval(timer);
        reject(new TranslateError("timeout"));
      }
    }, 2000);
    // Both outcomes stop the clock; this also keeps the derived promise handled
    // so a failure here never surfaces as an unhandled rejection.
    made.then(
      () => clearInterval(timer),
      () => clearInterval(timer),
    );
  });

  try {
    return await Promise.race([made, stall]);
  } catch (error) {
    // The session may still arrive after the stall; free it if it does.
    made.then(
      (session) => session.destroy?.(),
      () => {},
    );
    throw error instanceof TranslateError ? error : new TranslateError("failed");
  }
}

/* ------------------------------------------------------------------ */
/* The glossary shield                                                */
/* ------------------------------------------------------------------ */

export interface Shielded {
  /** The sentence with every protected term replaced by `ZQ<n>ZQ`. */
  text: string;
  /** The original terms, in the order their tokens appear. */
  keep: string[];
}

const matchers = new WeakMap<readonly string[], RegExp | null>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matcherFor(terms: readonly string[]): RegExp | null {
  if (matchers.has(terms)) return matchers.get(terms) ?? null;

  const unique = [...new Set(terms.map((term) => term.trim()).filter((term) => term.length > 1))];
  // Longest first, so "Gene expression" wins over "expression" and
  // "Spindle fibre" over "spindle".
  unique.sort((a, b) => b.length - a.length);

  const pattern =
    unique.length > 0 ? new RegExp(`\\b(${unique.map(escapeRegExp).join("|")})\\b`, "gi") : null;
  matchers.set(terms, pattern);
  return pattern;
}

/** Swap every glossary term in `text` for an opaque token. */
export function shield(text: string, terms: readonly string[]): Shielded {
  const pattern = matcherFor(terms);
  if (!pattern) return { text, keep: [] };

  const keep: string[] = [];
  const out = text.replace(pattern, (match) => {
    keep.push(match);
    return `ZQ${keep.length - 1}ZQ`;
  });
  return { text: out, keep };
}

/**
 * Put the terms back.
 *
 * Translators sometimes space or case a token differently, so the pattern is
 * forgiving. Returns null when a term cannot be restored exactly: either its
 * token is gone, or it indexes nothing. The caller then keeps the English
 * sentence rather than printing one with the noun missing.
 */
export function unshield(text: string, keep: readonly string[]): string | null {
  if (keep.length === 0) return text;

  let lost = false;
  const out = String(text).replace(/Z\s*Q\s*(\d+)\s*Z\s*Q/gi, (match, index: string) => {
    const value = keep[Number(index)];
    if (value == null) {
      lost = true;
      return match;
    }
    return value;
  });
  if (lost) return null;

  // A translator that dropped a token has removed the term from the sentence
  // entirely, which the replace above cannot see. Check every term survived.
  for (const term of keep) {
    if (out.indexOf(term) < 0) return null;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The term list                                                      */
/* ------------------------------------------------------------------ */

let termsPromise: Promise<readonly string[]> | null = null;

/**
 * The protected vocabulary: every key in the course glossary, plus the bare
 * biology senses above.
 *
 * The app already carries the glossary in `src/data/concepts.generated.json`,
 * whose keys are `COURSE.glossary` exactly (297 terms as of this writing). It is
 * loaded on demand rather than imported at the top of the module, because the
 * file also carries every definition and is far larger than this tool needs on
 * a page where nobody translates anything.
 *
 * A failed load is an error, never an empty list: translating with no shield
 * would mangle every term the course assesses.
 */
export function loadTerms(): Promise<readonly string[]> {
  if (!termsPromise) {
    const pending = import("../data/concepts.generated.json").then((module) => {
      const data: unknown = module.default;
      if (typeof data !== "object" || data === null) throw new Error("no glossary");
      const terms = (data as { terms?: unknown }).terms;
      if (typeof terms !== "object" || terms === null) throw new Error("no glossary");
      return [...Object.keys(terms), ...EXTRA_TERMS];
    });
    termsPromise = pending.catch((error: unknown) => {
      termsPromise = null;
      throw error;
    });
  }
  return termsPromise;
}

/* ------------------------------------------------------------------ */
/* The batch call                                                     */
/* ------------------------------------------------------------------ */

export interface TranslateOptions {
  /** Called as strings finish, with the percent of the batch that is done. */
  onProgress?: (done: number, total: number) => void;
  /** Called while a language pack downloads, from 0 to 1. */
  onDownload?: (fraction: number) => void;
}

export interface TranslateBatch {
  texts: string[];
  /** Sentences kept in English because a term could not be restored. */
  keptEnglish: number;
}

/**
 * Translate strings into `lang`, shielding glossary terms first.
 *
 * One sentence that fails or times out stays in English and is counted; the rest
 * still arrive. The whole call rejects only when nothing can be done at all:
 * no API, an unavailable language, a stall, or a glossary that would not load.
 */
export async function translateStrings(
  strings: readonly string[],
  lang: string,
  options: TranslateOptions = {},
): Promise<TranslateBatch> {
  const api = translatorApi();
  if (!api) throw new TranslateError("unsupported");

  const state = await availability(lang);
  if (state === "unsupported") throw new TranslateError("unsupported");
  if (state === "timeout") throw new TranslateError("timeout");
  if (state === "unavailable") throw new TranslateError("unavailable");

  let terms: readonly string[];
  try {
    terms = await loadTerms();
  } catch {
    throw new TranslateError("failed");
  }

  const session = await createSession(api, lang, options);
  try {
    return await runBatch(session, strings, terms, options);
  } finally {
    // Free the on-device model; the next translation builds its own.
    session.destroy?.();
  }
}

async function runBatch(
  session: TranslatorSession,
  strings: readonly string[],
  terms: readonly string[],
  options: TranslateOptions,
): Promise<TranslateBatch> {
  const total = strings.length;
  const texts = new Array<string>(total).fill("");
  const queue = strings.map((_, index) => index);
  let done = 0;
  let keptEnglish = 0;

  const note = () => options.onProgress?.(done, total);

  async function worker(): Promise<void> {
    for (;;) {
      const index = queue.shift();
      if (index === undefined) return;

      const source = String(strings[index] ?? "");
      if (source.trim() === "") {
        texts[index] = source;
        done += 1;
        note();
        continue;
      }

      try {
        const sealed = shield(source, terms);
        const translated = await deadline(session.translate(sealed.text), STRING_TIMEOUT_MS);
        const restored = unshield(translated, sealed.keep);
        if (restored === null) {
          texts[index] = source;
          keptEnglish += 1;
        } else {
          texts[index] = restored;
        }
      } catch {
        // This sentence stays English; the rest of the batch carries on.
        texts[index] = source;
        keptEnglish += 1;
      }

      done += 1;
      note();
    }
  }

  // A few at a time: fast enough, and it keeps the page responsive.
  const workers = Math.max(1, Math.min(3, total || 1));
  await Promise.all(Array.from({ length: workers }, worker));

  return { texts, keptEnglish };
}
