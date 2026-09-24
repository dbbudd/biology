/* =============================================================
   INTERACTIVE — Growth-model sandbox
   -------------------------------------------------------------
   Registers window.SIMS['u3-growth-model'].  Serves HS-LS2-1
   (targets 1, 2, 4 and the SEP target on computational models).

   The reader commits to a prediction, then gets three sliders —
   r, K and N0 — plus one switch that changes everything: whether
   the population can sense its own density immediately, or only
   after a delay.

   The model is a discrete-time logistic with an optional lag:

       N(t+1) = N(t) + r * N(t) * (1 - N(t - lag) / K)

   With lag = 0 it settles smoothly on K. With a lag it overshoots,
   because by the time the shortage registers the population has
   already outgrown the food. That is not a bug added for drama —
   it is the actual reason reindeer on St Matthew Island went past
   their carrying capacity, and it falls straight out of the
   equation. The exponential curve for the same r is drawn behind
   it for comparison, so the reader can see exactly where the two
   models part company.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u3gm-style';

    const W = 700, H = 320;
    const PAD = { l: 70, r: 22, t: 18, b: 44 };
    const STEPS = 60;

    const OPTIONS = [
        { id: 'accel', label: 'It keeps accelerating — the curve never bends over' },
        { id: 'settle', label: 'It rises, slows, and settles just under 500' },
        { id: 'over', label: 'It shoots past 500, then falls back' },
        { id: 'die', label: 'It dies out' }
    ];
    const CORRECT = 'settle';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u3gm { --u3-ok:#2e7d32; }',
            '[data-theme="dark"] .u3gm { --u3-ok:#7fc98a; }',
            '[data-theme="sepia"] .u3gm { --u3-ok:#4a6b3d; }',
            '.u3gm-q { padding:1.1rem 1.25rem 0; }',
            '.u3gm-q p { margin:0 0 0.7rem; font-size:0.88rem; line-height:1.6; }',
            '.u3gm-opts { display:flex; flex-direction:column; gap:0.4rem; margin-bottom:0.9rem; }',
            '.u3gm-opt { font:inherit; font-size:0.83rem; text-align:left; cursor:pointer;',
            '   padding:0.5rem 0.8rem; border:1px solid var(--border); border-radius:8px;',
            '   background:var(--bg); color:var(--text); transition:all 0.12s; }',
            '.u3gm-opt:hover { border-color:var(--light-teal); }',
            '.u3gm-opt:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.u3gm-opt[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.u3gm-opt.right { border-color:var(--u3-ok); box-shadow:0 0 0 2px var(--u3-ok); font-weight:600; }',
            '.u3gm-opt.wrong { border-color:var(--red); box-shadow:0 0 0 2px var(--red); opacity:0.75; }',
            '.u3gm-verdict { border-left:3px solid var(--light-teal); padding:0.15rem 0 0.15rem 0.85rem; margin:0 0 1rem; }',
            '.u3gm-verdict.hit { border-left-color:var(--u3-ok); }',
            '.u3gm-verdict p { margin:0 0 0.5rem; font-size:0.85rem; line-height:1.6; }',
            '.u3gm-verdict p:last-child { margin-bottom:0; }',
            '.u3gm-hide { display:none; }',
            '.u3gm .sim-btn:disabled { opacity:0.45; cursor:not-allowed; }',
            '.u3gm-key { display:flex; gap:1.1rem; flex-wrap:wrap; padding:0 1.25rem 0.6rem; font-size:0.74rem;',
            '   color:var(--text-secondary); }',
            '.u3gm-key i { display:inline-block; width:20px; height:0; border-top:2.4px solid; vertical-align:middle;',
            '   margin-right:0.35rem; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u3-growth-model'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u3gm');
        root.appendChild(wrap);

        let picked = null, revealed = false;

        /* ---------- commit first ------------------------------------ */
        const qBox = U.el('div', 'u3gm-q');
        qBox.innerHTML = '<p>Ten rabbits are released onto an island that can support about ' +
            '<strong>500</strong>. They breed fast — the population would grow by about 40% a year ' +
            'if nothing held it back. Food runs short gradually as numbers rise, and the rabbits ' +
            'feel the shortage straight away.<br><strong>Predict what the population does over ' +
            'the next forty years.</strong></p>';
        const optHost = U.el('div', 'u3gm-opts');
        qBox.appendChild(optHost);
        const verdict = U.el('div', 'u3gm-verdict u3gm-hide');
        qBox.appendChild(verdict);
        wrap.appendChild(qBox);

        const optBtns = OPTIONS.map(o => {
            const b = U.el('button', 'u3gm-opt');
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
        const btnCheck = U.button(qBtns, 'Lock in my prediction', 'primary');
        wrap.appendChild(qBtns);
        btnCheck.disabled = true;

        btnCheck.addEventListener('click', () => {
            if (!picked) return;
            revealed = true;
            const hit = picked === CORRECT;
            const run = simulate(0.4, 500, 10, 0);
            const at40 = run.log[40];
            const peak = Math.max.apply(null, run.log);
            verdict.className = 'u3gm-verdict' + (hit ? ' hit' : '');
            verdict.innerHTML =
                '<p><strong>' + (hit ? 'Right.' : 'The answer is the second one.') + '</strong> ' +
                'With no delay in the feedback, this population reaches <strong>' +
                at40.toFixed(0) + '</strong> after forty years and its highest value ' +
                'anywhere in the run is <strong>' + peak.toFixed(0) + '</strong> — it never goes ' +
                'above K at all. Growth is fastest not at the start and not at the end, but ' +
                'halfway up, at about <strong>' + (500 / 2) + '</strong> rabbits: plenty of ' +
                'breeders, still plenty of food.</p>' +
                '<p>Now change one thing at a time. The third answer — overshoot and crash — is ' +
                'not wrong in general; it just needs something this island did not have. ' +
                'Find it with the <em>delay</em> slider.</p>';
            verdict.classList.remove('u3gm-hide');
            paintOpts();
            box.classList.remove('u3gm-hide');
            draw(); describe();
        });

        /* ---------- the sandbox ------------------------------------- */
        const box = U.el('div', 'u3gm-hide');
        wrap.appendChild(box);

        const st = U.stage(box, W, H,
            'A graph of population size against time showing a logistic curve settling on the ' +
            'carrying capacity, with the exponential curve for the same growth rate drawn behind it.');
        const canvas = st.canvas, ctx = st.ctx;

        const key = U.el('div', 'u3gm-key');
        key.innerHTML =
            '<span><i style="border-color:var(--red)"></i>Logistic — with a ceiling</span>' +
            '<span><i style="border-color:var(--text-secondary);border-top-style:dashed"></i>Exponential — no ceiling</span>' +
            '<span><i style="border-color:var(--blue);border-top-style:dashed"></i>Carrying capacity K</span>';
        box.appendChild(key);

        const controls = U.el('div', 'sim-controls');
        box.appendChild(controls);
        const sR = U.slider(controls, 'u3g-r', 'Growth rate r', 5, 240, 40, v => (v / 100).toFixed(2) + ' per year', 5);
        const sK = U.slider(controls, 'u3g-k', 'Carrying capacity K', 100, 1200, 500, v => v.toLocaleString(), 50);
        const sN = U.slider(controls, 'u3g-n0', 'Starting population N₀', 2, 300, 10, v => v, 2);
        const sL = U.slider(controls, 'u3g-lag', 'Delay before shortage is felt', 0, 5, 0,
            v => v === 0 ? 'none — felt at once' : v + (v === 1 ? ' year' : ' years'));

        const btns = U.el('div', 'sim-buttons');
        box.appendChild(btns);
        const bOver = U.button(btns, 'Show me an overshoot', 'primary');
        const bSt = U.button(btns, 'Back to a clean S-curve');
        const bCrash = U.button(btns, 'Push it until it breaks');

        const readout = U.el('div', 'sim-readout');
        box.appendChild(readout);

        [sR, sK, sN, sL].forEach(s => s.input.addEventListener('input', () => { draw(); describe(); }));
        function setAll(r, k, n, l) {
            sR.input.value = r; sK.input.value = k; sN.input.value = n; sL.input.value = l;
            [sR, sK, sN, sL].forEach(s => s.sync());
            draw(); describe();
        }
        // Parameters chosen by sweeping the model, not by eye: (r 0.40, lag 2)
        // is the cleanest damped overshoot that still settles on K, and
        // (r 0.70, lag 3) is the mildest setting that drives it to extinction.
        bOver.addEventListener('click', () => setAll(40, 500, 10, 2));
        bSt.addEventListener('click', () => setAll(40, 500, 10, 0));
        bCrash.addEventListener('click', () => setAll(70, 500, 10, 3));

        /* ---------- the model --------------------------------------- */
        function simulate(r, K, N0, lag) {
            const log = [N0], exp = [N0];
            for (let t = 0; t < STEPS; t++) {
                const sensed = log[Math.max(0, t - lag)];
                let next = log[t] + r * log[t] * (1 - sensed / K);
                if (next < 0) next = 0;
                if (next > K * 4) next = K * 4;      // keep the chart readable
                log.push(next);
                exp.push(Math.min(exp[t] * (1 + r), K * 4));
            }
            return { log, exp };
        }
        const params = () => ({
            r: +sR.input.value / 100, K: +sK.input.value,
            N0: +sN.input.value, lag: +sL.input.value
        });

        /* ---------- drawing ----------------------------------------- */
        const theme = U.theme(() => draw());

        function draw() {
            const t = theme.current, p = params();
            const run = simulate(p.r, p.K, p.N0, p.lag);
            const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
            const peak = Math.max.apply(null, run.log);
            const top = Math.max(p.K * 1.25, peak * 1.1);

            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
            const sx = i => PAD.l + i / STEPS * pw;
            const sy = v => PAD.t + ph - Math.min(v, top) / top * ph;

            ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
            ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = t.axis;
            for (let f = 0; f <= 1.0001; f += 0.25) {
                const v = top * f, y = sy(v);
                ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + pw, y); ctx.stroke();
                ctx.fillText(Math.round(v).toLocaleString(), PAD.l - 7, y + 3.5);
            }
            ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, PAD.t + ph);
            ctx.lineTo(PAD.l + pw, PAD.t + ph); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.textAlign = 'center';
            [0, 15, 30, 45, 60].forEach(i => ctx.fillText(String(i), sx(i), PAD.t + ph + 16));
            ctx.fillText('Years', PAD.l + pw / 2, H - 6);
            ctx.save(); ctx.translate(15, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText('Population size', 0, 0); ctx.restore();

            // K line
            ctx.strokeStyle = t.blue; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(PAD.l, sy(p.K)); ctx.lineTo(PAD.l + pw, sy(p.K)); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = t.blue; ctx.textAlign = 'right'; ctx.font = '600 10.5px system-ui, sans-serif';
            ctx.fillText('K = ' + p.K.toLocaleString(), PAD.l + pw - 4, sy(p.K) - 6);

            // exponential ghost
            ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.5;
            ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6;
            ctx.beginPath();
            run.exp.forEach((v, i) => { const x = sx(i), y = sy(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

            // logistic
            ctx.strokeStyle = t.red; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
            ctx.beginPath();
            run.log.forEach((v, i) => { const x = sx(i), y = sy(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.stroke();

            // mark the peak when it overshoots
            if (peak > p.K * 1.02) {
                const pi = run.log.indexOf(peak);
                ctx.fillStyle = t.red;
                ctx.beginPath(); ctx.arc(sx(pi), sy(peak), 4.5, 0, Math.PI * 2); ctx.fill();
                ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left';
                ctx.fillStyle = t.ink;
                ctx.fillText('overshoot: ' + Math.round(peak).toLocaleString(), sx(pi) + 8, sy(peak) - 8);
            }
        }

        function describe() {
            const p = params();
            const run = simulate(p.r, p.K, p.N0, p.lag);
            const final = run.log[STEPS];
            const peak = Math.max.apply(null, run.log);
            const trough = Math.min.apply(null, run.log.slice(run.log.indexOf(peak)));
            const over = peak > p.K * 1.02;
            const crashed = over && trough < p.K * 0.5;
            const expFinal = run.exp[STEPS];
            const halfIdx = run.log.findIndex(v => v >= p.K / 2);

            let s = 'After 60 years: <strong>' + Math.round(final).toLocaleString() + '</strong> ' +
                '(K = ' + p.K.toLocaleString() + '). ' +
                'Highest point reached: <strong>' + Math.round(peak).toLocaleString() + '</strong>' +
                (over ? ' — <strong>' + Math.round((peak / p.K - 1) * 100) + '% above K</strong>.' : ' — never above K.') +
                ' Growth was fastest around year <strong>' + (halfIdx < 0 ? '—' : halfIdx) +
                '</strong>, when the population passed half of K.';
            s += '<br>Without a ceiling the same growth rate would have produced <strong>' +
                (expFinal >= p.K * 4 ? 'more than ' + (p.K * 4).toLocaleString() : Math.round(expFinal).toLocaleString()) +
                '</strong> by now. The gap between the two lines <em>is</em> the limiting factors.';
            if (p.lag === 0) {
                s += '<br><strong>Delay is off</strong>, so shortage registers the instant it appears and ' +
                    'the curve can never overshoot. Add a delay and watch that guarantee disappear.';
            } else if (crashed) {
                s += '<br><strong>Overshoot and die-back.</strong> The population climbed to ' +
                    Math.round(peak).toLocaleString() + ' before the shortage registered, ate the resource ' +
                    'down past what it could regrow, and fell to ' + Math.round(trough).toLocaleString() +
                    (trough < 1 ? ' — extinct.' : '.') +
                    ' That is the St Matthew Island story in one line — and notice that the ' +
                    'carrying capacity itself may not survive the visit.';
            } else if (over) {
                s += '<br><strong>Overshoot, then oscillation.</strong> The ' + p.lag + '-year delay means the ' +
                    'population is always responding to how crowded it was ' + p.lag + ' years ago, so it ' +
                    'sails past K, corrects too hard, and rings like a struck bell before settling.';
            }
            readout.innerHTML = s;
        }

        paintOpts();
        draw();

        /* ---------- verification hooks ------------------------------- */
        root._simState = () => {
            const p = params(), run = simulate(p.r, p.K, p.N0, p.lag);
            const peak = Math.max.apply(null, run.log);
            return {
                phase: revealed ? 'sandbox' : 'question',
                picked, revealed, correct: picked === CORRECT,
                r: p.r, K: p.K, N0: p.N0, lag: p.lag,
                finalN: +run.log[STEPS].toFixed(2),
                peakN: +peak.toFixed(2),
                overshot: peak > p.K * 1.02,
                overshootPercent: +((peak / p.K - 1) * 100).toFixed(1)
            };
        };
        root._simSolve = () => {
            picked = CORRECT; paintOpts(); btnCheck.disabled = false; btnCheck.click();
            setAll(40, 500, 10, 2);
            return root._simState();
        };
    };
})();
