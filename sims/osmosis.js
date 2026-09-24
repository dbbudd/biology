/* =============================================================
   SIMULATION — Osmosis across a partially permeable membrane
   -------------------------------------------------------------
   Registers window.SIMS.osmosis. The shell (assets/course.js)
   loads this file when it finds <div class="sim" data-sim="osmosis">
   and calls the function with that element.

   Model
     The cell holds a fixed amount of solute. The solution outside
     has a solute concentration the reader sets. Water crosses the
     membrane; solute does not. Net water flow is proportional to
     the difference in solute concentration, so the cell swells
     until the two concentrations match, or shrinks if it cannot.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};

    const W = 640, H = 320;
    const SOLUTE_IN = 55;          // arbitrary units of solute locked inside the cell
    const V0 = 100;                // resting cell volume (arbitrary units)
    const V_MIN = 45, V_MAX = 165; // crenation and lysis thresholds
    const RATE = 0.35;             // membrane water permeability: dV/dt = (cIn - cOut) * RATE

    window.SIMS.osmosis = function (root) {
        // ---- build the interface ------------------------------------
        const stage = el('div', 'sim-stage');
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.width = '100%';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label',
            'A cell in a beaker of solution. Water molecules cross the membrane; solute molecules do not.');
        stage.appendChild(canvas);

        const controls = el('div', 'sim-controls');
        // model units, not mM: a real cell holds about 300 mmol/L of solute, and this model is scaled down
        const conc = slider(controls, 'conc', 'Solute outside the cell', 0, 110, 55, v => v + ' units');
        const speed = slider(controls, 'speed', 'Simulation speed', 0, 3, 1, v => ['paused', 'slow', 'normal', 'fast'][v]);

        const buttons = el('div', 'sim-buttons');
        const btnReset = button(buttons, 'Reset cell', 'primary');
        const btnIso = button(buttons, 'Make isotonic');
        const btnHyper = button(buttons, 'Make hypertonic');
        const btnHypo = button(buttons, 'Make hypotonic');

        const readout = el('div', 'sim-readout');

        root.appendChild(stage);
        root.appendChild(controls);
        root.appendChild(buttons);
        root.appendChild(readout);

        // ---- state ---------------------------------------------------
        let vol = V0;
        let burst = false;
        let waters = [], solutesOut = [], solutesIn = [];
        const ctx = canvas.getContext('2d');
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

        function seed() {
            waters = Array.from({ length: 90 }, () => particle());
            solutesIn = Array.from({ length: 18 }, () => particle());
            solutesOut = Array.from({ length: 60 }, () => particle());
        }
        function particle() {
            return { x: Math.random() * W, y: Math.random() * H, a: Math.random() * Math.PI * 2, s: 0.25 + Math.random() * 0.5 };
        }
        seed();

        // ---- geometry ------------------------------------------------
        const CX = W / 2, CY = H / 2;
        const radius = () => Math.sqrt(vol / Math.PI) * 9.6;   // volume -> radius

        // ---- physics -------------------------------------------------
        function step(dt) {
            if (burst) return;
            const cIn = SOLUTE_IN / vol * 100;      // mM-equivalent inside
            const cOut = +conc.input.value;
            const flow = (cIn - cOut) * RATE * dt;  // water in when inside is saltier
            vol = Math.min(V_MAX + 2, Math.max(V_MIN - 2, vol + flow));
            if (vol >= V_MAX) burst = true;
        }

        function drift(list, dt) {
            list.forEach(p => {
                p.a += (Math.random() - 0.5) * 0.6;
                p.x += Math.cos(p.a) * p.s * dt * 12;
                p.y += Math.sin(p.a) * p.s * dt * 12;
                if (p.x < 4) { p.x = 4; p.a = Math.PI - p.a; }
                if (p.x > W - 4) { p.x = W - 4; p.a = Math.PI - p.a; }
                if (p.y < 4) { p.y = 4; p.a = -p.a; }
                if (p.y > H - 4) { p.y = H - 4; p.a = -p.a; }
            });
        }
        // Solute cannot cross: push it back to the side it started on.
        function confine(list, inside) {
            const r = radius();
            list.forEach(p => {
                const dx = p.x - CX, dy = p.y - CY, d = Math.hypot(dx, dy) || 1;
                if (inside && d > r - 6) { p.x = CX + dx / d * (r - 7); p.y = CY + dy / d * (r - 7); p.a += Math.PI; }
                if (!inside && d < r + 6) { p.x = CX + dx / d * (r + 7); p.y = CY + dy / d * (r + 7); p.a += Math.PI; }
            });
        }

        // ---- drawing -------------------------------------------------
        let theme = readTheme();
        function readTheme() {
            const cs = getComputedStyle(document.documentElement);
            const v = n => cs.getPropertyValue(n).trim();
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            const dark = theme === 'dark';
            const sepia = theme === 'sepia';
            return {
                beaker: dark ? '#16232e' : (sepia ? '#ede4cb' : '#eaf2f8'),
                cell: dark ? 'rgba(87,120,153,0.30)' : 'rgba(20,80,158,0.10)',
                membrane: v('--red') || '#aa272f',
                water: dark ? '#7fb3e0' : '#2f6fb5',
                solute: v('--yellow') || '#ffcd00',
                soluteEdge: dark ? '#8a7000' : '#9a7c00',
                ink: v('--text') || '#111',
                muted: v('--text-secondary') || '#666'
            };
        }
        window.addEventListener('themechange', () => { theme = readTheme(); draw(); });

        function draw() {
            const r = radius();
            ctx.clearRect(0, 0, W, H);

            ctx.fillStyle = theme.beaker;
            ctx.fillRect(0, 0, W, H);

            // cell
            ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2);
            ctx.fillStyle = theme.cell; ctx.fill();
            ctx.lineWidth = burst ? 2 : 3.5;
            ctx.setLineDash(burst ? [6, 6] : []);
            ctx.strokeStyle = theme.membrane; ctx.stroke();
            ctx.setLineDash([]);

            // water (crosses freely)
            ctx.fillStyle = theme.water;
            waters.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 2.1, 0, Math.PI * 2); ctx.fill(); });

            // solute (cannot cross)
            [solutesOut, solutesIn].forEach(list => list.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
                ctx.fillStyle = theme.solute; ctx.fill();
                ctx.lineWidth = 1; ctx.strokeStyle = theme.soluteEdge; ctx.stroke();
            }));

            // labels
            ctx.font = '600 12px system-ui, sans-serif';
            ctx.fillStyle = theme.muted;
            ctx.textAlign = 'left';
            ctx.fillText('Solution outside the cell', 12, 20);
            ctx.textAlign = 'center';
            ctx.fillStyle = theme.ink;
            if (!burst) ctx.fillText('cell', CX, CY + 4);
            else { ctx.fillStyle = theme.membrane; ctx.fillText('lysed: the membrane burst', CX, CY + 4); }

            // legend
            ctx.textAlign = 'right';
            ctx.fillStyle = theme.water; ctx.beginPath(); ctx.arc(W - 128, 16, 3, 0, 7); ctx.fill();
            ctx.fillStyle = theme.muted; ctx.fillText('water', W - 92, 20);
            ctx.fillStyle = theme.solute; ctx.beginPath(); ctx.arc(W - 62, 16, 4.2, 0, 7); ctx.fill();
            ctx.strokeStyle = theme.soluteEdge; ctx.stroke();
            ctx.fillStyle = theme.muted; ctx.fillText('solute', W - 14, 20);
        }

        // ---- readout -------------------------------------------------
        function describe() {
            const cOut = +conc.input.value;
            const cIn = SOLUTE_IN / vol * 100;
            const diff = cOut - cIn;
            let name, what;
            if (burst) {
                name = 'Hypotonic: lysis';
                what = 'So much water entered that the membrane broke. An animal cell has no cell wall to resist the pressure.';
            } else if (Math.abs(diff) < 1.5) {
                name = 'Isotonic';
                what = 'The solute concentrations are equal. Water still crosses in both directions, but there is <strong>no net movement</strong>, so the volume stays the same.';
            } else if (diff > 0) {
                name = 'Hypertonic outside';
                what = 'The solution outside has a higher solute concentration, so there is a net movement of water out of the cell, and it shrinks.';
            } else {
                name = 'Hypotonic outside';
                what = 'The solution outside has a lower solute concentration, so there is a net movement of water into the cell, and it swells.';
            }
            readout.innerHTML =
                `<strong>${name}.</strong> ${what}<br>` +
                `Solute outside <strong>${cOut} units</strong> · inside <strong>${cIn.toFixed(0)} units</strong> · ` +
                `cell volume <strong>${Math.round(vol)}%</strong> of resting`;
        }

        // ---- loop ----------------------------------------------------
        let last = 0, running = true, raf = null;
        function frame(t) {
            const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
            const mult = [0, 0.4, 1, 2.2][+speed.input.value];
            if (mult > 0) {
                step(dt * mult);
                if (!reduced) {
                    drift(waters, dt * mult); drift(solutesOut, dt * mult); drift(solutesIn, dt * mult);
                    confine(solutesIn, true); confine(solutesOut, false);
                }
            }
            draw(); describe();
            if (running) raf = requestAnimationFrame(frame);
        }

        // pause when scrolled out of view
        new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
                else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
            });
        }, { threshold: 0 }).observe(root);

        // ---- wiring --------------------------------------------------
        btnReset.onclick = () => { vol = V0; burst = false; seed(); };
        btnIso.onclick = () => setConc(Math.round(SOLUTE_IN / V0 * 100));
        btnHyper.onclick = () => setConc(95);
        btnHypo.onclick = () => setConc(15);
        function setConc(v) { conc.input.value = v; conc.sync(); if (burst) { burst = false; vol = V0; } }

        raf = requestAnimationFrame(frame);
    };

    // ---- small builders ---------------------------------------------
    function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
    function button(parent, label, cls) {
        const b = el('button', 'sim-btn' + (cls ? ' ' + cls : ''));
        b.type = 'button'; b.textContent = label; parent.appendChild(b); return b;
    }
    function slider(parent, id, label, min, max, value, fmt) {
        const wrap = el('div', 'sim-control');
        const lab = document.createElement('label');
        const val = el('span', 'val');
        lab.textContent = label + ' ';
        lab.appendChild(val);
        const input = document.createElement('input');
        input.type = 'range'; input.min = min; input.max = max; input.value = value; input.id = 'sim-' + id;
        lab.htmlFor = input.id;
        wrap.appendChild(lab); wrap.appendChild(input); parent.appendChild(wrap);
        const sync = () => { val.textContent = fmt(+input.value); };
        input.addEventListener('input', sync); sync();
        return { input, sync };
    }
})();
