/* =============================================================
   INTERACTIVE — Sort the mammals by lineage and by niche
   -------------------------------------------------------------
   Registers window.SIMS['convergent'].  Supports HS-LS4-4.

   Replaces the old convergent-evolution table image. The artwork is
   the same twelve animals, cut out individually so the reader has to
   place each one rather than read a finished table.

   Two decisions per tile, and they test different things:
     - the COLUMN is lineage, which the reader can only get from
       knowing (or working out) that a numbat is a marsupial;
     - the ROW is niche, which the reader gets by looking at the
       body — which is exactly the skill this standard asks for.

   The payoff is deliberately withheld until the grid is full: once
   both columns are complete, each row holds two animals that look
   almost the same and are barely related. Reading the finished grid
   across is the whole lesson.

   Works by drag-and-drop, by click-then-click, and from the keyboard.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-convergent-style';

    // Images live beside the chapter, not beside this file.
    const ROOT = (document.body && document.body.dataset.root) || '';
    const IMG = k => ROOT + 'images/u6/convergent/' + k + '.png';

    // Row order is fixed — smallest, most specialised niche first, so the
    // grid reads from "buried in soil" out to "running in the open".
    const NICHES = [
        { key: 'burrow', label: 'Burrowing insect-eater',
          cue: 'push through soil with spade-shaped front claws' },
        { key: 'ants',   label: 'Ant and termite eater',
          cue: 'rip open a nest and reach in with a long sticky tongue' },
        { key: 'forage', label: 'Small night forager',
          cue: 'dart about after dark for seeds and insects' },
        { key: 'glide',  label: 'Tree glider',
          cue: 'glide between trees on a flap of skin' },
        { key: 'stalk',  label: 'Spotted ambush hunter',
          cue: 'climb well and ambush small prey' },
        { key: 'chase',  label: 'Open-ground chaser',
          cue: 'run down larger prey in the open' }
    ];

    const LINEAGES = {
        P: { label: 'Placental mammals', article: 'a placental mammal',
             why: 'its young grow inside the mother, fed through a placenta' },
        M: { label: 'Australian marsupials', article: 'a marsupial',
             why: 'its young are born tiny and finish growing in a pouch' }
    };

    const ANIMALS = [
        { key: 'mole',            name: 'Mole',            line: 'P', niche: 'burrow' },
        { key: 'marsupial-mole',  name: 'Marsupial mole',  line: 'M', niche: 'burrow' },
        { key: 'anteater',        name: 'Giant anteater',  line: 'P', niche: 'ants'   },
        { key: 'numbat',          name: 'Numbat',          line: 'M', niche: 'ants'   },
        { key: 'mouse',           name: 'Mouse',           line: 'P', niche: 'forage' },
        { key: 'marsupial-mouse', name: 'Marsupial mouse', line: 'M', niche: 'forage' },
        { key: 'flying-squirrel', name: 'Flying squirrel', line: 'P', niche: 'glide'  },
        { key: 'sugar-glider',    name: 'Sugar glider',    line: 'M', niche: 'glide'  },
        { key: 'ocelot',          name: 'Ocelot',          line: 'P', niche: 'stalk'  },
        { key: 'quoll',           name: 'Quoll',           line: 'M', niche: 'stalk'  },
        { key: 'wolf',            name: 'Grey wolf',       line: 'P', niche: 'chase'  },
        { key: 'thylacine',       name: 'Thylacine',       line: 'M', niche: 'chase'  }
    ];

    // Shown once the grid is complete and correct, one line per row.
    const ROW_NOTES = {
        burrow: 'The marsupial mole has no working eyes at all — it lost them underground, ' +
                'just as cave animals do. Neither animal inherited that shape from the other.',
        ants:   'The numbat is barely the size of a squirrel and the anteater is bigger than a ' +
                'dog. Convergence copies the <em>shape</em> the job needs, not the size.',
        forage: 'These two are the hardest pair to tell apart, and they are the most distantly ' +
                'related mammals on this grid that look alike.',
        glide:  'Both stretched a flap of skin between wrist and ankle. Neither can truly fly — ' +
                'they glide, and steer with a long flat tail.',
        stalk:  'Spots break up an outline in dappled light. Two lineages arrived at the same ' +
                'camouflage because they hunt in the same kind of place.',
        chase:  'The thylacine is the sharpest case of all. Its skull is so wolf-like that ' +
                'students routinely mistake the two. The last one died in 1936.'
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.cv { padding: 1rem 1.25rem 0.25rem; }',
            '.cv { --cv-ok:#2e7d32; --cv-ok-bg:rgba(46,125,50,0.10);',
            '      --cv-bad:#aa272f; --cv-bad-bg:rgba(170,39,47,0.09); }',
            '[data-theme="sepia"] .cv { --cv-ok:#4a6b3d; --cv-ok-bg:rgba(74,107,61,0.12);',
            '      --cv-bad:#a04040; --cv-bad-bg:rgba(160,64,64,0.10); }',
            '[data-theme="dark"] .cv { --cv-ok:#7fc98a; --cv-ok-bg:rgba(127,201,138,0.14);',
            '      --cv-bad:#e08a90; --cv-bad-bg:rgba(224,138,144,0.13); }',
            '.cv-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.75rem; }',

            '.cv-bank { display:flex; gap:0.4rem; flex-wrap:wrap; justify-content:center;',
            '   min-height:96px; align-items:center; margin-bottom:1rem; padding:0.5rem;',
            '   border:1.5px dashed var(--border); border-radius:10px; }',
            '.cv-bank-empty { font-size:0.78rem; color:var(--text-secondary); font-style:italic; }',
            '.cv-tile { font:inherit; cursor:grab; padding:0.3rem 0.35rem 0.25rem; width:104px;',
            '   border:1px solid var(--border); border-radius:9px; background:var(--bg);',
            '   color:var(--text); transition:all 0.15s; touch-action:manipulation;',
            '   display:flex; flex-direction:column; align-items:center; gap:0.15rem; }',
            '.cv-tile img { width:100%; height:44px; object-fit:contain; pointer-events:none; }',
            '.cv-tile .cv-nm { font-size:0.66rem; font-weight:600; line-height:1.2;',
            '   text-align:center; }',
            '.cv-tile:hover { border-color:var(--light-teal); }',
            '.cv-tile:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.cv-tile[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); background:var(--bg-surface); }',
            '.cv-tile.cv-dragging { opacity:0.45; }',

            '.cv-grid { display:grid; grid-template-columns:minmax(96px,0.9fr) 1fr 1fr;',
            '   gap:0.4rem; align-items:stretch; }',
            '.cv-head { font-size:0.68rem; font-weight:700; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); padding:0 0 0.15rem;',
            '   align-self:end; text-align:center; }',
            '.cv-rowlab { font-size:0.72rem; font-weight:600; line-height:1.25;',
            '   display:flex; align-items:center; padding:0.3rem 0.1rem; }',
            '.cv-slot { font:inherit; cursor:pointer; min-height:82px; width:100%;',
            '   border:1.5px dashed var(--border); border-radius:9px; background:transparent;',
            '   color:var(--text-secondary); touch-action:manipulation; padding:0.3rem;',
            '   display:flex; flex-direction:column; align-items:center; justify-content:center;',
            '   gap:0.15rem; transition:all 0.15s; }',
            '.cv-slot img { width:100%; height:42px; object-fit:contain; pointer-events:none; }',
            '.cv-slot .cv-nm { font-size:0.66rem; font-weight:600; text-align:center;',
            '   line-height:1.2; }',
            '.cv-slot:hover { border-color:var(--light-teal); color:var(--text); }',
            '.cv-slot:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.cv-slot.cv-over { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); }',
            '.cv-slot.cv-filled { border-style:solid; color:var(--text); }',
            '.cv-slot.cv-right { border-color:var(--cv-ok); background:var(--cv-ok-bg); }',
            '.cv-slot.cv-wrong { border-color:var(--cv-bad); background:var(--cv-bad-bg); }',

            '.cv-msg { margin:0.85rem 0 0; font-size:0.82rem; line-height:1.5;',
            '   min-height:2.6em; }',
            '.cv-msg.cv-is-ok { color:var(--cv-ok); }',
            '.cv-msg.cv-is-bad { color:var(--cv-bad); }',
            '.cv-count { font-size:0.72rem; color:var(--text-secondary); margin:0.5rem 0 0; }',
            '.cv-reveal { margin-top:1rem; border:1px solid var(--cv-ok); border-radius:10px;',
            '   background:var(--cv-ok-bg); padding:0.85rem 1rem; }',
            '.cv-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.cv-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.cv-reveal ul { margin:0.4rem 0 0; padding-left:1.1rem; }',
            '.cv-reveal li { font-size:0.8rem; line-height:1.5; margin-bottom:0.35rem; }',

            '@media (max-width:560px) {',
            '   .cv-grid { grid-template-columns:1fr 1fr; }',
            // Two columns, not three: the empty corner cell would otherwise
            // shunt both headings one cell left and label the wrong columns.
            '   .cv-grid > .cv-head:first-child { display:none; }',
            '   .cv-rowlab { grid-column:1 / -1; padding-top:0.5rem;',
            '      border-top:1px solid var(--border); }',
            '   .cv-tile { width:86px; }',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function shuffled(list) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const byKey = k => ANIMALS.filter(a => a.key === k)[0];

    window.SIMS['convergent'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'cv');
        const how = U.el('p', 'cv-how');
        how.textContent = 'Put every animal in the right row and the right column. Drag it, or ' +
            'click the animal and then click a space. Two decisions each time: which row does ' +
            'its body suit, and which group does it belong to. Click a placed animal to take it back.';

        const bank = U.el('div', 'cv-bank');
        bank.setAttribute('role', 'group');
        bank.setAttribute('aria-label', 'Twelve mammals waiting to be sorted');

        const grid = U.el('div', 'cv-grid');
        const msg = U.el('p', 'cv-msg');
        msg.setAttribute('role', 'status');
        msg.setAttribute('aria-live', 'polite');
        const count = U.el('p', 'cv-count');
        const revealHost = U.el('div');

        wrap.appendChild(how);
        wrap.appendChild(bank);
        wrap.appendChild(grid);
        wrap.appendChild(msg);
        wrap.appendChild(count);
        wrap.appendChild(revealHost);
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const resetBtn = U.button(buttons, 'Shuffle and start again');
        wrap.appendChild(buttons);

        // ----- state -----
        // placed: slotId ('burrow:P') -> animal key.  order: keys still in the bank.
        let placed = {};
        let order = [];
        let selected = null;

        const slotId = (niche, line) => niche + ':' + line;

        function reset() {
            placed = {};
            order = shuffled(ANIMALS.map(a => a.key));
            selected = null;
            msg.textContent = '';
            msg.className = 'cv-msg';
            revealHost.innerHTML = '';
            render();
        }

        function correctCount() {
            let n = 0;
            Object.keys(placed).forEach(id => {
                const a = byKey(placed[id]);
                const parts = id.split(':');
                if (a.niche === parts[0] && a.line === parts[1]) n++;
            });
            return n;
        }

        function place(animalKey, niche, line) {
            const id = slotId(niche, line);
            if (placed[id]) return;                       // occupied — ignore
            const a = byKey(animalKey);
            placed[id] = animalKey;
            order = order.filter(k => k !== animalKey);
            selected = null;

            const rightRow = a.niche === niche;
            const rightCol = a.line === line;

            if (rightRow && rightCol) {
                say('ok', 'Yes — the ' + a.name.toLowerCase() + ' is ' +
                    LINEAGES[a.line].article + ' built to ' +
                    NICHES.filter(n => n.key === a.niche)[0].cue + '.');
            } else if (!rightCol) {
                // Getting the column wrong is a lineage error, and it is the one
                // worth naming plainly — the body shape gave no clue either way.
                say('bad', 'Right idea about the body, but wrong group. The ' +
                    a.name.toLowerCase() + ' is ' + LINEAGES[a.line].article + ' — ' +
                    LINEAGES[a.line].why + '. That is what makes the resemblance ' +
                    'surprising rather than expected.');
            } else {
                const own = NICHES.filter(n => n.key === a.niche)[0];
                const got = NICHES.filter(n => n.key === niche)[0];
                say('bad', 'Look at the body again. The ' + a.name.toLowerCase() +
                    ' is built to ' + own.cue + ', not to ' + got.cue + '.');
            }
            render();
        }

        function takeBack(id) {
            const key = placed[id];
            if (!key) return;
            delete placed[id];
            order.push(key);
            msg.textContent = '';
            msg.className = 'cv-msg';
            revealHost.innerHTML = '';
            render();
        }

        function say(kind, text) {
            msg.textContent = text;
            msg.className = 'cv-msg ' + (kind === 'ok' ? 'cv-is-ok' : 'cv-is-bad');
        }

        function select(key) {
            selected = selected === key ? null : key;
            render();
        }

        function tileFace(a) {
            return '<img src="' + IMG(a.key) + '" alt=""><span class="cv-nm">' + a.name + '</span>';
        }

        function render() {
            // ---- bank ----
            bank.innerHTML = '';
            if (!order.length) {
                const e = U.el('span', 'cv-bank-empty');
                e.textContent = 'All twelve placed. Now read each row across.';
                bank.appendChild(e);
            }
            order.forEach(key => {
                const a = byKey(key);
                const b = U.el('button', 'cv-tile');
                b.type = 'button';
                b.draggable = true;
                b.innerHTML = tileFace(a);
                b.setAttribute('aria-pressed', selected === key ? 'true' : 'false');
                b.setAttribute('aria-label', a.name + ', not yet placed');
                b.addEventListener('click', () => select(key));
                b.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('text/plain', key);
                    e.dataTransfer.effectAllowed = 'move';
                    b.classList.add('cv-dragging');
                    selected = key;
                });
                b.addEventListener('dragend', () => b.classList.remove('cv-dragging'));
                bank.appendChild(b);
            });

            // ---- grid ----
            grid.innerHTML = '';
            const corner = U.el('div', 'cv-head');
            grid.appendChild(corner);
            ['P', 'M'].forEach(l => {
                const h = U.el('div', 'cv-head');
                h.textContent = LINEAGES[l].label;
                grid.appendChild(h);
            });

            NICHES.forEach(n => {
                const lab = U.el('div', 'cv-rowlab');
                lab.textContent = n.label;
                grid.appendChild(lab);

                ['P', 'M'].forEach(l => {
                    const id = slotId(n.key, l);
                    const key = placed[id];
                    const slot = U.el('button', 'cv-slot');
                    slot.type = 'button';

                    if (key) {
                        const a = byKey(key);
                        const ok = a.niche === n.key && a.line === l;
                        slot.innerHTML = tileFace(a);
                        slot.classList.add('cv-filled', ok ? 'cv-right' : 'cv-wrong');
                        slot.setAttribute('aria-label', a.name + ' placed in ' + n.label +
                            ', ' + LINEAGES[l].label + '. ' + (ok ? 'Correct.' : 'Not correct.') +
                            ' Activate to take it back.');
                        slot.addEventListener('click', () => takeBack(id));
                    } else {
                        slot.textContent = '';
                        slot.setAttribute('aria-label', 'Empty space: ' + n.label + ', ' +
                            LINEAGES[l].label);
                        slot.addEventListener('click', () => {
                            if (selected) place(selected, n.key, l);
                        });
                    }

                    slot.addEventListener('dragover', e => {
                        if (placed[id]) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        slot.classList.add('cv-over');
                    });
                    slot.addEventListener('dragleave', () => slot.classList.remove('cv-over'));
                    slot.addEventListener('drop', e => {
                        e.preventDefault();
                        slot.classList.remove('cv-over');
                        const k = e.dataTransfer.getData('text/plain');
                        if (k && !placed[id]) place(k, n.key, l);
                    });

                    grid.appendChild(slot);
                });
            });

            // ---- progress + payoff ----
            const n = correctCount();
            count.textContent = n + ' of 12 in the right place.';
            if (n === 12) showReveal();
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const d = U.el('div', 'cv-reveal');
            d.innerHTML =
                '<h5>Now read the grid across, not down.</h5>' +
                '<p>Every row holds two animals that look alike and hunt or dig or glide the ' +
                'same way — and whose last common ancestor lived <strong>more than 100 million ' +
                'years ago</strong>. Australia broke away, and its marsupials solved the same ' +
                'set of problems all over again, from a completely separate starting point.</p>' +
                '<p>That is why these look-alike features are <strong>analogous</strong>, not ' +
                'homologous. The mole and the marsupial mole did not inherit their digging ' +
                'claws from a shared digging ancestor. Similar pressure, similar answer, ' +
                'separate history.</p>' +
                '<ul>' + NICHES.map(x =>
                    '<li><strong>' + x.label + '</strong> — ' + ROW_NOTES[x.key] + '</li>'
                ).join('') + '</ul>';
            revealHost.appendChild(d);
            msg.textContent = 'All twelve correct.';
            msg.className = 'cv-msg cv-is-ok';
        }

        resetBtn.addEventListener('click', reset);
        reset();

        // Console hook, same contract as the other sims in this course.
        root._simState = () => ({
            placed: Object.assign({}, placed),
            inBank: order.slice(),
            correct: correctCount(),
            complete: correctCount() === 12
        });
        root._simSolve = () => {                     // verification helper
            placed = {};
            ANIMALS.forEach(a => { placed[slotId(a.niche, a.line)] = a.key; });
            order = [];
            render();
        };
    };
})();
