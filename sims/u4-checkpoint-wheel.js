/* =============================================================
   INTERACTIVE — Three gates on the cell cycle
   -------------------------------------------------------------
   Registers window.SIMS['u4-checkpoint-wheel'].  Supports HS-LS1-4.

   Replaces the former static figure, a wheel with three labelled gates.
   Built on the same to-scale wheel as 'u4-cell-cycle-wheel' in 4.1
   (G1 11 h, S 8 h, G2 4 h, M 1 h at 15 degrees per hour), so the
   reader meets the same picture again and this time adds to it.

   Three steps, and the reader commits before each explanation:

   1. PREDICT — three numbered gates wait under the wheel. Each is
      labelled only by the QUESTION it asks, not by its name. The
      reader drags each onto the rim where they think that question
      has to be asked. Positions snap to half hours.
   2. REVEAL — the gates travel to where each checkpoint really sits,
      the guess stays behind as a dashed stem, and each gate is judged
      from its own position: right, right phase but early, or wrong —
      with the reason tied to the step that gate guards.
   3. SORT — six cells, each with one thing wrong. The reader sends
      each to the gate that would catch it. The answer explains what
      the gate then does: hold for repair, apoptosis, or exit to G0.

   Where the gates sit: the G1 checkpoint late in G1, as the last
   inspection before copying; the G2 checkpoint at the end of G2,
   before mitosis; the M checkpoint in metaphase, part-way through M.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4cpw-style';

    /* ---- the model --------------------------------------------------- */
    const TOTAL = 24;
    const PHASES = [{ k: 'G1', h: 11 }, { k: 'S', h: 8 }, { k: 'G2', h: 4 }, { k: 'M', h: 1 }];
    const BOUND = PHASES.reduce((b, p) => { b.push(b[b.length - 1] + p.h); return b; }, [0]);   // 0 11 19 23 24
    const phaseAt = h => { h = ((h % TOTAL) + TOTAL) % TOTAL; for (let i = 0; i < 4; i++) if (h >= BOUND[i] && h < BOUND[i + 1]) return PHASES[i].k; return 'G1'; };

    const GATES = [
        { k: 'M', n: 1, truth: 23.5, name: 'M checkpoint', when: 'in metaphase, part-way through M',
          q: 'Is every chromosome attached to spindle fibres from <b>both</b> poles?',
          guards: 'anaphase, which pulls the two copies of every chromosome apart' },
        { k: 'G1', n: 2, truth: 10.5, name: 'G<sub>1</sub> checkpoint', when: 'late in G<sub>1</sub>, just before copying',
          q: 'Is the cell big enough, with nutrients and growth signals — and is the DNA it inherited undamaged?',
          guards: 'S, the expensive job of copying three billion base pairs' },
        { k: 'G2', n: 3, truth: 22.5, name: 'G<sub>2</sub> checkpoint', when: 'at the end of G<sub>2</sub>, before mitosis',
          q: 'Did copying finish — and is the new copy undamaged?',
          guards: 'mitosis, the commitment to dividing' }
    ];
    const GATE = {}; GATES.forEach(g => { GATE[g.k] = g; });
    const nameHTML = k => k.length === 2 ? k[0] + '<sub>' + k[1] + '</sub>' : k;
    const nameSVG = k => k.length === 2 ? k[0] + '<tspan class="cpw-sub" dy="5">' + k[1] + '</tspan>' : k;
    const fmtH = h => (h % 1 ? Math.floor(h) + '½' : String(h)) + ' h';
    const pct = h => Math.round(h / TOTAL * 100) + '% of the way round';

    // Judge one gate from where the reader put it. Hours are 0..23.5.
    function judge(k, h) {
        if (k === 'G1') {
            if (h >= 8 && h <= 11) return { s: 'right', t: 'Right — late in G<sub>1</sub>, the last inspection before copying starts.' };
            if (h < 8) return { s: 'close', t: 'Right phase, but early. The G<sub>1</sub> checkpoint sits near the <em>end</em> of G<sub>1</sub>: it is the last inspection before the cell commits to copying its DNA, so the cell has had its working life first.' };
            return { s: 'wrong', t: 'This inspection has to come <em>before</em> copying starts: copying damaged DNA would build the damage into both copies, and S is the most expensive step in the whole cycle.' };
        }
        if (k === 'G2') {
            if (h >= 21 && h <= 23) return { s: 'right', t: 'Right — at the end of G<sub>2</sub>, the last check before mitosis.' };
            if (h >= 19 && h < 21) return { s: 'close', t: 'Right phase, but early. The G<sub>2</sub> checkpoint comes at the <em>end</em> of G<sub>2</sub>, the last check before the cell commits to mitosis.' };
            if (h > 23) return { s: 'wrong', t: 'That is inside mitosis. By then it is too late to inspect the copy: the chromosomes are already wound up and being moved. This is the last check <em>before</em> mitosis begins.' };
            return { s: 'wrong', t: 'This gate asks whether copying finished and whether the new copy is sound — it cannot ask that until S is over.' };
        }
        if (h >= 23) return { s: 'right', t: 'Right — in M, while the chromosomes sit on the middle line in metaphase.' };
        return { s: 'wrong', t: 'This gate asks about attachment to spindle fibres, and there is no spindle until mitosis. It holds the cell in metaphase, just before anaphase pulls the copies apart.' };
    }

    /* ---- cells for the sorting step, drawn in a 100 x 100 box ---------- */
    const r2 = n => Math.round(n * 100) / 100;
    function thread(x0, y0, len, amp, periods, copied, joined) {
        const N = 30, SEP = 2.9, top = [], bot = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N, w = t * periods * 2 * Math.PI, x = x0 + len * t, y = y0 + amp * Math.sin(w);
            let s;
            if (copied >= 1) s = SEP;
            else { const u = Math.max(0, Math.min(1, (copied - t) / 0.16 + 0.5)); s = SEP * u * u * (3 - 2 * u); }
            if (joined) s *= Math.min(1, Math.abs(t - 0.5) / 0.1);
            const slope = amp * periods * 2 * Math.PI * Math.cos(w) / len;
            const nx = -slope / Math.hypot(1, slope), ny = 1 / Math.hypot(1, slope);
            top.push([r2(x - nx * s), r2(y - ny * s)]); bot.push([r2(x + nx * s), r2(y + ny * s)]);
        }
        const d = pts => 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L');
        return '<path class="cpw-dna" d="' + d(top) + '"/><path class="cpw-dna" d="' + d(bot) + '"/>';
    }
    const cen = (x, y) => '<circle class="cpw-cen" cx="' + x + '" cy="' + y + '" r="3.4"/>';
    // a damage mark: a small jagged star
    function dmg(x, y) {
        let d = '';
        for (let i = 0; i < 10; i++) {
            const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 2.6 : 6;
            d += (i ? ' L' : 'M') + r2(x + r * Math.cos(a)) + ' ' + r2(y + r * Math.sin(a));
        }
        return '<path class="cpw-dmg" d="' + d + ' Z"/>';
    }
    // an X chromosome centred at (cx, y): ")(" drawn touching
    const chrX = (cx, y, k) => { const s = k || 1;
        return '<path class="cpw-chr" d="M' + (cx - 3.5 * s) + ' ' + (y - 9 * s) + ' Q' + (cx + 1.5 * s) + ' ' + y + ' ' + (cx - 3.5 * s) + ' ' + (y + 9 * s) + '"/>' +
            '<path class="cpw-chr" d="M' + (cx + 3.5 * s) + ' ' + (y - 9 * s) + ' Q' + (cx - 1.5 * s) + ' ' + y + ' ' + (cx + 3.5 * s) + ' ' + (y + 9 * s) + '"/>'; };
    const fibre = (x1, y1, x2, y2) => '<line class="cpw-spin" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';

    const CELL = {
        A: () => '<circle class="cpw-mem" cx="50" cy="50" r="30"/><circle class="cpw-nuc" cx="50" cy="50" r="17"/>' +
            thread(38, 44, 24, 1.3, 1, 0) + thread(38, 56, 24, 1.2, 0.8, 0) + cen(64, 33) + dmg(47, 43),
        B: () => '<circle class="cpw-mem" cx="50" cy="50" r="41"/><circle class="cpw-nuc" cx="50" cy="50" r="23"/>' +
            thread(34, 38, 32, 1.3, 1, 0.5) + thread(34, 62, 32, 1.2, 0.8, 0.45) + cen(70, 21) + cen(76, 26),
        C: () => {
            let s = '<ellipse class="cpw-mem" cx="50" cy="50" rx="42" ry="36"/>';
            s += fibre(14, 50, 50, 38) + fibre(86, 50, 50, 38) + fibre(14, 50, 50, 62);   // the lower one: left pole only
            return s + chrX(50, 38) + chrX(50, 62) + cen(14, 50) + cen(86, 50);
        },
        D: () => {
            let s = '';
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + Math.PI / 6;
                s += '<circle class="cpw-mem nb" cx="' + r2(50 + 43 * Math.cos(a)) + '" cy="' + r2(50 + 43 * Math.sin(a)) + '" r="21"/>';
            }
            return s + '<circle class="cpw-mem" cx="50" cy="50" r="21"/><circle class="cpw-nuc" cx="50" cy="50" r="11.5"/>' +
                thread(43, 47, 14, 1, 1, 0) + thread(43, 54, 14, 1, 0.8, 0);
        },
        E: () => '<circle class="cpw-mem" cx="50" cy="50" r="41"/><circle class="cpw-nuc" cx="50" cy="50" r="23"/>' +
            thread(34, 38, 32, 1.3, 1, 1, true) + thread(34, 62, 32, 1.2, 0.8, 1, true) + cen(70, 21) + cen(80, 34) + dmg(41, 65),
        F: () => {
            let s = '<ellipse class="cpw-mem" cx="50" cy="50" rx="42" ry="36"/>';
            s += fibre(14, 50, 50, 55) + fibre(86, 50, 50, 55);
            return s + chrX(50, 55) + chrX(69, 30) + cen(14, 50) + cen(86, 50);
        }
    };
    const TILES = [
        { id: 'A', gate: 'G1',
          alt: 'a small cell recently made by division. Its threads are single, not yet copied, and one of them carries a damage mark.',
          look: 'Has cell A copied its DNA yet? Look along its threads.',
          right: 'The DNA is damaged and has not been copied yet, so the G<sub>1</sub> checkpoint catches it. The cell holds while repair enzymes fix the damage; if they cannot, it triggers apoptosis — before the damage can be copied into two cells.' },
        { id: 'B', gate: 'G2',
          alt: 'a large cell whose threads are doubled along only part of their length. Copying has stalled.',
          look: 'Look along the threads in cell B: doubled all the way, or only part of the way?',
          right: 'Copying never finished. The G<sub>2</sub> checkpoint asks exactly that and holds the cell until replication is complete; dividing now would hand one daughter cell an incomplete set of DNA.' },
        { id: 'C', gate: 'M',
          alt: 'a cell in mitosis with no nucleus. Two X-shaped chromosomes sit on the middle line; the upper one has fibres from both poles, the lower one from the left pole only.',
          look: 'Count the fibres reaching each chromosome in cell C, from each side.',
          right: 'One chromosome is attached to only one pole. The M checkpoint holds the cell in metaphase until every chromosome is attached from both sides. If anaphase started now, both copies of that chromosome would be dragged into the same daughter cell — the kind of error Chapter 4.6 follows into meiosis.' },
        { id: 'D', gate: 'G1',
          alt: 'a small cell packed in on every side by neighbouring cells.',
          look: 'Look at what surrounds cell D. Is there room to divide?',
          right: 'No room and no growth signals. The G<sub>1</sub> checkpoint refuses permission, and the cell leaves the cycle into G<sub>0</sub>. This is how a healing wound knows when to stop: each cell divides while it has room, and stops when it is surrounded.' },
        { id: 'E', gate: 'G2',
          alt: 'a large cell whose threads are doubled along their whole length, with a damage mark on one of the new copies.',
          look: 'Has cell E finished copying? Now look at where the damage is.',
          right: 'The copying is finished, but a copy is damaged. The G<sub>2</sub> checkpoint inspects the copy that was just made: hold while it is repaired, or apoptosis if it cannot be.' },
        { id: 'F', gate: 'M',
          alt: 'a cell in mitosis with no nucleus. One X-shaped chromosome is on the middle line with fibres from both poles; a second is off to one side with no fibres attached at all.',
          look: 'Look at the chromosome in cell F that is not on the middle line.',
          right: 'One chromosome has no spindle attachment at all. The M checkpoint will not let anaphase begin until it is attached from both poles and lined up with the rest.' }
    ];
    const TILE = {}; TILES.forEach(t => { TILE[t.id] = t; });
    const cellSVG = id => '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + CELL[id]() + '</svg>';

    /* ---- the token each gate carries: a miniature of its own question ------
       Drawn in a 48 x 48 box centred on 0,0. These restate the question the
       gate asks rather than the phase it belongs to, so they help the reader
       read the gate without giving away where it goes. */
    const ICON = {
        // a chromosome with a fibre from each side: "attached from both poles?"
        M: () => chrX(0, 2, 1.25) +
            '<line class="cpw-spin" x1="-21" y1="2" x2="-7" y2="2"/><line class="cpw-spin" x1="21" y1="2" x2="7" y2="2"/>' +
            '<circle class="cpw-icon-pole" cx="-21" cy="2" r="2.4"/><circle class="cpw-icon-pole" cx="21" cy="2" r="2.4"/>',
        // a single thread with a damage mark: "is the DNA undamaged?"
        G1: () => thread(-17, 3, 34, 3.4, 1, 0) + dmg(3, 1),
        // a thread doubled along only part of its length: "did copying finish?"
        G2: () => thread(-17, 3, 34, 3.4, 1, 0.55)
    };

    /* ---- geometry ------------------------------------------------------ */
    const W = 520, C = 260, R = 165, HUB = 50, ORB = 210, G_R = 27, PER_H = 360 / TOTAL;
    const TRAY_Y = 560, TRAY_X = [170, 260, 350];   // only used if a gate is ever cleared
    const MIN_SEP = 2 * Math.asin((2 * G_R + 6) / (2 * ORB)) * 180 / Math.PI;
    function pt(deg, r) { const a = deg * Math.PI / 180; return [r2(C + r * Math.sin(a)), r2(C - r * Math.cos(a))]; }
    function angleOf(x, y) { return (Math.atan2(x - C, C - y) * 180 / Math.PI + 360) % 360; }
    function wedgePath(h0, h1) {
        const a0 = h0 * PER_H, a1 = h1 * PER_H, p0 = pt(a0, R), p1 = pt(a1, R);
        return 'M' + C + ' ' + C + ' L' + p0[0] + ' ' + p0[1] + ' A' + R + ' ' + R + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + p1[0] + ' ' + p1[1] + ' Z';
    }
    const octagon = r => { let d = ''; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; d += (i ? ' L' : 'M') + r2(r * Math.cos(a)) + ' ' + r2(r * Math.sin(a)); } return d + ' Z'; };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.cpw { padding:1rem 1.25rem 1.25rem; }',
            '.cpw { --cpw-G1:hsl(330 46% 44%); --cpw-S:hsl(300 34% 40%); --cpw-G2:hsl(265 36% 45%); --cpw-M:hsl(200 62% 34%);',
            '   --cpw-dna:#1d4f96; --cpw-cen:#b8741a; --cpw-dmg:#d4372f; --cpw-ok:#2e7d32; --cpw-close:#a86a12; --cpw-bad:#aa272f; }',
            '[data-theme="dark"] .cpw { --cpw-dna:#8db6ee; --cpw-cen:#e2b25a; --cpw-dmg:#ff6b61; --cpw-ok:#7fc98a; --cpw-close:#e2b25a; --cpw-bad:#e08a90; }',
            '[data-theme="sepia"] .cpw { --cpw-dna:#2f5480; --cpw-cen:#9a6420; --cpw-ok:#4a6b3d; --cpw-close:#8a5a14; --cpw-bad:#a04040; }',
            '.cpw-how { font-size:0.8rem; color:var(--text-secondary); margin:0 0 0.8rem; line-height:1.6; }',
            '.cpw-how b { color:var(--text); }',
            '.cpw-stage { border:1px solid var(--border); border-radius:11px; background:var(--bg); padding:0.4rem; }',
            '.cpw-svg { display:block; width:100%; max-width:440px; height:auto; margin:0 auto; user-select:none; -webkit-user-select:none; touch-action:none; }',
            '.cpw-svg text { font-family:var(--body-font); }',
            '.cpw-w { stroke:var(--bg); stroke-width:2; }',
            '.cpw-wl { fill:#fff; font-size:22px; font-weight:800; pointer-events:none; }',
            '.cpw-wh { fill:#fff; font-size:14px; font-weight:600; pointer-events:none; opacity:0.95; }',
            '.cpw-sub { font-size:13px; }',
            '.cpw-tick { stroke:var(--text-secondary); stroke-width:1.2; } .cpw-tick.major { stroke-width:2; }',
            '.cpw-hub { fill:var(--bg); stroke:var(--text-secondary); stroke-width:1.4; }',
            '.cpw-hub-t { fill:var(--text); font-size:19px; font-weight:800; } .cpw-hub-s { fill:var(--text-secondary); font-size:12px; }',
            '.cpw-tray-t { fill:var(--text-secondary); font-size:13px; }',
            '.cpw-stem { stroke:var(--text); stroke-width:2.4; } .cpw-pin { fill:var(--text); stroke:var(--bg); stroke-width:2; }',
            '.cpw-ghost { stroke:var(--text-secondary); stroke-width:2; stroke-dasharray:4 4; }',
            '.cpw-token { fill:var(--bg); stroke:var(--text); stroke-width:3; }',
            '.cpw-art { pointer-events:none; }',
            '.cpw-icon-pole { fill:var(--text-secondary); }',
            '.cpw-badge { fill:var(--text); stroke:var(--bg); stroke-width:2; pointer-events:none; }',
            '.cpw-badge-t { fill:var(--bg); font-size:13px; font-weight:800; pointer-events:none; }',
            '.cpw-name { fill:var(--text); font-size:13px; font-weight:800; pointer-events:none; }',
            '.cpw-gate.move .cpw-token { filter:drop-shadow(0 2px 3px rgba(0,0,0,0.25)); }',
            '@keyframes cpw-bob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }',
            '.cpw-gate.waiting .cpw-lift { animation:cpw-bob 1.8s ease-in-out infinite; }',
            '@media (prefers-reduced-motion: reduce) { .cpw-gate.waiting .cpw-lift { animation:none; } }',
            '.cpw-gate.move { cursor:grab; } .cpw-gate.move path { filter:drop-shadow(0 2px 3px rgba(0,0,0,0.22)); }',
            '.cpw-gate:focus { outline:none; } .cpw-gate:focus .cpw-token { stroke:var(--light-teal); stroke-width:5; }',
            '.cpw-gate.right .cpw-token { stroke:var(--cpw-ok); } .cpw-gate.close .cpw-token { stroke:var(--cpw-close); } .cpw-gate.wrong .cpw-token { stroke:var(--cpw-bad); }',
            '.cpw-svg.grabbing, .cpw-svg.grabbing .cpw-gate { cursor:grabbing; }',
            // readout of the three questions
            '.cpw-qs { list-style:none; padding:0; margin:0.8rem 0 0; display:grid; gap:0.45rem; }',
            '.cpw-qs li { display:grid; grid-template-columns:1.9rem 1fr; gap:0.55rem; align-items:start; font-size:0.82rem; line-height:1.5; }',
            '.cpw-chip { width:1.75rem; height:1.75rem; display:block; }',
            '.cpw-chip path { fill:var(--bg); stroke:var(--text); stroke-width:3; }',
            '.cpw-chip text { fill:var(--text); font-size:17px; font-weight:800; font-family:var(--body-font); }',
            '.cpw-qs .where { display:block; font-size:0.74rem; color:var(--text-secondary); }',
            '.cpw-qs .v { font-weight:700; } .cpw-qs .v.right { color:var(--cpw-ok); } .cpw-qs .v.close { color:var(--cpw-close); } .cpw-qs .v.wrong { color:var(--cpw-bad); }',
            '.cpw-sum { font-size:0.84rem; line-height:1.6; margin:0.9rem 0 0; }',
            // sorting
            '.cpw-bins { display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem; margin:0.9rem 0 0; }',
            '.cpw-bin { font:inherit; color:var(--text); text-align:left; background:var(--bg-surface); border:1.5px dashed var(--text-secondary);',
            '   border-radius:10px; padding:0.5rem 0.55rem; min-height:6.4rem; cursor:pointer; display:flex; flex-direction:column; gap:0.3rem; }',
            '.cpw-bin .t { font-size:0.8rem; font-weight:800; } .cpw-bin .s { font-size:0.7rem; color:var(--text-secondary); line-height:1.35; }',
            '.cpw-bin.hot { border-style:solid; border-color:var(--text); background:var(--bg); }',
            '.cpw-bin:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.cpw-bin .got { display:flex; flex-wrap:wrap; gap:0.25rem; margin-top:auto; }',
            '.cpw-mini { width:2.6rem; height:2.6rem; border:1px solid var(--border); border-radius:8px; background:var(--bg); position:relative; }',
            '.cpw-mini svg { width:100%; height:100%; display:block; } .cpw-mini b { position:absolute; top:-0.1rem; left:0.15rem; font-size:0.6rem; }',
            '.cpw-tray { display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:center; margin:0.8rem 0 0; }',
            '.cpw-tile { font:inherit; position:relative; width:6.2rem; padding:0.3rem 0.3rem 0.2rem; border:1px solid var(--border); border-radius:10px;',
            '   background:var(--bg); color:var(--text); cursor:grab; touch-action:none; display:flex; flex-direction:column; align-items:center; }',
            '.cpw-tile svg { width:5.5rem; height:5.5rem; display:block; pointer-events:none; }',
            '.cpw-tile .id { font-size:0.74rem; font-weight:800; line-height:1.2; }',
            '.cpw-tile:hover { border-color:var(--light-teal); } .cpw-tile.sel { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.cpw-tile:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; } .cpw-tile.lift { opacity:0.35; }',
            '.cpw-drag { position:fixed; left:0; top:0; width:4.8rem; height:4.8rem; pointer-events:none; z-index:1000; border:1px solid var(--light-teal);',
            '   border-radius:50%; background:var(--bg); box-shadow:0 6px 18px rgba(0,0,0,0.25); }',
            '.cpw-drag svg { width:100%; height:100%; display:block; }',
            '.cpw-mem { fill:var(--bg-surface); stroke:var(--text-secondary); stroke-width:2; }',
            '.cpw-mem.nb { opacity:0.55; }',
            '.cpw-nuc { fill:var(--bg); stroke:var(--text-secondary); stroke-width:1.4; }',
            '.cpw-dna { fill:none; stroke:var(--cpw-dna); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }',
            '.cpw-chr { fill:none; stroke:var(--cpw-dna); stroke-width:3.6; stroke-linecap:round; }',
            '.cpw-cen { fill:var(--cpw-cen); }',
            '.cpw-spin { stroke:var(--text-secondary); stroke-width:0.9; opacity:0.7; }',
            '.cpw-dmg { fill:var(--cpw-dmg); stroke:var(--bg); stroke-width:0.8; }',
            '.cpw-msg { font-size:0.83rem; line-height:1.6; margin:0.7rem 0 0; min-height:2.4em; }',
            '.cpw-msg.ok { color:var(--cpw-ok); } .cpw-msg.bad { color:var(--cpw-bad); } .cpw-msg b { color:var(--text); }',
            '.cpw-done { margin-top:0.9rem; border:1px solid var(--cpw-ok); border-radius:10px; background:rgba(46,125,50,0.08); padding:0.85rem 1rem; font-size:0.84rem; line-height:1.6; }',
            '[data-theme="dark"] .cpw-done { background:rgba(127,201,138,0.12); }',
            '.cpw-done h5 { margin:0 0 0.4rem; font-size:0.9rem; } .cpw-done p { margin:0 0 0.55rem; } .cpw-done p:last-child { margin-bottom:0; }',
            '.cpw .sim-buttons { padding:0; margin-top:0.9rem; }',
            '@media (max-width: 480px) {',
            '  .cpw { padding:0.85rem 0.6rem 1rem; } .cpw-stage { padding:0.1rem; }',
            '  .cpw-bins { grid-template-columns:1fr; } .cpw-bin { min-height:0; }',
            '  .cpw-tile { width:5.1rem; } .cpw-tile svg { width:4.5rem; height:4.5rem; }',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-checkpoint-wheel'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'cpw');
        const howEl = U.el('p', 'cpw-how'), stageEl = U.el('div', 'cpw-stage'), belowEl = U.el('div');
        [howEl, stageEl, belowEl].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);
        const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

        let step, guess, shown, placed, selected, wrongs, msg, anim = null, drag = null;

        /* ---- the wheel ---------------------------------------------------- */
        let s = '<svg class="cpw-svg" viewBox="0 0 ' + W + ' 600" role="group" aria-label="The cell cycle as a 24-hour wheel, drawn to scale, with three checkpoint gates">';
        for (let h = 0; h < TOTAL; h++) {
            const major = h % 6 === 0, a = pt(h * PER_H, R + 3), b = pt(h * PER_H, R + (major ? 17 : 11));
            s += '<line class="cpw-tick' + (major ? ' major' : '') + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>';
        }
        PHASES.forEach((p, i) => {
            const h0 = BOUND[i], h1 = BOUND[i + 1], mid = (h0 + h1) / 2 * PER_H, narrow = p.h * PER_H < 40;
            s += '<path class="cpw-w" d="' + wedgePath(h0, h1) + '" style="fill:var(--cpw-' + p.k + ')"/>';
            if (narrow) {
                const n = pt(mid, R * 0.84);
                s += '<text class="cpw-wl" x="' + n[0] + '" y="' + (n[1] + 7) + '" text-anchor="middle" style="font-size:15px">' + nameSVG(p.k) + '</text>';
            } else {
                const n = pt(mid, R * 0.64);
                s += '<text class="cpw-wl" x="' + n[0] + '" y="' + n[1] + '" text-anchor="middle">' + nameSVG(p.k) + '</text>' +
                    '<text class="cpw-wh" x="' + n[0] + '" y="' + (n[1] + 20) + '" text-anchor="middle">' + p.h + ' h</text>';
            }
        });
        s += '<circle class="cpw-hub" cx="' + C + '" cy="' + C + '" r="' + HUB + '"/>' +
            '<text class="cpw-hub-t" x="' + C + '" y="' + (C + 2) + '" text-anchor="middle">24 h</text>' +
            '<text class="cpw-hub-s" x="' + C + '" y="' + (C + 18) + '" text-anchor="middle">clockwise</text>';
        s += '<text class="cpw-tray-t" x="' + C + '" y="' + (TRAY_Y - 44) + '" text-anchor="middle">drag this gate back onto the wheel</text>';
        s += '<g class="cpw-ghosts"></g><g class="cpw-stems"></g><g class="cpw-gates">';
        GATES.forEach(g => {
            s += '<g class="cpw-gate move" data-g="' + g.k + '" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="23.5">' +
                '<g class="cpw-lift"><circle class="cpw-token" r="' + G_R + '"/>' +
                '<g class="cpw-art" transform="scale(0.78)">' + ICON[g.k]() + '</g>' +
                '<circle class="cpw-badge" cx="' + (G_R - 4) + '" cy="' + (-G_R + 3) + '" r="10.5"/>' +
                '<text class="cpw-badge-t" x="' + (G_R - 4) + '" y="' + (-G_R + 7) + '" text-anchor="middle">' + g.n + '</text>' +
                '<text class="cpw-name" y="' + (G_R + 16) + '" text-anchor="middle"></text></g></g>';
        });
        s += '</g></svg>';
        stageEl.innerHTML = s;
        const svg = stageEl.querySelector('svg');
        const gEls = {}; GATES.forEach(g => { gEls[g.k] = svg.querySelector('[data-g="' + g.k + '"]'); });
        const stemsEl = svg.querySelector('.cpw-stems'), ghostsEl = svg.querySelector('.cpw-ghosts'), trayT = svg.querySelector('.cpw-tray-t');

        // Where each gate is drawn. A gate belongs on the line of its hour; the
        // G2 and M gates are only half an hour apart, so crowded neighbours are
        // eased apart just enough to clear. The stem and pin stay on the exact hour.
        function displayDegrees() {
            const on = GATES.filter(g => shown[g.k] !== null).map(g => ({ k: g.k, a: shown[g.k] * PER_H })).sort((a, b) => a.a - b.a);
            for (let it = 0; it < 60 && on.length > 1; it++) {
                let moved = false;
                for (let i = 0; i < on.length; i++) {
                    const j = (i + 1) % on.length;
                    if (on.length === 2 && i === 1) break;
                    const next = j === 0 ? on[0].a + 360 : on[j].a, gap = next - on[i].a;
                    if (gap < MIN_SEP - 0.01) { const push = (MIN_SEP - gap) / 2; on[i].a -= push; on[j].a += push; moved = true; }
                }
                if (!moved) break;
            }
            const out = {}; on.forEach(o => { out[o.k] = o.a; }); return out;
        }

        function draw() {
            const deg = displayDegrees();
            let stems = '', ghosts = '';
            GATES.forEach((g, i) => {
                const el = gEls[g.k];
                let c;
                if (shown[g.k] === null) c = [TRAY_X[i], TRAY_Y];
                else {
                    c = pt(deg[g.k], ORB);
                    const pin = pt(shown[g.k] * PER_H, R + 1);
                    stems += '<line class="cpw-stem" x1="' + pin[0] + '" y1="' + pin[1] + '" x2="' + c[0] + '" y2="' + c[1] + '"/>' +
                        '<circle class="cpw-pin" cx="' + pin[0] + '" cy="' + pin[1] + '" r="5"/>';
                }
                el.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ')');
                const named = step !== 'predict';
                el.classList.toggle('named', named);
                el.querySelector('.cpw-name').innerHTML = named ? nameSVG(g.k) : '';
                el.classList.toggle('move', step === 'predict');
                el.classList.toggle('waiting', step === 'predict' && shown[g.k] === null && !drag);
                const verdict = step !== 'predict' && !anim && guess[g.k] !== null ? judge(g.k, guess[g.k]).s : null;
                ['right', 'close', 'wrong'].forEach(v => el.classList.toggle(v, v === verdict));
                if (step === 'predict') {
                    el.setAttribute('tabindex', '0');
                    el.setAttribute('aria-label', 'Gate ' + g.n + ': ' + g.q.replace(/<[^>]+>/g, '') + ' ' +
                        (guess[g.k] === null ? 'Not on the wheel yet. Use the arrow keys to place it.' : 'On the wheel at ' + fmtH(guess[g.k]) + ', ' + pct(guess[g.k]) + ', in ' + phaseAt(guess[g.k]) + '.'));
                    if (guess[g.k] !== null) el.setAttribute('aria-valuenow', guess[g.k]); else el.removeAttribute('aria-valuenow');
                } else {
                    el.removeAttribute('tabindex');
                    el.setAttribute('aria-label', g.name.replace(/<[^>]+>/g, '') + ', ' + g.when.replace(/<[^>]+>/g, ''));
                    if (guess[g.k] !== null && !anim) {
                        const p0 = pt(guess[g.k] * PER_H, HUB + 4), p1 = pt(guess[g.k] * PER_H, R + 2);
                        ghosts += '<line class="cpw-ghost" x1="' + p0[0] + '" y1="' + p0[1] + '" x2="' + p1[0] + '" y2="' + p1[1] + '"/>';
                    }
                }
            });
            stemsEl.innerHTML = stems; ghostsEl.innerHTML = ghosts;
            const waiting = step === 'predict' && GATES.some(g => shown[g.k] === null);   // only after a Delete
            trayT.style.display = waiting ? '' : 'none';
            trayT.textContent = 'drag this gate back onto the wheel';
            svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (waiting ? 600 : W));
        }

        /* ---- predict: dragging and keys -------------------------------------- */
        function toSvg(x, y) {
            const m = svg.getScreenCTM(); if (!m) return null;
            const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(m.inverse());
        }
        const snap = a => (Math.round(a / PER_H * 2) / 2) % TOTAL;
        function gateAt(p) {
            const deg = displayDegrees();
            let best = null, bd = 30;
            GATES.forEach((g, i) => {
                const c = shown[g.k] === null ? [TRAY_X[i], TRAY_Y] : pt(deg[g.k], ORB);
                const d = Math.hypot(p.x - c[0], p.y - c[1]);
                if (d < bd) { bd = d; best = g.k; }
            });
            return best;
        }
        svg.addEventListener('pointerdown', e => {
            if (step !== 'predict') return;
            const p = toSvg(e.clientX, e.clientY); if (!p) return;
            const k = gateAt(p); if (!k) return;
            drag = { k };
            // a gate lifted out of the tray lands on the rim immediately, so it can
            // never be dragged off the drawing and out of sight
            if (guess[k] === null) { guess[k] = snap(angleOf(p.x, p.y)); shown = Object.assign({}, guess); }
            svg.setPointerCapture(e.pointerId);
            svg.classList.add('grabbing');
            svg.querySelector('.cpw-gates').appendChild(gEls[k]);
            gEls[k].focus({ preventScroll: true });
            e.preventDefault();
        });
        svg.addEventListener('pointermove', e => {
            if (!drag) return;
            const p = toSvg(e.clientX, e.clientY); if (!p) return;
            // the gate always stays on the rim: only the angle is taken from the pointer
            guess[drag.k] = snap(angleOf(p.x, p.y));
            shown = Object.assign({}, guess);
            draw(); renderReadout();
        });
        const endDrag = () => { if (!drag) return; drag = null; svg.classList.remove('grabbing'); draw(); renderBelow(); };
        svg.addEventListener('pointerup', endDrag);
        svg.addEventListener('pointercancel', endDrag);
        GATES.forEach(g => {
            gEls[g.k].addEventListener('keydown', e => {
                if (step !== 'predict') return;
                const k = e.key, h = guess[g.k];
                if (k === 'ArrowRight' || k === 'ArrowUp') guess[g.k] = h === null ? 0 : (h + 0.5) % TOTAL;
                else if (k === 'ArrowLeft' || k === 'ArrowDown') guess[g.k] = h === null ? 23.5 : (h + 23.5) % TOTAL;
                else if (k === 'Delete' || k === 'Backspace') guess[g.k] = null;
                else return;
                e.preventDefault();
                shown = Object.assign({}, guess);
                draw(); renderBelow();
                gEls[g.k].focus({ preventScroll: true });
            });
        });

        /* ---- the panel under the wheel ---------------------------------------- */
        function questionsHTML() {
            return '<ul class="cpw-qs">' + GATES.map(g => {
                let where;
                if (step === 'predict') {
                    where = guess[g.k] === null ? 'not on the wheel yet' : 'your gate: ' + fmtH(guess[g.k]) + ' — ' + pct(guess[g.k]) + ', in ' + nameHTML(phaseAt(guess[g.k]));
                } else {
                    const j = judge(g.k, guess[g.k]), lab = { right: 'Right.', close: 'Nearly.', wrong: 'Not there.' }[j.s];
                    where = '<span class="v ' + j.s + '">' + lab + '</span> It is the <b>' + g.name + '</b>, ' + g.when +
                        '. You put it at ' + fmtH(guess[g.k]) + ' (' + pct(guess[g.k]) + '), in ' + nameHTML(phaseAt(guess[g.k])) + '. ' + j.t.replace(/^Right — [^.]*\.\s?/, '');
                }
                return '<li><svg class="cpw-chip" viewBox="-22 -22 44 44" aria-hidden="true"><path d="' + octagon(18) + '"/><text y="6" text-anchor="middle">' + g.n + '</text></svg><span>' + g.q + '<span class="where">' + where + '</span></span></li>';
            }).join('') + '</ul>';
        }
        function renderReadout() {
            const q = belowEl.querySelector('.cpw-qs');
            if (q) q.outerHTML = questionsHTML();
            const b = belowEl.querySelector('[data-lock]');
            if (b) b.disabled = GATES.some(g => guess[g.k] === null);
        }
        function summaryHTML() {
            const js = GATES.map(g => judge(g.k, guess[g.k]).s), right = js.filter(v => v === 'right').length;
            let out = '<p class="cpw-sum">';
            out += right === 3 ? '<b>All three gates in the right place.</b> ' : '<b>' + right + ' of 3 in the right place.</b> ';
            out += 'Now read the pattern rather than the names: <b>each gate guards the step immediately after it.</b> ' +
                'G<sub>1</sub> guards ' + GATE.G1.guards + '. G<sub>2</sub> guards ' + GATE.G2.guards + '. M guards ' + GATE.M.guards + '. ' +
                'The G<sub>2</sub> and M gates are only half an hour apart, but they ask completely different questions.</p>';
            return out;
        }

        /* ---- sorting ------------------------------------------------------------ */
        function binAt(x, y) {
            const el = document.elementFromPoint(x, y), b = el && el.closest ? el.closest('.cpw-bin') : null;
            return b && wrap.contains(b) ? b.getAttribute('data-k') : null;
        }
        function setHot(k) { belowEl.querySelectorAll('.cpw-bin').forEach(b => b.classList.toggle('hot', b.getAttribute('data-k') === k)); }
        function attempt(id, bin) {
            const t = TILE[id];
            if (!t || placed[id] || !bin) return;
            selected = null;
            if (bin === t.gate) {
                placed[id] = bin;
                msg = { cls: 'ok', html: '<b>Cell ' + id + ' — the ' + GATE[bin].name + '.</b> ' + t.right };
            } else {
                wrongs++;
                msg = { cls: 'bad', html: '<b>Not the ' + GATE[bin].name + '.</b> That gate asks: ' + GATE[bin].q.replace(/<\/?b>/g, '') + ' ' + t.look };
            }
            renderBelow();
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
                    dragging = true; ghost = U.el('div', 'cpw-drag'); ghost.innerHTML = cellSVG(id); wrap.appendChild(ghost); btn.classList.add('lift');
                }
                if (dragging) {
                    const lift = start.touch ? 1.1 : 0.5;
                    ghost.style.transform = 'translate(' + (e.clientX - ghost.offsetWidth / 2) + 'px,' + (e.clientY - ghost.offsetHeight * lift) + 'px)';
                    hot = binAt(e.clientX, e.clientY); setHot(hot);
                }
            });
            const finish = drop => {
                if (dragging) { suppress = true; if (ghost) ghost.remove(); btn.classList.remove('lift'); setHot(null); if (drop && hot) attempt(id, hot); }
                start = null; dragging = false; ghost = null; hot = null;
            };
            btn.addEventListener('pointerup', () => finish(true));
            btn.addEventListener('pointercancel', () => finish(false));
            const toggle = () => {
                if (placed[id]) return;
                selected = selected === id ? null : id;
                msg = selected ? { cls: '', html: 'Cell ' + id + ' selected. Now choose the gate that would catch it.' } : null;
                renderBelow();
                const again = belowEl.querySelector('.cpw-tile[data-id="' + id + '"]');
                if (again) again.focus({ preventScroll: true });
            };
            btn.addEventListener('click', () => { if (suppress) { suppress = false; return; } toggle(); });
            btn.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); toggle(); });
        }
        function doneHTML() {
            return '<div class="cpw-done"><h5>Three gates, three outcomes</h5>' +
                '<p>Every gate gives the same three possible answers: <b>continue</b>; <b>hold</b> while repair enzymes work; or, if the damage cannot be fixed, <b>apoptosis</b>, a tidy self-destruction. And the G<sub>1</sub> gate has a fourth: a cell refused permission there can leave the cycle altogether, into G<sub>0</sub>.</p>' +
                '<p>Notice what that means for cancer. A checkpoint is not something a cell does once; it is a set of proteins that have to keep working. Break the gene for one of those proteins, and cells with damaged DNA carry on dividing — which is exactly what the model in the next section lets you do.</p></div>';
        }

        function renderBelow() {
            belowEl.innerHTML = '';
            const btns = U.el('div', 'sim-buttons');
            if (step === 'predict') {
                howEl.innerHTML = 'This is the same 24-hour wheel you met in Chapter 4.1, drawn to scale. Under it are three <b>gates</b>, numbered 1 to 3 and listed below by the question each one asks. A cell will not go past a gate until the answer is yes. ' +
                    'The three <b>gates</b> are already on the rim, but in the wrong places. <b>Drag each one round the wheel</b> to the point in the 24 hours where you think its question has to be asked &mdash; or tab to a gate and use the arrow keys. The list below gives the hour each gate is at, and how far round the cycle that is.';
                const d = U.el('div'); d.innerHTML = questionsHTML(); belowEl.appendChild(d.firstChild);
                const lock = U.button(btns, 'Lock in my gates', 'primary');
                lock.setAttribute('data-lock', '');
                lock.disabled = GATES.some(g => guess[g.k] === null);   // only after a Delete
                lock.addEventListener('click', doLock);
            }
            if (step === 'reveal') {
                howEl.innerHTML = 'The gates have moved to where each checkpoint really sits. <b>Your positions are left behind as dashed lines.</b>';
                const d = U.el('div'); d.innerHTML = questionsHTML() + summaryHTML();
                while (d.firstChild) belowEl.appendChild(d.firstChild);
                U.button(btns, 'Next: which gate catches it?', 'primary').addEventListener('click', () => { step = 'sort'; msg = null; renderBelow(); });
            }
            if (step === 'sort') {
                const left = TILES.filter(t => !placed[t.id]).length;
                howEl.innerHTML = left
                    ? 'Six cells, each with one thing wrong with it. <b>Send each cell to the gate that would catch the problem</b>: drag it onto a gate below, or tap the cell and then the gate. Red marks are DNA damage.'
                    : 'Every cell has been stopped at the right gate.';
                const bins = U.el('div', 'cpw-bins');
                [GATE.G1, GATE.G2, GATE.M].forEach(g => {
                    const el = U.el('button', 'cpw-bin'); el.type = 'button'; el.setAttribute('data-k', g.k);
                    const got = TILES.filter(t => placed[t.id] === g.k);
                    el.setAttribute('aria-label', g.name.replace(/<[^>]+>/g, '') + ': ' + g.q.replace(/<[^>]+>/g, '') + ' ' + (got.length ? 'Holds cell ' + got.map(t => t.id).join(', ') + '.' : 'Empty.'));
                    el.innerHTML = '<span class="t">' + g.name + '</span><span class="s">' + g.q + '</span><span class="got">' +
                        got.map(t => '<span class="cpw-mini">' + cellSVG(t.id) + '<b>' + t.id + '</b></span>').join('') + '</span>';
                    el.addEventListener('click', () => {
                        if (selected) attempt(selected, g.k);
                        else { msg = { cls: '', html: 'Choose a cell first, then its gate.' }; renderBelow(); }
                    });
                    bins.appendChild(el);
                });
                belowEl.appendChild(bins);
                const tray = U.el('div', 'cpw-tray');
                TILES.filter(t => !placed[t.id]).forEach(t => {
                    const b = U.el('button', 'cpw-tile' + (selected === t.id ? ' sel' : '')); b.type = 'button';
                    b.setAttribute('data-id', t.id); b.setAttribute('aria-pressed', selected === t.id ? 'true' : 'false');
                    b.setAttribute('aria-label', 'Cell ' + t.id + ': ' + t.alt);
                    b.innerHTML = cellSVG(t.id) + '<span class="id">' + t.id + '</span>';
                    wireTile(b, t.id); tray.appendChild(b);
                });
                belowEl.appendChild(tray);
                const m = U.el('p', 'cpw-msg' + (msg && msg.cls ? ' ' + msg.cls : ''));
                m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite');
                if (msg) m.innerHTML = msg.html;
                belowEl.appendChild(m);
                if (!left) { const d = U.el('div'); d.innerHTML = doneHTML(); belowEl.appendChild(d.firstChild); }
                U.button(btns, 'Start again').addEventListener('click', reset);
            }
            belowEl.appendChild(btns);
            draw();
        }

        function doLock(instant) {
            if (step !== 'predict' || GATES.some(g => guess[g.k] === null)) return;
            step = 'reveal';
            const from = Object.assign({}, guess);
            // each gate travels the short way round
            const delta = {}; GATES.forEach(g => { let dd = g.truth - from[g.k]; if (dd > 12) dd -= 24; if (dd < -12) dd += 24; delta[g.k] = dd; });
            const truth = () => { GATES.forEach(g => { shown[g.k] = g.truth; }); };
            if (instant === true || reduced) { truth(); renderBelow(); return; }
            const t0 = performance.now(), DUR = 1100;
            const frame = now => {
                const u = Math.min(1, (now - t0) / DUR), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                GATES.forEach(g => { shown[g.k] = ((from[g.k] + delta[g.k] * e) % TOTAL + TOTAL) % TOTAL; });
                draw();
                if (u < 1) anim = requestAnimationFrame(frame); else { anim = null; truth(); draw(); }
            };
            anim = requestAnimationFrame(frame);
            renderBelow();
        }
        function reset() {
            if (anim) cancelAnimationFrame(anim);
            anim = null; drag = null;
            step = 'predict';
            // deliberately wrong starting hours, spread round the wheel: M in G1,
            // G1 in S, G2 in S. None of them is right, and none is even the right phase.
            guess = { M: 4, G1: 12, G2: 16 }; shown = Object.assign({}, guess);
            placed = {}; selected = null; wrongs = 0; msg = null;
            renderBelow();
        }
        reset();

        root._simState = () => ({
            step, guess: Object.assign({}, guess), shown: Object.assign({}, shown),
            truth: Object.fromEntries(GATES.map(g => [g.k, g.truth])),
            verdicts: step === 'predict' ? null : Object.fromEntries(GATES.map(g => [g.k, judge(g.k, guess[g.k]).s])),
            placed: Object.assign({}, placed), wrongs,
            remaining: TILES.filter(t => !placed[t.id]).map(t => t.id),
            complete: step === 'sort' && TILES.every(t => placed[t.id])
        });
        root._simSolve = () => {
            if (anim) { cancelAnimationFrame(anim); anim = null; }
            GATES.forEach(g => { if (guess[g.k] === null) guess[g.k] = g.truth; shown[g.k] = g.truth; });
            step = 'sort';
            TILES.forEach(t => { placed[t.id] = t.gate; });
            selected = null; msg = null;
            renderBelow();
        };
        root._simSet = (k, h) => { if (step === 'predict') { guess[k] = h; shown = Object.assign({}, guess); renderBelow(); } };   // verification only
        root._simAttempt = attempt;
        root._simLock = () => doLock(true);
    };
    window.SIMS['u4-checkpoint-wheel'].model = { judge, phaseAt, GATES, TILES, BOUND, MIN_SEP: () => MIN_SEP };
})();
