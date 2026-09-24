/* =============================================================
   INTERACTIVE — Match each VIDA step to what is happening
   -------------------------------------------------------------
   Registers window.SIMS['vida-match'].  Supports HS-LS4-2.

   Replaces the old bunnies worksheet image. Four scenes describe one
   rabbit population over time; the reader has to put V, I, D and A
   onto the right scenes. The point is not recall of the four words —
   the SVG cycle and the table above already give those. The point is
   the order. A wrong placement says exactly why it is wrong, and the
   two placements this course cares most about catching — D or A on
   the scene where the rabbits merely differ — get told plainly that
   variation is there before the selection pressure arrives.

   Works by drag-and-drop, by click-then-click, and from the keyboard.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    const LETTERS = ['V', 'I', 'D', 'A'];

    const STEPS = {
        V: { name: 'Variation', full: 'Variation exists in populations' },
        I: { name: 'Inheritance', full: 'Inheritance of those variations' },
        D: { name: 'Differential survival', full: 'Differential survival and reproduction' },
        A: { name: 'Adaptation', full: 'Adaptation within the population' }
    };

    // Each scene is keyed by the step it actually shows.
    const SCENES = {
        V: {
            short: 'the varied meadow',
            text: 'Look at the rabbits in this meadow before anything else happens. ' +
                  'Their fur runs from pale sandy brown to dark brown, with every shade in between. ' +
                  'The differences are already there. No wolf has come near the field yet.'
        },
        I: {
            short: 'colour passed to the young',
            text: 'Fur colour is carried in the rabbits’ genes. Pale parents have pale young. ' +
                  'Dark parents have dark young. The colour is passed on — a rabbit does not ' +
                  'pick it up during its life.'
        },
        D: {
            short: 'the wolf hunting',
            text: 'A wolf begins hunting the meadow. The grass here is pale and dry, so the dark ' +
                  'rabbits are the easy ones to spot. The wolf catches more of them. More pale ' +
                  'rabbits live long enough to breed.'
        },
        A: {
            short: 'the meadow twenty generations on',
            text: 'Twenty generations later, count the rabbits again. Nearly all of them are pale. ' +
                  'Not one rabbit ever changed colour. What changed is the mix of colours in the ' +
                  'whole population.'
        }
    };

    // WHY[letterPlaced][stepTheSceneActuallyShows]
    const WHY = {
        V: {
            I: 'This scene is about where the colour <em>comes from</em>, not about rabbits being ' +
               'different. V is the scene where you can still see a whole range of fur colours in ' +
               'one population.',
            D: 'The wolf did not create the variation. The rabbits already differed before it ' +
               'arrived — that is the V scene. Here the variation is being filtered, not made.',
            A: 'This population is nearly all one colour. That is the low-variation end of the ' +
               'story. V is the scene where the rabbits still show a wide range of colours.'
        },
        I: {
            V: 'Close, but not it. This scene shows that the rabbits differ. It does not tell you ' +
               'whether that difference is passed to their young — a rabbit could be paler ' +
               'because it is older or dustier. I is the step that checks the difference is genetic.',
            D: 'This scene is about who gets caught, not about what gets passed on. I is the step ' +
               'where fur colour is shown to travel from parent to offspring.',
            A: 'This scene is the result after many generations. I is the single step about colour ' +
               'passing from one generation to the next.'
        },
        D: {
            V: 'There is no wolf in this scene at all. Nothing is being caught, and no rabbit is ' +
               'surviving more often than any other. D needs a selection pressure.',
            I: 'No wolf, no hunting, no dying. This scene is about colour being passed from parents ' +
               'to young. D is the step where some rabbits leave more offspring than others.',
            A: 'Not yet. In this scene the change has already happened. D is the scene where the ' +
               'wolf is still hunting and the two colours are surviving at different rates.'
        },
        A: {
            V: 'These two scenes look alike — both are a field of rabbits — but this one is ' +
               'varied and the adaptation scene is nearly all one colour. A is the <em>result</em> at ' +
               'the end. This is the starting point, before anything has been selected.',
            I: 'A is the whole population after many generations. This scene is one generation ' +
               'handing its genes to the next.',
            D: 'The wolf is still hunting here and both colours are still common. A is what the ' +
               'population looks like after many generations of that hunting.'
        }
    };

    // The misconception this chapter is built around.
    const ORDER_NOTE =
        '<br><strong>Variation comes first.</strong> The wolf does not cause the variation. ' +
        'It can only act on differences that were already in the population before it arrived.';

    const GOOD = {
        V: 'Yes. Variation exists in populations — and it exists <em>before</em> the wolf turns up.',
        I: 'Yes. Inheritance of those variations. Colour is genetic, so it survives the parents.',
        D: 'Yes. Differential survival and reproduction. Same wolf, different odds, because of colour.',
        A: 'Yes. Adaptation within the population. The population changed; no individual rabbit did.'
    };

    const PAYOFF =
        '<strong>All four matched.</strong> Now put the four steps back in their own order — ' +
        'V, then I, then D, then A — and notice why no other order works. ' +
        'The variation has to be there first, or there is nothing for the wolf to act ' +
        'on. It has to be inherited, or the survivors’ advantage dies with them. Only then can ' +
        'the hunting change who breeds. And the adapted population is the result at the end, never ' +
        'the cause at the start. Swap any two steps and the explanation falls apart — which is ' +
        'why the letters are written <strong>V‑I‑D‑A</strong>.';

    const STYLE_ID = 'vida-match-style';
    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.vm { padding: 1rem 1.25rem 0.25rem; }',
            '.vm { --vm-ok:#2e7d32; --vm-ok-bg:rgba(46,125,50,0.10);',
            '      --vm-bad:#aa272f; --vm-bad-bg:rgba(170,39,47,0.09); }',
            '[data-theme="sepia"] .vm { --vm-ok:#4a6b3d; --vm-ok-bg:rgba(74,107,61,0.12);',
            '      --vm-bad:#a04040; --vm-bad-bg:rgba(160,64,64,0.10); }',
            '[data-theme="dark"] .vm { --vm-ok:#7fc98a; --vm-ok-bg:rgba(127,201,138,0.14);',
            '      --vm-bad:#e08a90; --vm-bad-bg:rgba(224,138,144,0.13); }',
            '.vm-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.75rem; }',
            '.vm-bank { display:flex; gap:0.5rem; flex-wrap:wrap; min-height:56px;',
            '   align-items:center; margin-bottom:1rem; }',
            '.vm-bank-empty { font-size:0.78rem; color:var(--text-secondary); font-style:italic; }',
            '.vm-token { font:inherit; cursor:grab; text-align:left; display:flex; gap:0.5rem;',
            '   align-items:center; min-height:44px; padding:0.4rem 0.75rem;',
            '   border:1px solid var(--border); touch-action:manipulation;',
            '   border-radius:8px; background:var(--bg); color:var(--text); transition:all 0.15s; }',
            '.vm-token:hover { border-color:var(--light-teal); }',
            '.vm-token:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.vm-token .vm-l { font-size:1.15rem; font-weight:800; color:var(--red); line-height:1; }',
            '[data-theme="dark"] .vm-token .vm-l { color:var(--yellow); }',
            '.vm-token .vm-n { font-size:0.78rem; font-weight:600; }',
            '.vm-token[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); background:var(--bg-surface); }',
            '.vm-token.vm-dragging { opacity:0.45; }',
            '.vm-scenes { display:grid; gap:0.75rem; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }',
            '.vm-scene { border:1px solid var(--border); border-radius:10px; background:var(--bg);',
            '   padding:0.75rem 0.85rem; display:flex; flex-direction:column; gap:0.55rem; }',
            '.vm-scene.vm-over { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.vm-scene.vm-right { border-color:var(--vm-ok); background:var(--vm-ok-bg); }',
            '.vm-scene.vm-wrong { border-color:var(--vm-bad); background:var(--vm-bad-bg); }',
            '.vm-num { font-size:0.62rem; font-weight:700; letter-spacing:0.08em;',
            '   text-transform:uppercase; color:var(--text-secondary); }',
            '.vm-text { margin:0; font-size:0.84rem; line-height:1.5; }',
            '.vm-slot { font:inherit; font-size:0.78rem; cursor:pointer; width:100%;',
            '   margin-top:auto; min-height:44px; padding:0.45rem 0.6rem;',
            '   border:1.5px dashed var(--border); touch-action:manipulation;',
            '   border-radius:8px; background:transparent; color:var(--text-secondary); text-align:left;',
            '   display:flex; gap:0.5rem; align-items:center; justify-content:center; transition:all 0.15s; }',
            '.vm-slot:hover { border-color:var(--light-teal); color:var(--text); }',
            '.vm-slot:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.vm-slot.vm-filled { border-style:solid; justify-content:flex-start; color:var(--text); }',
            '.vm-slot .vm-l { font-size:1.05rem; font-weight:800; line-height:1; }',
            '.vm-slot .vm-n { font-size:0.78rem; font-weight:600; }',
            '.vm-slot .vm-mark { margin-left:auto; font-size:0.72rem; font-weight:700; }',
            '.vm-slot.vm-right { border-color:var(--vm-ok); cursor:default; }',
            '.vm-slot.vm-right .vm-l, .vm-slot.vm-right .vm-mark { color:var(--vm-ok); }',
            '.vm-slot.vm-wrong { border-color:var(--vm-bad); }',
            '.vm-slot.vm-wrong .vm-l, .vm-slot.vm-wrong .vm-mark { color:var(--vm-bad); }',
            '@media (max-width:520px) { .vm-scenes { grid-template-columns:1fr; } }'
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

    window.SIMS['vida-match'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'vm');
        const how = U.el('p', 'vm-how');
        how.textContent = 'Drag a letter onto the scene it describes. Or click a letter, then click ' +
            'a scene. A letter in the wrong place can be taken back.';
        const bank = U.el('div', 'vm-bank');
        bank.setAttribute('role', 'group');
        bank.setAttribute('aria-label', 'The four VIDA steps, waiting to be matched');
        const scenesEl = U.el('div', 'vm-scenes');
        wrap.appendChild(how); wrap.appendChild(bank); wrap.appendChild(scenesEl);
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const btnReset = U.button(buttons, 'Start again');
        const btnShuffle = U.button(buttons, 'Shuffle the scenes');
        root.appendChild(buttons);

        const readout = U.el('div', 'sim-readout');
        readout.setAttribute('aria-live', 'polite');
        root.appendChild(readout);

        // ---- state --------------------------------------------------
        let order = shuffled(LETTERS);   // scene keys, in the order shown
        let slots = [null, null, null, null];
        let selected = null;             // letter currently picked up by click
        let lastWrong = null;            // { letter, scene, position }
        let lastRight = null;            // letter of the most recent correct placement
        let attempts = 0, mistakes = 0;
        // Both panels are rebuilt on every render, so keyboard focus has to be
        // put back deliberately or it falls to the body after every move.
        let pendingFocus = null;

        const isRight = pos => slots[pos] !== null && slots[pos] === order[pos];
        const solved = () => slots.every((s, i) => s !== null && s === order[i]);
        const placedLetters = () => slots.filter(Boolean);

        // ---- placing ------------------------------------------------
        function place(letter, pos) {
            if (!letter || pos < 0 || pos > 3) return;
            if (isRight(pos)) return;                       // locked once correct
            const from = slots.indexOf(letter);
            if (from !== -1) {
                if (isRight(from)) return;
                slots[from] = null;
            }
            slots[pos] = letter;   // anything already sitting here goes back to the bank
            selected = null;
            attempts++;
            if (letter === order[pos]) {
                lastWrong = null;
                lastRight = letter;
                // that slot is now locked, so send focus to whatever is left to place
                const next = LETTERS.find(l => !slots.includes(l));
                pendingFocus = next ? '.vm-token[data-letter="' + next + '"]' : '.sim-btn';
            } else {
                lastWrong = { letter, scene: order[pos], position: pos + 1 };
                mistakes++;
                pendingFocus = '.vm-slot[data-pos="' + pos + '"]';
            }
            render();
        }

        function takeBack(pos) {
            if (isRight(pos) || slots[pos] === null) return;
            const letter = slots[pos];
            slots[pos] = null;
            lastWrong = null;
            pendingFocus = '.vm-token[data-letter="' + letter + '"]';
            render();
        }

        function selectLetter(letter) {
            selected = (selected === letter) ? null : letter;
            pendingFocus = '.vm-token[data-letter="' + letter + '"]';
            render();
        }

        // ---- rendering ----------------------------------------------
        function render() {
            // bank
            bank.innerHTML = '';
            const loose = LETTERS.filter(l => !placedLetters().includes(l));
            if (!loose.length) {
                const p = U.el('span', 'vm-bank-empty');
                p.textContent = solved()
                    ? 'All four letters are placed.'
                    : 'All four letters are placed — but one or more is in the wrong scene. ' +
                      'Click it to take it back.';
                bank.appendChild(p);
            }
            loose.forEach(l => {
                const b = U.el('button', 'vm-token');
                b.type = 'button';
                b.draggable = true;
                b.dataset.letter = l;
                b.setAttribute('aria-pressed', selected === l ? 'true' : 'false');
                b.setAttribute('aria-label', l + ' — ' + STEPS[l].full);
                b.innerHTML = '<span class="vm-l">' + l + '</span>' +
                              '<span class="vm-n">' + STEPS[l].name + '</span>';
                b.addEventListener('click', () => selectLetter(l));
                b.addEventListener('dragstart', e => {
                    selected = l;
                    b.classList.add('vm-dragging');
                    try { e.dataTransfer.setData('text/plain', l); } catch (err) { /* older IE path */ }
                    e.dataTransfer.effectAllowed = 'move';
                });
                b.addEventListener('dragend', () => { b.classList.remove('vm-dragging'); });
                bank.appendChild(b);
            });

            // scenes
            scenesEl.innerHTML = '';
            order.forEach((key, pos) => {
                const card = U.el('div', 'vm-scene');
                card.dataset.pos = String(pos);
                if (slots[pos]) card.classList.add(isRight(pos) ? 'vm-right' : 'vm-wrong');

                const num = U.el('div', 'vm-num');
                num.textContent = 'Scene ' + (pos + 1);
                const txt = U.el('p', 'vm-text');
                txt.textContent = SCENES[key].text;

                const slot = U.el('button', 'vm-slot');
                slot.type = 'button';
                slot.dataset.pos = String(pos);
                const letter = slots[pos];
                if (letter) {
                    const ok = isRight(pos);
                    slot.classList.add('vm-filled', ok ? 'vm-right' : 'vm-wrong');
                    slot.innerHTML = '<span class="vm-l">' + letter + '</span>' +
                                     '<span class="vm-n">' + STEPS[letter].name + '</span>' +
                                     '<span class="vm-mark">' + (ok ? 'Correct' : 'Not this one — click to take back') + '</span>';
                    slot.setAttribute('aria-label', ok
                        ? letter + ', ' + STEPS[letter].full + '. Correct, and locked in.'
                        : letter + ', ' + STEPS[letter].full + '. Wrong scene. Activate to take it back.');
                    if (ok) slot.disabled = true;
                } else {
                    slot.textContent = selected
                        ? 'Put ' + selected + ' here'
                        : 'Which step is this?';
                    slot.setAttribute('aria-label', 'Scene ' + (pos + 1) +
                        ', empty. Choose a letter first, then activate this to place it.');
                }
                slot.addEventListener('click', () => {
                    if (slots[pos] && !isRight(pos) && !selected) { takeBack(pos); return; }
                    if (selected) { place(selected, pos); return; }
                    if (!slots[pos]) {
                        readout.innerHTML = '<strong>Pick a letter first.</strong> Click one of ' +
                            'V, I, D or A above, then click the scene it belongs to.';
                    }
                });

                // drag target: the whole card, so the drop is easy to hit
                card.addEventListener('dragover', e => {
                    if (isRight(pos)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    card.classList.add('vm-over');
                });
                card.addEventListener('dragleave', () => card.classList.remove('vm-over'));
                card.addEventListener('drop', e => {
                    e.preventDefault();
                    card.classList.remove('vm-over');
                    let l = '';
                    try { l = e.dataTransfer.getData('text/plain'); } catch (err) { /* fall through */ }
                    place(LETTERS.includes(l) ? l : selected, pos);
                });

                card.appendChild(num); card.appendChild(txt); card.appendChild(slot);
                scenesEl.appendChild(card);
            });

            if (pendingFocus) {
                const target = root.querySelector(pendingFocus);
                if (target && !target.disabled) target.focus({ preventScroll: true });
                pendingFocus = null;
            }

            describe();
        }

        function describe() {
            if (solved()) {
                readout.innerHTML = PAYOFF;
                return;
            }
            if (lastWrong) {
                const { letter, scene, position } = lastWrong;
                let msg = '<strong>' + letter + ' is not this scene.</strong> ' + WHY[letter][scene];
                // the misconception the chapter is built around
                if (scene === 'V' && (letter === 'D' || letter === 'A')) msg += ORDER_NOTE;
                msg += '<br>Scene ' + position + ' is still unmatched. Click the letter to take it back.';
                readout.innerHTML = msg;
                return;
            }
            const n = slots.filter((s, i) => s !== null && s === order[i]).length;
            if (!n || !lastRight) {
                readout.innerHTML =
                    '<strong>Four scenes, four letters.</strong> Read each scene, then give it the ' +
                    'VIDA step it shows. Only one of the four scenes has a wolf in it — that is ' +
                    'worth noticing before you start.';
                return;
            }
            readout.innerHTML =
                '<strong>' + n + ' of 4 matched.</strong> ' + GOOD[lastRight] +
                ' ' + (4 - n) + ' to go.';
        }

        function reset(newOrder) {
            if (newOrder) order = newOrder;
            slots = [null, null, null, null];
            selected = null; lastWrong = null; lastRight = null;
            attempts = 0; mistakes = 0; pendingFocus = null;
            render();
        }

        btnReset.onclick = () => reset();
        btnShuffle.onclick = () => {
            let next = shuffled(LETTERS);
            let guard = 0;
            while (guard++ < 20 && next.join('') === order.join('')) next = shuffled(LETTERS);
            reset(next);
        };

        // Exposed so the logic can be checked from the console.
        root._simState = () => ({
            order: order.slice(),
            slots: slots.slice(),
            correct: slots.map((s, i) => s !== null && s === order[i]),
            selected,
            lastWrong: lastWrong ? Object.assign({}, lastWrong) : null,
            lastRight,
            attempts, mistakes,
            solved: solved()
        });
        // Same actions the mouse performs, for testing and for any host page.
        root._simPlace = place;
        root._simSelect = selectLetter;
        root._simReset = () => reset();

        render();
    };
})();
