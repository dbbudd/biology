/* =============================================================
   INTERACTIVE — Punnett square workbench
   -------------------------------------------------------------
   Registers window.SIMS['punnett'].  Supports HS-LS3-1, HS-LS3-3.

   Replaces three worksheet screenshots. The reader sets both parents,
   PREDICTS the phenotype ratio before seeing any answer, then fills
   the grid themselves. Predicting first is deliberate: a square that
   fills itself teaches nothing, and the standard asks the reader to
   "apply concepts of statistics and probability", not to admire a
   completed table.

   Traits are the ones from anchor guide 5.2 so the reader can check
   their paper against this.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-pun-style';

    const TRAITS = [
        { key:'pea',    letter:'R', dom:'round',  rec:'wrinkled', noun:'pea',    org:'Pea plant' },
        { key:'horse',  letter:'B', dom:'black',  rec:'chestnut', noun:'horse',  org:'Horse' },
        { key:'flower', letter:'P', dom:'purple', rec:'white',    noun:'flower', org:'Pea flower' },
        { key:'unicorn',letter:'H', dom:'purple horn', rec:'rainbow horn', noun:'unicorn', org:'Unicorn' }
    ];
    const GTYPES = t => [t.letter + t.letter, t.letter + t.letter.toLowerCase(),
                         t.letter.toLowerCase() + t.letter.toLowerCase()];
    const gametesOf = g => [g[0], g[1]];
    const sortG = (t, g) => g.split('').sort((a, b) =>
        (a === t.letter ? 0 : 1) - (b === t.letter ? 0 : 1)).join('');
    const phenoOf = (t, g) => g.indexOf(t.letter) > -1 ? t.dom : t.rec;
    const label = (t, g) => g === t.letter + t.letter ? 'homozygous dominant'
        : g === t.letter.toLowerCase() + t.letter.toLowerCase() ? 'homozygous recessive'
        : 'heterozygous';

    function ratios(t, p1, p2) {
        const counts = {}, ph = {};
        gametesOf(p1).forEach(a => gametesOf(p2).forEach(b => {
            const g = sortG(t, a + b);
            counts[g] = (counts[g] || 0) + 1;
            const p = phenoOf(t, g); ph[p] = (ph[p] || 0) + 1;
        }));
        return { counts, ph };
    }
    const ratioText = obj => Object.keys(obj).map(k => obj[k] + ' ' + k).join(' : ');

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.pu { padding:1rem 1.25rem 0.25rem; }',
            '.pu { --pu-ok:#2e7d32; --pu-bad:#aa272f; }',
            '[data-theme="dark"] .pu { --pu-ok:#7fc98a; --pu-bad:#e08a90; }',
            '[data-theme="sepia"] .pu { --pu-ok:#4a6b3d; --pu-bad:#a04040; }',
            '.pu-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; }',
            '.pu-setup { display:flex; gap:0.8rem; flex-wrap:wrap; align-items:flex-end;',
            '   margin-bottom:1rem; }',
            '.pu-field { display:flex; flex-direction:column; gap:0.2rem; }',
            '.pu-field label { font-size:0.64rem; font-weight:700; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); }',
            '.pu-field select { font:inherit; font-size:0.82rem; padding:0.32rem 0.5rem;',
            '   border:1px solid var(--border); border-radius:7px; background:var(--bg);',
            '   color:var(--text); }',
            '.pu-cross { font-size:0.84rem; margin:0 0 0.9rem; line-height:1.5; }',
            '.pu-cross b { font-weight:700; }',

            '.pu-predict { border:1px solid var(--border); border-radius:10px; padding:0.75rem 0.85rem;',
            '   margin-bottom:1rem; }',
            '.pu-predict p { font-size:0.84rem; margin:0 0 0.5rem; font-weight:600; }',
            '.pu-opts { display:flex; gap:0.4rem; flex-wrap:wrap; }',
            '.pu-opt { font:inherit; font-size:0.78rem; cursor:pointer; padding:0.4rem 0.7rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; }',
            '.pu-opt:hover { border-color:var(--light-teal); }',
            '.pu-opt:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.pu-opt.right { border-color:var(--pu-ok); color:var(--pu-ok); font-weight:700; }',
            '.pu-opt.wrong { border-color:var(--pu-bad); color:var(--pu-bad); opacity:0.65; }',

            '.pu-gridwrap { display:inline-block; }',
            '.pu-grid { border-collapse:collapse; }',
            '.pu-grid th, .pu-grid td { border:1px solid var(--border); padding:0; }',
            '.pu-grid th { background:var(--bg-nav-active); color:var(--text); font-weight:800;',
            '   width:74px; height:44px; font-size:1rem; letter-spacing:0.04em; }',
            '.pu-grid th.corner { background:none; border:0; }',
            '.pu-cell { width:74px; height:56px; font:inherit; font-size:1rem; font-weight:800;',
            '   background:none; border:0; cursor:pointer; color:var(--text-secondary);',
            '   letter-spacing:0.04em; touch-action:manipulation; padding:0; }',
            '.pu-cell:hover { background:var(--bg-nav-hover); }',
            '.pu-cell:focus-visible { outline:2px solid var(--light-teal); outline-offset:-2px; }',
            '.pu-cell.right { color:var(--pu-ok); background:rgba(46,125,50,0.10); }',
            '.pu-cell.wrong { color:var(--pu-bad); background:rgba(170,39,47,0.10); }',
            '.pu-cell small { display:block; font-size:0.6rem; font-weight:600; letter-spacing:0;',
            '   margin-top:0.1rem; opacity:0.85; }',
            '.pu-axis { font-size:0.66rem; color:var(--text-secondary); margin:0.4rem 0 0; }',

            '.pu-pick { display:flex; gap:0.4rem; flex-wrap:wrap; margin:0.9rem 0 0; align-items:center; }',
            '.pu-tile { font:inherit; cursor:pointer; padding:0.4rem 0.8rem; border-radius:8px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text);',
            '   font-weight:800; font-size:0.95rem; letter-spacing:0.04em; touch-action:manipulation; }',
            '.pu-tile:hover { border-color:var(--light-teal); }',
            '.pu-tile[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); }',
            '.pu-msg { margin:0.85rem 0 0; font-size:0.82rem; line-height:1.5; min-height:2.4em; }',
            '.pu-msg.ok { color:var(--pu-ok); } .pu-msg.bad { color:var(--pu-bad); }',
            '.pu-result { margin-top:1rem; border:1px solid var(--pu-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .pu-result { background:rgba(127,201,138,0.12); }',
            '.pu-result h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.pu-result p { margin:0 0 0.55rem; font-size:0.84rem; line-height:1.55; }',
            '.pu-result dl { margin:0.4rem 0 0; font-size:0.84rem; }',
            '.pu-result dt { font-weight:700; margin-top:0.4rem; }',
            '.pu-result dd { margin:0.1rem 0 0 0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['punnett'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'pu');
        const how = U.el('p', 'pu-how');
        how.textContent = 'Choose a trait and the two parents. Predict the phenotype ratio before ' +
            'you fill anything in, then complete the square by clicking each box.';
        const setup = U.el('div', 'pu-setup');
        const cross = U.el('p', 'pu-cross');
        const predictHost = U.el('div');
        const gridHost = U.el('div');
        const pick = U.el('div', 'pu-pick');
        const msg = U.el('p', 'pu-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const resultHost = U.el('div');
        [how, setup, cross, predictHost, gridHost, pick, msg, resultHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        let trait = TRAITS[0];
        let p1 = 'Rr', p2 = 'rr';
        let cells = [null, null, null, null];
        let selected = null;
        let predicted = null;
        let predictTried = [];

        function field(labelText, opts, value, onChange) {
            const f = U.el('div', 'pu-field');
            const l = document.createElement('label'); l.textContent = labelText;
            const sel = document.createElement('select');
            opts.forEach(o => {
                const op = document.createElement('option');
                op.value = o.v; op.textContent = o.t;
                if (o.v === value) op.selected = true;
                sel.appendChild(op);
            });
            sel.addEventListener('change', () => onChange(sel.value));
            f.appendChild(l); f.appendChild(sel);
            return f;
        }

        function resetCross() {
            cells = [null, null, null, null];
            selected = null; predicted = null; predictTried = [];
            msg.textContent = ''; msg.className = 'pu-msg';
            resultHost.innerHTML = '';
        }

        function expectedCell(i) {
            const a = gametesOf(p1)[i % 2], b = gametesOf(p2)[Math.floor(i / 2)];
            return sortG(trait, a + b);
        }
        const filled = () => cells.every((c, i) => c === expectedCell(i));

        function phenotypeOptions() {
            const set = ['3 : 1', '1 : 1', '4 : 0', '0 : 4', '2 : 2', '1 : 2 : 1'];
            return set;
        }
        function actualPhenoRatio() {
            const r = ratios(trait, p1, p2).ph;
            const d = r[trait.dom] || 0, x = r[trait.rec] || 0;
            return d + ' : ' + x;
        }
        // A reader who answers "1 : 1" for a 2 : 2 outcome is right, and a
        // simulation that marks them wrong is teaching the wrong lesson.
        // Compare ratios in lowest terms, not as typed.
        function simplify(txt) {
            const parts = txt.split(':').map(n => parseInt(n.trim(), 10));
            if (parts.some(isNaN)) return txt;
            const gcd = (a, b) => b ? gcd(b, a % b) : a;
            const g = parts.reduce((a, b) => gcd(a, b)) || 1;
            return parts.map(n => n / g).join(':');
        }
        const ratioMatches = guess => simplify(guess) === simplify(actualPhenoRatio());

        function render() {
            // ---- setup ----
            setup.innerHTML = '';
            setup.appendChild(field('Trait', TRAITS.map(t => ({ v: t.key, t: t.org + ' — ' + t.dom + ' / ' + t.rec })),
                trait.key, v => {
                    trait = TRAITS.filter(t => t.key === v)[0];
                    p1 = GTYPES(trait)[1]; p2 = GTYPES(trait)[2];
                    resetCross(); render();
                }));
            setup.appendChild(field('Parent 1', GTYPES(trait).map(g => ({ v: g, t: g + ' — ' + phenoOf(trait, g) })),
                p1, v => { p1 = v; resetCross(); render(); }));
            setup.appendChild(field('Parent 2', GTYPES(trait).map(g => ({ v: g, t: g + ' — ' + phenoOf(trait, g) })),
                p2, v => { p2 = v; resetCross(); render(); }));

            cross.innerHTML = 'Crossing <b>' + p1 + '</b> (' + label(trait, p1) + ', ' +
                phenoOf(trait, p1) + ') with <b>' + p2 + '</b> (' + label(trait, p2) + ', ' +
                phenoOf(trait, p2) + '). Each parent passes on <em>one</em> allele, chosen at random ' +
                'when gametes form.';

            // ---- predict ----
            predictHost.innerHTML = '';
            if (!(predicted && ratioMatches(predicted))) {
                const box = U.el('div', 'pu-predict');
                const q = document.createElement('p');
                q.textContent = 'Before you fill anything in: what ratio of ' + trait.dom +
                    ' to ' + trait.rec + ' do you expect among the offspring?';
                box.appendChild(q);
                const opts = U.el('div', 'pu-opts');
                phenotypeOptions().forEach(o => {
                    const b = U.el('button', 'pu-opt' + (predictTried.indexOf(o) > -1 ? ' wrong' : ''));
                    b.type = 'button'; b.textContent = o;
                    b.addEventListener('click', () => {
                        if (ratioMatches(o)) {
                            predicted = o;
                            msg.textContent = 'Good prediction. Now build the square and show that it is right.';
                            msg.className = 'pu-msg ok';
                        } else {
                            predictTried.push(o);
                            msg.textContent = 'Not this one. Work out which alleles each parent can pass on, ' +
                                'then count how many of the four combinations show the ' + trait.rec + ' phenotype.';
                            msg.className = 'pu-msg bad';
                        }
                        render();
                    });
                    opts.appendChild(b);
                });
                box.appendChild(opts);
                predictHost.appendChild(box);
            }

            // ---- grid ----
            gridHost.innerHTML = '';
            const gw = U.el('div', 'pu-gridwrap');
            const tbl = document.createElement('table');
            tbl.className = 'pu-grid';
            const g1 = gametesOf(p1), g2 = gametesOf(p2);
            let html = '<tr><th class="corner"></th><th>' + g1[0] + '</th><th>' + g1[1] + '</th></tr>';
            for (let r = 0; r < 2; r++) {
                html += '<tr><th>' + g2[r] + '</th>';
                for (let c = 0; c < 2; c++) {
                    const i = r * 2 + c;
                    const v = cells[i];
                    const ok = v === expectedCell(i);
                    html += '<td><button type="button" class="pu-cell' +
                        (v ? (ok ? ' right' : ' wrong') : '') + '" data-i="' + i + '">' +
                        (v ? v + '<small>' + phenoOf(trait, v) + '</small>' : '?') + '</button></td>';
                }
                html += '</tr>';
            }
            tbl.innerHTML = html;
            tbl.querySelectorAll('.pu-cell').forEach(b => {
                b.addEventListener('click', () => {
                    const i = +b.dataset.i;
                    if (cells[i]) { cells[i] = null; msg.textContent = ''; msg.className = 'pu-msg'; render(); return; }
                    if (!selected) {
                        msg.textContent = 'Pick a genotype from the row below first, then click a box.';
                        msg.className = 'pu-msg'; render(); return;
                    }
                    cells[i] = selected;
                    const want = expectedCell(i);
                    if (selected === want) {
                        msg.textContent = 'Yes — ' + gametesOf(p1)[i % 2] + ' from one parent and ' +
                            gametesOf(p2)[Math.floor(i / 2)] + ' from the other gives ' + want + ', which is ' +
                            phenoOf(trait, want) + '.';
                        msg.className = 'pu-msg ok';
                    } else {
                        msg.textContent = 'Check the labels on that row and column. This box takes ' +
                            gametesOf(p1)[i % 2] + ' from the top and ' + gametesOf(p2)[Math.floor(i / 2)] +
                            ' from the side — nothing else goes in it.';
                        msg.className = 'pu-msg bad';
                    }
                    selected = null;
                    render();
                });
            });
            gw.appendChild(tbl);
            const ax = U.el('p', 'pu-axis');
            ax.textContent = 'Across the top: gametes from parent 1. Down the side: gametes from parent 2.';
            gw.appendChild(ax);
            gridHost.appendChild(gw);

            // ---- allele picker ----
            pick.innerHTML = '';
            if (!filled()) {
                GTYPES(trait).forEach(g => {
                    const b = U.el('button', 'pu-tile');
                    b.type = 'button'; b.textContent = g;
                    b.setAttribute('aria-pressed', selected === g ? 'true' : 'false');
                    b.addEventListener('click', () => { selected = selected === g ? null : g; render(); });
                    pick.appendChild(b);
                });
            }

            if (filled()) showResult(); else resultHost.innerHTML = '';
        }

        function showResult() {
            if (resultHost.firstChild) return;
            const r = ratios(trait, p1, p2);
            const gt = ratioText(r.counts);
            const pt = ratioText(r.ph);
            const recCount = r.ph[trait.rec] || 0;
            const d = U.el('div', 'pu-result');
            d.innerHTML =
                '<h5>Square complete. Now read it.</h5>' +
                '<dl><dt>Genotype ratio</dt><dd>' + gt + '</dd>' +
                '<dt>Phenotype ratio</dt><dd>' + pt + '</dd>' +
                '<dt>Probability of a ' + trait.rec + ' offspring</dt><dd>' + recCount +
                ' in 4 &nbsp;=&nbsp; ' + (recCount / 4 * 100) + '%</dd></dl>' +
                '<p style="margin-top:0.7rem">The four boxes are not four children. They are the four ' +
                '<em>equally likely combinations</em> for <strong>each</strong> offspring, ' +
                'independently. A cross with a 3 : 1 ratio can still produce four ' + trait.rec +
                ' offspring in a row — unlikely, but not impossible, in the same way four heads in a ' +
                'row is unlikely but not impossible.</p>' +
                '<p>This is what the standard means by applying probability: the square gives you the ' +
                'chance, not the outcome.</p>';
            resultHost.appendChild(d);
            msg.textContent = 'All four boxes correct.';
            msg.className = 'pu-msg ok';
        }

        const buttons = U.el('div', 'sim-buttons');
        U.button(buttons, 'Clear the square').addEventListener('click', () => { resetCross(); render(); });
        wrap.appendChild(buttons);

        render();

        root._simState = () => ({
            trait: trait.key, p1, p2,
            gametes: { p1: gametesOf(p1), p2: gametesOf(p2) },
            cells: cells.slice(), expected: [0, 1, 2, 3].map(expectedCell),
            complete: filled(), predicted,
            genotypeRatio: ratioText(ratios(trait, p1, p2).counts),
            phenotypeRatio: ratioText(ratios(trait, p1, p2).ph)
        });
        root._simSolve = () => { cells = [0, 1, 2, 3].map(expectedCell); predicted = actualPhenoRatio(); render(); };
    };
})();
