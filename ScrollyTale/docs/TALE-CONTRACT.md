# Tale contract

The interface between the reader and the player. Lock this before the tale grows.

Read with `docs/ARCHITECTURE.md`. Source of truth for content stays in the reader:
`assets/toc.js`, `chapters/`, `sims/`, `images/`.

## 1. Where the tale is authored

`app/src/data/tales/<id>.ts` today. When the static shell lands it is published as
`assets/tales.js` in the same shape, so the manifest moves without a rewrite.

## 2. Tale

| Field | Meaning |
| --- | --- |
| `id` | stable slug, used as the storage key suffix |
| `unit` | `u2`, matching `COURSE.units[].id` |
| `title`, `subtitle` | shown in the player chrome |
| `phenomenon` | the event the whole tale returns to, one paragraph |
| `drivingQuestion` | the one question the tale answers |
| `budgetMinutes` | the sitting ceiling, matching the reader's 25 to 40 minute pills |
| `beats[]` | the designed sequence |

## 3. Beat

| Field | Meaning |
| --- | --- |
| `id` | stable, used in commits and storage |
| `kind` | `phenomenon`, `evidence`, `revision`, `recall`, `transfer`, `snapshot` |
| `eyebrow` | position line, for example `Step 2 of 7 · Evidence` |
| `title` | names the idea |
| `prompt` | the instruction, exact verb first |
| `helper` | optional second line |
| `minutes` | time budget for this beat |
| `commit` | what kind of record this beat writes |
| `source` | `{ chapter, section }` pointer into the reader. Never a copy |
| `sim` | `{ key, title, task }`. `key` is the file name in `sims/` |
| `concepts` | words that signal the idea is present in a response |
| `moves[]` | the authored bank the guide picks from |
| `closeEnough` | the criterion shown to the student |
| `standards` | NGSS codes this beat produces evidence for |

## 4. Move

```ts
{ id: "ask-carrier", when: "thin", say: "Compare the two carrier arrows." }
```

`id` is an allow-listed move name. This is the same list a future `/api/tutor` route is
allowed to return instead of prose (`ask-mechanism`, `ask-carrier`, `ask-dark`, and so on).

`when` is one of `empty`, `thin`, `partial`, `always`.

Rules for a move:

- It asks a question or sets a task. It never states the target explanation.
- It never reveals the answer the next panel is about to show.
- It is a complete sentence a student can act on without the guide explaining itself.

## 5. What the guide does now, and what it will do

Now: `pickMove` scores the response with `evaluate()` and returns one authored move. No
network. The bank works with the key removed, which the plan requires.

Later: `/api/tutor` receives `{ beatId, text }` and returns one move id from this bank. The
route validates `beatId` against the tale, caps both fields, and returns no prose.

## 6. Storage: `bio_tale`

One key, one object, on the device only. Never `bio_progress`.

```ts
{
  taleId, version, startedAt, updatedAt, currentBeat,
  commits: [{ id, beatId, kind, text, at, strength, matched, nudges }],
  parked:  [{ id, beatId, text, at }],
  nudges:  { [beatId]: number },
  beatStartedAt: { [beatId]: ISO string },
  evidence: [{ standard, band, beatId, at }]
}
```

Rules:

- A commit is written only when the student submits. Returning to a beat restores their text.
- `nudges` counts how many times the guide asked again on that beat.
- `evidence` is provisional and scored on the device from the writing. It is not a grade.

## 7. Pacing rules the player enforces

Taken from the technical plan, "Tale runtime rules".

| Rule | Where it lives |
| --- | --- |
| A sitting has a ceiling | `tale.budgetMinutes`, shown in the header |
| A beat has a ceiling | `beat.minutes` |
| Close enough moves on | `evaluate()` on submit |
| Two nudges then move | `pickMove()` returns `move-on` at `nudges >= 2` |
| Moving on is recorded as unfinished | the student sees the `Move on without writing` button |
| Over time, say so | the header clock turns amber and the beat shows a note |
| Recall before re-reading | the `recall` beat hides the earlier model until an answer exists |
| Session exit is a snapshot | the last beat commits a `snapshot` |

Stall signals the player can see: the same text twice (`Evaluation.repeated`), an empty
revision, and the nudge count. Looping chat is not possible yet because there is no chat.

## 8. Simulations

The player embeds the reader's own page: `<reader>/embed.html?sim=<key>&theme=<theme>`.
The height comes from the `bio-embed-size` message the reader already sends.

Three rules:

- Never copy a simulator into the player.
- Never re-implement a simulator.
- If a sim cannot load, say so. Do not substitute a written description of it.

## 9. What a step pulls, and what it leaves behind

The reader writes for the whole chapter. A step is 35 minutes and one idea, so it asks
for less than the whole section.

`ReaderBlock` names the reader's own components: `prompts`, `key`, `note`, `example`,
`misconception`, `check`, `figure`, `table`, `details`.

