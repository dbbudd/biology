/* =============================================================
   INTERACTIVE — Pull a thread
   -------------------------------------------------------------
   Registers window.SIMS['u3-food-web'].  Serves HS-LS2-6
   (targets 8 and 11) and the anchor guide's own warm-up:
   "Remove one population from the food web. Use arrows to show
   how each of the other populations might be affected."

   The reader removes a species, then must PREDICT the direction
   for every remaining species before anything is revealed. Only
   then does the model resolve — and it resolves in two rounds,
   deliberately:

     Round 1  Direct effects only. Anything the removed species ate
              is released (up). Anything that ate it loses a meal
              (down).

     Round 2  Follow each of those changes one step further. A
              species that rose eats more, so ITS food falls and
              ITS predators rise; a species that fell does the
              reverse.

   Round 2 is where species get pushed in both directions at once,
   and the sim says so rather than picking a winner. That honest
   "pulled both ways" answer is the point: it is why a real removal
   has to be measured, not deduced, which is exactly the argument
   Paine's experiment settles in the chapter around this sim.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u3fw-style';

    /* the anchor guide's own web: who eats whom. Positions match Figure 3.13 exactly —
       same organisms, same rows, same sides — so the reader is pulling a thread on the
       figure they have just read, not on a new diagram. */
    const SPECIES = {
        wildflowers: { name: 'Wildflowers', many: 'wildflowers', one: 'wildflowers', x: 262, y: 422, level: 'Producer' },
        grass:       { name: 'Grass',       many: 'grass',       one: 'grass',   x: 500, y: 422, level: 'Producer' },
        rabbit:      { name: 'Rabbit',      many: 'rabbits',     one: 'rabbit',  x: 262, y: 302, level: 'Primary consumer' },
        mouse:       { name: 'Mouse',       many: 'mice',        one: 'mouse',   x: 500, y: 302, level: 'Primary consumer' },
        snake:       { name: 'Snake',       many: 'snakes',      one: 'snake',   x: 500, y: 182, level: 'Secondary consumer' },
        hawk:        { name: 'Hawk',        many: 'hawks',       one: 'hawk',    x: 262, y: 62,  level: 'Top predator — level 3 or 4' }
    };
    /* the shared Unit 3 cut-outs, and their natural sizes for equal visual weight */
    const ART = { wildflowers: [488, 503], grass: [469, 476], rabbit: [501, 539],
                  mouse: [593, 312], snake: [730, 388], hawk: [504, 528] };
    const BANDS = [
        [62,  '4 · Tertiary consumer',  'eats level 3'],
        [182, '3 · Secondary consumer', 'eats level 2'],
        [302, '2 · Primary consumer',   'a herbivore'],
        [422, '1 · Producer',           'makes its own food']
    ];
    const HW = 52, HH = 39, PAD = 6, HEAD = 8, TARGET = 40;
    /* [prey, predator] — the arrow points the way the energy travels */
    const EDGES = [
        ['wildflowers', 'rabbit'], ['wildflowers', 'mouse'],
        ['grass', 'rabbit'], ['grass', 'mouse'],
        ['rabbit', 'hawk'], ['rabbit', 'snake'],
        ['mouse', 'hawk'], ['mouse', 'snake'],
        ['snake', 'hawk']
    ];
    const KEYS = Object.keys(SPECIES);
    const preyOf = s => EDGES.filter(e => e[1] === s).map(e => e[0]);
    const predatorsOf = s => EDGES.filter(e => e[0] === s).map(e => e[1]);

    /* ---- the model ------------------------------------------------- */
    function resolve(removed) {
        const r1 = {}, r2 = {}, why1 = {}, why2 = {};
        KEYS.forEach(k => { r1[k] = 0; r2[k] = 0; why1[k] = []; why2[k] = []; });

        // Round 1 — direct effects of the removal.
        preyOf(removed).forEach(p => {
            r1[p] += 1;
            const others = predatorsOf(p).filter(q => q !== removed).length;
            why1[p].push(others
                ? 'the ' + SPECIES[removed].one + ' that ate it is gone'
                : 'nothing is eating it any more');
        });
        predatorsOf(removed).forEach(p => {
            r1[p] -= 1;
            why1[p].push('it has lost the ' + SPECIES[removed].one + ' as a food source');
        });

        // Round 2 — follow each round-1 change one step further.
        KEYS.forEach(s => {
            if (s === removed || r1[s] === 0) return;
            const sign = Math.sign(r1[s]);
            const word = sign > 0 ? 'more' : 'fewer';
            preyOf(s).forEach(p => {
                if (p === removed) return;
                r2[p] -= sign;
                why2[p].push(word + ' ' + SPECIES[s].many + ' are eating it');
            });
            predatorsOf(s).forEach(p => {
                if (p === removed) return;
                r2[p] += sign;
                why2[p].push('it has ' + word + ' ' + SPECIES[s].many + ' to eat');
            });
        });

        const out = {};
        KEYS.forEach(s => {
            if (s === removed) { out[s] = { code: 'gone', why: [] }; return; }
            const net = r1[s] + r2[s];
            const both = (r1[s] > 0 && r2[s] < 0) || (r1[s] < 0 && r2[s] > 0) ||
                         (r1[s] === 0 && why2[s].length > 1 && r2[s] === 0);
            let code;
            if (r1[s] === 0 && r2[s] === 0) code = 'flat';
            else if (both && Math.abs(net) === 0) code = 'both';
            else if (both) code = net > 0 ? 'up-mixed' : 'down-mixed';
            else code = net > 0 ? 'up' : 'down';
            out[s] = { code, r1: r1[s], r2: r2[s], why: why1[s].concat(why2[s]) };
        });
        return out;
    }
    /* the three answers the reader may choose between */
    const GUESSES = ['up', 'down', 'flat'];
    const matches = (guess, code) =>
        (guess === 'up' && (code === 'up' || code === 'up-mixed')) ||
        (guess === 'down' && (code === 'down' || code === 'down-mixed')) ||
        (guess === 'flat' && (code === 'flat' || code === 'both'));

    const LABEL = {
        up: 'Goes up', down: 'Goes down', flat: 'Barely changes',
        'up-mixed': 'Pushed both ways — up on balance',
        'down-mixed': 'Pushed both ways — down on balance',
        both: 'Pulled both ways — the model cannot say',
        gone: 'Removed'
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u3fw { --u3-ok:#2e7d32; }',
            '[data-theme="dark"] .u3fw { --u3-ok:#7fc98a; }',
            '[data-theme="sepia"] .u3fw { --u3-ok:#4a6b3d; }',
            '.u3fw-q { padding:1.05rem 1.25rem 0.2rem; font-size:0.87rem; line-height:1.6; }',
            '.u3fw-q p { margin:0 0 0.6rem; }',
            // the web can scroll sideways on a phone rather than shrink its names past reading size
            '.u3fw-stage { padding:0.5rem 1.25rem 0.5rem; overflow-x:auto; -webkit-overflow-scrolling:touch; }',
            '.u3fw-svg { width:100%; min-width:520px; height:auto; display:block; }',
            '.u3fw-band { fill:var(--text-secondary); opacity:0.055; }',
            '.u3fw-lvl { font-size:10px; font-weight:700; fill:var(--text); text-anchor:end; }',
            '.u3fw-lvls { font-size:9px; fill:var(--text-secondary); text-anchor:end; }',
            '.u3fw-node { cursor:pointer; }',
            '.u3fw-node:focus { outline:none; }',
            // cream cards with pinned ink in every theme: the cut-outs are drawn for a light ground
            '.u3fw-card { fill:#faf6ee; stroke:#d9d0c1; stroke-width:1.3; transition:stroke 0.15s, stroke-width 0.15s; }',
            '.u3fw-node:hover .u3fw-card, .u3fw-node:focus-visible .u3fw-card { stroke:#577899; stroke-width:2.8; }',
            '.u3fw-name { font-size:11px; font-weight:700; fill:#2b2233; text-anchor:middle; pointer-events:none; }',
            '.u3fw-node image { transition:opacity 0.2s; }',
            '.u3fw-node.removed .u3fw-card { stroke:#aa272f; stroke-width:2.6; stroke-dasharray:6 4; }',
            '.u3fw-node.removed image { opacity:0.25; }',
            '.u3fw-node.removed .u3fw-name { opacity:0.5; text-decoration:line-through; }',
            '.u3fw-node.up .u3fw-card { stroke:#2e7d32; stroke-width:3.2; }',
            '.u3fw-node.down .u3fw-card { stroke:#aa272f; stroke-width:3.2; }',
            '.u3fw-node.both .u3fw-card { stroke:#c98a00; stroke-width:3.2; }',
            '.u3fw-edge line { stroke:hsl(28 62% 42%); stroke-width:2; stroke-linecap:round; }',
            '.u3fw-edge path { fill:hsl(28 62% 42%); }',
            '[data-theme="dark"] .u3fw-edge line { stroke:hsl(28 70% 70%); }',
            '[data-theme="dark"] .u3fw-edge path { fill:hsl(28 70% 70%); }',
            '.u3fw-edge.dead line { stroke:#aa272f; stroke-dasharray:5 4; opacity:0.45; }',
            '.u3fw-edge.dead path { fill:#aa272f; opacity:0.45; }',
            '[data-theme="dark"] .u3fw-edge.dead line { stroke:#e8878f; }',
            '[data-theme="dark"] .u3fw-edge.dead path { fill:#e8878f; }',
            // a badge on the corner of each card: the reader's guess while predicting,
            // the model's answer (in colour) once checked
            '.u3fw-badge { pointer-events:none; }',
            '.u3fw-badge text { font-size:12px; font-weight:800; text-anchor:middle; fill:#fff; }',
            '.u3fw-badge.guess circle { fill:#ffffff; stroke:#577899; stroke-width:2; }',
            '.u3fw-badge.guess text { fill:#577899; }',
            '.u3fw-table { width:100%; border-collapse:collapse; font-size:0.82rem; }',
            '.u3fw-table th, .u3fw-table td { border:1px solid var(--border); padding:0.4rem 0.6rem; text-align:left;',
            '   vertical-align:top; }',
            '.u3fw-table th { background:var(--bg-nav-active); color:var(--text); font-weight:700; }',
            '.u3fw-picks { display:flex; gap:0.25rem; }',
            '.u3fw-pick { font:inherit; font-size:0.9rem; line-height:1; cursor:pointer; width:2rem; height:1.9rem;',
            '   border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); }',
            '.u3fw-pick:hover { border-color:var(--light-teal); }',
            '.u3fw-pick[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); font-weight:800; }',
            '.u3fw-pick.right { border-color:var(--u3-ok); box-shadow:0 0 0 2px var(--u3-ok); }',
            '.u3fw-pick.wrong { border-color:var(--red); box-shadow:0 0 0 2px var(--red); }',
            '.u3fw-body { padding:0 1.25rem 1rem; }',
            '.u3fw-ans { font-weight:700; }',
            '.u3fw-ans.up { color:var(--u3-ok); } .u3fw-ans.down { color:var(--red); }',
            '.u3fw-why { color:var(--text-secondary); font-size:0.78rem; margin-top:0.15rem; }',
            '.u3fw-hide { display:none; }',
            '.u3fw .sim-btn:disabled { opacity:0.45; cursor:not-allowed; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u3-food-web'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u3fw');
        root.appendChild(wrap);

        let removed = null;
        let guesses = {};
        let checked = false;

        const intro = U.el('div', 'u3fw-q');
        wrap.appendChild(intro);

        const stageHost = U.el('div', 'u3fw-stage');
        wrap.appendChild(stageHost);

        const body = U.el('div', 'u3fw-body');
        wrap.appendChild(body);

        const btns = U.el('div', 'sim-buttons');
        wrap.appendChild(btns);
        const bCheck = U.button(btns, 'Check my predictions', 'primary');
        const bReset = U.button(btns, 'Put it back and try another');
        bCheck.disabled = true;

        const readout = U.el('div', 'sim-readout');
        wrap.appendChild(readout);

        bCheck.addEventListener('click', () => { if (removed) { checked = true; render(); } });
        bReset.addEventListener('click', () => { removed = null; guesses = {}; checked = false; render(); });

        /* ---------- the web drawing --------------------------------- */
        const IMG = (document.body.dataset.root || '../') + 'images/u3/web-';
        const f1 = n => n.toFixed(1);
        /* where a line from a card's centre leaves the card, plus clearance */
        function edgeOf(n, dx, dy) {
            const sx = dx ? (HW + PAD) / Math.abs(dx) : Infinity;
            const sy = dy ? (HH + PAD) / Math.abs(dy) : Infinity;
            const t = Math.min(sx, sy);
            return [n.x + dx * t, n.y + dy * t];
        }
        const SYM = { up: '▲', down: '▼', flat: '–', both: '⇄' };
        const COLOUR = { up: '#2e7d32', down: '#aa272f', flat: '#6d6259', both: '#c98a00' };
        const plain = c => (c === 'up-mixed' ? 'up' : c === 'down-mixed' ? 'down' : c);

        function drawWeb() {
            const res = removed ? resolve(removed) : null;
            const parts = [];

            // trophic bands and their labels, as in Figure 3.13
            BANDS.forEach(([y, lvl, sub]) => {
                parts.push('<rect class="u3fw-band" x="166" y="' + (y - 50) + '" width="466" height="100" rx="8"/>');
                parts.push('<text class="u3fw-lvl" x="156" y="' + (y - 2) + '">' + lvl + '</text>');
                parts.push('<text class="u3fw-lvls" x="156" y="' + (y + 11) + '">' + sub + '</text>');
            });

            // arrows first, so the cards sit on top of them
            EDGES.forEach(([a, b]) => {
                const A = SPECIES[a], B = SPECIES[b], dx = B.x - A.x, dy = B.y - A.y;
                const [x1, y1] = edgeOf(A, dx, dy), [xe, ye] = edgeOf(B, -dx, -dy);
                const L = Math.hypot(xe - x1, ye - y1), ux = (xe - x1) / L, uy = (ye - y1) / L;
                const x2 = xe - ux * HEAD, y2 = ye - uy * HEAD, px = -uy, py = ux;
                const dead = removed && (a === removed || b === removed);
                parts.push('<g class="u3fw-edge' + (dead ? ' dead' : '') + '">' +
                    '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '"/>' +
                    '<path d="M' + f1(xe) + ' ' + f1(ye) + ' L' + f1(x2 + px * 5) + ' ' + f1(y2 + py * 5) +
                    ' L' + f1(x2 - px * 5) + ' ' + f1(y2 - py * 5) + ' Z"/>' +
                    '<title>' + SPECIES[a].name + ' is eaten by ' + SPECIES[b].one + '</title></g>');
            });

            KEYS.forEach(k => {
                const S = SPECIES[k];
                let cls = 'u3fw-node', code = null;
                if (removed === k) cls += ' removed';
                else if (checked && res) {
                    code = plain(res[k].code);
                    if (code !== 'flat') cls += ' ' + code;
                }
                const [aw, ah] = ART[k], sc = TARGET / Math.sqrt(aw * ah), w = aw * sc, h = ah * sc;
                parts.push('<g class="' + cls + '" data-sp="' + k + '" role="button" tabindex="0" ' +
                    'aria-label="' + S.name + ', ' + S.level +
                    (removed === k ? ', removed' : checked && code ? ', ' + LABEL[res[k].code] : '') + '">' +
                    '<rect class="u3fw-card" x="' + (S.x - HW) + '" y="' + (S.y - HH) + '" width="' + (HW * 2) +
                    '" height="' + (HH * 2) + '" rx="11"/>' +
                    '<image href="' + IMG + k + '.png" x="' + f1(S.x - w / 2) + '" y="' + f1(S.y - 12 - h / 2) +
                    '" width="' + f1(w) + '" height="' + f1(h) + '" preserveAspectRatio="xMidYMid meet"/>' +
                    '<text class="u3fw-name" x="' + S.x + '" y="' + (S.y + 29) + '">' + S.name + '</text></g>');

                // corner badge: a cross on the removed card; the reader's guess while predicting;
                // the model's answer, in colour, once checked
                const bx = S.x + HW - 5, by = S.y - HH + 5;
                if (removed === k) {
                    parts.push('<g class="u3fw-badge"><circle cx="' + bx + '" cy="' + by + '" r="12" fill="#aa272f"/>' +
                        '<text x="' + bx + '" y="' + (by + 4.5) + '">✕</text></g>');
                } else if (checked && code) {
                    parts.push('<g class="u3fw-badge"><circle cx="' + bx + '" cy="' + by + '" r="12" fill="' + COLOUR[code] + '"/>' +
                        '<text x="' + bx + '" y="' + (by + 4.5) + '">' + SYM[code] + '</text></g>');
                } else if (removed && guesses[k]) {
                    parts.push('<g class="u3fw-badge guess"><circle cx="' + bx + '" cy="' + by + '" r="12"/>' +
                        '<text x="' + bx + '" y="' + (by + 4.5) + '">' + SYM[guesses[k]] + '</text></g>');
                }
            });

            stageHost.innerHTML = '<svg class="u3fw-svg" viewBox="0 0 640 476" ' +
                'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
                'A food web arranged by trophic level, as in Figure 3.13. Wildflowers and grass are eaten ' +
                'by rabbits and mice. Rabbits and mice are eaten by the snake and the hawk. The snake is ' +
                'eaten by the hawk. Select any card to remove that population.">' +
                parts.join('') + '</svg>';
            stageHost.querySelectorAll('.u3fw-node').forEach(g => {
                const pick = () => { if (checked) return; removed = g.dataset.sp; guesses = {}; render(); };
                g.addEventListener('click', pick);
                g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
            });
        }

        /* ---------- the prediction table ---------------------------- */
        function render() {
            if (!removed) {
                intro.innerHTML = '<p><strong>Pick one population and take it out of the web.</strong> ' +
                    'Click any card below to take that population out. Arrows point the way the energy travels — from the thing ' +
                    'eaten to the thing eating it.</p>';
                body.innerHTML = '';
                bCheck.disabled = true;
                readout.innerHTML = 'Nothing removed yet. Before you click, decide which removal you think ' +
                    'would change the most — and then test it.';
                drawWeb();
                return;
            }
            const res = resolve(removed);
            const others = KEYS.filter(k => k !== removed);
            intro.innerHTML = '<p>You removed the <strong>' + SPECIES[removed].name.toLowerCase() +
                '</strong>. Before anything is revealed, say what happens to each of the others. ' +
                'Use <strong>&#9650;</strong> for up, <strong>&#9660;</strong> for down and ' +
                '<strong>&ndash;</strong> for barely changes.</p>';

            let html = '<table class="u3fw-table"><tr><th style="width:26%">Population</th>' +
                '<th style="width:20%">Your prediction</th><th>' +
                (checked ? 'What the model does' : 'Revealed after you check') + '</th></tr>';
            others.forEach(k => {
                const r = res[k];
                html += '<tr><td><strong>' + SPECIES[k].name + '</strong><div class="u3fw-why">' +
                    SPECIES[k].level + '</div></td><td><div class="u3fw-picks" data-row="' + k + '">' +
                    GUESSES.map(g => {
                        const sym = g === 'up' ? '&#9650;' : g === 'down' ? '&#9660;' : '&ndash;';
                        let cls = 'u3fw-pick';
                        if (checked && guesses[k] === g) cls += matches(g, r.code) ? ' right' : ' wrong';
                        return '<button type="button" class="' + cls + '" data-g="' + g + '" aria-label="' +
                            LABEL[g] + '" aria-pressed="' + (guesses[k] === g ? 'true' : 'false') + '">' +
                            sym + '</button>';
                    }).join('') + '</div></td><td>';
                if (checked) {
                    const dirCls = (r.code === 'up' || r.code === 'up-mixed') ? 'up'
                        : (r.code === 'down' || r.code === 'down-mixed') ? 'down' : '';
                    html += '<span class="u3fw-ans ' + dirCls + '">' + LABEL[r.code] + '</span>' +
                        '<div class="u3fw-why">' + (r.why.length
                            ? r.why.join('; ') + '.'
                            : 'no path in this web connects it to the removal within two steps.') + '</div>';
                } else html += '<span class="u3fw-why">&mdash;</span>';
                html += '</td></tr>';
            });
            html += '</table>';
            body.innerHTML = html;

            body.querySelectorAll('.u3fw-picks').forEach(row => {
                row.querySelectorAll('.u3fw-pick').forEach(b => {
                    b.addEventListener('click', () => {
                        if (checked) return;
                        guesses[row.dataset.row] = b.dataset.g;
                        render();
                    });
                });
            });

            const done = others.every(k => guesses[k]);
            bCheck.disabled = checked || !done;

            if (!checked) {
                readout.innerHTML = 'Predictions made: <strong>' +
                    others.filter(k => guesses[k]).length + ' of ' + others.length + '</strong>. ' +
                    (done ? 'Now check them.' : 'Commit to every one before you check — a guess you have ' +
                    'written down is worth ten you have not.');
            } else {
                const score = others.filter(k => matches(guesses[k], res[k].code)).length;
                const mixed = others.filter(k => res[k].code === 'both' || /mixed/.test(res[k].code));
                readout.innerHTML = '<strong>' + score + ' of ' + others.length + '</strong> matched the model.' +
                    (mixed.length
                        ? ' Look hardest at <strong>' + mixed.map(k => SPECIES[k].many).join(' and ') +
                          '</strong>: the model pushes ' + (mixed.length === 1 ? 'it' : 'them') +
                          ' in two directions at once and refuses to pick. That is not the model failing. ' +
                          'It is the honest answer, and it is why ecologists have to go and measure a ' +
                          'removal rather than reason it out at a desk.'
                        : ' Every effect in this removal points one way — which is unusual. Try removing ' +
                          'the hawk or the snake and watch the arithmetic argue with itself.') +
                    '<br>Remember what this model does <em>not</em> include: how fast each population ' +
                    'breeds, whether any species can switch to another food, and anything outside these ' +
                    'six populations. A real web has hundreds.';
            }
            drawWeb();
        }

        render();

        /* ---------- verification hooks ------------------------------- */
        root._simState = () => {
            const res = removed ? resolve(removed) : null;
            const others = KEYS.filter(k => k !== removed);
            return {
                removed, checked,
                guesses: Object.assign({}, guesses),
                model: res ? others.reduce((a, k) => (a[k] = res[k].code, a), {}) : null,
                score: (checked && res) ? others.filter(k => matches(guesses[k], res[k].code)).length : null,
                outOf: removed ? others.length : null
            };
        };
        root._simSolve = () => {
            removed = removed || 'snake';
            const res = resolve(removed);
            KEYS.filter(k => k !== removed).forEach(k => {
                const c = res[k].code;
                guesses[k] = (c === 'up' || c === 'up-mixed') ? 'up'
                    : (c === 'down' || c === 'down-mixed') ? 'down' : 'flat';
            });
            checked = true; render();
            return root._simState();
        };
    };
})();
