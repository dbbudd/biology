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

## 12. Explore: the whole interface

Explore is the interface, not a surface beside one. A session opens on the unit's phenomenon,
and the guided tale is no longer a second mode a student chooses.

There is **one** input. It takes a guess, a question, a half-thought or a complaint. It is the
response box and the curiosity box at the same time, because for a student they are the same
act. Nothing demands a complete answer and nothing enforces a minimum length.

What happens after they write:

1. `/api/thread` reads the message against the concept on screen and returns one decision:
   `next` (show the next piece), `simpler` (go back a level), `switch` (they asked about a
   different idea, with its term), `stay` (hold position and ask for something more specific,
   revealing nothing), or `none`.
2. The reader content is revealed **in the order it is discovered**. A section is never shown
   whole: each piece appears when the student has earned it, and stays on screen above the
   box, so the page grows into the content they have uncovered.
3. The reply is one short sentence. It never states the explanation and never praises. The
   model may answer a substantive guess with a question instead of new content, which is
   often the better move.

### Opening on the phenomenon

The phenomenon is fetched, not retyped. Explore reads the beat-0 `source` section through
`/api/content?chapter=u2-overview&section=anchor&blocks=1&omit=…` and prints the driving
question as the page headline above it. A failed fetch falls back to the phenomenon paragraph
in the tale, so the case is never missing.

