/* =============================================================
   INTERACTIVE — The scale slider: African elephants
   -------------------------------------------------------------
   Registers window.SIMS['u3-scale'].  Serves HS-LS2-1, and in
   particular the crosscutting target: "I can recognise proportional
   relationships between different quantities as scales change."

   One dataset. Three windows. Three completely different stories,
   all of them true. The reader is asked to draw a conclusion from
   a narrow window FIRST, and is then handed the wider one.

   Every number in the readout is computed from the series at the
   moment it is shown — the percent change, the annual rate and the
   verdict sentence all come out of the same two data points the
   reader has selected, so the arithmetic on screen can never
   disagree with the graph above it.

   The chapter's other job is served here too: the deck calls
   (P2 - P1) / P1 x 100 a "growth rate". It is a percent CHANGE
   over an interval. This sim shows both, side by side, with
   different names.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u3sc-style';

    const W = 700, H = 300;
    const PAD = { l: 82, r: 22, t: 20, b: 44 };

    /* African elephant population estimates.
       1979, 1995 and 2016 are the figures used in the course deck;
       the intermediate points are the survey years plotted by Our
       World in Data from the African Elephant Specialist Group and
       the Great Elephant Census. */
    const DATA = [
        [1979, 1300000], [1995, 286233], [1998, 302000],
        [2002, 402000], [2007, 472000], [2013, 404000], [2016, 395593]
    ];
    const YMIN = DATA[0][0], YMAX = DATA[DATA.length - 1][0];

    const OPTIONS = [
        { id: 'recover', label: 'Recovering strongly — the population has grown by about a third' },
        { id: 'stable', label: 'Roughly stable' },
        { id: 'decline', label: 'In serious decline' },
        { id: 'cant', label: 'This window is too narrow to say' }
    ];
    const CORRECT = 'cant';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u3sc { --u3-ok:#2e7d32; }',
            '[data-theme="dark"] .u3sc { --u3-ok:#7fc98a; }',
            '[data-theme="sepia"] .u3sc { --u3-ok:#4a6b3d; }',
            '.u3sc-q { padding:1.1rem 1.25rem 0; }',
            '.u3sc-q p { margin:0 0 0.7rem; font-size:0.88rem; line-height:1.6; }',
            '.u3sc-opts { display:flex; flex-direction:column; gap:0.4rem; margin-bottom:0.9rem; }',
            '.u3sc-opt { font:inherit; font-size:0.83rem; text-align:left; cursor:pointer;',
            '   padding:0.5rem 0.8rem; border:1px solid var(--border); border-radius:8px;',
            '   background:var(--bg); color:var(--text); transition:all 0.12s; }',
            '.u3sc-opt:hover { border-color:var(--light-teal); }',
            '.u3sc-opt:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.u3sc-opt[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.u3sc-opt.right { border-color:var(--u3-ok); box-shadow:0 0 0 2px var(--u3-ok); font-weight:600; }',
            '.u3sc-opt.wrong { border-color:var(--red); box-shadow:0 0 0 2px var(--red); opacity:0.78; }',
            '.u3sc-verdict { border-left:3px solid var(--light-teal); padding:0.15rem 0 0.15rem 0.85rem; margin:0 0 1rem; }',
            '.u3sc-verdict.hit { border-left-color:var(--u3-ok); }',
            '.u3sc-verdict p { margin:0 0 0.5rem; font-size:0.85rem; line-height:1.6; }',
            '.u3sc-verdict p:last-child { margin-bottom:0; }',
            '.u3sc-hide { display:none; }',
            '.u3sc .sim-btn:disabled { opacity:0.45; cursor:not-allowed; }',
            '.u3sc-maths { padding:0 1.25rem 1rem; }',
            '.u3sc-maths table { width:100%; border-collapse:collapse; font-size:0.8rem; }',
            '.u3sc-maths th, .u3sc-maths td { border:1px solid var(--border); padding:0.35rem 0.6rem; text-align:left; }',
            '.u3sc-maths th { background:var(--bg-nav-active); color:var(--text); font-weight:700; width:38%; }',
            '.u3sc-maths td { font-variant-numeric:tabular-nums; }',
            '.u3sc-big { font-weight:800; font-size:0.95rem; }',
            '.u3sc-up { color:var(--u3-ok); } .u3sc-down { color:var(--red); }'
        ].join('\n');
        document.head.appendChild(s);
    }

    /* value at any year, linearly interpolated between survey points */
    function valueAt(y) {
        if (y <= DATA[0][0]) return DATA[0][1];
        if (y >= DATA[DATA.length - 1][0]) return DATA[DATA.length - 1][1];
        for (let i = 0; i < DATA.length - 1; i++) {
            const [y0, v0] = DATA[i], [y1, v1] = DATA[i + 1];
            if (y >= y0 && y <= y1) return v0 + (v1 - v0) * (y - y0) / (y1 - y0);
        }
        return DATA[DATA.length - 1][1];
    }
    const pctChange = (a, b) => (b - a) / a * 100;
    const annualRate = (a, b, yrs) => yrs > 0 ? (Math.pow(b / a, 1 / yrs) - 1) * 100 : 0;
    const nf = v => Math.round(v).toLocaleString();

    window.SIMS['u3-scale'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u3sc');
        root.appendChild(wrap);

        let picked = null, revealed = false;
        let from = 1995, to = 2016;

        /* ---------- commit first ------------------------------------ */
        const qBox = U.el('div', 'u3sc-q');
        qBox.innerHTML = '<p>Here is the number of African elephants from <strong>1995 to 2016</strong>, ' +
            'which is the window most news stories use. Read it, then answer:<br>' +
            '<strong>Is the African elephant population recovering?</strong></p>';
        const preview = U.stage(qBox, W, 190,
            'A line graph of African elephant numbers from 1995 to 2016. The line rises from about ' +
            '286,000 in 1995 to a peak near 472,000 in 2007, then falls back to about 396,000 by 2016.');
        const optHost = U.el('div', 'u3sc-opts');
        qBox.appendChild(optHost);
        const verdict = U.el('div', 'u3sc-verdict u3sc-hide');
        qBox.appendChild(verdict);
        wrap.appendChild(qBox);

        const optBtns = OPTIONS.map(o => {
            const b = U.el('button', 'u3sc-opt');
            b.type = 'button'; b.textContent = o.label;
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', () => { if (!revealed) { picked = o.id; paintOpts(); } });
            optHost.appendChild(b);
            return b;
        });
        function paintOpts() {
            optBtns.forEach((b, i) => {
                b.setAttribute('aria-pressed', OPTIONS[i].id === picked ? 'true' : 'false');
                b.classList.remove('right', 'wrong');
                if (revealed) {
                    if (OPTIONS[i].id === CORRECT) b.classList.add('right');
                    else if (OPTIONS[i].id === picked) b.classList.add('wrong');
                }
            });
            btnCheck.disabled = revealed || !picked;
        }
        const qBtns = U.el('div', 'sim-buttons');
        const btnCheck = U.button(qBtns, 'Lock in my reading', 'primary');
        wrap.appendChild(qBtns);
        btnCheck.disabled = true;

        btnCheck.addEventListener('click', () => {
            if (!picked) return;
            revealed = true;
            const near = pctChange(valueAt(1995), valueAt(2016));
            const far = pctChange(valueAt(1979), valueAt(2016));
            verdict.className = 'u3sc-verdict' + (picked === CORRECT ? ' hit' : '');
            verdict.innerHTML =
                '<p><strong>' + (picked === CORRECT
                    ? 'Yes — and that is the whole lesson of this chapter.'
                    : 'Every answer above is defensible from that graph, which is the problem.') +
                '</strong> Over 1995&ndash;2016 the population changed by <strong class="u3sc-up">' +
                (near > 0 ? '+' : '') + near.toFixed(1) + '%</strong>. Read on its own, that looks ' +
                'like a recovery story.</p>' +
                '<p>Now widen the window. From 1979 to 2016 the change is <strong class="u3sc-down">' +
                far.toFixed(1) + '%</strong>. The same elephants, the same data, the opposite ' +
                'conclusion. The 1995 low point is not a baseline — it is the bottom of a crash, ' +
                'and measuring recovery from a crash tells you about the crash, not the species.</p>' +
                '<p>Drag the two ends of the window below and watch the verdict change under your hands.</p>';
            verdict.classList.remove('u3sc-hide');
            paintOpts();
            box.classList.remove('u3sc-hide');
            from = 1979; to = 2016;
            sFrom.input.value = from; sTo.input.value = to; sFrom.sync(); sTo.sync();
            draw(); describe();
        });

        /* ---------- the slider -------------------------------------- */
        const box = U.el('div', 'u3sc-hide');
        wrap.appendChild(box);

        const st = U.stage(box, W, H,
            'A line graph of African elephant numbers. Only the years inside the chosen window are ' +
            'drawn in full colour; the rest of the record is faded.');
        const canvas = st.canvas, ctx = st.ctx;

        const controls = U.el('div', 'sim-controls');
        box.appendChild(controls);
        const sFrom = U.slider(controls, 'u3s-from', 'Window starts', YMIN, YMAX - 1, 1979, v => v);
        const sTo = U.slider(controls, 'u3s-to', 'Window ends', YMIN + 1, YMAX, 2016, v => v);

        const btns = U.el('div', 'sim-buttons');
        box.appendChild(btns);
        const b1 = U.button(btns, '1979 → 1995', 'primary');
        const b2 = U.button(btns, '1995 → 2016');
        const b3 = U.button(btns, '1979 → 2016 (everything)');

        const maths = U.el('div', 'u3sc-maths');
        box.appendChild(maths);
        const readout = U.el('div', 'sim-readout');
        box.appendChild(readout);

        function setWindow(a, b) {
            from = a; to = b;
            sFrom.input.value = a; sTo.input.value = b;
            sFrom.sync(); sTo.sync();
            draw(); describe();
        }
        b1.addEventListener('click', () => setWindow(1979, 1995));
        b2.addEventListener('click', () => setWindow(1995, 2016));
        b3.addEventListener('click', () => setWindow(1979, 2016));
        sFrom.input.addEventListener('input', () => {
            from = +sFrom.input.value;
            if (from >= to) { to = from + 1; sTo.input.value = to; sTo.sync(); }
            draw(); describe();
        });
        sTo.input.addEventListener('input', () => {
            to = +sTo.input.value;
            if (to <= from) { from = to - 1; sFrom.input.value = from; sFrom.sync(); }
            draw(); describe();
        });

        /* ---------- drawing ----------------------------------------- */
        const theme = U.theme(() => { draw(); drawPreview(); });

        function series(y0, y1, stepYears) {
            const out = [];
            for (let y = y0; y <= y1; y += (stepYears || 1)) out.push([y, valueAt(y)]);
            if (out[out.length - 1][0] !== y1) out.push([y1, valueAt(y1)]);
            return out;
        }

        function drawPreview() {
            const t = theme.current;
            const c = preview.canvas, x = preview.ctx;
            const w = c.width, h = c.height;
            const P = { l: 78, r: 18, t: 14, b: 32 };
            const pw = w - P.l - P.r, ph = h - P.t - P.b;
            const top = 500000;
            x.clearRect(0, 0, w, h); x.fillStyle = t.bg; x.fillRect(0, 0, w, h);
            const sx = y => P.l + (y - 1995) / (2016 - 1995) * pw;
            const sy = v => P.t + ph - v / top * ph;
            x.strokeStyle = t.grid; x.lineWidth = 1;
            x.font = '10px system-ui, sans-serif'; x.textAlign = 'right'; x.fillStyle = t.axis;
            [0, 100000, 200000, 300000, 400000, 500000].forEach(v => {
                const yy = sy(v);
                x.beginPath(); x.moveTo(P.l, yy); x.lineTo(P.l + pw, yy); x.stroke();
                x.fillStyle = t.axis; x.fillText(v.toLocaleString(), P.l - 7, yy + 3.5);
            });
            x.strokeStyle = t.axis; x.globalAlpha = 0.6; x.lineWidth = 1.2;
            x.beginPath(); x.moveTo(P.l, P.t); x.lineTo(P.l, P.t + ph); x.lineTo(P.l + pw, P.t + ph); x.stroke();
            x.globalAlpha = 1;
            x.textAlign = 'center';
            [1995, 2000, 2005, 2010, 2015].forEach(y => x.fillText(String(y), sx(y), P.t + ph + 15));
            x.strokeStyle = t.red; x.lineWidth = 2.6; x.lineJoin = 'round';
            x.beginPath();
            series(1995, 2016).forEach((p, i) => { const a = sx(p[0]), b = sy(p[1]); i ? x.lineTo(a, b) : x.moveTo(a, b); });
            x.stroke();
            x.fillStyle = t.red;
            DATA.filter(p => p[0] >= 1995).forEach(p => {
                x.beginPath(); x.arc(sx(p[0]), sy(p[1]), 3.4, 0, Math.PI * 2); x.fill();
            });
        }

        function draw() {
            const t = theme.current;
            const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
            const top = 1400000;
            ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
            const sx = y => PAD.l + (y - YMIN) / (YMAX - YMIN) * pw;
            const sy = v => PAD.t + ph - v / top * ph;

            // shade the chosen window
            ctx.fillStyle = t.axis; ctx.globalAlpha = 0.09;
            ctx.fillRect(sx(from), PAD.t, sx(to) - sx(from), ph);
            ctx.globalAlpha = 1;

            ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
            ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right';
            [0, 200000, 400000, 600000, 800000, 1000000, 1200000, 1400000].forEach(v => {
                const y = sy(v);
                ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + pw, y); ctx.stroke();
                ctx.fillStyle = t.axis; ctx.fillText(v.toLocaleString(), PAD.l - 7, y + 3.5);
            });
            ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, PAD.t + ph); ctx.lineTo(PAD.l + pw, PAD.t + ph); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.textAlign = 'center'; ctx.fillStyle = t.axis;
            [1980, 1990, 2000, 2010, 2016].forEach(y => ctx.fillText(String(y), sx(y), PAD.t + ph + 16));
            ctx.fillText('Year', PAD.l + pw / 2, H - 6);
            ctx.save(); ctx.translate(16, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText('African elephants', 0, 0); ctx.restore();

            // whole record, faded
            ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.6;
            ctx.beginPath();
            series(YMIN, YMAX).forEach((p, i) => { const a = sx(p[0]), b = sy(p[1]); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
            ctx.stroke(); ctx.globalAlpha = 1;

            // the chosen window, solid
            ctx.strokeStyle = t.red; ctx.lineWidth = 2.8; ctx.lineJoin = 'round';
            ctx.beginPath();
            series(from, to).forEach((p, i) => { const a = sx(p[0]), b = sy(p[1]); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
            ctx.stroke();

            // the two endpoints
            [[from, valueAt(from)], [to, valueAt(to)]].forEach((p, i) => {
                ctx.fillStyle = t.red;
                ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = t.ink; ctx.font = '600 11px system-ui, sans-serif';
                ctx.textAlign = i === 0 ? 'left' : 'right';
                ctx.fillText(p[0] + ': ' + nf(p[1]),
                    sx(p[0]) + (i === 0 ? 8 : -8), sy(p[1]) - 10);
            });

            // straight line between the endpoints — what a two-point reading sees
            ctx.strokeStyle = t.blue; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(sx(from), sy(valueAt(from)));
            ctx.lineTo(sx(to), sy(valueAt(to)));
            ctx.stroke(); ctx.setLineDash([]);
        }

        function describe() {
            const a = valueAt(from), b = valueAt(to), yrs = to - from;
            const pc = pctChange(a, b), ar = annualRate(a, b, yrs);
            const dir = pc > 1 ? 'up' : pc < -1 ? 'down' : 'flat';
            maths.innerHTML =
                '<table>' +
                '<tr><th>Population at the start (P₁), ' + from + '</th><td>' + nf(a) + '</td></tr>' +
                '<tr><th>Population at the end (P₂), ' + to + '</th><td>' + nf(b) + '</td></tr>' +
                '<tr><th>Percent change &nbsp;<span style="font-weight:400">(P₂ − P₁) ÷ P₁ × 100</span></th>' +
                '<td class="u3sc-big ' + (pc >= 0 ? 'u3sc-up' : 'u3sc-down') + '">' +
                '(' + nf(b) + ' − ' + nf(a) + ') ÷ ' + nf(a) + ' × 100 = ' +
                (pc > 0 ? '+' : '') + pc.toFixed(1) + '%</td></tr>' +
                '<tr><th>Average rate of change &nbsp;<span style="font-weight:400">per year, over ' +
                yrs + ' ' + (yrs === 1 ? 'year' : 'years') + '</span></th>' +
                '<td class="' + (ar >= 0 ? 'u3sc-up' : 'u3sc-down') + '">' +
                (ar > 0 ? '+' : '') + ar.toFixed(2) + '% per year</td></tr>' +
                '</table>';

            let story;
            if (from <= 1980 && to >= 2014)
                story = 'the whole record: a catastrophic collapse in the 1980s, then a partial and ' +
                        'incomplete recovery. Fewer than a third of the 1979 elephants are left.';
            else if (from >= 1994 && to >= 2010)
                story = 'a recovery story — true, but measured from the bottom of a crash.';
            else if (from <= 1980 && to <= 1996)
                story = 'a collapse, and nothing but a collapse. Poaching for ivory through the 1980s.';
            else if (to - from <= 5)
                story = 'far too short a window to separate a trend from ordinary year-to-year wobble.';
            else if (from >= 2005)
                story = 'a decline — the population peaked around 2007 and has fallen since.';
            else story = 'a partial view. Slide the ends and see how much the verdict moves.';

            readout.innerHTML =
                'This window says the population went <strong>' + dir + '</strong> by <strong>' +
                (pc > 0 ? '+' : '') + pc.toFixed(1) + '%</strong> — ' + story +
                '<br><strong>Two different quantities, often confused.</strong> The percent change ' +
                'answers "how much bigger or smaller, end to end?" The rate answers "how fast, per ' +
                'year?" A −78% change over 16 years and a −78% change over 2 years are the same ' +
                'percent change and utterly different emergencies. Always say which one you mean.';
        }

        paintOpts();
        drawPreview();
        draw();

        /* ---------- verification hooks ------------------------------- */
        root._simState = () => {
            const a = valueAt(from), b = valueAt(to);
            return {
                phase: revealed ? 'slider' : 'question',
                picked, revealed, correct: picked === CORRECT,
                from, to,
                p1: Math.round(a), p2: Math.round(b),
                percentChange: +pctChange(a, b).toFixed(2),
                annualRatePercent: +annualRate(a, b, to - from).toFixed(3)
            };
        };
        root._simSolve = () => {
            picked = CORRECT; paintOpts(); btnCheck.disabled = false; btnCheck.click();
            setWindow(1979, 2016);
            return root._simState();
        };
    };
})();
