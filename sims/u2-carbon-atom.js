/* =============================================================
   INTERACTIVE — Follow one carbon atom
   -------------------------------------------------------------
   Registers window.SIMS['u2-carbon-atom'].  Supports HS-LS2-5 and
   learning targets L2 and D4.

   Anchor Guide 3 questions 17 and 18 draw a carbon cycle with
   lettered arrows and ask: how could a carbon atom in a giraffe end
   up in a tree? How could a carbon atom in dead organic matter end
   up in a giraffe? Those questions have blank boxes under them.

   Here the cycle is a graph. Every hop the reader chooses is checked
   against the graph, so a wrong route is refused with a reason rather
   than marked at the end — and the routes that work are DISCOVERED
   rather than given. There is more than one legal answer, which is
   itself the point: matter cycles, so there are loops.

   PANEL 2 sorts every reservoir into one of Earth's four spheres,
   which is the second half of HS-LS2-5.

   NOTE. The deck's own carbon-cycle cartoon (image117) labels
   photosynthesis "Synthesis light" and cellular respiration
   "Breathing animals". Breathing is ventilation — moving air. This
   sim uses the correct process names throughout, and the chapter
   uses the cartoon's error as its misconception box.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2ca-style';

    const POOLS = {
        atmosphere: { name: 'CO₂ in the atmosphere', sphere: 'atmosphere', x: 300, y: 40,
            note: 'A small reservoir, and the one everything else passes through.' },
        ocean: { name: 'Dissolved CO₂ in the ocean', sphere: 'hydrosphere', x: 530, y: 120,
            note: 'About fifty times more carbon than the atmosphere holds.' },
        tree: { name: 'Organic molecules in a tree', sphere: 'biosphere', x: 90, y: 130,
            note: 'Sugar, cellulose, protein — everything a plant builds itself out of.' },
        giraffe: { name: 'Organic molecules in a giraffe', sphere: 'biosphere', x: 90, y: 240,
            note: 'Built entirely from carbon that was in the atmosphere not long ago.' },
        dom: { name: 'Dead organic matter', sphere: 'biosphere', x: 300, y: 285,
            note: 'Fallen leaves, dead wood, dead animals, faeces.' },
        decomposers: { name: 'Decomposers', sphere: 'biosphere', x: 300, y: 178,
            note: 'Fungi and bacteria. They respire, exactly as you do.' },
        fossil: { name: 'Fossil fuels', sphere: 'geosphere', x: 530, y: 285,
            note: 'Dead organic matter buried before it could rot, over millions of years.' },
        rock: { name: 'Limestone and other carbonate rock', sphere: 'geosphere', x: 530, y: 210,
            note: 'The largest carbon store on Earth by far — mostly old shells.' }
    };

    const EDGES = [
        { from: 'atmosphere', to: 'tree', process: 'Photosynthesis',
          why: 'The tree takes CO₂ from the air and builds the carbon into sugar. This is the ' +
               'only arrow on the whole diagram that moves carbon <em>into</em> living things ' +
               'from the non-living world.' },
        { from: 'tree', to: 'atmosphere', process: 'Cellular respiration',
          why: 'Plants respire too, day and night. A plant is not only a producer of oxygen — ' +
               'it is a consumer of its own sugar.' },
        { from: 'tree', to: 'giraffe', process: 'Feeding',
          why: 'The giraffe eats leaves, digests them, and rebuilds the carbon into giraffe.' },
        { from: 'giraffe', to: 'atmosphere', process: 'Cellular respiration',
          why: 'Every carbon atom the giraffe respires leaves through its lungs as CO₂. This is ' +
               'the arrow marked A on your anchor guide diagram.' },
        { from: 'giraffe', to: 'dom', process: 'Death or waste',
          why: 'Faeces and, eventually, the whole animal become dead organic matter.' },
        { from: 'tree', to: 'dom', process: 'Death or leaf fall',
          why: 'Leaves drop, branches fall, and eventually the tree dies.' },
        { from: 'dom', to: 'decomposers', process: 'Decomposition',
          why: 'Fungi and bacteria secrete enzymes into dead matter and absorb the pieces. The ' +
               'carbon is now in the decomposers.' },
        { from: 'decomposers', to: 'atmosphere', process: 'Cellular respiration',
          why: 'This is how most of the carbon in a dead leaf gets back to the air — not by ' +
               'rotting away into nothing, but by being respired by something small.' },
        { from: 'dom', to: 'fossil', process: 'Burial over millions of years',
          why: 'If dead matter is buried faster than decomposers can reach it — in a swamp, or ' +
               'on a sea floor — heat and pressure turn it into coal, oil or gas. This is rare ' +
               'and desperately slow.' },
        { from: 'fossil', to: 'atmosphere', process: 'Combustion',
          why: 'Burning releases in seconds what took millions of years to store. Chemically it ' +
               'is the same reaction as respiration; it is the <em>rate</em> that is the problem.' },
        { from: 'atmosphere', to: 'ocean', process: 'Dissolving',
          why: 'CO₂ dissolves in seawater. The ocean has absorbed roughly a quarter of everything ' +
               'humans have emitted — and become measurably more acidic doing it.' },
        { from: 'ocean', to: 'atmosphere', process: 'Outgassing',
          why: 'The exchange runs both ways, and warmer water holds less gas.' },
        { from: 'ocean', to: 'rock', process: 'Sedimentation',
          why: 'Marine organisms build calcium carbonate shells. When they die the shells sink ' +
               'and, over millions of years, become limestone.' },
        { from: 'rock', to: 'atmosphere', process: 'Volcanic activity and weathering',
          why: 'The slowest arrow on the diagram. Without it, carbon would gradually be locked ' +
               'into rock and the biosphere would run out.' }
    ];

    const CHALLENGES = [
        { id: 'g2t', from: 'giraffe', to: 'tree',
          q: 'Anchor Guide 3, question 18a: get a carbon atom out of a giraffe and into a tree.',
          par: 2,
          note: 'The shortest route is two hops, and the giraffe has to breathe the carbon out ' +
                'before the tree can have it. Nothing passes directly from an animal to a plant.' },
        { id: 'd2g', from: 'dom', to: 'giraffe',
          q: 'Question 18b: get a carbon atom out of dead organic matter and into a giraffe.',
          par: 4,
          note: 'Four hops, and every route has to go through the atmosphere. Dead matter does ' +
                'not feed a giraffe directly — it feeds decomposers, which respire it back to CO₂, ' +
                'which a plant can then fix.' },
        { id: 'f2t', from: 'fossil', to: 'tree',
          q: 'Get a carbon atom out of a coal seam and into a living leaf.',
          par: 2,
          note: 'Two hops. A carbon atom that has been underground for three hundred million ' +
                'years can be inside a leaf within a year of the coal being burned.' },
        { id: 'a2r', from: 'atmosphere', to: 'rock',
          q: 'Get a carbon atom out of the air and lock it into limestone.',
          par: 2,
          note: 'The long-term sink. This is the pathway that has kept Earth’s climate roughly ' +
                'stable over geological time — and it works on a timescale of millions of years, ' +
                'which is why it cannot rescue us from a change made in two centuries.' }
    ];

    const SPHERES = {
        atmosphere: 'Atmosphere — the air',
        hydrosphere: 'Hydrosphere — the water',
        biosphere: 'Biosphere — living and once-living things',
        geosphere: 'Geosphere — rock and sediment'
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2ca{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2ca{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2ca{--ok:#4a6b3d;--bad:#a04040}',
            '.u2ca-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2ca-tabs{display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.6rem}',
            '.u2ca-tab{font:inherit;font-size:0.76rem;padding:0.3rem 0.6rem;border-radius:999px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2ca-tab[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2ca-tab[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2ca-svg{width:100%;max-width:680px;display:block;margin:0 auto}',
            '.u2ca-pool rect{stroke-width:1.4;rx:8}',
            '.u2ca-pool text{font-size:10px;pointer-events:none}',
            '.u2ca-pool.here rect{stroke-width:3}',
            '.u2ca-pool.goal rect{stroke-dasharray:5 3;stroke-width:2.4}',
            '.u2ca-arrow{stroke:var(--text-secondary);stroke-width:1.2;fill:none;opacity:0.45}',
            '.u2ca-arrow.used{stroke:var(--red);stroke-width:2.6;opacity:1}',
            '.u2ca-q{font-size:0.86rem;line-height:1.5;margin:0.5rem 0 0.35rem}',
            '.u2ca-moves{display:flex;gap:0.4rem;flex-wrap:wrap;margin:0.3rem 0}',
            '.u2ca-move{font:inherit;font-size:0.78rem;text-align:left;padding:0.35rem 0.6rem;',
            '  border-radius:8px;border:1px solid var(--border);background:var(--bg);',
            '  color:var(--text);cursor:pointer;line-height:1.3}',
            '.u2ca-move:hover{border-color:var(--light-teal)}',
            '.u2ca-move small{display:block;font-size:0.66rem;color:var(--text-secondary)}',
            '.u2ca-path{font-size:0.78rem;color:var(--text-secondary);margin:0.45rem 0 0;line-height:1.5}',
            '.u2ca-sort{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-top:0.5rem}',
            '@media (max-width:620px){.u2ca-sort{grid-template-columns:1fr}}',
            '.u2ca-zone{border:1.5px dashed var(--border);border-radius:10px;padding:0.45rem 0.55rem;min-height:64px}',
            '.u2ca-zone h6{margin:0 0 0.3rem;font-size:0.7rem;color:var(--text-secondary)}',
            '.u2ca-tok{font:inherit;font-size:0.74rem;padding:0.24rem 0.5rem;margin:0.12rem;',
            '  border-radius:7px;border:1px solid var(--border);background:var(--bg);',
            '  color:var(--text);cursor:pointer}',
            '.u2ca-tok:hover{border-color:var(--light-teal)}',
            '.u2ca-tok[aria-pressed="true"]{box-shadow:0 0 0 2px var(--light-teal)}',
            '.u2ca-tok.good{border-color:var(--ok)} .u2ca-tok.bad{border-color:var(--bad)}',
            '.u2ca-msg{margin:0.8rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2ca-msg.ok{color:var(--ok)} .u2ca-msg.bad{color:var(--bad)}',
            '.u2ca-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2ca-rev{background:rgba(127,201,138,0.12)}',
            '.u2ca-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2ca-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}'
        ].join('\n');
        document.head.appendChild(s);
    }

    const SPHERE_COL = {
        atmosphere: ['hsl(200 55% 86%)', 'hsl(205 50% 32%)'],
        hydrosphere: ['hsl(190 45% 82%)', 'hsl(195 50% 28%)'],
        biosphere: ['hsl(120 38% 82%)', 'hsl(122 42% 27%)'],
        geosphere: ['hsl(30 32% 82%)', 'hsl(28 40% 30%)']
    };

    window.SIMS['u2-carbon-atom'] = function (root) {
        injectStyle();
        const ns = 'http://www.w3.org/2000/svg';
        const wrap = U.el('div', 'u2ca');
        const how = U.el('p', 'u2ca-how');
        const tabs = U.el('div', 'u2ca-tabs');
        const stageHost = U.el('div');
        const body = U.el('div');
        const msg = U.el('p', 'u2ca-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, tabs, stageHost, body, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const nextBtn = U.button(buttons, 'Next challenge', 'primary');
        const checkBtn = U.button(buttons, 'Check my sorting', 'primary');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let panel = 'walk';
        let ci = 0;                       // challenge index
        let at = CHALLENGES[0].from;
        let path = [];                    // [{from,to,process}]
        let solvedIds = {};
        let sorted = {};                  // pool id -> sphere
        let selectedPool = null;
        let sortChecked = false;
        let svg, poolEls = {}, arrowEls = [];

        function build() {
            stageHost.innerHTML = '';
            svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', '0 0 680 340');
            svg.setAttribute('class', 'u2ca-svg');
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label',
                'A carbon cycle drawn as eight labelled reservoirs joined by arrows: CO2 in the ' +
                'atmosphere, dissolved CO2 in the ocean, organic molecules in a tree and in a ' +
                'giraffe, dead organic matter, decomposers, fossil fuels, and carbonate rock.');
            const defs = document.createElementNS(ns, 'defs');
            defs.innerHTML = '<marker id="u2ca-a" viewBox="0 0 10 10" refX="9" refY="5" ' +
                'markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">' +
                '<path d="M0 0 L10 5 L0 10 z" fill="var(--text-secondary)"/></marker>' +
                '<marker id="u2ca-b" viewBox="0 0 10 10" refX="9" refY="5" ' +
                'markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">' +
                '<path d="M0 0 L10 5 L0 10 z" fill="var(--red)"/></marker>';
            svg.appendChild(defs);

            arrowEls = [];
            EDGES.forEach((e, i) => {
                const a = POOLS[e.from], b = POOLS[e.to];
                const x1 = a.x + 62, y1 = a.y + 16, x2 = b.x + 62, y2 = b.y + 16;
                const dx = x2 - x1, dy = y2 - y1;
                const len = Math.hypot(dx, dy) || 1;
                const off = 34;
                const sx = x1 + dx / len * off, sy = y1 + dy / len * off;
                const ex = x2 - dx / len * off, ey = y2 - dy / len * off;
                const mx = (sx + ex) / 2 - dy / len * 22, my = (sy + ey) / 2 + dx / len * 22;
                const p = document.createElementNS(ns, 'path');
                p.setAttribute('d', 'M' + sx + ' ' + sy + ' Q' + mx + ' ' + my + ' ' + ex + ' ' + ey);
                p.setAttribute('class', 'u2ca-arrow');
                p.setAttribute('marker-end', 'url(#u2ca-a)');
                p.dataset.i = i;
                svg.appendChild(p);
                arrowEls.push(p);
            });

            poolEls = {};
            Object.entries(POOLS).forEach(([id, p]) => {
                const g = document.createElementNS(ns, 'g');
                g.setAttribute('class', 'u2ca-pool');
                g.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
                const r = document.createElementNS(ns, 'rect');
                r.setAttribute('width', '124'); r.setAttribute('height', '34');
                r.setAttribute('rx', '8');
                g.appendChild(r);
                // wrap the name over two lines
                const words = p.name.split(' ');
                let l1 = '', l2 = '';
                words.forEach(w => { if ((l1 + ' ' + w).trim().length <= 17 && !l2) l1 = (l1 + ' ' + w).trim();
                                     else l2 = (l2 + ' ' + w).trim(); });
                [[l1, 14], [l2, 26]].forEach(([txt, y]) => {
                    if (!txt) return;
                    const t = document.createElementNS(ns, 'text');
                    t.setAttribute('x', '62'); t.setAttribute('y', y);
                    t.setAttribute('text-anchor', 'middle');
                    t.textContent = txt;
                    g.appendChild(t);
                });
                svg.appendChild(g);
                poolEls[id] = g;
            });
            stageHost.appendChild(svg);
        }

        function paint() {
            const C = CHALLENGES[ci];
            Object.entries(POOLS).forEach(([id, p]) => {
                const g = poolEls[id];
                const pal = SPHERE_COL[p.sphere];
                const rect = g.querySelector('rect');
                rect.setAttribute('fill', pal[0]);
                rect.setAttribute('stroke', pal[1]);
                g.querySelectorAll('text').forEach(t => t.setAttribute('fill', pal[1]));
                g.classList.toggle('here', panel === 'walk' && id === at);
                g.classList.toggle('goal', panel === 'walk' && id === C.to);
            });
            arrowEls.forEach((p, i) => {
                const e = EDGES[i];
                const used = path.some(h => h.from === e.from && h.to === e.to);
                p.classList.toggle('used', used);
                p.setAttribute('marker-end', used ? 'url(#u2ca-b)' : 'url(#u2ca-a)');
            });
        }

        function moves() { return EDGES.filter(e => e.from === at); }

        function hop(e) {
            path.push({ from: e.from, to: e.to, process: e.process });
            at = e.to;
            msg.innerHTML = '<strong>' + e.process + '</strong> — ' + e.why;
            msg.className = 'u2ca-msg ok';
            const C = CHALLENGES[ci];
            if (at === C.to) {
                solvedIds[C.id] = path.length;
                showWalkReveal();
            }
            render();
        }

        function render() {
            tabs.innerHTML = '';
            [['walk', 'Follow one atom'], ['spheres', 'Sort the reservoirs into spheres']]
                .forEach(([k, lab]) => {
                    const b = U.el('button', 'u2ca-tab');
                    b.type = 'button'; b.textContent = lab;
                    b.setAttribute('aria-pressed', panel === k ? 'true' : 'false');
                    b.addEventListener('click', () => {
                        panel = k; msg.textContent = ''; msg.className = 'u2ca-msg';
                        revealHost.innerHTML = ''; render();
                    });
                    tabs.appendChild(b);
                });

            const C = CHALLENGES[ci];
            how.innerHTML = panel === 'walk'
                ? 'One carbon atom. Move it by choosing a <strong>process</strong> at each step — ' +
                  'not a destination. If a process does not appear, that is because it cannot ' +
                  'happen from where the atom is.'
                : 'Earth’s carbon sits in four places. Sort every reservoir into the sphere it ' +
                  'belongs to, then check.';

            body.innerHTML = '';
            nextBtn.hidden = true; checkBtn.hidden = panel !== 'spheres';
            stageHost.hidden = false;

            if (panel === 'walk') {
                const q = U.el('p', 'u2ca-q');
                q.innerHTML = '<strong>Challenge ' + (ci + 1) + ' of ' + CHALLENGES.length +
                    '.</strong> ' + C.q;
                body.appendChild(q);
                const start = U.el('p', 'u2ca-path');
                start.innerHTML = 'The atom is now in: <strong>' + POOLS[at].name + '</strong>. ' +
                    'Target: <strong>' + POOLS[C.to].name + '</strong>.';
                body.appendChild(start);

                if (at !== C.to) {
                    const row = U.el('div', 'u2ca-moves');
                    moves().forEach(e => {
                        const b = U.el('button', 'u2ca-move');
                        b.type = 'button';
                        b.innerHTML = e.process + '<small>&rarr; ' + POOLS[e.to].name + '</small>';
                        b.addEventListener('click', () => hop(e));
                        row.appendChild(b);
                    });
                    body.appendChild(row);
                } else {
                    nextBtn.hidden = ci >= CHALLENGES.length - 1;
                }

                if (path.length) {
                    const p = U.el('p', 'u2ca-path');
                    p.innerHTML = 'Route so far: ' + POOLS[path[0].from].name + ' ' +
                        path.map(h => '&rarr; <em>' + h.process + '</em> &rarr; ' + POOLS[h.to].name)
                            .join(' ') + ' &nbsp;(' + path.length + ' hop' +
                        (path.length === 1 ? '' : 's') + ', shortest possible is ' + C.par + ')';
                    body.appendChild(p);
                }
            } else {
                const grid = U.el('div', 'u2ca-sort');
                Object.entries(SPHERES).forEach(([k, lab]) => {
                    const z = U.el('div', 'u2ca-zone');
                    const h = document.createElement('h6'); h.textContent = lab;
                    z.appendChild(h);
                    Object.entries(POOLS).forEach(([id, p]) => {
                        if (sorted[id] !== k) return;
                        const b = U.el('button', 'u2ca-tok');
                        b.type = 'button'; b.textContent = p.name;
                        if (sortChecked) b.classList.add(p.sphere === k ? 'good' : 'bad');
                        b.addEventListener('click', () => {
                            delete sorted[id]; sortChecked = false;
                            msg.textContent = ''; msg.className = 'u2ca-msg'; render();
                        });
                        z.appendChild(b);
                    });
                    z.addEventListener('click', ev => {
                        if (ev.target.closest('.u2ca-tok')) return;
                        if (selectedPool) {
                            sorted[selectedPool] = k; selectedPool = null; sortChecked = false;
                            msg.textContent = ''; msg.className = 'u2ca-msg'; render();
                        }
                    });
                    grid.appendChild(z);
                });
                body.appendChild(grid);
                const tray = U.el('div', 'u2ca-moves');
                let any = false;
                Object.entries(POOLS).forEach(([id, p]) => {
                    if (sorted[id]) return;
                    any = true;
                    const b = U.el('button', 'u2ca-tok');
                    b.type = 'button'; b.textContent = p.name;
                    b.setAttribute('aria-pressed', selectedPool === id ? 'true' : 'false');
                    b.addEventListener('click', () => {
                        selectedPool = selectedPool === id ? null : id; render();
                    });
                    tray.appendChild(b);
                });
                if (!any) {
                    const s = U.el('span'); s.style.fontSize = '0.76rem';
                    s.style.color = 'var(--text-secondary)';
                    s.textContent = 'All eight sorted. Press Check.';
                    tray.appendChild(s);
                }
                body.appendChild(tray);
            }
            paint();
        }

        function showWalkReveal() {
            const C = CHALLENGES[ci];
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2ca-rev');
            const extra = path.length - C.par;
            d.innerHTML = '<h5>Arrived — in ' + path.length + ' hop' +
                (path.length === 1 ? '' : 's') + '</h5>' +
                '<p>' + POOLS[path[0].from].name + ' ' +
                path.map(h => '&rarr; <strong>' + h.process + '</strong> &rarr; ' + POOLS[h.to].name)
                    .join(' ') + '.</p>' +
                (extra > 0 ? '<p>There is a shorter route — ' + C.par + ' hops. Try again and see ' +
                    'if you can find it. Both routes are real; carbon does wander.</p>' : '') +
                '<p>' + C.note + '</p>' +
                (Object.keys(solvedIds).length === CHALLENGES.length
                    ? '<p><strong>All four done.</strong> Look back at what every route had in ' +
                      'common: it went through the atmosphere. The air is a small reservoir that ' +
                      'everything else drains into and draws from, which is exactly why adding to ' +
                      'it changes things quickly. And notice that not one atom was created or ' +
                      'destroyed on any route — it was only ever moved and rebonded. That is what ' +
                      '"matter cycles" means, said precisely.</p>'
                    : '');
            revealHost.appendChild(d);
        }

        function showSphereReveal() {
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2ca-rev');
            d.innerHTML = '<h5>Sources, sinks, and how fast each one moves</h5>' +
                '<p>The four spheres are not four equal boxes. Almost all of Earth’s carbon is in ' +
                'the <strong>geosphere</strong> — carbonate rock, with fossil fuels a distant ' +
                'second. The <strong>hydrosphere</strong> holds roughly fifty times what the ' +
                '<strong>atmosphere</strong> does. The <strong>biosphere</strong>, all life ' +
                'included, holds less than the air.</p>' +
                '<p>What matters is not the size of a reservoir but the speed of the arrows into ' +
                'and out of it. Photosynthesis and respiration move enormous amounts of carbon ' +
                'every year and very nearly cancel out — you can watch them not-quite-cancelling ' +
                'in the annual wobble of the Keeling curve. Burial and volcanism move tiny amounts ' +
                'over millions of years. Burning fossil fuels takes carbon from the slowest ' +
                'reservoir and puts it into the fastest one, which is why a small absolute amount ' +
                'has such a large effect.</p>' +
                '<p>A <em>source</em> releases more carbon than it takes in; a <em>sink</em> takes ' +
                'in more than it releases. A growing forest is a sink. A burning one is a source. ' +
                'The same forest, either way.</p>';
            revealHost.appendChild(d);
        }

        checkBtn.addEventListener('click', () => {
            const ids = Object.keys(POOLS);
            const unsorted = ids.filter(id => !sorted[id]);
            if (unsorted.length) {
                msg.textContent = unsorted.length + ' reservoirs still in the tray.';
                msg.className = 'u2ca-msg bad'; return;
            }
            sortChecked = true;
            const right = ids.filter(id => sorted[id] === POOLS[id].sphere).length;
            render();
            if (right === ids.length) {
                msg.textContent = 'All eight in the right sphere.';
                msg.className = 'u2ca-msg ok';
                showSphereReveal();
            } else {
                const bad = ids.find(id => sorted[id] !== POOLS[id].sphere);
                msg.innerHTML = right + ' of ' + ids.length + ' right. <strong>' + POOLS[bad].name +
                    '</strong> belongs to the ' + POOLS[bad].sphere + '. ' + POOLS[bad].note;
                msg.className = 'u2ca-msg bad';
            }
        });

        nextBtn.addEventListener('click', () => {
            ci = Math.min(ci + 1, CHALLENGES.length - 1);
            at = CHALLENGES[ci].from; path = [];
            msg.textContent = ''; msg.className = 'u2ca-msg'; revealHost.innerHTML = '';
            render();
        });

        resetBtn.addEventListener('click', () => {
            ci = 0; at = CHALLENGES[0].from; path = []; solvedIds = {};
            sorted = {}; selectedPool = null; sortChecked = false;
            msg.textContent = ''; msg.className = 'u2ca-msg'; revealHost.innerHTML = '';
            render();
        });

        build(); render();

        root._simState = () => ({
            panel, challenge: CHALLENGES[ci].id, at,
            path: path.slice(), hops: path.length, par: CHALLENGES[ci].par,
            solved: Object.assign({}, solvedIds),
            allSolved: Object.keys(solvedIds).length === CHALLENGES.length,
            sorted: Object.assign({}, sorted),
            spheresCorrect: Object.keys(POOLS).filter(id => sorted[id] === POOLS[id].sphere).length,
            pools: Object.entries(POOLS).map(([id, p]) => ({ id, name: p.name, sphere: p.sphere })),
            edges: EDGES.map(e => ({ from: e.from, to: e.to, process: e.process }))
        });
        root._simSolve = () => {
            if (panel === 'spheres') {
                Object.keys(POOLS).forEach(id => sorted[id] = POOLS[id].sphere);
                sortChecked = true; render(); showSphereReveal(); return;
            }
            // breadth-first search of the graph, so the solution comes from the model
            const C = CHALLENGES[ci];
            const prev = {}; const q = [C.from]; const seen = { [C.from]: true };
            while (q.length) {
                const n = q.shift();
                if (n === C.to) break;
                EDGES.filter(e => e.from === n).forEach(e => {
                    if (seen[e.to]) return;
                    seen[e.to] = true; prev[e.to] = e; q.push(e.to);
                });
            }
            const route = []; let cur = C.to;
            while (prev[cur]) { route.unshift(prev[cur]); cur = prev[cur].from; }
            path = route.map(e => ({ from: e.from, to: e.to, process: e.process }));
            at = C.to; solvedIds[C.id] = path.length;
            render(); showWalkReveal();
        };
    };
})();
