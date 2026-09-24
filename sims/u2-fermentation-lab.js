/* =============================================================
   INTERACTIVE — Yeast fermentation lab
   -------------------------------------------------------------
   Registers window.SIMS['u2-fermentation-lab'].  Supports HS-LS1-7,
   HS-LS2-3 and learning target D4.

   The experiment: four sealed tubes of yeast suspension, each with
   1 mL of a different sucrose solution (0%, 5%, 10%, 20%), warmed
   for ten minutes. Carbon dioxide from alcoholic fermentation
   collects at the top and pushes the liquid down, so the height of
   the air space is a measure of how fast the yeast are fermenting.

   NOTE ON THE VOLUME. Anchor Guide 2 page 18 prints 5 mL of sucrose
   solution. Slide 129 of the teaching deck overrides that to 1 mL
   with the note "Change on anchor guide". This sim uses 1 mL and
   says so, because the class data below was collected that way.

   The numbers are the real class results from slide 134. Changes are
   computed from the start and end readings, never typed.

   The reader must predict all four bars before any data appears.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2fl-style';

    // Real class data, slide 134. Air space in cm, before and after 10 minutes.
    const TUBES = [
        { label: '0% (water)', pct: 0,  start: 0.8, end: 1.0 },
        { label: '5% sucrose', pct: 5,  start: 0.8, end: 3.0 },
        { label: '10% sucrose', pct: 10, start: 0.6, end: 4.6 },
        { label: '20% sucrose', pct: 20, start: 1.0, end: 5.8 }
    ];
    const change = t => +(t.end - t.start).toFixed(2);

    const CER = {
        claim: {
            q: 'Claim — one sentence answering the question, describing the relationship between ' +
               'the variables. It must not begin with yes or no.',
            opts: [
                { t: 'As the concentration of sucrose increases, the rate of fermentation in yeast ' +
                     'increases.', ok: true },
                { t: 'Yes, sucrose affects the yeast.', ok: false,
                  why: 'A claim may not start with yes or no, and this one does not say which way ' +
                       'the relationship runs.' },
                { t: 'The yeast in tube 4 produced 4.8 cm of gas.', ok: false,
                  why: 'That is a piece of evidence, not a claim. A claim generalises; evidence is ' +
                       'the specific number that backs it up.' },
                { t: 'Sucrose is a disaccharide made of glucose and fructose.', ok: false,
                  why: 'True, and it belongs in the reasoning. It is not an answer to the question ' +
                       'that was investigated.' }
            ]
        },
        evidence: {
            q: 'Evidence — data that is relevant and sufficient.',
            opts: [
                { t: 'The air space grew by 0.2 cm at 0% sucrose, 2.2 cm at 5%, 4.0 cm at 10% and ' +
                     '4.8 cm at 20% over ten minutes.', ok: true },
                { t: 'The tubes with more sucrose had more gas in them.', ok: false,
                  why: 'Directionally right, but with no numbers it is not evidence — it is the ' +
                       'claim said twice.' },
                { t: 'The final air space in tube 4 was 5.8 cm.', ok: false,
                  why: 'One final reading on its own is not enough. The tubes started at different ' +
                       'heights, so only the change is comparable, and one tube cannot show a trend.' },
                { t: 'Yeast are facultative anaerobes.', ok: false,
                  why: 'That is scientific knowledge for the reasoning section, not data from this ' +
                       'experiment.' }
            ]
        },
        reasoning: {
            q: 'Reasoning — why does that evidence support that claim? Bring in the science.',
            opts: [
                { t: 'In the sealed tubes the yeast run out of oxygen, so they ferment sugar to ' +
                     'ethanol and CO₂. More sucrose means more substrate for glycolysis, so more ' +
                     'CO₂ per minute, so a bigger air space. The 0% tube still gave 0.2 cm because ' +
                     'the yeast had a little stored food of their own.', ok: true },
                { t: 'The gas pushed the liquid down, which is why the air space got bigger.', ok: false,
                  why: 'That explains the apparatus, not the biology. Reasoning has to say why more ' +
                       'sucrose causes more gas.' },
                { t: 'More sucrose means more gas, as the data shows.', ok: false,
                  why: 'This just restates the claim and points at the evidence. Reasoning must add ' +
                       'the scientific principle that links them.' },
                { t: 'Yeast use aerobic respiration, which produces 32 ATP and CO₂.', ok: false,
                  why: 'The tubes were sealed and the yeast ran the oxygen out within minutes. ' +
                       'After that the CO₂ is coming from alcoholic fermentation, which yields ' +
                       'only 2 ATP.' }
            ]
        }
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2fl{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2fl{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2fl{--ok:#4a6b3d;--bad:#a04040}',
            '.u2fl-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2fl-phase{font-size:0.62rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;',
            '  color:var(--text-secondary);margin:0.2rem 0 0.4rem}',
            '.u2fl-tbl{overflow-x:auto;margin-top:0.5rem}',
            '.u2fl-tbl table{border-collapse:collapse;font-size:0.78rem;width:100%;min-width:400px}',
            '.u2fl-tbl th,.u2fl-tbl td{border:1px solid var(--border);padding:0.24rem 0.45rem;text-align:center}',
            '.u2fl-tbl th{color:var(--text-secondary);font-weight:700;font-size:0.72rem}',
            '.u2fl-tbl td:first-child,.u2fl-tbl th:first-child{text-align:left}',
            '.u2fl-cer{margin-top:0.7rem}',
            '.u2fl-cer h6{margin:0.7rem 0 0.25rem;font-size:0.74rem;letter-spacing:0.05em;',
            '  text-transform:uppercase;color:var(--text-secondary)}',
            '.u2fl-cer p.q{margin:0 0 0.35rem;font-size:0.78rem;color:var(--text-secondary);line-height:1.5}',
            '.u2fl-opt{display:block;width:100%;font:inherit;font-size:0.8rem;text-align:left;',
            '  line-height:1.45;padding:0.42rem 0.6rem;margin-bottom:0.3rem;border-radius:8px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2fl-opt:hover{border-color:var(--light-teal)}',
            '.u2fl-opt.good{border-color:var(--ok);background:rgba(46,125,50,0.10)}',
            '.u2fl-opt.bad{border-color:var(--bad);background:rgba(170,39,47,0.10)}',
            '.u2fl-msg{margin:0.8rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2fl-msg.ok{color:var(--ok)} .u2fl-msg.bad{color:var(--bad)}',
            '.u2fl-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2fl-rev{background:rgba(127,201,138,0.12)}',
            '.u2fl-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2fl-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}',
            '.u2fl-note{font-size:0.72rem;color:var(--text-secondary);line-height:1.5;margin:0.5rem 0 0}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u2-fermentation-lab'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u2fl');
        const how = U.el('p', 'u2fl-how');
        how.innerHTML = 'Four sealed tubes of yeast, each given <strong>1 mL</strong> of a different ' +
            'sucrose solution and left in a warm bath for ten minutes. Gas collects at the top and ' +
            'pushes the liquid down, so the air space is the measurement. ' +
            '<strong>Predict all four before you look.</strong>';
        const phase = U.el('p', 'u2fl-phase');
        const controls = U.el('div', 'sim-controls');
        const chartHost = U.el('div');
        const tblHost = U.el('div');
        const cerHost = U.el('div', 'u2fl-cer');
        const msg = U.el('p', 'u2fl-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, phase, controls, chartHost, tblHost, cerHost, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const commitBtn = U.button(buttons, 'Commit my prediction, then run the tubes', 'primary');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let step = 'predict';
        let sliders = [];
        let cerPick = { claim: null, evidence: null, reasoning: null };
        let canvas, ctx, theme;
        const MAXBAR = 6;

        TUBES.forEach(t => {
            sliders.push(U.slider(controls, 'tube' + t.pct,
                'Predicted change in air space, ' + t.label,
                0, MAXBAR, 2, v => v.toFixed(1) + ' cm', 0.1));
        });

        function drawChart() {
            if (!canvas) return;
            const t = theme.current;
            const w = canvas.width, h = canvas.height;
            const pad = { l: 44, r: 12, t: 14, b: 44 };
            const gridY = [];
            for (let v = 0; v <= MAXBAR; v++) gridY.push({ at: v / MAXBAR, label: String(v) });
            const { pw, ph } = U.axes(ctx, t, pad, w, h, { gridY });
            const bw = pw / TUBES.length;
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            TUBES.forEach((tu, i) => {
                const cx = pad.l + bw * i + bw / 2;
                const pred = sliders[i].value;
                const act = change(tu);
                // predicted, hollow
                const hp = (pred / MAXBAR) * ph;
                ctx.strokeStyle = t.axis; ctx.lineWidth = 1.6;
                ctx.setLineDash([4, 3]);
                ctx.strokeRect(cx - bw * 0.34, pad.t + ph - hp, bw * 0.30, hp);
                ctx.setLineDash([]);
                if (step !== 'predict') {
                    const ha = (act / MAXBAR) * ph;
                    ctx.fillStyle = t.teal;
                    ctx.fillRect(cx + bw * 0.02, pad.t + ph - ha, bw * 0.30, ha);
                    ctx.fillStyle = t.ink;
                    ctx.fillText(act.toFixed(1), cx + bw * 0.17, pad.t + ph - ha - 4);
                }
                ctx.fillStyle = t.axis;
                ctx.fillText(tu.label, cx, pad.t + ph + 16);
            });
            ctx.fillStyle = t.axis;
            ctx.fillText('dashed = your prediction' + (step !== 'predict' ? ',  solid = class data' : ''),
                pad.l + pw / 2, pad.t + ph + 34);
            ctx.save();
            ctx.translate(11, pad.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText('change in air space (cm)', 0, 0);
            ctx.restore();
        }

        function render() {
            phase.textContent = step === 'predict'
                ? 'Step 1 of 3 — predict'
                : step === 'data' ? 'Step 2 of 3 — the class data'
                : 'Step 3 of 3 — build the CER';

            if (!canvas) {
                const st = U.stage(chartHost, 600, 300,
                    'Bar chart comparing predicted and measured change in air space for four ' +
                    'tubes of yeast at 0, 5, 10 and 20 per cent sucrose.');
                canvas = st.canvas; ctx = st.ctx;
                theme = U.theme(() => drawChart());
                sliders.forEach(s => s.input.addEventListener('input', drawChart));
            }
            drawChart();
            controls.hidden = step !== 'predict';

            tblHost.innerHTML = '';
            if (step !== 'predict') {
                const box = U.el('div', 'u2fl-tbl');
                let html = '<table><thead><tr><th>Tube</th><th>Initial air space (cm)</th>' +
                    '<th>Final air space (cm)</th><th>Change (cm)</th></tr></thead><tbody>';
                TUBES.forEach(t => {
                    html += '<tr><td>' + t.label + '</td><td>' + t.start.toFixed(1) + '</td><td>' +
                        t.end.toFixed(1) + '</td><td><strong>' + change(t).toFixed(1) +
                        '</strong></td></tr>';
                });
                html += '</tbody></table>';
                box.innerHTML = html;
                tblHost.appendChild(box);
            }

            cerHost.innerHTML = '';
            if (step === 'cer') {
                ['claim', 'evidence', 'reasoning'].forEach(k => {
                    const h = document.createElement('h6');
                    h.textContent = k.toUpperCase();
                    const q = U.el('p', 'q'); q.textContent = CER[k].q;
                    cerHost.appendChild(h); cerHost.appendChild(q);
                    CER[k].opts.forEach((o, i) => {
                        const b = U.el('button', 'u2fl-opt');
                        b.type = 'button'; b.textContent = o.t;
                        if (cerPick[k] !== null) {
                            if (i === cerPick[k]) b.classList.add(o.ok ? 'good' : 'bad');
                            else if (o.ok) b.classList.add('good');
                        }
                        b.addEventListener('click', () => {
                            cerPick[k] = i;
                            if (o.ok) {
                                msg.textContent = 'Good ' + k + '.';
                                msg.className = 'u2fl-msg ok';
                            } else {
                                msg.textContent = o.why;
                                msg.className = 'u2fl-msg bad';
                            }
                            render();
                            if (['claim', 'evidence', 'reasoning']
                                .every(x => cerPick[x] !== null && CER[x].opts[cerPick[x]].ok)) showReveal();
                        });
                        cerHost.appendChild(b);
                    });
                });
            }

            commitBtn.hidden = step !== 'predict';
        }

        function showReveal() {
            revealHost.innerHTML = '';
            const changes = TUBES.map(change);
            const errs = TUBES.map((t, i) => Math.abs(sliders[i].value - change(t)));
            const mae = +(errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(2);
            const ratio = +(changes[3] / changes[0]).toFixed(0);
            const d = U.el('div', 'u2fl-rev');
            d.innerHTML = '<h5>What the tubes actually showed</h5>' +
                '<p>The change in air space rose with every step up in sucrose: ' +
                changes.map(c => c.toFixed(1) + ' cm').join(', ') + '. The 20% tube produced about ' +
                '<strong>' + ratio + ' times</strong> as much gas as the water control. Your ' +
                'predictions were out by ' + mae + ' cm on average.</p>' +
                '<p>Three things in this data are worth arguing about, and they are the parts a ' +
                'good answer notices:</p>' +
                '<p><strong>The water tube was not zero.</strong> It gave 0.2 cm. Yeast cells arrive ' +
                'with a little stored glycogen and they fermented that. A control group shows you ' +
                'the background, and the background here is not nothing.</p>' +
                '<p><strong>The gain from 10% to 20% was smaller than the gain from 5% to 10%</strong> ' +
                '(' + (changes[2] - changes[1]).toFixed(1) + ' cm against ' +
                (changes[3] - changes[2]).toFixed(1) + ' cm). The curve is flattening. Something ' +
                'other than sugar is starting to limit the rate — the number of yeast cells, the ' +
                'enzymes they have, or at very high concentrations the sugar itself drawing water ' +
                'out of them.</p>' +
                '<p><strong>Yeast cannot ferment sucrose directly.</strong> Glycolysis takes glucose. ' +
                'The fact that the sucrose tubes bubbled at all is your evidence that the yeast ' +
                'split the sucrose into glucose and fructose first — which is the question the ' +
                'deck asks and does not answer.</p>' +
                '<p class="u2fl-note">Anchor Guide 2 page 18 prints 5 mL of sucrose solution. The ' +
                'teaching deck corrects this to <strong>1 mL</strong> (slide 129, "Change on anchor ' +
                'guide"), and the class data above was collected with 1 mL. Use 1 mL.</p>';
            revealHost.appendChild(d);
        }

        commitBtn.addEventListener('click', () => {
            step = 'data';
            const errs = TUBES.map((t, i) => Math.abs(sliders[i].value - change(t)));
            const mae = +(errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(2);
            const trendRight = sliders.every((s, i) => i === 0 || s.value >= sliders[i - 1].value);
            msg.textContent = 'Prediction locked in. Average error ' + mae + ' cm. ' +
                (trendRight ? 'You predicted the trend in the right direction.'
                            : 'You predicted the trend the other way round — look at the bars.');
            msg.className = 'u2fl-msg ' + (trendRight ? 'ok' : 'bad');
            step = 'cer';
            render();
        });

        resetBtn.addEventListener('click', () => {
            step = 'predict'; cerPick = { claim: null, evidence: null, reasoning: null };
            msg.textContent = ''; msg.className = 'u2fl-msg'; revealHost.innerHTML = '';
            render();
        });

        render();

        root._simState = () => ({
            step,
            predictions: sliders.map((s, i) => ({ tube: TUBES[i].label, predicted: s.value })),
            data: TUBES.map(t => ({ tube: t.label, start: t.start, end: t.end, change: change(t) })),
            cer: Object.assign({}, cerPick),
            cerComplete: ['claim', 'evidence', 'reasoning']
                .every(k => cerPick[k] !== null && CER[k].opts[cerPick[k]].ok),
            sucroseVolume_mL: 1
        });
        root._simSolve = () => {
            sliders.forEach((s, i) => { s.input.value = change(TUBES[i]); s.sync(); });
            step = 'cer';
            ['claim', 'evidence', 'reasoning'].forEach(k => {
                cerPick[k] = CER[k].opts.findIndex(o => o.ok);
            });
            render();
            msg.textContent = 'Solved.'; msg.className = 'u2fl-msg ok';
            showReveal();
        };
    };
})();
