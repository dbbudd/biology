---
version: alpha
name: HKIS Course Reader
description: >-
  An open, single-course textbook site for HKIS students: a fixed toolbar, a unit
  sidebar and one reading column, with reading tools built into every page. Written
  to be replicated for other courses. Light theme values are given as tokens; sepia
  and dark values are listed in the Colors section.
colors:
  primary: "#002a42"
  on-primary: "#ffffff"
  secondary: "#14509e"
  accent: "#aa272f"
  on-accent: "#ffffff"
  highlight: "#ffcd00"
  teal: "#577899"
  background: "#ffffff"
  surface: "#f8f8f8"
  nav: "#f0f0f0"
  text: "#1a1a1a"
  text-secondary: "#555555"
  border: "#e0e0e0"
  tint-key: "#fdf0f0"
  tint-guidance: "#eff6ff"
  tint-example: "#fefce8"
  label-example: "#8a6a00"
  label-recall: "#3f5f80"
  chip-standard-bg: "#e9eef3"
  chip-standard-text: "#2f5c85"
  unit-1: "#30577e"
  unit-2: "#7e5730"
  unit-3: "#307e57"
  unit-4: "#7e3057"
  unit-5: "#57307e"
  unit-6: "#577e30"
typography:
  h1:
    fontFamily: Segoe UI
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.3
  h2:
    fontFamily: Segoe UI
    fontSize: 1.55rem
    fontWeight: 700
    lineHeight: 1.3
  h3:
    fontFamily: Segoe UI
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.3
  h4:
    fontFamily: Segoe UI
    fontSize: 1.05rem
    fontWeight: 700
    lineHeight: 1.3
  lead:
    fontFamily: Segoe UI
    fontSize: 1.1rem
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: Segoe UI
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  body-sm:
    fontFamily: Segoe UI
    fontSize: 0.92rem
    fontWeight: 400
    lineHeight: 1.6
  table:
    fontFamily: Segoe UI
    fontSize: 0.9rem
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Segoe UI
    fontSize: 0.8rem
    fontWeight: 400
    lineHeight: 1.55
  button:
    fontFamily: Segoe UI
    fontSize: 0.82rem
    fontWeight: 600
    lineHeight: 1
  eyebrow:
    fontFamily: Segoe UI
    fontSize: 0.7rem
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.1em
  callout-label:
    fontFamily: Segoe UI
    fontSize: 0.72rem
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.04em
  chip:
    fontFamily: Segoe UI
    fontSize: 0.66rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.06em
rounded:
  xs: 3px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  toolbar-height: 48px
  nav-width: 300px
  content-max-width: 820px
  status-bar-height: 32px
  gutter-desktop: 3rem
  gutter-mobile: 1rem
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
components:
  toolbar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    height: "{spacing.toolbar-height}"
  toolbar-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  toolbar-button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  sidebar:
    backgroundColor: "{colors.nav}"
    textColor: "{colors.text}"
    width: "{spacing.nav-width}"
  reading-column:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    width: "{spacing.content-max-width}"
  chapter-eyebrow:
    textColor: "{colors.accent}"
    typography: "{typography.eyebrow}"
  lead:
    textColor: "{colors.text-secondary}"
    typography: "{typography.lead}"
  callout-key:
    backgroundColor: "{colors.tint-key}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
  callout-misconception:
    backgroundColor: "{colors.tint-key}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
  callout-try:
    backgroundColor: "{colors.tint-guidance}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
  callout-recall:
    backgroundColor: "{colors.tint-guidance}"
    textColor: "{colors.label-recall}"
    typography: "{typography.callout-label}"
    rounded: "{rounded.sm}"
  callout-example:
    backgroundColor: "{colors.tint-example}"
    textColor: "{colors.label-example}"
    typography: "{typography.callout-label}"
    rounded: "{rounded.sm}"
  callout-ahead:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.callout-label}"
    rounded: "{rounded.sm}"
  table-header:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.table}"
  figure-caption:
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
  standard-chip:
    backgroundColor: "{colors.chip-standard-bg}"
    textColor: "{colors.chip-standard-text}"
    typography: "{typography.chip}"
    rounded: "{rounded.md}"
  section-tag-kind:
    backgroundColor: "{colors.tint-key}"
    textColor: "{colors.accent}"
    typography: "{typography.chip}"
    rounded: "{rounded.md}"
  chapter-pill:
    backgroundColor: "{colors.background}"
    textColor: "{colors.unit-1}"
    typography: "{typography.chip}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  progression-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  term-popover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
  link:
    textColor: "{colors.secondary}"
  focus-ring:
    textColor: "{colors.secondary}"
  highlight-marker:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.primary}"
  unit-accent-2:
    textColor: "{colors.unit-2}"
  unit-accent-3:
    textColor: "{colors.unit-3}"
  unit-accent-4:
    textColor: "{colors.unit-4}"
  unit-accent-5:
    textColor: "{colors.unit-5}"
  unit-accent-6:
    textColor: "{colors.unit-6}"
  unit-accent-teal:
    textColor: "{colors.teal}"
  border:
    backgroundColor: "{colors.border}"
