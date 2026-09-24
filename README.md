# Biology — Interactive Course Reader

A prototype course reader built as plain static HTML. No build step, no
dependencies — open `index.html` in a browser, or serve the folder.

The reading shell (toolbar, themes, sidebar, search, progress, glossary
popovers, print styles) is adapted from the HKIS Teaching & Learning
Handbook; the original single-file source is kept in `_reference/` for
lifting anything else across later.

## Layout

```
index.html              Contents / landing page
chapters/               One HTML file per chapter
reference/glossary.html Glossary, rendered from assets/toc.js
reference/standards.html Curriculum standards and where each is covered
assets/
  toc.js                Course structure + glossary — the single source of truth
  course.css            All styling
  course.js             The shell: renders chrome, wires behaviour, loads sims
sims/                   One JS file per simulation
images/                 Logo and shared images
_reference/             Untouched copies of the handbook source
```

## Adding a chapter

1. Add an entry to `COURSE.chapters` in `assets/toc.js`. Set
   `status: 'ready'` when the file exists (`'planned'` shows a greyed-out
   sidebar entry with no link).
2. Create the HTML file. It only needs `<main class="main">` plus the two
   script tags — the toolbar, sidebar and footer bar are generated:

```html
<body data-root="../" data-chapter="ch02-transport">
<main class="main" role="main">
    <section id="intro"> ... </section>
</main>
<script src="../assets/toc.js"></script>
<script src="../assets/course.js"></script>
</body>
```

`data-root` is the path back to the site root; `data-chapter` must match the
`id` in `toc.js`. Each `<section id="...">` with an `<h2>` automatically
appears in the sidebar's "on this page" list and in search.

## Section metadata — tags, time and completion

Adapted from the vex-robotics curriculum. Declare it on the `<section>`; the
shell renders the tag row above the heading and the pill bar below it, so
there is no markup to copy and no per-chapter ID arrays to maintain.

```html
<section id="osmosis"
         data-kind="Core"
         data-standards="IB B2.1, NGSS HS-LS1-3"
         data-time="15 min"
         data-prereq="diffusion"
         data-track>
```

| Attribute | Effect |
| --- | --- |
| `data-kind` | A type tag — "Core", "Practice", "Extension", anything you like. |
| `data-standards` | Comma-separated codes looked up in `COURSE.standards`. Renders a tag per code; hovering shows the full wording. |
| `data-time` | Estimated-time pill with a clock icon. |
| `data-prereq` | Comma-separated section ids. Renders a "First: …" pill that turns green once those sections are complete. |
| `data-track` | Adds the Complete pill to the heading and counts the section towards progress. Presence alone is enough — no value needed. |

Chapter-level `time` and `standards` live in `toc.js` instead and fill an
empty `<div class="chapter-meta"></div>` in the chapter header.

## Heading controls — Complete and copy-link

Adapted from the orientation site, where each FAQ heading carries its own
Complete pill and link icon. Both are injected by the shell, so there is no
markup to write.

- **Complete pill** — appears on any heading whose block has `data-track`.
  Outline pill with `○ Complete`; filled green with `✓ Complete` when done.
  The label never changes, so the pill keeps its width and the heading row
  doesn't jump.
- **Copy-link button** — appears on *every* section heading and every
  activity, whether or not it is tracked. Copies
  `origin + pathname + #id` to the clipboard and flashes a green ✓ for
  1.4 s. Falls back to a hidden textarea and `execCommand('copy')` where
  the clipboard API is unavailable, such as a non-HTTPS context. On a
  pointer device it fades in on hover so it doesn't clutter every heading;
  on touch it is always visible.

  It stays visible for hover, focus, `:focus-within` on the heading, while
  active, and throughout the copied confirmation. `:focus` is listed
  alongside `:focus-visible` deliberately: on macOS a mouse click does not
  focus a button, so `:focus-visible` never matches on click and the button
  would have nothing holding it visible while being used. The `.copied`
  state carries `opacity: 1 !important` and `transition: none` so the
  confirmation can never fade or be overridden.

