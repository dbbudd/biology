# ScrollyTale Knowledge Vision

Status: documented from conversation, not yet built
Date: 2026-11-09
Supersedes the direction in `ScrollyTale/docs/VISION.md` for the next prototype only. That file still describes the live Unit 2 inquiry app ("The Sealed Garden"). This note does not replace it, and it does not authorize changing the live reader or the live app.

## What this is

A standalone visual layer over the Biology Reader. The reader stays the source of truth for chapters, glossary, standards, and assessment. The tale visualizes how those ideas assemble.

The student does not walk unit by unit. They start with one particle and build a connected model. Curiosity is the navigation: each concept should raise the next question, and a concept stays locked until its prerequisites are understood.

This is not XP for scrolling. Progress means understanding.

## What already exists, and what this does not touch

The live app at `ScrollyTale/app` is a Next.js shell around the Unit 2 tale. Its contract stays:

- Theme comes from `localStorage["bio_theme"]` (`light` | `sepia` | `dark`). The tale may add `localStorage["bio_tale"]`. It never writes the reader theme.
- Embed contract stays `?chrome=0&theme=<light|sepia|dark>&v=<READER_ASSET_V>`.
- Asset version stays in lockstep: HTML `?v=`, `assets/course.js::ASSET_V`, `src/lib/reader.ts::READER_ASSET_V`. Last known value: 335.
- Reader changes, if any are ever needed, are additive.

The shell rebuild (Toolbar, SiteMenu, DepthPanel, ReadingBar) is a separate, smaller job. See `UI-REBUILD-PLAN.md`. It modernizes the existing app. It does not build this experience.

## The journey

One scroll value, 0 to 1, drives the whole piece. The midpoint is a turn, not a new chapter. The same structures replay. The meaning changes.

### Descent — dust to cell

| Act | What the student sees | The question it should raise | Reader chapters that teach it |
|---|---|---|---|
| 1. One particle | A single molecule. Brownian motion. No structure. | What is it made of? | 1.8 The Molecules of Life |
| 2. Building blocks | Water, carbon dioxide, amino acids, sugars, nucleotides, fatty acids. Clustering. | Why do some of these join, and others do not? | 1.8; 2.1 Energy, Matter and the Bonds Between |
| 3. Macromolecules | Chains fold: protein, lipid, DNA. | Why does shape decide what a molecule can do? | 1.3 Digestion; 1.8; 5.1 DNA Structure |
| 4. A boundary | Lipids self-assemble into a bilayer, then a vesicle. | Why can water cross and other things cannot? | 1.1 The Cell Membrane; 1.4 Surface Area and Water |
| 5. Specialization | Ribosome, membrane system, mitochondrion, nucleus. Not the nucleus first. | How does one bag of molecules do more than one job? | 1.2 What Is Alive; 2.2 Inside a Leaf; 2.5 The Fate of Glucose |
| 6. A cell | One organized system. This is the turn. | If this is alive, what keeps it that way — and what happens when it stops? | 1.2; 1.6 Homeostasis; 4.1 Copying a Cell |

### The turn

About 1.8 seconds. Palette, motion, and narration change together. The cell is still the cell. The story is now about taking it apart.

### Ascent — cell to dust

The same six acts, read backward.

| Returning act | New meaning | Where the reader already teaches it |
|---|---|---|
| Cell | A system can fail, and its parts are still matter. | 4.3 When the Brakes Fail |
| Organelles | Specialized parts are recycled, not lost. | 2.5 The Fate of Glucose |
| Macromolecules | Polymers break into the monomers they were built from. | 1.3 Digestion |
| Boundary | A membrane that no longer holds still leaks what it held. | 1.1 |
| Building blocks | Monomers return to the pool. | 2.8 Matter Cycles: Carbon |
| One particle | The same atoms. Matter was reorganized, not created. | 2.8; 3.5 When Conditions Change |

## How ideas thread, instead of sitting in units

