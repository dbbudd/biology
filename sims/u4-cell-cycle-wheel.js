/* =============================================================
   INTERACTIVE — The cell cycle, to scale
   -------------------------------------------------------------
   Registers window.SIMS['u4-cell-cycle-wheel'].  Supports HS-LS1-4.

   Replaces a hand-typed wheel whose arc endpoints were wrong (its
   wedges measured 113/94/63/90 degrees against a caption that said
   "drawn to scale"). Every angle here is computed from one model,
   PHASES, at 15 degrees per hour, so the drawing cannot drift away
   from the numbers again.

   Three steps, and the reader commits before each explanation:

   1. PREDICT — four equal wedges. An illustrated cell sits at the
      hour each phase BEGINS, and the reader drags the S, G2 and M
      cells to show how they think 24 hours are shared out. The G1
      cell is fixed at the top: G1 begins the moment the cell is made.
      The handles are placed at phase starts rather than in the middle
      of each wedge because a handle has to mark one exact hour, and a
      wedge's middle does not. The misconception this targets is that
      mitosis IS the cycle; matching pictures to wedges alone would
      never surface it.
   2. REVEAL — the wheel animates to the real proportions, the guess
      is left behind as dashed lines, each cell rides its boundary to
      where that phase really begins, and the feedback is computed from
      the size of the reader's own error.
   3. PLACE — five cells frozen at one instant. Four belong on the
      wheel and one (a neuron) has left it for G0. Each cell is told
      apart by features a student can actually see: how many copies
      of each thread, how many centrosomes, whether there is still a
      nucleus. A G1 cell dropped on G0 gets its own answer, because
      inside, the two genuinely look alike.

   Durations are typical textbook values for a human cell dividing
   in culture: G1 11 h, S 8 h, G2 4 h, M 1 h.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4ccw-style';

    /* ---- the model --------------------------------------------------- */
    const TOTAL = 24;
    const PHASES = [
        { k: 'G1', h: 11, does: 'grow and work',
          sig: 'A G<sub>1</sub> cell was made by a division only hours ago: it is small, it has one centrosome, and each chromosome is a single unwound thread.',
          miss: 'G<sub>1</sub> is the longest phase. It is the cell’s working life — growing and doing its job — and it is where a cell that is not going to divide again leaves the cycle.' },
        { k: 'S', h: 8, does: 'copy the DNA',
          sig: 'A cell in S is part-way through copying its DNA, so each thread is doubled along some of its length and still single along the rest.',
          miss: 'Copying the six billion or so base pairs of a human genome, and proofreading them, takes about 8 hours — a third of the whole cycle.' },
        { k: 'G2', h: 4, does: 'grow and check',
          sig: 'A G<sub>2</sub> cell has finished copying: it is large, it has two centrosomes, and every thread is doubled along its whole length — but still unwound, inside a nucleus.',
          miss: 'G<sub>2</sub> is short. The copying is already finished; the cell grows a little more and checks the copy before it commits to dividing.' },
        { k: 'M', h: 1, does: 'divide',
          sig: 'In M the nucleus has broken down, and the chromosomes have wound up into short, thick X shapes that spindle fibres are pulling on.' }
    ];
    const G0 = { k: 'G0',
        sig: 'G<sub>0</sub> is for cells that have left the cycle: alive, often specialised, doing a job, and not preparing to divide at all.' };
    const PH = {};
    PHASES.forEach(p => { PH[p.k] = p; });
    PH.G0 = G0;

    // boundaries in hours, computed rather than typed: [0, 11, 19, 23, 24]
    const TRUTH = PHASES.reduce((b, p) => { b.push(b[b.length - 1] + p.h); return b; }, [0]);

    // The illustrated cell for each phase, from images/u4/. M's is a cell
    // mid-split, so it is wide and gets a pill-shaped frame.
    const PIC = {
        G1: { src: 'cycle-g1.png', wide: false,
              alt: 'A round cell whose nucleus holds a loose tangle of thin thread.' },
        S:  { src: 'cycle-s.png', wide: false,
              alt: 'A round cell whose nucleus holds loose, darker threads.' },
        // alt text describes what these images actually show; update it with the image
        G2: { src: 'cycle-g2.png', wide: false,
              alt: 'A round cell whose nucleus holds short, thick X-shaped chromosomes.' },
        M:  { src: 'cycle-m.png', wide: true,
              alt: 'A cell pinching in two, with a nucleus of X-shaped chromosomes in each half.' }
    };

    /* ---- geometry ------------------------------------------------------ */
    // The cells ride an outer orbit, each on the line where its phase begins.
    // Every position that line can reach keeps the picture inside the box, and
    // with the real answer the S cell at 165 degrees still clears the G0 box.
    const W = 520, C = 260, R = 165, HUB = 50, ORB = 220, IMG = 34, DOCKR = 28;
    const PER_H = 360 / TOTAL;
    const M_HIT = 15;          // M is 15 degrees wide; accept drops within 15 degrees of its middle
    const DOCK = { x: 392, y: 400, w: 118, h: 104 };
    // the angle two neighbouring pictures need so they do not touch: the widest
    // pair is M's pill (half-width 1.1 x IMG) beside a round frame, plus strokes
    // and a small gap — 20.5 degrees at this orbit
    const MIN_SEP = 2 * Math.asin((1.1 * IMG + IMG + 7) / (2 * ORB)) * 180 / Math.PI;

    const r2 = n => Math.round(n * 100) / 100;
    function pt(deg, r) {
        const a = deg * Math.PI / 180;
        return [r2(C + r * Math.sin(a)), r2(C - r * Math.cos(a))];
    }
    function angleOf(x, y) {
        const a = Math.atan2(x - C, C - y) * 180 / Math.PI;
        return (a + 360) % 360;
    }
    function angDist(a, b) {
        const d = Math.abs(a - b) % 360;
        return d > 180 ? 360 - d : d;
    }
    function wedgePath(h0, h1) {
        const a0 = h0 * PER_H, a1 = h1 * PER_H;
        const p0 = pt(a0, R), p1 = pt(a1, R);
        return 'M' + C + ' ' + C + ' L' + p0[0] + ' ' + p0[1] +
            ' A' + R + ' ' + R + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + p1[0] + ' ' + p1[1] + ' Z';
    }
    const durations = b => PHASES.map((p, i) => b[i + 1] - b[i]);

    const nameHTML = k => k.length === 2 ? k[0] + '<sub>' + k[1] + '</sub>' : k;
    const nameSVG = k => k.length === 2
        ? k[0] + '<tspan class="ccw-sub" dy="5">' + k[1] + '</tspan>' : k;

    /* ---- the cells ------------------------------------------------------
       Drawn in a 100 x 100 box. Chromatin is generated rather than typed:
       one wavy centre line, drawn as two strands that are pulled apart
       wherever the thread has been copied. Where the separation is zero
       the two strands overlap and read as one thread. */
    function thread(x0, y0, len, amp, periods, copied, joined) {
        // The wave is kept well below the separation: when the two were
        // similar, copied stretches read as two strands crossing, not as
        // two copies lying side by side. A fully copied thread is joined
        // at its middle; without that, two doubled threads read as four.
        const N = 30, SEP = 2.9, top = [], bot = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const w = t * periods * 2 * Math.PI;
            const x = x0 + len * t;
            const y = y0 + amp * Math.sin(w);
            let s;
            if (copied >= 1) s = SEP;
            else {
                const u = Math.max(0, Math.min(1, (copied - t) / 0.16 + 0.5));
                s = SEP * u * u * (3 - 2 * u);
            }
            if (joined) s *= Math.min(1, Math.abs(t - 0.5) / 0.1);
            // offset perpendicular to the thread, so the gap stays even on the slopes
            const slope = amp * periods * 2 * Math.PI * Math.cos(w) / len;
            const nx = -slope / Math.hypot(1, slope), ny = 1 / Math.hypot(1, slope);
            top.push([r2(x - nx * s), r2(y - ny * s)]); bot.push([r2(x + nx * s), r2(y + ny * s)]);
        }
        const d = pts => 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L');
        return '<path class="ccw-dna" d="' + d(top) + '"/><path class="ccw-dna" d="' + d(bot) + '"/>';
    }
    const cen = (x, y) => '<circle class="ccw-cen" cx="' + x + '" cy="' + y + '" r="3.4"/>';

    const CELL = {
        G1: () =>
            '<circle class="ccw-mem" cx="50" cy="50" r="30"/>' +
            '<circle class="ccw-nuc" cx="50" cy="50" r="17"/>' +
            thread(38, 44, 24, 1.3, 1, 0) + thread(38, 56, 24, 1.2, 0.8, 0) +
            cen(64, 33),
        S: () =>
            '<circle class="ccw-mem" cx="50" cy="50" r="35"/>' +
            '<circle class="ccw-nuc" cx="50" cy="50" r="20"/>' +
            thread(36, 42, 28, 1.3, 1, 0.6) + thread(36, 58, 28, 1.2, 0.8, 0.45) +
            cen(69, 27) + cen(75, 33),
        G2: () =>
            '<circle class="ccw-mem" cx="50" cy="50" r="41"/>' +
            '<circle class="ccw-nuc" cx="50" cy="50" r="23"/>' +
            thread(34, 38, 32, 1.3, 1, 1, true) + thread(34, 62, 32, 1.2, 0.8, 1, true) +
            cen(70, 21) + cen(80, 34),
        M: () => {
            let s = '<ellipse class="ccw-mem" cx="50" cy="50" rx="42" ry="36"/>';
            [[14, 50], [86, 50]].forEach(p => {
                [26, 38, 62, 74].forEach(y => {
                    s += '<line class="ccw-spin" x1="' + p[0] + '" y1="' + p[1] + '" x2="50" y2="' + y + '"/>';
                });
            });
            // each X is two copies joined at the centromere: ")(" drawn touching
            [38, 62].forEach(y => {
                s += '<path class="ccw-chr" d="M46.5 ' + (y - 9) + ' Q51.5 ' + y + ' 46.5 ' + (y + 9) + '"/>' +
                     '<path class="ccw-chr" d="M53.5 ' + (y - 9) + ' Q48.5 ' + y + ' 53.5 ' + (y + 9) + '"/>';
            });
            return s + cen(14, 50) + cen(86, 50);
        },
        G0: () =>
            '<path class="ccw-neurite" d="M24 42 L13 28 M17 33 L7 33 M24 58 L12 72 M16 67 L8 67 ' +
            'M30 36 L26 18 M28 26 L20 20 M40 37 L46 22 M44 27 L52 24 M48 53 L88 57 ' +
            'M88 57 L96 49 M88 57 L97 59 M88 57 L94 66"/>' +
            '<circle class="ccw-mem" cx="35" cy="50" r="15"/>' +
            '<circle class="ccw-nuc" cx="35" cy="50" r="8"/>' +
            thread(30, 50, 10, 1.3, 1, 0).replace(/ccw-dna/g, 'ccw-dna thin')
    };

    const TILES = [
        { id: 'A', phase: 'G2',
          alt: 'a large cell with a round nucleus. Each of its two threads is doubled along its whole length, the two copies lying side by side and joined in the middle. Two centrosomes beside the nucleus.',
          look: 'Look along the threads in cell A, and count its centrosomes.',
          right: 'Every thread is now doubled end to end, the two identical copies lying side by side and joined in the middle, and there are two centrosomes. The copying is finished; the cell grows a little more and checks the copy before it commits to dividing.' },
        { id: 'B', phase: 'G1',
          alt: 'a small cell with a round nucleus. Inside, two single unwound threads. One centrosome beside the nucleus.',
          look: 'Look along the threads in cell B: single, doubled in places, or doubled all the way?',
          right: 'Single threads, one centrosome, a small cell. It was made by a division recently and is now growing and doing its job. G<sub>1</sub> is also the fork in the road: a cell that is not going to divide again leaves the cycle from here.' },
        { id: 'C', phase: 'M',
          alt: 'a rounded cell with no nucleus. Two short thick X-shaped chromosomes are lined up across the middle, with fibres running to them from a centrosome at each end.',
          look: 'Look for the nucleus in cell C.',
          right: 'The nucleus is gone, each chromosome has wound up into a short, thick X — the two copies made in S, joined in the middle — and spindle fibres from the two centrosomes are lining them up. All of this, and the split into two cells afterwards, takes about an hour.' },
        { id: 'D', phase: 'G0',
          alt: 'a nerve cell, with branching extensions on one side and one long fibre on the other. Its small nucleus holds a single unwound thread.',
          look: 'Look at what kind of cell D is. Is it a cell that is getting ready to divide?',
          right: 'A neuron. It left the cycle from G<sub>1</sub> — its threads are single, never copied — and it will very probably never divide again. It is not resting: it is doing the job it specialised for, which is exactly why nerve damage heals so badly.' },
        { id: 'E', phase: 'S',
          alt: 'a medium-sized cell with a round nucleus. Each of its two threads is doubled along part of its length and single along the rest. Two centrosomes close together.',
          look: 'Look along each thread in cell E, from one end to the other. Is it the same all the way along?',
          right: 'Each thread is doubled along part of its length and still single along the rest — you have caught it in the middle of copying. The centrosome has been copied as well, ready for division later.' }
    ];
    const TILE = {};
    TILES.forEach(t => { TILE[t.id] = t; });

    function cellSVG(phase, cls) {
        return '<svg class="' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
            CELL[phase]() + '</svg>';
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.ccw { padding:1rem 1.25rem 1.25rem; }',
            '.ccw { --ccw-G1:hsl(330 46% 44%); --ccw-S:hsl(300 34% 40%); --ccw-G2:hsl(265 36% 45%);',
            '   --ccw-M:hsl(200 62% 34%); --ccw-G0:var(--text-secondary);',
            '   --ccw-dna:#1d4f96; --ccw-cen:#b8741a; --ccw-ok:#2e7d32; --ccw-bad:#aa272f; }',
            '[data-theme="dark"] .ccw { --ccw-dna:#8db6ee; --ccw-cen:#e2b25a; --ccw-ok:#7fc98a; --ccw-bad:#e08a90; }',
            '[data-theme="sepia"] .ccw { --ccw-dna:#2f5480; --ccw-cen:#9a6420; --ccw-ok:#4a6b3d; --ccw-bad:#a04040; }',
            '.ccw-how { font-size:0.8rem; color:var(--text-secondary); margin:0 0 0.8rem; line-height:1.6; }',
            '.ccw-how b { color:var(--text); }',
            '.ccw-stage { border:1px solid var(--border); border-radius:11px; background:var(--bg); padding:0.4rem; }',
            '.ccw-svg { display:block; width:100%; max-width:440px; height:auto; margin:0 auto;',
            '   user-select:none; -webkit-user-select:none; }',
            '.ccw-svg.grab { touch-action:none; cursor:grab; }',
            '.ccw-svg.grabbing { cursor:grabbing; }',
            '.ccw-svg text { font-family:var(--body-font); }',
            '.ccw-w { stroke:var(--bg); stroke-width:2; transition:filter 0.15s; }',
            '.ccw-w:focus { outline:none; stroke:var(--text); stroke-width:3.5; }',
            '.ccw-w.hot { stroke:var(--text); stroke-width:4; filter:brightness(1.18); }',
            '.ccw-w.miss { stroke:var(--ccw-bad); stroke-width:4; }',
            '.ccw-wl { fill:#fff; font-size:22px; font-weight:800; pointer-events:none; }',
            '.ccw-wh { fill:#fff; font-size:14px; font-weight:600; pointer-events:none; opacity:0.95; }',
            '.ccw-sub { font-size:13px; }',
            '.ccw-tick { stroke:var(--text-secondary); stroke-width:1.2; }',
            '.ccw-tick.major { stroke-width:2; }',
            '.ccw-dir { fill:none; stroke:var(--text-secondary); stroke-width:1.6; }',
            '.ccw-arrowhead { fill:var(--text-secondary); }',
            '.ccw-hub { fill:var(--bg); stroke:var(--text-secondary); stroke-width:1.4; }',
            '.ccw-hub-t { fill:var(--text); font-size:19px; font-weight:800; }',
            '.ccw-hub-s { fill:var(--text-secondary); font-size:12px; }',
            '.ccw-guess { stroke:var(--text); stroke-width:2.2; stroke-dasharray:5 4; opacity:0.85; pointer-events:none; }',
            // the illustrated cells: handles while predicting, labels afterwards
            '.ccw-frame { fill:var(--bg); stroke-width:3; }',
            '.ccw-pic.move { cursor:grab; }',
            '.ccw-pic.move .ccw-frame { filter:drop-shadow(0 2px 3px rgba(0,0,0,0.22)); }',
            '.ccw-pic:focus { outline:none; } .ccw-pic:focus .ccw-frame { stroke:var(--light-teal); stroke-width:5; }',
            '.ccw-pic image { pointer-events:none; }',
            '.ccw-stem { stroke-width:2.5; pointer-events:none; }',
            '.ccw-pin { stroke:var(--bg); stroke-width:2; pointer-events:none; }',
            '.ccw-off { display:none; }',
            '.ccw-dock { fill:var(--bg-surface); stroke:var(--text-secondary); stroke-width:1.5; stroke-dasharray:5 4; }',
            '.ccw-dock:focus { outline:none; stroke:var(--text); stroke-width:3; }',
            '.ccw-dock.hot { stroke:var(--text); stroke-width:3; stroke-dasharray:none; }',
            '.ccw-dock.miss { stroke:var(--ccw-bad); stroke-width:3; stroke-dasharray:none; }',
            '.ccw-dock-t { fill:var(--text); font-size:12px; font-weight:700; }',
            '.ccw-lead { stroke:var(--text-secondary); stroke-width:1.3; }',
            '.ccw-tok { fill:var(--bg); stroke-width:3; }',
            // cell drawings, shared by tiles, tokens and the drag ghost
            '.ccw-mem { fill:var(--bg-surface); stroke:var(--text-secondary); stroke-width:2; }',
            '.ccw-nuc { fill:var(--bg); stroke:var(--text-secondary); stroke-width:1.4; }',
            '.ccw-dna { fill:none; stroke:var(--ccw-dna); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }',
            '.ccw-dna.thin { stroke-width:1.5; }',
            '.ccw-chr { fill:none; stroke:var(--ccw-dna); stroke-width:3.6; stroke-linecap:round; }',
            '.ccw-cen { fill:var(--ccw-cen); }',
            '.ccw-spin { stroke:var(--text-secondary); stroke-width:0.9; opacity:0.55; }',
            '.ccw-neurite { fill:none; stroke:var(--text-secondary); stroke-width:2.4; stroke-linecap:round; }',
            // readout while predicting
            '.ccw-read { display:flex; flex-wrap:wrap; gap:0.4rem 0.9rem; margin:0.8rem 0 0; font-size:0.8rem; }',
            '.ccw-chip { display:inline-flex; align-items:center; gap:0.4rem; }',
            '.ccw-sw { width:0.8rem; height:0.8rem; border-radius:3px; flex:none; }',
            '.ccw-chip b { font-variant-numeric:tabular-nums; }',
            '.ccw-chip span { color:var(--text-secondary); }',
            '.ccw-tot { font-size:0.76rem; color:var(--text-secondary); margin:0.45rem 0 0; }',
            '.ccw-tot b { color:var(--text); font-variant-numeric:tabular-nums; }',
            // reveal
            '.ccw-fb { font-size:0.84rem; line-height:1.6; margin:0.9rem 0 0; }',
            '.ccw-fb p { margin:0 0 0.55rem; }',
            '.ccw-table { width:100%; border-collapse:collapse; font-size:0.8rem; margin:0.6rem 0 0; }',
            '.ccw-table th, .ccw-table td { padding:0.35rem 0.5rem; border-bottom:1px solid var(--border);',
            '   text-align:right; font-variant-numeric:tabular-nums; }',
            '.ccw-table th:first-child, .ccw-table td:first-child { text-align:left; }',
            '.ccw-table th { font-size:0.68rem; letter-spacing:0.05em; text-transform:uppercase;',
            '   color:var(--text-secondary); }',
            '.ccw-table tr.sum td { font-weight:700; border-bottom:none; }',
            '.ccw-details { margin:0.9rem 0 0; font-size:0.8rem; }',
            '.ccw-details summary { cursor:pointer; color:var(--text-secondary); font-weight:600; }',
            // tray
            '.ccw-tray { display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:center; margin:0.8rem 0 0; }',
            '.ccw-tile { font:inherit; position:relative; width:6.2rem; padding:0.3rem 0.3rem 0.2rem;',
            '   border:1px solid var(--border); border-radius:10px; background:var(--bg); color:var(--text);',
            '   cursor:grab; touch-action:none; display:flex; flex-direction:column; align-items:center; }',
            '.ccw-tile svg { width:5.5rem; height:5.5rem; display:block; pointer-events:none; }',
            '.ccw-tile .id { font-size:0.74rem; font-weight:800; line-height:1.2; }',
            '.ccw-tile:hover { border-color:var(--light-teal); }',
            '.ccw-tile.sel { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.ccw-tile.lift { opacity:0.35; }',
            '.ccw-tile.done { cursor:default; opacity:0.5; }',
            '.ccw-tile .tag { position:absolute; top:0.2rem; right:0.25rem; font-size:0.62rem; font-weight:800;',
            '   color:#fff; border-radius:4px; padding:0 0.25rem; }',
            '.ccw-ghost { position:fixed; left:0; top:0; width:4.8rem; height:4.8rem; pointer-events:none;',
            '   z-index:1000; border:1px solid var(--light-teal); border-radius:50%; background:var(--bg);',
            '   box-shadow:0 6px 18px rgba(0,0,0,0.25); }',
            '.ccw-ghost svg { width:100%; height:100%; display:block; }',
            '.ccw-msg { font-size:0.83rem; line-height:1.6; margin:0.7rem 0 0; min-height:2.4em; }',
            '.ccw-msg.ok { color:var(--ccw-ok); } .ccw-msg.bad { color:var(--ccw-bad); }',
            '.ccw-msg b { color:var(--text); }',
            '.ccw-done { margin-top:0.9rem; border:1px solid var(--ccw-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; font-size:0.84rem; line-height:1.6; }',
            '[data-theme="dark"] .ccw-done { background:rgba(127,201,138,0.12); }',
            '.ccw-done h5 { margin:0 0 0.4rem; font-size:0.9rem; }',
            '.ccw-done p { margin:0 0 0.55rem; } .ccw-done p:last-child { margin-bottom:0; }',
            '.ccw .sim-buttons { padding:0; margin-top:0.9rem; }',
            // phone width: every pixel to the wheel, and five cells in two rows, not three
            '@media (max-width: 480px) {',
            '  .ccw { padding:0.85rem 0.6rem 1rem; }',
            '  .ccw-stage { padding:0.1rem; }',
            '  .ccw-tile { width:5.1rem; } .ccw-tile svg { width:4.5rem; height:4.5rem; }',
            '  .ccw-tray { gap:0.4rem; }',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-cell-cycle-wheel'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'ccw');
        root.appendChild(wrap);
        const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

        let step = 'predict';          // predict -> reveal -> place
        let guess = [0, 6, 12, 18, 24]; // whole-hour boundaries
        let shown = guess.slice();      // what is drawn; fractional while animating
        let placed = {};                // tile id -> phase
        let selected = null;
        let wrongs = 0;
        let msg = null;
        let anim = null;

        const IMG_ROOT = (document.body.dataset.root || '../') + 'images/u4/';

        const howEl = U.el('p', 'ccw-how');
        const stageEl = U.el('div', 'ccw-stage');
        const belowEl = U.el('div');
        wrap.appendChild(howEl); wrap.appendChild(stageEl); wrap.appendChild(belowEl);

        /* ---- the wheel, built once and updated in place ---------------- */
        function wheelSVG() {
            let s = '<svg class="ccw-svg" viewBox="0 0 ' + W + ' ' + W + '" xmlns="http://www.w3.org/2000/svg" ' +
                'role="group" aria-label="The cell cycle as a 24-hour wheel, read clockwise from the top">';
            s += '<defs><marker id="ccw-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" ' +
                'markerHeight="6" orient="auto"><path class="ccw-arrowhead" d="M0 0 L10 5 L0 10 z"/></marker></defs>';
            // hour ticks: one per hour, longer every six. No hour numbers: the cells
            // ride the ring where they would be, and the readout gives the hours.
            for (let h = 0; h < TOTAL; h++) {
                const major = h % 6 === 0;
                const a = pt(h * PER_H, R + 3), b = pt(h * PER_H, R + (major ? 17 : 11));
                s += '<line class="ccw-tick' + (major ? ' major' : '') + '" x1="' + a[0] + '" y1="' + a[1] +
                    '" x2="' + b[0] + '" y2="' + b[1] + '"/>';
            }
            PHASES.forEach(p => {
                s += '<path class="ccw-w" data-k="' + p.k + '" style="fill:var(--ccw-' + p.k + ')"/>';
            });
            for (let i = 1; i <= 3; i++) s += '<line class="ccw-guess ccw-off" data-g="' + i + '"/>';
            PHASES.forEach(p => {
                s += '<text class="ccw-wl" data-l="' + p.k + '" text-anchor="middle">' + nameSVG(p.k) + '</text>' +
                     '<text class="ccw-wh" data-lh="' + p.k + '" text-anchor="middle"></text>';
            });
            s += '<circle class="ccw-hub" cx="' + C + '" cy="' + C + '" r="' + HUB + '"/>' +
                '<text class="ccw-hub-t" x="' + C + '" y="' + (C + 2) + '" text-anchor="middle">24 h</text>' +
                '<text class="ccw-hub-s" x="' + C + '" y="' + (C + 18) + '" text-anchor="middle">clockwise</text>';
            // G0: outside the wheel, reached from G1
            const a0 = pt(128, R + 20);
            s += '<g class="ccw-g0 ccw-off">' +
                '<path class="ccw-dir" d="M' + a0[0] + ' ' + a0[1] + ' Q ' + (DOCK.x + 12) + ' ' + (a0[1] + 4) +
                ' ' + (DOCK.x + 30) + ' ' + (DOCK.y - 3) + '" marker-end="url(#ccw-ah)"/>' +
                '<rect class="ccw-dock" data-k="G0" x="' + DOCK.x + '" y="' + DOCK.y + '" width="' + DOCK.w +
                '" height="' + DOCK.h + '" rx="12"/>' +
                '<text class="ccw-dock-t" x="' + (DOCK.x + DOCK.w / 2) + '" y="' + (DOCK.y + 20) +
                '" text-anchor="middle" pointer-events="none">G<tspan class="ccw-sub" dy="4">0</tspan>' +
                '<tspan dy="-4">: left the cycle</tspan></text></g>';
            s += '<g class="ccw-tokens"></g>';
            // stems and pins sit under the cells; the cells are drawn last so they stay on top
            PHASES.forEach(p => {
                s += '<line class="ccw-stem" data-s="' + p.k + '" style="stroke:var(--ccw-' + p.k + ')"/>' +
                     '<circle class="ccw-pin" data-p="' + p.k + '" r="5.5" style="fill:var(--ccw-' + p.k + ')"/>';
            });
            s += '<g class="ccw-pics">';
            PHASES.forEach(p => {
                const pic = PIC[p.k], move = p.k !== 'G1';
                const frame = pic.wide
                    ? '<rect class="ccw-frame" x="' + (-1.1 * IMG) + '" y="' + (-0.78 * IMG) + '" width="' + (2.2 * IMG) +
                      '" height="' + (1.56 * IMG) + '" rx="' + (0.78 * IMG) + '" style="stroke:var(--ccw-' + p.k + ')"/>'
                    : '<circle class="ccw-frame" r="' + IMG + '" style="stroke:var(--ccw-' + p.k + ')"/>';
                // M's pill is capped at 1.1 x IMG wide: at the 6 h and 18 h positions it sits
                // 40 units from the edge of the box, and any wider it is cut off
                const iw = pic.wide ? 2.0 * IMG : 1.72 * IMG, ih = pic.wide ? 1.3 * IMG : 1.72 * IMG;
                s += '<g class="ccw-pic' + (move ? ' move' : '') + '" data-c="' + p.k + '"' +
                    (move ? ' tabindex="0" role="slider" aria-valuemin="1" aria-valuemax="23"' : ' role="img"') + '>' +
                    '<title>' + pic.alt + '</title>' + frame +
                    '<image href="' + IMG_ROOT + pic.src + '" x="' + r2(-iw / 2) + '" y="' + r2(-ih / 2) +
                    '" width="' + r2(iw) + '" height="' + r2(ih) + '" preserveAspectRatio="xMidYMid meet"/></g>';
            });
            s += '</g></svg>';
            return s;
        }
        stageEl.innerHTML = wheelSVG();
        const svg = stageEl.querySelector('svg');
        const wedges = {}, labels = {}, hours = {}, pics = {}, stems = {}, pins = {};
        PHASES.forEach(p => {
            wedges[p.k] = svg.querySelector('[data-k="' + p.k + '"]');
            labels[p.k] = svg.querySelector('[data-l="' + p.k + '"]');
            hours[p.k] = svg.querySelector('[data-lh="' + p.k + '"]');
            pics[p.k] = svg.querySelector('[data-c="' + p.k + '"]');
            stems[p.k] = svg.querySelector('[data-s="' + p.k + '"]');
            pins[p.k] = svg.querySelector('[data-p="' + p.k + '"]');
        });
        const picLayer = svg.querySelector('.ccw-pics');
        const dock = svg.querySelector('.ccw-dock');
        const g0 = svg.querySelector('.ccw-g0');
        const guessLines = [null, 1, 2, 3].map(i => i && svg.querySelector('[data-g="' + i + '"]'));
        const tokens = svg.querySelector('.ccw-tokens');

        // Where each cell is drawn. Every cell belongs on the line where its phase
        // begins — during the guess, through the reveal, and after it. But a 1-hour
        // phase puts two lines only 15 degrees apart, and the pictures need MIN_SEP,
        // so any crowded neighbours are eased apart just enough to clear. The stem
        // and pin stay on the exact line; only the picture moves, never by more than
        // 8.3 degrees (checked over all 1,771 legal whole-hour guesses).
        function picDegrees() {
            const a = PHASES.map((p, i) => shown[i] * PER_H);
            for (let it = 0; it < 60; it++) {
                let moved = false;
                for (let i = 0; i < a.length; i++) {
                    const j = (i + 1) % a.length;
                    const next = j === 0 ? a[0] + 360 : a[j];
                    const gap = next - a[i];
                    if (gap < MIN_SEP - 0.01) {
                        const push = (MIN_SEP - gap) / 2;
                        a[i] -= push;
                        a[j] += push;
                        moved = true;
                    }
                }
                if (!moved) break;
            }
            return a;
        }
        const setLine = (el, a, b) => {
            el.setAttribute('x1', a[0]); el.setAttribute('y1', a[1]);
            el.setAttribute('x2', b[0]); el.setAttribute('y2', b[1]);
        };

        function draw() {
            const picAt = picDegrees();
            PHASES.forEach((p, i) => {
                const h0 = shown[i], h1 = shown[i + 1];
                wedges[p.k].setAttribute('d', wedgePath(h0, h1));
                const span = (h1 - h0) * PER_H, mid = (h0 + h1) / 2 * PER_H;
                const narrow = span < 40;
                // a wedge too thin for a stacked label gets name and hours placed
                // one above the other along its length instead
                const n = pt(mid, narrow ? R * 0.84 : R * 0.64);
                labels[p.k].setAttribute('x', n[0]);
                labels[p.k].setAttribute('y', n[1] + (narrow ? 7 : 0));
                const hp = narrow ? pt(mid, R * 0.63) : [n[0], n[1] + 20];
                hours[p.k].setAttribute('x', hp[0]);
                hours[p.k].setAttribute('y', hp[1] + (narrow ? 5 : 0));
                hours[p.k].textContent = Math.round(h1 - h0) + ' h';

                const line = shown[i] * PER_H, c = pt(picAt[i], ORB);
                pics[p.k].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ')');
                const predicting = step === 'predict';
                // the stem and pin mark the exact hour the phase begins, in every step;
                // the stem runs to the picture's centre and the picture covers its end
                setLine(stems[p.k], pt(line, R), c);
                const pin = pt(line, R);
                pins[p.k].setAttribute('cx', pin[0]); pins[p.k].setAttribute('cy', pin[1]);
                if (i > 0) {
                    pics[p.k].classList.toggle('move', predicting);
                    if (predicting) {
                        pics[p.k].setAttribute('tabindex', '0');
                        pics[p.k].setAttribute('aria-valuenow', guess[i]);
                        pics[p.k].setAttribute('aria-label', p.k + ' cell: ' + p.k + ' begins at hour ' + guess[i] +
                            '. ' + PIC[p.k].alt);
                    } else {
                        pics[p.k].removeAttribute('tabindex');
                        pics[p.k].setAttribute('aria-label', p.k + ': ' + p.h + (p.h === 1 ? ' hour. ' : ' hours. ') +
                            PIC[p.k].alt);
                    }
                } else {
                    pics[p.k].setAttribute('aria-label', 'G1 cell, fixed at hour 0: G1 begins the moment the cell ' +
                        'is made. ' + PIC[p.k].alt);
                }
            });
            for (let i = 1; i <= 3; i++) {
                setLine(guessLines[i], pt(guess[i] * PER_H, HUB), pt(guess[i] * PER_H, R + 2));
                guessLines[i].classList.toggle('ccw-off', step === 'predict');
            }
            g0.classList.toggle('ccw-off', step !== 'place');
            svg.classList.toggle('grab', step === 'predict');
            PHASES.forEach(p => {
                const w = wedges[p.k];
                if (step === 'place') {
                    w.setAttribute('tabindex', '0'); w.setAttribute('role', 'button');
                    w.setAttribute('aria-label', 'Place the selected cell in ' + p.k + ' (' + p.h + (p.h === 1 ? ' hour)' : ' hours)'));
                } else {
                    w.removeAttribute('tabindex'); w.removeAttribute('role'); w.removeAttribute('aria-label');
                }
            });
            if (step === 'place') {
                dock.setAttribute('tabindex', '0'); dock.setAttribute('role', 'button');
                dock.setAttribute('aria-label', 'Place the selected cell in G0, outside the cycle');
            }
            drawTokens();
        }

        // The wheel already carries an illustrated cell for every phase, so a
        // correctly placed diagram is marked in the tray, not drawn again on the
        // wheel. Only the neuron has somewhere of its own to go.
        function drawTokens() {
            let s = '';
            if (Object.keys(placed).some(id => placed[id] === 'G0')) {
                const x = DOCK.x + DOCK.w / 2, y = DOCK.y + DOCK.h / 2 + 12;
                s += '<circle class="ccw-tok" cx="' + x + '" cy="' + y + '" r="' + DOCKR + '" style="stroke:var(--ccw-G0)"/>' +
                    '<svg x="' + (x - DOCKR + 3) + '" y="' + (y - DOCKR + 3) + '" width="' + (2 * DOCKR - 6) +
                    '" height="' + (2 * DOCKR - 6) + '" viewBox="0 0 100 100">' + CELL.G0() + '</svg>';
            }
            tokens.innerHTML = s;
        }

        /* ---- predict: dragging the cells -------------------------------- */
        function toSvg(clientX, clientY) {
            const m = svg.getScreenCTM();
            if (!m) return null;
            const p = svg.createSVGPoint();
            p.x = clientX; p.y = clientY;
            return p.matrixTransform(m.inverse());
        }
        function setBoundary(i, hour) {
            const lo = guess[i - 1] + 1, hi = guess[i + 1] - 1;
            const h = Math.max(lo, Math.min(hi, hour));
            if (h === guess[i]) return;
            guess[i] = h; shown = guess.slice();
            draw(); updateReadout();
        }
        function moveTo(i, deg) {
            // The same angle can be read as this turn of the clock or the next. Take
            // the reading the handle can actually reach (least clamped by its
            // neighbours): a fast flick across the wheel then lands where it was
            // aimed, and dragging M past the top parks it at 23 h instead of
            // snapping it back round to G2. Ties go to the reading nearest the handle.
            const raw = deg / PER_H, lo = guess[i - 1] + 1, hi = guess[i + 1] - 1;
            const cost = c => Math.abs(Math.max(lo, Math.min(hi, c)) - c);
            const c = [raw - TOTAL, raw, raw + TOTAL].reduce((a, b) =>
                cost(b) < cost(a) - 1e-9 || (Math.abs(cost(b) - cost(a)) < 1e-9 &&
                    Math.abs(b - guess[i]) < Math.abs(a - guess[i])) ? b : a);
            setBoundary(i, Math.round(c));
        }
        // What a press grabs: a movable cell under the pointer (nearest, if two
        // overlap), or — for a press inside the wheel — the nearest movable phase
        // start. A press on or nearest to the fixed G1 cell grabs nothing, so it
        // cannot yank some other cell across the wheel.
        function grabAt(p) {
            const r = Math.hypot(p.x - C, p.y - C);
            let best = null, bd = Infinity;
            const picAt = picDegrees();          // where the pictures actually are
            for (let i = 1; i <= 3; i++) {
                const c = pt(picAt[i], ORB);
                const d = Math.hypot(p.x - c[0], p.y - c[1]);
                if (d <= IMG * 1.3 && d < bd) { best = i; bd = d; }
            }
            if (best !== null) return best;
            if (r < 20 || r > R + 8) return null;
            const a = angleOf(p.x, p.y);
            best = 1;
            for (let i = 2; i <= 3; i++)
                if (angDist(a, guess[i] * PER_H) < angDist(a, guess[best] * PER_H)) best = i;
            return angDist(a, 0) < angDist(a, guess[best] * PER_H) ? null : best;
        }
        let dragH = null;
        svg.addEventListener('pointerdown', e => {
            if (step !== 'predict') return;
            const p = toSvg(e.clientX, e.clientY);
            if (!p) return;
            const best = grabAt(p);
            if (best === null) return;
            dragH = best;
            svg.setPointerCapture(e.pointerId);
            svg.classList.add('grabbing');
            const el = pics[PHASES[best].k];
            picLayer.appendChild(el);          // the cell being dragged goes on top
            el.focus({ preventScroll: true });
            moveTo(best, angleOf(p.x, p.y));
            e.preventDefault();
        });
        svg.addEventListener('pointermove', e => {
            if (dragH === null) return;
            const p = toSvg(e.clientX, e.clientY);
            if (p) moveTo(dragH, angleOf(p.x, p.y));
        });
        const endH = () => { dragH = null; svg.classList.remove('grabbing'); };
        svg.addEventListener('pointerup', endH);
        svg.addEventListener('pointercancel', endH);
        PHASES.forEach((p, i) => {
            if (i === 0) return;
            pics[p.k].addEventListener('keydown', e => {
                if (step !== 'predict') return;
                const k = e.key;
                if (k === 'ArrowRight' || k === 'ArrowUp') setBoundary(i, guess[i] + 1);
                else if (k === 'ArrowLeft' || k === 'ArrowDown') setBoundary(i, guess[i] - 1);
                else if (k === 'Home') setBoundary(i, 0);
                else if (k === 'End') setBoundary(i, TOTAL);
                else return;
                e.preventDefault();
            });
        });

        /* ---- place: hit-testing drops ----------------------------------- */
        function hitTest(clientX, clientY) {
            const p = toSvg(clientX, clientY);
            if (!p) return null;
            if (p.x >= DOCK.x - 12 && p.x <= DOCK.x + DOCK.w + 12 &&
                p.y >= DOCK.y - 24 && p.y <= DOCK.y + DOCK.h + 12) return 'G0';
            const r = Math.hypot(p.x - C, p.y - C);
            if (r < 26 || r > ORB + IMG * 1.3) return null;
            const a = angleOf(p.x, p.y);
            // M is one hour: widen its catchment so a finger can hit it. The
            // wedge that will receive the drop lights up, so the widening is visible.
            const mMid = (TRUTH[3] + TRUTH[4]) / 2 * PER_H;
            if (angDist(a, mMid) <= M_HIT) return 'M';
            const h = a / PER_H;
            for (let i = 0; i < PHASES.length; i++)
                if (h >= TRUTH[i] && h < TRUTH[i + 1]) return PHASES[i].k;
            return null;
        }
        function setHot(k) {
            PHASES.forEach(p => wedges[p.k].classList.toggle('hot', p.k === k));
            dock.classList.toggle('hot', k === 'G0');
        }
        function flashMiss(k) {
            const el = k === 'G0' ? dock : wedges[k];
            if (!el) return;
            el.classList.add('miss');
            setTimeout(() => el.classList.remove('miss'), 700);
        }

        // byTap: the cell stays selected after a miss, so the next tap can try
        // another phase. A dragged cell is not selected — otherwise the reader's
        // next tap on it would silently deselect it.
        function attempt(id, target, byTap) {
            const t = TILE[id];
            if (!t || placed[id] || !target) return;
            if (t.phase === target) {
                placed[id] = target;
                selected = null;
                msg = { cls: 'ok', html: '<b>Cell ' + id + ' is in ' + nameHTML(target) + '.</b> ' + t.right };
            } else {
                wrongs++;
                selected = byTap ? id : null;
                flashMiss(target);
                if (t.phase === 'G1' && target === 'G0') {
                    msg = { cls: 'bad', html: '<b>Close, but not G<sub>0</sub>.</b> Inside, a G<sub>0</sub> cell ' +
                        'looks much like this one — single threads, one centrosome — because cells leave ' +
                        'the cycle from G<sub>1</sub>. What sets G<sub>0</sub> apart is a cell that has ' +
                        'specialised and stopped preparing to divide. Cell ' + id + ' is a plain, unspecialised ' +
                        'cell; one of the others has much more obviously left the cycle.' };
                } else {
                    msg = { cls: 'bad', html: '<b>Not ' + nameHTML(target) + '.</b> ' + PH[target].sig + ' ' + t.look };
                }
            }
            drawTokens();
            renderBelow();
        }

        svg.addEventListener('click', e => {
            if (step !== 'place' || !selected) return;
            attempt(selected, hitTest(e.clientX, e.clientY), true);
        });
        [dock].concat(PHASES.map(p => wedges[p.k])).forEach(el => {
            el.addEventListener('keydown', e => {
                if (step !== 'place' || (e.key !== 'Enter' && e.key !== ' ')) return;
                e.preventDefault();
                if (selected) attempt(selected, el.getAttribute('data-k'), true);
                else { msg = { cls: '', html: 'Choose a cell first, then its phase.' }; renderBelow(); }
            });
        });

        function wireTile(btn, id) {
            let start = null, dragging = false, ghost = null, hot = null, suppressClick = false;
            btn.addEventListener('pointerdown', e => {
                if (placed[id] || e.button > 0) return;
                start = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
                btn.setPointerCapture(e.pointerId);
            });
            btn.addEventListener('pointermove', e => {
                if (!start) return;
                if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
                    dragging = true;
                    ghost = U.el('div', 'ccw-ghost');
                    ghost.innerHTML = cellSVG(TILE[id].phase);
                    wrap.appendChild(ghost);   // inside .ccw so the theme variables apply
                    btn.classList.add('lift');
                }
                if (dragging) {
                    // on a touch screen, hold the cell above the finger so it stays visible
                    const lift = start.touch ? 1.1 : 0.5;
                    ghost.style.transform = 'translate(' + (e.clientX - ghost.offsetWidth / 2) + 'px,' +
                        (e.clientY - ghost.offsetHeight * lift) + 'px)';
                    hot = hitTest(e.clientX, e.clientY);
                    setHot(hot);
                }
            });
            const finish = drop => {
                if (dragging) {
                    suppressClick = true;
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
                msg = selected ? { cls: '', html: 'Cell ' + id + ' selected. Now tap its phase on the wheel, or tab to it and press Enter.' } : null;
                renderBelow();
                // the tray is rebuilt, so put keyboard focus back on the same cell
                const again = belowEl.querySelector('.ccw-tile[data-id="' + id + '"]');
                if (again) again.focus({ preventScroll: true });
            };
            btn.addEventListener('click', () => {
                if (suppressClick) { suppressClick = false; return; }
                toggle();
            });
            // handled on keydown rather than left to the button's own activation,
            // which not every environment synthesises into a click
            btn.addEventListener('keydown', e => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                toggle();
            });
        }

        /* ---- panels ---------------------------------------------------- */
        function updateReadout() {
            const read = belowEl.querySelector('.ccw-read');
            if (!read) return;
            const d = durations(guess);
            PHASES.forEach((p, i) => {
                read.querySelector('[data-r="' + p.k + '"]').textContent = d[i] + ' h';
            });
            belowEl.querySelector('[data-t="i"]').textContent = (d[0] + d[1] + d[2]) + ' h';
            belowEl.querySelector('[data-t="m"]').textContent = d[3] + ' h';
        }

        function feedbackHTML() {
            const g = durations(guess), t = PHASES.map(p => p.h);
            const gM = g[3], tM = t[3];
            const gI = g[0] + g[1] + g[2], tI = t[0] + t[1] + t[2];
            const pctI = Math.round(100 * tI / TOTAL);
            let out = '<p>';
            if (gM === tM) out += 'You gave mitosis <b>' + gM + ' hour</b>. That is exactly right, and it is the ' +
                'single most important thing on this wheel.';
            else if (gM - tM === 1) out += 'You gave mitosis <b>' + gM + ' hours</b>; it takes about <b>' + tM +
                '</b>. Close — you already knew it was the short part.';
            else out += 'You gave mitosis <b>' + gM + ' hours</b>; it takes about <b>' + tM + '</b>, so you had ' +
                'it ' + (gM / tM) + ' times too long. Pictures of mitosis are big and detailed, which makes it easy ' +
                'to imagine it as most of a cell’s life. It is the last hour of the day.';
            out += '</p><p>Interphase — G<sub>1</sub>, S and G<sub>2</sub> together — is <b>' + tI + ' of the ' +
                TOTAL + ' hours</b>, about ' + pctI + '% of the cycle. You gave it ' + gI + '.</p>';
            let worst = -1, err = 1;
            for (let i = 0; i < 3; i++) {
                if (Math.abs(g[i] - t[i]) > err) { err = Math.abs(g[i] - t[i]); worst = i; }
            }
            if (worst > -1) {
                const p = PHASES[worst];
                out += '<p>Your biggest miss inside interphase was ' + nameHTML(p.k) + ': you gave it ' + g[worst] +
                    ' h, and it takes about ' + p.h + '. ' + p.miss + '</p>';
            } else {
                out += '<p>Every interphase phase was within an hour of the real value.</p>';
            }
            return out;
        }

        function tableHTML() {
            const g = durations(guess);
            const row = (label, gv, tv) => '<tr><td>' + label + '</td><td>' + gv + ' h</td><td>' + tv +
                ' h</td><td>' + Math.round(100 * tv / TOTAL) + '%</td></tr>';
            let s = '<table class="ccw-table"><thead><tr><th>Phase</th><th>Your guess</th><th>Real</th>' +
                '<th>Share of cycle</th></tr></thead><tbody>';
            PHASES.forEach((p, i) => { s += row(nameHTML(p.k) + ' — ' + p.does, g[i], p.h); });
            const gI = g[0] + g[1] + g[2], tI = PHASES[0].h + PHASES[1].h + PHASES[2].h;
            s += '</tbody><tbody>' + row('Interphase', gI, tI).replace('<tr>', '<tr class="sum">') +
                row('Mitotic phase', g[3], PHASES[3].h).replace('<tr>', '<tr class="sum">') + '</tbody></table>';
            return s;
        }

        function doneHTML() {
            const tM = PHASES[3].h, tI = TOTAL - tM;
            const neuron = TILES.filter(t => t.phase === 'G0')[0].id;
            return '<div class="ccw-done"><h5>The whole cycle, to scale</h5>' +
                '<p>Interphase is ' + tI + ' of the ' + TOTAL + ' hours. Everything you think of as “cell ' +
                'division”, from the chromosomes winding up to the cell splitting in two, fits into the last ' +
                (tM === 1 ? 'hour' : tM + ' hours') + '.</p>' +
                '<p>That has a consequence you can measure. Freeze a tissue full of cycling cells at one instant, ' +
                'and the chance of catching any one cell in M is the share of its cycle it spends there — about ' +
                '1 in ' + Math.round(TOTAL / tM) + '. <b>Time spent in a phase shows up as the share of cells in ' +
                'it.</b> Onion root-tip cells spend a larger share of their cycle dividing, so the numbers in ' +
                '<a href="#lab">the lab</a> are higher, but the reasoning is the same.</p>' +
                '<p>And cell ' + neuron + ' is the reminder that most of the cells in your body are not on this wheel ' +
                'at all. They left it at G<sub>1</sub>.</p></div>';
        }

        function renderBelow() {
            belowEl.innerHTML = '';
            const btns = U.el('div', 'sim-buttons');

            if (step === 'predict') {
                howEl.innerHTML = 'A typical human cell growing in a dish goes once around this wheel in about ' +
                    '<b>24 hours</b>. It starts at the top, just after the division that made it, and travels ' +
                    'clockwise until it divides itself. Each cell around the rim marks the hour its phase ' +
                    '<b>begins</b>, and its coloured slice runs clockwise to the next cell. G<sub>1</sub> is fixed ' +
                    'at the top, because it begins the moment the cell is made. Before you are told anything, ' +
                    '<b>guess how the 24 hours are shared out</b>: drag the S, G<sub>2</sub> and M cells round the ' +
                    'wheel (or tab to one and use the arrow keys), then lock in your guess.';
                const read = U.el('div', 'ccw-read');
                read.innerHTML = PHASES.map(p => '<span class="ccw-chip"><i class="ccw-sw" style="background:var(--ccw-' +
                    p.k + ')"></i>' + nameHTML(p.k) + ' <span>' + p.does + '</span> <b data-r="' + p.k + '"></b></span>').join('');
                belowEl.appendChild(read);
                const tot = U.el('p', 'ccw-tot');
                tot.innerHTML = 'Interphase <b data-t="i"></b> · Mitotic phase <b data-t="m"></b>';
                belowEl.appendChild(tot);
                updateReadout();
                U.button(btns, 'Lock in my guess', 'primary').addEventListener('click', lock);
            }

            if (step === 'reveal') {
                howEl.innerHTML = 'This is the real cycle, drawn to scale. <b>Your guess is left behind as dashed ' +
                    'lines.</b>';
                const fb = U.el('div', 'ccw-fb');
                fb.setAttribute('role', 'status');
                fb.innerHTML = feedbackHTML();
                belowEl.appendChild(fb);
                const tb = U.el('div');
                tb.innerHTML = tableHTML();
                belowEl.appendChild(tb);
                U.button(btns, 'Next: place the cells', 'primary').addEventListener('click', () => {
                    step = 'place'; msg = null; draw(); renderBelow();
                });
            }

            if (step === 'place') {
                const left = TILES.filter(t => !placed[t.id]).length;
                howEl.innerHTML = left
                    ? 'Five more cells, frozen at one instant and drawn as diagrams. Four are somewhere on the wheel and <b>one has left it</b>. ' +
                      'Drag each cell to where it belongs, or tap a cell and then tap its phase. Only two ' +
                      'chromosomes are drawn in each cell, to keep them readable.'
                    : 'Every cell is in place.';
                const tray = U.el('div', 'ccw-tray');
                TILES.forEach(t => {
                    const done = !!placed[t.id];
                    const b = U.el('button', 'ccw-tile' + (done ? ' done' : '') + (selected === t.id ? ' sel' : ''));
                    b.type = 'button';
                    b.setAttribute('data-id', t.id);
                    b.setAttribute('aria-pressed', selected === t.id ? 'true' : 'false');
                    b.setAttribute('aria-label', 'Cell ' + t.id + ': ' + t.alt +
                        (done ? ' Placed in ' + t.phase + '.' : ''));
                    if (done) b.setAttribute('aria-disabled', 'true');
                    b.innerHTML = cellSVG(t.phase) + '<span class="id">' + t.id + '</span>' +
                        (done ? '<span class="tag" style="background:var(--ccw-' + t.phase + ')">' +
                            nameHTML(t.phase) + '</span>' : '');
                    wireTile(b, t.id);
                    tray.appendChild(b);
                });
                belowEl.appendChild(tray);
                const m = U.el('p', 'ccw-msg' + (msg && msg.cls ? ' ' + msg.cls : ''));
                m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite');
                if (msg) m.innerHTML = msg.html;
                belowEl.appendChild(m);
                if (!left) {
                    const d = U.el('div');
                    d.innerHTML = doneHTML();
                    belowEl.appendChild(d.firstChild);
                }
                const det = U.el('details', 'ccw-details');
                det.innerHTML = '<summary>Your guess against the real cycle</summary>' + tableHTML();
                belowEl.appendChild(det);
                U.button(btns, 'Start again').addEventListener('click', reset);
            }
            belowEl.appendChild(btns);
        }

        function lock(instant) {
            if (step !== 'predict') return;
            step = 'reveal';
            const from = guess.slice();
            if (anim) cancelAnimationFrame(anim);
            if (instant === true || reduced) { shown = TRUTH.slice(); draw(); renderBelow(); return; }
            const t0 = performance.now(), DUR = 1100;
            const frame = now => {
                const u = Math.min(1, (now - t0) / DUR);
                const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                shown = from.map((v, i) => v + (TRUTH[i] - v) * e);
                draw();
                if (u < 1) anim = requestAnimationFrame(frame);
                else { anim = null; shown = TRUTH.slice(); draw(); }
            };
            draw(); renderBelow();
            anim = requestAnimationFrame(frame);
        }

        function reset() {
            if (anim) cancelAnimationFrame(anim);
            anim = null;
            step = 'predict'; guess = [0, 6, 12, 18, 24]; shown = guess.slice();
            placed = {}; selected = null; wrongs = 0; msg = null;
            draw(); renderBelow();
        }

        draw();
        renderBelow();

        root._simState = () => {
            const g = durations(guess), obj = a => {
                const o = {}; PHASES.forEach((p, i) => { o[p.k] = a[i]; }); return o;
            };
            return {
                step, guess: obj(g), truth: obj(PHASES.map(p => p.h)), boundaries: TRUTH.slice(),
                drawnDegrees: obj(durations(shown).map(h => r2(h * PER_H))),
                placed: Object.assign({}, placed), selected, wrongs,
                remaining: TILES.filter(t => !placed[t.id]).map(t => t.id),
                complete: step === 'place' && TILES.every(t => placed[t.id])
            };
        };
        root._simSolve = () => {
            if (step === 'predict') lock(true);
            if (anim) { cancelAnimationFrame(anim); anim = null; }
            shown = TRUTH.slice();
            step = 'place';
            TILES.forEach(t => { placed[t.id] = t.phase; });
            selected = null;
            msg = null;
            draw(); renderBelow();
        };
        // exposed for verification only: the drop logic the pointer handlers use
        root._simHit = hitTest;
    };
})();
