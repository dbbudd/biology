/* =============================================================
   INTERACTIVE — Food-web builder
   -------------------------------------------------------------
   Registers window.SIMS['u2-food-web'].  Supports HS-LS2-4 and
   learning target L6.

   Anchor Guide 3 pages 5 to 12 hand out a deck of Yellowstone cards
   and ask the reader to lay out a food web on a table, then classify
   every organism. A reader working alone has no deck, so the web is
   here instead — and, more usefully, the classification is COMPUTED
   from the eating relationships rather than stored as an answer key.
   Change one arrow and every label updates, which is the point the
   card activity is trying to make.

   The rules are the anchor guide's own, verbatim in effect:
     producer            makes its own organic molecules
     primary consumer    eats only producers
     secondary consumer  eats only primary consumers or decomposers
     decomposer          consumes dead organic matter
     trophic omnivore    eats organisms from more than one trophic
                         level; and anything that eats a trophic
                         omnivore is one too

   PHASE 1 "classify" — label every organism, before any answer shows.
   PHASE 2 "cascade"  — take the wolves out and predict, one link at a
     time, what happens. This is the real Yellowstone history.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2fw-style';

    // eats: what this organism consumes. Producers eat nothing.
    const WEB = [
        { id: 'grass',  name: 'Grasses and sedges', kind: 'plant',  eats: [],
          x: 70,  y: 300 },
        { id: 'willow', name: 'Willow',             kind: 'plant',  eats: [],
          x: 250, y: 300 },
        { id: 'dom',    name: 'Dead organic matter', kind: 'dom',   eats: [],
          x: 470, y: 320 },
        { id: 'elk',    name: 'Elk',                kind: 'animal', eats: ['grass', 'willow'],
          x: 90,  y: 205 },
        { id: 'beaver', name: 'Beaver',             kind: 'animal', eats: ['willow'],
          x: 250, y: 205 },
        { id: 'hare',   name: 'Snowshoe hare',      kind: 'animal', eats: ['grass', 'willow'],
          x: 400, y: 215 },
        { id: 'fungi',  name: 'Fungi and bacteria', kind: 'animal', eats: ['dom'],
          x: 560, y: 250 },
        { id: 'wolf',   name: 'Wolf',               kind: 'animal', eats: ['elk', 'beaver'],
          x: 120, y: 105 },
        { id: 'coyote', name: 'Coyote',             kind: 'animal', eats: ['hare'],
          x: 300, y: 110 },
        { id: 'beetle', name: 'Ground beetle',      kind: 'animal', eats: ['fungi'],
          x: 560, y: 160 },
        { id: 'bear',   name: 'Grizzly bear',       kind: 'animal', eats: ['grass', 'elk'],
          x: 40,  y: 40 },
        { id: 'raven',  name: 'Raven',              kind: 'animal', eats: ['dom', 'hare'],
          x: 430, y: 60 },
        { id: 'eagle',  name: 'Golden eagle',       kind: 'animal', eats: ['hare', 'coyote'],
          x: 240, y: 30 }
    ];

    const LEVELS = {
        producer:  'Producer',
        primary:   'Primary consumer',
        secondary: 'Secondary consumer',
        decomposer:'Decomposer',
        omnivore:  'Trophic omnivore',
        dom:       'Dead organic matter'
    };

    /* ---- classification computed from the edges, iteratively ---- */
    function classify() {
        const by = {};
        WEB.forEach(o => { by[o.id] = null; });
        WEB.forEach(o => {
            if (o.kind === 'plant') by[o.id] = 'producer';
            if (o.kind === 'dom') by[o.id] = 'dom';
        });
        for (let pass = 0; pass < 8; pass++) {
            WEB.forEach(o => {
                if (by[o.id] || o.kind !== 'animal') return;
                const preyClasses = o.eats.map(p => by[p]);
                if (preyClasses.some(c => c === null)) return;   // wait for the next pass
                const set = new Set(preyClasses);
                if (set.size === 1 && set.has('producer')) by[o.id] = 'primary';
                else if (set.size === 1 && set.has('dom')) by[o.id] = 'decomposer';
                else if ([...set].every(c => c === 'primary' || c === 'decomposer'))
                    by[o.id] = 'secondary';
                else by[o.id] = 'omnivore';   // mixed levels, or eats a secondary or an omnivore
            });
        }
        return by;
    }

    /* ---- the cascade, also derived from the web ---- */
    const CASCADE = [
        { q: 'Wolves are removed from Yellowstone. What happens to the elk?',
          opts: [['up', 'The elk population rises'], ['down', 'The elk population falls'],
                 ['same', 'Nothing changes']],
          ans: 'up',
          why: 'Wolves eat elk, so taking the wolves out removes the main thing keeping elk ' +
               'numbers down. Elk increase.' },
        { q: 'There are now many more elk. What happens to the willow?',
          opts: [['up', 'Willow grows better'], ['down', 'Willow growth falls'],
                 ['same', 'Willow is unaffected']],
          ans: 'down',
          why: 'Elk browse willow. More elk means more browsing, so willow shoots are eaten ' +
               'before they can grow tall. Willow growth collapses.' },
        { q: 'Willow is scarce and short. What happens to the beavers?',
          opts: [['up', 'Beaver colonies increase'], ['down', 'Beaver colonies decline'],
                 ['same', 'Beavers are unaffected']],
          ans: 'down',
          why: 'Beavers need tall willow for food and for dam-building. No tall willow, no ' +
               'beavers — and this is what actually happened in Yellowstone.' },
        { q: 'So what does the wolf population do to willow growth overall?',
          opts: [['same', 'Wolves and willow change in the SAME direction'],
                 ['opp', 'Wolves and willow change in OPPOSITE directions'],
                 ['none', 'There is no connection — they never meet']],
          ans: 'same',
          why: 'Follow the two minus signs. More wolves → fewer elk → more willow. Fewer wolves ' +
               '→ more elk → less willow. Wolves and willow move together, even though a wolf ' +
               'has never eaten a willow. Two negatives make a positive: that is a trophic cascade.' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2fw{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2fw{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2fw{--ok:#4a6b3d;--bad:#a04040}',
            '.u2fw-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2fw-phase{font-size:0.62rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;',
            '  color:var(--text-secondary);margin:0 0 0.45rem}',
            '.u2fw-svg{width:100%;max-width:700px;display:block;margin:0 auto}',
            '.u2fw-node rect{stroke-width:1.5;rx:7}',
            '.u2fw-node text{font-size:10.5px;font-weight:700;pointer-events:none}',
            '.u2fw-node .lvl{font-size:8.5px;font-weight:400}',
            '.u2fw-node{cursor:pointer}',
            '.u2fw-edge{stroke:var(--text-secondary);stroke-width:1.3;fill:none;opacity:0.7}',
            '.u2fw-edge.dim{opacity:0.18}',
            '.u2fw-edge.hot{stroke:var(--red);stroke-width:2.4;opacity:1}',
            '.u2fw-bank{display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.6rem}',
            '.u2fw-chip{font:inherit;font-size:0.76rem;padding:0.3rem 0.6rem;border-radius:7px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2fw-chip:hover{border-color:var(--light-teal)}',
            '.u2fw-chip[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2fw-chip[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2fw-count{font-size:0.74rem;color:var(--text-secondary);margin:0.45rem 0 0}',
            '.u2fw-casc h6{margin:0.8rem 0 0.3rem;font-size:0.84rem}',
            '.u2fw-opt{display:block;width:100%;font:inherit;font-size:0.8rem;text-align:left;',
            '  padding:0.4rem 0.6rem;margin-bottom:0.28rem;border-radius:8px;border:1px solid var(--border);',
            '  background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2fw-opt:hover{border-color:var(--light-teal)}',
            '.u2fw-opt.good{border-color:var(--ok);background:rgba(46,125,50,0.10)}',
            '.u2fw-opt.bad{border-color:var(--bad);background:rgba(170,39,47,0.10)}',
            '.u2fw-msg{margin:0.8rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2fw-msg.ok{color:var(--ok)} .u2fw-msg.bad{color:var(--bad)}',
            '.u2fw-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2fw-rev{background:rgba(127,201,138,0.12)}',
            '.u2fw-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2fw-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}'
        ].join('\n');
        document.head.appendChild(s);
    }

    const FILL = {
        producer:  ['hsl(120 40% 82%)', 'hsl(120 45% 28%)'],
        primary:   ['hsl(45 70% 84%)',  'hsl(40 60% 32%)'],
        secondary: ['hsl(15 65% 85%)',  'hsl(10 55% 34%)'],
        decomposer:['hsl(280 30% 86%)', 'hsl(280 35% 34%)'],
        omnivore:  ['hsl(200 45% 85%)', 'hsl(205 45% 30%)'],
        dom:       ['hsl(30 25% 84%)',  'hsl(30 30% 32%)']
    };

    window.SIMS['u2-food-web'] = function (root) {
        injectStyle();
        const ns = 'http://www.w3.org/2000/svg';
        const truth = classify();

        const wrap = U.el('div', 'u2fw');
        const how = U.el('p', 'u2fw-how');
        const phaseLab = U.el('p', 'u2fw-phase');
        const stageHost = U.el('div');
        const bank = U.el('div', 'u2fw-bank');
        const count = U.el('p', 'u2fw-count');
        const cascHost = U.el('div', 'u2fw-casc');
        const msg = U.el('p', 'u2fw-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, phaseLab, stageHost, bank, count, cascHost, msg, revealHost]
            .forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const nextBtn = U.button(buttons, 'Now take the wolves out', 'primary');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let phase = 'classify';
        let given = {};          // node id -> level key the reader assigned
        let selected = null;     // level key held
        let step = 0;            // cascade step
        let picks = [];
        let svg, nodeEls = {}, edgeEls = [];

        function build() {
            stageHost.innerHTML = '';
            svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', '0 0 700 370');
            svg.setAttribute('class', 'u2fw-svg');
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label',
                'A Yellowstone food web. Grasses, willow and dead organic matter sit along the ' +
                'bottom. Arrows run upward from them to elk, beaver, snowshoe hare and fungi, ' +
                'and on again to wolf, coyote, ground beetle, grizzly bear, raven and golden eagle.');
            edgeEls = [];
            // edges first so nodes sit on top
            WEB.forEach(o => {
                o.eats.forEach(p => {
                    const from = WEB.find(w => w.id === p);
                    const path = document.createElementNS(ns, 'path');
                    const x1 = from.x + 58, y1 = from.y, x2 = o.x + 58, y2 = o.y + 26;
                    const my = (y1 + y2) / 2;
                    path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + my + ',' +
                        x2 + ' ' + my + ',' + x2 + ' ' + y2);
                    path.setAttribute('class', 'u2fw-edge');
                    path.setAttribute('marker-end', 'url(#u2fw-arrow)');
                    path.dataset.from = p; path.dataset.to = o.id;
                    svg.appendChild(path);
                    edgeEls.push(path);
                });
            });
            const defs = document.createElementNS(ns, 'defs');
            defs.innerHTML = '<marker id="u2fw-arrow" viewBox="0 0 10 10" refX="9" refY="5" ' +
                'markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
                '<path d="M0 0 L10 5 L0 10 z" fill="var(--text-secondary)"/></marker>';
            svg.insertBefore(defs, svg.firstChild);

            nodeEls = {};
            WEB.forEach(o => {
                const g = document.createElementNS(ns, 'g');
                g.setAttribute('class', 'u2fw-node');
                g.setAttribute('transform', 'translate(' + o.x + ',' + o.y + ')');
                g.setAttribute('tabindex', '0');
                g.setAttribute('role', 'button');
                const r = document.createElementNS(ns, 'rect');
                r.setAttribute('width', '116'); r.setAttribute('height', '38');
                r.setAttribute('y', '-12'); r.setAttribute('rx', '7');
                const t = document.createElementNS(ns, 'text');
                t.setAttribute('x', '58'); t.setAttribute('y', '4');
                t.setAttribute('text-anchor', 'middle');
                t.textContent = o.name;
                const l = document.createElementNS(ns, 'text');
                l.setAttribute('x', '58'); l.setAttribute('y', '17');
                l.setAttribute('text-anchor', 'middle');
                l.setAttribute('class', 'lvl');
                g.appendChild(r); g.appendChild(t); g.appendChild(l);
                const act = () => assign(o.id);
                g.addEventListener('click', act);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                });
                svg.appendChild(g);
                nodeEls[o.id] = { g, r, t, l, o };
            });
            stageHost.appendChild(svg);
        }

        function assign(id) {
            if (phase !== 'classify') return;
            const o = WEB.find(w => w.id === id);
            if (o.kind === 'dom') {
                msg.textContent = 'Dead organic matter is not a trophic level — it is a pool of ' +
                    'material that leaves and animals become. Decomposers feed on it.';
                msg.className = 'u2fw-msg'; return;
            }
            if (given[id]) { delete given[id]; render(); return; }
            if (!selected) {
                msg.textContent = 'Pick a category first, then click an organism.';
                msg.className = 'u2fw-msg'; return;
            }
            given[id] = selected;
            const right = truth[id] === selected;
            if (right) {
                msg.textContent = o.name + ' — ' + LEVELS[truth[id]] + '. ' + reason(o);
                msg.className = 'u2fw-msg ok';
            } else {
                msg.textContent = 'Not quite. Look at what the ' + o.name.toLowerCase() +
                    ' eats: ' + o.eats.map(p => WEB.find(w => w.id === p).name.toLowerCase()).join(' and ') +
                    '. ' + reason(o);
                msg.className = 'u2fw-msg bad';
                delete given[id];
            }
            selected = null;
            render();
        }

        function reason(o) {
            const c = truth[o.id];
            const preyNames = o.eats.map(p => WEB.find(w => w.id === p).name.toLowerCase());
            if (c === 'producer') return 'It makes its own organic molecules from CO₂ and water.';
            if (c === 'primary') return 'Everything it eats (' + preyNames.join(', ') +
                ') is a producer, so it feeds at exactly one level above the plants.';
            if (c === 'decomposer') return 'It feeds on dead organic matter, breaking it down and ' +
                'absorbing the pieces.';
            if (c === 'secondary') return 'Everything it eats is a primary consumer or a ' +
                'decomposer, and nothing else.';
            if (c === 'omnivore') {
                const levels = [...new Set(o.eats.map(p => LEVELS[truth[p]]))];
                return 'It eats from more than one trophic level — ' + levels.join(' and ').toLowerCase() +
                    ' — so it does not fit in a single band.';
            }
            return '';
        }

        function render() {
            how.innerHTML = phase === 'classify'
                ? 'Arrows point the way the food goes. Pick a category, then click every organism ' +
                  'that belongs in it. Work from the bottom up — you cannot know what a wolf is ' +
                  'until you know what an elk is.'
                : 'Between 1927 and 1995 there were no wolves in Yellowstone. Predict what happened, ' +
                  'one link at a time. Each answer unlocks the next question.';
            phaseLab.textContent = phase === 'classify'
                ? 'Step 1 of 2 — classify every organism'
                : 'Step 2 of 2 — the trophic cascade';

            WEB.forEach(o => {
                const n = nodeEls[o.id];
                const shown = o.kind === 'dom' ? 'dom' : (given[o.id] || null);
                const pal = FILL[shown] || ['var(--bg)', 'var(--border)'];
                n.r.setAttribute('fill', pal[0]);
                n.r.setAttribute('stroke', pal[1]);
                n.t.setAttribute('fill', shown ? pal[1] : 'var(--text)');
                n.l.setAttribute('fill', pal[1]);
                n.l.textContent = shown ? LEVELS[shown] : '';
                n.g.setAttribute('aria-label', o.name +
                    (shown ? ', classified as ' + LEVELS[shown] : ', unclassified'));
            });

            bank.innerHTML = '';
            if (phase === 'classify') {
                ['producer', 'primary', 'secondary', 'decomposer', 'omnivore'].forEach(k => {
                    const b = U.el('button', 'u2fw-chip');
                    b.type = 'button'; b.textContent = LEVELS[k];
                    b.setAttribute('aria-pressed', selected === k ? 'true' : 'false');
                    b.addEventListener('click', () => { selected = selected === k ? null : k; render(); });
                    bank.appendChild(b);
                });
            }
            bank.hidden = phase !== 'classify';

            const need = WEB.filter(o => o.kind !== 'dom');
            const done = need.filter(o => given[o.id]).length;
            count.textContent = phase === 'classify'
                ? done + ' of ' + need.length + ' classified.' : '';

            // cascade highlighting
            edgeEls.forEach(e => {
                e.classList.remove('hot', 'dim');
                if (phase === 'cascade') {
                    const chain = [['elk', 'wolf'], ['willow', 'elk'], ['willow', 'beaver']];
                    const active = chain.slice(0, Math.min(step + 1, chain.length));
                    const hot = active.some(([f, t]) => e.dataset.from === f && e.dataset.to === t);
                    e.classList.add(hot ? 'hot' : 'dim');
                }
            });

            cascHost.innerHTML = '';
            if (phase === 'cascade') {
                CASCADE.forEach((c, i) => {
                    if (i > step) return;
                    const h = document.createElement('h6');
                    h.textContent = (i + 1) + '. ' + c.q;
                    cascHost.appendChild(h);
                    c.opts.forEach(([k, lab]) => {
                        const b = U.el('button', 'u2fw-opt');
                        b.type = 'button'; b.textContent = lab;
                        if (picks[i] !== undefined) {
                            if (k === c.ans) b.classList.add('good');
                            else if (k === picks[i]) b.classList.add('bad');
                            b.disabled = true;
                        }
                        b.addEventListener('click', () => {
                            picks[i] = k;
                            if (k === c.ans) {
                                msg.textContent = c.why;
                                msg.className = 'u2fw-msg ok';
                                if (i === step && step < CASCADE.length - 1) step++;
                                else if (i === CASCADE.length - 1) showReveal();
                            } else {
                                msg.textContent = 'Follow the arrows. ' + c.why;
                                msg.className = 'u2fw-msg bad';
                                if (i === step && step < CASCADE.length - 1) step++;
                                else if (i === CASCADE.length - 1) showReveal();
                            }
                            render();
                        });
                        cascHost.appendChild(b);
                    });
                });
            }

            nextBtn.hidden = !(phase === 'classify' && done === need.length);
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const counts = {};
            Object.values(truth).forEach(c => counts[c] = (counts[c] || 0) + 1);
            const d = U.el('div', 'u2fw-rev');
            d.innerHTML = '<h5>What a web tells you that a chain cannot</h5>' +
                '<p>Your web has ' + (counts.producer || 0) + ' producers, ' +
                (counts.primary || 0) + ' primary consumers, ' + (counts.secondary || 0) +
                ' secondary consumers, ' + (counts.decomposer || 0) + ' decomposers and ' +
                (counts.omnivore || 0) + ' trophic omnivores. Notice how many organisms would not ' +
                'fit in a tidy chain. A grizzly bear eats grass <em>and</em> elk; a raven eats ' +
                'carrion <em>and</em> hares. Real ecosystems are webs, and the neat four-step ' +
                'chain in a textbook is a slice through one.</p>' +
                '<p>The cascade is the payoff. Wolves never touch a willow, and yet willow growth ' +
                'tracks the wolf population — because the effect travels through the elk. When ' +
                'wolves were returned to Yellowstone in 1995, elk numbers fell, willow and aspen ' +
                'recovered along the streams, and beaver colonies came back with them. Some ' +
                'accounts of this story overreach (rivers did not literally change course because ' +
                'of wolves), but the elk–willow–beaver chain is well documented.</p>' +
                '<p>One more thing to carry into the next section. Ask why there were only ever a ' +
                'hundred or so wolves for thousands of elk. It is not that wolves are bad at ' +
                'hunting. It is that the energy runs out — and that is what the pyramid is about.</p>';
            revealHost.appendChild(d);
        }

        nextBtn.addEventListener('click', () => {
            phase = 'cascade'; step = 0; picks = [];
            msg.textContent = ''; msg.className = 'u2fw-msg';
            render();
        });
        resetBtn.addEventListener('click', () => {
            phase = 'classify'; given = {}; selected = null; step = 0; picks = [];
            msg.textContent = ''; msg.className = 'u2fw-msg'; revealHost.innerHTML = '';
            render();
        });

        build(); render();

        root._simState = () => ({
            phase, given: Object.assign({}, given), truth: Object.assign({}, truth),
            classified: WEB.filter(o => o.kind !== 'dom' && given[o.id]).length,
            toClassify: WEB.filter(o => o.kind !== 'dom').length,
            cascadeStep: step, cascadePicks: picks.slice(),
            cascadeAnswers: CASCADE.map(c => c.ans),
            web: WEB.map(o => ({ id: o.id, name: o.name, eats: o.eats, level: truth[o.id] }))
        });
        root._simSolve = () => {
            WEB.forEach(o => { if (o.kind !== 'dom') given[o.id] = truth[o.id]; });
            phase = 'cascade'; step = CASCADE.length - 1;
            picks = CASCADE.map(c => c.ans);
            render(); showReveal();
        };
    };
})();
