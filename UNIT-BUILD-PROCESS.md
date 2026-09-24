# Building a unit — the process, and the traps

Written after Unit 5, to be followed for Units 4, 3, 2 and 1. The order below is
**not** the order Unit 5 was actually built in; steps 1–5 were done too late and
caused rework. Do them first.

---

## What this reader is FOR — read this before anything else

The anchor guides are **note-capture sheets students fill in during a teacher's
lecture**. They are full of blanks, sketch boxes and prompts, and on their own
they teach nothing — the lecture carried the content.

This reader exists to **bridge that gap**. A student who missed the lesson, or
sat through it and did not follow it, needs a way to get the understanding
without the lecture. Three consequences, and they govern every decision below:

**1. The reader must stand alone.** Never assume the lecture happened. Where the
anchor guide says *"Sketch a model of the central dogma"*, the guide is
outsourcing that explanation to the teacher — so the reader has to actually
teach it. Treat every blank, every "fill in the notes below", every sketch box
in the guide as a marker saying *the content that belongs here is not written
down anywhere; write it.*

**2. A gap in the source is not a gap in the reader — it is where the reader is
worth the most.** If a topic is thin in the deck and absent from the guide, a
student who missed the lesson has no route to it at all. That is the strongest
possible case for the reader covering it properly, not for dropping it. Confirm
scope with the teacher, but the default is: build it.

**3. Explain, do not prompt.** The guide asks questions because a teacher is
standing there. The reader has to answer them. Where a concept is asserted, show
it — build the bell curve, do the arithmetic, give the analogy that makes a
number feel like something.

---

## Phase 0 — Source triage. Before writing a single word.

### 1. List the folder and quarantine everything assessment-related

The rule is broader than "don't use the file called summative". Exclude:

| Exclude | Seen in |
|---|---|
| Summative papers | every unit |
| Tally sheets / marking grids | U5, U1 |
| **Answer keys** | U2 — *Yellowstone Answer Key* |
| Grading notes and rubrics | U2 |
| Summative reflections | U2 |
| Summative timing/graphic decks | U1 |
| Teacher data workbooks | U2, U4 |

Also strip assessment slides out of the teaching deck itself — U5's deck had four
"Summative — Monday April 27" reminders, a revision checklist and an exam-day
logistics slide. Filename filtering is not enough.

### 2. Extract text and media

`docx` and `pptx` are zip files; parse them directly rather than converting.
Scripts used for U5 are in the scratchpad pattern: unzip → strip XML tags →
walk `slideN.xml` plus its `_rels` for media and hyperlinks. Build a
`_slide-map.json` so every image knows which slides used it.

### 3. Scan the extracted media for personal data — immediately

**Unit 5's deck contained four class seating charts with student photographs and
full names.** They were extracted straight into a web project folder. Delete
them, do not archive them — archiving keeps the PII in the repo. The originals
stay safe in the teacher's `.pptx`.

Housekeeping slides ("Phones in the phone holder", "Block 4") are the tell.
Check every image whose slide has no biology text on it.

### 4. Open every image. All of them.

Not a sample. Build contact sheets (9 per sheet, ~500px cells, labelled with
filename and slide number, ordered by slide) and look at each one. U5 had 110
images; this took 13 sheets and found things no filename could have revealed.

### 5. Categorise and quarantine

Six buckets:

1. **Delete** — personal data.
2. **Copyright-blocked** → kept in place, listed in `COURSE.replacements` in
   `assets/toc.js` with a short reason. They stay visible in the reader on
   purpose, so the subject can be seen and re-authored — `course.js` stamps a
   red REPLACE badge on any figure using one, and
   `reference/replacements.html` lists them all grouped by reason. Clear an item
   by authoring the replacement and deleting its manifest entry. Notes from the
   original sweep live in `images/uN/_replace-notes.txt`.
   U5 had 11: seven © Pearson, one © Britannica, one © NSTA *licensed to another
   school district*, one © University of Nebraska, one Dreamstime watermark.
3. **Convert to HTML/SVG** — tables and simple diagrams trapped in pixels.
4. **Make interactive** — worksheets, blank grids, anything the student should
   *do* rather than read.
5. **Keep** — clean and useful.
6. **Unused** → `images/uN/_unused/` — housekeeping, decoration, video
   thumbnails, duplicates.

Write the result to `images/uN/_review.md` so it survives the conversation.

