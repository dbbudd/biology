/* =============================================================
   SIMULATION — Genetic drift, bottleneck and population size
   -------------------------------------------------------------
   Registers window.SIMS.drift.  Supports HS-LS4-4.

   Eight identical populations start with the same allele at 50%.
   Nothing about the allele is good or bad — every generation simply
   draws the next generation's alleles at random from the current
   pool. Any change you see is chance alone, which is the whole
   point: run it small and the populations scatter and fix; run it
   large and they barely move.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    const W = 680, H = 320, LINES = 8, MAXGEN = 150;
    const PAD = { l: 44, r: 100, t: 16, b: 36 };

    window.SIMS.drift = function (root) {
        const { canvas, ctx } = U.stage(root, W, H,
            'A chart of allele frequency against generation for eight separate populations, ' +
            'each drifting up or down by chance until some reach 100% or 0%.');

        const controls = U.el('div', 'sim-controls');
        const size = U.slider(controls, 'popsize', 'Population size', 1, 5, 2,
            v => [10, 25, 50, 200, 1000][v - 1] + ' individuals');
        const buttons = U.el('div', 'sim-buttons');
        const btnRun = U.button(buttons, 'Run', 'primary');
        const btnStep = U.button(buttons, 'Advance 1 generation');
        const btnBottle = U.button(buttons, 'Bottleneck now');
        const btnReset = U.button(buttons, 'Reset');
        const readout = U.el('div', 'sim-readout');
        root.appendChild(controls);
        root.appendChild(buttons);
        root.appendChild(readout);

        const theme = U.theme(() => draw());
        let tracks = [], gen = 0, bottleneckAt = null;
        const popSize = () => [10, 25, 50, 200, 1000][size.value - 1];

        function reset() {
            tracks = Array.from({ length: LINES }, () => [0.5]);
            gen = 0; bottleneckAt = null;
            draw(); describe();
        }

        function step(forcedN) {
            const N = forcedN || popSize();
            const alleles = 2 * N;
            tracks.forEach(t => {
                const p = t[t.length - 1];
                if (p <= 0 || p >= 1) { t.push(p); return; }   // fixed or lost: stays
                let count = 0;
                for (let i = 0; i < alleles; i++) if (Math.random() < p) count++;
                t.push(count / alleles);
            });
            gen++;
            if (gen >= MAXGEN) loop.stop();
        }

        function draw() {
            const t = theme.current;
            const { pw, ph } = U.axes(ctx, t, PAD, W, H, {
                gridY: [{ at: 0, label: '0%' }, { at: 0.5, label: '50%' }, { at: 1, label: '100%' }]
            });
            // the bottleneck, if one was applied
            if (bottleneckAt !== null) {
                const x = PAD.l + (bottleneckAt / MAXGEN) * pw;
                ctx.strokeStyle = t.red; ctx.globalAlpha = 0.5;
                ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, PAD.t + ph); ctx.stroke();
                ctx.setLineDash([]); ctx.globalAlpha = 1;
                ctx.fillStyle = t.red; ctx.font = '10px system-ui, sans-serif';
                ctx.textAlign = 'left'; ctx.fillText('bottleneck', x + 4, PAD.t + 11);
            }
            tracks.forEach((track, i) => {
                const hue = (i * 45) % 360;
                ctx.strokeStyle = `hsl(${hue} 62% ${t.dark ? 66 : 42}%)`;
                ctx.lineWidth = 1.8; ctx.globalAlpha = 0.9;
                ctx.beginPath();
                track.forEach((p, g) => {
                    const x = PAD.l + (g / MAXGEN) * pw;
                    const y = PAD.t + ph - p * ph;
                    g ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                });
                ctx.stroke(); ctx.globalAlpha = 1;
            });
            ctx.fillStyle = t.axis; ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('generations →', PAD.l + pw / 2, H - 8);
            ctx.save();
            ctx.translate(13, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText('frequency of the allele', 0, 0);
            ctx.restore();
            // tally on the right
            const fixed = tracks.filter(t2 => t2[t2.length - 1] >= 1).length;
            const lost = tracks.filter(t2 => t2[t2.length - 1] <= 0).length;
            ctx.textAlign = 'left'; ctx.font = '11px system-ui, sans-serif';
            ctx.fillStyle = t.ok;   ctx.fillText(`${fixed} reached 100%`, PAD.l + pw + 10, PAD.t + 20);
            ctx.fillStyle = t.red;  ctx.fillText(`${lost} lost`, PAD.l + pw + 10, PAD.t + 38);
            ctx.fillStyle = t.axis; ctx.fillText(`${LINES - fixed - lost} still`, PAD.l + pw + 10, PAD.t + 56);
            ctx.fillText('varying', PAD.l + pw + 10, PAD.t + 70);
        }

        function describe() {
            const ends = tracks.map(t2 => t2[t2.length - 1]);
            const fixed = ends.filter(p => p >= 1).length;
            const lost = ends.filter(p => p <= 0).length;
            const spread = Math.max(...ends) - Math.min(...ends);
            const N = popSize();
            let note;
            if (gen === 0) {
                note = 'Eight identical populations, every one starting at 50%. Nothing makes this allele better or worse — only chance acts on it.';
            } else if (fixed + lost === LINES) {
                note = 'Every population has now lost its variation at this gene. None of it was decided by fitness.';
            } else if (N <= 25) {
                note = 'In a small population the frequency lurches about, and populations reach 0% or 100% quickly. Once there, they cannot come back — the allele is gone for good.';
            } else if (N >= 200) {
                note = 'In a large population the lines stay bunched near 50%. Chance still acts every generation, but averaged over many individuals it barely shows.';
            } else {
                note = 'Watch the lines separate. They started identical; only chance is pushing them apart.';
            }
            readout.innerHTML =
                `<strong>Generation ${gen} · ${N} individuals per population.</strong> ${note}<br>` +
                `${fixed} fixed at 100% · ${lost} lost at 0% · spread between populations <strong>${(spread * 100).toFixed(0)}%</strong>`;
        }

        const loop = U.loop(root, () => { step(); draw(); describe(); }, 130);
        loop.onchange = on => { btnRun.textContent = on ? 'Pause' : 'Run'; };

        btnRun.onclick = () => loop.toggle();
        btnStep.onclick = () => { loop.stop(); step(); draw(); describe(); };
        btnReset.onclick = () => { loop.stop(); reset(); };
        btnBottle.onclick = () => {
            // three generations at a tiny size, then back to normal
            loop.stop();
            bottleneckAt = gen;
            for (let i = 0; i < 3; i++) step(6);
            draw(); describe();
        };
        size.input.addEventListener('input', describe);

        root._simState = () => ({ gen, tracks: tracks.map(t2 => t2.slice()) });
        reset();
    };
})();
