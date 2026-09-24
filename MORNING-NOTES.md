# Where the 3D body atlas got to

Last touched: 23 Sep, `ASSET_V = 323`. Everything below is live and verified.

## What exists

**Geometry** — `models/systems.bin` + `.json`: 28 organs across 6 systems, all
quantised into ONE shared bounding box so they sit in true anatomical register.
294 KB gzipped, loaded on demand. `models/digestive.{bin,json}` is the smaller
7-organ file that chapter 1.3 uses on its own (102 KB).

Built from BodyParts3D 4.0 (CC BY 4.0) with the scratch pipeline described
below, plus three female organs from the Human Reference Atlas (CC BY 4.0).
Attribution appears on every page that draws each, as the licences require.

**Viewer** — `sims/_organ3d.js`. `ORGAN3D.create({stage, model, parts, onPick,
aspect})` returns a view with `select`, `show`, `frameVisible`, `resetView`.
Also `ORGAN3D.crossLinks(organId, {root})` and `ORGAN3D.indexLink(root)`.

**Map** — `assets/body-map.js`: one source for organ colours and for where the
course teaches each organ. Consumed by the Body Index and by both chapter sims.

**Where it appears**
- 1.3 Digestion — `sims/u1-digestive-3d.js`, "The tract in three dimensions"
- 1.5 No System Works Alone — `sims/u1-systems-3d.js`, "One body, five systems"
- `reference/body.html` — the Body Index, linked in every sidebar
- 4.7 The Two Systems That Build Gametes — `sims/u4-repro-3d.js`, "The two systems, in place"
  (end of the anatomy section; Female / Male switch shared with the Body Index)

  One place only, on purpose. Versions for 4.5 (where meiosis happens), 4.6 (where
  variation is made) and 4.8 (the HPG axis across the whole body) were built and then
  removed on 23 Sep: four near-identical models in a row was too much, and 4.5/4.6 treat
  *where* as a black box until 4.7 on purpose. 4.7 is where the organs are taught.
## Female and male reproductive organs (23 Sep)

The Body Index has a **Female / Male switch** on its Reproductive group. It
swaps only the reproductive organs; every other organ is shared. The choice is
remembered per browser (`bio_body_sex`), and the default is Female.

- **Male set** — testes, epididymis, seminal vesicles, prostate, urethra, from
  BodyParts3D 4.0 (a male adult reference with no female organs at all).
- **Female set** — ovaries, oviducts, uterus (with the cervix), from the Human
  Reference Atlas 3D Reference Organs (HuBMAP; Visible Human female; CC BY 4.0):
  `uterus-female` v1.2, `fallopian-tube-female-left/right` v1.2,
  `ovary-female-left/right` v1.3, from `cdn.humanatlas.io`.

**How they were placed.** The HRA files are metres, Y-up, +Z anterior; BodyParts3D
is millimetres, Z-up, -Y anterior. Both have +X on the body's left and both are
real-scale, so the mapping is a rotation plus a translation with no scaling. The
translation puts the HRA female bladder's centre on the BodyParts3D bladder's
centre (the two bladders are close in size). The uterus then sits on the back of
the bladder dome with the ovaries either side, which is where it belongs. It is
still a female pelvis's organs inside a male body: good enough for an index, not
for measuring anything.

**Not in the model:** the vagina (only the cervicovaginal junction is), the
female urethra, and the vas deferens. The uterus and urethra entries say so.

**Links:** ovary and uterus → 4.7 anatomy and 4.8 "The ovarian and menstrual
cycles"; oviduct → 4.7 anatomy and "What happens when they meet".

**Rebuilding** — `scripts/female-organs/`. Put the six GLBs (the five above plus
`urinary-bladder-female` v1.2, used only for alignment) in a folder, restore the
male-only `systems.bin/json` (the first 428,622 bytes of the current `.bin` are
exactly that file; the manifest's first 25 parts), then:

    HRA_DIR=/path/to/glbs node scripts/female-organs/build-female.js /tmp/out

and copy `/tmp/out/systems.*` into `models/`. The script appends the new parts
after the existing bytes and quantises them into the existing shared box, so
nothing already built moves. Each file is simplified on its own: simplifying
both oviducts together made the grid too coarse for their width and broke them
into beads.

## Rebuilding the geometry

The scratch pipeline is in this session's scratchpad, not in the repo:
`build-systems.js`, `organs.list`, `elements-merged.txt`. It wants the two
BodyParts3D archives (`partof_BP3D_4.0_obj_99.zip`, 62 MB, and
`isa_BP3D_4.0_obj_99.zip`, 136 MB) from
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

`elements-merged.txt` prefers the partof tree and falls back to isa, which is
how the male structures got in without disturbing anything already built. The
two archives were verified to share a coordinate space first: the prostate has
the same mesh id, vertex count and bounding box in both.

If you want this reproducible, move those three files into `scripts/`. I left
them out because they are useless without the 200 MB of source archives.

## Checks to run after any change here

From the project root:

    ./scripts/check

Or from anywhere:

    "/Users/dbudd/Documents/GitHub/biology/scripts/check"

Verifies every destination resolves to a real chapter AND a real `<section id>`,
and that the model and the map agree on which organs exist. Currently: 28
organs, 36 destinations, all resolve.

`scripts/check` is a shell wrapper that finds node itself. The terminal pane's
shell does not source `~/.zshrc`, which is where nvm lives, so a bare `node`
fails there — and a login shell (`zsh -lc`) does not fix it, because zsh only
reads `.zshrc` when interactive. The wrapper sidesteps the whole question.
`scripts/check-body-map.js` is still the actual check if you have node on PATH.