---

# HKIS Course Reader: Design

This file describes how the HKIS Biology reader looks and how it is built for every learner, so
the same template can be used for another course. It follows the
[DESIGN.md format](https://github.com/google-labs-code/design.md): exact values are in the tokens
above; the reasons are below.

Writing rules for the words on the page are in `Writing Style.md`. Build steps for a unit are in
`UNIT-BUILD-PROCESS.md`. This file covers the design: color, type, layout, components, and the
Universal Design for Learning (UDL) features that the template provides on every page.

## Overview

The reader is a quiet, printed-textbook design with a small set of strong school colors. The HKIS
navy (`primary`) frames the page in the toolbar and table headers. The HKIS red (`accent`) marks
the few things a student should notice first: the chapter eyebrow, the "Key idea" callout and the
unit tools. Everything else is white space, dark text and one readable column.

Three ideas drive every design decision:

- **One column of reading.** A student reads one thing at a time. The column never exceeds 820 px,
  about 75 characters of body text.
- **Every tool is on every page.** Text size, theme, font, Focus, Listen, Translate, Search, Cards,
  Present and Printout sit in the same toolbar on every chapter. A student learns them once.
- **Color carries meaning, never decoration.** Each unit has one hue, used for its chapters,
  pills, cards and progress. Each callout type has one color and one label, so a student can
  recognize a misconception box before reading it.

The site is static HTML, CSS and plain JavaScript. It needs no account, no build step and no
server beyond file hosting (GitHub Pages). Everything a student sets or completes is stored in
their own browser.

## Universal Design for Learning

The template follows the CAST UDL Guidelines 3.0: multiple means of **engagement** (why students
learn), **representation** (what they learn) and **action and expression** (how they show it).
Each feature below is built into the template, so a new course gets it by using the template, not
by adding it chapter by chapter.

### Representation: perceiving and understanding the content

**Perception (Guideline 1)**

| Feature | What the student can do | Where it lives |
|---|---|---|
| Text size | Change body text from 75% to 150%, in 10% steps | Toolbar, Aa panel; `--font-scale` |
| Three themes | Light, sepia (lower glare) and dark. Dark is chosen automatically when the device prefers it | Aa panel; `[data-theme]` |
| Font choice | Sans-serif, serif, or a dyslexia-friendly font | Aa panel; `--body-font` |
| Focus mode | Hide the sidebar and center the reading column | Toolbar, Focus |
| Listen | Hear the page read aloud with the current sentence highlighted. Click any sentence to start there; arrow keys step; Esc stops. Speed control. Natural US or British neural voices run in the browser with no account, and device voices are the fallback | Toolbar, Listen; `listen-voice.js` |
| Described figures | Every image has alt text. Every SVG diagram has a `<title>` and `<desc>` that states what it shows | Chapter HTML |
| Captions that teach | Each caption states what to notice, not only what the figure is | Chapter HTML |
| Full-screen figures and interactives | Open any figure or interactive full screen, with arrow keys to move between figures | Lightbox; sim header |
| Reduced motion | Animations stop or shorten when the device asks for reduced motion | `prefers-reduced-motion` |
| Print | Every page prints cleanly, with the toolbar and controls removed | `@media print` |

**Language and symbols (Guideline 2)**

| Feature | What the student can do | Where it lives |
|---|---|---|
| Glossary pop-ups | Hover or tap any marked term to see its definition in place | `<span class="term">`; `COURSE.glossary` |
| Word map | Search for any term and see the words it is built on and the words it leads to | `reference/glossary.html` |
| Translate | Translate the page into 14 languages on the device, with no server. Glossary terms stay in English beside the translation, so the vocabulary is still learned. Slides and flash cards translate too | Toolbar, Translate; `translate-core.js` |
| Plain English | Every sentence follows `Writing Style.md`: short sentences, no idioms, no personification, American spelling | `Writing Style.md` |
| Standard notation | Formulas, units, gene symbols and species names follow one set of conventions | `Writing Style.md`, section 3 |

**Building knowledge (Guideline 3)**

| Feature | What the student can do | Where it lives |
|---|---|---|
| Anchoring phenomenon | Each unit opens with one real case that the whole unit explains | Unit overview |
| How the ideas build | See each chapter's question in order, with links, at the top of every chapter and overview | `data-progression` |
| Looking back and Where this goes next | Each chapter states the earlier fact it needs, and the next idea it leads to | `callout-recall`, `callout-ahead` |
| Key idea and Common misconception | The one rule to remember, and the wrong idea stated and corrected | `callout-key`, `callout-misconception` |
| Predict before reveal | Every interactive asks for a prediction before it shows a result | `sims/` |
| Course map | See the whole course as units sized by study time, with what must come first | `index.html`; `contents.js` |

### Action and expression: working with the content and showing understanding

**Interaction (Guideline 4)**

| Feature | What the student can do | Where it lives |
|---|---|---|
| Keyboard use | Search with Ctrl/Cmd K; Esc closes panels; arrow keys move through figures and Listen | `course.js` |
| Visible focus | Every button and link shows a clear outline when reached by keyboard | `:focus-visible` rules |
| Any device, no install | Works on a Chromebook, iPad or phone browser, with a single-column phone layout | Responsive CSS |
| Embed and share | Any interactive can be embedded on its own in another site, such as SharePoint | `embed.html`; sim Share |

**Expression and communication (Guideline 5)**

| Feature | What the student can do | Where it lives |
|---|---|---|
| Interactives | Build and test models (NGSS practice 2), not only read about them | `sims/` |
| Check your understanding | Write an explanation, then compare with a short model answer | `details.check-q` |
| Flash cards | Revise the unit's terms and figures as cards | Toolbar, Cards |
| Present | Turn a unit into slides, and export them to PowerPoint or PDF | Toolbar, Present |
| Printout | Build a paper workbook for a unit: notes with gaps, diagrams, questions in two versions, and lines for writing | Toolbar, Printout |

**Strategy development (Guideline 6)**

| Feature | What the student can do | Where it lives |
|---|---|---|
| Learning targets | Read each unit's "I can" statements as a checklist, each linked to the chapter that teaches it | Unit overview |
| Progress tracking | Mark sections complete and see progress for each unit in the toolbar | Complete buttons; toolbar bar |
| Reading position | See where they are in a long chapter | Status bar at the bottom |
| Time estimates | See how long each section takes | Time pills |
| Prerequisites | See what to read first, with a link to it | "First:" pills |
| Search | Find any chapter, section, term or question | Toolbar, Search |

### Engagement: interest, effort and confidence

| Guideline | How the template supports it |
|---|---|
| Welcoming interests and identities (7) | Real cases and places students recognize; a choice of how to study (read, listen, translate, cards, slides, paper); content in the student's first language beside English |
| Sustaining effort and persistence (8) | Short sections with time estimates; visible progress; instant feedback on every quick-check question; a second version of each question to try after reviewing |
| Emotional capacity (9) | Self-checks are private and never graded; wrong answers explain why and link to the section to review; misconceptions are presented as common, not as failures; "Try this" tasks say rough answers are fine |

### Access without barriers

- **No account and no tracking.** Settings and progress are stored in the student's own browser.
- **Nothing leaves the device.** Translation runs on the device. The natural voices download once
  from the site and then run offline.
- **Videos load only when clicked**, so opening a chapter makes no request to a video site.
- **The reader stands alone.** A student who missed every lesson can learn from it.

### Known gaps to fix

A replication should fix these rather than copy them.

- There is no "skip to content" link for keyboard and screen-reader users.
- The dyslexia-friendly font option names OpenDyslexic but does not load it, so most devices show
  Comic Sans instead. Bundle the font with `@font-face`, or rename the option.
- Two callout labels fail WCAG AA contrast for small text in the light theme: "Example" is yellow
  `#ffcd00` on `#fefce8` (1.45 : 1), and "Looking back" is teal `#577899` on `#eff6ff` (4.24 : 1).
  The tokens `label-example` (`#8a6a00`) and `label-recall` (`#3f5f80`) are the corrected values.
- Natural voices are English only. Listen reads other languages with the device's own voices, and
  greys out when the device has none.

## Colors

The palette is the HKIS school palette, used sparingly.

- **HKIS Navy (`primary`, #002a42):** the toolbar, table headers, glossary pop-ups and Heading 3.
  White on navy is 14.9 : 1.
- **Reading Blue (`secondary`, #14509e):** links, focus outlines, "Note" and "Try this" labels.
  7.9 : 1 on white.
- **HKIS Red (`accent`, #aa272f):** the chapter eyebrow, the "Key idea" and "Common misconception"
  labels, the section-type tag, the reading-progress bar, and the unit tool buttons (Cards,
  Printout, Present). Use it for no more than three things on one screen. 6.9 : 1 on white.
- **HKIS Gold (`highlight`, #ffcd00):** a highlight only, never text on a light background. It is
  the chapter eyebrow color in the dark theme.
- **Slate Teal (`teal`, #577899):** "Looking back" callouts and definition underlines.
- **Neutrals:** white page, `surface` #f8f8f8 for panels, `nav` #f0f0f0 for the sidebar, `text`
  #1a1a1a, `text-secondary` #555555, `border` #e0e0e0.
- **Callout tints:** `tint-key` #fdf0f0 (Key idea, Misconception), `tint-guidance` #eff6ff (Note,
  Try this, Looking back), `tint-example` #fefce8 (Example).

### Unit colors

Each unit has one hue, set once in `toc.js` (`COURSE.units[].hue`). The design system turns the hue
into a readable color for each theme, so a new unit needs one number, not a palette. The formula is
`hsl(hue, saturation, lightness)`, with saturation and lightness set per theme:

| Theme | Saturation | Lightness | Soft tint alpha | Line alpha |
|---|---|---|---|---|
| Light | 45% | 34% | 0.13 | 0.35 |
| Sepia | 38% | 30% | 0.15 | 0.40 |
| Dark | 55% | 70% | 0.20 | 0.55 |

| Unit | Hue | Light | Sepia | Dark |
|---|---|---|---|---|
| 1 Biochemistry and Homeostasis | 210 | #30577e | #2f4d6a | #88b3dd |
| 2 Energy Flows and Matter Cycles | 30 | #7e5730 | #6a4d2f | #ddb388 |
| 3 Ecosystem Dynamics | 150 | #307e57 | #2f6a4d | #88ddb3 |
| 4 Reproduction | 330 | #7e3057 | #6a2f4d | #dd88b3 |
| 5 Genetics and Inheritance | 270 | #57307e | #4d2f6a | #b388dd |
| 6 Evolution | 90 | #577e30 | #4d6a2f | #b3dd88 |

Space the hues around the color wheel (60° apart for six units) so that neighboring units are
easy to tell apart.

### Themes

The tokens above are the light theme. Every color is a CSS custom property on `[data-theme]`, so
a component never names a color directly and all three themes work automatically.

| Token | Light | Sepia | Dark |
|---|---|---|---|
| background (`--bg`) | #ffffff | #f5edd6 | #121212 |
| surface (`--bg-surface`) | #f8f8f8 | #ede4cb | #1e1e1e |
| nav (`--bg-nav`) | #f0f0f0 | #e8dfca | #1a1a1a |
| text (`--text`) | #1a1a1a | #3e2f1c | #e0e0e0 |
| text-secondary | #555555 | #6b5b45 | #a0a0a0 |
| border | #e0e0e0 | #d4c6a8 | #333333 |
| toolbar and pop-ups | #002a42 | #3e2f1c | #0a1a28 (pop-ups #2a3a4a) |
| tint-key | #fdf0f0 | #f0ddc0 | rgba(170, 39, 47, 0.12) |
| tint-guidance | #eff6ff | #e8dcc0 | rgba(20, 80, 158, 0.12) |
| tint-example | #fefce8 | #f0e4c0 | rgba(255, 205, 0, 0.08) |

Sepia exists for students who find white glare tiring. Dark follows the device setting on first
visit; after that, the student's choice is remembered.

## Typography

One sans-serif family for everything: **Segoe UI**, falling back to the device's system font
(`system-ui`, `-apple-system`). It is already on every school device, so the site loads no font
files. Students can switch to a serif (Georgia) or a dyslexia-friendly font; headings follow the
body choice.

- **Body 1rem, line height 1.7.** Generous spacing for long reading and for EAL readers.
- **Headings are bold with line height 1.3.** Heading 2 carries a 2px rule underneath it and starts
  a new section; Heading 3 is navy.
- **Lead paragraph 1.1rem in `text-secondary`**, directly under the chapter title.
- **Small capitals labels** (eyebrow, callout labels, chips) are uppercase, bold and letter-spaced.
  They name a thing; they never hold a sentence.
- **Every size scales with the student's text size**, because all sizes are in rem and the root is
  multiplied by `--font-scale`.

## Layout

### Page structure

Every page has the same four regions:

| Region | Size | Contents |
|---|---|---|
| Toolbar | Fixed top, 48 px, navy | Menu (on phones), course title, course progress, then the tools: Search, Aa, Translate, Listen, Focus, then Cards, Printout, Present in red |
| Sidebar | Fixed left, 300 px, `nav` | Units and chapters, with the current chapter's sections underneath; Reference links (Glossary, Standards) at the bottom |
| Reading column | Up to 820 px, 3rem side padding | The chapter |
| Status bar | Fixed bottom, 32 px | The current section name and a reading-progress bar |

Below 900 px the sidebar becomes a slide-in menu. Below 760 px the toolbar labels hide and only
icons remain. Tables and wide diagrams scroll sideways inside their own box instead of widening
the page.

### Chapter structure

Every chapter follows the same order, so a student always knows where they are:

1. **Eyebrow** (unit name, in the unit color) and **title** (number and name, e.g. "1.1 The Cell
   Membrane").
2. **Lead paragraph**: one to three sentences on what the chapter explains.
3. **Meta bar**: study time and the chapter's NGSS standard chips, generated from `toc.js`.
4. **How the ideas build**: the unit's chapters and their questions.
5. **Looking back** callout and **objectives**.
6. **Sections**, each with a type tag (Core, Practice, Orientation), standard chips, a time pill, a
   Complete button and a copy-link button, all generated from attributes on the `<section>`.
7. **Check your understanding** and **Quick check** at the end.
8. **Previous and next chapter** links, generated automatically.

### Unit overview structure

The key sentence for the unit, the chapter strip, the anchoring phenomenon, the standards as
cards, the learning targets as a checklist, and a card for each chapter's interactive
(`overview.js`, `overview.css`).

### Spacing

A 1rem base unit. Paragraphs are 1rem apart, callouts and figures 1.25 to 1.75rem, sections 2.5rem
with a divider line. The section after the "How the ideas build" box has no divider, because the
box already closes the section.

## Elevation & Depth

The design is almost flat. Depth is used only where something sits above the page:

- **Pop-ups and panels** (glossary definitions, the Aa panel, search results, the Listen bar) have a
  soft shadow, about `0 8px 24px rgba(0, 0, 0, 0.25)`, so they read as floating.
- **Cards** (word map definition, standards) use a light shadow or a 1px border, never both
  strongly.
- **Lightbox and full screen** darken the page behind them.

Nothing else has a shadow. Separation comes from white space, borders and tints.

## Shapes

- **3–4px** for callouts and small marks: nearly square, like a printed box.
- **6–8px** for buttons, chips, inputs and panels.
- **12px** for cards and the "How the ideas build" panel.
- **Full (pill)** for chapter pills, term chips in the word map, time pills and filter buttons.
- **Callouts have a 4px colored left border**; cards for a standard have a 4px left border in the
  unit color. The left border is the recurring shape that says "this box is a type of thing".

## Components

- **Toolbar buttons**: navy with white text; the unit tools (Cards, Printout, Present) are red so
  they stand out as "make something from this unit". Each has an icon and a text label; the label
  hides on phones.
- **Callouts**: seven types, each with a fixed label, tint and left-border color. The label is
  generated by CSS, so authors write `<div class="callout callout-try">` and never type the label.

  | Class | Label | Tint | Border and label |
  |---|---|---|---|
  | `callout-key` | Key idea | tint-key | accent |
  | `callout-misconception` | Common misconception | tint-key | accent |
  | `callout-try` | Try this | tint-guidance | secondary |
  | `callout-note` | Note | tint-guidance | secondary |
  | `callout-recall` | Looking back | tint-guidance | teal |
  | `callout-example` | Example | tint-example | highlight (see Known gaps) |
  | `callout-ahead` | Where this goes next | surface | text-secondary |

- **Section tags and standard chips**: small-capital labels above a section heading. The section
  type is red; the standard chip is blue-gray and links to its row on the Curriculum Standards page.
- **Pills**: rounded chips for study time, prerequisites and chapter numbers. A chapter pill is the
  bare number ("1.3") in the unit color; it is how any page refers to a chapter.
- **Figures**: a figure, then a caption starting "Figure 1.1 —" in bold. Photos, diagrams (inline
  SVG) and pairs share one style. Every figure opens full screen.
- **Interactives**: a bordered box with a header (title, "Interactive" tag, Share and Full screen
  buttons), the model, controls, and a readout that states what happened and why.
- **Quick check**: multiple choice that marks itself. Each wrong option explains why and links to
  the section to review; a second version of the question appears on return.
- **Check your understanding**: a question in a `<details>` element that opens to a short model
  answer.
- **Tables**: navy header row with white text, 1px borders, 0.9rem text.
- **Glossary term**: a light tint with a dashed teal underline; hover or tap shows the definition
  in a navy pop-up.
- **How the ideas build**: a 12px-rounded surface panel listing the unit's chapters and their
  questions, with the current chapter highlighted.
- **Unit overview cards**: standards cards, learning-target groups with a square-bullet checklist
  and chapter pills, and activity cards linked to each interactive.

## Do's and Don'ts

- **Do** use the tokens and CSS custom properties, never a raw hex value in a component, so all
  three themes keep working.
- **Do** set a unit's color with one hue in `toc.js`, and let the system derive the rest.
- **Do** give every image alt text and every SVG a `<title>` and `<desc>`.
- **Do** keep one reading column, and put wide content (tables, large diagrams) in its own
  scrolling box.
- **Do** check every new text and background pair for 4.5 : 1 contrast (3 : 1 for large text) in
  all three themes.
- **Do** mark every technical term with `<span class="term">` and define it in `COURSE.glossary`.
- **Don't** use HKIS Gold as text on a light background.
- **Don't** use red for more than three things on one screen, or for anything that is not a key
  idea, a misconception, progress or a unit tool.
- **Don't** add a shadow to static content, or a second font family.
- **Don't** add a feature that needs an account, a server or tracking.
- **Don't** build a feature for one chapter. If it helps learners, build it into the template so
  every page gets it.

## Replicating this template

To start a new course from this site:

1. **Copy the shell**: `assets/course.css`, `assets/course.js`, `assets/toc.js`, the reference
   pages, `index.html`, `.claude/serve.mjs`, `.nojekyll`, and the unit tools you want
   (`flashcards.js`, `present*.js`, `printout.*`, `listen-voice*.js` with `vendor/piper`,
   `translate-core.js`, `glossary-map.*`, `overview.*`).
2. **Rewrite `toc.js`**: the course title, the units (label, short name, hue, prerequisites), the
   chapters (file, title, question, time, standards), the standards and the glossary. Every
   generated part of the site reads from this one file.
3. **Change the school palette** in `:root` and `[data-theme]` in `course.css` if the school is not
   HKIS. Keep the roles (primary, accent, secondary) and check contrast in all three themes.
4. **Write chapters from an existing chapter file**, keeping the structure in the Layout section.
5. **Copy `Writing Style.md`** and change its subject-specific rules and examples.
6. **Fix the known gaps** listed in the UDL section.
7. **Bump `ASSET_V`** in `course.js` and the `?v=` on every HTML file whenever shared CSS or
   JavaScript changes, so students' browsers load the new version.
