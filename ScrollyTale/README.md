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

Curiosity-led traversal beside the guided tale. Opens with the one idea a concept rests on,
then one written block at a time with a question between each. No chapter list, no step
count, no menu of what is coming.

```bash
npm run toc     # rebuilds the concept graph from assets/toc.js and chapters/
```

Open it at `http://localhost:3000/#mode=explore`.

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
