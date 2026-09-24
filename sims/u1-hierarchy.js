/* =============================================================
   INTERACTIVE — Build the hierarchy of organisation
   -------------------------------------------------------------
   Registers window.SIMS['u1-hierarchy'].  Supports HS-LS1-2.

   Three phases, because the learning target has three parts:
     PHASE 1 "order"  — put the eight levels in order, smallest to
       largest. The reader must commit the whole ladder before any
       marking appears, so the ordering is a claim, not a guess
       corrected one rung at a time.
     PHASE 2 "map"    — take a real body and drop eight concrete
       examples onto the ladder they just built. Two bodies are
       offered, because a hierarchy that only works for a human is
       not a model of anything.
     PHASE 3 "limits" — the same model, tested against a case it
       does not fit. That is target #5: distinguishing the accuracy
       of a model from the thing it represents.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u1-hierarchy-style';

    /* The ladder, smallest first. `what` is the definition the reader
       gets once the rung is correct — the sim teaches, it does not
       merely mark. */
    const LEVELS = [
        { key: 'atom',    label: 'Atom',        what: 'The smallest unit of an element. Carbon, hydrogen, oxygen, nitrogen.' },
        { key: 'molecule',label: 'Molecule',    what: 'Two or more atoms bonded together. Water, glucose, a protein.' },
        { key: 'organelle',label: 'Organelle',  what: 'A structure inside a cell that does one job. A mitochondrion, a nucleus.' },
        { key: 'cell',    label: 'Cell',        what: 'The smallest thing that is itself alive. Everything below this rung is not.' },
        { key: 'tissue',  label: 'Tissue',      what: 'A group of similar cells working together on the same job.' },
        { key: 'organ',   label: 'Organ',       what: 'Several tissues combined into a structure with one overall function.' },
        { key: 'system',  label: 'Organ system',what: 'Organs that co-operate on one large task, such as digestion.' },
        { key: 'organism',label: 'Organism',    what: 'One complete living individual — all the systems together.' }
    ];

    /* Two bodies. The second is deliberately not a human and not an
       animal, so the reader has to test the model rather than recall
       the human answer. */
    const BODIES = {
        human: {
            name: 'You, eating lunch',
            items: {
                atom: 'a carbon atom',
                molecule: 'a glucose molecule',
                organelle: 'a mitochondrion',
                cell: 'one cell lining the small intestine',
                tissue: 'the epithelium lining the small intestine',
                organ: 'the small intestine',
                system: 'the digestive system',
                organism: 'you'
            }
        },
        oak: {
            name: 'An oak tree in summer',
            items: {
                atom: 'a magnesium atom',
                molecule: 'a chlorophyll molecule',
                organelle: 'a chloroplast',
                cell: 'one palisade cell',
                tissue: 'the palisade mesophyll',
                organ: 'a leaf',
                system: 'the shoot system — leaves, stems and buds',
                organism: 'the oak tree'
            }
        }
    };

    /* Phase 3. Each claim is either a fair use of the model or a place
       the model breaks. Reader commits before the reasoning appears. */
    const LIMITS = [
        {
            text: 'A red blood cell has no nucleus and no mitochondria, so it has no organelle rung.',
            fits: false,
            why: 'The model says every cell contains organelles. A mature red blood cell has pushed almost all of them out to make room for haemoglobin. The cell is still alive and still works — so the rung is missing, and the model is wrong about this cell. That does not make the model useless; it makes it a model.'
        },
        {
            text: 'Blood is a tissue, even though it pours.',
            fits: true,
            why: 'Awkward, but the model holds. A tissue is a group of cells working together on the same job, and blood is exactly that — the definition never mentioned being solid. The surprise here is in your picture of a tissue, not in the model.'
        },
        {
            text: 'A virus sits between the molecule rung and the cell rung.',
            fits: false,
            why: 'There is no rung between them, and that is the point. A virus is a bundle of molecules with no cell, no metabolism and no way to reproduce on its own. The hierarchy has no space for it because the hierarchy is a model of living things.'
        },
        {
            text: 'The pancreas belongs to the digestive system and to the endocrine system at once.',
            fits: false,
            why: 'The ladder draws each organ inside exactly one system. The pancreas releases digestive enzymes into the small intestine and releases insulin into the blood, so it genuinely belongs to two. Real bodies overlap; the diagram cannot.'
        },
        {
            text: 'The bacteria in your gut are not on your ladder at all.',
            fits: true,
            why: 'Correct, and the model is right to leave them out — each of them is a separate organism with its own ladder. But they change how well your digestion works, which is a reminder that the boundary you draw around "one organism" is a choice you made, not something the body announces.'
        }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.hier { padding: 1rem 1.25rem 0.25rem; --h-ok:#2e7d32; --h-bad:#aa272f; --h-accent:var(--light-teal); }',
            '[data-theme="dark"] .hier { --h-ok:#7fc98a; --h-bad:#e08a90; }',
            '[data-theme="sepia"] .hier { --h-ok:#4a6b3d; --h-bad:#a04040; }',
            '.hier-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; line-height:1.5; }',
            '.hier-phase { font-size:0.62rem; font-weight:700; letter-spacing:0.09em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.5rem; }',
            '.hier-ladder { display:flex; flex-direction:column-reverse; gap:4px; margin:0 0 0.6rem; }',
            '.hier-rung { display:flex; align-items:stretch; gap:0.5rem; }',
            '.hier-num { flex:none; width:1.6rem; font-size:0.7rem; font-weight:700; color:var(--text-secondary);',
            '   display:flex; align-items:center; justify-content:flex-end; }',
            '.hier-slot { flex:1; min-height:38px; border:1.5px dashed var(--border); border-radius:8px;',
            '   background:transparent; font:inherit; color:var(--text-secondary); cursor:pointer;',
            '   display:flex; align-items:center; padding:0.3rem 0.7rem; text-align:left;',
            '   font-size:0.85rem; transition:all 0.12s; width:100%; }',
            '.hier-slot:hover { border-color:var(--h-accent); }',
            '.hier-slot:focus-visible { outline:2px solid var(--h-accent); outline-offset:2px; }',
            '.hier-slot.filled { border-style:solid; border-color:var(--h-accent); color:var(--text); font-weight:600; }',
            '.hier-slot.right { border-color:var(--h-ok); background:rgba(46,125,50,0.10); color:var(--text); }',
            '.hier-slot.wrong { border-color:var(--h-bad); background:rgba(170,39,47,0.08); color:var(--text); }',
            '.hier-slot b { font-weight:700; }',
            '.hier-slot small { display:block; font-weight:400; font-size:0.72rem;',
            '   color:var(--text-secondary); line-height:1.35; margin-top:0.1rem; }',
            '.hier-pool { display:flex; flex-wrap:wrap; gap:0.4rem; margin:0.9rem 0 0.3rem; }',
            '.hier-tile { font:inherit; font-size:0.82rem; cursor:pointer; padding:0.4rem 0.7rem;',
            '   border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); }',
            '.hier-tile:hover { border-color:var(--h-accent); }',
            '.hier-tile:focus-visible { outline:2px solid var(--h-accent); outline-offset:2px; }',
            '.hier-tile[aria-pressed="true"] { border-color:var(--h-accent); box-shadow:0 0 0 2px var(--h-accent); }',
            '.hier-label { font-size:0.62rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;',
            '   color:var(--text-secondary); margin:0.7rem 0 0.25rem; }',
            '.hier-msg { margin:0.85rem 0 0; font-size:0.82rem; line-height:1.55; min-height:2.4em; }',
            '.hier-msg.ok { color:var(--h-ok); } .hier-msg.bad { color:var(--h-bad); }',
            '.hier-reveal { margin-top:1rem; border:1px solid var(--h-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .hier-reveal { background:rgba(127,201,138,0.12); }',
            '.hier-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.hier-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.hier-reveal p:last-child { margin-bottom:0; }',
            '.hier-claim { border:1px solid var(--border); border-radius:10px; padding:0.75rem 0.9rem;',
            '   margin:0 0 0.7rem; }',
            '.hier-claim p { margin:0 0 0.55rem; font-size:0.87rem; line-height:1.5; }',
            '.hier-claim .hier-why { font-size:0.82rem; color:var(--text-secondary); margin:0.55rem 0 0;',
            '   line-height:1.55; }',
            '.hier-claim.done { border-color:var(--h-accent); }',
            '.hier-count { font-size:0.72rem; color:var(--text-secondary); margin:0.5rem 0 0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    const shuffled = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);

    window.SIMS['u1-hierarchy'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'hier');
        const phaseLab = U.el('p', 'hier-phase');
        const how = U.el('p', 'hier-how');
        const stage = U.el('div');
        const msg = U.el('p', 'hier-msg');
        msg.setAttribute('role', 'status');
        msg.setAttribute('aria-live', 'polite');
        const count = U.el('p', 'hier-count');
        const revealHost = U.el('div');
        wrap.appendChild(phaseLab); wrap.appendChild(how); wrap.appendChild(stage);
        wrap.appendChild(msg); wrap.appendChild(count); wrap.appendChild(revealHost);
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const checkBtn = U.button(buttons, 'Check my ladder', 'primary');
        const nextBtn = U.button(buttons, 'Next');
        const swapBtn = U.button(buttons, 'Try the oak tree');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        // ---------------- state ----------------
        let phase = 'order';           // order | map | limits
        let order = new Array(8).fill(null);   // level keys, index 0 = smallest rung
        let orderPool = [];
        let marked = false;            // has the reader committed this phase?
        let body = 'human';
        let map = new Array(8).fill(null);     // example strings
        let mapPool = [];
        let selected = null;
        let answers = {};              // phase 3: index -> boolean

        function reset() {
            phase = 'order';
            order = new Array(8).fill(null);
            orderPool = shuffled(LEVELS.map(l => l.key));
            marked = false; selected = null;
            body = 'human'; map = new Array(8).fill(null); mapPool = [];
            answers = {};
            revealHost.innerHTML = '';
            msg.textContent = ''; msg.className = 'hier-msg';
            render();
        }

        function loadBody(which) {
            body = which;
            map = new Array(8).fill(null);
            mapPool = shuffled(LEVELS.map(l => BODIES[which].items[l.key]));
            marked = false; selected = null;
            render();
        }

        const orderRight = () => order.every((k, i) => k === LEVELS[i].key);
        const mapRight = () => map.every((v, i) => v === BODIES[body].items[LEVELS[i].key]);
        const orderFull = () => order.every(Boolean);
        const mapFull = () => map.every(Boolean);

        // ---------------- building blocks ----------------
        function ladder(arr, pool, correctAt, describeAt) {
            const box = U.el('div', 'hier-ladder');
            for (let i = 0; i < 8; i++) {
                const row = U.el('div', 'hier-rung');
                const n = U.el('span', 'hier-num');
                n.textContent = (i + 1);
                const slot = U.el('button', 'hier-slot');
                slot.type = 'button';
                const val = arr[i];
                if (val) {
                    slot.classList.add('filled');
                    if (marked) slot.classList.add(val === correctAt(i) ? 'right' : 'wrong');
                    const d = marked && val === correctAt(i) ? describeAt(i) : '';
                    slot.innerHTML = '<span><b>' + esc(val) + '</b>' +
                        (d ? '<small>' + esc(d) + '</small>' : '') + '</span>';
                    slot.setAttribute('aria-label', 'Rung ' + (i + 1) + ': ' + val +
                        (marked ? (val === correctAt(i) ? ', correct' : ', not correct') : '') +
                        '. Activate to take it back.');
                    slot.addEventListener('click', () => { takeBack(arr, pool, i); });
                } else {
                    slot.textContent = 'rung ' + (i + 1) + ' — empty';
                    slot.setAttribute('aria-label', 'Rung ' + (i + 1) + ' is empty. ' +
                        (selected ? 'Activate to place ' + selected + ' here.' : 'Choose a card first.'));
                    slot.addEventListener('click', () => { if (selected) put(arr, pool, i, selected); });
                }
                row.appendChild(n); row.appendChild(slot);
                box.appendChild(row);
            }
            return box;
        }

        function put(arr, pool, i, value) {
            arr[i] = value;
            const p = pool.indexOf(value);
            if (p > -1) pool.splice(p, 1);
            selected = null;
            marked = false;
            msg.textContent = ''; msg.className = 'hier-msg';
            render();
        }
        function takeBack(arr, pool, i) {
            if (!arr[i]) return;
            pool.push(arr[i]);
            arr[i] = null;
            marked = false;
            msg.textContent = ''; msg.className = 'hier-msg';
            render();
        }

        function poolRow(pool, labelText) {
            const host = U.el('div');
            const lab = U.el('p', 'hier-label');
            lab.textContent = labelText;
            host.appendChild(lab);
            const row = U.el('div', 'hier-pool');
            if (!pool.length) {
                const done = U.el('p', 'hier-count');
                done.textContent = 'All placed. Now commit to your ordering.';
                host.appendChild(done);
                return host;
            }
            pool.forEach(v => {
                const t = U.el('button', 'hier-tile');
                t.type = 'button';
                t.textContent = v;
                t.setAttribute('aria-pressed', selected === v ? 'true' : 'false');
                t.addEventListener('click', () => { selected = selected === v ? null : v; render(); });
                row.appendChild(t);
            });
            host.appendChild(row);
            return host;
        }

        // ---------------- render ----------------
        function render() {
            stage.innerHTML = '';
            checkBtn.hidden = true; nextBtn.hidden = true; swapBtn.hidden = true;

            if (phase === 'order') {
                phaseLab.textContent = 'Step 1 of 3 — order the levels';
                how.textContent = 'Put all eight levels of organisation in order, smallest at the bottom. ' +
                    'Choose a card, then choose a rung. Nothing is marked until you press ' +
                    '“Check my ladder”, so decide on the whole ordering before you commit to it.';
                stage.appendChild(ladder(order, orderPool,
                    i => LEVELS[i].key,
                    i => LEVELS[i].what));
                stage.appendChild(poolRow(orderPool, 'Levels still to place'));
                count.textContent = order.filter(Boolean).length + ' of 8 rungs filled.';
                checkBtn.hidden = false;
                nextBtn.hidden = !(marked && orderRight());
                nextBtn.textContent = 'Now use it on a real body';

            } else if (phase === 'map') {
                phaseLab.textContent = 'Step 2 of 3 — put a real body on the ladder';
                how.textContent = BODIES[body].name + '. Each card below is a real thing at one of the ' +
                    'eight levels. Place every card on the rung it belongs to, then commit. ' +
                    'The rung labels are fixed now — you built them.';
                const box = U.el('div', 'hier-ladder');
                for (let i = 0; i < 8; i++) {
                    const row = U.el('div', 'hier-rung');
                    const n = U.el('span', 'hier-num');
                    n.textContent = LEVELS[i].label;
                    n.style.width = '6.5rem';
                    n.style.justifyContent = 'flex-end';
                    const slot = U.el('button', 'hier-slot');
                    slot.type = 'button';
                    const val = map[i];
                    const want = BODIES[body].items[LEVELS[i].key];
                    if (val) {
                        slot.classList.add('filled');
                        if (marked) slot.classList.add(val === want ? 'right' : 'wrong');
                        slot.textContent = val;
                        slot.setAttribute('aria-label', LEVELS[i].label + ': ' + val +
                            (marked ? (val === want ? ', correct' : ', not correct') : ''));
                        slot.addEventListener('click', () => takeBack(map, mapPool, i));
                    } else {
                        slot.textContent = 'empty';
                        slot.setAttribute('aria-label', LEVELS[i].label + ' is empty.');
                        slot.addEventListener('click', () => { if (selected) put(map, mapPool, i, selected); });
                    }
                    row.appendChild(n); row.appendChild(slot);
                    box.appendChild(row);
                }
                stage.appendChild(box);
                stage.appendChild(poolRow(mapPool, 'Cards still to place'));
                count.textContent = map.filter(Boolean).length + ' of 8 placed.';
                checkBtn.hidden = false;
                if (marked && mapRight()) {
                    swapBtn.hidden = body !== 'human';
                    swapBtn.textContent = 'Try the same ladder on an oak tree';
                    nextBtn.hidden = false;
                    nextBtn.textContent = 'Now test where the model breaks';
                }

            } else {
                phaseLab.textContent = 'Step 3 of 3 — how good is the model?';
                how.textContent = 'A model is useful and wrong at the same time. For each claim below, ' +
                    'decide whether your ladder handles it or whether the ladder breaks — then read why.';
                LIMITS.forEach((c, i) => {
                    const card = U.el('div', 'hier-claim' + (i in answers ? ' done' : ''));
                    const p = document.createElement('p');
                    p.textContent = c.text;
                    card.appendChild(p);
                    if (i in answers) {
                        const verdict = U.el('p', 'hier-count');
                        const got = answers[i] === c.fits;
                        verdict.innerHTML = '<strong style="color:var(--' + (got ? 'h-ok' : 'h-bad') + ')">' +
                            (got ? 'Yes — ' : 'Not quite — ') + '</strong>' +
                            'the model ' + (c.fits ? 'handles this.' : 'breaks here.');
                        card.appendChild(verdict);
                        const why = U.el('p', 'hier-why');
                        why.textContent = c.why;
                        card.appendChild(why);
                    } else {
                        const row = U.el('div', 'hier-pool');
                        [['The ladder handles this', true], ['The ladder breaks here', false]].forEach(([t, v]) => {
                            const b = U.el('button', 'hier-tile');
                            b.type = 'button'; b.textContent = t;
                            b.addEventListener('click', () => { answers[i] = v; render(); });
                            row.appendChild(b);
                        });
                        card.appendChild(row);
                    }
                    stage.appendChild(card);
                });
                const done = Object.keys(answers).length;
                count.textContent = done + ' of ' + LIMITS.length + ' judged.';
                if (done === LIMITS.length) showReveal();
            }
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const d = U.el('div', 'hier-reveal');
            d.innerHTML =
                '<h5>What you have actually built</h5>' +
                '<p>Two things came out of that. The first is the ladder itself: eight levels, each one ' +
                'made of the level below it, and each one able to do something the level below could not. ' +
                'A single intestinal cell cannot absorb a meal. A sheet of them can.</p>' +
                '<p>The second is more important, and it is the part people skip. Three of those five ' +
                'claims broke the model, and none of them broke the body. The pancreas really does sit in ' +
                'two systems; a red blood cell really has thrown its organelles away. The ladder is a ' +
                '<strong>model</strong> — a deliberately simplified picture, kept simple so you can reason ' +
                'with it. Knowing exactly where a model stops being true is not a criticism of the model. ' +
                'It is the difference between using one and believing one.</p>';
            revealHost.appendChild(d);
            msg.textContent = 'All five judged.';
            msg.className = 'hier-msg ok';
        }

        // ---------------- wiring ----------------
        checkBtn.addEventListener('click', () => {
            if (phase === 'order') {
                if (!orderFull()) {
                    msg.textContent = 'Fill all eight rungs first — a partial ladder cannot be judged.';
                    msg.className = 'hier-msg bad'; return;
                }
                marked = true;
                if (orderRight()) {
                    msg.textContent = 'Correct, all eight. Read the descriptions that have appeared — ' +
                        'notice that the jump from molecule to organelle to cell is where "not alive" ' +
                        'becomes "alive".';
                    msg.className = 'hier-msg ok';
                } else {
                    const wrongAt = order.findIndex((k, i) => k !== LEVELS[i].key);
                    const should = LEVELS[wrongAt];
                    msg.textContent = 'Not yet. The lowest rung that is out of place is rung ' + (wrongAt + 1) +
                        ' — that one should be "' + should.label + '". ' + should.what +
                        ' Move it and check again.';
                    msg.className = 'hier-msg bad';
                }
            } else if (phase === 'map') {
                if (!mapFull()) {
                    msg.textContent = 'Place all eight cards first.';
                    msg.className = 'hier-msg bad'; return;
                }
                marked = true;
                if (mapRight()) {
                    msg.textContent = 'All eight in the right place. Read up the ladder and notice that ' +
                        'nothing new is added between rungs — the same atoms are simply arranged into ' +
                        'bigger and bigger working units.';
                    msg.className = 'hier-msg ok';
                } else {
                    const bad = map.findIndex((v, i) => v !== BODIES[body].items[LEVELS[i].key]);
                    msg.textContent = 'Not yet. Look again at the ' + LEVELS[bad].label.toLowerCase() +
                        ' rung: ' + LEVELS[bad].what;
                    msg.className = 'hier-msg bad';
                }
            }
            render();
        });

        nextBtn.addEventListener('click', () => {
            if (phase === 'order') { phase = 'map'; loadBody('human'); }
            else if (phase === 'map') {
                phase = 'limits';
                msg.textContent = ''; msg.className = 'hier-msg';
                render();
            }
        });
        swapBtn.addEventListener('click', () => {
            loadBody('oak');
            msg.textContent = 'Same ladder, different organism. If the model is any good it should ' +
                'survive the change.';
            msg.className = 'hier-msg';
            render();
        });
        resetBtn.addEventListener('click', reset);

        reset();

        // ---------------- verification hooks ----------------
        root._simState = () => ({
            phase, body, marked,
            order: order.slice(),
            orderComplete: orderFull(), orderCorrect: orderRight(),
            map: map.slice(),
            mapComplete: mapFull(), mapCorrect: mapRight(),
            limitsJudged: Object.keys(answers).length,
            limitsCorrect: LIMITS.filter((c, i) => answers[i] === c.fits).length
        });
        root._simSolve = () => {
            if (phase === 'order') {
                order = LEVELS.map(l => l.key); orderPool = [];
            } else if (phase === 'map') {
                map = LEVELS.map(l => BODIES[body].items[l.key]); mapPool = [];
            } else {
                LIMITS.forEach((c, i) => { answers[i] = c.fits; });
            }
            marked = true; selected = null;
            render();
        };
    };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
})();