Only the **story** is shown before the first answer: the first two text blocks. The section
also carries a summary figure whose caption states the answer outright ("the glass is a wall
to matter and a window to energy"), and whose labels name the same conclusion. A student is
being asked what they think before any of that is taught, so the figure would answer the
question they have not been asked yet. It sits one click away in the closed `The bottle`
panel once they have answered. The beat's `helper` is withheld for the same reason: it ends
by stating the answer. The opening asks only "Write what you think now. You will change it
later."

The first answer calls `/api/ladder?q=<their words>&candidates=<the phenomenon's concepts>`.
`routeWithin` scores only that candidate list, never the whole glossary, because the door is one
the author chose. Of the phenomenon's thirteen words, exactly two — `Energy` and `Matter` — are
glossary nodes; the other eleven have none.

A single word of definition overlap counts, so "water and air get recycled inside the bottle"
opens `Matter` on the strength of `air` alone. An answer that overlaps neither definition
opens `Energy`, the first candidate with teaching content, rather than inventing an inference
the glossary cannot support.

Both of those terms teach the same reader section, `u1-molecules` / `energy`, headed "Energy and
matter, into and out of a body". So the first answer does not choose what the student reads
first. It sets the idea the session is holding: the concept label, the strand offered next
(`Anabolic` under `Energy`, `Biosphere` under `Matter`), and the vocabulary the guard and the
tutor use afterwards. The reading they get is the one that separates the two ideas, which is a
fair landing place after a first thought like "the soil feeds it".

Scoring puts the concept's name above definition overlap, and one word of overlap is enough, so
"water and air get recycled" opens `Matter`. An answer that matches nothing opens the first
strand with teaching content, which is `Energy` — the fallback for "the soil feeds it". The
restriction is still the point: unrestricted routing was measured sending "the sun shines in and
the plant grows" to `Cell`, because a generic biology word outscored the idea the unit means to
open first.

### How the decision is made

Moving through the lesson is a product rule, not a judgement to hand to a model. `guard.ts`
runs first, before a provider is even chosen, so a message the rules can judge costs no
network call:

| Message | Decision |
| --- | --- |
| empty, or no letters at all | `stay` |
| a bare acknowledgement: `ok`, `yes`, `yeah ok`, `got it`, `hmm`, `idk` | `stay` |
| the name of the concept already on screen, and nothing else | `stay` |
| an explicit question naming a glossary term, or only that term's name | `switch` |
| anything else | the provider decides |

A message that merely *contains* a glossary word is not a switch. "energy is released" is a
thought about the concept in front of the student, so it reaches the model; "energy" alone
switches. The rule only fires when the term accounts for every content word, which trades a
false negative for the absence of a false positive. An unwanted jump costs the student the
thread they were following.

The same policy applies to what comes back. `coerceConcept` turns a `switch` to a term the
glossary does not hold — or to the concept already open — into `stay`, so a bad model reply
cannot reload the page under the student and erase the conversation.

`stay` exists because an acknowledgement is not evidence. Before it, `ok` returned `next` and
advanced the lesson on a non-answer.

### The arc without a menu

The seven authored beats are no longer a sequence a student walks. Their moves are what the tutor
says when the student stalls, so the teaching arc survives without being a second interface.

The drop point is a checkpoint into that arc:

```
checkpoint = min(distinct concepts visited - 1, beats - 1)   # floored at 0
```

A `stay` or `none` reply draws its line from that beat's `moves`: the `empty` move when nothing
was written, then the `thin` move, then the first usable one. A student who has opened two
strands is nudged the way step 3 would have nudged them.

Those moves were written for the guided steps, and two assume that step's own widget is on the
page: the tracker move on beat 1 ("Complete one row first, then answer.") and the arrows move on
beat 2 ("Name the four arrows before you answer."). `Move` carries `needsWidget?: boolean` for
exactly those two, and Explore skips any move that sets it, because one box has no table or
diagram to point at. A future pass should either rewrite those two moves so they stand alone or
give Explore its own move set.

### Focus: what you have uncovered

Focus opens a side panel. It shows what the student has already walked through, and one edge to
aim at. It never shows the course outline.

The panel is mounted only while `prefs.focus` is true, and it unmounts rather than hides: a
hidden panel would still query, and depth numbers should appear because the student asked for
them.

What it reads:

- Explore mirrors the `student` lines and the concepts visited into `src/lib/uncovered.ts`
  (`localStorage` key `bio_uncovered`, last 40 messages and 40 terms). The guide's replies and
  the reader text are not the student's to claim, so they are not mirrored.
- The panel POSTs those messages to `/api/focus` and renders the reply.
- Targets come from `src/data/targets.generated.json`, written by `npm run targets` from the
  `data-at` anchors in each chapter's learning-targets block. The reader stays the source of
  truth, the same rule as `npm run toc`. 78 targets in 21 groups across 6 units; Unit 2 has 11
  in 3 groups.
- Bands are `bandFor(strength, nudges)` from `src/lib/pacing.ts`. That is the existing model, not
  a new scale. A target is touched when a message contains one of its vocabulary words: the
  `terms` of the sections it anchors to, plus the content words of the target itself.

Two rules keep it honest. Depth is not reachable from one sentence: a target needs at least two
touching messages before it can read Exhibiting with Depth, because one sentence can name both of
a target's words and naming both words is not depth. And the same sentence sent twice counts
once, so pressing send again cannot manufacture progress.

The panel surfaces one edge, not a checklist. Targets not yet started sit behind a collapsed
summary, so a student meets their own progress first.

### Starting simple

Every concept has `builtOn` words. When one opens, the first line names the most connected
idea underneath it, and `Go back to <term>` is always available under the box. If a student
says they are lost at the first piece, the ladder descends to that idea rather than
repeating.

### Where it comes from

`npm run toc` writes `src/data/concepts.generated.json` from `assets/toc.js` and the chapter
files: every glossary term, its `builtOn` and `leadsTo` edges (same plural and exclusion rules
as `assets/glossary-map.js`), and the section that first teaches it.

`/api/ladder?term=` returns the concept, its prerequisite, that section split into ordered
blocks, and one next concept. `splitBlocks` in `extract.ts` walks top-level elements, so a
callout or figure is never cut in half.

### Providers

The same three as the tutor: `bank`, `ollama`, `deepseek`. The bank fallback judges by length
and presence of a topic change; the model judges level and picks the move. Whether a model is
worth its two seconds here is not yet measured — that is the next fixture set.

### Known gaps

- A `switch` reply may still define the new term before the ladder opens it. The guard's own
  bridge does not ("That is a different idea. Moving to Enzyme."), but a model-issued one can.
- `simpler` can produce a sentence that explains rather than points, which breaks the
  no-answer rule. The prompt forbids it; the model does not always comply.
- The guard is glossary-gated, so a student who asks about an idea the glossary lacks is not
  switched. `Photosynthesis` is one such term: it has no entry in
  `src/data/concepts.generated.json`, so `what is photosynthesis` reaches the model and any
  `switch` to it would be coerced back to `stay`. That is a data gap in `assets/toc.js`, not a
  guard bug.
- The phenomenon's authored vocabulary and the glossary disagree. Of `light`, `energy`, `matter`,
  `carbon`, `water`, `air`, `cycle`, `recycl`, `photosynthesis`, `respiration`, `atom`, `oxygen`
  and `heat`, only `Energy` and `Matter` are glossary terms, so a student cannot be routed to
  photosynthesis, carbon, water, oxygen, atom or heat. Those two also teach the same section, so
  the authored two-strand vocabulary still yields one reading. That is a data gap in
  `assets/toc.js`.
- The checkpoint advances on distinct concepts visited. That is a heuristic about the shape of
  the conversation, not a measurement of understanding: a student can visit three terms and
  explain none of them.
- Nothing measures these yet. They belong in the fixture harness alongside the tutor.
- Explore announces guide replies through a polite live region, but newly revealed content
  blocks are not announced.
- The Focus band is a heuristic over the student's vocabulary and the model's strength
  judgement. It cannot see understanding. A student can use every word of a target and explain
  nothing, and the panel would overstate them. The two guards above make overstatement harder,
  not impossible.
- `/api/focus` does not verify that the reported messages came from the same session, because
  this build has no session identity. A caller can post any messages it likes.
- A second tab that mounts Explore with no thread overwrites the shared store, briefly blanking
  the first tab's panel until its next write. `reset` does not clear `bio_uncovered`.
- The authored step-1 figure gives away the answer the step asks for. Its caption states that
  the glass is a wall to matter and a window to energy, and the diagram labels the same
  conclusion. Explore now withholds it until the student has answered, and withholds the beat's
  `helper` for the same reason. The guided path still renders both at step 1, so the same
  giveaway is unaddressed there, and the fix belongs in the content, not in the player.


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
