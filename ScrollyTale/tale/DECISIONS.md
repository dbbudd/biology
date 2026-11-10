# What is a molecule? — decisions for this prototype

Date: 2026-11-09

This folder is a standalone prototype. It does not replace `ScrollyTale/app` or the Biology Reader.

## What was built

- One page. It opens on a single pulsing particle and a centered question, "What is a molecule?"
- Pressing Begin bursts that particle into the next idea. Six steps, each linked to a reader chapter. The card text is shortened from that chapter's own lead, not a second textbook.
- The field is a WebGL point cloud with additive blending, in the manner of Palindrome of a Fall's particle engine. It is original code. None of that project's artwork, shaders, or text is copied.
- If WebGL is missing, the question and the reader links are the whole experience.
- Pause motion, keyboard left/right between ideas once the inquiry has started, and light / sepia / dark. Theme is read from `bio_tale`, then `bio_theme`, and only `bio_tale` is written.

## What was deliberately left out

- No GSAP, Lenis, or Vite. A first prototype that needs an install is harder to open and harder to judge.
- No unlock gate. The vision says nodes open from reader understanding, and the signal is not chosen yet. A lock before that choice would be fake progress.
- No full chapter prose. Each card carries a shortened lead and a link to `../../chapters/<id>.html`.
- No audio. Silence until a student asks for sound.
- The live app shell was not changed.
- A typed question that is not one of the six prompts does not yet search the reader. It still starts the journey. That search is the next piece of work.

## Design choices

- One focal object: the particle, dead center, behind the question.
- The page ground is near-black so the additive particles read. The question box and the answer card stay light, with navy text, so the words clear 4.5:1. Gold is only the particle core and the focus ring, never text.
- Segoe UI only.
- Reduced motion starts paused. The student can turn motion back on.

## How to open it

From the biology repo root:

```
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/ScrollyTale/tale/`.

Chapter links resolve when the tale is served from the repo. They will 404 if this folder is deployed alone.

## Still open

1. How a deployed tale reads reader chapters without copying them.
2. Which reader signal unlocks an idea.
3. How a free-typed question finds the right chapter instead of walking a fixed path of six.
