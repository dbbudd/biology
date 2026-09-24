/* =============================================================
   FIGURE — A human karyotype, drawn to scale
   -------------------------------------------------------------
   Registers window.SIMS['u4-karyotype'].  Supports HS-LS1-4, HS-LS3-1.

   Replaces a low-resolution karyotype graphic with a transparency
   checkerboard baked into it. Every chromosome here is drawn from
   its real length and centromere position (human reference genome
   GRCh38), so the details a student can check are true rather than
   approximate:
     - chromosome 21 is SHORTER than 22 (the numbering is historical);
     - 13, 14 and 15 have their centromere close to one end;
     - the X is roughly three times the length of the Y.

   Metaphase chromosomes are drawn as two sister chromatids joined at
   the centromere, short (p) arm up, with centromeres aligned along
   each row as in a real karyotype. In each pair, blue is the copy
   from the father's sperm and pink the copy from the mother's egg —
   matching Figure 4.20, directly above it in the chapter.

   A switch sets position 23 to XX or XY, which is why position 23
   is only ever drawn once. For XY the Y is blue (it can only have come
   from the sperm) and the X pink (it can only have come from the egg).

   BUILD MODE, which opens first: the egg's 23 chromosomes (pink) are
   already in place, and the sperm's 23 (blue, carrying a Y) sit jumbled
   in a row underneath, drawn at the same scale so lengths can be
   compared. The reader pairs each one with its partner before the
   finished karyotype and the XX/XY switch appear — commit, then see.

   Some chromosomes genuinely cannot be told apart by length and
   centromere position: 4–5, 6–12, 13–15, 19–20 and 21–22 (the classic
   cytogenetic groups), computed below from the data rather than listed.
   Confusing two of those is answered as a good match that only staining
   bands could separate, and the chromosome goes to its true pair.
   Distinguishable mistakes get a hint naming the difference: length,
   or where the centromere sits.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4ky-style';

    /* ---- the data: length and centromere position, millions of base pairs ---- */
    const CHR = {
        1: [248.96, 123.4], 2: [242.19, 93.9], 3: [198.30, 92.1], 4: [190.21, 50.7],
        5: [181.54, 48.3], 6: [170.81, 59.2], 7: [159.35, 59.5], 8: [145.14, 45.0],
        9: [138.39, 44.4], 10: [133.80, 40.6], 11: [135.09, 52.8], 12: [133.28, 36.0],
        13: [114.36, 17.0], 14: [107.04, 17.1], 15: [101.99, 18.4], 16: [90.34, 37.3],
        17: [83.26, 24.8], 18: [80.37, 18.2], 19: [58.62, 25.8], 20: [64.44, 28.2],
        21: [46.71, 11.9], 22: [50.82, 14.0], X: [156.04, 59.5], Y: [57.23, 10.4]
    };
    const ROWS = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11, 12], [13, 14, 15, 16, 17, 18], [19, 20, 21, 22, 'sex']];

    /* ---- geometry ---------------------------------------------------- */
    const VW = 720, MARGIN = 26, S = 0.6;          // px per million base pairs
    const CW = 7.4, SIS = 1.2, PAIR_GAP = 7;       // chromatid width, gap between sisters, gap between homologues
    const CHROM_W = 2 * CW + SIS, POS_W = 2 * CHROM_W + PAIR_GAP;
    const ROW_GAP = 34, LABEL_H = 22, TOP = 18;

    // p above the centromere line, q below
    const pLen = k => CHR[k][1] * S, qLen = k => (CHR[k][0] - CHR[k][1]) * S;
    const members = (pos, sex) => pos === 'sex' ? (sex === 'XY' ? ['X', 'Y'] : ['X', 'X']) : [pos, pos];
    // colour by parent of origin
    function colours(pos, sex) {
        if (pos !== 'sex') return ['b', 'p'];
        return sex === 'XY' ? ['p', 'b'] : ['b', 'p'];
    }

    function layout(sex) {
        const rows = [];
        let y = TOP;
        ROWS.forEach(row => {
            const ks = [].concat(...row.map(p => members(p, 'XY').concat(members(p, 'XX'))));
            const up = Math.max(...ks.map(pLen)), down = Math.max(...ks.map(qLen));
            const cen = y + up;
            // the sex position sits a little apart from the autosomes
            const n = row.length, extra = row.indexOf('sex') >= 0 ? 34 : 0;
            const span = VW - 2 * MARGIN - extra;
            const step = span / n;
            const items = row.map((p, i) => ({
                pos: p, x: MARGIN + step * (i + 0.5) + (p === 'sex' ? extra : 0) - POS_W / 2
            }));
            rows.push({ cen, items, labelY: cen + down + 17, up, down });
            y = cen + down + LABEL_H + ROW_GAP;
        });
        return { rows, height: y - ROW_GAP + 6 };
    }

    function chromatid(x, cen, k) {
        const p = pLen(k), q = qLen(k), r = CW / 2, pinch = 4.2;
        // p arm and q arm as rounded bars meeting at a narrowed centromere
        const top = cen - p, bot = cen + q;
        return '<rect class="ky-arm" x="' + x.toFixed(2) + '" y="' + top.toFixed(2) + '" width="' + CW + '" height="' +
                Math.max(CW, p - pinch).toFixed(2) + '" rx="' + r + '"/>' +
               '<rect class="ky-arm" x="' + x.toFixed(2) + '" y="' + (cen + pinch).toFixed(2) + '" width="' + CW + '" height="' +
                Math.max(CW, q - pinch).toFixed(2) + '" rx="' + r + '"/>';
    }
    // anon: an unsorted chromosome in build mode, whose tooltip must not name it
    function chromosome(x, cen, k, col, who, anon) {
        const len = CHR[k][0], label = anon ? 'A chromosome' : k === 'X' || k === 'Y' ? k : 'Chromosome ' + k;
        return '<g class="ky-chr ky-' + col + '" data-k="' + k + '"><title>' + label + ', from the ' + who +
            ': about ' + Math.round(len) + ' million base pairs</title>' +
            '<rect class="ky-cen" x="' + (x + CW * 0.45).toFixed(2) + '" y="' + (cen - 5.2).toFixed(2) + '" width="' +
                (CW * 1.1 + SIS).toFixed(2) + '" height="10.4" rx="3"/>' +
            chromatid(x, cen, k) + chromatid(x + CW + SIS, cen, k) + '</g>';
    }

    function svgFor(sex) {
        const L = layout(sex);
        let s = '<svg class="ky-svg" viewBox="0 0 ' + VW + ' ' + L.height.toFixed(0) + '" role="img" aria-label="A human karyotype drawn to scale: ' +
            '22 numbered pairs of autosomes arranged by size, and position 23 showing ' + (sex === 'XY' ? 'an X and a much smaller Y' : 'two X chromosomes') +
            '. In each pair one chromosome is blue, from the father, and one is pink, from the mother.">';
        L.rows.forEach(row => {
            row.items.forEach(it => {
                const ks = members(it.pos, sex), cols = colours(it.pos, sex);
                ks.forEach((k, i) => {
                    const cx = it.x + i * (CHROM_W + PAIR_GAP);
                    s += chromosome(cx, row.cen, k, cols[i], cols[i] === 'b' ? 'father' : 'mother');
                });
                const lab = it.pos === 'sex' ? ks.join(' ') : it.pos;
                s += '<text class="ky-n' + (it.pos === 'sex' ? ' sex' : '') + '" x="' + (it.x + POS_W / 2).toFixed(1) +
                    '" y="' + row.labelY.toFixed(1) + '">' + lab + '</text>';
            });
        });
        return s + '</svg>';
    }

    /* ---- build mode ---------------------------------------------------- */
    // The sperm's set, in a fixed jumbled order so every reader gets the same puzzle.
    const SPERM = [17, 3, 21, 9, 'Y', 14, 1, 20, 6, 11, 15, 4, 22, 8, 13, 2, 19, 10, 16, 5, 12, 18, 7];
    const posOf = k => k === 'Y' ? 'sex' : k;                 // where each blue chromosome belongs
    const TRAY_GAP = 46;                                       // space between the karyotype and the jumble

    const ci = k => CHR[k][1] / CHR[k][0];
    // Two chromosomes that length and centromere position cannot separate.
    // Computed from the data: within 10% in length and 0.07 in centromere index.
    const lookAlike = (a, b) => a !== b &&
        Math.abs(CHR[a][0] - CHR[b][0]) / Math.max(CHR[a][0], CHR[b][0]) <= 0.10 && Math.abs(ci(a) - ci(b)) <= 0.07;
    const where = k => ci(k) < 0.2 ? 'right next to one end' : ci(k) < 0.34 ? 'about a third of the way along' : 'close to the middle';

    function buildLayout() {
        const L = layout('XY');
        const up = Math.max(...SPERM.map(pLen)), down = Math.max(...SPERM.map(qLen));
        const cen = L.height + TRAY_GAP + up;
        const step = (VW - 2 * MARGIN) / SPERM.length;
        const tray = SPERM.map((k, i) => ({ k, x: MARGIN + step * (i + 0.5) - CHROM_W / 2, cx: MARGIN + step * (i + 0.5) }));
        return { L, tray: { cen, up, down, step, items: tray, top: L.height + 18 }, height: cen + down + 16 };
    }

    // x of the blue member at a position: autosomes put blue first; XY puts the pink X first
    const blueX = it => it.pos === 'sex' ? it.x + CHROM_W + PAIR_GAP : it.x;
    const pinkX = it => it.pos === 'sex' ? it.x : it.x + CHROM_W + PAIR_GAP;

    function buildSVG(placed, selected) {
        const B = buildLayout();
        let s = '<svg class="ky-svg ky-build" viewBox="0 0 ' + VW + ' ' + B.height.toFixed(0) + '" role="group" ' +
            'aria-label="A half-built karyotype. The egg’s 23 chromosomes are in place; the sperm’s 23 are jumbled underneath.">';
        B.L.rows.forEach(row => {
            row.items.forEach(it => {
                const pk = it.pos === 'sex' ? 'X' : it.pos, bk = it.pos === 'sex' ? 'Y' : it.pos;
                s += chromosome(pinkX(it), row.cen, pk, 'p', 'mother');
                if (placed[it.pos]) {
                    s += chromosome(blueX(it), row.cen, bk, 'b', 'father');
                } else {
                    // a uniform empty slot: the same size in every position, so it gives nothing away
                    s += '<rect class="ky-slot' + (selected ? ' armed' : '') + '" data-pos="' + it.pos + '" tabindex="0" role="button" ' +
                        'aria-label="Position ' + (it.pos === 'sex' ? '23, the sex chromosomes' : it.pos) + ': place the selected chromosome here" ' +
                        'x="' + (blueX(it) - 4).toFixed(2) + '" y="' + (row.cen - row.up - 4).toFixed(2) + '" width="' + (CHROM_W + 8).toFixed(2) +
                        '" height="' + (row.up + row.down + 8).toFixed(2) + '" rx="5"/>';
                }
                s += '<text class="ky-n' + (it.pos === 'sex' ? ' sex' : '') + '" x="' + (it.x + POS_W / 2).toFixed(1) + '" y="' + row.labelY.toFixed(1) + '">' +
                    (it.pos === 'sex' ? (placed.sex ? 'X Y' : 'X ?') : it.pos) + '</text>';
            });
        });
        s += '<line class="ky-rule" x1="' + MARGIN + '" x2="' + (VW - MARGIN) + '" y1="' + (B.L.height + 8).toFixed(1) + '" y2="' + (B.L.height + 8).toFixed(1) + '"/>' +
            '<text class="ky-tray-t" x="' + MARGIN + '" y="' + (B.tray.top + 8).toFixed(1) + '">From the sperm, not yet sorted</text>';
        B.tray.items.forEach(t => {
            if (placed[posOf(t.k)]) return;
            s += '<g class="ky-pick' + (selected === t.k ? ' sel' : '') + '" data-k="' + t.k + '" tabindex="0" role="button" ' +
                'aria-label="Unsorted chromosome from the sperm, about ' + Math.round(CHR[t.k][0]) + ' million base pairs, centromere ' + where(t.k) + '">' +
                '<rect class="ky-hit" x="' + (t.cx - B.tray.step / 2).toFixed(2) + '" y="' + (B.tray.cen - B.tray.up - 6).toFixed(2) +
                '" width="' + B.tray.step.toFixed(2) + '" height="' + (B.tray.up + B.tray.down + 12).toFixed(2) + '"/>' +
                chromosome(t.x, B.tray.cen, t.k, 'b', 'father', true) + '</g>';
        });
        return { svg: s + '</svg>', B };
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const st = document.createElement('style');
        st.id = STYLE_ID;
        st.textContent = [
            '.ky { --ky-p:#e38ea0; --ky-b:#8fabd8; --ky-ink:#3a1f2b; }',
            '[data-theme="dark"] .ky { --ky-ink:#120a0e; }',
            '.ky-bar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:0.5rem 1rem; margin:0 0 0.6rem; }',
            '.ky-key { display:flex; flex-wrap:wrap; gap:0.3rem 1rem; font-size:0.76rem; color:var(--text-secondary); }',
            '.ky-key i { display:inline-block; width:0.75rem; height:0.75rem; border-radius:3px; margin-right:0.35rem; vertical-align:-0.08rem; border:1px solid var(--ky-ink); }',
            '.ky-switch { display:inline-flex; align-items:center; gap:0.45rem; font-size:0.78rem; color:var(--text-secondary); }',
            '.ky-seg { display:inline-flex; border:1px solid var(--border); border-radius:8px; overflow:hidden; }',
            '.ky-seg button { font:inherit; font-size:0.8rem; font-weight:700; padding:0.3rem 0.75rem; border:0; background:var(--bg); color:var(--text); cursor:pointer; }',
            '.ky-seg button + button { border-left:1px solid var(--border); }',
            '.ky-seg button[aria-pressed="true"] { background:var(--text); color:var(--bg); }',
            '.ky-seg button:focus-visible { outline:2px solid var(--light-teal); outline-offset:-2px; }',
            '.ky-scroll { overflow-x:auto; }',
            '.ky-svg { display:block; width:100%; min-width:460px; height:auto; }',
            '.ky-arm, .ky-cen { stroke:var(--ky-ink); stroke-width:0.8; }',
            '.ky-cen { stroke-width:0.9; }',
            '.ky-p .ky-arm, .ky-p .ky-cen { fill:var(--ky-p); }',
            '.ky-b .ky-arm, .ky-b .ky-cen { fill:var(--ky-b); }',
            '.ky-n { font-size:13px; font-weight:700; text-anchor:middle; }',
            '.ky-n.sex { font-size:13.5px; letter-spacing:0.08em; }',
            '.ky-note { font-size:0.74rem; color:var(--text-secondary); margin:0.45rem 0 0; }',
            // build mode
            '.ky { --ky-ok:#2e7d32; --ky-bad:#aa272f; }',
            '[data-theme="dark"] .ky { --ky-ok:#7fc98a; --ky-bad:#e08a90; }',
            '[data-theme="sepia"] .ky { --ky-ok:#4a6b3d; --ky-bad:#a04040; }',
            '.ky-how { font-size:0.8rem; color:var(--text-secondary); margin:0 0 0.6rem; line-height:1.6; }',
            '.ky-how b { color:var(--text); }',
            '.ky-progress { font-size:0.78rem; font-weight:700; color:var(--text); font-variant-numeric:tabular-nums; }',
            '.ky-build { touch-action:manipulation; user-select:none; -webkit-user-select:none; }',
            '.ky-slot { fill:none; stroke:var(--text-secondary); stroke-width:1.2; stroke-dasharray:4 3; cursor:pointer; }',
            '.ky-slot.armed { stroke:var(--light-teal); stroke-width:1.8; }',
            '.ky-slot.hot { stroke:var(--light-teal); stroke-width:3; stroke-dasharray:none; fill:rgba(87,120,153,0.12); }',
            '.ky-slot.miss { stroke:var(--ky-bad); stroke-width:3; stroke-dasharray:none; }',
            '.ky-slot:focus { outline:none; stroke:var(--light-teal); stroke-width:3; }',
            '.ky-pick { cursor:grab; touch-action:none; }',
            '.ky-pick .ky-hit { fill:transparent; }',
            '.ky-pick:focus { outline:none; } .ky-pick:focus .ky-hit, .ky-pick.sel .ky-hit { fill:rgba(87,120,153,0.16); }',
            '.ky-pick.sel .ky-arm, .ky-pick.sel .ky-cen { stroke:var(--light-teal); stroke-width:1.8; }',
            '.ky-pick.lift { cursor:grabbing; }',
            '.ky-rule { stroke:var(--border); stroke-width:1; }',
            '.ky-tray-t { font-size:12px; font-weight:700; fill:var(--text-secondary); }',
            '.ky-note.ok { color:var(--ky-ok); } .ky-note.bad { color:var(--ky-bad); } .ky-note.help { color:var(--text); }',
            '.ky-note b { color:var(--text); }',
            '.ky-note.big { font-size:0.83rem; line-height:1.6; min-height:2.6em; }',
            '.ky .sim-buttons { padding:0; margin-top:0.7rem; }'
        ].join('\n');
        document.head.appendChild(st);
    }

    window.SIMS['u4-karyotype'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'ky');
        const how = U.el('p', 'ky-how');
        const bar = U.el('div', 'ky-bar');
        const scroll = U.el('div', 'ky-scroll');
        const note = U.el('p', 'ky-note');
        const actions = U.el('div', 'sim-buttons');
        note.setAttribute('aria-live', 'polite');
        [how, bar, scroll, note, actions].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        let sex = 'XY';
        let mode = 'build';            // build -> done
        let placed = {};               // position -> true once the sperm's chromosome is paired
        let selected = null;           // a picked-up chromosome, by tap or keyboard
        let wrongs = 0, helped = 0, byHand = true;
        let msg = null;                // { cls, html }
        let focusAfter = null;

        const KEY = '<span class="ky-key"><span><i style="background:var(--ky-b)"></i>from the father&rsquo;s sperm</span>' +
            '<span><i style="background:var(--ky-p)"></i>from the mother&rsquo;s egg</span></span>';
        // DOM attributes are strings; the data keys chromosomes by number
        const norm = v => v === 'Y' || v === 'sex' || v == null ? v : Number(v);
        const label = pos => pos === 'sex' ? 'position 23' : 'pair ' + pos;

        /* ---- the finished karyotype: the original figure, unchanged ---- */
        function renderDone() {
            how.innerHTML = byHand
                ? 'Every chromosome from the sperm is paired with its partner from the egg. Use the switch to see position 23 both ways it can occur.'
                : 'The finished karyotype. Use the switch to see position 23 both ways it can occur.';
            bar.innerHTML = KEY + '<span class="ky-switch" role="group" aria-label="Sex chromosomes at position 23">Position 23:' +
                '<span class="ky-seg"><button type="button" data-sex="XX">XX</button><button type="button" data-sex="XY">XY</button></span></span>';
            scroll.innerHTML = svgFor(sex);
            bar.querySelectorAll('[data-sex]').forEach(b => {
                b.setAttribute('aria-pressed', b.getAttribute('data-sex') === sex ? 'true' : 'false');
                b.addEventListener('click', () => { sex = b.getAttribute('data-sex'); render(); });
            });
            note.className = 'ky-note';
            note.textContent = sex === 'XY'
                ? 'XY: chromosomally male. 46 chromosomes in 23 positions — the X came from the egg and the Y from the sperm.'
                : 'XX: chromosomally female. 46 chromosomes in 23 pairs — one X from the egg and one from the sperm.';
            actions.innerHTML = '';
            U.button(actions, 'Pair them up again').addEventListener('click', reset);
        }

        /* ---- build mode ---------------------------------------------------- */
        function renderBuild() {
            const left = SPERM.filter(k => !placed[posOf(k)]).length;
            how.innerHTML = 'The pink chromosomes came from the egg and are already in place. The sperm&rsquo;s 23, in blue, are ' +
                'jumbled underneath, drawn to the same scale. <b>Put each one beside its partner</b>: match the length, and where the ' +
                'waist (the centromere) sits. Drag a chromosome, or tap it and then tap its empty slot.';
            bar.innerHTML = KEY + '<span class="ky-progress">' + (23 - left) + ' of 23 paired</span>';
            const out = buildSVG(placed, selected);
            scroll.innerHTML = out.svg;
            note.className = 'ky-note big' + (msg ? ' ' + msg.cls : '');
            note.innerHTML = msg ? msg.html : '';
            actions.innerHTML = '';
            U.button(actions, 'Place the rest for me').addEventListener('click', () => {
                byHand = false;
                SPERM.forEach(k => { placed[posOf(k)] = true; });
                finish();
            });
            wire(out.B);
            if (focusAfter) {
                const el = scroll.querySelector(focusAfter);
                if (el) el.focus({ preventScroll: true });
                focusAfter = null;
            }
        }

        function render() { mode === 'done' ? renderDone() : renderBuild(); }

        function finish() {
            mode = 'done'; sex = 'XY'; selected = null; msg = null;
            render();
        }

        function reset() {
            mode = 'build'; placed = {}; selected = null; wrongs = 0; helped = 0; byHand = true; msg = null; sex = 'XY';
            render();
        }

        const FACT = {
            1: 'The longest human chromosome.',
            13: 'The centromere right next to one end is how 13, 14 and 15 are recognised.',
            16: 'Chromosome 16 has its centromere close to the middle, which sets it apart from 17 and 18.',
            21: 'The shortest of all — shorter than 22. Chromosome 21 had already been linked to Down syndrome before the sizes were measured accurately, so the numbering was never changed.',
            Y: 'The Y is small and carries few genes, but one of them is SRY, which starts development down the male pathway. It can only have come from the sperm.'
        };

        // Try to put blue chromosome k at a position. byTap keeps it picked up after a miss.
        function attempt(k, pos, byTap, byKey) {
            k = norm(k); pos = norm(pos);
            if (!k || placed[posOf(k)] || !pos || placed[pos]) return;
            const home = posOf(k);
            if (pos === home) {
                placed[home] = true;
                selected = null;
                msg = { cls: 'ok', html: '<b>' + label(home).replace(/^./, c => c.toUpperCase()) + '.</b> ' +
                    (FACT[k] || 'Same length as its partner, and the centromere in the same place.') };
                afterPlace(byKey);
                return;
            }
            const target = pos === 'sex' ? 'Y' : pos;
            if (pos !== 'sex' && k !== 'Y' && lookAlike(k, target)) {
                // a match nobody could separate without staining: accept the reasoning, place it truly
                placed[home] = true;
                selected = null; helped++;
                msg = { cls: 'help', html: '<b>Good eye.</b> By length and centromere position it matches pair ' + pos + '. ' +
                    'Chromosomes ' + Math.min(k, pos) + ' and ' + Math.max(k, pos) + ' cannot be told apart that way: real karyotypes are sorted ' +
                    'using the stripes that staining reveals. This one is pair ' + k + ', so it has gone there.' };
                afterPlace(byKey);
                return;
            }
            wrongs++;
            selected = byTap ? k : null;
            if (pos === 'sex') {
                msg = { cls: 'bad', html: '<b>Not position 23.</b> That slot takes the sperm&rsquo;s sex chromosome, and this sperm carries a Y: look for a small one with its centromere right next to one end.' };
            } else {
                const a = CHR[k][0], b = CHR[target][0];
                const diff = Math.abs(a - b) / b;
                if (diff > 0.10) {
                    // big gaps read better as a ratio than as "325% longer"
                    const r = a / b;
                    const how = r >= 1.5 ? 'about ' + (Math.round(r * 10) / 10) + ' times as long as'
                        : r <= 1 / 1.5 ? 'only about ' + Math.round(r * 100) + '% as long as'
                        : 'about ' + Math.round(diff * 100) + '% ' + (a > b ? 'longer' : 'shorter') + ' than';
                    msg = { cls: 'bad', html: '<b>Not ' + label(pos) + '.</b> This chromosome is ' + how +
                        ' the pink one already there. Partners are the same length.' };
                } else {
                    msg = { cls: 'bad', html: '<b>Not ' + label(pos) + '.</b> The length is close, but in that pair the centromere sits ' +
                        where(target) + ', and in this one it sits ' + where(k) + '.' };
                }
            }
            render();
            const slot = scroll.querySelector('.ky-slot[data-pos="' + pos + '"]');
            if (slot) { slot.classList.add('miss'); setTimeout(() => slot.classList.remove('miss'), 700); }
            if (byKey && slot) slot.focus({ preventScroll: true });
        }

        function afterPlace(byKey) {
            if (SPERM.every(x => placed[posOf(x)])) {
                const doneMsg = wrongs === 0 && helped === 0 ? 'All 23 paired on the first try.' : 'All 23 paired.';
                finish();
                note.className = 'ky-note big ok';
                note.innerHTML = '<b>' + doneMsg + '</b> 46 chromosomes: 23 from the egg and 23 from the sperm, in 23 positions. ' + note.textContent;
                return;
            }
            if (byKey) {
                const next = SPERM.find(x => !placed[posOf(x)]);
                focusAfter = '.ky-pick[data-k="' + next + '"]';
            }
            render();
        }

        /* ---- pointer, tap and keyboard ------------------------------------ */
        function wire(B) {
            const svg = scroll.querySelector('svg');
            const toSvg = e => {
                const m = svg.getScreenCTM(); if (!m) return null;
                const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
                return pt.matrixTransform(m.inverse());
            };
            // which position a point in SVG coordinates is over
            const posAt = p => {
                if (!p) return null;
                for (const row of B.L.rows) {
                    if (p.y < row.cen - row.up - 14 || p.y > row.labelY + 6) continue;
                    for (const it of row.items) if (p.x >= it.x - 10 && p.x <= it.x + POS_W + 10) return it.pos;
                }
                return null;
            };
            const slotEl = pos => svg.querySelector('.ky-slot[data-pos="' + pos + '"]');
            let drag = null;

            svg.querySelectorAll('.ky-pick').forEach(g => {
                const k = norm(g.getAttribute('data-k'));
                g.addEventListener('pointerdown', e => {
                    if (e.button > 0) return;
                    drag = { k, g, sx: e.clientX, sy: e.clientY, start: toSvg(e), moved: false, hot: null };
                    g.setPointerCapture(e.pointerId);
                    e.preventDefault();
                });
                g.addEventListener('pointermove', e => {
                    if (!drag || drag.g !== g) return;
                    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
                    drag.moved = true;
                    const p = toSvg(e);
                    g.setAttribute('transform', 'translate(' + (p.x - drag.start.x).toFixed(1) + ' ' + (p.y - drag.start.y).toFixed(1) + ')');
                    g.classList.add('lift');
                    svg.appendChild(g);                                   // keep the dragged one on top
                    const hot = posAt(p);
                    if (hot !== drag.hot) {
                        if (drag.hot && slotEl(drag.hot)) slotEl(drag.hot).classList.remove('hot');
                        if (hot && slotEl(hot)) slotEl(hot).classList.add('hot');
                        drag.hot = hot;
                    }
                });
                const end = e => {
                    if (!drag || drag.g !== g) return;
                    const d = drag; drag = null;
                    if (!d.moved) {                                       // a tap: pick it up or put it down
                        selected = selected === k ? null : k;
                        msg = selected ? { cls: '', html: 'Picked up. Now tap the empty slot beside its partner.' } : null;
                        focusAfter = '.ky-pick[data-k="' + k + '"]';
                        render();
                        return;
                    }
                    const pos = e.type === 'pointerup' ? posAt(toSvg(e)) : null;
                    if (pos && !placed[pos]) attempt(k, pos, false);
                    else render();                                        // dropped on nothing: back to the row
                };
                g.addEventListener('pointerup', end);
                g.addEventListener('pointercancel', end);
                g.addEventListener('keydown', e => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    selected = selected === k ? null : k;
                    msg = selected ? { cls: '', html: 'Picked up. Now move to the empty slot beside its partner and press Enter.' } : null;
                    focusAfter = '.ky-pick[data-k="' + k + '"]';
                    render();
                });
            });

            svg.querySelectorAll('.ky-slot').forEach(r => {
                const pos = norm(r.getAttribute('data-pos'));
                r.addEventListener('click', () => {
                    if (selected) attempt(selected, pos, true);
                    else { msg = { cls: '', html: 'Pick up a blue chromosome first, then choose its slot.' }; render(); }
                });
                r.addEventListener('keydown', e => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    if (selected) attempt(selected, pos, true, true);
                    else { msg = { cls: '', html: 'Pick up a blue chromosome first, then choose its slot.' }; focusAfter = '.ky-slot[data-pos="' + pos + '"]'; render(); }
                });
            });
        }

        render();

        root._simState = () => {
            const groups = [...scroll.querySelectorAll('.ky-chr')];
            return {
                mode, sex, paired: Object.keys(placed).length, wrongs, helped, byHand, selected,
                chromosomes: groups.length, positions: scroll.querySelectorAll('.ky-n').length,
                labels: [...scroll.querySelectorAll('.ky-n')].map(t => t.textContent),
                fromFather: groups.filter(g => g.classList.contains('ky-b')).length,
                fromMother: groups.filter(g => g.classList.contains('ky-p')).length
            };
        };
        root._simSolve = () => { SPERM.forEach(k => { placed[posOf(k)] = true; }); byHand = false; finish(); };
        // exposed for verification: the same drop logic the pointer handlers use
        root._simTry = (k, pos) => attempt(k, pos, true);
    };
    window.SIMS['u4-karyotype'].data = CHR;
})();
