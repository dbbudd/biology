/**
 * Server-side extraction of one reader section.
 *
 * The tale never navigates a student to the reader. It pulls the section it
 * needs and renders it in place, so inquiry is not interrupted by a page the
 * student can wander off into. Nothing here writes to the reader.
 */

const BASE = (
  process.env.NEXT_PUBLIC_READER_BASE ?? "http://localhost:4321"
).replace(/\/$/, "");

export type ReaderBlock =
  | "prompts"
  | "key"
  | "note"
  | "example"
  | "misconception"
  | "check"
  | "figure"
  | "table"
  | "details";

/**
 * Teaching furniture the reader owns. A tale step pulls the reading it needs and
 * leaves out the rest, so a focus-question list written for the whole unit never
 * arrives inside a single step.
 */
const BLOCKS: Record<ReaderBlock, { open: RegExp; tag: string }> = {
  prompts: { open: /<div\b[^>]*\bclass="[^"]*\bcallout-try\b[^"]*"[^>]*>/i, tag: "div" },
  key: { open: /<div\b[^>]*\bclass="[^"]*\bcallout-key\b[^"]*"[^>]*>/i, tag: "div" },
  note: { open: /<div\b[^>]*\bclass="[^"]*\bcallout-note\b[^"]*"[^>]*>/i, tag: "div" },
  example: { open: /<div\b[^>]*\bclass="[^"]*\bcallout-example\b[^"]*"[^>]*>/i, tag: "div" },
  misconception: {
    open: /<div\b[^>]*\bclass="[^"]*\bcallout-misconception\b[^"]*"[^>]*>/i,
    tag: "div",
  },
  check: { open: /<details\b[^>]*\bclass="[^"]*\bcheck-q\b[^"]*"[^>]*>/i, tag: "details" },
  figure: { open: /<figure\b[^>]*>/i, tag: "figure" },
  table: { open: /<table\b[^>]*>/i, tag: "table" },
  details: { open: /<details\b[^>]*>/i, tag: "details" },
};

/** Left out unless the step asks for it. */
export const DEFAULT_OMIT: ReaderBlock[] = ["prompts", "check"];

const VOID = new Set(["img", "br", "hr", "input", "source", "embed", "wbr", "col"]);

export type BlockKind =
  | "heading" | "text" | "callout" | "figure" | "table" | "list" | "details" | "other";

export interface Block {
  kind: BlockKind;
  html: string;
}

/**
 * Split a section into the pieces it is written in, so a step can show one at a
 * time instead of 500 words at once.
 */
export function splitBlocks(html: string): Block[] {
  const out: Block[] = [];
  const tagRe = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let depth = 0;
  let start = -1;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(html))) {
    const name = m[1].toLowerCase();
    const closing = m[0].startsWith("</");
    const selfClosing = /\/>$/.test(m[0]) || VOID.has(name);

    if (!closing && !selfClosing) {
      if (depth === 0) start = m.index;
      depth++;
    } else if (closing) {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(describe(html.slice(start, m.index + m[0].length)));
        start = -1;
      }
    }
    if (depth < 0) depth = 0;
  }

  if (start >= 0) out.push(describe(html.slice(start)));

  return out.filter((b) => b.html.replace(/<[^>]+>/g, "").trim().length > 20);
}

function describe(html: string): Block {
  const open = /^\s*<([a-z][a-z0-9]*)/i.exec(html)?.[1]?.toLowerCase() ?? "";
  const before = html.slice(0, html.indexOf(">") + 1);
  if (/^h[2-4]$/.test(open)) return { kind: "heading", html };
  if (open === "figure") return { kind: "figure", html };
  if (open === "table") return { kind: "table", html };
  if (open === "ul" || open === "ol") return { kind: "list", html };
  if (open === "details") return { kind: "details", html };
  if (open === "div" && /callout/.test(before)) return { kind: "callout", html };
  if (open === "p") return { kind: "text", html };
  return { kind: "other", html };
}

export interface ExtractedSection {
  html: string;
  heading: string;
  wordCount: number;
  /** true when the reader tracks this section, so course progress can record it */
  tracked: boolean;
  omitted: ReaderBlock[];
}

