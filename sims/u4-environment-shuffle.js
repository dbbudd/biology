/* =============================================================
   INTERACTIVE — Environment shuffle
   -------------------------------------------------------------
   Registers window.SIMS['u4-environment-shuffle'].
   Supports HS-LS1-4, HS-LS3-2.

   Two beetle populations live through the same four events. One
   reproduces asexually — every offspring is an exact copy of its
   parent, so the whole population shares ONE genotype. One
   reproduces sexually — offspring take one allele of each gene
   from each parent, so the population holds many genotypes.

   Nothing here is asserted. Every survivor count is computed by
   testing each individual's actual alleles against the event, and
   every population size is computed from the survivors. The reader
   commits to a prediction for BOTH lines before each reveal.

   The arc is deliberate: the clone wins the first three rounds
   outright, because copying is cheaper and it was already well
   suited. Then one disease arrives that its single genotype cannot
   answer. "Which is better" turns out to be the wrong question.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4es-style';

    const START = 24;
    const CAP = 96;

    /* Three genes. The clone carries heat 1, drought 1, surface A —
       it is well adapted, because a successful clone is a lineage
       that was already winning. */
    const CLONE = { heat: 1, drought: 1, surf: 'A' };
    const SURFS = ['A', 'B', 'C'];

    const ROUNDS = [
        {
            key: 'calm', name: 'A calm decade',
            blurb: 'Nothing changes. Warm, wet, no disease. Both populations simply reproduce.',
            test: null,
            lesson: 'No individual dies, so nothing is being selected. The only thing that ' +
                'separates the two lines here is <b>speed</b>. Every asexual beetle produces ' +
                'offspring on its own. Sexual beetles need a partner, so the same number of ' +
                'adults produces fewer young. In a world that is not changing, that is a pure ' +
                'cost — and it is why asexual reproduction is so common in stable habitats.'
        },
        {
            key: 'heat', name: 'A hot summer',
            blurb: 'A heatwave. Only beetles carrying the heat-tolerance allele survive it.',
            test: b => b.heat === 1,
            lesson: 'The clone sailed through, because its one genotype happens to carry heat ' +
                'tolerance. The sexual population lost everyone who did not. Notice what this ' +
                'looks like from outside: the asexual line appears <em>better</em>. It is not — ' +
                'it is <em>lucky in this particular world</em>, and it has no way to become ' +
                'anything else.'
        },
        {
            key: 'dry', name: 'A dry year',
            blurb: 'Drought. Only beetles carrying the drought-tolerance allele survive.',
            test: b => b.drought === 1,
            lesson: 'Again the clone loses nobody and the sexual line is cut back. Three rounds ' +
                'in, the asexual line is far ahead and the argument for sexual reproduction ' +
                'looks weak. Hold that thought — and look at the variety counter under each ' +
                'population before you go on.'
        },
        {
            key: 'fungus', name: 'A new fungus arrives',
            blurb: 'A fungus that attacks one particular surface protein. Beetles with surface ' +
                'type A are killed; types B and C are unharmed.',
            test: b => b.surf !== 'A',
            lesson: 'Every beetle in the asexual line was surface type A, because every beetle ' +
                'in the asexual line was the same beetle. One disease, one genotype, no ' +
                'survivors. The sexual population lost its type-A individuals and kept the rest, ' +
                'because it was never all one thing. <b>This is the whole argument.</b> Genetic ' +
                'variety is not useful on any given day. It is what a population has left when ' +
                'the day it was suited to is over.'
        }
    ];

    function rng(seed) {
        let s = seed >>> 0;
        return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function build() {
        const r = rng(4022026);
        const asex = [];
        for (let i = 0; i < START; i++) asex.push(Object.assign({}, CLONE));
        // Allele frequencies in the founding sexual population. Neither
        // tolerance allele is rare, and all three surface types are present —
        // which is exactly what "a varied population" means.
        const sex = [];
        for (let i = 0; i < START; i++) sex.push({
            heat: r() < 0.7 ? 1 : 0,
            drought: r() < 0.7 ? 1 : 0,
            surf: SURFS[Math.floor(r() * 3)]
        });
        return { asex, sex, r };
    }

    const gkey = b => b.heat + '' + b.drought + b.surf;
    const variety = p => Object.keys(p.reduce((a, b) => (a[gkey(b)] = 1, a), {})).length;

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.es { padding:1rem 1.25rem 1.25rem; }',
            '.es { --es-ok:#2e7d32; --es-bad:#aa272f; }',
            '[data-theme="dark"] .es { --es-ok:#7fc98a; --es-bad:#e08a90; }',
            '[data-theme="sepia"] .es { --es-ok:#4a6b3d; --es-bad:#a04040; }',
            '.es-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.9rem; line-height:1.55; }',
            '.es-round { font-size:0.66rem; font-weight:800; letter-spacing:0.07em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.25rem; }',
            '.es-name { font-size:1rem; font-weight:700; margin:0 0 0.3rem; }',
            '.es-blurb { font-size:0.85rem; line-height:1.55; margin:0 0 0.9rem; }',
            '.es-cols { display:grid; gap:0.9rem; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); }',
            '.es-col { border:1px solid var(--border); border-radius:11px; padding:0.7rem 0.8rem;',
            '   background:var(--bg); }',
            '.es-col h6 { margin:0 0 0.1rem; font-size:0.85rem; }',
            '.es-sub { font-size:0.7rem; color:var(--text-secondary); margin:0 0 0.55rem; line-height:1.4; }',
            '.es-grid { display:flex; flex-wrap:wrap; gap:3px; margin-bottom:0.55rem; min-height:44px; }',
            '.es-b { width:13px; height:13px; border-radius:3px; border:1px solid rgba(0,0,0,0.18); }',
            '[data-theme="dark"] .es-b { border-color:rgba(255,255,255,0.22); }',
            '.es-b.dead { opacity:0.16; }',
            '.es-nums { display:flex; gap:0.9rem; flex-wrap:wrap; font-size:0.78rem; }',
            '.es-nums b { font-size:1.15rem; display:block; line-height:1.15; }',
            '.es-nums small { color:var(--text-secondary); font-size:0.64rem; font-weight:700;',
            '   text-transform:uppercase; letter-spacing:0.05em; }',
            '.es-q { font-size:0.85rem; font-weight:600; margin:1rem 0 0.5rem; }',
            '.es-opts { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.5rem; }',
            '.es-opt { font:inherit; font-size:0.78rem; cursor:pointer; padding:0.4rem 0.7rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; }',
            '.es-opt:hover { border-color:var(--light-teal); }',
            '.es-opt.chosen { border-color:var(--light-teal); box-shadow:0 0 0 1px var(--light-teal);',
            '   font-weight:700; }',
            '.es-msg { font-size:0.82rem; line-height:1.55; margin:0.6rem 0 0; }',
            '.es-msg.ok { color:var(--es-ok); } .es-msg.bad { color:var(--es-bad); }',
            '.es-lesson { margin-top:0.9rem; border:1px solid var(--border); border-left:4px solid var(--light-teal);',
            '   border-radius:8px; background:var(--bg-surface); padding:0.75rem 0.9rem;',
            '   font-size:0.84rem; line-height:1.6; }',
            '.es-lesson b { color:var(--text); }',
            '.es-final { margin-top:1rem; border:1px solid var(--es-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .es-final { background:rgba(127,201,138,0.12); }',
            '.es-final h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.es-final p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.es-final p:last-child { margin-bottom:0; }',
            '.es-key { font-size:0.7rem; color:var(--text-secondary); margin:0.5rem 0 0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    const GUESSES = [
        { k: 'all',  t: 'Almost all survive' },
        { k: 'half', t: 'About half survive' },
        { k: 'none', t: 'Almost none survive' }
    ];
    function band(before, after) {
        if (!before) return 'none';
        const f = after / before;
        return f > 0.8 ? 'all' : f < 0.2 ? 'none' : 'half';
    }

    window.SIMS['u4-environment-shuffle'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'es');
        root.appendChild(wrap);

        let state;
        function reset() {
            const b = build();
            state = {
                round: 0, phase: 'predict',            // predict -> reveal
                guess: { asex: null, sex: null },
                asex: b.asex, sex: b.sex, r: b.r,
                killedAsex: [], killedSex: [],
                beforeAsex: b.asex.length, beforeSex: b.sex.length,
                log: []
            };
        }
        reset();

        function reproduce() {
            // Asexual: every survivor makes two identical offspring.
            // Sexual: survivors pair up, each pair makes three offspring —
            // fewer per adult, which is the cost of needing a partner.
            const r = state.r;
            const a = [];
            state.asex.forEach(b => { a.push(Object.assign({}, b)); a.push(Object.assign({}, b)); });
            state.asex = a.slice(0, CAP);

            const parents = state.sex.slice();
            const kids = [];
            for (let i = 0; i + 1 < parents.length; i += 2) {
                for (let k = 0; k < 3; k++) {
                    const p1 = parents[i], p2 = parents[i + 1];
                    kids.push({
                        heat: r() < 0.5 ? p1.heat : p2.heat,
                        drought: r() < 0.5 ? p1.drought : p2.drought,
                        surf: r() < 0.5 ? p1.surf : p2.surf
                    });
                }
            }
            state.sex = kids.slice(0, CAP);
        }

        function applyRound() {
            const R = ROUNDS[state.round];
            state.beforeAsex = state.asex.length;
            state.beforeSex = state.sex.length;
            if (R.test) {
                state.killedAsex = state.asex.filter(b => !R.test(b));
                state.killedSex = state.sex.filter(b => !R.test(b));
                state.asex = state.asex.filter(R.test);
                state.sex = state.sex.filter(R.test);
            } else {
                state.killedAsex = []; state.killedSex = [];
            }
            reproduce();
            state.log.push({
                round: R.key,
                asexBefore: state.beforeAsex, asexSurvived: state.beforeAsex - state.killedAsex.length,
                sexBefore: state.beforeSex, sexSurvived: state.beforeSex - state.killedSex.length,
                asexAfter: state.asex.length, sexAfter: state.sex.length
            });
        }

        function colour(b) {
            // hue by surface type, lightness by tolerance alleles — so the
            // clone column is visibly one colour and the sexual column is not
            const h = { A: 355, B: 205, C: 128 }[b.surf];
            const l = 40 + (b.heat ? 12 : 0) + (b.drought ? 10 : 0);
            return 'hsl(' + h + ' 58% ' + l + '%)';
        }

        function popCol(title, sub, pop, killed, showDead) {
            const c = U.el('div', 'es-col');
            const h = document.createElement('h6'); h.textContent = title; c.appendChild(h);
            const s = U.el('p', 'es-sub'); s.innerHTML = sub; c.appendChild(s);
            const g = U.el('div', 'es-grid');
            pop.forEach(b => {
                const t = U.el('i', 'es-b');
                t.style.background = colour(b);
                t.title = 'heat ' + (b.heat ? 'tolerant' : 'sensitive') + ' · drought ' +
                    (b.drought ? 'tolerant' : 'sensitive') + ' · surface ' + b.surf;
                g.appendChild(t);
            });
            if (showDead) killed.forEach(b => {
                const t = U.el('i', 'es-b dead');
                t.style.background = colour(b);
                g.appendChild(t);
            });
            c.appendChild(g);
            const n = U.el('div', 'es-nums');
            n.innerHTML = '<span><small>Individuals</small><b>' + pop.length + '</b></span>' +
                '<span><small>Different genotypes</small><b>' + variety(pop) + '</b></span>';
            c.appendChild(n);
            return c;
        }

        function render() {
            wrap.innerHTML = '';
            const how = U.el('p', 'es-how');
            how.innerHTML = 'Two beetle populations, ' + START + ' individuals each. The ' +
                '<b>asexual</b> line is descended from a single female, so every beetle in it is ' +
                'genetically identical. The <b>sexual</b> line was founded by ' + START +
                ' different beetles. Four things now happen to both of them. ' +
                'Each colour is one genotype.';
            wrap.appendChild(how);

            const finished = state.round >= ROUNDS.length;
            const R = ROUNDS[Math.min(state.round, ROUNDS.length - 1)];

            if (!finished) {
                const rn = U.el('p', 'es-round');
                rn.textContent = 'Round ' + (state.round + 1) + ' of ' + ROUNDS.length;
                wrap.appendChild(rn);
                const nm = U.el('p', 'es-name'); nm.textContent = R.name; wrap.appendChild(nm);
                const bl = U.el('p', 'es-blurb'); bl.textContent = R.blurb; wrap.appendChild(bl);
            }

            const cols = U.el('div', 'es-cols');
            cols.appendChild(popCol('Asexual line', 'Clones of one founder.', state.asex,
                state.killedAsex, state.phase === 'reveal'));
            cols.appendChild(popCol('Sexual line', 'Two parents, alleles recombined.', state.sex,
                state.killedSex, state.phase === 'reveal'));
            wrap.appendChild(cols);

            const key = U.el('p', 'es-key');
            key.textContent = 'Colour = surface type (red A, blue B, green C). ' +
                'Paler tiles carry fewer tolerance alleles. Faded tiles were killed this round.';
            wrap.appendChild(key);

            if (finished) { wrap.appendChild(finalBox()); addReset(); return; }

            if (state.phase === 'predict') {
                if (R.test) {
                    askBoth();
                } else {
                    const q = U.el('p', 'es-q');
                    q.innerHTML = 'Nothing kills anything this round. Which population will have ' +
                        'more individuals at the end of it?';
                    wrap.appendChild(q);
                    const opts = U.el('div', 'es-opts');
                    [['asex', 'The asexual line'], ['sex', 'The sexual line'], ['same', 'The same']]
                        .forEach(([k, t]) => {
                            const b = U.el('button', 'es-opt' + (state.guess.asex === k ? ' chosen' : ''));
                            b.type = 'button'; b.textContent = t;
                            b.addEventListener('click', () => {
                                state.guess.asex = k; state.guess.sex = k; render();
                            });
                            opts.appendChild(b);
                        });
                    wrap.appendChild(opts);
                }
                const btns = U.el('div', 'sim-buttons');
                const go = U.button(btns, 'Run this round');
                go.disabled = !(state.guess.asex && state.guess.sex);
                go.addEventListener('click', () => { applyRound(); state.phase = 'reveal'; render(); });
                wrap.appendChild(btns);
            } else {
                wrap.appendChild(revealBox(R));
                const btns = U.el('div', 'sim-buttons');
                U.button(btns, state.round === ROUNDS.length - 1 ? 'See where that leaves them'
                    : 'Next round ›').addEventListener('click', () => {
                        state.round++; state.phase = 'predict';
                        state.guess = { asex: null, sex: null };
                        state.killedAsex = []; state.killedSex = [];
                        render();
                    });
                wrap.appendChild(btns);
            }
            addReset();
        }

        function askBoth() {
            [['asex', 'asexual'], ['sex', 'sexual']].forEach(([k, label]) => {
                const q = U.el('p', 'es-q');
                q.innerHTML = 'How much of the <b>' + label + '</b> line survives this?';
                wrap.appendChild(q);
                const opts = U.el('div', 'es-opts');
                GUESSES.forEach(g => {
                    const b = U.el('button', 'es-opt' + (state.guess[k] === g.k ? ' chosen' : ''));
                    b.type = 'button'; b.textContent = g.t;
                    b.addEventListener('click', () => { state.guess[k] = g.k; render(); });
                    opts.appendChild(b);
                });
                wrap.appendChild(opts);
            });
        }

        function revealBox(R) {
            const L = state.log[state.log.length - 1];
            const box = U.el('div');
            const m = U.el('p', 'es-msg');
            if (R.test) {
                const bandA = band(L.asexBefore, L.asexSurvived);
                const bandS = band(L.sexBefore, L.sexSurvived);
                const rightA = state.guess.asex === bandA, rightS = state.guess.sex === bandS;
                m.className = 'es-msg ' + (rightA && rightS ? 'ok' : rightA || rightS ? '' : 'bad');
                m.innerHTML = 'Asexual line: <b>' + L.asexSurvived + ' of ' + L.asexBefore +
                    '</b> survived' + (rightA ? ' — as you predicted' : '') + '. ' +
                    'Sexual line: <b>' + L.sexSurvived + ' of ' + L.sexBefore + '</b> survived' +
                    (rightS ? ' — as you predicted' : '') + '. ' +
                    'After the survivors reproduced: ' + L.asexAfter + ' against ' + L.sexAfter + '.';
            } else {
                const winner = L.asexAfter > L.sexAfter ? 'asex' : L.sexAfter > L.asexAfter ? 'sex' : 'same';
                m.className = 'es-msg ' + (state.guess.asex === winner ? 'ok' : 'bad');
                m.innerHTML = 'Nobody died. The asexual line went from ' + L.asexBefore + ' to <b>' +
                    L.asexAfter + '</b>; the sexual line from ' + L.sexBefore + ' to <b>' +
                    L.sexAfter + '</b>.';
            }
            box.appendChild(m);
            const l = U.el('div', 'es-lesson');
            l.innerHTML = R.lesson;
            box.appendChild(l);
            return box;
        }

        function finalBox() {
            const d = U.el('div', 'es-final');
            const last = state.log[state.log.length - 1];
            d.innerHTML =
                '<h5>Final count: asexual ' + state.asex.length + ', sexual ' + state.sex.length + '.</h5>' +
                '<p>Look back over the four rounds. The asexual line won the calm decade on ' +
                'sheer speed, and walked through the heatwave and the drought without losing ' +
                'anybody, because its one genotype happened to be a good one. Judged at the end ' +
                'of round three it was the obvious winner.</p>' +
                '<p>Then a single new disease removed it completely — ' + last.asexBefore +
                ' beetles, all with the same surface protein, all killed by the same fungus. ' +
                'The sexual line lost the beetles that carried surface type A and kept the rest, ' +
                'and it is still here.</p>' +
                '<p><b>So neither strategy is better.</b> Asexual reproduction is faster, cheaper, ' +
                'needs no partner and passes on a proven genotype intact — everything you want ' +
                'if tomorrow is like today. Sexual reproduction is slower and halves your ' +
                'reproductive output, and buys one thing with it: a population that is not all ' +
                'the same. That only pays when the world changes. It changes.</p>' +
                '<p>This is not a story about beetles. It is why bananas, which are grown as ' +
                'clones, can be wiped out by a single fungal strain — and why the same fungus ' +
                'cannot do that to a wild population that reproduces sexually.</p>';
            return d;
        }

        function addReset() {
            const btns = U.el('div', 'sim-buttons');
            U.button(btns, 'Start again').addEventListener('click', () => { reset(); render(); });
            wrap.appendChild(btns);
        }

        render();

        root._simState = () => ({
            round: state.round, of: ROUNDS.length, phase: state.phase,
            guess: Object.assign({}, state.guess),
            asexual: { n: state.asex.length, genotypes: variety(state.asex) },
            sexual: { n: state.sex.length, genotypes: variety(state.sex) },
            log: state.log.slice(),
            finished: state.round >= ROUNDS.length
        });
        root._simSolve = () => {
            reset();
            while (state.round < ROUNDS.length) {
                state.guess = { asex: 'all', sex: 'all' };
                applyRound();
                state.round++;
            }
            state.phase = 'reveal';
            render();
        };
    };
})();