The course table of contents is a chain (`assets/toc.js`: each unit `needs` the one before it). The tale should not copy that chain. A few threads cross it:

- Carbon: 1.8 molecule → 2.3 photosynthesis → 2.5 respiration → 2.7 food webs → 2.8 carbon cycle → 3.4 food webs → 6.5 environmental change.
- Water: 1.1 membrane → 1.4 why cells are small → 1.6 homeostasis → 3.2 what limits a population.
- Information: 5.1 DNA → 5.2 DNA to protein → 4.4 same DNA, different cell → 5.3 mutation → 5.4 inheritance → 6.2 natural selection.

A node the student met early should be recognizable when it returns. That is the palindrome: the same object, a deeper reading.

## Unlock rules

- A node is visible as a silhouette before it is open. The student can preview it. They cannot explore it.
- A node opens when its prerequisites are understood, not when a scroll position is reached.
- The signal is reader progress and earlier discoveries. Scrolling the tale does not grant credit.
- No scores, no XP, no streak.

The exact signal is not decided. Candidates, in order of how little they invent: tracked sections already counted in the reader, "I can" statements on the unit overview, and sentences the student has already written (the live app's `/api/focus` bands). Do not add a new assessment just to feed the tale.

## Where this runs

A separate static project, deployed on its own (Vercel is the working assumption). The reader is not bundled into it.

- Vite, no framework.
- Three.js `Points` with a shader. One particle buffer, morphed by the scroll value.
- Canvas 2D for labels and the learn card.
- GSAP ScrollTrigger plus Lenis for the scroll. Both switch off under reduced motion.
- Web Audio, muted until the student turns it on.

Budget: about 30–45k particles on a desktop, about 12k on a low-end device, device pixel ratio capped at 2.

Every act has a text equivalent. Nothing a student needs to learn may exist only in the animation.

## Accessibility, from the first build

- Reduced motion: no smooth scroll, no particle flutter, narrative still advances.
- Keyboard: act to act, and into the learn card.
- Visible focus, from the reader's focus-ring token.
- A live region speaks the act narration.
- Pause and play for motion.
- A non-WebGL fallback that is still the full story.

## Decisions already made

- Start from one molecule, not from a chapter menu.
- The reader repository is the only curriculum. The tale does not keep a second copy of the science.
- The new experience is standalone. It does not replace `/`, `/glossary`, `/curriculum`, or `/changelog`.
- Locked until the prior idea is understood. Not locked behind time-on-page.
- The completed cell is the turn, not a finale.
- Animal cell first. A plant-cell toggle is later.
- Themes stay `light`, `sepia`, `dark`, read from `bio_theme`.

## Not decided

1. The content contract: how a tale build reads `assets/toc.js` and chapter files without copying them. A generated manifest checked into the tale is the smallest option. A fetch from the reader host is the other. Pick before any scene is authored.
2. Which reader signal unlocks a node. See Unlock rules.
3. When the plant-cell toggle appears. Not in the first six acts.
4. Screenshot workflow for the forward and return journey. Needed before calling a prototype done.
5. Whether Unit 2's sealed garden remains the first tale a student meets, with this journey beside it, or whether this journey replaces that entry. The live Unit 2 tale is not deleted either way.

## Build order, when implementation starts

1. Agree the content contract (open question 1). No scene work before that.
2. A static prototype with the six descent acts and the six return readings, one scroll value, text equivalents, reduced motion.
3. Link each act to the chapter ids in the table above. Links only. No forked prose.
4. Add the silhouette lock using whatever reader signal was chosen.
5. Only then consider the shell components in the live app.

## Shell rebuild, kept separate

`UI-REBUILD-PLAN.md` covers the live app chrome: Toolbar, SiteMenu, DepthPanel, ReadingBar. Constraints from `DESIGN.md` and `CLAUDE.md` apply there and here:

- CSS custom properties only. No raw hex or rgb in new rules.
- Segoe UI only. No second font.
- 4.5:1 contrast for text in light, sepia, and dark.
- Reader embed and asset version stay as they are.
