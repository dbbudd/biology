# Natural voices for Listen

Everything the reader's **Natural** voices need, hosted on this site. Nothing
here calls an outside service: there is no account, API key or subscription,
so there is nothing that can lapse or be switched off. A student's browser
downloads the voice from this folder once, keeps it, and then speaks the
page's live text on the student's own device.

The code that uses these files is `assets/listen-voice.js` (page side) and
`assets/listen-voice-worker.js` (background worker). The switch between
Natural and Device voices, the voice list, and the SharePoint notes are at the
top of the Listen section in `assets/course.js` — search for `const LISTEN`.

## What is in here

| File | What it is | Size |
|---|---|---|
| `voices/en_US-ljspeech-medium.onnx` (+ `.json`) | US English voice | 63 MB |
| `voices/en_GB-cori-medium.onnx` (+ `.json`) | British English voice | 63 MB |
| `ort.wasm.min.js`, `ort-wasm-simd.wasm` | ONNX Runtime Web 1.18.0 — runs the voice network | 10.7 MB |
| `ort-wasm.wasm` | the same, for old browsers without WebAssembly SIMD | 9.8 MB |
| `piper_phonemize.js` / `.wasm` / `.data` | espeak-ng, turns text into phonemes | 1.7 MB |

A student downloads **one** voice plus the runtime — about 75 MB the first
time, then nothing. The second voice is only fetched if they choose it.

`piper_phonemize.data` has been cut down to **English only** (0.9 MB instead of
17.2 MB). The other 113 files were other languages' pronunciation dictionaries.
The trimmed pack was checked against the original and produces identical
phonemes. If a non-English voice is ever added, restore the full pack from
`@diffusionstudio/piper-wasm@1.0.0` on npm.

## Uploading to GitHub

The two voice files are **63 MB each**. GitHub accepts files up to 100 MB
through `git` or GitHub Desktop (it warns above 50 MB, which is fine), but the
**drag-and-drop uploader on github.com rejects anything over 25 MB**. Push
these with git or GitHub Desktop, not the website.

## Licences

**Voices — why these two.** Most English Piper voices are fine-tuned from the
"lessac" voice, whose recordings are under a *research-only* licence from
Lessac Technologies. These two are not: both were trained from scratch on
public-domain recordings. See each voice's `MODEL_CARD.md`.

- `en_US-ljspeech-medium` — LJ Speech dataset, **public domain**
- `en_GB-cori-medium` — **public domain**

**Software**

- ONNX Runtime Web 1.18.0 — © Microsoft Corporation, **MIT licence**
  (stated in the header of `ort.wasm.min.js`).
- `@diffusionstudio/piper-wasm` 1.0.0 — the WebAssembly build of piper-phonemize,
  **MIT licence**.
- espeak-ng, compiled inside `piper_phonemize.wasm` and `.data` — **GNU GPL v3**,
  full text in `LICENSE-espeak-ng-GPL-3.0.txt`. Source:
  https://github.com/espeak-ng/espeak-ng

## Changing a voice

1. Download the voice's `.onnx` and `.onnx.json` from
   https://huggingface.co/rhasspy/piper-voices into `voices/`.
2. Check its `MODEL_CARD`: prefer "trained from scratch" and a public-domain,
   CC0 or CC BY dataset. Avoid anything fine-tuned from lessac.
3. Edit the `voices` list in `const LISTEN` in `assets/course.js`.
4. If a voice file itself is replaced under the same name, bump `CACHE` in
   `assets/listen-voice-worker.js`, or students keep the cached old one.
