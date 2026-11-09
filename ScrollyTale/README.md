# ScrollyTale

An inquiry layer over the HKIS Biology reader. The reader keeps the content. ScrollyTale keeps
the inquiry flow: one phenomenon, a model, evidence, a revision, a recall, a transfer.

First tale: `u2-sealed-garden`, the David Latimer bottle garden, 35 minutes.

## Run it locally

Two servers, two terminals. The player points at the reader and embeds its simulations.

```bash
cd ScrollyTale/app
npm install
npm run reader   # the reader, at http://localhost:4321
npm run dev      # the player, at http://localhost:3000
```

Open `http://localhost:3000`.

`#beat=2` opens the tale at that step without touching the saved position, which is useful for
showing one beat in a demo.

## What exists

- A manifest-driven player: 7 beats, 35 minute budget, three themes.
- Real Unit 2 simulations embedded from the reader by name, never copied.
- Reader sections pulled into the step that needs them, by server route, so no link takes a
  student out of the inquiry.
- A notebook that records every model, revision, recall and transfer on the device.
- A thin answer brings content, not a scolding: the step pulls the reader section that
  closes that specific gap, then asks a narrower question and judges against it.
- An authored move bank as the fallback, then the two-nudge cap.
- Unit 2 chapter metadata generated from `assets/toc.js` (`npm run toc`).
- The reader's toolbar, in the tale: theme, typeface, text size, focus, Listen, skip link,
  reduced motion. It reads the same `bio_*` preference keys as the reader.
- The reader's content styles, served scoped by `/api/reader-css`, so callouts and figures
  look like the book without a second stylesheet.
- Course progress: a tracked section is ticked in `bio_progress` when the student works it,
  so the reader and the tale agree.

## Explore

The interface. A session opens on the unit's phenomenon: the sealed bottle from 1960, with the
question of what keeps the plant alive inside it. One box takes any thought the student has
about it. No chapter list, no step count, no menu of what is coming, and no minimum length on
what they write.

Their first written thought sets which idea the session holds. The router is restricted to the
phenomenon's own concept list rather than all 297 glossary terms, because that is the vocabulary
the unit was written in: of `light`, `energy`, `matter`, `carbon`, `water`, `air`, `cycle`,
`recycl`, `photosynthesis`, `respiration`, `atom`, `oxygen` and `heat`, only `Energy` and
`Matter` are glossary terms, and both teach the same section, "Energy and matter, into and out
of a body". The answer sets the label, the strand suggested next and the words the tutor uses,
not which passage comes first. An unrestricted router was measured sending "the sun shines in
and the plant grows" to `Cell`; a door the author did not choose is worse than no door.

The case study stays available in a collapsed `The bottle` panel after that first answer.

The seven authored beats are no longer a menu. Their moves are what the tutor says when the
student stalls, so the teaching arc survives without being a second interface.

Three starter chips above the box fill in a sentence, so a student who does not know how to
begin still has somewhere to put the first word. They fill the box and stop: the student
sends.

### Focus

One click opens a side panel with two things: the concepts the student has actually opened,
and the unit's Learning Targets with the band they have reached. It is not the course
outline. It shows what is already theirs, plus the one edge they are closest to.

Targets are extracted from each chapter's learning-targets block by `npm run targets`, the
same rule as `npm run toc`: the reader stays the source of truth. Bands reuse `bandFor` from
`src/lib/pacing.ts`. Depth cannot be reached from one sentence: a target needs at least two
touching messages, and the same sentence sent twice counts once.

The panel unmounts when Focus is off rather than hiding, so it only queries when a student
asks for it.

Movement through the lesson is not left to the model. `src/lib/tutor/guard.ts` answers the
messages that can be judged by rule, before any provider is chosen, so they cost no network
call:

| Message | Decision |
| --- | --- |
| empty, or punctuation only | `stay` |
| `ok`, `yes`, `yeah ok`, `hmm`, `idk` | `stay` |
| the concept already on screen | `stay` |
| only the name of another glossary term | `switch` to it |
| anything else | the provider decides |

`stay` holds the position and asks for something more specific. A message that merely
contains a glossary word is not a request to leave the concept: "energy is released" reaches
the model, while "energy" alone switches. A false negative costs nothing; an unwanted jump
costs the student their thread.

The same rule applies after the model answers. A `switch` to a term the glossary does not
hold, or to the concept already open, is coerced to `stay` rather than reloading the page.

```bash
npm run toc     # rebuilds the concept graph from assets/toc.js and chapters/
```

Open it at `http://localhost:3000`.

There is one interface. `#mode=guided` still opens the old step-by-step view for comparison, and
a quiet `Back to Explore` link returns from it.

## The tutor

Three providers behind one contract, chosen by `TUTOR_PROVIDER`:

- `bank` — authored, deterministic, no dependency. The default and the floor.
- `ollama` — a local model. Set `TUTOR_PROVIDER=ollama` and `TUTOR_MODEL`, then `ollama serve`.
- `deepseek` — the hosted API. Needs `DEEPSEEK_API_KEY` in the server environment.

All three return ids only, never prose, so none can return the explanation the step is
holding back. Any failure falls back to the bank.

```bash
npm run fixtures -- --provider bank
npm run fixtures -- --provider ollama
```

## What does not exist yet

- No hosted model in use. The DeepSeek adapter is written and inert without a key.
- No accounts and no server storage. Everything is on one device.
- No deployment. Nothing is published.

## Layout

```
app/src/data/tales/   the Unit 2 manifest
app/src/data/toc.u2.generated.ts   generated from assets/toc.js
app/src/lib/          types, pacing, notebook, reader links
app/src/components/   workspace, sim frame, notebook, guide, reader trail
docs/                 architecture, standards model, tale contract
scripts/extract-toc.mjs           reader metadata, at build time
```

Read `docs/TALE-CONTRACT.md` before changing the manifest, the storage shape or the guide.