A `<section>`'s `<h2>` is wrapped in `.section-head` so the controls share
the heading row without becoming part of the heading's own text — nav
labels, the search index and prerequisite pill names all read the heading
through a helper that strips them. An activity's `<summary>` already lays
out as a row, so the controls are appended to it directly.

### Deep links for an LMS

Following a copied link has to open any collapsed `<details>` on the way to
the target and then scroll to it, which the browser will not do on its own.
The shell handles this on load and on `hashchange`: it opens every
`<details>` ancestor, scrolls so the target clears the fixed toolbar, and
flashes the target briefly so the reader can see where they landed. It
re-scrolls at 120 ms and 400 ms and on `load`, because a simulation's canvas
and a just-opened accordion both change the page height after the first
attempt.

Scrolling is done with `window.scrollTo` and an explicitly computed offset
rather than `scrollIntoView`, so the landing position under the fixed
toolbar is predictable.

## Tracking lessons and activities

`data-track` works on two levels, and both count towards the same totals:

```html
<section id="osmosis" data-track>            <!-- a lesson -->
<details class="check-q" id="q-lysis" data-track>  <!-- an activity -->
```

The demo chapter shows both: three tracked sections plus three tracked
self-check questions, six items in total. Anything with `data-track` and an
`id` is counted, so a tracked activity needs an `id` to be tracked and to be
linkable.

## Progress tracking

All completion state lives in one localStorage key, `bio_progress`, shaped
`{ chapterId: { sectionId: true } }`. Marking a section complete updates, in
one pass: the button, the section heading rule, the sidebar tick, the "on
this page" tick, any prerequisite pill that depends on it, the chapter
counter in the footer bar, and — on the contents page — the per-chapter
progress bar and the course total.

The contents page has to show progress for chapters it has not loaded, so
each chapter in `toc.js` carries a `sections` count. **Keep that number in
step with the number of `data-track` sections in the file**, or the
percentages will be wrong.

Progress is reported at three scopes, all updating together:

| Scope | Where |
| --- | --- |
| Whole course | Toolbar — a count plus a bar split into one segment per unit |
| Unit | Sidebar (bar under each unit label) and the contents page (unit header) |
| Chapter | Contents card, plus the counter in the footer bar |

Readers can clear everything from **Aa → Progress → Reset progress**.

## Units and colour coding

Units are a registry in `toc.js`; a chapter's `unit` is an id in it.

```js
units: [
    { id: 'cells',  label: 'Unit 1 — Cells',  hue: 200 },
    { id: 'energy', label: 'Unit 2 — Energy', hue: 145 }
],
```

`hue` is one number, 0–360. Everything the unit is coloured with — sidebar
label and bar, contents header and bar, card number and hover border, the
chapter eyebrow, and the unit's segment of the toolbar bar — is derived from
it in CSS via `hsl(var(--unit-h) var(--u-sat) var(--u-light))`. Saturation
and lightness are set per theme, so one hue produces readable colour in
light, sepia and dark without listing three palettes.

Pick hues far apart: 0 red, 40 orange, 90 olive, 145 green, 200 blue,
265 violet, 320 magenta.

The toolbar bar is segmented by unit — each segment's width is that unit's
share of the course's trackable sections, and its fill is that unit's own
completion. So one glance gives both the overall figure and which unit the
reader is actually making progress in. Hovering it names every unit and its
count.

Colour convention: **hue means which unit, green means done.** Progress bars
take unit colour; the completion pills, ticks and "complete" states stay
green, so a reader never has to work out whether a colour means identity or
state.

## Curriculum standards

`COURSE.standards` in `toc.js` maps a code to a framework and the full
wording:

```js
'IB B2.1': { framework: 'IB Biology', description: 'Membranes and membrane transport — …' }
```

