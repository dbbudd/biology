/* =============================================================
   INTERACTIVE — Leaf-disc photosynthesis lab
   -------------------------------------------------------------
   Registers window.SIMS['u2-leaf-disc'].  Supports HS-LS1-5 and the
   SEP "Planning and Carrying Out Investigations".

   Anchor Guide 1 pages 15 to 23 run the leaf-disc floating assay
   three times — carbon dioxide, light intensity, temperature — and
   each time asks the reader to name the independent variable, the
   dependent variable, the control group and the controlled
   variables. Those boxes are blank in the guide.

   The numbers here are the real class data from
   Photosynthesis_Lab_Sample_Data.docx: discs floated, minute by
   minute, ten minutes, three runs per experiment. Nothing is
   invented and nothing is smoothed.

   ORDER MATTERS. The reader must name the variables BEFORE the data
   appears, because that is the actual skill; reading a graph you have
   already seen teaches nothing about designing an investigation.

   Every rate quoted in the reveal is computed from the arrays below.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2ld-style';

    const N_DISCS = 10;

    const EXPERIMENTS = {
        co2: {
            id: 'co2',
            title: 'Part 1 — does CO₂ concentration change the rate?',
            iv: 'CO₂ concentration in the beaker',
            dv: 'Number of leaf discs floating',
            control: 'The beaker of plain water (0% bicarbonate)',
            controlled: ['light intensity and distance', 'temperature', 'number of discs (10)',
                         'same spinach leaf', 'volume of liquid (100 mL)', 'time (10 minutes)'],
            runs: [
                { name: 'Water (0% CO₂)', colour: 'axis', data: [0,0,1,1,2,2,3,3,4,4] },
                { name: '0.5% bicarbonate', colour: 'blue', data: [1,2,3,5,6,7,8,9,10,10] },
                { name: '1% bicarbonate', colour: 'ok', data: [2,4,6,8,10,10,10,10,10,10] }
            ],
            claims: [
                { t: 'The more CO₂ is available, the faster the discs float — so a higher CO₂ ' +
                     'concentration gives a faster rate of photosynthesis.', ok: true },
                { t: 'CO₂ makes no difference; all three beakers ended the same way.', ok: false },
                { t: 'The bicarbonate makes the discs lighter, so they float sooner.', ok: false },
                { t: 'Photosynthesis stopped in the water beaker because there was no CO₂ at all.', ok: false }
            ],
            wrongWhy: {
                1: 'They did not. After ten minutes the water beaker had 4 discs up and the 1% ' +
                   'beaker had all 10 — and had reached 10 in half the time.',
                2: 'Bicarbonate does not change the density of a leaf disc. What floats a disc is ' +
                   'oxygen collecting in its air spaces, and that oxygen is made by photosynthesis.',
                3: 'Some discs did float in plain water, so photosynthesis was still happening. ' +
                   'Water always holds a little dissolved CO₂ — the beaker was low in CO₂, not free of it.'
            }
        },
        light: {
            id: 'light',
            title: 'Part 2 — does light intensity change the rate?',
            iv: 'Light intensity (how close the lamp is)',
            dv: 'Number of leaf discs floating',
            control: 'The beaker with no light at all',
            controlled: ['CO₂ concentration (1% bicarbonate in all three)', 'temperature',
                         'number of discs (10)', 'same spinach leaf', 'volume of liquid (100 mL)',
                         'time (10 minutes)'],
            runs: [
                { name: 'High light', colour: 'ok', data: [2,4,6,8,10,10,10,10,10,10] },
                { name: 'Dim light', colour: 'blue', data: [0,1,2,3,4,5,6,7,8,9] },
                { name: 'No light', colour: 'red', data: [0,0,0,0,0,0,0,0,0,0] }
            ],
            claims: [
                { t: 'Brighter light gives a faster rate of photosynthesis, and with no light ' +
                     'the rate falls to zero.', ok: true },
                { t: 'Light warms the water, and the warmth is what makes the discs rise.', ok: false },
                { t: 'The discs in the dark had run out of CO₂.', ok: false },
                { t: 'Light intensity affects how many discs float in the end, but not how fast.', ok: false }
            ],
            wrongWhy: {
                1: 'Temperature was a controlled variable here — the same in all three beakers. ' +
                   'And Part 3 tests temperature separately, with a different result.',
                2: 'All three beakers had the same 1% bicarbonate. The dark beaker had plenty of ' +
                   'CO₂ and no light, and made no oxygen at all.',
                3: 'It affects both. High light reached all 10 discs by minute 5; dim light was ' +
                   'still climbing at minute 10; the dark beaker never started.'
            }
        },
        temp: {
            id: 'temp',
            title: 'Part 3 — does temperature change the rate?',
            iv: 'Temperature the discs were treated at',
            dv: 'Number of leaf discs floating',
            control: 'The beaker at room temperature',
            controlled: ['CO₂ concentration (1% bicarbonate)', 'light intensity', 'number of discs (10)',
                         'same spinach leaf', 'volume of liquid (100 mL)', 'time (10 minutes)'],
            runs: [
                { name: 'Room temperature', colour: 'ok', data: [1,3,5,7,9,10,10,10,10,10] },
                { name: 'Iced water', colour: 'blue', data: [0,1,2,3,4,5,6,7,8,9] },
                { name: 'Boiled water', colour: 'red', data: [0,0,0,0,0,0,0,0,0,0] }
            ],
            claims: [
                { t: 'The rate rises with temperature up to a point, but discs dipped in boiling ' +
                     'water do not photosynthesise at all — the enzymes have been denatured.', ok: true },
                { t: 'The hotter the water, the faster photosynthesis goes.', ok: false },
                { t: 'Cold stops photosynthesis completely.', ok: false },
                { t: 'The boiled discs sank because boiling filled them with water.', ok: false }
            ],
            wrongWhy: {
                1: 'Then the boiled beaker should have been fastest of all. It produced nothing. ' +
                   'Rate rises with temperature only while the enzymes survive.',
                2: 'The iced discs were slower, but they were still going — 9 of 10 had floated by ' +
                   'minute 10. Cold slows enzymes down; it does not wreck them.',
                3: 'The discs were vacuum-infiltrated the same way in every run, and they all sank ' +
                   'at the start. What differed afterwards was whether they made any oxygen.'
            }
        }
    };

    /* ---- computed, never typed ---- */
    function et50(series) {          // minute at which half the discs have floated
        const half = N_DISCS / 2;
        for (let i = 0; i < series.length; i++) {
            if (series[i] >= half) {
                const y0 = i ? series[i - 1] : 0, y1 = series[i];
                if (y1 === y0) return i + 1;
                return +((i) + (half - y0) / (y1 - y0)).toFixed(2);
            }
        }
        return null;
    }
    // Mean rate over the RISING part of the curve. Once every disc is up the
    // line flattens because the apparatus has run out of discs, not because
    // the leaf slowed down — so averaging over the whole ten minutes would
    // make every successful run look identical.
    function finalRate(series) {
        const done = series.indexOf(N_DISCS);
        if (done >= 0) return +(N_DISCS / (done + 1)).toFixed(2);
        return +(series[series.length - 1] / series.length).toFixed(2);
    }
    function initialRate(series) {   // discs per minute over the first three minutes
        return +(series[2] / 3).toFixed(2);
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2ld{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2ld{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2ld{--ok:#4a6b3d;--bad:#a04040}',
            '.u2ld-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.7rem;line-height:1.5}',
            '.u2ld-phase{font-size:0.62rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;',
            '  color:var(--text-secondary);margin:0 0 0.4rem}',
            '.u2ld-tabs{display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.7rem}',
            '.u2ld-tab{font:inherit;font-size:0.78rem;padding:0.3rem 0.6rem;border-radius:999px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2ld-tab[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2ld-tab[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2ld-q{margin:0.55rem 0;font-size:0.83rem}',
            '.u2ld-q label{display:block;margin-bottom:0.2rem;color:var(--text-secondary);font-size:0.75rem}',
            '.u2ld-q select{font:inherit;font-size:0.8rem;padding:0.26rem 0.4rem;border-radius:6px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);width:100%;max-width:420px}',
            '.u2ld-q select.ok{border-color:var(--ok)} .u2ld-q select.bad{border-color:var(--bad)}',
            '.u2ld-claims{margin:0.5rem 0 0;display:flex;flex-direction:column;gap:0.35rem}',
            '.u2ld-claim{font:inherit;font-size:0.8rem;text-align:left;line-height:1.45;padding:0.45rem 0.6rem;',
            '  border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2ld-claim:hover{border-color:var(--light-teal)}',
            '.u2ld-claim.good{border-color:var(--ok);background:rgba(46,125,50,0.10)}',
            '.u2ld-claim.bad{border-color:var(--bad);background:rgba(170,39,47,0.10)}',
            '.u2ld-tbl{overflow-x:auto;margin-top:0.6rem}',
            '.u2ld-tbl table{border-collapse:collapse;font-size:0.74rem;min-width:min-content}',
            '.u2ld-tbl th,.u2ld-tbl td{border:1px solid var(--border);padding:0.16rem 0.4rem;text-align:center}',
            '.u2ld-tbl th{color:var(--text-secondary)}',
            '.u2ld-key{display:flex;gap:0.9rem;flex-wrap:wrap;font-size:0.74rem;margin-top:0.4rem}',
            '.u2ld-key span{display:inline-flex;align-items:center;gap:0.3rem}',
            '.u2ld-sw{width:14px;height:4px;border-radius:2px;display:inline-block}',
            '.u2ld-msg{margin:0.8rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2ld-msg.ok{color:var(--ok)} .u2ld-msg.bad{color:var(--bad)}',
            '.u2ld-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2ld-rev{background:rgba(127,201,138,0.12)}',
            '.u2ld-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2ld-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}',
            '.u2ld-rev ul{margin:0 0 0.6rem;padding-left:1.1rem;font-size:0.82rem;line-height:1.55}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u2-leaf-disc'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u2ld');
        const how = U.el('p', 'u2ld-how');
        how.innerHTML = 'Ten spinach discs are vacuum-infiltrated so they sink. As they ' +
            'photosynthesise, oxygen collects in their air spaces and they float back up — so ' +
            '<strong>discs floated is a measure of oxygen made</strong>. Pick an experiment, ' +
            'design it, and only then look at the class data.';
        const tabs = U.el('div', 'u2ld-tabs');
        const phase = U.el('p', 'u2ld-phase');
        const body = U.el('div');
        const msg = U.el('p', 'u2ld-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, tabs, phase, body, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const checkBtn = U.button(buttons, 'Check my design', 'primary');
        const dataBtn = U.button(buttons, 'Show me the class data', 'primary');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let E = EXPERIMENTS.co2;
        let step = 'design';   // design | data | conclude
        let answers = { iv: '', dv: '', control: '' };
        let claimPicked = null;
        let canvas, ctx, theme;

        // Option pools, deliberately including plausible confusions.
        function options(kind) {
            const all = {
                iv: ['CO₂ concentration in the beaker', 'Light intensity (how close the lamp is)',
                     'Temperature the discs were treated at', 'Number of leaf discs floating',
                     'Time in minutes', 'The kind of leaf used'],
                dv: ['Number of leaf discs floating', 'CO₂ concentration in the beaker',
                     'Light intensity (how close the lamp is)', 'Temperature the discs were treated at',
                     'Time in minutes', 'The mass of the leaf discs'],
                control: ['The beaker of plain water (0% bicarbonate)', 'The beaker with no light at all',
                          'The beaker at room temperature', 'The beaker that worked best',
                          'All three beakers', 'There is no control group in this experiment']
            };
            return all[kind];
        }

        function drawChart() {
            if (!canvas) return;
            const t = theme.current;
            const w = canvas.width, h = canvas.height;
            const pad = { l: 46, r: 12, t: 12, b: 34 };
            const gridY = [];
            for (let v = 0; v <= N_DISCS; v += 2) gridY.push({ at: v / N_DISCS, label: String(v) });
            const { pw, ph } = U.axes(ctx, t, pad, w, h, { gridY });
            const X = m => pad.l + (m / 10) * pw;
            const Y = v => pad.t + ph - (v / N_DISCS) * ph;
            ctx.font = '10px system-ui, sans-serif';
            ctx.fillStyle = t.axis; ctx.textAlign = 'center';
            for (let m = 0; m <= 10; m += 2) ctx.fillText(String(m), X(m), pad.t + ph + 16);
            ctx.fillText('time (minutes)', pad.l + pw / 2, pad.t + ph + 30);
            ctx.save();
            ctx.translate(12, pad.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText('discs floated', 0, 0);
            ctx.restore();
            E.runs.forEach(r => {
                ctx.strokeStyle = t[r.colour] || t.ink;
                ctx.fillStyle = t[r.colour] || t.ink;
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(X(0), Y(0));
                r.data.forEach((v, i) => ctx.lineTo(X(i + 1), Y(v)));
                ctx.stroke();
                r.data.forEach((v, i) => {
                    ctx.beginPath(); ctx.arc(X(i + 1), Y(v), 2.8, 0, 6.284); ctx.fill();
                });
            });
        }

        function render() {
            tabs.innerHTML = '';
            Object.values(EXPERIMENTS).forEach(x => {
                const b = U.el('button', 'u2ld-tab');
                b.type = 'button';
                b.textContent = x.id === 'co2' ? 'CO₂' : x.id === 'light' ? 'Light intensity' : 'Temperature';
                b.setAttribute('aria-pressed', x.id === E.id ? 'true' : 'false');
                b.addEventListener('click', () => {
                    E = x; step = 'design'; answers = { iv: '', dv: '', control: '' };
                    claimPicked = null; msg.textContent = ''; msg.className = 'u2ld-msg';
                    revealHost.innerHTML = ''; render();
                });
                tabs.appendChild(b);
            });

            phase.textContent = step === 'design'
                ? E.title + ' — step 1 of 3: design'
                : step === 'data' ? E.title + ' — step 2 of 3: the data'
                : E.title + ' — step 3 of 3: the conclusion';

            body.innerHTML = ''; canvas = null;

            if (step === 'design') {
                [['iv', 'Independent variable — the one thing you changed on purpose'],
                 ['dv', 'Dependent variable — the thing you measured'],
                 ['control', 'Control group — the run you compare the others against']
                ].forEach(([k, lab]) => {
                    const d = U.el('div', 'u2ld-q');
                    const l = document.createElement('label');
                    l.textContent = lab;
                    const sel = document.createElement('select');
                    sel.innerHTML = '<option value="">choose…</option>' +
                        options(k).map(o => '<option>' + o + '</option>').join('');
                    sel.value = answers[k];
                    l.htmlFor = sel.id = 'u2ld-' + k + '-' + Math.random().toString(36).slice(2, 6);
                    sel.addEventListener('change', () => {
                        answers[k] = sel.value; sel.className = '';
                        msg.textContent = ''; msg.className = 'u2ld-msg';
                    });
                    d.appendChild(l); d.appendChild(sel);
                    body.appendChild(d);
                });
                const cv = U.el('p', 'u2ld-q');
                cv.innerHTML = '<label>Controlled variables — everything kept the same</label>' +
                    '<span style="font-size:0.8rem">' + E.controlled.join(' &middot; ') + '</span>';
                body.appendChild(cv);
            } else {
                const st = U.stage(body, 620, 300, 'Line graph of leaf discs floated against time, ' +
                    'one line per run in this experiment.');
                canvas = st.canvas; ctx = st.ctx;
                if (!theme) theme = U.theme(() => drawChart());
                drawChart();

                const key = U.el('div', 'u2ld-key');
                const t = theme.current;
                E.runs.forEach(r => {
                    const s = document.createElement('span');
                    s.innerHTML = '<i class="u2ld-sw" style="background:' + (t[r.colour] || t.ink) +
                        '"></i>' + r.name;
                    key.appendChild(s);
                });
                body.appendChild(key);

                const tb = U.el('div', 'u2ld-tbl');
                let html = '<table><thead><tr><th>Minute</th>' +
                    E.runs.map(r => '<th>' + r.name + '</th>').join('') + '</tr></thead><tbody>';
                for (let m = 0; m < 10; m++) {
                    html += '<tr><td>' + (m + 1) + '</td>' +
                        E.runs.map(r => '<td>' + r.data[m] + '</td>').join('') + '</tr>';
                }
                html += '</tbody></table>';
                tb.innerHTML = html;
                body.appendChild(tb);

                if (step === 'conclude') {
                    const p = U.el('p', 'u2ld-phase');
                    p.textContent = 'Which conclusion does this data actually support?';
                    body.appendChild(p);
                    const cl = U.el('div', 'u2ld-claims');
                    E.claims.forEach((c, i) => {
                        const b = U.el('button', 'u2ld-claim');
                        b.type = 'button'; b.textContent = c.t;
                        if (claimPicked !== null) {
                            if (i === claimPicked) b.classList.add(c.ok ? 'good' : 'bad');
                            else if (c.ok) b.classList.add('good');
                        }
                        b.addEventListener('click', () => {
                            claimPicked = i;
                            if (c.ok) {
                                msg.textContent = 'That is the claim the data supports.';
                                msg.className = 'u2ld-msg ok';
                                showReveal();
                            } else {
                                msg.textContent = E.wrongWhy[i] || 'Look at the graph again.';
                                msg.className = 'u2ld-msg bad';
                                revealHost.innerHTML = '';
                            }
                            render();
                        });
                        cl.appendChild(b);
                    });
                    body.appendChild(cl);
                }
            }

            checkBtn.hidden = step !== 'design';
            dataBtn.hidden = step !== 'data';
        }

        checkBtn.addEventListener('click', () => {
            const sels = body.querySelectorAll('select');
            const keys = ['iv', 'dv', 'control'];
            let right = 0;
            keys.forEach((k, i) => {
                const ok = answers[k] === E[k];
                sels[i].className = answers[k] ? (ok ? 'ok' : 'bad') : '';
                if (ok) right++;
            });
            if (right === 3) {
                msg.textContent = 'Design confirmed. Now — and only now — you get the data.';
                msg.className = 'u2ld-msg ok';
                step = 'data'; render();
            } else {
                const tips = [];
                if (answers.iv !== E.iv) tips.push('The independent variable is the one thing the ' +
                    'experimenter deliberately changed between beakers.');
                if (answers.dv !== E.dv) tips.push('The dependent variable is what you counted. ' +
                    'It is the number in the results table.');
                if (answers.control !== E.control) tips.push('The control group is the run with ' +
                    'none of the treatment — the baseline you judge the others against.');
                msg.textContent = right + ' of 3. ' + tips.join(' ');
                msg.className = 'u2ld-msg bad';
            }
        });

        dataBtn.addEventListener('click', () => { step = 'conclude'; render(); });

        function showReveal() {
            revealHost.innerHTML = '';
            const rows = E.runs.map(r => {
                const e = et50(r.data);
                return '<li><strong>' + r.name + '</strong> — ' +
                    (e === null ? 'never reached half the discs in 10 minutes'
                                : 'half the discs up by minute ' + e) +
                    '; mean rate while still rising ' + finalRate(r.data) + ' discs/min, ' +
                    'first three minutes ' + initialRate(r.data) + ' discs/min.</li>';
            }).join('');
            const fastest = E.runs.reduce((a, b) => finalRate(b.data) > finalRate(a.data) ? b : a);
            const slowest = E.runs.reduce((a, b) => finalRate(b.data) < finalRate(a.data) ? b : a);
            const d = U.el('div', 'u2ld-rev');
            d.innerHTML = '<h5>Reading a rate off a graph</h5>' +
                '<p>"How many floated in the end" is a weak measure, because most runs finish at ' +
                '10 sooner or later. A rate is better. Two honest ways to get one:</p>' +
                '<ul>' + rows + '</ul>' +
                '<p>By either measure, <strong>' + fastest.name + '</strong> was fastest and ' +
                '<strong>' + slowest.name + '</strong> slowest' +
                (finalRate(slowest.data) === 0 ? ' — flat on the axis, no oxygen at all.' : '.') +
                '</p>' +
                '<p>Notice what the steepness of a line means physically. A steep line is discs ' +
                'filling with oxygen quickly, which is photosynthesis running fast. A line that ' +
                'flattens at 10 has not slowed down — it has simply run out of discs to float. ' +
                'That ceiling is a limit of the apparatus, not of the plant, and it is the reason ' +
                'you read the rate from the <em>early</em> part of the curve.</p>';
            revealHost.appendChild(d);
        }

        resetBtn.addEventListener('click', () => {
            step = 'design'; answers = { iv: '', dv: '', control: '' }; claimPicked = null;
            msg.textContent = ''; msg.className = 'u2ld-msg'; revealHost.innerHTML = ''; render();
        });

        render();

        root._simState = () => ({
            experiment: E.id, step, answers: Object.assign({}, answers),
            claimPicked,
            expected: { iv: E.iv, dv: E.dv, control: E.control },
            rates: E.runs.map(r => ({
                run: r.name, et50: et50(r.data),
                meanRate: finalRate(r.data), initialRate: initialRate(r.data)
            }))
        });
        root._simSolve = () => {
            answers = { iv: E.iv, dv: E.dv, control: E.control };
            step = 'conclude';
            claimPicked = E.claims.findIndex(c => c.ok);
            render();
            msg.textContent = 'Solved.'; msg.className = 'u2ld-msg ok';
            showReveal();
        };
    };
})();
