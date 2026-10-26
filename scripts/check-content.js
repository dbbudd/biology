#!/usr/bin/env node
/* =============================================================
   CONTENT CHECK — the guard rail around agent-written content
   -------------------------------------------------------------
   Run before every merge. Two jobs:

     1. Structural checks that must pass on any commit:
        the table of contents and the files agree, the progress
        counts match, no link points at nothing, and no chapter
        hard-codes a colour.

     2. In a pull request, a path check: only chapters/ and the
        chapter list in assets/toc.js may change, unless a
        maintainer applies the `owner-change` label.

   The point is that a teacher-facing agent writes prose in
   chapters/, and a prompt telling it to stay in its lane is a
   suggestion. A failing check is a fact.

   Usage
     node scripts/check-content.js                    structural checks
     node scripts/check-content.js --diff <base>      + path check
     node scripts/check-content.js --update-baseline  rewrite the spelling baseline

   No dependencies, by design: the site has no build step.
   ============================================================= */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join('.github', 'spelling-baseline.json');

const args = process.argv.slice(2);
const DIFF_BASE = (() => {
    const i = args.indexOf('--diff');
    return i === -1 ? null : args[i + 1];
})();
const UPDATE_BASELINE = args.includes('--update-baseline');

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/* ---------- helpers ---------- */

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** Chapters, plus the pages the shell renders around them. */
function sitePages() {
    const out = ['index.html', 'printout.html', 'present.html', 'embed.html'];
    for (const dir of ['chapters', 'reference']) {
        const full = path.join(ROOT, dir);
        if (!fs.existsSync(full)) continue;
        for (const name of fs.readdirSync(full).sort()) {
            if (name.endsWith('.html')) out.push(`${dir}/${name}`);
        }
    }
    return out.filter((p) => fs.existsSync(path.join(ROOT, p)));
}

// toc.js is `window.COURSE = { ... }` with comments. Run it in an empty
// sandbox rather than parsing it — no regex can be trusted with a JS object.
function loadCourse() {
    const sandbox = { window: {} };
    try {
        vm.runInNewContext(read('assets/toc.js'), sandbox, { filename: 'assets/toc.js' });
    } catch (err) {
        fail(`assets/toc.js does not parse: ${err.message}`);
        return null;
    }
    if (!sandbox.window.COURSE) {
        fail('assets/toc.js did not define window.COURSE');
        return null;
    }
    return sandbox.window.COURSE;
}

const stripCode = (html) =>
    html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

/** Markup with tags removed, for text-only checks. */
const stripTags = (html) => stripCode(html).replace(/<[^>]+>/g, ' ');

const lineOf = (html, index) => html.slice(0, index).split('\n').length;

/* ---------- 1. table of contents agrees with the files ---------- */

function checkToc(course) {
    const listed = new Map();
    for (const chapter of course.chapters || []) {
        if (!chapter.id) { fail('a chapter in assets/toc.js has no id'); continue; }
        if (listed.has(chapter.id)) fail(`assets/toc.js lists '${chapter.id}' twice`);
        listed.set(chapter.id, chapter);

        if (!chapter.file) { fail(`chapter '${chapter.id}' has no file`); continue; }

        const onDisk = fs.existsSync(path.join(ROOT, chapter.file));
        if (chapter.status === 'ready' && !onDisk) {
            fail(`${chapter.file} is listed as ready but does not exist`);
            continue;
        }
        if (!onDisk) continue; // planned chapters are allowed to be absent

        const html = read(chapter.file);

        // The progress bar and the sidebar both trust this pair.
        const declared = html.match(/data-chapter="([^"]+)"/);
        if (!declared) fail(`${chapter.file} has no <body data-chapter>`);
        else if (declared[1] !== chapter.id) {
            fail(`${chapter.file} has data-chapter="${declared[1]}" but toc.js calls it '${chapter.id}'`);
        }

        // `sections` must equal the number of trackable items, or the
        // contents page shows the wrong progress before the chapter opens.
        const trackable = (html.match(/data-track[\s=>]/g) || []).length;
        if (typeof chapter.sections === 'number' && trackable !== chapter.sections) {
            fail(
                `${chapter.file}: toc.js says sections: ${chapter.sections}, ` +
                `but the file has ${trackable} [data-track] elements — update the toc entry`
            );
        }

        for (const needed of ['data-root=', '<title>', 'assets/toc.js', 'assets/course.js']) {
            if (!html.includes(needed)) fail(`${chapter.file} is missing ${needed}`);
        }
    }

    // A chapter file with no toc entry is invisible: not in the sidebar,
    // not in search, unreachable except by URL.
    for (const page of sitePages()) {
        if (!page.startsWith('chapters/')) continue;
        if (![...listed.values()].some((c) => c.file === page)) {
            fail(`${page} exists but has no entry in assets/toc.js`);
        }
    }
}