function findSection(html: string, id: string): string | null {
  const open = new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`, "i").exec(html);
  if (!open) return null;

  const start = open.index + open[0].length;
  const tags = /<\/?section\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = tags.exec(html))) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
  }
  return html.slice(start);
}

/** Cut an element and its contents out, counting only its own tag. */
function stripElement(html: string, openPattern: RegExp, tag: string): string {
  let out = html;
  let guard = 0;

  while (guard++ < 100) {
    const m = openPattern.exec(out);
    if (!m) break;

    const tags = new RegExp(`</?${tag}\\b[^>]*>`, "gi");
    tags.lastIndex = m.index + m[0].length;
    let depth = 1;
    let end = out.length;
    let t: RegExpExecArray | null;

    while ((t = tags.exec(out))) {
      depth += t[0].startsWith("</") ? -1 : 1;
      if (depth === 0) {
        end = t.index + t[0].length;
        break;
      }
    }
    out = out.slice(0, m.index) + out.slice(end);
  }
  return out;
}

function absolute(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|data:|mailto:|#)/i.test(trimmed)) return trimmed;
  return `${BASE}/${trimmed.replace(/^(\.\.\/)+/, "").replace(/^\.?\/+/, "")}`;
}

export function sanitise(raw: string, omit: ReaderBlock[] = DEFAULT_OMIT): string {
  let html = raw;

  // Content the reader wrote for another job is cut before anything else, so
  // no later pass has to reason about it.
  for (const block of omit) {
    const rule = BLOCKS[block];
    if (rule) html = stripElement(html, rule.open, rule.tag);
  }

  // Scripts, styles and frames cannot travel into the player.
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style\b[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "");
  html = html.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");

  // Interactive hosts belong to the reader's own page. The tale supplies its
  // own sim surface, so a second copy inside the text would duplicate it.
  html = stripElement(html, /<div\b[^>]*\bdata-sim="[^"]*"[^>]*>/i, "div");
  html = stripElement(html, /<div\b[^>]*\bclass="sim\b[^"]*"[^>]*>/i, "div");

  // Form furniture has no meaning without the reader's script.
  html = html.replace(/<button\b[\s\S]*?<\/button>/gi, "");
  html = html.replace(/<form\b[\s\S]*?<\/form>/gi, "");
  html = html.replace(/<(input|select|textarea|nav|aside)\b[^>]*>/gi, "");

  // The reader reveals these with script, so in static markup they would leak.
  html = html.replace(/\sdata-why="[^"]*"/gi, "");
  html = html.replace(/\s+on[a-z]+="[^"]*"/gi, "");
  html = html.replace(/\sid="[^"]*"/gi, "");
  html = html.replace(/\sdata-(track|kind|time)(="[^"]*")?/gi, "");

  // Images and links point at the reader's origin, never a relative path.
  html = html.replace(/(src|href)="([^"]+)"/gi, (_m, attr: string, url: string) => {
    return `${attr}="${absolute(url)}"`;
  });

  return html.trim();
}

export async function loadSection(
  chapterFile: string,
  sectionId: string,
  omit: ReaderBlock[] = DEFAULT_OMIT,
): Promise<ExtractedSection> {
  const res = await fetch(`${BASE}/${chapterFile}`);
  if (!res.ok) throw new Error(`The reader returned ${res.status} for ${chapterFile}`);

  const page = await res.text();
  const raw = findSection(page, sectionId);
  if (!raw) throw new Error(`Section ${sectionId} is not in ${chapterFile}`);

  const heading =
    /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(raw)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  const tracked = /<section\b[^>]*\bdata-track\b/i.test(
    new RegExp(`<section\\b[^>]*\\bid="${sectionId}"[^>]*>`, "i").exec(page)?.[0] ?? "",
  );
  let html = sanitise(raw, omit);

  // The wrapper already prints this heading, so drop the leading duplicate.
  const leading = /^\s*<h2\b[^>]*>([\s\S]*?)<\/h2>\s*/i.exec(html);
  if (leading && leading[1].replace(/<[^>]+>/g, "").trim() === heading) {
    html = html.slice(leading[0].length);
  }

  const wordCount = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter((w) => /[a-z]/i.test(w)).length;

  return { html, heading, wordCount, tracked, omitted: omit };
}