> **Most blockers do not need generated artwork.** U5's eleven were nearly all
> diagrams — a cell cycle, homologous chromosomes, a bell curve, a FOIL table.
> Hand-authored SVG is faster, cleaner, and recolours across all three themes.
> Reach for image generation only for genuinely photographic or illustrative
> subjects, and expect two or three attempts (see Unit 6's cladogram).

---

## Phase 1 — Structure, before prose

### 6. Map teaching days to chapters

The deck's date slides ("Tue Mar 10", "Thu Mar 12") are the unit's real
skeleton. U5's ten teaching days mapped onto six chapters.

### 7. Map every "I can" statement to a chapter — write the map down

**This is the step that failed in Unit 5.** HS-LS3-2 includes *"I can explain how
some viruses, like HIV (a retrovirus), can change a cell's DNA"* — it ended up as
a footnote in a misconception box and was only caught in the final review. Unit 1
has a dedicated Learning Targets document; use it. Unit 4's anchor guide has no
"I can" statements at all — they live in `Biology Learning Grid COHEN 25-26.docx`.

Mark every target where the source material is thin or absent. Those are not
problems to escalate away — per the framing at the top of this document, they are
the targets where a student who missed the lecture is most stranded, and so the
ones the reader most needs to teach. Known so far: Unit 3 ecological succession
(absent from guide and all 129 slides), Unit 4 independent assortment (absent,
and already referenced by Unit 5), Unit 1 has five.

### 8. Register the whole unit in `assets/toc.js` at once

All chapters, `status: 'planned'`, with standards, keywords, question and
`sims`. Flip each to `'ready'` as it lands. `sims` is **not** dead metadata — it
draws the interactive names on the Contents cards.

---

## Phase 2 — Per chapter

### 9. Verify the science in Node before writing the chapter around it

This is the single highest-value habit. For U5 it caught nothing *because* it was
done first — which is the point. Verified before use:

- all 64 codons against an independently-built reference
- the anchor guide's own sequence → `Met-Ala-Arg-Arg-Gln-Leu-Leu-Trp-Stop`
- all six mutation outcomes
- 9:3:3:1 by enumeration, and that it decomposes into 3:1 × 3:1
- the polygenic distribution `1, 6, 15, 20, 15, 6, 1` by enumerating 64 outcomes

Never type a sequence or a ratio into a chapter by hand.

### 10. Build the interactive first, then write around it

Contract: `window.SIMS['name'] = function (root) {...}`, helpers from
`window.SIM_UI`, styles self-injected, and **always expose `root._simState()`
plus `root._simSolve()`** — without them the sim cannot be verified from the
console.

Design rule that held up well: **make the student commit before explaining.**
Classify the mutation before the explanation appears; predict the ratio before
filling the square; decide dominant or recessive before assigning genotypes.

Compute outcomes at runtime from the underlying model, so the biology cannot
drift away from the prose.

### 11. Write the chapter

Sections carry `data-kind`, `data-standards`, `data-time`, `data-track`.
Chapter opens by connecting to the previous one and closes with a
*Where this goes next* bridge.

### 12. Register glossary terms **as you mark them**

Marking `<span class="term">` without a `COURSE.glossary` entry produces a dotted
underline that does nothing — worse than not marking it. Silent failure, no
console error. Unit 5 shipped 31 undefined terms and the teacher found them.

### 13. Verify in the browser

Sim mounts; drive the actual student path including wrong answers; all images
load; figure numbering; no undefined terms.

---

## Phase 3 — Unit close

14. **Every forward promise is kept.** Grep for "comes back in", "you will meet",
    "picks up". U5 made three it did not keep.
14b. **The glossary and the side menu are populated for this unit.** A unit is not
    done until its vocabulary is in `COURSE.glossary` and its chapters appear as
    rows in the sidebar. Check with:
    `node -e "global.window={};require('./assets/toc.js');..."` — count terms
    marked per unit, count undefined (must be 0), count sidebar rows per unit.
    Zero marked terms for a written unit means the vocabulary was never marked;
    a non-zero undefined count means a term was marked but never defined.
15. **Every learning target is covered** — check against the map from step 7.
16. **Resync section counts from the files**, don't trust what was typed.
17. **Renumber figures** centrally with two-phase placeholder substitution.
18. **Flow pass**: chapter bridges, and concepts asserted rather than shown
    (an error rate nobody can feel; a bell curve claimed but never built).
19. Bump `ASSET_V` and the `?v=` on every HTML file.

---

## Known traps

- `U.button(parent, label, cls)` takes the **parent first**. Passing the label
  first fails with `parent.appendChild is not a function`.
- Image extensions differ from expectations — `image89` was `.jpeg`, not `.png`.
  Always verify refs resolve.
- Ratio answers must compare **in lowest terms**. A 2:2 outcome has to accept
  "1 : 1", which is how a student states it.
- SVG elements do not always respond to `.click()`; dispatch a `MouseEvent`.
- The browser caches HTML; `?v=` only busts CSS and JS. Use a cache-buster query
  when verifying.
- The Browser pane stops compositing when hidden — screenshots time out and
  `scrollIntoView` silently does nothing. Verify via DOM measurement instead.
- Console errors persist across loads in one tab. Check the version in the URL
  before believing an error is current.

---

## Unit-specific notes

**Unit 4 — Reproduction.** Folder has Anchor Guide 1, *Intro to Meiosis*, the
Best deck, and a cancer research deck. Meiosis is already referenced from Unit 5
(segregation, crossing over, independent assortment) — Unit 4 must land those
properly and Unit 5's forward references should then point back to it.

**Unit 3 — Ecosystem Dynamics.** **There is no `BIO U3 25-26` folder.** Source
material is needed before this unit can start.

**Unit 2 — Energy Flows & Matter Cycles.** Three anchor guides, plus useful
non-assessment extras (mitochondria model PDFs, a cellular respiration sim
activity, photosynthesis lab sample data). Also the most assessment material to
exclude, including an answer key.

**Unit 1 — Biochemistry & Homeostasis.** Has a dedicated Learning Targets
document — use it for step 7. **`1.1 The Cell Membrane` already exists** with the
osmosis sim, so new chapters must be numbered and sequenced around it rather than
replacing it.

**Course-wide.** `Biology Learning Grid COHEN 25-26.docx` sits at the top of the
Anchor Resource folder and is referenced throughout every deck ("link is on
learning grid"). Worth reading once, early.