/* ---------- 2. links and assets resolve ---------- */

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function checkLinks() {
    for (const page of sitePages()) {
        const html = read(page);
        const from = path.dirname(path.join(ROOT, page));
        for (const match of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
            const url = match[1].trim();
            if (!url || EXTERNAL.test(url)) continue;
            // URLs built at runtime (`../images/${esc(k)}`) are not links to check.
            if (url.includes('${') || url.includes('{{')) continue;
            const target = url.split('#')[0].split('?')[0];
            if (!target) continue;
            const resolved = path.resolve(from, decodeURIComponent(target));
            if (!resolved.startsWith(ROOT)) {
                fail(`${page}:${lineOf(html, match.index)} links outside the site (${url})`);
                continue;
            }
            if (!fs.existsSync(resolved)) {
                fail(`${page}:${lineOf(html, match.index)} links to ${url}, which does not exist`);
            }
        }
    }
}

/* ---------- 3. no colours outside the design tokens ---------- */

function checkColours() {
    for (const page of sitePages()) {
        if (!page.startsWith('chapters/')) continue; // the shell owns course.css
        const html = read(page);
        for (const match of html.matchAll(/style="([^"]*)"/g)) {
            if (/#[0-9a-f]{3,8}\b|\brgba?\(/i.test(match[1])) {
                fail(
                    `${page}:${lineOf(html, match.index)} hard-codes a colour in a style attribute — ` +
                    `use a CSS custom property so all three themes keep working`
                );
            }
        }
    }
}

/* ---------- 4. spelling, as a ratchet ---------- */

/* American spelling is the house rule (CLAUDE.md). About a third of the
   reader was drafted in British spelling and has not been converted yet, so
   a flat ban would be red on day one and ignored. Instead each file gets a
   baseline of its current count and the check fails only if a file gets
   *worse*. Rewriting a chapter should push its number down; regenerate the
   baseline after a conversion pass.

   The list is whole words, not stems, because half-matching a stem catches
   correct words ("basis" for "base"). Anything legitimately quoted — an
   NGSS standard, a paper title — can be kept by putting `spelling-ok` in
   the same line. */
const BRITISH = [
    'colour', 'colours', 'coloured', 'colouring', 'colourful', 'colourless',
    'behaviour', 'behaviours', 'behavioural',
    'organise', 'organises', 'organised', 'organising', 'organisation', 'organisations',
    'recognise', 'recognises', 'recognised', 'recognising',
    'analyse', 'analyses', 'analysed', 'analysing', 'analyser',
    'fertilise', 'fertilised', 'fertilising', 'fertilisation',
    'centre', 'centres', 'centred', 'centring',
    'fibre', 'fibres', 'fibrous',
    'defence', 'defences', 'offence', 'offences', 'pretence',
    'practise', 'practises', 'practised', 'practising',
    'programme', 'programmes', 'programmed',
    'grey', 'judgement', 'judgements',
    'modelling', 'modelled', 'modeller', 'signalling', 'signalled',
    'labelling', 'labelled', 'cancelling', 'cancelled', 'travelling', 'travelled',
    'fuelling', 'fuelled', 'counsellor', 'counselling', 'jewellery',
    'learnt', 'spelt', 'whilst', 'amongst', 'ageing', 'storey', 'storeys',
    'sulphur', 'sulphuric', 'aluminium',
    'haemoglobin', 'oestrogen', 'foetus', 'foetal', 'anaemia', 'paediatric',
    'metre', 'metres', 'litre', 'litres', 'millilitre', 'millilitres',
    'specialise', 'specialised', 'specialising', 'summarise', 'summarised',
    'characterise', 'characterised', 'categorise', 'categorised',
    'prioritise', 'prioritised', 'emphasise', 'emphasised', 'generalise', 'generalised',
    'minimise', 'minimised', 'maximise', 'maximised', 'optimise', 'optimised',
    'standardise', 'stabilise', 'synchronise', 'utilise', 'realise', 'realised',
    'visualise', 'enrol', 'enrolled', 'enrolling', 'enrolment',
    'fulfil', 'fulfilled', 'fulfilling', 'fulfilment', 'skilful', 'wilful',
    'catalogue', 'catalogues', 'dialogue', 'dialogues',
    'per cent', 'maths',
];