- `prompts` (`callout-try`) and `check` (`details.check-q`) are always removed. A unit's
  focus-question list written to be answered at the end of the unit does not belong in
  step one of a tale, and a quick check that marks itself without the reader's script is
  a dead control.
- A beat adds `omit` for anything else it does not need. The transfer step omits the
  carbon-cycle table because the tale asks for the explanation, not the numbers.

The rule is: pull the reading the step needs, never the whole page. If a step looks
crowded, the fix is a narrower pull or a smaller `omit` list, not longer prose.

## 10. When an answer is thin, bring content

A nudge that only says "write more" teaches nothing. When an answer is thin, the step shows
the part of the reading that closes the gap the answer exposed, then asks a narrower
question. That is a `Bridge`.

```ts
{
  id: "bridge-light-is-not-heat",
  triggers: ["thermal", "heat", "convert", "absorb"],
  covers: ["matter", "bond", "carbon"],
  frame: "Look for where the energy sits after the leaf has taken the light in.",
  ask: "Name the molecule a leaf builds from carbon dioxide and water...",
  concepts: ["glucose", "sugar", "bond", "chemical"],
  source: { chapter: "u2-energy-matter", section: "bonds" }
}
```

How one is chosen, in `pickBridge`:

- A phrase the student used scores 3. What they wrote is the best evidence of where they are.
- A concept they left out scores 2.
- The highest score wins. When nothing matches, the first bridge for that beat is used.

What appears: the concepts the answer already contained ("You already named: light, energy"),
then the reader section, then the question.

Rules a bridge must keep:

- `frame` says what to look for. It never states the answer, and the section it points at
  must not end with the answer either.
- `ask` is narrower than the beat prompt, and `concepts` narrows with it, so the second
  attempt is judged on the smaller question the student was actually asked.
- The bridge pulls real reader content. It is not authored explanation.
- A step with no bridge falls back to the move bank, then to the same two-nudge cap.

`/api/guide-check?beat=&text=` answers "what would the guide do with this sentence" in
development. It is the fastest way to test a bridge without typing into the player.

## 11. The tutor

One contract, three providers, chosen by `TUTOR_PROVIDER`.

| id | runs | needs | cost |
| --- | --- | --- | --- |
| `bank` | always | nothing | none |
| `ollama` | this Mac | `ollama serve`, a model | none |
| `deepseek` | HTTPS | `DEEPSEEK_API_KEY` in the server env | metered |

```ts
{ depth, strength, missing[], moveId, bridgeId }
```

Ids only. There is no field a provider could use to return prose, so a model that
ignores the prompt still cannot hand the student the explanation.

`/api/tutor`

- `GET` returns the active provider, its label and whether it is available.
- `POST { beatId, text }` returns the decision plus `provider`, `latencyMs`, `fellBack`.
- Text is capped at 1200 characters, the beat must exist in the tale, and the address is
  limited to 60 requests a minute. That ceiling is per address, not per student, because a
  class shares one.
- A provider that is unavailable, slow or malformed falls back to the bank and says so in
  `fellBack`. The step never shows an error for a model problem.
- `provider` may be overridden in the body outside production, which is how the harness
  scores providers side by side.

Policy is not delegated. After classification, `applyPolicy` withholds reading when the
answer already explains the idea, and uses the beat's own bridge for an empty answer. A
model classifies well and still over-scaffolds; that judgement belongs to the product.

### Measuring it

`fixtures.ts` holds 22 student-shaped answers with expected strength and bridge.
`npm run fixtures -- --provider bank|ollama` scores a provider on the same set.

Hard checks apply to every provider: ids must belong to the beat, `missing` must be real
concepts, and nothing prose-shaped may come back. The expectations are soft and only
compare quality.

Baseline on 2026-11-09, twenty-two fixtures:

| provider | hard failures | strength | bridge | depth | latency (median) |
| --- | --- | --- | --- | --- | --- |
| `bank` | 0 | 20/22 | 17/22 | 22/22 | 5 ms |
| `ollama` qwen3:30b-a3b | 0 | 21/22 | 19/22 | 22/22 | 2.0 s |

The model earns its place on the two quality measures and costs two seconds. That is the
comparison to re-run when DeepSeek arrives, before anything else is built on top of it.

### Adding the API key later

Nothing to rewrite:

1. `DEEPSEEK_API_KEY=...` in the server environment only.
2. `TUTOR_PROVIDER=deepseek`.
3. `npm run fixtures -- --provider deepseek` and compare against the table above.

The key is read in `deepseek.ts`, travels as an `authorization` header, is never placed in
a prompt, never logged, and is never sent to the browser. With no key the provider reports
itself unavailable and the bank answers.

## 12. Explore: one thing at a time

Explore is curiosity-led traversal, next to the guided tale. `#mode=explore` opens it.

The student never sees what is coming. There is no chapter list, no step count and no
menu of related ideas. Each screen shows:

1. one concept and its definition,
2. the reader section that teaches it, pulled inline,
3. **one** thing revealed next, with a single `Open it` and a `Not that one`.

`Not that one` swaps the reveal for a different one. It never grows into a list.

### Where the graph comes from

Nothing is written by hand and nothing calls a model. `npm run toc` reads
`assets/toc.js` and the chapter files and writes `src/data/concepts.generated.json`:

- every glossary term with its definition,
- `builtOn` (words its definition uses) and `leadsTo` (words whose definitions use it),
  derived with the same plural and exclusion rules as `assets/glossary-map.js`,
- the section that first teaches it, taken from the chapter HTML.

The reader's own word map already does this in the browser. The generated file is the same
derivation, precomputed, so the player and the book cannot disagree about what is related.

Two rules keep a term from pointing at the wrong place:

- Sections that list or check ideas (`overview`, `standards`, `targets`, `what-you-do`,
  `check`, `do-it`) are only used when no teaching section mentions the word. A word in a
  unit's learning targets has not been taught there.
- A heading that names the word beats body text, which beats a listing section.

### How the next thing is chosen

`chooseNext` scores the neighbours of the current word:

- a word this definition leads to outranks one it is built on,
- a word with a teaching section outranks one without, because a reveal should open
  content rather than a bare definition,
- words the student's own question touched outrank both.

Visited words are never offered again.

### Asking in your own words

The curiosity box routes free text to a concept. Today that is deterministic: term-name
matches weigh most, definition overlap only counts with two or more distinct words, and
when no word matches at all the question is routed to the **section** it is about and the
most central concept in that section is opened.

It is honest about missing: a question about the sky returns nothing rather than a wrong
answer. It is also the weakest part of Explore, and the clearest place for a model. The
fixtures that will measure that do not exist yet; when they do, the model competes against
this baseline rather than replacing it blind.

## 13. Reading is pulled, never linked out

A student who leaves the tale to browse the reader leaves the inquiry. So the player never
sends them there.

- `beat.readInline` is `"open"`, `"collapsed"` or absent.
- `"open"` pulls the section as soon as the step opens. `"collapsed"` offers a button.
  Absent means the step must be answered from memory, so no text is offered.
- The client fetches `/api/content?chapter=<id>&section=<id>`. The route reads the reader
  page on the server, so no CORS, and validates the chapter against `toc.js` and the
  section name against a slug pattern.
- The route extracts one `<section>`, then removes scripts, styles, frames, simulator hosts,
  form furniture and `data-why` answers that the reader would otherwise reveal with script.
  Relative `src` and `href` are rewritten to the reader origin.
- The grid of Unit 2 chapters is context only. It has no links.

Adding a new chapter to a tale does not add a copy of its text here. It adds a pointer.

## 14. Branding and accessibility

The tale is the same product as the reader, so it borrows rather than redraws.

| Feature | Source |
| --- | --- |
| Colour tokens | copied from `assets/course.css`, same names, same values, all three themes |
| Content components | `/api/reader-css` serves `course.css` scoped to `.st-reader` |
| Theme | `bio_theme` |
| Typeface: Sans, Serif, Dyslexic | `bio_font`, OpenDyslexic served from the reader origin |
| Text size, 75 to 150 per cent | `bio_fontScale` |
| Focus mode | `bio_focus` |
| Listen | device speech, the same mechanism the reader uses |
| Skip link, reduced motion | first focusable element, `prefers-reduced-motion` |

`/api/reader-css` drops the reader's chrome rules, drops the token blocks (the player
declares the same tokens), rewrites `[data-theme]` rules to the player's root, and points
`url()` at the reader origin. One styleguide, not a second copy that drifts.

Not yet: Translate. The reader sends sentences to the on-device translator; the tale does
not, so a translated step is a gap to close, not a claim to make.

## 15. Course progress

The reader stores progress as `bio_progress`, keyed chapter then section, for sections that
opt in with `data-track`.

When a student records an answer on a step whose reader section is tracked, the tale marks
that section in `bio_progress` in the reader's own shape. The reader then shows the tick,
and the tale's chapter map shows `n/total done`.

This is a deliberate reading of "do not overload `bio_progress`": tale state stays in
`bio_tale`, and only the reader's own section ticks are written to the reader's own store.
Nothing else is added to it. If that is the wrong call, the switch is one function in
`src/lib/prefs.ts`.

## 16. Not in this build

- No LLM call, no key, no `/api/tutor`.
- No accounts, no server storage, no analytics.
- No standards inference beyond the local word check, and no claim that a band is a grade.
- No deployment. Both servers are local.

## 17. Reader base URL

`NEXT_PUBLIC_READER_BASE`, default `http://localhost:4321`.

While developing, serve the reader at the repository root:

```bash
cd ScrollyTale/app
npm run reader   # python3 -m http.server 4321 --directory ../..
npm run dev      # next dev on :3000
```

A public address is safe in the client bundle. A key is not, and never will be.
