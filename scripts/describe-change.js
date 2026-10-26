#!/usr/bin/env node
/* =============================================================
   DESCRIBE CHANGE — what a teacher is being asked to approve
   -------------------------------------------------------------
   A teacher cannot read a unified diff, and should not have to.
   This turns one into before/after sentences, plus a count of
   what moved.

   It deliberately does NOT trust the agent's own summary. The
   agent says what it thinks it did; this says what the diff
   actually contains. When the two disagree, that is the signal
   worth noticing.

   Usage
     node scripts/describe-change.js <base> <head>
     node scripts/describe-change.js <base> <head> --json

   Both refs must exist locally. In CI, checkout with
   fetch-depth: 0 and pass the PR's base sha and head sha.
   ============================================================= */

'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const [base, head] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const AS_JSON = process.argv.includes('--json');

const CONTENT_PATHS = ['chapters/', 'assets/toc.js'];
const MAX_PAIRS_PER_FILE = 8;

if (!base || !head) {
    console.error('usage: node scripts/describe-change.js <base> <head> [--json]');
    process.exit(2);
}

const git = (args) =>
    execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/* ---------- read the diff ---------- */

function diffLines() {
    return git([
        'diff',
        '--unified=0',
        '--no-color',
        base,
        head,
        '--',
        ...CONTENT_PATHS,
    ]).split('\n');
}

/* ---------- turn a line of markup into the sentence a student reads ---------- */

function textOf(line) {
    return line
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, ' ')
        .trim();
}

const wordCount = (s) => (s ? s.split(/\s+/).length : 0);
const clip = (s, max = 340) => (s.length <= max ? s : s.slice(0, max).replace(/\s+\S*$/, '') + '…');

/* ---------- parse the diff into per-file changes ---------- */

function parse(lines) {
    const files = new Map(); // path -> { removed: [], added: [] }
    let current = null;

    for (const line of lines) {
        if (line.startsWith('+++ b/')) {
            current = line.slice(6);
            if (!files.has(current)) files.set(current, { removed: [], added: [] });
            continue;
        }
        if (line.startsWith('--- ') || line.startsWith('diff ') || line.startsWith('index ')) continue;
        if (!current) continue;

        if (line.startsWith('-')) {
            const text = textOf(line.slice(1));
            if (text) files.get(current).removed.push(text);
        } else if (line.startsWith('+')) {
            const text = textOf(line.slice(1));
            if (text) files.get(current).added.push(text);
        }
    }
    return files;
}

/* ---------- pair removals with additions ---------- */

/* Changed text is usually a paragraph rewritten in place, so pairing by
   position within the diff is a good approximation of "this sentence
   became that sentence". Where the counts differ the leftovers are real
   deletions or additions, and saying so is more honest than guessing. */
function pair(removed, added) {
    const pairs = [];
    const n = Math.min(removed.length, added.length);
    for (let i = 0; i < n; i++) pairs.push({ before: removed[i], after: added[i] });
    for (let i = n; i < removed.length; i++) pairs.push({ before: removed[i], after: null });
    for (let i = n; i < added.length; i++) pairs.push({ before: null, after: added[i] });
    return pairs;
}

/* ---------- structure vs prose ---------- */

function structureNotes(base, head) {
    const notes = [];
    const tocDiff = git(['diff', '--unified=0', base, head, '--', 'assets/toc.js'])
        .split('\n')
        .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));

    // An `id:` line appearing or disappearing means an entry was added or
    // removed. Editing an entry's summary or title does not touch its id, so
    // prose-level edits correctly leave this quiet.
    const added = tocDiff.filter((l) => l.startsWith('+') && /\bid:\s*'/.test(l)).length;
    const removed = tocDiff.filter((l) => l.startsWith('-') && /\bid:\s*'/.test(l)).length;

    if (added > removed) notes.push('a chapter or unit was added to the course structure');
    if (removed > added) notes.push('a chapter or unit was removed from the course structure');
    if (tocDiff.some((l) => l.startsWith('+') && /status:\s*'ready'/.test(l))) {
        notes.push('a planned chapter was marked ready');
    }
    return notes;
}

/* ---------- report ---------- */

const files = parse(diffLines());
const changes = [];

// Only prose counts as "sentences changed". toc.js is data, and its diff
// lines are object literals, not anything a student reads.
let pairsTotal = 0;
let netWords = 0;

for (const [file, { removed, added }] of files) {
    if (!removed.length && !added.length) continue;
    const pairs = pair(removed, added);
    if (file.startsWith('chapters/')) {
        pairsTotal += pairs.length;
        for (const p of pairs) {
            netWords += wordCount(p.after) - wordCount(p.before);
        }
    }
    changes.push({ file, pairs });
}

const chapters = changes.filter((c) => c.file.startsWith('chapters/'));
const structural = structureNotes(base, head);
const tocChanged = changes.some((c) => c.file === 'assets/toc.js');

const parts = [];
if (chapters.length) parts.push(`${chapters.length} chapter${chapters.length === 1 ? '' : 's'}`);
if (tocChanged) {
    // An id/status edit changes the shape of the course. A title or summary
    // edit changes what the contents page says. They read very differently
    // to a teacher, so do not lump them together.
    parts.push(structural.length ? 'the course structure' : 'the course listing');
}
if (!parts.length) parts.push('nothing in the course content');

const headline = [
    parts.join(' and '),
    `${pairsTotal} sentence${pairsTotal === 1 ? '' : 's'} changed`,
    netWords === 0 ? 'no net change in length' : `${netWords > 0 ? '+' : '−'}${Math.abs(netWords)} words`,
].join(' · ');

if (AS_JSON) {
    console.log(JSON.stringify({ headline, pairsTotal, netWords, structural, changes }, null, 2));
    process.exit(0);
}

const out = [];
out.push('### What this changes');
out.push('');
out.push(`**${headline}**`);
out.push('');

if (structural.length) {
    out.push('> **Note:** ' + structural.join('; ') + '. This is a structural change — the sidebar, search and course map all depend on it.');
    out.push('');
}

if (!changes.length) {
    out.push('_No visible text changed._');
}

for (const { file, pairs } of changes) {
    if (file === 'assets/toc.js') continue;
    out.push(`#### \`${file}\``);
    out.push('');
    const shown = pairs.slice(0, MAX_PAIRS_PER_FILE);
    for (const p of shown) {
        if (p.before && p.after) {
            out.push('**Before**');
            out.push(`> ${clip(p.before)}`);
            out.push('');
            out.push('**After**');
            out.push(`> ${clip(p.after)}`);
            out.push('');
        } else if (p.before) {
            out.push(`**Removed:** ${clip(p.before)}`);
            out.push('');
        } else {
            out.push(`**Added:** ${clip(p.after)}`);
            out.push('');
        }
    }
    if (pairs.length > shown.length) {
        out.push(`_…and ${pairs.length - shown.length} more change${pairs.length - shown.length === 1 ? '' : 's'} in this chapter (see the Files changed tab)._`);
        out.push('');
    }
}

console.log(out.join('\n').trim());