const BRITISH_RE = new RegExp(`\\b(${BRITISH.join('|')})\\b`, 'gi');

function countBritish(page) {
    const text = stripTags(read(page));
    let count = 0;
    for (const line of text.split('\n')) {
        if (/spelling-ok/i.test(line)) continue;
        count += (line.match(BRITISH_RE) || []).length;
    }
    return count;
}

function spellingCounts() {
    const counts = {};
    for (const page of sitePages()) {
        if (!page.startsWith('chapters/')) continue;
        const n = countBritish(page);
        if (n) counts[page] = n;
    }
    return counts;
}

function checkSpelling() {
    const current = spellingCounts();

    if (UPDATE_BASELINE) {
        fs.mkdirSync(path.join(ROOT, '.github'), { recursive: true });
        const sorted = Object.fromEntries(Object.entries(current).sort());
        fs.writeFileSync(
            path.join(ROOT, BASELINE_PATH),
            JSON.stringify(sorted, null, 2) + '\n',
            'utf8'
        );
        console.log(`spelling baseline written to ${BASELINE_PATH} (${Object.keys(sorted).length} files)`);
        return;
    }

    const baselineFile = path.join(ROOT, BASELINE_PATH);
    const baseline = fs.existsSync(baselineFile)
        ? JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
        : {};

    for (const [page, now] of Object.entries(current)) {
        const was = baseline[page] || 0;
        if (now > was) {
            fail(
                `${page}: ${now} British spellings, up from ${was} — ` +
                `the reader uses American spelling (see Writing Style.md)`
            );
        }
    }
    const total = Object.values(current).reduce((a, b) => a + b, 0);
    if (total) {
        warn(
            `${total} British spellings remain across ${Object.keys(current).length} chapters ` +
            `(pre-existing, tracked in ${BASELINE_PATH})`
        );
    }
}

/* ---------- 5. who is allowed to change what ---------- */

/* The reading shell is shared by every page. A well-meaning edit to
   course.js to fix one chapter's layout breaks all of them, and an agent
   has no way to know that. Content lives in chapters/, so that is what
   may change. Everything else needs a human who can see the whole. */
const ALLOWED_PREFIXES = ['chapters/'];
const ALLOWED_FILES = ['assets/toc.js'];

function changedPaths(base) {
    try {
        return execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRD', base], {
            cwd: ROOT,
            encoding: 'utf8',
        })
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
    } catch (err) {
        fail(`could not diff against ${base}: ${err.message.split('\n')[0]}`);
        return null;
    }
}

function hasOwnerLabel() {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || !fs.existsSync(eventPath)) return false;
    try {
        const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
        const labels = (event.pull_request && event.pull_request.labels) || [];
        return labels.some((l) => (l.name || '').toLowerCase() === 'owner-change');
    } catch {
        return false;
    }
}

function checkPaths(base) {
    const changed = changedPaths(base);
    if (!changed) return;
    if (changed.length === 0) {
        console.log(`path check: no changes against ${base.slice(0, 7)}`);
        return;
    }

    const outside = changed.filter(
        (p) => !ALLOWED_PREFIXES.some((pre) => p.startsWith(pre)) && !ALLOWED_FILES.includes(p)
    );
    if (!outside.length) {
        console.log(`path check: ${changed.length} changed file(s), all within the content allowlist`);
        return;
    }

    if (hasOwnerLabel()) {
        warn(`${outside.length} file(s) outside the content allowlist, allowed by the owner-change label`);
        return;
    }

    for (const p of outside) {
        fail(
            `${p} is outside the content allowlist — ` +
            `an agent may change chapters/*.html and assets/toc.js only ` +
            `(a maintainer can add the owner-change label to override)`
        );
    }
}

/* ---------- run ---------- */

const course = loadCourse();
if (course) checkToc(course);
checkLinks();
checkColours();
checkSpelling();
if (DIFF_BASE) checkPaths(DIFF_BASE);

for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`error: ${e}`);

if (errors.length) {
    console.log(`\n${errors.length} error(s).`);
    process.exit(1);
}
console.log('content checks passed');
