/* =============================================================
   INTERACTIVE — The doubling machine
   -------------------------------------------------------------
   Registers window.SIMS['u3-doubling'].  Serves HS-LS2-1
   ("I can differentiate between exponential and logistic growth"
   and the SEP target on analysing a computational simulation).

   Two parts, in this order on purpose.

   PART 1 makes the reader COMMIT. The deck's own bacteria-bottle
   question is asked before anything is explained, because the
   wrong answer is the interesting one: almost everybody says
   "half past eleven", and the feeling of being wrong is what makes
   the rest of the chapter land.

   PART 2 is the machine itself. Every number on screen is
   recomputed from N0 * 2^g at draw time, so the curve, the count
   and the readout cannot drift apart from one another. The same
   series is redrawn on a doubling (log) axis on request, which is
   the single most useful habit this chapter can leave behind.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u3dbl-style';

    const W = 700, H = 300;
    const PAD = { l: 74, r: 20, t: 18, b: 42 };

    const OPTIONS = [
        { id: '1130', label: '11:30 — halfway through the hour' },
        { id: '1145', label: '11:45' },
        { id: '1159', label: '11:59 — one minute before the end' },
        { id: '1200', label: 'It is never half full; it fills gradually' }
    ];
    const CORRECT = '1159';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u3dbl { --u3-ok:#2e7d32; }',
            '[data-theme="dark"] .u3dbl { --u3-ok:#7fc98a; }',
            '[data-theme="sepia"] .u3dbl { --u3-ok:#4a6b3d; }',
            '.u3dbl-q { padding:1.1rem 1.25rem 0; }',
            '.u3dbl-q p { margin:0 0 0.7rem; font-size:0.88rem; line-height:1.6; }',
            '.u3dbl-opts { display:flex; flex-direction:column; gap:0.4rem; margin-bottom:0.9rem; }',
            '.u3dbl-opt { font:inherit; font-size:0.83rem; text-align:left; cursor:pointer;',
            '   padding:0.5rem 0.8rem; border:1px solid var(--border); border-radius:8px;',
            '   background:var(--bg); color:var(--text); transition:all 0.12s; }',
            '.u3dbl-opt:hover { border-color:var(--light-teal); }',
            '.u3dbl-opt:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.u3dbl-opt[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.u3dbl-opt.right { border-color:var(--u3-ok); box-shadow:0 0 0 2px var(--u3-ok); font-weight:600; }',
            '.u3dbl-opt.wrong { border-color:var(--red); box-shadow:0 0 0 2px var(--red); text-decoration:line-through; opacity:0.75; }',
            '.u3dbl-verdict { border-left:3px solid var(--light-teal); padding:0.15rem 0 0.15rem 0.85rem;',
            '   margin:0 0 1rem; }',
            '.u3dbl-verdict p { margin:0 0 0.5rem; font-size:0.85rem; line-height:1.6; }',
            '.u3dbl-verdict p:last-child { margin-bottom:0; }',
            '.u3dbl-verdict.hit { border-left-color:var(--u3-ok); }',
            '.u3dbl-table { width:100%; border-collapse:collapse; font-size:0.78rem; margin:0.5rem 0 0; }',
            '.u3dbl-table th, .u3dbl-table td { border:1px solid var(--border); padding:0.22rem 0.5rem;',
            '   text-align:right; font-variant-numeric:tabular-nums; }',
            '.u3dbl-table th { background:var(--bg-nav-active); color:var(--text); font-weight:700; text-align:right; }',
            '.u3dbl-table td.hl { color:var(--red); font-weight:800; }',
            '.u3dbl-hide { display:none; }',
            '.u3dbl .sim-btn:disabled { opacity:0.45; cursor:not-allowed; }',
            '.u3dbl-scale { display:flex; gap:0.4rem; padding:0 1.25rem 0.9rem; flex-wrap:wrap; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u3-doubling'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u3dbl');
        root.appendChild(wrap);

        /* ---------- state ------------------------------------------- */
        let picked = null;          // the reader's answer to part 1
        let revealed = false;       // has part 1 been marked
        let gen = 0;                // generations advanced in part 2
        let logAxis = false;
        const MAXGEN = 24;

        /* ---------- part 1: commit before explaining ----------------- */
        const qBox = U.el('div', 'u3dbl-q');
        const qText = document.createElement('p');
        qText.innerHTML = 'A single bacterium is dropped into a bottle at <strong>11:00</strong>. ' +
            'It divides in two every minute, and each of those divides again the minute after. ' +
            'At exactly <strong>12:00</strong> the bottle is completely full.' +
            '<br><strong>At what time was the bottle half full?</strong> Choose before you read on.';
        qBox.appendChild(qText);
        const optHost = U.el('div', 'u3dbl-opts');
        qBox.appendChild(optHost);
        const verdict = U.el('div', 'u3dbl-verdict u3dbl-hide');
        qBox.appendChild(verdict);
        wrap.appendChild(qBox);

        const optBtns = OPTIONS.map(o => {
            const b = U.el('button', 'u3dbl-opt');
            b.type = 'button';
            b.textContent = o.label;
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
        const btnCheck = U.button(qBtns, 'Lock in my answer', 'primary');
        wrap.appendChild(qBtns);
        btnCheck.disabled = true;

        btnCheck.addEventListener('click', () => {
            if (!picked) return;
            revealed = true;
            const hit = picked === CORRECT;
            verdict.className = 'u3dbl-verdict' + (hit ? ' hit' : '');
            // Every figure below is computed, not typed.
            const rows = [59, 58, 57, 55, 50, 45, 30].map(m => {
                const stepsLeft = 60 - m;
                return { time: '11:' + m, frac: Math.pow(2, -stepsLeft) };
            });
            // Percentages below a tenth of a per cent stop meaning anything to
            // a reader, so they are shown as "1 part in N" instead.
            const pct = f => f >= 0.01 ? (f * 100).toFixed(1) + '%'
                : f >= 0.0005 ? (f * 100).toFixed(3) + '%'
                : '1 part in ' + Math.round(1 / f).toLocaleString();
            let html = '<p><strong>' + (hit ? 'Correct — and most people get this wrong.'
                : 'Not quite. The answer is 11:59.') + '</strong> ' +
                'The bottle doubles every minute, so it goes from half full to completely full in ' +
                'one single minute. Run that backwards and the numbers are brutal:</p>' +
                '<table class="u3dbl-table"><tr><th>Time</th>' +
                rows.map(r => '<th>' + r.time + '</th>').join('') + '</tr>' +
                '<tr><th>How full</th>' +
                rows.map((r, i) => '<td' + (i === 0 ? ' class="hl"' : '') + '>' + pct(r.frac) + '</td>').join('') +
                '</tr></table>' +
                '<p>At 11:55 — with five minutes to go and the bottle already crowded beyond anything ' +
                'the bacteria have experienced — it is only ' + pct(Math.pow(2, -5)) + ' full. At half past ' +
                'eleven, the halfway point in <em>time</em>, the bottle holds ' + pct(Math.pow(2, -30)) +
                ' of what it can hold — about one part in a billion. A bacterium looking around at ' +
                '11:55 would conclude, reasonably and completely wrongly, that there was plenty of ' +
                'room left.</p>' +
                '<p>That is the whole problem with exponential growth. It looks like nothing is ' +
                'happening right up until the moment it is too late — and doubling the size of the ' +
                'bottle buys exactly one extra minute.</p>';
            verdict.innerHTML = html;
            verdict.classList.remove('u3dbl-hide');
            paintOpts();
            machine.classList.remove('u3dbl-hide');
            draw(); describe();
        });

        /* ---------- part 2: the machine ------------------------------ */
        const machine = U.el('div', 'u3dbl-hide');
        wrap.appendChild(machine);

        const head = U.el('div', 'u3dbl-q');
        head.innerHTML = '<p style="margin-bottom:0"><strong>Now build one.</strong> Start with one cell ' +
            'and advance it a generation at a time. Watch where the curve is after 10 generations, ' +
            'and then look at what it does between generation 18 and generation 20.</p>';
        machine.appendChild(head);

        const st = U.stage(machine, W, H,
            'A graph of the number of cells against the number of generations. ' +
            'The curve is redrawn as generations are added.');
        const canvas = st.canvas, ctx = st.ctx;

        const controls = U.el('div', 'sim-controls');
        machine.appendChild(controls);
        const sN0 = U.slider(controls, 'u3d-n0', 'Starting cells', 1, 10, 1, v => v);
        const sMin = U.slider(controls, 'u3d-min', 'Minutes per division', 10, 60, 20, v => v + ' min', 5);

        const btns = U.el('div', 'sim-buttons');
        machine.appendChild(btns);
        const bStep = U.button(btns, 'Advance one generation', 'primary');
        const bTen = U.button(btns, 'Advance ten');
        const bAxis = U.button(btns, 'Switch to a doubling axis');
        const bReset = U.button(btns, 'Reset');

        const readout = U.el('div', 'sim-readout');
        machine.appendChild(readout);

        bStep.addEventListener('click', () => { gen = Math.min(MAXGEN, gen + 1); draw(); describe(); });
        bTen.addEventListener('click', () => { gen = Math.min(MAXGEN, gen + 10); draw(); describe(); });
        bReset.addEventListener('click', () => { gen = 0; draw(); describe(); });
        bAxis.addEventListener('click', () => {
            logAxis = !logAxis;
            bAxis.textContent = logAxis ? 'Switch back to an ordinary axis' : 'Switch to a doubling axis';
            draw(); describe();
        });
        [sN0.input, sMin.input].forEach(i => i.addEventListener('input', () => { draw(); describe(); }));

        /* ---------- the model --------------------------------------- */
        const N0 = () => +sN0.input.value;
        const count = g => N0() * Math.pow(2, g);
        const ceilingFor = () => N0() * Math.pow(2, MAXGEN);

        /* ---------- drawing ----------------------------------------- */
        const theme = U.theme(() => { draw(); });

        function draw() {
            const t = theme.current;
            const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);

            const top = ceilingFor();
            const sx = g => PAD.l + g / MAXGEN * pw;
            const sy = v => logAxis
                ? PAD.t + ph - (Math.log2(Math.max(v, 1)) / Math.log2(top)) * ph
                : PAD.t + ph - (v / top) * ph;

            // gridlines
            const ticks = logAxis
                ? [1, 2, 3, 4, 5, 6].map(k => N0() * Math.pow(2, MAXGEN * k / 6))
                : [0.25, 0.5, 0.75, 1].map(f => top * f);
            ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
            ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right';
            ticks.forEach(v => {
                const y = sy(v);
                ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + pw, y); ctx.stroke();
                ctx.fillStyle = t.axis;
                ctx.fillText(fmt(v), PAD.l - 7, y + 3.5);
            });
            if (logAxis) { ctx.fillStyle = t.axis; ctx.fillText(fmt(N0()), PAD.l - 7, PAD.t + ph + 3.5); }

            // axes
            ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, PAD.t + ph);
            ctx.lineTo(PAD.l + pw, PAD.t + ph); ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.textAlign = 'center'; ctx.fillStyle = t.axis;
            [0, 6, 12, 18, 24].forEach(g => ctx.fillText(String(g), sx(g), PAD.t + ph + 16));
            ctx.fillText('Generations', PAD.l + pw / 2, H - 6);
            ctx.save();
            ctx.translate(16, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText(logAxis ? 'Cells (doubling axis)' : 'Cells', 0, 0);
            ctx.restore();

            // the curve so far
            if (gen > 0) {
                ctx.strokeStyle = t.red; ctx.lineWidth = 2.6;
                ctx.lineJoin = 'round';
                ctx.beginPath();
                for (let g = 0; g <= gen; g += 0.25) {
                    const v = N0() * Math.pow(2, g);
                    const x = sx(g), y = sy(v);
                    g === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            // the point we are at
            ctx.fillStyle = t.red;
            ctx.beginPath(); ctx.arc(sx(gen), sy(count(gen)), 4.5, 0, Math.PI * 2); ctx.fill();

            // ghost of the rest of the run
            ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.28;
            ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let g = gen; g <= MAXGEN; g += 0.25) {
                const x = sx(g), y = sy(N0() * Math.pow(2, g));
                g === gen ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

            // label the current count
            ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif';
            ctx.textAlign = sx(gen) > PAD.l + pw * 0.66 ? 'right' : 'left';
            ctx.fillText(fmt(count(gen)) + ' cells',
                sx(gen) + (sx(gen) > PAD.l + pw * 0.66 ? -9 : 9), sy(count(gen)) - 10);
        }

        function fmt(v) {
            v = Math.round(v);
            if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + ' bn';
            if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + ' m';
            return v.toLocaleString();
        }

        function describe() {
            const n = count(gen), mins = gen * +sMin.input.value;
            const hrs = Math.floor(mins / 60), rem = mins % 60;
            const prev = gen > 0 ? count(gen - 1) : null;
            const added = prev === null ? 0 : n - prev;
            const total24 = N0() * Math.pow(2, Math.floor(24 * 60 / +sMin.input.value));
            readout.innerHTML =
                'Generation <strong>' + gen + '</strong> &middot; <strong>' + fmt(n) + '</strong> cells &middot; ' +
                'elapsed <strong>' + (hrs ? hrs + ' h ' : '') + rem + ' min</strong>' +
                (gen > 0 ? ' &middot; this generation alone added <strong>' + fmt(added) + '</strong> cells — ' +
                    'as many as every generation before it put together, plus ' + fmt(N0()) + '.' : '') +
                '<br>At this division rate one cell would become <strong>' + total24.toExponential(2) +
                '</strong> cells in a single day. That is more mass than the Earth, which is the ' +
                'clearest possible proof that something stops it. Chapter 3.2 is about what.' +
                (logAxis ? '<br><strong>On this axis every gridline is many times the one below it.</strong> ' +
                    'Exponential growth becomes a straight line — and a straight line here is the ' +
                    'fingerprint you are looking for.' : '');
        }

        paintOpts();
        draw();

        /* ---------- verification hooks ------------------------------- */
        root._simState = () => ({
            phase: revealed ? 'machine' : 'question',
            picked, revealed, correct: picked === CORRECT,
            generation: gen,
            startingCells: N0(),
            cells: count(gen),
            minutesPerDivision: +sMin.input.value,
            elapsedMinutes: gen * +sMin.input.value,
            logAxis
        });
        root._simSolve = () => {
            picked = CORRECT; paintOpts();
            btnCheck.disabled = false;
            btnCheck.click();
            gen = MAXGEN; logAxis = true;
            bAxis.textContent = 'Switch back to an ordinary axis';
            draw(); describe();
            return root._simState();
        };
    };
})();