The course is mapped against **NGSS**, following the HKIS Biology Course
Outline 2026-27. All 22 performance expectations used across the six units
are in the registry, and those in Unit 6 also carry the crosscutting concept
named in the anchor guides (`ccc: 'Patterns'` / `'Cause and Effect'`).

`reference/standards.html` inverts the mapping into a coverage report —
every standard, and the chapters and sections that address it, including
"Not yet covered". It fetches each ready chapter to read section-level
`data-standards`, so it needs the site served over http; opened from the
file system it falls back to chapter-level coverage and says so.

## Content patterns

| Pattern | Markup |
| --- | --- |
| Callout | `<div class="callout callout-key">` — also `callout-note`, `callout-example`, `callout-misconception`, `callout-try`. Add `data-label="Exam tip"` to override the label. |
| Objectives box | `<div class="objectives"><h4>…</h4><ul>…</ul></div>` |
| Diagram | `<figure class="diagram"><svg>…</svg><figcaption><b>Figure 1.1</b> — …</figcaption></figure>` |
| Glossary term | `<span class="term">osmosis</span>` — definition pulled from `toc.js`, or set `data-def="…"` inline for a one-off. |
| Self-check | `<details class="check-q"><summary>Q</summary><div class="check-a">A</div></details>` |
| Activity | `<details class="check-q" id="q-lysis" data-track>` — an `id` makes it linkable, `data-track` makes it countable. |
| Simulation | `<div class="sim" data-sim="osmosis"><div class="sim-header"><h4>Title</h4><span class="sim-kind">Interactive</span></div></div>` |
| Standard tag | Set `data-standards` on the section — don't write the tag markup by hand. |

## Check your understanding

Each chapter's check section has two parts, and they do different jobs.

**Quick check** — auto-marked multiple choice. Authored declaratively:

```html
<div class="quiz" data-quiz>
  <div class="quiz-q" data-answer="3" data-review="anatomy">
    <p class="quiz-stem">Question?</p>
    <ol class="quiz-options">
      <li data-why="Why this one is tempting but wrong">Option A</li>
      <li>Correct option</li>
    </ol>
    <div class="quiz-why">Explanation shown once answered.</div>
  </div>
</div>
```

`data-answer` is the 1-based index of the right option. `data-review` is the
id of the section covering that idea — a wrong answer produces a
"Review: …" link to it, and once all questions are answered a score card
lists every section worth revisiting. `data-why` on a distractor gives
feedback specific to that mistake, so the wrong answers have to be written as
real misconceptions rather than filler.

**Explain it yourself** — the existing `.check-q` written questions with
model answers. These stay, because two of the three reporting categories
(Communicating, Investigating) assess explanation rather than recognition.
Multiple choice diagnoses; writing is the assessed skill.

Built for all five content chapters — 27 questions in total. Every
distractor carries `data-why`, so a wrong answer always explains itself
rather than just being marked wrong; writing those forces the distractors to
be real misconceptions.

Worth validating after any edit: that each `data-answer` is in range, that
every `data-review` resolves to a real section id, and that no distractor is
missing feedback. All three are quick to check from the console.

## Adding a simulation

Create `sims/<name>.js` registering a mount function:

```js
window.SIMS = window.SIMS || {};
window.SIMS.myThing = function (root) {
    // root is the .sim element; append .sim-stage / .sim-controls / .sim-readout
};
```

`sims/_ui.js` loads first and provides the shared pieces — `stage`,
`slider`, `select`, `button`, `theme`, `loop`, `gauss`, `axes` — so a sim
file contains only its model and its drawing.

The shell loads both lazily the first time it sees `data-sim="myThing"` on
the page, and swaps in a plain-text fallback if it fails.

Every sim exposes `root._simState()` returning its internal numbers. That is
for checking the model behaves — you can drive a sim from the console and
read the distribution out instead of trying to read pixels off the canvas.
Each of the three below was verified that way rather than by eye.

