/* =============================================================
   SIMULATION — Can a population keep up with a changing world?
   -------------------------------------------------------------
   Registers window.SIMS.rescue.  Supports HS-LS4-5.

   The environment shifts: the trait that survives best moves, year
   after year. Selection drags the population's mean after it, but
   only as fast as its variation allows. While the population lags,
   fewer individuals survive and numbers fall. Change slowly enough
   and the population tracks the shift and recovers. Change faster
   than it can adapt and it goes extinct — with nothing about the
   process having altered except the speed.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    const W = 680, H = 320, MAXGEN = 120, K = 1000;
    const PAD = { l: 46, r: 110, t: 16, b: 36 };
    // Tuned so the outcome actually turns on the rate of change:
    //   equilibrium lag = rate / (RESPONSE * variation)
    //   survival        = exp(-lag^2 / 2 TOL^2)
    //   growth factor   = FLOOR + GAIN * survival
    // With these values a slow change is tracked and survived, while a fast
    // change at low variation settles at a lag the population cannot pay for.
    const TOL = 0.5, RESPONSE = 0.35, FLOOR = 0.55, GAIN = 0.75;

    window.SIMS.rescue = function (root) {
        const { ctx } = U.stage(root, W, H,
            'A chart with the best-suited trait value rising steadily and the population mean ' +
            'following behind it, above a band showing the population size rising or collapsing.');

        const controls = U.el('div', 'sim-controls');
        const rate = U.slider(controls, 'rate', 'Speed of environmental change', 0, 10, 3,
            v => v === 0 ? 'stable' : (v / 100).toFixed(2) + ' per generation');
        const varia = U.slider(controls, 'var', 'Variation in the population', 1, 10, 4,
            v => (v / 10).toFixed(1));

        const buttons = U.el('div', 'sim-buttons');
        const btnRun = U.button(buttons, 'Run', 'primary');
        const btnStep = U.button(buttons, 'Advance 1 generation');
        const btnReset = U.button(buttons, 'Reset');
        const readout = U.el('div', 'sim-readout');
        root.appendChild(controls); root.appendChild(buttons); root.appendChild(readout);

        const theme = U.theme(() => draw());
        let opt = [], mean = [], size = [], gen = 0, outcome = null;

        function reset() {
            opt = [10]; mean = [10]; size = [K]; gen = 0; outcome = null;
            draw(); describe();
        }

        function step() {
            if (outcome) return;
            const V = varia.value / 10;                 // heritable variation
            const r = rate.value / 100;                 // shift per generation
            const o = opt[opt.length - 1] + r;
            const m = mean[mean.length - 1];
            const n = size[size.length - 1];

            // selection drags the mean toward the optimum, in proportion to
            // the variation available — this is the response to selection
            const lag = o - m;
            const m2 = m + V * lag * RESPONSE;

            // survival falls as the lag grows
            const w = Math.exp(-(lag * lag) / (2 * TOL * TOL));
            const n2 = Math.min(K, Math.max(0, n * (FLOOR + GAIN * w)));

            opt.push(o); mean.push(m2); size.push(n2);
            gen++;
            if (n2 < 20) { outcome = 'extinct'; loop.stop(); }
            else if (gen >= MAXGEN) { outcome = 'survived'; loop.stop(); }
        }

        function draw() {
            const t = theme.current;
            const { pw, ph } = U.axes(ctx, t, PAD, W, H, {});
            const lo = 9.5, hi = Math.max(14, opt[opt.length - 1] + 0.5);
            const y = v => PAD.t + ph - ((v - lo) / (hi - lo)) * ph;
            const x = g => PAD.l + (g / MAXGEN) * pw;

            // population size as a band along the bottom
            ctx.fillStyle = t.dark ? 'rgba(127,201,138,0.22)' : 'rgba(46,125,50,0.14)';
            ctx.beginPath(); ctx.moveTo(x(0), PAD.t + ph);
            size.forEach((n, g) => ctx.lineTo(x(g), PAD.t + ph - (n / K) * ph * 0.32));
            ctx.lineTo(x(size.length - 1), PAD.t + ph); ctx.closePath(); ctx.fill();

            // the moving optimum
            ctx.strokeStyle = t.red; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
            ctx.beginPath();
            opt.forEach((v, g) => g ? ctx.lineTo(x(g), y(v)) : ctx.moveTo(x(g), y(v)));
            ctx.stroke(); ctx.setLineDash([]);

            // the population mean, trailing behind
            ctx.strokeStyle = t.blue; ctx.lineWidth = 2.4;
            ctx.beginPath();
            mean.forEach((v, g) => g ? ctx.lineTo(x(g), y(v)) : ctx.moveTo(x(g), y(v)));
            ctx.stroke();

            ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
            ctx.fillStyle = t.red;  ctx.fillText('best-suited trait', PAD.l + pw + 10, PAD.t + 18);
            ctx.fillStyle = t.blue; ctx.fillText('population mean', PAD.l + pw + 10, PAD.t + 36);
            ctx.fillStyle = t.ok;   ctx.fillText('population size', PAD.l + pw + 10, PAD.t + 54);
            ctx.fillStyle = t.axis; ctx.textAlign = 'center';
            ctx.fillText('generations →', PAD.l + pw / 2, H - 8);
            ctx.save(); ctx.translate(14, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText('trait value', 0, 0); ctx.restore();

            if (outcome === 'extinct') {
                ctx.fillStyle = t.red; ctx.font = '600 15px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Population extinct', PAD.l + pw / 2, PAD.t + ph / 2);
            }
        }

        function describe() {
            const lag = opt[opt.length - 1] - mean[mean.length - 1];
            const n = Math.round(size[size.length - 1]);
            let note;
            if (outcome === 'extinct') {
                note = 'The environment moved faster than the population could adapt. The lag grew, survival fell, numbers collapsed — and with fewer individuals there was even less variation to select from.';
            } else if (outcome === 'survived') {
                note = 'The population kept up. Its mean tracked the changing conditions closely enough that numbers held.';
            } else if (rate.value === 0) {
                note = 'Nothing is changing, so the population sits at its best-suited value.';
            } else if (lag > 1.4) {
                note = 'The population is falling behind. Watch the size band — fewer individuals are surviving each generation.';
            } else {
                note = 'The mean is tracking the change. Selection is moving the population about as fast as conditions are moving.';
            }
            readout.innerHTML =
                `<strong>Generation ${gen}.</strong> ${note}<br>` +
                `lag behind the environment <strong>${lag.toFixed(2)}</strong> · ` +
                `population <strong>${n}</strong> of ${K}`;
        }

        const loop = U.loop(root, () => { step(); draw(); describe(); }, 90);
        loop.onchange = on => { btnRun.textContent = on ? 'Pause' : 'Run'; };
        btnRun.onclick = () => { if (outcome) reset(); loop.toggle(); };
        btnStep.onclick = () => { loop.stop(); step(); draw(); describe(); };
        btnReset.onclick = () => { loop.stop(); reset(); };
        [rate, varia].forEach(c => c.input.addEventListener('input', describe));

        root._simState = () => ({ gen, outcome, size: size.slice(), lag: opt[opt.length - 1] - mean[mean.length - 1] });
        reset();
    };
})();
