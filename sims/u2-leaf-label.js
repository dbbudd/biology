/* =============================================================
   INTERACTIVE — Label the leaf
   -------------------------------------------------------------
   Registers window.SIMS['u2-leaf-label'].  Supports HS-LS1-5
   (structure and function).

   Replaces the "Pre-lab: label the structures in the cross-section
   of the leaf" task on page 6 of Anchor Guide 1, and the BioViewer
   strip the lab depends on, neither of which a reader working alone
   can get at. The cross-section is a course illustration
   (images/u2/leaf-cross-section.jpeg) with eight numbered circles
   drawn in. The clickable markers here sit exactly over those circles —
   centres measured from the image by fitting each ring, not estimated —
   and are drawn slightly larger so they cover them. The numbering does
   not follow the layers from top to bottom, so it cannot be answered by
   counting down.

   Names are never written onto the artwork. A found name fills in the
   numbered key under the picture instead, so nothing can collide with
   the drawing.

   PHASE 1 "label"    — put eight names on eight structures.
   PHASE 2 "function" — the harder half, and the one the lab is
     actually for: say what each structure DOES for photosynthesis.
     A leaf that was only labelled has not been understood.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2leaf-style';

    const PARTS = [
        { id: 'cuticle', name: 'Cuticle',
          fn: 'A waxy waterproof layer that stops the leaf drying out.',
          why: 'It is transparent, so light passes straight through it. A waterproof leaf that ' +
               'was also opaque would starve.' },
        { id: 'upper', name: 'Upper epidermis',
          fn: 'A single clear layer of cells that protects the leaf and lets light through.',
          why: 'These cells have almost no chloroplasts. That is not an oversight — it keeps ' +
               'them out of the way of the light heading for the layer below.' },
        { id: 'palisade', name: 'Palisade mesophyll',
          fn: 'Tall column cells packed with chloroplasts — where most photosynthesis happens.',
          why: 'They stand upright and shoulder to shoulder near the top surface, so they catch ' +
               'the light first and lose the least of it.' },
        { id: 'spongy', name: 'Spongy mesophyll',
          fn: 'Loosely packed cells with large air spaces between them.',
          why: 'The gaps are the point. CO₂ has to reach every cell by diffusing through air, ' +
               'and diffusion through air is thousands of times faster than through water.' },
        { id: 'vein', name: 'Vein (vascular bundle)',
          fn: 'Xylem brings water in; phloem carries sugar away.',
          why: 'Photosynthesis needs a supply line in and a delivery route out. No leaf cell is ' +
               'more than a few cells away from a vein.' },
        { id: 'lower', name: 'Lower epidermis',
          fn: 'The bottom protective layer, pierced by stomata.',
          why: 'Most stomata are on the underside, out of direct sun, which cuts water loss.' },
        { id: 'stoma', name: 'Stoma',
          fn: 'A pore that lets CO₂ in and O₂ and water vapour out.',
          why: 'It is the leaf’s only doorway for gas. Close it and photosynthesis runs out ' +
               'of raw material within minutes.' },
        { id: 'guard', name: 'Guard cells',
          fn: 'A pair of curved cells that swell and shrink to open and close the stoma.',
          why: 'This is the trade-off the whole leaf is built around: open for CO₂ and lose ' +
               'water, or close to save water and stop making sugar.' }
    ];

    // Which structure each function belongs to, shuffled for phase 2.
    function shuffled(a) {
        const b = a.slice();
        for (let i = b.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [b[i], b[j]] = [b[j], b[i]];
        }
        return b;
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2lf{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2lf{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2lf{--ok:#4a6b3d;--bad:#a04040}',
            '.u2lf-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2lf-phase{font-size:0.62rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;',
            '  color:var(--text-secondary);margin:0 0 0.5rem}',
            '.u2lf-stage{border:1px solid var(--border);border-radius:11px;background:#fdf6ee;',
            '  padding:0.4rem;overflow-x:auto}',
            '.u2lf-svg{width:100%;min-width:520px;height:auto;display:block}',
            /* The artwork is a light image in every theme, so the markers are pinned to its own
               colours rather than themed. Sizes are in the image's 2752-wide coordinates and the
               stage renders it at roughly 0.28 of that, so r=80 comes out ~22px on screen. */
            '.u2lf-mk{cursor:pointer}',
            '.u2lf-mk circle{fill:#fff;stroke:#3b2330;stroke-width:9}',
            '.u2lf-mk text{fill:#2b1a22;font-size:92px;font-weight:800;text-anchor:middle;pointer-events:none}',
            '.u2lf-mk:hover circle{stroke:#577899;stroke-width:14}',
            '.u2lf-mk:focus{outline:none}',
            '.u2lf-mk:focus circle{stroke:#577899;stroke-width:16}',
            '.u2lf-mk.done{cursor:default}',
            '.u2lf-mk.done circle{fill:#2e7d32;stroke:#1f5a22}',
            '.u2lf-mk.done text{fill:#fff}',
            '.u2lf-key{display:grid;grid-template-columns:repeat(auto-fill,minmax(11.5rem,1fr));',
            '  gap:0.3rem 0.9rem;margin:0.7rem 0 0;padding:0;list-style:none;font-size:0.8rem}',
            '.u2lf-key li{display:flex;gap:0.45rem;align-items:baseline;color:var(--text-secondary)}',
            '.u2lf-key b{display:inline-block;min-width:1.35rem;height:1.35rem;line-height:1.35rem;',
            '  text-align:center;border-radius:50%;border:1.5px solid var(--border);font-size:0.72rem;',
            '  color:var(--text)}',
            '.u2lf-key li.done{color:var(--text);font-weight:600}',
            '.u2lf-key li.done b{background:var(--ok);border-color:var(--ok);color:#fff}',
            '.u2lf-bank{display:flex;gap:0.4rem;flex-wrap:wrap;margin:0.8rem 0 0.2rem}',
            '.u2lf-chip{font:inherit;font-size:0.78rem;padding:0.3rem 0.6rem;border-radius:7px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2lf-chip:hover{border-color:var(--light-teal)}',
            '.u2lf-chip[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2lf-chip[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2lf-fn{display:grid;grid-template-columns:auto 1fr;gap:0.45rem 0.7rem;align-items:center;',
            '  margin-top:0.5rem;font-size:0.82rem}',
            '.u2lf-fn select{font:inherit;font-size:0.8rem;padding:0.22rem 0.35rem;border-radius:6px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);max-width:200px}',
            '.u2lf-fn select.ok{border-color:var(--ok)} .u2lf-fn select.bad{border-color:var(--bad)}',
            '.u2lf-msg{margin:0.85rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2lf-msg.ok{color:var(--ok)} .u2lf-msg.bad{color:var(--bad)}',
            '.u2lf-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2lf-rev{background:rgba(127,201,138,0.12)}',
            '.u2lf-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2lf-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}',
            '.u2lf-rev ul{margin:0 0 0.5rem;padding-left:1.1rem;font-size:0.82rem;line-height:1.55}'
        ].join('\n');
        document.head.appendChild(s);
    }

    // Measured circle centres in the image's own 2752 x 1536 coordinates. Each ring was
    // fitted at r = 72 with all 90 sample points landing on it.
    const W = 2752, H = 1536, R = 80;
    const MARKERS = {
        spongy:   { n: 1, x: 219,  y: 767  },
        palisade: { n: 2, x: 2533, y: 559  },
        stoma:    { n: 3, x: 1374, y: 1426 },
        lower:    { n: 4, x: 2533, y: 1308 },
        cuticle:  { n: 5, x: 2533, y: 222  },
        guard:    { n: 6, x: 216,  y: 1311 },
        vein:     { n: 7, x: 2533, y: 933  },
        upper:    { n: 8, x: 216,  y: 303  }
    };
    const DESC = 'A cross-section through a leaf. From top to bottom: a thin pale amber waxy ' +
        'layer; one row of clear box-shaped cells; a row of tall column-shaped cells packed with ' +
        'green chloroplasts; several rows of loosely packed rounded cells with air spaces between ' +
        'them; and a row of clear box-shaped cells along the bottom. In the middle of the rounded ' +
        'cells is a round bundle of blue-grey and tan tubes wrapped in a ring of cells. In the ' +
        'bottom row there is a gap flanked by two bean-shaped green cells. Eight numbered markers ' +
        'point to structures: 1 to 8 are not in order from top to bottom.';

    function leafSVG() {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('class', 'u2lf-svg');
        svg.setAttribute('role', 'group');
        svg.setAttribute('aria-label', DESC);
        const img = document.createElementNS(ns, 'image');
        img.setAttribute('href', (document.body.dataset.root || '../') + 'images/u2/leaf-cross-section.jpeg');
        img.setAttribute('x', 0); img.setAttribute('y', 0);
        img.setAttribute('width', W); img.setAttribute('height', H);
        img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.appendChild(img);
        return svg;
    }

    window.SIMS['u2-leaf-label'] = function (root) {
        injectStyle();
        const ns = 'http://www.w3.org/2000/svg';
        const wrap = U.el('div', 'u2lf');
        const how = U.el('p', 'u2lf-how');
        const phase = U.el('p', 'u2lf-phase');
        const holder = U.el('div');
        const bank = U.el('div', 'u2lf-bank');
        const fnHost = U.el('div');
        const msg = U.el('p', 'u2lf-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, phase, holder, bank, fnHost, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const nextBtn = U.button(buttons, 'Now say what each one does', 'primary');
        const checkBtn = U.button(buttons, 'Check my answers', 'primary');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let mode = 'label';
        let done = {};        // id -> true
        let selected = null;
        let picks = {};       // functionIndex -> partId
        let order = shuffled(PARTS);
        let svg, key, hits = {};

        function build() {
            holder.innerHTML = '';
            const stage = U.el('div', 'u2lf-stage');
            svg = leafSVG();
            hits = {};
            Object.entries(MARKERS).forEach(([id, m]) => {
                const g = document.createElementNS(ns, 'g');
                g.setAttribute('class', 'u2lf-mk');
                g.setAttribute('tabindex', '0');
                g.setAttribute('role', 'button');
                g.innerHTML = '<circle cx="' + m.x + '" cy="' + m.y + '" r="' + R + '"/>' +
                    '<text x="' + m.x + '" y="' + (m.y + 33) + '">' + m.n + '</text>';
                const go = () => place(id);
                g.addEventListener('click', go);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
                });
                svg.appendChild(g);
                hits[id] = g;
            });
            stage.appendChild(svg);
            holder.appendChild(stage);
            key = U.el('ol', 'u2lf-key');
            holder.appendChild(key);
        }

        function place(id) {
            if (mode !== 'label' || done[id]) return;
            if (selected === null) {
                msg.textContent = 'Pick a name from the list below first, then click its numbered marker.';
                msg.className = 'u2lf-msg';
                return;
            }
            const part = PARTS[selected];
            if (part.id === id) {
                done[id] = true; selected = null;
                msg.textContent = part.name + ' — ' + part.fn;
                msg.className = 'u2lf-msg ok';
            } else {
                const truth = PARTS.find(p => p.id === id);
                msg.textContent = 'Not quite — marker ' + MARKERS[id].n + ' is the ' + truth.name.toLowerCase() +
                    '. ' + hintFor(part.id);
                msg.className = 'u2lf-msg bad';
            }
            render();
        }

        function hintFor(id) {
            switch (id) {
                case 'cuticle': return 'The cuticle is the thin pale amber waxy layer across the very top of the leaf.';
                case 'upper': return 'The upper epidermis is the single row of clear box-shaped cells just under the wax.';
                case 'palisade': return 'Palisade cells are the tall upright columns near the top, stuffed with green dots.';
                case 'spongy': return 'The spongy layer is the loose round cells with obvious air gaps between them.';
                case 'vein': return 'The vein is the round bundle of blue-grey and tan tubes in the middle, wrapped in a ring of cells.';
                case 'lower': return 'The lower epidermis is the row of cells along the bottom surface.';
                case 'stoma': return 'The stoma is the gap itself — the hole in the bottom surface, not the cells beside it.';
                case 'guard': return 'The guard cells are the two bean-shaped green cells either side of the gap in the bottom surface.';
                default: return '';
            }
        }

        function render() {
            how.innerHTML = mode === 'label'
                ? 'Click a name, then click the numbered marker it belongs to. The numbers are not in ' +
                  'order down the leaf — work from the outside in if you are stuck, because the leaf is ' +
                  'built in layers.'
                : 'Now the part that matters. Match each job to the structure that does it. ' +
                  'Every one of these structures exists because of a problem a leaf has to solve.';
            phase.textContent = mode === 'label'
                ? 'Step 1 of 2 — name the eight structures'
                : 'Step 2 of 2 — what each one does for photosynthesis';

            Object.entries(hits).forEach(([id, g]) => {
                g.classList.toggle('done', !!done[id]);
                const p = PARTS.find(q => q.id === id);
                g.setAttribute('aria-label', 'Marker ' + MARKERS[id].n + (done[id] ? ': ' + p.name : ''));
                if (done[id]) g.removeAttribute('tabindex'); else g.setAttribute('tabindex', '0');
            });
            key.innerHTML = '';
            Object.entries(MARKERS).sort((a, b) => a[1].n - b[1].n).forEach(([id, m]) => {
                const li = U.el('li', done[id] ? 'done' : '');
                const p = PARTS.find(q => q.id === id);
                li.innerHTML = '<b>' + m.n + '</b><span>' + (done[id] ? p.name : '?') + '</span>';
                key.appendChild(li);
            });

            bank.innerHTML = '';
            if (mode === 'label') {
                PARTS.forEach((p, i) => {
                    if (done[p.id]) return;
                    const c = U.el('button', 'u2lf-chip');
                    c.type = 'button'; c.textContent = p.name;
                    c.setAttribute('aria-pressed', selected === i ? 'true' : 'false');
                    c.addEventListener('click', () => {
                        selected = selected === i ? null : i; render();
                    });
                    bank.appendChild(c);
                });
            }

            fnHost.innerHTML = '';
            if (mode === 'function') {
                const grid = U.el('div', 'u2lf-fn');
                order.forEach((p, i) => {
                    const sel = document.createElement('select');
                    sel.innerHTML = '<option value="">choose…</option>' +
                        PARTS.map(q => '<option value="' + q.id + '">' + q.name + '</option>').join('');
                    sel.value = picks[i] || '';
                    sel.setAttribute('aria-label', 'Which structure: ' + p.fn);
                    sel.addEventListener('change', () => {
                        picks[i] = sel.value; sel.className = '';
                        msg.textContent = ''; msg.className = 'u2lf-msg';
                        revealHost.innerHTML = '';
                    });
                    grid.appendChild(sel);
                    const t = U.el('div'); t.textContent = p.fn;
                    grid.appendChild(t);
                });
                fnHost.appendChild(grid);
            }

            const allLabelled = PARTS.every(p => done[p.id]);
            nextBtn.hidden = !(mode === 'label' && allLabelled);
            checkBtn.hidden = mode !== 'function';
        }

        function checkFunctions() {
            let right = 0;
            const grid = fnHost.querySelector('.u2lf-fn');
            order.forEach((p, i) => {
                const sel = grid.children[i * 2];
                const ok = picks[i] === p.id;
                sel.className = picks[i] ? (ok ? 'ok' : 'bad') : '';
                if (ok) right++;
            });
            if (right === order.length) {
                msg.textContent = 'All eight. Every structure matched to its job.';
                msg.className = 'u2lf-msg ok';
                showReveal();
            } else {
                msg.textContent = right + ' of ' + order.length + ' correct. The ones outlined in ' +
                    'red are wrong — change them and check again.';
                msg.className = 'u2lf-msg bad';
            }
            return right;
        }

        function showReveal() {
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2lf-rev');
            d.innerHTML = '<h5>A leaf is a solution to four problems at once</h5>' +
                '<p>Read the layers again, from the top, and notice that each one answers a ' +
                'different question:</p>' +
                '<ul>' +
                '<li><strong>How do I get light in without drying out?</strong> A transparent ' +
                'waxy cuticle over a clear epidermis.</li>' +
                '<li><strong>Where do I put the chloroplasts?</strong> In tall palisade cells ' +
                'right under that clear window, standing on end so the light passes down through ' +
                'as many as possible.</li>' +
                '<li><strong>How does CO₂ reach cells buried inside a solid organ?</strong> ' +
                'By diffusing through the air gaps of the spongy layer — which is why a leaf ' +
                'is mostly empty space.</li>' +
                '<li><strong>How do water in and sugar out get there?</strong> Through veins, ' +
                'close enough that no cell is far from one.</li>' +
                '</ul>' +
                '<p>And the whole design hangs on one compromise. The stoma has to be open for ' +
                'CO₂ to enter, and while it is open water escapes. The guard cells are the ' +
                'valve that manages that trade, and on a hot dry afternoon a plant will close them ' +
                'and stop photosynthesising rather than wilt. Keep that in mind for 2.4, where you ' +
                'change the rate of photosynthesis on purpose.</p>';
            revealHost.appendChild(d);
        }

        nextBtn.addEventListener('click', () => {
            mode = 'function'; picks = {}; order = shuffled(PARTS);
            msg.textContent = ''; msg.className = 'u2lf-msg';
            render();
        });
        checkBtn.addEventListener('click', checkFunctions);
        resetBtn.addEventListener('click', () => {
            mode = 'label'; done = {}; selected = null; picks = {}; order = shuffled(PARTS);
            msg.textContent = ''; msg.className = 'u2lf-msg';
            revealHost.innerHTML = ''; build(); render();
        });

        build(); render();

        root._simState = () => ({
            mode, labelled: Object.keys(done),
            allLabelled: PARTS.every(p => done[p.id]),
            functionPicks: order.map((p, i) => ({ fn: p.fn, chose: picks[i] || null, answer: p.id })),
            functionsCorrect: order.filter((p, i) => picks[i] === p.id).length,
            parts: PARTS.map(p => ({ id: p.id, name: p.name, fn: p.fn }))
        });
        root._simSolve = () => {
            if (mode === 'label') { PARTS.forEach(p => done[p.id] = true); selected = null; render(); }
            else { order.forEach((p, i) => picks[i] = p.id); render(); checkFunctions(); }
        };
    };
})();