### The simulations

| Sim | Chapter | Standard | What it shows |
| --- | --- | --- | --- |
| `cladogram` | 6.1 | HS-LS4-1 | Build a tree from a character table by placing shared characteristics in order |
| `taxonomy` | 6.1 | HS-LS4-1 | Place Order/Family/Genus/Species onto a branching diagram of five carnivores |
| `vida-match` | 6.2 | HS-LS4-2 | Match V, I, D and A to four scenes; catches the "pressure caused the variation" error |
| `selection` | 6.3 | HS-LS4-3 | Selection moving a trait distribution — produces all three patterns |
| `drift` | 6.4 | HS-LS4-4 | Eight identical populations drifting apart by chance; bottleneck button |
| `rescue` | 6.5 | HS-LS4-5 | Whether a population can adapt fast enough to survive a moving environment |

Interactives built by subagents (`taxonomy`, `vida-match`) inject their own
CSS via a `<style>` element guarded by an id check, rather than adding to
`course.css`. That keeps them self-contained and lets several be built in
parallel without conflicting.

### Themes and canvas sims

`SIM_UI.theme()` reads colours from the page's CSS custom properties. It must
not branch on a dark/light boolean — there are **three** themes, and a
boolean renders sepia with light-theme colours. This was a real bug, found
while building the taxonomy interactive and fixed in `_ui.js`, `osmosis.js`
and `selection.js`.

Each has an "Advance 1 generation" control as well as Run. That is not just
for patience — background browser tabs throttle `setInterval` to about one
tick per second, so stepping is the only reliable way to drive a sim
programmatically. Simulations
should listen for the `themechange` window event if they draw to canvas.
Nothing essential should live only inside a simulation — the text and
diagram must carry the explanation on their own.

## Writing diagrams

Inline SVG, using the theme's CSS custom properties (`var(--red)`,
`var(--blue)`, `var(--yellow)`, `var(--light-teal)`, `var(--text)`) so
diagrams follow the light / sepia / dark themes. Give every diagram a
`<title>` and `<desc>` for screen readers.

## Course structure

Six units, following the course outline:

| Unit | NGSS | State |
| --- | --- | --- |
| 1 — Biochemistry & Homeostasis | HS-LS1-2, 1-3, 1-6 | Placeholder + one worked chapter (1.1 The Cell Membrane) |
| 2 — Energy Flows & Matter Cycles | HS-LS1-5, 1-7, LS2-3, 2-4, 2-5 | Placeholder |
| 3 — Ecosystem Dynamics | HS-LS2-1, 2-2, 2-6, 2-8 | Placeholder |
| 4 — Reproduction | HS-LS1-2, 1-4, LS3-2 | Placeholder |
| 5 — Genetics & Inheritance | HS-LS1-1, LS3-1, 3-2, 3-3 | Placeholder |
| 6 — Evolution | HS-LS4-1 … 4-5 | **The unit being built out** |

Unit 6 takes one chapter per NGSS performance expectation, which is how the
anchor guides are organised:

| Chapter | Standard |
| --- | --- |
| Unit 6 Overview | all five, plus the 14-lesson map |
| 6.1 Evidence of Common Ancestry | HS-LS4-1 |
| 6.2 The Four Factors of Natural Selection | HS-LS4-2 |
| 6.3 Reading Trait Distributions | HS-LS4-3 |
| 6.4 Adaptation and Speciation | HS-LS4-4 |
| 6.5 Environmental Change and Extinction | HS-LS4-5 |

All six are written. Set a chapter to `status: 'planned'` in `toc.js` to grey
it out in the sidebar and unlink it.

The overview carries the **lesson map** — the taught sequence of 14 lessons
across the three anchor guides, mapped onto these chapters with deep links,
plus the four summatives and their reporting categories. The reader follows
the standards while the lessons interleave them, so that table is what
reconciles the two.

