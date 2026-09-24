/* =============================================================
   INTERACTIVE — Two routes: count the chromosomes
   -------------------------------------------------------------
   Registers window.SIMS['u4-two-routes'].  Supports HS-LS1-4, HS-LS3-2.

   Figure 4.10's caption says the most useful thing on it is the ploidy
   labels: sexual reproduction is the only route where the chromosome
   number goes down and then back up. This makes the reader find that
   out, on an organism small enough to count — two homologous pairs,
   one long and one short, so 2n = 4.

   Three steps, and the reader commits before each explanation:

   1. PREDICT — every parent is shown with its four chromosomes. The
      reader sets how many the sperm, the egg, the zygote and the
      asexual offspring carry. Nothing is drawn in those cells yet, so
      the picture cannot give the answer away.
   2. REVEAL — the real chromosomes appear in every cell, and a route
      graph shows 4 -> 2 -> 4 against 4 -> 4, with the guess left
      behind as a dashed line. Feedback names the specific mistake:
      forgetting to halve, adding two whole sets, halving in mitosis.
   3. SORT — six candidate offspring. Each is dropped on "offspring of
      the father and mother", "clone of the green parent", or "could not
      happen". Which bin is right is COMPUTED from the rules below, not
      typed, and every impossible cell breaks exactly one rule, so the
      explanation it gets is the rule it breaks.

   Colour means "which parent this chromosome came from": blue from
   the father, pink from the mother (as in Figures 4.10, 4.20 and 4.21),
   green from the asexual parent.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4tr-style';

    /* ---- the model --------------------------------------------------- */
    // A chromosome is [length, colour]. Two pairs: one long (L), one short (S).
    const PAIRS = ['L', 'S'];
    const set = c => [['L', c], ['L', c], ['S', c], ['S', c]];   // a diploid parent
    const half = c => [['L', c], ['S', c]];                      // one of each pair
    const PARENT1 = set('p'), PARENT2 = set('b'), PARENT_A = set('g');
    const SPERM = half('p'), EGG = half('b');
    const ZYGOTE = SPERM.concat(EGG);
    const CLONE = PARENT_A.slice();
    const TRUTH = { sperm: SPERM.length, egg: EGG.length, zygote: ZYGOTE.length, clone: CLONE.length };
    const PARENT_N = PARENT1.length;

    const count = (cell, len, col) => cell.filter(c => (!len || c[0] === len) && (!col || c[1] === col)).length;

    // Could this cell be the offspring of parents 1 and 2? It must hold one
    // gamete's worth from each: one of every pair, in pink and in blue, and nothing else.
    function couldBeSexual(cell) {
        if (count(cell, null, 'g')) return false;
        return ['p', 'b'].every(col => PAIRS.every(len => count(cell, len, col) === 1));
    }
    // Could it be a clone of the green parent? Exactly the parent's chromosomes.
    function couldBeClone(cell) {
        return cell.length === PARENT_A.length &&
            PAIRS.every(len => count(cell, len, 'g') === count(PARENT_A, len, 'g'));
    }
    function classify(cell) {
        if (couldBeSexual(cell)) return 'sexual';
        if (couldBeClone(cell)) return 'asexual';
        return 'impossible';
    }
    // For an impossible cell, the one rule it breaks.
    function diagnose(cell) {
        const green = count(cell, null, 'g'), n = cell.length;
        if (green && green === n && n < PARENT_N) return 'halved';
        if (green && green === n && n > PARENT_N) return 'doubledClone';
        if (!green && n > PARENT_N) return 'doubled';
        if (!green && (count(cell, null, 'p') === n || count(cell, null, 'b') === n)) return 'copy';
        if (!green && n === PARENT_N) return 'pairs';
        return 'other';
    }

    const CANDIDATES = [
        { id: 'A', cell: [['L', 'p'], ['L', 'p'], ['S', 'b'], ['S', 'b']] },
        { id: 'B', cell: [['L', 'p'], ['S', 'p'], ['L', 'b'], ['S', 'b']] },
        { id: 'C', cell: [['L', 'g'], ['S', 'g']] },
        { id: 'D', cell: [['L', 'g'], ['L', 'g'], ['S', 'g'], ['S', 'g']] },
        { id: 'E', cell: [['L', 'p'], ['S', 'p'], ['L', 'b'], ['S', 'b'], ['L', 'p'], ['S', 'p'], ['L', 'b'], ['S', 'b']] },
        { id: 'F', cell: [['L', 'p'], ['L', 'p'], ['S', 'p'], ['S', 'p']] }
    ];
    CANDIDATES.forEach(c => { c.bin = classify(c.cell); c.why = c.bin === 'impossible' ? diagnose(c.cell) : c.bin; });

    const COL = { p: 'blue', b: 'pink', g: 'green' };
    const describe = cell => {
        const parts = [];
        ['p', 'b', 'g'].forEach(col => PAIRS.forEach(len => {
            const k = count(cell, len, col);
            if (k) parts.push(k + ' ' + (len === 'L' ? 'long' : 'short') + ' ' + COL[col]);
        }));
        return cell.length + ' chromosomes: ' + parts.join(', ');
    };

    const WHY = {
        sexual: 'One long and one short from the father (blue), and one long and one short from the mother (pink): a sperm’s worth and an egg’s worth. It is different from both parents — neither of them has any of the other’s colour.',
        asexual: 'Exactly the green parent’s chromosomes: two long, two short, all green. Mitosis copies every chromosome and hands one copy of each to each new cell, so the offspring is a clone.',
        halved: 'Only two chromosomes — half the green parent’s set. Mitosis never halves anything: the DNA is copied first, so each new cell gets a complete set. Halving only happens in meiosis, when gametes are made.',
        doubledClone: 'More chromosomes than the green parent. Mitosis copies the DNA and then splits it, so the offspring ends up with exactly the parent’s number — never more.',
        doubled: 'Eight chromosomes — twice the parents’ number. That is what a zygote would get if the sperm and egg each carried a whole set. It is exactly why gametes must be halved: otherwise the number would double every generation.',
        copy: 'All four chromosomes came from one parent, so this cell is identical to that parent. Sexual reproduction always combines a set from each parent, so its offspring can never be a copy of either one.',
        pairs: 'The right number and both colours — but look at the pairs. Two long blues and two short pinks means the sperm carried two long and no short. Meiosis gives every gamete one chromosome from each pair, so each parent passes on one long and one short.',
        other: 'This combination cannot come from either route.'
    };
    const BINS = [
        { k: 'sexual', label: 'Offspring of the father and mother', sub: 'sexual' },
        { k: 'asexual', label: 'Clone of the green parent', sub: 'asexual' },
        { k: 'impossible', label: 'Could not happen', sub: 'breaks a rule' }
    ];

    /* ---- drawing --------------------------------------------------------- */
    // Rods are laid out on a grid inside a nucleus centred at (cx, cy).
    function rods(cell, cx, cy, r) {
        if (!cell || !cell.length) return '';
        const n = cell.length, rows = n > 4 ? 2 : 1, perRow = Math.ceil(n / rows);
        const rowH = (2 * r * 0.8) / rows, colW = (2 * r * 0.85) / perRow;
        const w = Math.max(3.5, Math.min(8.5, colW * 0.55));
        // a short rod must still read as a rod, and a long one as clearly longer
        const Sh = Math.max(Math.min(rowH * 0.84, r) * 0.56, w * 1.9);
        const Lh = Math.max(Math.min(rowH * 0.84, r), Sh * 1.65);
        let s = '';
        cell.forEach((c, i) => {
            const row = Math.floor(i / perRow), col = i % perRow;
            const inRow = Math.min(perRow, n - row * perRow);
            const x = cx + (col - (inRow - 1) / 2) * colW;
            const y = cy + (row - (rows - 1) / 2) * rowH;
            const h = c[0] === 'L' ? Lh : Sh;
            s += '<rect class="tr-rod tr-' + c[1] + '" x="' + (x - w / 2).toFixed(2) + '" y="' + (y - h / 2).toFixed(2) +
                '" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '" rx="' + (w / 2).toFixed(2) + '"/>';
        });
        return s;
    }
    // kind: body | sperm | egg. The cell is drawn in a box of `size` centred at (x, y).
    function cellSVG(kind, x, y, size, cell, mark) {
        const k = size / 100;
        let s = '<g transform="translate(' + (x - size / 2) + ',' + (y - size / 2) + ') scale(' + k + ')">';
        if (kind === 'sperm') {
            s += '<path class="tr-tail" d="M62 50 C 72 40, 80 60, 90 50 S 100 42, 104 48"/>' +
                 '<ellipse class="tr-mem" cx="40" cy="50" rx="24" ry="17"/>' +
                 '<ellipse class="tr-nuc" cx="38" cy="50" rx="17" ry="11.5"/>' +
                 (cell ? rods(cell, 38, 50, 12) : '') +
                 (mark ? '<text class="tr-q" x="38" y="56">' + mark + '</text>' : '');
        } else if (kind === 'egg') {
            s += '<circle class="tr-zona" cx="50" cy="50" r="47"/>' +
                 '<circle class="tr-mem" cx="50" cy="50" r="42"/>' +
                 '<circle class="tr-nuc" cx="50" cy="50" r="22"/>' +
                 (cell ? rods(cell, 50, 50, 18) : '') +
                 (mark ? '<text class="tr-q" x="50" y="58">' + mark + '</text>' : '');
        } else {
            s += '<circle class="tr-mem" cx="50" cy="50" r="44"/>' +
                 '<circle class="tr-nuc" cx="50" cy="50" r="31"/>' +
                 (cell ? rods(cell, 50, 50, 26) : '') +
                 (mark ? '<text class="tr-q" x="50" y="59">' + mark + '</text>' : '');
        }
        return s + '</g>';
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.tr { padding:1rem 1.25rem 1.25rem;',
            '  --tr-p:#8fabd8; --tr-b:#e38ea0; --tr-g:#8cc39a; --tr-rod-ink:#3a1f2b;',
            '  --tr-sex:#b4476a; --tr-asex:#3f8a55; --tr-zona:#d9a441; --tr-ok:#2e7d32; --tr-bad:#aa272f; }',
            '[data-theme="dark"] .tr { --tr-sex:#e592ad; --tr-asex:#8fd3a2; --tr-ok:#7fc98a; --tr-bad:#e08a90; --tr-rod-ink:#1a0d13; }',
            '[data-theme="sepia"] .tr { --tr-sex:#9c3f5c; --tr-asex:#4a6b3d; --tr-ok:#4a6b3d; --tr-bad:#a04040; }',
            '.tr-how { font-size:0.8rem; color:var(--text-secondary); margin:0 0 0.8rem; line-height:1.6; }',
            '.tr-how b { color:var(--text); }',
            '.tr-stage { border:1px solid var(--border); border-radius:11px; background:var(--bg); padding:0.4rem;',
            '  overflow-x:auto; }',
            '.tr-svg { display:block; width:100%; min-width:540px; height:auto; user-select:none; -webkit-user-select:none; }',
            '.tr-svg text { font-family:var(--body-font); }',
            '.tr-mem { fill:var(--bg-surface); stroke:var(--text-secondary); stroke-width:2.2; }',
            '.tr-nuc { fill:var(--bg); stroke:var(--text-secondary); stroke-width:1.5; }',
            '.tr-zona { fill:none; stroke:var(--tr-zona); stroke-width:3; }',
            '.tr-tail { fill:none; stroke:var(--text-secondary); stroke-width:2.4; stroke-linecap:round; }',
            '.tr-rod { stroke:var(--tr-rod-ink); stroke-width:0.8; }',
            '.tr-p { fill:var(--tr-p); } .tr-b { fill:var(--tr-b); } .tr-g { fill:var(--tr-g); }',
            '.tr-q { fill:var(--text-secondary); font-size:22px; font-weight:800; text-anchor:middle; }',
            '.tr-lane { font-size:13px; font-weight:800; letter-spacing:0.02em; }',
            '.tr-lane.sex { fill:var(--tr-sex); } .tr-lane.asex { fill:var(--tr-asex); }',
            '.tr-name { fill:var(--text); font-size:12px; font-weight:700; text-anchor:middle; }',
            '.tr-n { fill:var(--text-secondary); font-size:11.5px; text-anchor:middle; font-variant-numeric:tabular-nums; }',
            '.tr-n.ok { fill:var(--tr-ok); font-weight:700; } .tr-n.bad { fill:var(--tr-bad); font-weight:700; }',
            '.tr-arrow { fill:none; stroke:var(--text-secondary); stroke-width:1.6; }',
            '.tr-head { fill:var(--text-secondary); }',
            '.tr-verb { fill:var(--text-secondary); font-size:11px; font-style:italic; text-anchor:middle; }',
            '.tr-divider { stroke:var(--border); stroke-width:1.2; stroke-dasharray:4 4; }',
            // steppers
            '.tr-guess { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:0.5rem 0.9rem; margin:0.9rem 0 0; }',
            '.tr-step { display:flex; align-items:center; justify-content:space-between; gap:0.4rem; font-size:0.82rem;',
            '  border:1px solid var(--border); border-radius:9px; padding:0.3rem 0.4rem 0.3rem 0.65rem; }',
            '.tr-step .lab b { display:block; font-size:0.8rem; } .tr-step .lab span { font-size:0.7rem; color:var(--text-secondary); }',
            '.tr-step .ctl { display:flex; align-items:center; gap:0.2rem; }',
            '.tr-step button { font:inherit; width:1.9rem; height:1.9rem; border-radius:7px; border:1px solid var(--border);',
            '  background:var(--bg); color:var(--text); font-weight:800; cursor:pointer; touch-action:manipulation; }',
            '.tr-step button:hover { border-color:var(--light-teal); }',
            '.tr-step button:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.tr-step output { min-width:1.6rem; text-align:center; font-weight:800; font-size:1rem; font-variant-numeric:tabular-nums; }',
            // reveal
            '.tr-fb { font-size:0.84rem; line-height:1.6; margin:0.9rem 0 0; }',
            '.tr-fb p { margin:0 0 0.55rem; }',
            '.tr-fb .ok { color:var(--tr-ok); font-weight:700; } .tr-fb .bad { color:var(--tr-bad); font-weight:700; }',
            '.tr-graph { display:block; width:100%; max-width:460px; height:auto; margin:0.4rem auto 0; }',
            '.tr-graph text { font-family:var(--body-font); }',
            '.tr-axis { stroke:var(--text-secondary); stroke-width:1.2; }',
            '.tr-grid { stroke:var(--border); stroke-width:1; }',
            '.tr-tick { fill:var(--text-secondary); font-size:11px; }',
            '.tr-line { fill:none; stroke-width:3; stroke-linejoin:round; stroke-linecap:round; }',
            '.tr-line.sex { stroke:var(--tr-sex); } .tr-line.asex { stroke:var(--tr-asex); }',
            '.tr-line.guess { stroke-width:2; stroke-dasharray:5 4; opacity:0.8; }',
            '.tr-dot.sex { fill:var(--tr-sex); } .tr-dot.asex { fill:var(--tr-asex); }',
            '.tr-key { display:flex; flex-wrap:wrap; justify-content:center; gap:0.3rem 1rem; font-size:0.74rem;',
            '  color:var(--text-secondary); margin:0.2rem 0 0; }',
            '.tr-key i { display:inline-block; width:1.4rem; height:0; border-top:3px solid; vertical-align:middle; margin-right:0.35rem; }',
            '.tr-key i.g { border-top-style:dashed; border-top-width:2px; }',
            // sort
            '.tr-bins { display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem; margin:0.9rem 0 0; }',
            '.tr-bin { font:inherit; color:var(--text); text-align:left; background:var(--bg-surface);',
            '  border:1.5px dashed var(--text-secondary); border-radius:10px; padding:0.5rem 0.55rem; min-height:6.2rem;',
            '  cursor:pointer; display:flex; flex-direction:column; gap:0.35rem; }',
            '.tr-bin .t { font-size:0.78rem; font-weight:800; line-height:1.25; }',
            '.tr-bin .s { font-size:0.68rem; color:var(--text-secondary); }',
            '.tr-bin.hot { border-style:solid; border-color:var(--text); background:var(--bg); }',
            '.tr-bin:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.tr-bin .got { display:flex; flex-wrap:wrap; gap:0.25rem; }',
            '.tr-mini { width:2.6rem; height:2.6rem; border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '  position:relative; }',
            '.tr-mini svg { width:100%; height:100%; display:block; }',
            '.tr-mini b { position:absolute; top:-0.1rem; left:0.15rem; font-size:0.6rem; }',
            '.tr-tray { display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:center; margin:0.8rem 0 0; }',
            '.tr-tile { font:inherit; position:relative; width:6rem; padding:0.3rem 0.3rem 0.2rem; border:1px solid var(--border);',
            '  border-radius:10px; background:var(--bg); color:var(--text); cursor:grab; touch-action:none;',
            '  display:flex; flex-direction:column; align-items:center; }',
            '.tr-tile svg { width:5.3rem; height:5.3rem; display:block; pointer-events:none; }',
            '.tr-tile .id { font-size:0.74rem; font-weight:800; line-height:1.2; }',
            '.tr-tile:hover { border-color:var(--light-teal); }',
            '.tr-tile.sel { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.tr-tile:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.tr-tile.lift { opacity:0.35; }',
            '.tr-ghost { position:fixed; left:0; top:0; width:4.6rem; height:4.6rem; pointer-events:none; z-index:1000;',
            '  border:1px solid var(--light-teal); border-radius:50%; background:var(--bg); box-shadow:0 6px 18px rgba(0,0,0,0.25); }',
            '.tr-ghost svg { width:100%; height:100%; display:block; }',
            '.tr-msg { font-size:0.83rem; line-height:1.6; margin:0.7rem 0 0; min-height:2.4em; }',
            '.tr-msg.ok { color:var(--tr-ok); } .tr-msg.bad { color:var(--tr-bad); } .tr-msg b { color:var(--text); }',
            '.tr-done { margin-top:0.9rem; border:1px solid var(--tr-ok); border-radius:10px; background:rgba(46,125,50,0.08);',
            '  padding:0.85rem 1rem; font-size:0.84rem; line-height:1.6; }',
            '[data-theme="dark"] .tr-done { background:rgba(127,201,138,0.12); }',
            '.tr-done h5 { margin:0 0 0.4rem; font-size:0.9rem; } .tr-done p { margin:0 0 0.55rem; } .tr-done p:last-child { margin-bottom:0; }',
            '.tr .sim-buttons { padding:0; margin-top:0.9rem; }',
            '@media (max-width: 480px) {',
            '  .tr { padding:0.85rem 0.6rem 1rem; }',
            '  .tr-bins { grid-template-columns:1fr; }',
            '  .tr-bin { min-height:0; }',
            '  .tr-tile { width:5.2rem; } .tr-tile svg { width:4.6rem; height:4.6rem; }',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    /* ---- layout of the route diagram (viewBox 640 x 430) ------------------ */
    const NODE = {
        p1:     { kind: 'body',  x: 70,  y: 76,  size: 90, name: 'father' },
        p2:     { kind: 'body',  x: 70,  y: 222, size: 90, name: 'mother' },
        sperm:  { kind: 'sperm', x: 250, y: 76,  size: 96, name: 'sperm' },
        egg:    { kind: 'egg',   x: 250, y: 222, size: 108, name: 'egg' },
        zygote: { kind: 'body',  x: 425, y: 150, size: 100, name: 'zygote' },
        kids:   { kind: 'body',  x: 570, y: 150, size: 48, name: 'offspring' },
        pa:     { kind: 'body',  x: 70,  y: 398, size: 90, name: 'parent' },
        clone:  { kind: 'body',  x: 425, y: 398, size: 90, name: 'offspring' }
    };
    const GUESSED = ['sperm', 'egg', 'zygote', 'clone'];
    const CELLS = { p1: PARENT1, p2: PARENT2, sperm: SPERM, egg: EGG, zygote: ZYGOTE, kids: ZYGOTE, pa: PARENT_A, clone: CLONE };

    window.SIMS['u4-two-routes'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'tr');
        const howEl = U.el('p', 'tr-how');
        const stage = U.el('div', 'tr-stage');
        const belowEl = U.el('div');
        [howEl, stage, belowEl].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        let step, guess, placed, selected, wrongs, msg;

        function arrow(x1, y1, x2, y2, verb, vx, vy) {
            const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - 8 * Math.cos(a), hy = y2 - 8 * Math.sin(a);
            const px = -Math.sin(a) * 4.5, py = Math.cos(a) * 4.5;
            return '<line class="tr-arrow" x1="' + x1 + '" y1="' + y1 + '" x2="' + hx.toFixed(1) + '" y2="' + hy.toFixed(1) + '"/>' +
                '<path class="tr-head" d="M' + x2 + ' ' + y2 + ' L' + (hx + px).toFixed(1) + ' ' + (hy + py).toFixed(1) +
                ' L' + (hx - px).toFixed(1) + ' ' + (hy - py).toFixed(1) + ' Z"/>' +
                (verb ? '<text class="tr-verb" x="' + vx + '" y="' + vy + '">' + verb + '</text>' : '');
        }

        function countLabel(key) {
            const node = NODE[key], truth = CELLS[key].length;
            const y = node.y + node.size / 2 + (node.kind === 'egg' ? 14 : 16);
            if (GUESSED.indexOf(key) < 0) {
                if (key === 'kids') return '';
                return '<text class="tr-n" x="' + node.x + '" y="' + (y + 15) + '">' + truth + ' chromosomes · 2n</text>';
            }
            if (step === 'predict') {
                return '<text class="tr-n" x="' + node.x + '" y="' + (y + 15) + '">your guess: ' + guess[key] + '</text>';
            }
            const ok = guess[key] === truth;
            const ploidy = truth < PARENT_N ? 'n' : '2n';
            return '<text class="tr-n ' + (ok ? 'ok' : 'bad') + '" x="' + node.x + '" y="' + (y + 15) + '">' + truth +
                ' chromosomes · ' + ploidy + (ok ? ' ✓' : ' (you said ' + guess[key] + ')') + '</text>';
        }

        function draw() {
            const revealed = step !== 'predict';
            let s = '<svg class="tr-svg" viewBox="0 0 640 480" role="img" aria-label="' +
                (revealed ? 'Both routes with every cell’s chromosomes shown.' : 'Both routes, with the chromosomes of the sperm, egg, zygote and asexual offspring hidden.') + '">';
            s += '<text class="tr-lane sex" x="8" y="16">SEXUAL — two parents</text>';
            s += '<text class="tr-lane asex" x="8" y="336">ASEXUAL — one parent</text>';
            s += '<line class="tr-divider" x1="4" y1="318" x2="636" y2="318"/>';
            // arrows first, so cells sit on top of them
            s += arrow(118, 76, 206, 76, 'meiosis', 162, 68);
            s += arrow(118, 222, 192, 222, 'meiosis', 155, 214);
            s += arrow(300, 84, 374, 132, '', 0, 0);
            s += arrow(306, 208, 374, 170, '', 0, 0);
            s += '<text class="tr-verb" x="358" y="104">fertilisation</text>';
            s += arrow(477, 150, 522, 150, 'mitosis', 499, 142);
            s += arrow(118, 398, 378, 398, 'mitosis', 248, 390);
            Object.keys(NODE).forEach(key => {
                const node = NODE[key];
                const hidden = !revealed && GUESSED.indexOf(key) >= 0;
                if (key === 'kids') {
                    [[-26, -26], [26, -26], [-26, 26], [26, 26]].forEach(o => {
                        s += cellSVG('body', node.x + o[0], node.y + o[1], node.size, revealed ? CELLS.kids : null, revealed ? '' : '');
                    });
                    s += '<text class="tr-name" x="' + node.x + '" y="' + (node.y + 70) + '">offspring</text>';
                    return;
                }
                s += cellSVG(node.kind, node.x, node.y, node.size, hidden ? null : CELLS[key], hidden ? '?' : '');
                const ny = node.y + node.size / 2 + (node.kind === 'egg' ? 14 : 16);
                s += '<text class="tr-name" x="' + node.x + '" y="' + ny + '">' + node.name + '</text>';
                s += countLabel(key);
            });
            s += '</svg>';
            stage.innerHTML = s;
        }

        /* ---- reveal: feedback computed from the reader's own numbers ---- */
        function feedbackHTML() {
            const g = guess, t = TRUTH, out = [];
            const tag = ok => ok ? '<span class="ok">Right.</span> ' : '<span class="bad">Not quite.</span> ';
            // gametes
            if (g.sperm === t.sperm && g.egg === t.egg) {
                out.push(tag(true) + 'The sperm and the egg carry <b>' + t.sperm + '</b> each — one chromosome from each pair, half the parent’s ' + PARENT_N + '. That half-set is written <b>n</b>.');
            } else if (g.sperm === PARENT_N || g.egg === PARENT_N) {
                out.push(tag(false) + 'A gamete with all ' + PARENT_N + ' chromosomes would be a disaster: the zygote would get ' + (2 * PARENT_N) +
                    ', its children ' + (4 * PARENT_N) + ', and the number would double every generation. Meiosis halves the set, so each gamete carries <b>' + t.sperm + '</b> — one from each pair.');
            } else if (g.sperm !== g.egg) {
                out.push(tag(false) + 'The sperm and egg must carry the same number, because each brings exactly half of what the zygote needs. Both carry <b>' + t.sperm + '</b>: one chromosome from each pair.');
            } else {
                out.push(tag(false) + 'There are two pairs, and a gamete gets one chromosome from each pair, so the sperm and egg carry <b>' + t.sperm + '</b> each.');
            }
            // zygote
            if (g.zygote === t.zygote) {
                out.push(tag(true) + 'The zygote has <b>' + t.zygote + '</b> — ' + t.sperm + ' from the sperm plus ' + t.egg + ' from the egg. The full number, <b>2n</b>, is back.');
            } else if (g.zygote === g.sperm + g.egg) {
                out.push(tag(false) + 'Your zygote is ' + g.zygote + ' — which is exactly your sperm plus your egg, so your adding was right. The only slip was in the gametes. With ' + t.sperm + ' in each, the zygote has <b>' + t.zygote + '</b>.');
            } else {
                out.push(tag(false) + 'Fertilisation simply adds the sperm and the egg together: ' + t.sperm + ' + ' + t.egg + ' = <b>' + t.zygote + '</b>, the same as each parent.');
            }
            // clone
            if (g.clone === t.clone) {
                out.push(tag(true) + 'The asexual offspring has <b>' + t.clone + '</b>, the same as its parent. It was made by mitosis, which copies every chromosome before splitting.');
            } else if (g.clone < t.clone) {
                out.push(tag(false) + 'You gave the asexual offspring ' + g.clone + '. But it is made by mitosis, and mitosis never halves: the DNA is copied first, so the new cell gets the full <b>' + t.clone + '</b>. There is nothing to halve for, because nothing is combined.');
            } else {
                out.push(tag(false) + 'You gave the asexual offspring ' + g.clone + '. Mitosis copies the chromosomes and then splits the copies between two cells, so each ends up with the parent’s <b>' + t.clone + '</b> — no more.');
            }
            return '<div class="tr-fb" role="status">' + out.map(p => '<p>' + p + '</p>').join('') + '</div>';
        }

        function graphHTML() {
            // x: parent, gamete, offspring. y: chromosome number 0..8
            const W = 460, H = 200, L = 44, R = 20, T = 14, B = 34;
            const X = i => L + i * (W - L - R) / 2, Y = v => T + (8 - v) * (H - T - B) / 8;
            const line = (vals, cls) => {
                const pts = vals.map((v, i) => v === null ? null : [X(i), Y(v)]).filter(Boolean);
                return '<polyline class="tr-line ' + cls + '" points="' + pts.map(p => p.join(',')).join(' ') + '"/>';
            };
            let s = '<svg class="tr-graph" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Chromosome number along each route. Sexual: ' +
                PARENT_N + ', then ' + TRUTH.sperm + ', then ' + TRUTH.zygote + '. Asexual: ' + PARENT_N + ', then ' + TRUTH.clone + '.">';
            [0, 2, 4, 6, 8].forEach(v => {
                s += '<line class="tr-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>' +
                    '<text class="tr-tick" x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>';
            });
            ['parent', 'gamete', 'offspring'].forEach((t, i) => {
                s += '<text class="tr-tick" x="' + X(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + t + '</text>';
            });
            s += '<line class="tr-axis" x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (H - B) + '"/>';
            // the guesses, dashed; the asexual route has no gamete
            s += line([PARENT_N, (guess.sperm + guess.egg) / 2, guess.zygote], 'sex guess');
            s += '<polyline class="tr-line asex guess" points="' + X(0) + ',' + Y(PARENT_N) + ' ' + X(2) + ',' + Y(guess.clone) + '"/>';
            s += line([PARENT_N, TRUTH.sperm, TRUTH.zygote], 'sex');
            s += '<polyline class="tr-line asex" points="' + X(0) + ',' + (Y(PARENT_N) + 3) + ' ' + X(2) + ',' + (Y(TRUTH.clone) + 3) + '"/>';
            [[0, PARENT_N], [1, TRUTH.sperm], [2, TRUTH.zygote]].forEach(p => {
                s += '<circle class="tr-dot sex" cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="4.5"/>';
            });
            [[0, PARENT_N], [2, TRUTH.clone]].forEach(p => {
                s += '<circle class="tr-dot asex" cx="' + X(p[0]) + '" cy="' + (Y(p[1]) + 3) + '" r="4.5"/>';
            });
            s += '</svg>';
            return s + '<div class="tr-key"><span><i style="border-color:var(--tr-sex)"></i>sexual</span>' +
                '<span><i style="border-color:var(--tr-asex)"></i>asexual</span>' +
                '<span><i class="g" style="border-color:var(--text-secondary)"></i>your guesses</span></div>';
        }

        /* ---- sorting ------------------------------------------------------ */
        function tileSVG(cell) {
            return '<svg viewBox="0 0 100 100" aria-hidden="true">' + cellSVG('body', 50, 50, 100, cell, '') + '</svg>';
        }
        function binAt(x, y) {
            const el = document.elementFromPoint(x, y);
            const b = el && el.closest ? el.closest('.tr-bin') : null;
            return b && wrap.contains(b) ? b.getAttribute('data-k') : null;
        }
        function setHot(k) {
            belowEl.querySelectorAll('.tr-bin').forEach(b => b.classList.toggle('hot', b.getAttribute('data-k') === k));
        }
        function attempt(id, bin) {
            const c = CANDIDATES.filter(x => x.id === id)[0];
            if (!c || !bin || placed[id]) return;
            selected = null;
            if (bin === c.bin) {
                placed[id] = bin;
                msg = { cls: 'ok', html: '<b>Cell ' + id + ' — right.</b> ' + WHY[c.why] };
            } else {
                wrongs++;
                const where = BINS.filter(b => b.k === bin)[0].label.toLowerCase();
                let lead = '<b>Not “' + where + '”.</b> ';
                if (bin === 'asexual' && c.bin === 'sexual') lead += 'It has pink and blue chromosomes, and the green parent has neither. ';
                if (bin === 'sexual' && c.bin === 'asexual') lead += 'It is all green, and neither the father nor the mother has a green chromosome. ';
                msg = { cls: 'bad', html: lead + (c.bin === 'impossible' ? 'Check it against the rules again — count the chromosomes, then check the colours, then the pairs.' : 'Try another box.') };
            }
            render();
        }
        function wireTile(btn, id) {
            let start = null, dragging = false, ghost = null, hot = null, suppress = false;
            btn.addEventListener('pointerdown', e => {
                if (placed[id] || e.button > 0) return;
                start = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
                btn.setPointerCapture(e.pointerId);
            });
            btn.addEventListener('pointermove', e => {
                if (!start) return;
                if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
                    dragging = true;
                    ghost = U.el('div', 'tr-ghost');
                    ghost.innerHTML = tileSVG(CANDIDATES.filter(x => x.id === id)[0].cell);
                    wrap.appendChild(ghost);
                    btn.classList.add('lift');
                }
                if (dragging) {
                    const lift = start.touch ? 1.1 : 0.5;
                    ghost.style.transform = 'translate(' + (e.clientX - ghost.offsetWidth / 2) + 'px,' + (e.clientY - ghost.offsetHeight * lift) + 'px)';
                    hot = binAt(e.clientX, e.clientY);
                    setHot(hot);
                }
            });
            const finish = drop => {
                if (dragging) {
                    suppress = true;
                    if (ghost) ghost.remove();
                    btn.classList.remove('lift');
                    setHot(null);
                    if (drop && hot) attempt(id, hot);
                }
                start = null; dragging = false; ghost = null; hot = null;
            };
            btn.addEventListener('pointerup', () => finish(true));
            btn.addEventListener('pointercancel', () => finish(false));
            const toggle = () => {
                if (placed[id]) return;
                selected = selected === id ? null : id;
                msg = selected ? { cls: '', html: 'Cell ' + id + ' selected. Now choose the box it belongs in.' } : null;
                render();
                const again = belowEl.querySelector('.tr-tile[data-id="' + id + '"]');
                if (again) again.focus({ preventScroll: true });
            };
            btn.addEventListener('click', () => { if (suppress) { suppress = false; return; } toggle(); });
            btn.addEventListener('keydown', e => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault(); toggle();
            });
        }

        function doneHTML() {
            return '<div class="tr-done"><h5>Down, then back up — or not at all</h5>' +
                '<p>Sexual reproduction is the only route where the chromosome number <b>halves and then doubles back</b>: ' +
                PARENT_N + ' in each parent, ' + TRUTH.sperm + ' in each gamete, ' + TRUTH.zygote + ' again in the zygote. ' +
                'That is what lets two parents combine without the number growing every generation — and it is why the offspring is <b>different from both of them</b>.</p>' +
                '<p>Asexual reproduction never halves anything, because it never combines anything. Mitosis copies, and the offspring is a <b>clone</b>.</p>' +
                '<p>Real organisms have far more chromosomes — a human has 46, so each sperm and egg carries 23 — but the rules are exactly the ones you just used. How meiosis chooses one chromosome from each pair is Chapter 4.5.</p></div>';
        }

        function render() {
            draw();
            belowEl.innerHTML = '';
            const btns = U.el('div', 'sim-buttons');

            if (step === 'predict') {
                howEl.innerHTML = 'This organism has just <b>four chromosomes</b> in each body cell: two pairs, one long and one short. ' +
                    'Colour shows which parent a chromosome belongs to. Every parent is shown; the cells marked <b>?</b> are hidden. ' +
                    '<b>Before anything is revealed, decide how many chromosomes each hidden cell carries.</b>';
                const box = U.el('div', 'tr-guess');
                [['sperm', 'sperm', 'made from the father'], ['egg', 'egg', 'made from the mother'],
                 ['zygote', 'zygote', 'sperm + egg'], ['clone', 'asexual offspring', 'made from the green parent']].forEach(r => {
                    const d = U.el('div', 'tr-step');
                    d.innerHTML = '<span class="lab"><b>' + r[1] + '</b><span>' + r[2] + '</span></span>' +
                        '<span class="ctl"><button type="button" data-d="-1" aria-label="Fewer chromosomes in the ' + r[1] + '">−</button>' +
                        '<output aria-live="polite" aria-label="Chromosomes in the ' + r[1] + '">' + guess[r[0]] + '</output>' +
                        '<button type="button" data-d="1" aria-label="More chromosomes in the ' + r[1] + '">+</button></span>';
                    d.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
                        guess[r[0]] = Math.max(0, Math.min(8, guess[r[0]] + (+b.getAttribute('data-d'))));
                        d.querySelector('output').textContent = guess[r[0]];
                        draw();
                    }));
                    box.appendChild(d);
                });
                belowEl.appendChild(box);
                U.button(btns, 'Lock in my guesses', 'primary').addEventListener('click', lock);
            }

            if (step === 'reveal') {
                howEl.innerHTML = 'Every cell’s chromosomes are now drawn. <b>Count them, and check the colours.</b>';
                const fb = U.el('div');
                fb.innerHTML = feedbackHTML();
                belowEl.appendChild(fb.firstChild);
                const gr = U.el('div');
                gr.innerHTML = graphHTML();
                while (gr.firstChild) belowEl.appendChild(gr.firstChild);
                U.button(btns, 'Next: which offspring are possible?', 'primary').addEventListener('click', () => {
                    step = 'sort'; msg = null; render();
                });
            }

            if (step === 'sort') {
                const left = CANDIDATES.filter(c => !placed[c.id]).length;
                howEl.innerHTML = left
                    ? 'Six cells, each claiming to be an offspring. Use the parents above. <b>Drag each cell into the box it belongs in</b>, or tap a cell and then tap a box. Some of them could not exist at all.'
                    : 'Every cell is sorted.';
                const bins = U.el('div', 'tr-bins');
                BINS.forEach(b => {
                    const el = U.el('button', 'tr-bin');
                    el.type = 'button';
                    el.setAttribute('data-k', b.k);
                    const got = CANDIDATES.filter(c => placed[c.id] === b.k);
                    el.setAttribute('aria-label', b.label + ' (' + b.sub + '). ' + (got.length ? 'Contains ' + got.map(c => 'cell ' + c.id).join(', ') + '.' : 'Empty.'));
                    el.innerHTML = '<span class="t">' + b.label + '</span><span class="s">' + b.sub + '</span><span class="got">' +
                        got.map(c => '<span class="tr-mini">' + tileSVG(c.cell) + '<b>' + c.id + '</b></span>').join('') + '</span>';
                    el.addEventListener('click', () => {
                        if (selected) attempt(selected, b.k);
                        else { msg = { cls: '', html: 'Choose a cell first, then its box.' }; render(); }
                    });
                    bins.appendChild(el);
                });
                belowEl.appendChild(bins);
                const tray = U.el('div', 'tr-tray');
                CANDIDATES.filter(c => !placed[c.id]).forEach(c => {
                    const t = U.el('button', 'tr-tile' + (selected === c.id ? ' sel' : ''));
                    t.type = 'button';
                    t.setAttribute('data-id', c.id);
                    t.setAttribute('aria-pressed', selected === c.id ? 'true' : 'false');
                    t.setAttribute('aria-label', 'Cell ' + c.id + ': ' + describe(c.cell) + '.');
                    t.innerHTML = tileSVG(c.cell) + '<span class="id">' + c.id + '</span>';
                    wireTile(t, c.id);
                    tray.appendChild(t);
                });
                belowEl.appendChild(tray);
                const m = U.el('p', 'tr-msg' + (msg && msg.cls ? ' ' + msg.cls : ''));
                m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite');
                if (msg) m.innerHTML = msg.html;
                belowEl.appendChild(m);
                if (!left) {
                    const d = U.el('div'); d.innerHTML = doneHTML(); belowEl.appendChild(d.firstChild);
                }
                U.button(btns, 'Start again').addEventListener('click', reset);
            }
            belowEl.appendChild(btns);
        }

        function lock() { if (step === 'predict') { step = 'reveal'; render(); } }
        function reset() {
            step = 'predict';
            guess = { sperm: 4, egg: 4, zygote: 4, clone: 4 };
            placed = {}; selected = null; wrongs = 0; msg = null;
            render();
        }
        reset();

        root._simState = () => ({
            step, guess: Object.assign({}, guess), truth: Object.assign({}, TRUTH),
            candidates: CANDIDATES.map(c => ({ id: c.id, bin: c.bin, why: c.why, n: c.cell.length })),
            placed: Object.assign({}, placed), selected, wrongs,
            remaining: CANDIDATES.filter(c => !placed[c.id]).map(c => c.id),
            complete: step === 'sort' && CANDIDATES.every(c => placed[c.id])
        });
        root._simSolve = () => {
            guess = Object.assign({}, TRUTH);
            step = 'sort';
            CANDIDATES.forEach(c => { placed[c.id] = c.bin; });
            selected = null; msg = null;
            render();
        };
        root._simAttempt = attempt;   // exposed for verification only
    };
    window.SIMS['u4-two-routes'].model = { classify, diagnose, CANDIDATES, TRUTH, PARENT1, PARENT2, PARENT_A };
})();
