/**
 * Reads each unit overview's "Learning targets for the unit" block and writes
 * the targets the Focus panel guides towards.
 *
 *   assets/toc.js      -> the chapter list, read the way the site itself reads
 *                         it, through window.COURSE: unit, id, file
 *   chapters/*.html    -> src/data/targets.generated.json
 *      every <div class="tgt-group"> with its topic heading, the standard the
 *      group belongs to, and each target's wording, the reading sections that
 *      teach it and whether it is a practice or a crosscutting concept.
 *
 * Nothing is hand-maintained here: the reader stays the source of truth.
 * Re-run with: npm run targets
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const tocPath = resolve(repoRoot, "assets/toc.js");

const sandbox = { window: {} };
runInNewContext(readFileSync(tocPath, "utf8"), sandbox);
const COURSE = sandbox.window.COURSE;
if (!COURSE || !Array.isArray(COURSE.chapters)) {
  throw new Error("assets/toc.js did not define window.COURSE.chapters");
}

/** A target anchor, e.g. "u2-respiration#fate", names the chapter and section
 *  a student would read to meet that target. */
const ANCHOR = /^[a-z0-9-]+#[a-z0-9-]+$/i;

/** `<li>` inner HTML as plain text: tags dropped, entities decoded, spaces
 *  collapsed, so <strong> around a verb does not change the sentence. */
function plain(html) {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The body of a <div> that starts at `openEnd`, found by counting nested
 *  <div> tags, so a group that ever grows a wrapper inside it still parses. */
function divBody(html, openEnd) {
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = openEnd;
  let depth = 1;
  let t;
  while ((t = tags.exec(html))) {
    depth += t[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(openEnd, t.index);
  }
  return html.slice(openEnd);
}

/** Every learning-target group in one chapter page, in authored order. */
function groupsOf(html, label) {
  const groups = [];
  const open = /<div\b([^>]*)>/gi;
  let m;
  while ((m = open.exec(html))) {
    const attrs = m[1];
    const classes = (/class\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? "").split(/\s+/);
    if (!classes.includes("tgt-group")) continue;

    const body = divBody(html, m.index + m[0].length);
    const heading = plain(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(body)?.[1] ?? "");
    if (!heading) {
      throw new Error(
        `${label}: a tgt-group has no <h3> heading, so its targets cannot be grouped. ` +
          `Expected <div class="tgt-group"><h3>Topic</h3><ul class="targets">…</ul></div>.`,
      );
    }

    const standard = /data-std\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]?.trim() || null;

    const targets = [];
    const items = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
    let li;
    while ((li = items.exec(body))) {
      const liAttrs = li[1];
      const at = /data-at\s*=\s*"([^"]*)"/i.exec(liAttrs)?.[1];
      const text = plain(li[2]);

      if (at === undefined) {
        throw new Error(
          `${label}: a target in "${heading}" has no data-at, so the reader cannot say ` +
            `which section teaches it. Target text: "${text.slice(0, 80)}".`,
        );
      }
      const anchors = at
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      if (anchors.length === 0) {
        throw new Error(`${label}: "${text.slice(0, 80)}" has an empty data-at.`);
      }
      for (const anchor of anchors) {
        if (!ANCHOR.test(anchor)) {
          throw new Error(
            `${label}: anchor "${anchor}" is not written as chapter#section, ` +
              `so it cannot be matched to a section of the reader.`,
          );
        }
      }
      if (text === "") {
        throw new Error(`${label}: a target in "${heading}" has no text.`);
      }

      targets.push({ text, at: anchors, kind: /data-kind\s*=\s*"([^"]*)"/i.exec(liAttrs)?.[1]?.trim() || null });
    }

    if (targets.length === 0) {
      throw new Error(
        `${label}: the tgt-group "${heading}" lists no <li data-at="…"> targets. ` +
          `An empty group would silently drop part of the unit.`,
      );
    }

    groups.push({ heading, standard, targets });
  }
  return groups;
}

const ready = COURSE.chapters.filter((c) => (c.status ?? "ready") === "ready");
const units = [];
let groupCount = 0;
let targetCount = 0;

for (const chapter of ready) {
  const file = resolve(repoRoot, chapter.file);
  if (!existsSync(file)) continue;

  const html = readFileSync(file, "utf8");
  const groups = groupsOf(html, chapter.file);
  if (groups.length === 0) continue;

  units.push({ unit: chapter.unit, source: chapter.id, groups });
  groupCount += groups.length;
  for (const group of groups) targetCount += group.targets.length;
}

if (units.length === 0) {
  throw new Error(
    "No chapter had a <div class=\"tgt-group\"> block. The learning-targets markup has " +
      "changed, or assets/toc.js no longer points at the overview pages.",
  );
}

const out = resolve(here, "../src/data/targets.generated.json");
writeFileSync(out, JSON.stringify({ generatedBy: "scripts/extract-targets.mjs", units }, null, 2) + "\n", "utf8");

console.log(`targets    : ${targetCount} in ${groupCount} groups, ${units.length} units`);
for (const entry of units) {
  const counts = entry.groups.map((g) => g.targets.length).join(", ");
  const total = entry.groups.reduce((n, g) => n + g.targets.length, 0);
  const standards = entry.groups.filter((g) => g.standard).length;
  console.log(
    `  ${entry.unit}  ${entry.source.padEnd(12)} ${entry.groups.length} groups, ` +
      `${total} targets (${counts}); ${standards} with a standard`,
  );
}
