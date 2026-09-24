/* =============================================================
   INTERACTIVE — Checkpoint failure model
   -------------------------------------------------------------
   Registers window.SIMS['u4-checkpoints'].  Supports HS-LS1-4.

   A lineage of cells is run forward generation by generation. Each
   cell carries a count of DNA faults. Every division has a chance
   of adding one. The three checkpoints are inspections:

     G1  — is the cell big enough, are there nutrients and growth
           signals, and is the DNA undamaged?
     G2  — did replication finish, and is the copied DNA undamaged?
     M   — is every chromosome attached to the spindle?

   With a checkpoint working, a cell that fails it is held back and,
   if it cannot be repaired, destroyed. With that checkpoint
   switched off, the same cell divides anyway and passes its faults
   to both daughters, which then acquire more.

   The exponential curve is not drawn from a formula. It is counted
   from the lineage, so the reader is watching the model's own
   consequence rather than an illustration of one.

   The two prompts at the end are the anchor guide's own formative
   task (Model 1 / Model 2, page 12), asked as a prediction the
   reader commits to before the run.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4cp-style';

    const GENS = 16;
    const CAP = 6000;
    const TARGET = 240;        // how many cells this tissue is supposed to hold
    const TURNOVER = 0.10;     // fraction of cells lost and replaced each generation
    const P_DAMAGE = 0.15;     // chance replication introduces a fault
    const P_MISS = 0.06;       // chance a chromosome fails to attach properly
    const KILL_AT = 5;         // faults beyond which a cell cannot function at all

    const CHECKS = [
        { k: 'g1', name: 'G1 checkpoint', where: 'before DNA is copied',
          asks: 'Is the cell big enough? Are there nutrients and growth signals? Is the DNA it inherited undamaged?',
          catches: 'Damage the cell was born with — and the signal that says the tissue is already full.' },
        { k: 'g2', name: 'G2 checkpoint', where: 'after DNA is copied, before mitosis',
          asks: 'Did replication finish, and is the new copy undamaged?',
          catches: 'Mistakes made during S phase, before the cell commits to dividing.' },
        { k: 'm',  name: 'M checkpoint', where: 'during metaphase',
          asks: 'Is every chromosome attached to spindle fibres from both poles?',
          catches: 'Chromosomes that would be dragged into the wrong daughter cell.' }
    ];

    function rng(seed) {
        let s = seed >>> 0;
        return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    /* One run of the model.

       Each checkpoint inspects a DIFFERENT thing, which is why breaking one
       does not do the same as breaking another:

         G1  destroys cells that inherited damage, and holds cells in G0 once
             the tissue is already full;
         G2  destroys cells whose replication went wrong this cycle;
         M   destroys cells whose chromosomes are not properly attached.

       A cell that slips past a broken G2 is usually caught by G1 in its
       daughters one generation later. That redundancy is real, and it is
       why a single mutation rarely causes cancer. */
    function simulate(off, seed) {
        const r = rng(seed);
        let cells = [{ faults: 0 }];
        const hist = [{ gen: 0, alive: 1, faulty: 0, arrested: 0, resting: 0, worst: 0 }];
        let arrestedTotal = 0;
        let capped = false;

        for (let g = 1; g <= GENS; g++) {
            // normal tissue turnover: some cells are lost every generation
            cells = cells.filter(() => r() > TURNOVER);

            const next = [];
            let arrested = 0, resting = 0;

            for (let i = 0; i < cells.length; i++) {
                const c = cells[i];

                // ---- G1 ----
                if (!off.g1) {
                    if (c.faults > 0) { arrested++; continue; }          // damaged: destroyed
                    if (next.length + (cells.length - i) >= TARGET) {    // tissue already full
                        resting++; next.push(c); continue;               // enters G0, stays alive
                    }
                }

                // ---- S phase ----
                let faults = c.faults;
                if (r() < P_DAMAGE) {
                    if (!off.g2) { arrested++; continue; }               // ---- G2 ----
                    faults++;
                }

                // ---- M ----
                if (r() < P_MISS) {
                    if (!off.m) { arrested++; continue; }
                    faults++;
                }

                if (faults >= KILL_AT) { arrested++; continue; }
                next.push({ faults: faults }, { faults: faults });
            }

            arrestedTotal += arrested;
            if (next.length > CAP) { capped = true; next.length = CAP; }
            cells = next;
            hist.push({
                gen: g, alive: cells.length, arrested, resting,
                faulty: cells.filter(c => c.faults > 0).length,
                worst: cells.reduce((m, c) => Math.max(m, c.faults), 0)
            });
        }
        return { hist, arrestedTotal, capped };
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.cp { padding:1rem 1.25rem 1.25rem; }',
            '.cp { --cp-ok:#2e7d32; --cp-bad:#aa272f; }',
            '[data-theme="dark"] .cp { --cp-ok:#7fc98a; --cp-bad:#e08a90; }',
            '[data-theme="sepia"] .cp { --cp-ok:#4a6b3d; --cp-bad:#a04040; }',
            '.cp-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.9rem; line-height:1.55; }',
            '.cp-q { font-size:0.85rem; font-weight:600; margin:0.9rem 0 0.5rem; }',
            '.cp-opts { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.5rem; }',
            '.cp-opt { font:inherit; font-size:0.78rem; cursor:pointer; padding:0.45rem 0.75rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); text-align:left; max-width:24rem; touch-action:manipulation; }',
            '.cp-opt:hover { border-color:var(--light-teal); }',
            '.cp-opt.right { border-color:var(--cp-ok); color:var(--cp-ok); font-weight:700; }',
            '.cp-opt.wrong { border-color:var(--cp-bad); color:var(--cp-bad); opacity:0.62; }',
            '.cp-switches { display:grid; gap:0.55rem; grid-template-columns:repeat(auto-fit,minmax(200px,1fr));',
            '   margin:0.4rem 0 0.9rem; }',
            '.cp-sw { border:1px solid var(--border); border-radius:10px; padding:0.6rem 0.7rem;',
            '   background:var(--bg); cursor:pointer; text-align:left; font:inherit; color:var(--text);',
            '   touch-action:manipulation; }',
            '.cp-sw:hover { border-color:var(--light-teal); }',
            '.cp-sw b { display:block; font-size:0.84rem; margin-bottom:0.15rem; }',
            '.cp-sw small { display:block; font-size:0.68rem; color:var(--text-secondary); line-height:1.45; }',
            '.cp-sw .cp-state { display:inline-block; margin-top:0.4rem; font-size:0.66rem;',
            '   font-weight:800; letter-spacing:0.06em; text-transform:uppercase;',
            '   padding:0.15rem 0.45rem; border-radius:999px; }',
            '.cp-sw.on .cp-state { background:rgba(46,125,50,0.16); color:var(--cp-ok); }',
            '.cp-sw.off { border-color:var(--cp-bad); }',
            '.cp-sw.off .cp-state { background:rgba(170,39,47,0.16); color:var(--cp-bad); }',
            '.cp-readout { display:grid; gap:0.5rem 0.9rem; margin:0.8rem 0 0;',
            '   grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); }',
            '.cp-stat { border:1px solid var(--border); border-radius:9px; padding:0.5rem 0.65rem; }',
            '.cp-stat b { display:block; font-size:1.2rem; line-height:1.2; }',
            '.cp-stat small { color:var(--text-secondary); font-size:0.66rem; text-transform:uppercase;',
            '   letter-spacing:0.05em; font-weight:700; }',
            '.cp-stat.alarm b { color:var(--cp-bad); }',
            '.cp-msg { font-size:0.83rem; line-height:1.6; margin:0.85rem 0 0; }',
            '.cp-msg b { color:var(--text); }',
            '.cp-verdict { margin-top:0.9rem; border:1px solid var(--border); border-left:4px solid var(--light-teal);',
            '   border-radius:8px; background:var(--bg-surface); padding:0.75rem 0.9rem;',
            '   font-size:0.84rem; line-height:1.6; }',
            '.cp-verdict.bad { border-left-color:var(--cp-bad); }',
            '.cp-verdict h6 { margin:0 0 0.35rem; font-size:0.88rem; }',
            '.cp-verdict p { margin:0 0 0.55rem; } .cp-verdict p:last-child { margin-bottom:0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    const PREDICTIONS = [
        { k: 'stop',   t: 'The cell repairs itself before it divides.' },
        { k: 'tumour', t: 'The cell divides anyway, and both daughters inherit the damage.' },
        { k: 'die',    t: 'The cell dies immediately.' },
        { k: 'nothing',t: 'Nothing — damaged DNA has no effect once it has been copied.' }
    ];

    window.SIMS['u4-checkpoints'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'cp');
        root.appendChild(wrap);

        let off = { g1: false, g2: false, m: false };
        let gen = GENS;
        let predicted = null, predictTried = [];
        let run = simulate(off, 314159);

        const how = U.el('p', 'cp-how');
        how.innerHTML = 'One cell, followed for ' + GENS + ' divisions inside a tissue that is ' +
            'supposed to hold about <b>' + TARGET + '</b> cells. Every division has a chance of ' +
            'introducing a DNA fault, and a tenth of the cells are lost and replaced each ' +
            'generation, as in real tissue. Switch a checkpoint <b>off</b> and only the inspection ' +
            'it performs stops happening — everything else is identical, so any difference you see ' +
            'was caused by that one switch.';
        wrap.appendChild(how);

        const predictHost = U.el('div');
        wrap.appendChild(predictHost);
        const switchHost = U.el('div', 'cp-switches');
        wrap.appendChild(switchHost);

        const { canvas, ctx } = U.stage(wrap, 720, 280,
            'A chart of the number of living cells against generation, with the number carrying ' +
            'DNA faults shaded underneath.');
        const readout = U.el('div', 'cp-readout');
        wrap.appendChild(readout);
        const msg = U.el('p', 'cp-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        wrap.appendChild(msg);
        const verdictHost = U.el('div');
        wrap.appendChild(verdictHost);
        const buttons = U.el('div', 'sim-buttons');
        wrap.appendChild(buttons);

        const theme = U.theme(() => draw());

        function rerun() { run = simulate(off, 314159); }

        function drawPredict() {
            predictHost.innerHTML = '';
            if (predicted) return;
            const q = U.el('p', 'cp-q');
            q.innerHTML = 'Before you touch anything. A cell copies its DNA and the copy comes out ' +
                'damaged. <b>The G<sub>2</sub> checkpoint is broken, so the damage is not spotted.</b> ' +
                'What happens over the next dozen divisions?';
            predictHost.appendChild(q);
            const opts = U.el('div', 'cp-opts');
            PREDICTIONS.forEach(p => {
                const b = U.el('button', 'cp-opt' + (predictTried.indexOf(p.k) > -1 ? ' wrong' : ''));
                b.type = 'button'; b.textContent = p.t;
                b.addEventListener('click', () => {
                    if (p.k === 'tumour') {
                        predicted = p.k;
                        msg.innerHTML = 'Right — and that is the whole of it. A checkpoint does not ' +
                            'repair anything; it is an <em>inspection</em> that can stop the cycle. ' +
                            'Take the inspection away and the damaged cell is never stopped, so it ' +
                            'divides, and both daughters get a copy of the damaged DNA. Now switch ' +
                            'G<sub>2</sub> off below. Then switch G<sub>1</sub> off as well, and ' +
                            'notice how much difference the second failure makes.';
                    } else {
                        predictTried.push(p.k);
                        msg.innerHTML = 'Not that. A checkpoint is an <em>inspection</em>, not a repair ' +
                            'shop and not a poison. If the inspection does not happen, the cell is ' +
                            'neither mended nor killed — it is simply not stopped. So ask the next ' +
                            'question: when a cell divides, what happens to its DNA?';
                    }
                    render();
                });
                opts.appendChild(b);
            });
            predictHost.appendChild(opts);
        }

        function drawSwitches() {
            switchHost.innerHTML = '';
            CHECKS.forEach(c => {
                const b = U.el('button', 'cp-sw ' + (off[c.k] ? 'off' : 'on'));
                b.type = 'button';
                b.setAttribute('aria-pressed', off[c.k] ? 'true' : 'false');
                b.innerHTML = '<b>' + c.name + '</b><small>' + c.where + '<br>' + c.asks + '</small>' +
                    '<span class="cp-state">' + (off[c.k] ? 'broken' : 'working') + '</span>';
                b.addEventListener('click', () => {
                    off[c.k] = !off[c.k];
                    rerun(); verdictHost.innerHTML = ''; render();
                });
                switchHost.appendChild(b);
            });
        }

        function draw() {
            const t = theme.current;
            const pad = { l: 52, r: 14, t: 16, b: 30 };
            const hist = run.hist;
            const max = Math.max(8, ...hist.slice(0, gen + 1).map(h => h.alive));
            const { pw, ph } = U.axes(ctx, t, pad, canvas.width, canvas.height, {
                gridY: [{ at: 0, label: '0' }, { at: 0.5, label: Math.round(max / 2) + '' },
                        { at: 1, label: max + '' }]
            });
            const x = g => pad.l + g / GENS * pw;
            const y = n => pad.t + ph - (n / max) * ph;

            // the size this tissue is supposed to hold
            if (TARGET <= max) {
                ctx.save();
                ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.45; ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(pad.l, y(TARGET)); ctx.lineTo(pad.l + pw, y(TARGET)); ctx.stroke();
                ctx.setLineDash([]); ctx.globalAlpha = 1;
                ctx.fillStyle = t.axis; ctx.font = '10px system-ui, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('normal tissue size', pad.l + pw - 4, y(TARGET) - 4);
                ctx.restore();
            }

            // faulty cells, shaded
            ctx.beginPath();
            ctx.moveTo(x(0), y(0));
            for (let g = 0; g <= gen; g++) ctx.lineTo(x(g), y(hist[g].faulty));
            ctx.lineTo(x(gen), y(0)); ctx.closePath();
            ctx.fillStyle = t.red; ctx.globalAlpha = 0.22; ctx.fill(); ctx.globalAlpha = 1;

            // total living cells
            ctx.strokeStyle = t.ink; ctx.lineWidth = 2.2; ctx.beginPath();
            for (let g = 0; g <= gen; g++) {
                if (g === 0) ctx.moveTo(x(g), y(hist[g].alive));
                else ctx.lineTo(x(g), y(hist[g].alive));
            }
            ctx.stroke();

            ctx.strokeStyle = t.red; ctx.lineWidth = 1.8; ctx.beginPath();
            for (let g = 0; g <= gen; g++) {
                if (g === 0) ctx.moveTo(x(g), y(hist[g].faulty));
                else ctx.lineTo(x(g), y(hist[g].faulty));
            }
            ctx.stroke();

            ctx.fillStyle = t.axis; ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('cell generation (0 to ' + GENS + ')', pad.l + pw / 2, canvas.height - 8);
            ctx.textAlign = 'left';
            ctx.fillStyle = t.ink; ctx.fillText('all living cells', pad.l + 6, pad.t + 12);
            ctx.fillStyle = t.red; ctx.fillText('cells carrying DNA faults', pad.l + 6, pad.t + 26);
        }

        function drawReadout() {
            const h = run.hist[gen];
            const pct = h.alive ? (h.faulty / h.alive * 100) : 0;
            readout.innerHTML =
                '<div class="cp-stat"><small>Living cells</small><b>' + h.alive + '</b></div>' +
                '<div class="cp-stat' + (pct > 25 ? ' alarm' : '') + '"><small>Carrying faults</small><b>' +
                    h.faulty + '</b></div>' +
                '<div class="cp-stat' + (pct > 25 ? ' alarm' : '') + '"><small>% faulty</small><b>' +
                    pct.toFixed(0) + '%</b></div>' +
                '<div class="cp-stat"><small>Resting in G<sub>0</sub></small><b>' +
                    h.resting + '</b></div>' +
                '<div class="cp-stat"><small>Destroyed at a checkpoint</small><b>' +
                    run.arrestedTotal + '</b></div>' +
                '<div class="cp-stat' + (h.worst >= 3 ? ' alarm' : '') + '"><small>Most faults in one cell</small><b>' +
                    h.worst + '</b></div>';
        }

        function drawVerdict() {
            const nOff = CHECKS.filter(c => off[c.k]).length;
            const end = run.hist[GENS];
            const pct = end.alive ? end.faulty / end.alive * 100 : 0;
            const growth = end.alive / TARGET;
            const names = CHECKS.filter(c => off[c.k]).map(c => c.name).join(' and ');
            const d = U.el('div', 'cp-verdict' + (nOff ? ' bad' : ''));

            if (nOff === 0) {
                d.innerHTML = '<h6>All three checkpoints working &mdash; normal tissue</h6>' +
                    '<p>The lineage grew to <b>' + end.alive + '</b> cells and then stopped. It did ' +
                    'not run out of room or food; it was <em>told</em> to stop. Once the tissue was ' +
                    'full, the G<sub>1</sub> checkpoint stopped letting cells through, and ' +
                    end.resting + ' of them are now sitting in <b>G<sub>0</sub></b> — alive, ' +
                    'working, not dividing. Most cells in your body are in G<sub>0</sub> right now.</p>' +
                    '<p>Meanwhile ' + run.arrestedTotal + ' cells failed an inspection along the way ' +
                    'and were destroyed, so <b>' + end.faulty + '</b> of the ' + end.alive +
                    ' survivors carry a DNA fault. Damage was happening constantly. It is the ' +
                    'inspections that stopped it being inherited — by holding the cell while repair ' +
                    'enzymes work, and destroying it through <b>apoptosis</b> if repair fails.</p>';
            } else if (off.g1 && !off.g2 && !off.m) {
                d.innerHTML = '<h6>' + names + ' broken &mdash; growth with no brake</h6>' +
                    '<p>The population reached <b>' + end.alive + '</b> cells — ' + growth.toFixed(1) +
                    ' times the size this tissue is supposed to be — and it is still climbing. ' +
                    'No cell is resting in G<sub>0</sub>, because the checkpoint that reads ' +
                    '"the tissue is already full" is the one you switched off.</p>' +
                    '<p>But look at the fault count: <b>' + end.faulty + '</b>. G<sub>2</sub> and M ' +
                    'are still inspecting, so the DNA in these cells is still clean. This is a mass ' +
                    'of cells that will not stop dividing but is not genetically unstable — much ' +
                    'like a <b>benign tumour</b>. It causes harm by pressing on things, not by ' +
                    'spreading.</p>';
            } else if (!off.g1 && nOff >= 1) {
                d.innerHTML = '<h6>' + names + ' broken &mdash; damage appears, but is cleared</h6>' +
                    '<p>The population still stopped at <b>' + end.alive + '</b>, because ' +
                    'G<sub>1</sub> is still reading the "tissue is full" signal. But faults are ' +
                    'now getting through: <b>' + end.faulty + '</b> living cells carry one, which ' +
                    'is ' + pct.toFixed(0) + '% of the tissue.</p>' +
                    '<p>Notice it does not run away. A cell that slips past a broken ' +
                    (off.g2 ? 'G<sub>2</sub>' : 'M') + ' checkpoint divides — and then its daughters ' +
                    'meet the G<sub>1</sub> checkpoint next generation, which destroys them because ' +
                    'they inherited damage. <b>The checkpoints back each other up.</b> That ' +
                    'redundancy is exactly why cancer almost never comes from a single mutation. ' +
                    'Now break G<sub>1</sub> as well and watch what changes.</p>';
            } else {
                d.innerHTML = '<h6>' + names + ' broken &mdash; this is what cancer looks like</h6>' +
                    '<p><b>' + end.alive + '</b> cells' + (run.capped ? ' (the model stops counting here)' : '') +
                    ', and <b>' + end.faulty + '</b> of them — ' + pct.toFixed(0) +
                    '% — carry DNA faults. The worst-affected cell is carrying ' + end.worst + '.</p>' +
                    '<p>Follow the mechanism, because it is the answer to "what is cancer?". ' +
                    'A cell acquires damage and is not stopped, so it divides. Both daughters ' +
                    'inherit the damage <em>and</em> the broken checkpoints, so both of them divide ' +
                    'too, and both acquire more. Faults now accumulate down the lineage instead of ' +
                    'being cleared out of it, and nothing is reading the signal that says the ' +
                    'tissue is already full.</p>' +
                    '<p>So a tumour is not cells that divide unusually fast. It is cells that ' +
                    '<em>never stop</em>, and whose DNA gets worse each time they do. When those ' +
                    'cells acquire the further mutations that let them break out of the tissue and ' +
                    'travel, the tumour is <b>malignant</b> and the process is called ' +
                    '<b>metastasis</b>.</p>';
            }
            verdictHost.innerHTML = '';
            verdictHost.appendChild(d);
        }

        function drawButtons() {
            buttons.innerHTML = '';
            const step = U.button(buttons, 'Step one generation');
            step.addEventListener('click', () => { gen = Math.min(GENS, gen + 1); render(); });
            const back = U.button(buttons, 'Back one');
            back.addEventListener('click', () => { gen = Math.max(0, gen - 1); render(); });
            const all = U.button(buttons, 'Run all ' + GENS);
            all.addEventListener('click', () => { gen = GENS; render(); });
            const fix = U.button(buttons, 'Repair every checkpoint');
            fix.addEventListener('click', () => {
                off = { g1: false, g2: false, m: false };
                rerun(); gen = GENS; render();
            });
        }

        function render() {
            drawPredict(); drawSwitches(); draw(); drawReadout(); drawButtons();
            if (predicted) drawVerdict(); else verdictHost.innerHTML = '';
        }
        render();

        root._simState = () => ({
            off: Object.assign({}, off), generation: gen, of: GENS, predicted,
            now: run.hist[gen], final: run.hist[GENS],
            arrestedTotal: run.arrestedTotal,
            faultyPercentAtEnd: run.hist[GENS].alive
                ? +(run.hist[GENS].faulty / run.hist[GENS].alive * 100).toFixed(1) : 0
        });
        root._simSolve = () => {
            predicted = 'tumour'; off = { g1: false, g2: true, m: false };
            rerun(); gen = GENS; render();
        };
    };
})();
