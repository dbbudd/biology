/* =============================================================
   INTERACTIVE — Design the investigation
   -------------------------------------------------------------
   Registers window.SIMS['u1-investigation'].  Supports HS-LS1-3.

   Two benches, because chapter 1.7 has two jobs.

   BENCH 1 "Plan"  — the reader assigns every variable a role,
     picks a control, picks a number of trials, commits, and only
     then runs the design. The data the design produces is
     generated at runtime from a fixed underlying effect plus
     noise, so a one-trial design really does produce an
     unconvincing answer and a ten-trial design really does
     produce a convincing one. Nothing is asserted; it is shown.
     The same run also prints the graph back as a table, which is
     the "translate data from a graph into a table" target.

   BENCH 2 "Energy balance" — the body-mass target. There is no
     source material for it anywhere in 696 slides, so the model
     here is built from scratch: Mifflin-St Jeor for basal
     metabolic rate, an activity multiplier, a MET-based cost for
     deliberate exercise, and roughly 7700 kcal per kilogram of
     tissue. BMR is recomputed every simulated day, which is what
     produces the plateau — the single most important and least
     taught fact about changing body mass.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u1-inv-style';

    const KCAL_PER_KG = 7700;      // energy in 1 kg of body tissue gained or lost

    /* ---------------- bench 1 data ---------------- */
    const ROLES = ['Independent', 'Dependent', 'Controlled', 'Not relevant'];
    const VARIABLES = [
        { t: 'How much step-up exercise each person does: none, 1 minute, or 3 minutes', role: 'Independent',
          why: 'This is the one thing you deliberately change, and it is the only thing you are allowed to change deliberately. Everything else you either measure or hold still.' },
        { t: 'Number of breaths taken in one minute, counted straight afterwards', role: 'Dependent',
          why: 'This is what you measure — the thing you think depends on the independent variable. It goes on the vertical axis of the graph.' },
        { t: 'How the breaths are counted: same counter, same 60-second window, every time', role: 'Controlled',
          why: 'If one person counts for 30 seconds and doubles it while another counts for a full minute, some of the difference in your results is caused by your method rather than by exercise. Method is a variable too.' },
        { t: 'The temperature of the room', role: 'Controlled',
          why: 'A hot room raises breathing rate on its own. If the exercise group happens to be measured in a warmer room, you cannot tell which cause produced the effect.' },
        { t: 'How long each person rests before their reading is taken', role: 'Controlled',
          why: 'Breathing rate falls steadily after exercise stops. Measuring one person after 10 seconds and another after 2 minutes puts a large error into the data that has nothing to do with your question.' },
        { t: 'The age of each participant', role: 'Controlled',
          why: 'Resting breathing rate changes with age. In a class of 15- and 16-year-olds this is nearly constant anyway — but it is still something you hold still rather than something you ignore.' },
        { t: 'The colour of each participant\'s shoes', role: 'Not relevant',
          why: 'No mechanism connects shoe colour to breathing rate, so there is nothing to control. Listing genuinely irrelevant variables as "controlled" is a common way of padding a method, and it is not the same as controlling something that matters.' },
        { t: 'Each participant\'s favourite school subject', role: 'Not relevant',
          why: 'Same again. A controlled variable is one that could plausibly affect your dependent variable if you let it vary. This one could not.' }
    ];
    const CONTROLS = [
        { t: 'Measure each person at rest first, then again after exercising', ok: true,
          why: 'The best design here. Each person becomes their own comparison, so differences in fitness, age and lung size between people cancel out instead of adding noise. The "no exercise" reading is your control condition.' },
        { t: 'A separate group of people who do no exercise at all', ok: true,
          why: 'Also a legitimate control, and the right choice when the measurement itself would change the participant. Its weakness here is that the two groups differ in ways other than exercise — fitness varies a great deal between people — so you need more participants to see the effect through that variation.' },
        { t: 'No control is needed, because everyone knows exercise raises breathing rate', ok: false,
          why: 'Knowing the answer in advance is not evidence, and an investigation that cannot come out the other way is not an investigation. Without a comparison you have a number with nothing to compare it to.' },
        { t: 'A group who exercise for 10 minutes instead of 3', ok: false,
          why: 'That is another level of the independent variable, not a control. A control is the condition where the independent variable is absent.' }
    ];
    const OVERLAP_Q = [
        { t: 'Yes — the difference could easily be chance', v: 'overlap' },
        { t: 'No — the difference looks real', v: 'clear' }
    ];

    /* ---------------- bench 2 model ---------------- */
    function bmr(sex, W, H, A) { return 10 * W + 6.25 * H - 5 * A + (sex === 'm' ? 5 : -161); }
    function exerciseKcal(met, W, mins) { return met * 3.5 * W / 200 * mins; }
    function tdee(sex, W, H, A, factor, met, mins) {
        return bmr(sex, W, H, A) * factor + exerciseKcal(met, W, mins);
    }
    function steadyMass(sex, H, A, factor, met, mins, intake) {
        const c = 6.25 * H - 5 * A + (sex === 'm' ? 5 : -161);
        const k = met * 3.5 * mins / 200;
        return (intake - c * factor) / (10 * factor + k);
    }
    function project(sex, W0, H, A, factor, met, mins, intake, days) {
        let W = W0; const series = [{ d: 0, W }];
        for (let d = 1; d <= days; d++) {
            W += (intake - tdee(sex, W, H, A, factor, met, mins)) / KCAL_PER_KG;
            if (W < 30) W = 30;
            if (d % 15 === 0 || d === days) series.push({ d, W });
        }
        return series;
    }

    const ACTIVITY = [
        ['1.2', 'Sedentary — mostly sitting'],
        ['1.375', 'Lightly active — some walking'],
        ['1.55', 'Moderately active — on your feet a lot'],
        ['1.725', 'Very active — physical job or training daily']
    ];
    const EXERCISE = [
        ['0', 'None'],
        ['4.3', 'Brisk walking (4.3 MET)'],
        ['5.8', 'Swimming, steady (5.8 MET)'],
        ['6.5', 'Basketball (6.5 MET)'],
        ['7.5', 'Cycling, moderate (7.5 MET)'],
        ['8.3', 'Running 8 km/h (8.3 MET)']
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.inv { padding:1rem 1.25rem 0.25rem; --i-ok:#2e7d32; --i-bad:#aa272f; --i-accent:var(--light-teal); }',
            '[data-theme="dark"] .inv { --i-ok:#7fc98a; --i-bad:#e08a90; }',
            '[data-theme="sepia"] .inv { --i-ok:#4a6b3d; --i-bad:#a04040; }',
            '.inv-tabs { display:flex; gap:0.35rem; margin:0 0 1rem; border-bottom:1px solid var(--border); }',
            '.inv-tabs button { font:inherit; font-size:0.8rem; font-weight:600; padding:0.45rem 0.8rem;',
            '   border:none; background:transparent; color:var(--text-secondary); cursor:pointer;',
            '   border-bottom:2.5px solid transparent; margin-bottom:-1px; }',
            '.inv-tabs button[aria-selected="true"] { color:var(--text); border-bottom-color:var(--i-accent); }',
            '.inv-h { font-size:0.62rem; font-weight:700; letter-spacing:0.09em; text-transform:uppercase;',
            '   color:var(--text-secondary); margin:0 0 0.4rem; }',
            '.inv-lead { font-size:0.85rem; line-height:1.6; margin:0 0 0.9rem; }',
            '.inv-var { border:1px solid var(--border); border-radius:8px; padding:0.5rem 0.65rem; margin:0 0 0.4rem; }',
            '.inv-var p { margin:0 0 0.4rem; font-size:0.84rem; line-height:1.45; }',
            '.inv-roles { display:flex; flex-wrap:wrap; gap:0.3rem; }',
            '.inv-roles button { font:inherit; font-size:0.72rem; padding:0.22rem 0.55rem; border-radius:999px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text); cursor:pointer; }',
            '.inv-roles button[aria-pressed="true"] { border-color:var(--i-accent); background:var(--i-accent); color:#fff; }',
            '.inv-var.right { border-color:var(--i-ok); background:rgba(46,125,50,0.07); }',
            '.inv-var.wrong { border-color:var(--i-bad); background:rgba(170,39,47,0.06); }',
            '.inv-why { font-size:0.77rem; line-height:1.55; color:var(--text-secondary); margin:0.4rem 0 0; }',
            '.inv-opt { display:block; width:100%; text-align:left; font:inherit; font-size:0.84rem;',
            '   line-height:1.5; padding:0.5rem 0.7rem; margin:0 0 0.35rem; border-radius:8px;',
            '   border:1.5px solid var(--border); background:transparent; color:var(--text); cursor:pointer; }',
            '.inv-opt[aria-pressed="true"] { border-color:var(--i-accent); background:rgba(87,120,153,0.12); }',
            '.inv-opt.r-ok { border-color:var(--i-ok); background:rgba(46,125,50,0.10); cursor:default; }',
            '.inv-opt.r-bad { border-color:var(--i-bad); background:rgba(170,39,47,0.08); cursor:default; }',
            '.inv-opt.r-none { opacity:0.55; cursor:default; }',
            '.inv-label { font-size:0.62rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;',
            '   color:var(--text-secondary); margin:1rem 0 0.3rem; }',
            '.inv-chart svg { width:100%; height:auto; }',
            '.inv-table { width:100%; border-collapse:collapse; font-size:0.8rem; margin:0.6rem 0 0; }',
            '.inv-table th, .inv-table td { padding:0.25rem 0.4rem; border-bottom:1px solid var(--border); text-align:right; }',
            '.inv-table th:first-child, .inv-table td:first-child { text-align:left; }',
            '.inv-table th { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.05em;',
            '   color:var(--text-secondary); font-weight:700; }',
            '.inv-table td { font-variant-numeric:tabular-nums; }',
            '.inv-msg { margin:0.8rem 0 0; font-size:0.82rem; line-height:1.55; min-height:1.6em; }',
            '.inv-msg.ok { color:var(--i-ok); } .inv-msg.bad { color:var(--i-bad); }',
            '.inv-readout { border:1px solid var(--border); border-radius:10px; background:var(--bg-surface);',
            '   padding:0.7rem 0.85rem; margin:0.8rem 0 0; font-size:0.84rem; line-height:1.7; }',
            '.inv-readout b { font-variant-numeric:tabular-nums; }',
            '.inv-big { font-size:1.05rem; font-weight:700; }',
            '.inv-note { font-size:0.8rem; line-height:1.6; color:var(--text-secondary); margin:0.8rem 0 0; }',
            '.inv-note strong { color:var(--text); }',
            '.inv-reveal { margin-top:1rem; border:1px solid var(--i-accent); border-radius:10px;',
            '   background:rgba(87,120,153,0.10); padding:0.85rem 1rem; }',
            '.inv-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.inv-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.inv-reveal p:last-child { margin-bottom:0; }',
            '.inv-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.6rem;',
            '   margin:0 0 0.6rem; }',
            '.inv-field label { display:block; font-size:0.68rem; font-weight:700; letter-spacing:0.04em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin-bottom:0.2rem; }',
            '.inv-field select, .inv-field input { width:100%; font:inherit; font-size:0.82rem; padding:0.3rem 0.4rem;',
            '   border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u1-investigation'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'inv');
        const tabs = U.el('div', 'inv-tabs');
        tabs.setAttribute('role', 'tablist');
        const body = U.el('div');
        wrap.appendChild(tabs); wrap.appendChild(body);
        root.appendChild(wrap);

        let tab = 'plan';

        // ---------- bench 1 state ----------
        let roles = new Array(VARIABLES.length).fill(null);
        let controlPick = null;
        let trials = 3;
        let planMarked = false;
        let ran = null;                 // generated data
        let overlapAnswer = null;

        // ---------- bench 2 state ----------
        let sex = 'm', mass = 60, height = 170, age = 16;
        let factor = 1.2, met = 0, mins = 0, intake = 2400;
        let ebPredict = null;

        function renderTabs() {
            tabs.innerHTML = '';
            [['plan', 'Plan an investigation'], ['energy', 'Energy balance and body mass']].forEach(([k, t]) => {
                const b = document.createElement('button');
                b.type = 'button'; b.textContent = t;
                b.setAttribute('role', 'tab');
                b.setAttribute('aria-selected', tab === k ? 'true' : 'false');
                b.addEventListener('click', () => { tab = k; render(); });
                tabs.appendChild(b);
            });
        }

        function render() {
            renderTabs();
            body.innerHTML = '';
            (tab === 'plan' ? renderPlan : renderEnergy)(body);
        }

        /* ================= BENCH 1 ================= */
        function renderPlan(host) {
            const h = U.el('p', 'inv-h');
            h.textContent = ran ? 'Step 3 — your design, run' : 'Steps 1 and 2 — the design';
            host.appendChild(h);

            const lead = U.el('p', 'inv-lead');
            lead.innerHTML = '<strong>Research question:</strong> does exercise change breathing rate? ' +
                (ran ? 'Below is the data your own design produced.'
                     : 'Give every variable a role, choose a control, choose how many times to repeat it — then commit. ' +
                       'Nothing is marked until you do.');
            host.appendChild(lead);

            if (!ran) {
                const lab = U.el('p', 'inv-label'); lab.textContent = 'Every variable needs a role';
                host.appendChild(lab);

                VARIABLES.forEach((v, i) => {
                    const card = U.el('div', 'inv-var' +
                        (planMarked ? (roles[i] === v.role ? ' right' : ' wrong') : ''));
                    const p = document.createElement('p'); p.textContent = v.t; card.appendChild(p);
                    const row = U.el('div', 'inv-roles');
                    ROLES.forEach(r => {
                        const b = document.createElement('button');
                        b.type = 'button'; b.textContent = r;
                        b.setAttribute('aria-pressed', roles[i] === r ? 'true' : 'false');
                        b.disabled = planMarked;
                        b.addEventListener('click', () => { roles[i] = r; planMarked = false; render(); });
                        row.appendChild(b);
                    });
                    card.appendChild(row);
                    if (planMarked) {
                        const w = U.el('p', 'inv-why');
                        w.textContent = (roles[i] === v.role ? '' : 'It is ' + v.role.toLowerCase() + '. ') + v.why;
                        card.appendChild(w);
                    }
                    host.appendChild(card);
                });

                const lab2 = U.el('p', 'inv-label'); lab2.textContent = 'What will you compare against?';
                host.appendChild(lab2);
                CONTROLS.forEach((c, k) => {
                    const b = U.el('button', 'inv-opt');
                    b.type = 'button';
                    if (!planMarked) {
                        b.textContent = c.t;
                        b.setAttribute('aria-pressed', controlPick === k ? 'true' : 'false');
                        b.addEventListener('click', () => { controlPick = k; render(); });
                    } else {
                        b.disabled = true;
                        b.className = 'inv-opt ' + (c.ok ? 'r-ok' : (controlPick === k ? 'r-bad' : 'r-none'));
                        b.innerHTML = esc(c.t) + '<span class="inv-why">' + esc(c.why) + '</span>';
                    }
                    host.appendChild(b);
                });

                const lab3 = U.el('p', 'inv-label'); lab3.textContent = 'How many people will you measure?';
                host.appendChild(lab3);
                const ctl = U.el('div', 'sim-controls');
                host.appendChild(ctl);
                const sl = U.slider(ctl, 'inv-trials', 'Participants (repeats)', 1, 12, trials,
                    v => v + (v === 1 ? ' person' : ' people'));
                sl.input.disabled = planMarked;
                sl.input.addEventListener('input', () => { trials = +sl.input.value; });

                const btns = U.el('div', 'sim-buttons');
                host.appendChild(btns);
                if (!planMarked) {
                    const commit = U.button(btns, 'Commit this design', 'primary');
                    commit.addEventListener('click', () => {
                        if (roles.some(r => !r) || controlPick === null) {
                            msgInto(host, 'Give every variable a role and choose a control first.', 'bad');
                            return;
                        }
                        planMarked = true; render();
                    });
                } else {
                    const nRight = VARIABLES.filter((v, i) => roles[i] === v.role).length;
                    const good = CONTROLS[controlPick].ok;
                    const m = U.el('p', 'inv-msg ' + (nRight === VARIABLES.length && good ? 'ok' : 'bad'));
                    m.textContent = nRight + ' of ' + VARIABLES.length + ' variables in the right role, and your ' +
                        'control is ' + (good ? 'a good one' : 'not a control') + '. ' +
                        'Now run the design you actually committed to.';
                    host.insertBefore(m, btns);
                    const run = U.button(btns, 'Run it with ' + trials + (trials === 1 ? ' person' : ' people'), 'primary');
                    run.addEventListener('click', () => { ran = generate(trials); overlapAnswer = null; render(); });
                    const edit = U.button(btns, 'Change the design');
                    edit.addEventListener('click', () => { planMarked = false; render(); });
                }
                return;
            }

            // ---- results ----
            host.appendChild(barChart(ran));

            const lab = U.el('p', 'inv-label');
            lab.textContent = 'The same graph, written out as a table';
            host.appendChild(lab);
            host.appendChild(dataTable(ran));

            const q = U.el('p', 'inv-label');
            q.textContent = 'Do the error bars overlap?';
            host.appendChild(q);
            OVERLAP_Q.forEach(o => {
                const b = U.el('button', 'inv-opt');
                b.type = 'button';
                if (overlapAnswer === null) {
                    b.textContent = o.t;
                    b.addEventListener('click', () => { overlapAnswer = o.v; render(); });
                } else {
                    const truth = ran.overlap ? 'overlap' : 'clear';
                    b.disabled = true;
                    b.className = 'inv-opt ' + (o.v === truth ? 'r-ok' : (o.v === overlapAnswer ? 'r-bad' : 'r-none'));
                    b.textContent = o.t;
                }
                host.appendChild(b);
            });

            if (overlapAnswer !== null) {
                const note = U.el('div', 'inv-readout');
                note.innerHTML = verdict(ran);
                host.appendChild(note);
            }

            const btns = U.el('div', 'sim-buttons');
            host.appendChild(btns);
            const again = U.button(btns, 'Run it again with the same design');
            again.addEventListener('click', () => { ran = generate(trials); overlapAnswer = null; render(); });
            const back = U.button(btns, 'Change the number of people');
            back.addEventListener('click', () => { ran = null; planMarked = true; render(); });
        }

        /* The underlying truth of this made-up population, fixed once:
           resting rate 14.5 breaths/min, exercise adds 15, and people
           genuinely differ. The reader's design decides how well they
           can see through that variation. */
        const TRUE_REST = 14.5, TRUE_EFFECT = 15, SPREAD_REST = 1.4, SPREAD_EX = 3.4;
        function generate(n) {
            const rest = [], exer = [];
            for (let i = 0; i < n; i++) {
                rest.push(Math.max(6, Math.round(TRUE_REST + U.gauss() * SPREAD_REST)));
                exer.push(Math.max(8, Math.round(TRUE_REST + TRUE_EFFECT + U.gauss() * SPREAD_EX)));
            }
            const s = a => {
                const m = a.reduce((x, y) => x + y, 0) / a.length;
                const sd = a.length > 1
                    ? Math.sqrt(a.reduce((t, x) => t + (x - m) ** 2, 0) / (a.length - 1)) : NaN;
                return { m, sd, se: a.length > 1 ? sd / Math.sqrt(a.length) : NaN, n: a.length };
            };
            const R = s(rest), E = s(exer);
            const overlap = !(R.n > 1) ? null : (R.m + R.se >= E.m - E.se);
            return { n, rest, exer, R, E, overlap };
        }

        function barChart(d) {
            const W = 620, H = 260, pad = { l: 54, r: 16, t: 16, b: 46 };
            const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
            const top = 45;
            const y = v => pad.t + ph - (v / top) * ph;
            const bars = [['At rest', d.R, 'var(--light-teal)'], ['After exercise', d.E, 'var(--red)']];
            let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bar chart of mean breathing rate ' +
                'at rest and after exercise, with error bars of one standard error, from ' + d.n +
                (d.n === 1 ? ' person' : ' people') + '.">';
            for (let v = 0; v <= top; v += 10) {
                svg += '<line x1="' + pad.l + '" y1="' + y(v).toFixed(1) + '" x2="' + (pad.l + pw) + '" y2="' +
                    y(v).toFixed(1) + '" stroke="var(--border)"/>' +
                    '<text x="' + (pad.l - 8) + '" y="' + (y(v) + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" ' +
                    'fill="var(--text-secondary)">' + v + '</text>';
            }
            bars.forEach((b, i) => {
                const [label, st, colour] = b;
                const bw = pw / 4, cx = pad.l + pw * (i === 0 ? 0.28 : 0.72);
                svg += '<rect x="' + (cx - bw / 2) + '" y="' + y(st.m).toFixed(1) + '" width="' + bw +
                    '" height="' + (pad.t + ph - y(st.m)).toFixed(1) + '" fill="' + colour + '" opacity="0.75"/>';
                if (!isNaN(st.se)) {
                    svg += '<line x1="' + cx + '" y1="' + y(st.m - st.se).toFixed(1) + '" x2="' + cx + '" y2="' +
                        y(st.m + st.se).toFixed(1) + '" stroke="var(--text)" stroke-width="1.8"/>' +
                        '<line x1="' + (cx - 12) + '" y1="' + y(st.m + st.se).toFixed(1) + '" x2="' + (cx + 12) +
                        '" y2="' + y(st.m + st.se).toFixed(1) + '" stroke="var(--text)" stroke-width="1.8"/>' +
                        '<line x1="' + (cx - 12) + '" y1="' + y(st.m - st.se).toFixed(1) + '" x2="' + (cx + 12) +
                        '" y2="' + y(st.m - st.se).toFixed(1) + '" stroke="var(--text)" stroke-width="1.8"/>';
                }
                svg += '<text x="' + cx + '" y="' + (pad.t + ph + 18) + '" text-anchor="middle" font-size="11" ' +
                    'fill="var(--text)">' + label + '</text>' +
                    '<text x="' + cx + '" y="' + (pad.t + ph + 33) + '" text-anchor="middle" font-size="10" ' +
                    'fill="var(--text-secondary)">mean ' + st.m.toFixed(1) +
                    (isNaN(st.se) ? ' (no error bar — one reading)' : ' ± ' + st.se.toFixed(1)) + '</text>';
            });
            svg += '<line x1="' + pad.l + '" y1="' + (pad.t + ph) + '" x2="' + (pad.l + pw) + '" y2="' + (pad.t + ph) +
                '" stroke="var(--text-secondary)"/>' +
                '<text transform="translate(14,' + (pad.t + ph / 2) + ') rotate(-90)" text-anchor="middle" font-size="11" ' +
                'fill="var(--text-secondary)">Breaths per minute</text></svg>';
            const host = U.el('div', 'inv-chart');
            host.innerHTML = svg;
            return host;
        }

        function dataTable(d) {
            let html = '<table class="inv-table"><thead><tr><th>Participant</th>' +
                '<th>At rest (breaths/min)</th><th>After exercise (breaths/min)</th><th>Difference</th>' +
                '</tr></thead><tbody>';
            for (let i = 0; i < d.n; i++) {
                html += '<tr><td>' + (i + 1) + '</td><td>' + d.rest[i] + '</td><td>' + d.exer[i] + '</td><td>' +
                    (d.exer[i] - d.rest[i]) + '</td></tr>';
            }
            html += '<tr><td><strong>Mean</strong></td><td><strong>' + d.R.m.toFixed(1) + '</strong></td>' +
                '<td><strong>' + d.E.m.toFixed(1) + '</strong></td><td><strong>' +
                (d.E.m - d.R.m).toFixed(1) + '</strong></td></tr>';
            html += '<tr><td>Standard error</td><td>' + (isNaN(d.R.se) ? '—' : d.R.se.toFixed(2)) + '</td><td>' +
                (isNaN(d.E.se) ? '—' : d.E.se.toFixed(2)) + '</td><td></td></tr></tbody></table>';
            const host = U.el('div');
            host.innerHTML = html;
            return host;
        }

        function verdict(d) {
            if (d.n === 1) {
                return '<strong>You cannot answer the question, and that is the finding.</strong> ' +
                    'With one person there is no spread to measure, so there is no error bar to draw. ' +
                    'You have two numbers and no way of knowing whether the gap between them is the effect ' +
                    'of exercise or just this one person on this one day. Repeats are not tidiness; ' +
                    'they are the only thing that tells you how much your numbers wobble.';
            }
            if (d.overlap) {
                return '<strong>The error bars overlap, so the difference is not convincing.</strong> ' +
                    'Means of ' + d.R.m.toFixed(1) + ' ± ' + d.R.se.toFixed(1) + ' and ' + d.E.m.toFixed(1) +
                    ' ± ' + d.E.se.toFixed(1) + ' — the ranges touch, so a difference this size could turn up by ' +
                    'chance even if exercise did nothing at all. With ' + d.n + ' people you cannot yet say. ' +
                    'Add more, and watch the error bars shrink: standard error falls as the square root of the ' +
                    'number of repeats.';
            }
            return '<strong>The error bars are clear of each other, so the difference is worth believing.</strong> ' +
                'Means of ' + d.R.m.toFixed(1) + ' ± ' + d.R.se.toFixed(1) + ' and ' + d.E.m.toFixed(1) + ' ± ' +
                d.E.se.toFixed(1) + ', a gap of ' + (d.E.m - d.R.m).toFixed(1) + ' breaths per minute. ' +
                'Note what this does <em>not</em> prove: it says the difference is unlikely to be chance. ' +
                'It says nothing about whether your control of the other variables was any good — ' +
                'a badly controlled experiment can produce beautifully separated error bars around the wrong cause.';
        }

        /* ================= BENCH 2 ================= */
        function renderEnergy(host) {
            const h = U.el('p', 'inv-h');
            h.textContent = 'Energy in, energy out';
            host.appendChild(h);

            if (ebPredict === null) {
                const lead = U.el('p', 'inv-lead');
                lead.textContent = 'Before you touch anything: suppose someone takes in 500 kcal a day more ' +
                    'than they use, and never changes anything about their diet or their activity. What ' +
                    'happens to their body mass over the next three years?';
                host.appendChild(lead);
                [['It rises steadily and keeps rising at the same rate', false],
                 ['It rises quickly at first, then more slowly, and levels off', true],
                 ['It stays the same — the body compensates completely', false],
                 ['It rises for a while and then falls back on its own', false]].forEach(([t, ok]) => {
                    const b = U.el('button', 'inv-opt');
                    b.type = 'button'; b.textContent = t;
                    b.addEventListener('click', () => { ebPredict = ok; render(); });
                    host.appendChild(b);
                });
                return;
            }

            const lead = U.el('p', 'inv-lead');
            lead.innerHTML = (ebPredict
                ? '<strong>Correct — it levels off.</strong> '
                : '<strong>It levels off.</strong> ') +
                'A larger body costs more to run, so as mass rises, energy expenditure rises with it. ' +
                'The surplus shrinks by itself until it reaches zero, and mass stops changing. ' +
                'Change the numbers below and watch where it settles.';
            host.appendChild(lead);

            // ---- inputs ----
            const fields = U.el('div', 'inv-fields');
            fields.appendChild(field('Sex used by the equation', 'select',
                [['m', 'Male'], ['f', 'Female']], sex, v => { sex = v; render(); }));
            fields.appendChild(field('Starting mass (kg)', 'number', null, mass,
                v => { mass = clamp(+v, 35, 140); render(); }));
            fields.appendChild(field('Height (cm)', 'number', null, height,
                v => { height = clamp(+v, 130, 210); render(); }));
            fields.appendChild(field('Age (years)', 'number', null, age,
                v => { age = clamp(+v, 12, 80); render(); }));
            fields.appendChild(field('Everyday activity', 'select', ACTIVITY, String(factor),
                v => { factor = +v; render(); }));
            fields.appendChild(field('Deliberate exercise', 'select', EXERCISE, String(met),
                v => { met = +v; render(); }));
            host.appendChild(fields);

            const ctl = U.el('div', 'sim-controls');
            host.appendChild(ctl);
            const sIntake = U.slider(ctl, 'inv-intake', 'Food energy taken in each day', 1200, 4500, intake,
                v => v + ' kcal', 50);
            sIntake.input.addEventListener('input', () => { intake = +sIntake.input.value; render(); });
            const sMins = U.slider(ctl, 'inv-mins', 'Minutes of that exercise per day', 0, 120, mins,
                v => v + ' min', 5);
            sMins.input.addEventListener('input', () => { mins = +sMins.input.value; render(); });

            // ---- arithmetic, computed live ----
            const B = bmr(sex, mass, height, age);
            const ex = exerciseKcal(met, mass, mins);
            const out = tdee(sex, mass, height, age, factor, met, mins);
            const bal = intake - out;
            const naive = bal * 365 / KCAL_PER_KG;
            const steady = steadyMass(sex, height, age, factor, met, mins, intake);
            const series = project(sex, mass, height, age, factor, met, mins, intake, 365 * 3);

            const r = U.el('div', 'inv-readout');
            r.innerHTML =
                'Basal metabolic rate — what it costs simply to stay alive lying still: <b>' + Math.round(B) +
                ' kcal/day</b><br>' +
                'Everyday activity multiplier ×' + factor + ': <b>' + Math.round(B * factor) + ' kcal/day</b><br>' +
                (mins > 0 && met > 0
                    ? 'Plus ' + mins + ' min of exercise at ' + met + ' MET: <b>+' + Math.round(ex) + ' kcal/day</b><br>'
                    : 'No deliberate exercise added.<br>') +
                '<strong>Total energy out: <b>' + Math.round(out) + ' kcal/day</b>. ' +
                'Energy in: <b>' + intake + ' kcal/day</b>.</strong><br>' +
                '<span class="inv-big" style="color:' + (Math.abs(bal) < 25 ? 'var(--i-ok)' : (bal > 0 ? 'var(--red)' : 'var(--blue)')) + '">' +
                'Daily balance ' + (bal >= 0 ? '+' : '') + Math.round(bal) + ' kcal</span><br>' +
                'If nothing adapted, that is ' + (naive >= 0 ? '+' : '') + naive.toFixed(1) + ' kg per year. ' +
                'It does adapt, so mass settles at about <b>' + steady.toFixed(1) + ' kg</b>.';
            host.appendChild(r);

            host.appendChild(massChart(series, mass, steady));

            const n = U.el('p', 'inv-note');
            n.innerHTML = '<strong>Three things worth noticing.</strong> ' +
                'First, the curve bends — the naive figure of ' + naive.toFixed(1) + ' kg in the first year is an ' +
                'overestimate, because a bigger body burns more. Second, look at how small the daily numbers are: ' +
                'a single 250 kcal snack is about ' + (met > 0 ? Math.round(250 / (met * 3.5 * mass / 200)) + ' minutes of the exercise you chose'
                    : '55 minutes of brisk walking') + ', which is why changing intake usually moves the graph further than ' +
                'changing exercise does. Third, this is a <em>model</em>: it assumes a fixed diet, ignores what the ' +
                'mass is made of, and ignores the fact that people who eat less often move less without noticing. ' +
                'It gets the shape right and it will not get your future right.';
            host.appendChild(n);

            const btns = U.el('div', 'sim-buttons');
            host.appendChild(btns);
            const b1 = U.button(btns, 'Find the intake that holds mass steady');
            b1.addEventListener('click', () => {
                const need = tdee(sex, mass, height, age, factor, met, mins);
                intake = Math.round(need / 50) * 50;
                sIntake.input.value = intake; sIntake.sync(); render();
            });
            const b2 = U.button(btns, 'Reset the numbers');
            b2.addEventListener('click', () => {
                sex = 'm'; mass = 60; height = 170; age = 16;
                factor = 1.2; met = 0; mins = 0; intake = 2400; render();
            });
        }

        function massChart(series, start, steady) {
            const W = 620, H = 240, pad = { l: 52, r: 16, t: 16, b: 36 };
            const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
            const vals = series.map(p => p.W);
            let lo = Math.min(start, steady, ...vals), hi = Math.max(start, steady, ...vals);
            const padv = Math.max(2, (hi - lo) * 0.15);
            lo = Math.floor(lo - padv); hi = Math.ceil(hi + padv);
            const y = v => pad.t + ph - ((v - lo) / (hi - lo)) * ph;
            const x = d => pad.l + (d / (365 * 3)) * pw;
            const pts = series.map(p => x(p.d).toFixed(1) + ',' + y(p.W).toFixed(1)).join(' ');
            let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Projected body mass over three ' +
                'years, starting at ' + start.toFixed(0) + ' kilograms and levelling off near ' + steady.toFixed(0) +
                ' kilograms.">';
            for (let i = 0; i <= 4; i++) {
                const v = lo + (hi - lo) * i / 4;
                svg += '<line x1="' + pad.l + '" y1="' + y(v).toFixed(1) + '" x2="' + (pad.l + pw) + '" y2="' +
                    y(v).toFixed(1) + '" stroke="var(--border)"/>' +
                    '<text x="' + (pad.l - 8) + '" y="' + (y(v) + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" ' +
                    'fill="var(--text-secondary)">' + v.toFixed(0) + '</text>';
            }
            for (let yr = 1; yr <= 3; yr++) {
                svg += '<text x="' + x(365 * yr).toFixed(1) + '" y="' + (pad.t + ph + 16) + '" text-anchor="middle" ' +
                    'font-size="10" fill="var(--text-secondary)">year ' + yr + '</text>';
            }
            if (steady > lo && steady < hi) {
                svg += '<line x1="' + pad.l + '" y1="' + y(steady).toFixed(1) + '" x2="' + (pad.l + pw) + '" y2="' +
                    y(steady).toFixed(1) + '" stroke="var(--text-secondary)" stroke-dasharray="5 4"/>' +
                    '<text x="' + (pad.l + pw - 4) + '" y="' + (y(steady) - 6).toFixed(1) + '" text-anchor="end" ' +
                    'font-size="10" fill="var(--text-secondary)">settles near ' + steady.toFixed(1) + ' kg</text>';
            }
            svg += '<polyline points="' + pts + '" fill="none" stroke="var(--red)" stroke-width="2.5"/>' +
                '<line x1="' + pad.l + '" y1="' + (pad.t + ph) + '" x2="' + (pad.l + pw) + '" y2="' + (pad.t + ph) +
                '" stroke="var(--text-secondary)"/>' +
                '<text transform="translate(13,' + (pad.t + ph / 2) + ') rotate(-90)" text-anchor="middle" font-size="11" ' +
                'fill="var(--text-secondary)">Body mass (kg)</text></svg>';
            const host = U.el('div', 'inv-chart');
            host.innerHTML = svg;
            return host;
        }

        // ---------- helpers ----------
        function field(labelText, kind, options, value, onchange) {
            const w = U.el('div', 'inv-field');
            const l = document.createElement('label');
            l.textContent = labelText;
            const id = 'inv-' + Math.random().toString(36).slice(2, 7);
            l.htmlFor = id;
            w.appendChild(l);
            let el;
            if (kind === 'select') {
                el = document.createElement('select');
                options.forEach(([v, t]) => {
                    const o = document.createElement('option');
                    o.value = v; o.textContent = t; el.appendChild(o);
                });
                el.value = value;
                el.addEventListener('change', () => onchange(el.value));
            } else {
                el = document.createElement('input');
                el.type = 'number'; el.value = value;
                el.addEventListener('change', () => onchange(el.value));
            }
            el.id = id;
            w.appendChild(el);
            return w;
        }
        function clamp(v, a, b) { return isNaN(v) ? a : Math.min(b, Math.max(a, v)); }
        function msgInto(host, text, cls) {
            const m = U.el('p', 'inv-msg ' + cls);
            m.textContent = text;
            host.appendChild(m);
        }

        render();

        // ---------------- verification hooks ----------------
        root._simState = () => {
            const B = bmr(sex, mass, height, age);
            return {
                tab,
                plan: {
                    roles: roles.slice(), marked: planMarked, trials,
                    rolesCorrect: VARIABLES.filter((v, i) => roles[i] === v.role).length,
                    rolesTotal: VARIABLES.length,
                    controlPick, controlOk: controlPick !== null && CONTROLS[controlPick].ok,
                    run: ran && {
                        n: ran.n, meanRest: ran.R.m, meanExercise: ran.E.m,
                        seRest: ran.R.se, seExercise: ran.E.se, overlap: ran.overlap
                    },
                    overlapAnswer
                },
                energy: {
                    predicted: ebPredict, sex, mass, height, age, factor, met, mins, intake,
                    bmr: B,
                    exerciseKcal: exerciseKcal(met, mass, mins),
                    tdee: tdee(sex, mass, height, age, factor, met, mins),
                    dailyBalance: intake - tdee(sex, mass, height, age, factor, met, mins),
                    steadyMass: steadyMass(sex, height, age, factor, met, mins, intake)
                }
            };
        };
        root._simSolve = () => {
            if (tab === 'plan') {
                roles = VARIABLES.map(v => v.role);
                controlPick = CONTROLS.findIndex(c => c.ok);
                planMarked = true;
                if (!ran) ran = generate(trials);
                overlapAnswer = ran.overlap ? 'overlap' : 'clear';
            } else {
                ebPredict = true;
            }
            render();
        };
    };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
})();
