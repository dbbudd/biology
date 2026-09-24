/* =============================================================
   SIMULATION — Selection acting on a trait distribution
   -------------------------------------------------------------
   Registers window.SIMS.selection.

   Serves HS-LS4-3: "I can analyse and interpret data to explain the
   changes in the distribution of traits in a population over time."
   The reader chooses a selection pressure, runs generations, and watches
   the distribution move — then reads the mean and spread off the readout
   and names the pattern.

   Model
     A population of individuals each carry one continuous trait value.
     Every generation each individual is given a survival weight from the
     chosen pressure; parents are drawn in proportion to that weight, and
     each offspring inherits its parent's value plus a small random change.
     Nothing else. The patterns in 6.3 all fall out of that.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};

    const W = 680, H = 300;
    const N = 400;                 // population size
    const BINS = 26;
    const LO = 6, HI = 14;         // trait range, in mm

    window.SIMS.selection = function (root) {
        // ---- interface ------------------------------------------------
        const stage = el('div', 'sim-stage');
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.width = '100%';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label',
            'A histogram of beak depth across a population, with the starting distribution ' +
            'outlined for comparison as selection shifts it.');
        stage.appendChild(canvas);

        const controls = el('div', 'sim-controls');
        const mode = select(controls, 'Selection pressure', [
            ['none', 'None — no selection'],
            ['directional', 'Only deep beaks can crack the seeds'],
            ['stabilizing', 'Both extremes do badly'],
            ['disruptive', 'Only very small and very large seeds exist']
        ], 'directional');
        const strength = slider(controls, 'sel-strength', 'Strength of the pressure', 1, 10, 5, v => v);
        const spread = slider(controls, 'sel-mut', 'New variation each generation', 0, 10, 3,
            v => v === 0 ? 'none' : (v / 10).toFixed(2) + ' mm');

        const buttons = el('div', 'sim-buttons');
        const btnStep = button(buttons, 'Advance 1 generation', 'primary');
        const btnRun  = button(buttons, 'Run');
        const btnReset= button(buttons, 'Reset');

        const readout = el('div', 'sim-readout');

        root.appendChild(stage);
        root.appendChild(controls);
        root.appendChild(buttons);
        root.appendChild(readout);

        // ---- state -----------------------------------------------------
        let pop = [], baseline = null, gen = 0, history = [];
        const ctx = canvas.getContext('2d');

        function gauss(rnd) {                     // Box-Muller
            let u = 0, v = 0;
            while (!u) u = rnd();
            while (!v) v = rnd();
            return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        }
        function reset() {
            pop = [];
            for (let i = 0; i < N; i++) {
                pop.push(clamp(10 + gauss(Math.random) * 1.0));
            }
            baseline = histogram(pop);
            gen = 0;
            history = [mean(pop)];
            draw(); describe();
        }
        const clamp = v => Math.max(LO, Math.min(HI, v));

        // ---- the model -------------------------------------------------
        function weight(x) {
            const s = +strength.input.value / 5;      // 0.2 .. 2
            const d = (x - 10) / 4;                   // -1 .. 1
            // All weights are bounded in (0, 1]. Unbounded weights let one
            // tail run away under disruptive selection — whichever extreme
            // got slightly ahead was amplified until the mean shifted, which
            // is directional selection wearing the wrong label.
            const q = (d * 2.6) * (d * 2.6);
            switch (mode.el.value) {
                case 'directional': return 1 / (1 + Math.exp(-s * d * 3));
                case 'stabilizing': return Math.exp(-s * q);
                case 'disruptive':  return 1 - 0.92 * Math.exp(-s * q);
                default:            return 1;
            }
        }
        function step() {
            const w = pop.map(weight);
            const total = w.reduce((a, b) => a + b, 0);
            if (!(total > 0)) return;
            // cumulative table so parents are drawn in proportion to weight
            const cum = []; let run = 0;
            for (let i = 0; i < w.length; i++) { run += w[i]; cum.push(run); }
            const sd = +spread.input.value / 10;
            const next = [];
            for (let i = 0; i < N; i++) {
                const r = Math.random() * total;
                let lo = 0, hi = cum.length - 1;
                while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
                next.push(clamp(pop[lo] + (sd ? gauss(Math.random) * sd : 0)));
            }
            pop = next;
            gen++;
            history.push(mean(pop));
            if (history.length > 120) history.shift();
        }

        // ---- statistics ------------------------------------------------
        function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
        function sdev(a) { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length); }
        function histogram(a) {
            const bins = new Array(BINS).fill(0);
            a.forEach(v => {
                let i = Math.floor((v - LO) / (HI - LO) * BINS);
                if (i >= BINS) i = BINS - 1; if (i < 0) i = 0;
                bins[i]++;
            });
            return bins;
        }

        // ---- drawing ---------------------------------------------------
        let theme = readTheme();
        function readTheme() {
            const cs = getComputedStyle(document.documentElement);
            const v = n => cs.getPropertyValue(n).trim();
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            const dark = theme === 'dark';
            const sepia = theme === 'sepia';
            return {
                bg: dark ? '#16202a' : (sepia ? '#ede4cb' : '#f7f9fb'),
                bar: v('--red') || '#aa272f',
                base: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.42)',
                axis: v('--text-secondary') || '#666',
                ink: v('--text') || '#111',
                line: v('--blue') || '#14509e'
            };
        }
        window.addEventListener('themechange', () => { theme = readTheme(); draw(); });

        const PAD = { l: 42, r: 14, t: 16, b: 40 };
        function draw() {
            const bins = histogram(pop);
            const peak = Math.max(...bins, ...baseline, 1);
            const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
            const bw = plotW / BINS;

            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, W, H);

            // axes
            ctx.strokeStyle = theme.axis; ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, PAD.t + plotH);
            ctx.lineTo(PAD.l + plotW, PAD.t + plotH); ctx.stroke();
            ctx.globalAlpha = 1;

            // current distribution
            ctx.fillStyle = theme.bar;
            bins.forEach((c, i) => {
                const hgt = (c / peak) * plotH;
                ctx.fillRect(PAD.l + i * bw + 1, PAD.t + plotH - hgt, bw - 2, hgt);
            });

            // starting distribution, outlined for comparison
            ctx.strokeStyle = theme.base; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]);
            ctx.beginPath();
            baseline.forEach((c, i) => {
                const y = PAD.t + plotH - (c / peak) * plotH;
                const x = PAD.l + i * bw + bw / 2;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            });
            ctx.stroke(); ctx.setLineDash([]);

            // axis labels
            ctx.fillStyle = theme.axis;
            ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            for (let v = LO; v <= HI; v += 2) {
                const x = PAD.l + ((v - LO) / (HI - LO)) * plotW;
                ctx.fillText(String(v), x, PAD.t + plotH + 16);
            }
            ctx.fillText('beak depth (mm)', PAD.l + plotW / 2, H - 8);
            ctx.save();
            ctx.translate(13, PAD.t + plotH / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText('number of birds', 0, 0);
            ctx.restore();

            // mean marker
            const m = mean(pop);
            const mx = PAD.l + ((m - LO) / (HI - LO)) * plotW;
            ctx.strokeStyle = theme.line; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(mx, PAD.t); ctx.lineTo(mx, PAD.t + plotH); ctx.stroke();
            ctx.fillStyle = theme.line; ctx.textAlign = 'left';
            ctx.fillText('mean', Math.min(mx + 5, W - 50), PAD.t + 10);

            // legend
            ctx.textAlign = 'right';
            ctx.fillStyle = theme.axis;
            ctx.fillText('dashed = generation 0', W - PAD.r, PAD.t + 10);
        }

        function describe() {
            const m = mean(pop), sd = sdev(pop);
            const m0 = history[0];
            const shift = m - m0;
            let pattern;
            switch (mode.el.value) {
                case 'directional': pattern = 'Directional selection — the whole distribution shifts.'; break;
                case 'stabilizing': pattern = 'Stabilizing selection — the centre holds and the spread narrows.'; break;
                case 'disruptive':  pattern = 'Disruptive selection — the middle empties and two peaks form.'; break;
                default:            pattern = 'No selection — any change you see is drift, from chance alone.';
            }
            readout.innerHTML =
                `<strong>Generation ${gen}.</strong> ${pattern}<br>` +
                `mean <strong>${m.toFixed(2)} mm</strong> ` +
                `(started ${m0.toFixed(2)}, moved ${shift >= 0 ? '+' : ''}${shift.toFixed(2)}) · ` +
                `spread <strong>${sd.toFixed(2)} mm</strong>`;
        }

        // ---- loop ------------------------------------------------------
        let timer = null;
        function setRunning(on) {
            if (on && !timer) {
                timer = setInterval(() => { step(); draw(); describe(); }, 320);
                btnRun.textContent = 'Pause';
            } else if (!on && timer) {
                clearInterval(timer); timer = null;
                btnRun.textContent = 'Run';
            }
        }
        btnStep.onclick = () => { setRunning(false); step(); draw(); describe(); };
        btnRun.onclick  = () => setRunning(!timer);
        btnReset.onclick= () => { setRunning(false); reset(); };
        mode.el.addEventListener('change', () => { draw(); describe(); });

        // stop when scrolled out of view
        new IntersectionObserver(es => {
            es.forEach(e => { if (!e.isIntersecting) setRunning(false); });
        }, { threshold: 0 }).observe(root);

        // Exposed so the distribution can be inspected without reading pixels
        // off the canvas — used to check the model behaves, not by the page.
        root._simState = () => ({ gen, pop: pop.slice(), hist: histogram(pop) });

        reset();
    };

    // ---- small builders ------------------------------------------------
    function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
    function button(parent, label, cls) {
        const b = el('button', 'sim-btn' + (cls ? ' ' + cls : ''));
        b.type = 'button'; b.textContent = label; parent.appendChild(b); return b;
    }
    function slider(parent, id, label, min, max, value, fmt) {
        const wrap = el('div', 'sim-control');
        const lab = document.createElement('label');
        const val = el('span', 'val');
        lab.textContent = label + ' '; lab.appendChild(val);
        const input = document.createElement('input');
        input.type = 'range'; input.min = min; input.max = max; input.value = value;
        input.id = 'sim-' + id; lab.htmlFor = input.id;
        wrap.appendChild(lab); wrap.appendChild(input); parent.appendChild(wrap);
        const sync = () => { val.textContent = fmt(+input.value); };
        input.addEventListener('input', sync); sync();
        return { input, sync };
    }
    function select(parent, label, options, value) {
        const wrap = el('div', 'sim-control');
        const lab = document.createElement('label');
        lab.textContent = label;
        const sel = document.createElement('select');
        sel.className = 'sim-select';
        options.forEach(([v, t]) => {
            const o = document.createElement('option');
            o.value = v; o.textContent = t; sel.appendChild(o);
        });
        sel.value = value;
        lab.htmlFor = sel.id = 'sim-mode';
        wrap.appendChild(lab); wrap.appendChild(sel); parent.appendChild(wrap);
        return { el: sel };
    }
})();