## Videos and external resources

The deck's hyperlinks are carried across as two components.

**Videos** — authored as one line, rendered by `course.js`:

```html
<div class="video" data-video="nOVvEbH2GC0" data-title="To Scale: Time"
     data-source="TIME" data-note="Stop at 2:25"></div>
```

`data-video` is the YouTube id; `data-note` is optional and shows the
timestamp guidance from the slides ("Watch 2:24-3:31", "First 3:30").

The embed is a **facade**: a styled placeholder is rendered, and the iframe is
only inserted when the reader clicks play. Opening a chapter therefore makes
no third-party request at all — verified as zero. On click it loads from
`youtube-nocookie.com`. Every video also shows a direct `youtu.be` link,
because school networks frequently block embedded players while allowing the
site itself.

**External resources** use the `.btn-external` card in a `.resource-list` —
Learn.Genetics and Teach.Genetics activities, PBS NOVA interactives, the
Berkeley evolution library and the whale case study PDFs.

Links that were **not** carried across: anything on `hkis.sharepoint.com`,
`docs.google.com` or `drive.google.com`. These are permissioned teacher
materials — summative decks, answer keys, internal templates — that would
either fail for students or expose something that should not be public.

## Images

`images/u6/` holds all 141 images extracted from `Bio U6 25-26 - Best.pptx`,
downscaled to a 1400px maximum dimension. `images/u6/_slide-map.json` maps
each slide number to the images it used, which is how to find an image for a
topic.

29 are placed in the chapters, numbered as Figures 6.1-6.34 across the unit
(a figure may be a drawn SVG rather than a photo). Each photo is captioned
with a
`<span class="asset-placeholder-tag">Placeholder</span>` marker, so
`grep -c asset-placeholder-tag chapters/*.html` counts what still needs
replacing. The rest stay in the folder unused — many are classroom
management slides (calendars, seating, summative instructions) with no place
in a reader.

**Video thumbnails are deliberately excluded.** In the deck, many pictures
were the clickable link to a video — a still frame standing in for the
player. Those are redundant now the videos are embedded, so they were
removed. They are detectable in the source rather than by eye: a thumbnail
is a `<p:pic>` whose own shape carries the `<a:hlinkClick>` to an external
URL. Nineteen exist in the deck; six had been placed and were pulled. If you
add more images later, check that rule before placing one.

**Two things to settle before this goes anywhere public.** Several images
carry third-party copyright notices — the convergent evolution table in 6.4
is marked "Copyright © The McGraw-Hill Companies. Permission required for
reproduction or display." And the folder is ~44MB, which is fine locally but
heavy for SharePoint. Both point the same way: replace the placeholders with
original artwork before publishing.

## 3D, video and external tooling

**three.js** — usable for in-browser 3D, but not currently part of this
project. It lives in `~/Documents/video-workflow`. Adding it means either
vendoring `three.min.js` or loading it from a CDN, which is a real decision
for a site intended for SharePoint.

**Remotion** — also in `~/Documents/video-workflow`. Worth being clear about
what it is: Remotion renders React components to **video files**. It is not a
browser runtime and cannot power an interactive simulation in a static page.
It is an excellent way to produce narrated explainer clips, which this reader
can then embed with the existing `.video` component.

**Human Atlas** (`github.com/ashemag/human-atlas`) — React + three.js viewer
over BodyParts3D anatomy. Code is MIT; the anatomy data is **CC BY 4.0 and
the attribution must be preserved when redistributing**. The full dataset is
about 33MB of geometry, far too heavy to drop into a chapter, but individual
meshes can be extracted. The obvious first use is the coccyx for vestigial
structures in 6.1.

## Later: SharePoint

`_reference/site-template/` holds the PnP provisioning template from the
handbook repo. Not wired up yet — this prototype is deliberately plain
static files.
