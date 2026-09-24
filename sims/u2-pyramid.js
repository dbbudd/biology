/* =============================================================
   INTERACTIVE — Draw the pyramid to scale
   -------------------------------------------------------------
   Registers window.SIMS['u2-pyramid'].  Supports HS-LS2-4 and
   learning target L6 ("justify the amount available at each
   trophic level").

   Three things the deck asks and never answers:
     slide 214  "How did you draw yours? Like this? Or like this?"
                — equal bands against a to-scale pyramid.
     slide 183  "How is this pyramid inaccurate?" — the pyramid on
                that slide is WRONG ON PURPOSE and is being used as a
                critique target. This sim keeps it wrong on purpose.
     Anchor Guide 3 q27b  "What evidence from the New Hampshire
                forest indicates that the 10% rule is not accurate in
                some cases?"

   Every number below is computed. The pyramid the reader draws is
   scaled from their own figures, and the New Hampshire percentages
   are divided out of the real data (1000 and 200 g/m2/year, with 30
   the only possible value for the secondary consumers).
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2py-style';

    const START = 1000000;      // kcal per square metre per year, captured by producers
    const RULE = 0.10;
    const NAMES = ['Producers', 'Primary consumers', 'Secondary consumers', 'Tertiary consumers'];

    function tenPercentChain() {
        const out = [START];
        for (let i = 1; i < NAMES.length; i++) out.push(out[i - 1] * RULE);
        return out;
    }

    // Real data, Anchor Guide 3 q26 (a forest in New Hampshire), g/m2/year
    const NH = { producers: 1000, primaryPlusDecomposers: 200, options: [30, 200, 1000] };
    const nhSecondary = () => NH.options.filter(v => v < NH.primaryPlusDecomposers)[0];

    const FAULTS = [
        { t: 'The bands are all the same size, so the drawing hides the very thing a pyramid ' +
             'is for — the loss between levels.', ok: true },
        { t: 'It shows only 0.1% of the producers’ energy reaching the top predator, which is ' +
             'about what the 10% rule predicts.', ok: false,
          why: 'That part is right, and it is why the numbers on the pyramid are not the problem. ' +
               'The problem is that the picture contradicts its own numbers.' },
        { t: 'There are no decomposers anywhere on it, although most of the energy at every ' +
             'level ends up going to them.', ok: true },
        { t: 'The arrows suggest energy is recycled back to the producers, when energy flows ' +
             'one way and leaves as heat.', ok: true },
        { t: 'It puts the producers at the bottom, when they should be at the top.', ok: false,
          why: 'No — producers belong at the bottom. They are the widest level because they hold ' +
               'the most energy, and everything above depends on them.' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2py{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2py{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2py{--ok:#4a6b3d;--bad:#a04040}',
            '.u2py-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2py-tabs{display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.6rem}',
            '.u2py-tab{font:inherit;font-size:0.76rem;padding:0.3rem 0.6rem;border-radius:999px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2py-tab[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2py-tab[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2py-rows{display:grid;grid-template-columns:auto auto 1fr;gap:0.3rem 0.6rem;',
            '  align-items:center;font-size:0.82rem;margin-bottom:0.5rem}',
            '.u2py-rows input{font:inherit;font-size:0.8rem;width:7rem;padding:0.18rem 0.35rem;',
            '  border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);',
            '  text-align:right}',
            '.u2py-rows input.ok{border-color:var(--ok)} .u2py-rows input.bad{border-color:var(--bad)}',
            '.u2py-svg{width:100%;max-width:560px;display:block;margin:0.3rem auto}',
            '.u2py-band{stroke:var(--text-secondary);stroke-width:1}',
            '.u2py-lab{font-size:10.5px;fill:var(--text)}',
            '.u2py-num{font-size:10px;fill:var(--text-secondary);font-variant-numeric:tabular-nums}',
            '.u2py-opt{display:block;width:100%;font:inherit;font-size:0.8rem;text-align:left;',
            '  line-height:1.45;padding:0.42rem 0.6rem;margin-bottom:0.3rem;border-radius:8px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2py-opt:hover{border-color:var(--light-teal)}',
            '.u2py-opt.good{border-color:var(--ok);background:rgba(46,125,50,0.10)}',
            '.u2py-opt.bad{border-color:var(--bad);background:rgba(170,39,47,0.10)}',
            '.u2py-msg{margin:0.8rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2py-msg.ok{color:var(--ok)} .u2py-msg.bad{color:var(--bad)}',
            '.u2py-warn{font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;',
            '  font-weight:700;color:var(--red);margin:0.4rem 0 0.2rem}',
            '.u2py-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2py-rev{background:rgba(127,201,138,0.12)}',
            '.u2py-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2py-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}',
            '.u2py-rev table{width:100%;border-collapse:collapse;font-size:0.78rem;margin:0.3rem 0 0.6rem}',
            '.u2py-rev th,.u2py-rev td{border:1px solid var(--border);padding:0.22rem 0.4rem}',
            '.u2py-rev th{color:var(--text-secondary);text-align:left}'
        ].join('\n');
        document.head.appendChild(s);
    }

    const BANDCOL = ['hsl(120 40% 70%)', 'hsl(45 65% 72%)', 'hsl(15 60% 74%)', 'hsl(280 30% 76%)'];

    function drawPyramid(host, values, mode, labelFmt) {
        const ns = 'http://www.w3.org/2000/svg';
        host.innerHTML = '';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 560 260');
        svg.setAttribute('class', 'u2py-svg');
        svg.setAttribute('role', 'img');
        const max = Math.max.apply(null, values.map(v => v || 0)) || 1;
        const H = 46, top = 16, cx = 250, wMax = 400;
        let g = '';
        values.forEach((v, i) => {
            const idx = values.length - 1 - i;              // draw from the top down
            const val = values[idx] || 0;
            const w = mode === 'equal' ? wMax * (1 - idx * 0.18) : Math.max(2, (val / max) * wMax);
            const y = top + i * H;
            g += '<rect class="u2py-band" x="' + (cx - w / 2) + '" y="' + y + '" width="' + w +
                 '" height="' + (H - 6) + '" fill="' + BANDCOL[idx] + '"/>';
            g += '<text class="u2py-lab" x="' + (cx + wMax / 2 + 10) + '" y="' + (y + 17) + '">' +
                 NAMES[idx] + '</text>';
            g += '<text class="u2py-num" x="' + (cx + wMax / 2 + 10) + '" y="' + (y + 30) + '">' +
                 labelFmt(val) + '</text>';
        });
        svg.innerHTML = g;
        svg.setAttribute('aria-label', 'A trophic pyramid of four bands, ' +
            (mode === 'equal' ? 'all drawn about the same size regardless of their values'
                              : 'each drawn with a width proportional to its value') + '.');
        host.appendChild(svg);
    }

    window.SIMS['u2-pyramid'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u2py');
        const how = U.el('p', 'u2py-how');
        const tabs = U.el('div', 'u2py-tabs');
        const body = U.el('div');
        const msg = U.el('p', 'u2py-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, tabs, body, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const checkBtn = U.button(buttons, 'Check my pyramid', 'primary');
        const resetBtn = U.button(buttons, 'Clear');
        wrap.appendChild(buttons);

        let tab = 'draw';
        let entered = [START, null, null, null];
        let mode = 'scale';
        let faultPicks = {};
        let nhPick = null;

        const fmtK = v => v >= 1000 ? Math.round(v).toLocaleString() + ' kcal' : v.toFixed(0) + ' kcal';
        const fmtG = v => v + ' g/m²/yr';

        function render() {
            tabs.innerHTML = '';
            [['draw', 'Draw it to scale'], ['critique', 'How is this pyramid inaccurate?'],
             ['real', 'Does the 10% rule hold?']].forEach(([k, lab]) => {
                const b = U.el('button', 'u2py-tab');
                b.type = 'button'; b.textContent = lab;
                b.setAttribute('aria-pressed', tab === k ? 'true' : 'false');
                b.addEventListener('click', () => {
                    tab = k; msg.textContent = ''; msg.className = 'u2py-msg';
                    revealHost.innerHTML = ''; render();
                });
                tabs.appendChild(b);
            });

            body.innerHTML = '';
            checkBtn.hidden = tab !== 'draw';

            if (tab === 'draw') {
                how.innerHTML = 'Producers in this ecosystem capture <strong>' +
                    START.toLocaleString() + ' kcal</strong> per square metre per year. Using the ' +
                    'ten per cent estimate, work out what reaches each level above, then look at ' +
                    'what your own numbers make the pyramid look like.';
                const rows = U.el('div', 'u2py-rows');
                NAMES.forEach((n, i) => {
                    const lab = U.el('div'); lab.textContent = n;
                    const cell = U.el('div');
                    if (i === 0) {
                        const fixed = U.el('div');
                        fixed.innerHTML = '<strong>' + START.toLocaleString() + '</strong> kcal';
                        cell.appendChild(fixed);
                    } else {
                        const inp = document.createElement('input');
                        inp.type = 'number'; inp.min = '0'; inp.step = 'any';
                        inp.value = entered[i] === null ? '' : entered[i];
                        inp.setAttribute('aria-label', n + ' in kcal per square metre per year');
                        inp.addEventListener('input', () => {
                            entered[i] = inp.value === '' ? null : +inp.value;
                            inp.className = ''; msg.textContent = ''; msg.className = 'u2py-msg';
                            revealHost.innerHTML = '';
                            drawPyramid(pic, entered.map(v => v || 0), mode, fmtK);
                        });
                        cell.appendChild(inp);
                    }
                    const hint = U.el('div');
                    hint.style.fontSize = '0.74rem'; hint.style.color = 'var(--text-secondary)';
                    hint.textContent = i === 0 ? 'given' : '10% of the level below';
                    rows.appendChild(lab); rows.appendChild(cell); rows.appendChild(hint);
                });
                body.appendChild(rows);

                const toggle = U.el('div', 'u2py-tabs');
                [['scale', 'Draw it to scale'], ['equal', 'Draw it with equal bands']]
                    .forEach(([k, lab]) => {
                        const b = U.el('button', 'u2py-tab');
                        b.type = 'button'; b.textContent = lab;
                        b.setAttribute('aria-pressed', mode === k ? 'true' : 'false');
                        b.addEventListener('click', () => {
                            mode = k; render();
                        });
                        toggle.appendChild(b);
                    });
                body.appendChild(toggle);
                const pic = U.el('div');
                body.appendChild(pic);
                drawPyramid(pic, entered.map(v => v || 0), mode, fmtK);
                const note = U.el('p', 'u2py-how');
                note.innerHTML = mode === 'equal'
                    ? 'This is the way almost everyone draws it first, and it is the way most ' +
                      'textbook pyramids are printed. Compare it with the to-scale version — the ' +
                      'top band should be invisible.'
                    : 'To scale, the top band all but vanishes. That is not a drawing problem. It ' +
                      'is the answer to "why are there so few wolves".';
                body.appendChild(note);
            }

            if (tab === 'critique') {
                how.innerHTML = 'Here is a pyramid of the kind that gets printed on worksheets. ' +
                    'It is <strong>deliberately wrong</strong> — your teacher’s slide asks exactly ' +
                    'this question. Find every fault you can. More than one option is right.';
                const warn = U.el('p', 'u2py-warn');
                warn.textContent = 'This diagram is drawn incorrectly on purpose';
                body.appendChild(warn);
                const pic = U.el('div');
                body.appendChild(pic);
                drawPyramid(pic, tenPercentChain(), 'equal', v => Math.round(v).toLocaleString() +
                    ' kcal (' + (100 * v / START).toFixed(1) + '%)');
                const arrows = U.el('p', 'u2py-how');
                arrows.innerHTML = 'The version on the slide also draws arrows looping from the ' +
                    'top band back down to the producers, and shows no decomposers at all.';
                body.appendChild(arrows);
                FAULTS.forEach((f, i) => {
                    const b = U.el('button', 'u2py-opt');
                    b.type = 'button'; b.textContent = f.t;
                    if (faultPicks[i]) b.classList.add(f.ok ? 'good' : 'bad');
                    b.addEventListener('click', () => {
                        faultPicks[i] = true;
                        msg.textContent = f.ok
                            ? 'Yes — that is a real fault.'
                            : f.why;
                        msg.className = 'u2py-msg ' + (f.ok ? 'ok' : 'bad');
                        const found = FAULTS.filter((x, j) => x.ok && faultPicks[j]).length;
                        if (found === FAULTS.filter(x => x.ok).length) showCritiqueReveal();
                        render();
                    });
                    body.appendChild(b);
                });
            }

            if (tab === 'real') {
                how.innerHTML = 'Researchers measured the net rate of biomass production at each ' +
                    'level in a forest in New Hampshire. Producers came out at <strong>' +
                    NH.producers + ' g/m²/yr</strong>, and primary consumers plus decomposers ' +
                    'together at <strong>' + NH.primaryPlusDecomposers + '</strong>. Which of ' +
                    'these three figures could possibly be right for the secondary consumers?';
                NH.options.forEach(v => {
                    const b = U.el('button', 'u2py-opt');
                    b.type = 'button'; b.textContent = v + ' g/m²/yr';
                    if (nhPick !== null) {
                        if (v === nhSecondary()) b.classList.add('good');
                        else if (v === nhPick) b.classList.add('bad');
                    }
                    b.addEventListener('click', () => {
                        nhPick = v;
                        if (v === nhSecondary()) {
                            msg.textContent = 'Right — and the reasoning is simply that a level ' +
                                'cannot hold more than the level feeding it.';
                            msg.className = 'u2py-msg ok';
                            showRealReveal();
                        } else {
                            msg.textContent = v + ' g/m²/yr is not less than the ' +
                                NH.primaryPlusDecomposers + ' available below it. Secondary ' +
                                'consumers eat primary consumers and decomposers, and they cannot ' +
                                'accumulate more biomass than the whole of what they eat.';
                            msg.className = 'u2py-msg bad';
                            revealHost.innerHTML = '';
                        }
                        render();
                    });
                    body.appendChild(b);
                });
            }
        }

        function showCritiqueReveal() {
            revealHost.innerHTML = '';
            const chain = tenPercentChain();
            const d = U.el('div', 'u2py-rev');
            d.innerHTML = '<h5>Three faults, and why they matter</h5>' +
                '<p><strong>Equal bands.</strong> The numbers on the pyramid say ' +
                chain.map(v => Math.round(v).toLocaleString()).join(' → ') + ' kcal — a fall of ' +
                Math.round(chain[0] / chain[3]).toLocaleString() + '-fold from bottom to top. ' +
                'Drawn as equal bands, the picture says the levels are comparable. The picture ' +
                'and the numbers contradict each other, and students remember the picture.</p>' +
                '<p><strong>No decomposers.</strong> At every level, most of the biomass is not ' +
                'eaten by the level above — it dies and goes to decomposers. Leaving them out ' +
                'makes it look as though the missing 90% simply vanished.</p>' +
                '<p><strong>Arrows looping back.</strong> Matter cycles; energy does not. Carbon ' +
                'atoms go round and round, but the energy leaves as heat at every step and is ' +
                'gone from the ecosystem for good. A pyramid with a return arrow on the energy is ' +
                'claiming a perpetual motion machine.</p>' +
                '<p>Two things it gets right, which is why it is worth arguing with rather than ' +
                'binning: producers do belong at the bottom, and 0.1% reaching the fourth level ' +
                'is about what the ten per cent estimate predicts.</p>';
            revealHost.appendChild(d);
        }

        function showRealReveal() {
            const sec = nhSecondary();
            const e1 = 100 * NH.primaryPlusDecomposers / NH.producers;
            const e2 = 100 * sec / NH.primaryPlusDecomposers;
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2py-rev');
            d.innerHTML = '<h5>The rule is an estimate, and the forest says so</h5>' +
                '<table><thead><tr><th>Level</th><th>Net biomass production</th>' +
                '<th>Fraction of the level below</th></tr></thead><tbody>' +
                '<tr><td>Secondary consumers</td><td>' + sec + ' g/m²/yr</td><td>' +
                e2.toFixed(0) + '%</td></tr>' +
                '<tr><td>Primary consumers + decomposers</td><td>' + NH.primaryPlusDecomposers +
                ' g/m²/yr</td><td>' + e1.toFixed(0) + '%</td></tr>' +
                '<tr><td>Producers</td><td>' + NH.producers + ' g/m²/yr</td><td>—</td></tr>' +
                '</tbody></table>' +
                '<p>Neither step is ten per cent. Producers to the level above is <strong>' +
                e1.toFixed(0) + '%</strong>, and the step after that is <strong>' + e2.toFixed(0) +
                '%</strong>. This is the evidence Anchor Guide 3 is asking for in question 27b: ' +
                'the ten per cent rule is a rough average across many ecosystems, not a law, and ' +
                'in a real forest it can be off by a factor of two.</p>' +
                '<p>What survives is the <em>shape</em> of the argument, and it is the part worth ' +
                'keeping. Whatever the exact percentage, it is far less than 100, it applies again ' +
                'at every step, and so the numbers collapse fast. That is why food chains are ' +
                'rarely longer than four or five links, why animals that eat secondary consumers ' +
                'are rare, and why feeding grain to cattle and then eating the cattle needs vastly ' +
                'more land than eating the grain.</p>' +
                '<p>It also explains a puzzle from the food web. The ten per cent rule would ' +
                'predict ten elk per wolf; Yellowstone has had roughly a hundred. The rule is ' +
                'about <em>energy</em>, not head-count — and wolves are not the only thing eating ' +
                'elk, nor do they get every scrap of the ones they kill.</p>';
            revealHost.appendChild(d);
        }

        checkBtn.addEventListener('click', () => {
            const want = tenPercentChain();
            const inputs = body.querySelectorAll('input');
            let right = 0;
            for (let i = 1; i < NAMES.length; i++) {
                const inp = inputs[i - 1];
                const ok = entered[i] !== null && Math.abs(entered[i] - want[i]) < want[i] * 0.001;
                inp.className = entered[i] === null ? '' : (ok ? 'ok' : 'bad');
                if (ok) right++;
            }
            if (right === NAMES.length - 1) {
                msg.textContent = 'All three correct.';
                msg.className = 'u2py-msg ok';
                showDrawReveal();
            } else {
                msg.textContent = right + ' of 3. Take ten per cent of the level immediately ' +
                    'below each time — not ten per cent of the producers every time.';
                msg.className = 'u2py-msg bad';
                revealHost.innerHTML = '';
            }
        });

        function showDrawReveal() {
            const chain = tenPercentChain();
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2py-rev');
            d.innerHTML = '<h5>Where the other 90% goes</h5>' +
                '<p>' + chain.map(v => Math.round(v).toLocaleString() + ' kcal').join(' → ') +
                '. The fourth level gets <strong>' + (100 * chain[3] / chain[0]).toFixed(1) +
                '%</strong> of what the producers captured — one kcal in a thousand.</p>' +
                '<p>The 90% that does not make it up is not destroyed. Three things happen to it, ' +
                'and none of them is mysterious:</p>' +
                '<p><strong>Most of it is respired.</strong> An elk spends most of what it eats ' +
                'staying alive — moving, keeping warm, pumping blood. All of that energy ends up ' +
                'as heat, and heat leaves the ecosystem.</p>' +
                '<p><strong>Some is never digested.</strong> It goes out as faeces, to the ' +
                'decomposers.</p>' +
                '<p><strong>Some is simply not eaten.</strong> Plants die and rot; predators do ' +
                'not catch every animal, and do not eat every part of the ones they do.</p>' +
                '<p>Only what is left — the <em>net</em> biomass an animal actually accumulates — ' +
                'is available to the level above. Now switch to the next tab and see whether real ' +
                'forest data actually obeys the ten per cent rule.</p>';
            revealHost.appendChild(d);
        }

        resetBtn.addEventListener('click', () => {
            entered = [START, null, null, null]; faultPicks = {}; nhPick = null; mode = 'scale';
            msg.textContent = ''; msg.className = 'u2py-msg'; revealHost.innerHTML = ''; render();
        });

        render();

        root._simState = () => ({
            tab, mode, entered: entered.slice(),
            expected: tenPercentChain(),
            faultsFound: FAULTS.filter((f, i) => f.ok && faultPicks[i]).length,
            faultsTotal: FAULTS.filter(f => f.ok).length,
            nhPick, nhAnswer: nhSecondary(),
            nhEfficiency: {
                producersToPrimary: +(100 * NH.primaryPlusDecomposers / NH.producers).toFixed(1),
                primaryToSecondary: +(100 * nhSecondary() / NH.primaryPlusDecomposers).toFixed(1)
            }
        });
        root._simSolve = () => {
            entered = tenPercentChain();
            FAULTS.forEach((f, i) => { if (f.ok) faultPicks[i] = true; });
            nhPick = nhSecondary();
            render();
            if (tab === 'draw') showDrawReveal();
            else if (tab === 'critique') showCritiqueReveal();
            else showRealReveal();
        };
    };
})();
