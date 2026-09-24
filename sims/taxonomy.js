/* =============================================================
   INTERACTIVE — Classify five carnivores
   -------------------------------------------------------------
   Registers window.SIMS.taxonomy.  Supports HS-LS4-1.

   The companion to the cladogram builder. That one asks how a tree
   is BUILT from a character table; this one asks what the naming
   system DOES with a tree once you have it.

   Thirteen rank names have to be dropped into a branching diagram
   of five carnivores. The lesson lands at the end: the wolf and the
   jackal share a genus, the weasel and the otter share only a
   family, and the cat shares only the order — so the size of the
   smallest shared box IS the measure of relatedness. The naming
   system is nested because the branching is nested.

   Ranks verified against standard mammal taxonomy:
     domestic cat   Felis catus      Carnivora / Felidae     / Felis
     least weasel   Mustela nivalis  Carnivora / Mustelidae  / Mustela
     European otter Lutra lutra      Carnivora / Mustelidae  / Lutra
     golden jackal  Canis aureus     Carnivora / Canidae     / Canis
     grey wolf      Canis lupus      Carnivora / Canidae     / Canis
   (Otters are the subfamily Lutrinae inside Mustelidae, so otter and
   weasel do share a family. The golden jackal is still Canis; only
   the African black-backed and side-striped jackals have been moved
   out to Lupulella.)

   Interaction: drag-and-drop AND click-to-select-then-click-to-place.
   Both routes go through place(). Slots and tokens are real buttons,
   so Tab + Enter/Space works without any extra key handling, and
   touch devices — where HTML5 drag-and-drop does nothing — get the
   click route.

   Colours come from CSS custom properties rather than U.theme(),
   because everything drawn here is DOM or SVG, and because U.theme()
   only distinguishes dark from light — it would render the sepia
   theme with light-theme colours. Custom properties follow all three.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    // ---- content ------------------------------------------------
    const ANIMALS = {
        cat:    { tip: 'Domestic cat', the: 'the domestic cat' },
        weasel: { tip: 'Weasel',       the: 'the weasel' },
        otter:  { tip: 'Otter',        the: 'the otter' },
        jackal: { tip: 'Jackal',       the: 'the jackal' },
        wolf:   { tip: 'Wolf',         the: 'the wolf' }
    };

    // Row centres, one per animal, and the geometry of the diagram.
    const ROW = { cat: 34, weasel: 110, otter: 186, jackal: 262, wolf: 338 };
    const W = 672, H = 374, BH = 40;
    const TIP_X = 556;

    const SLOTS = [
        { id: 'order',   rank: 'order',   answer: 'Carnivora',       x: 4,   y: 167,        w: 96,
          covers: ['cat', 'weasel', 'otter', 'jackal', 'wolf'] },

        { id: 'fam-fel', rank: 'family',  answer: 'Felidae',         x: 132, y: ROW.cat,    w: 112,
          covers: ['cat'] },
        { id: 'fam-mus', rank: 'family',  answer: 'Mustelidae',      x: 132, y: 148,        w: 112,
          covers: ['weasel', 'otter'] },
        { id: 'fam-can', rank: 'family',  answer: 'Canidae',         x: 132, y: 300,        w: 112,
          covers: ['jackal', 'wolf'] },

        { id: 'gen-fel', rank: 'genus',   answer: 'Felis',           x: 274, y: ROW.cat,    w: 100,
          covers: ['cat'],             family: 'Felidae' },
        { id: 'gen-mus', rank: 'genus',   answer: 'Mustela',         x: 274, y: ROW.weasel, w: 100,
          covers: ['weasel'],          family: 'Mustelidae' },
        { id: 'gen-lut', rank: 'genus',   answer: 'Lutra',           x: 274, y: ROW.otter,  w: 100,
          covers: ['otter'],           family: 'Mustelidae' },
        { id: 'gen-can', rank: 'genus',   answer: 'Canis',           x: 274, y: 300,        w: 100,
          covers: ['jackal', 'wolf'],  family: 'Canidae' },

        { id: 'sp-cat',  rank: 'species', answer: 'Felis catus',     x: 402, y: ROW.cat,    w: 144,
          covers: ['cat'],    family: 'Felidae',    genus: 'Felis' },
        { id: 'sp-wea',  rank: 'species', answer: 'Mustela nivalis', x: 402, y: ROW.weasel, w: 144,
          covers: ['weasel'], family: 'Mustelidae', genus: 'Mustela' },
        { id: 'sp-ott',  rank: 'species', answer: 'Lutra lutra',     x: 402, y: ROW.otter,  w: 144,
          covers: ['otter'],  family: 'Mustelidae', genus: 'Lutra' },
        { id: 'sp-jac',  rank: 'species', answer: 'Canis aureus',    x: 402, y: ROW.jackal, w: 144,
          covers: ['jackal'], family: 'Canidae',    genus: 'Canis' },
        { id: 'sp-wol',  rank: 'species', answer: 'Canis lupus',     x: 402, y: ROW.wolf,   w: 144,
          covers: ['wolf'],   family: 'Canidae',    genus: 'Canis' }
    ];

    const BY_ID = {};
    SLOTS.forEach(s => { BY_ID[s.id] = s; });
    const HOME = {};                       // answer label -> the slot it belongs in
    SLOTS.forEach(s => { HOME[s.answer] = s; });

    const RANKS = ['order', 'family', 'genus', 'species'];
    const RANK_LABEL = { order: 'Order', family: 'Family', genus: 'Genus', species: 'Species' };
    const RANK_ART = { order: 'an order', family: 'a family', genus: 'a genus', species: 'a species' };

    const FAMILY_NOTE = {
        Felidae: 'the cat family',
        Mustelidae: 'the weasel family, which includes otters',
        Canidae: 'the dog family'
    };
    const GENUS_NOTE = {
        Felis: 'the genus of small cats',
        Mustela: 'the genus of weasels and stoats',
        Lutra: 'the genus of Old World river otters',
        Canis: 'the genus of wolves, jackals and domestic dogs'
    };
    const RANK_CUE = {
        order: 'It is the widest group on this diagram, so it belongs at the root, where every ' +
               'branch starts.',
        family: 'Family names in this group all end in <em>-idae</em>. There are three of them, one ' +
                'for each main branch.',
        genus: 'A genus name is a single capitalised word — and it is also the first word of every ' +
               'species name on its branch.',
        species: 'A species name is always two words: the genus, then the species. Those go in the ' +
                 'widest slots, next to the animals.'
    };

    // Genus and species names are italicised; family and order names are not.
    function fmt(label, rank) {
        return (rank === 'genus' || rank === 'species') ? '<em>' + label + '</em>' : label;
    }
    function listAnimals(keys) {
        const names = keys.map(k => ANIMALS[k].the);
        if (names.length === 1) return names[0];
        return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    }

    // ---- one-off stylesheet -------------------------------------
    const CSS_ID = 'sim-taxonomy-css';
    function injectCSS() {
        if (document.getElementById(CSS_ID)) return;
        const st = document.createElement('style');
        st.id = CSS_ID;
        st.textContent = `
.tax-r-order   { --tax-c: 340 58% 48%; }
.tax-r-family  { --tax-c:  28 32% 42%; }
.tax-r-genus   { --tax-c:  26 78% 48%; }
.tax-r-species { --tax-c:  45 72% 42%; }
[data-theme="dark"] .tax-r-order   { --tax-c: 340 62% 66%; }
[data-theme="dark"] .tax-r-family  { --tax-c:  28 38% 62%; }
[data-theme="dark"] .tax-r-genus   { --tax-c:  26 78% 62%; }
[data-theme="dark"] .tax-r-species { --tax-c:  45 72% 60%; }

.tax-legend {
    display: flex; flex-wrap: wrap; gap: 0.4rem 1rem;
    padding: 0.9rem 1.25rem 0; font-size: 0.72rem; color: var(--text-secondary);
}
.tax-legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
.tax-legend i {
    width: 0.85rem; height: 0.85rem; border-radius: 3px; flex: none;
    background: hsl(var(--tax-c) / 0.30); border: 1px solid hsl(var(--tax-c) / 0.7);
}
.tax-scroll { overflow-x: auto; padding: 0.9rem 1.25rem 0.4rem; }
.tax-tree {
    position: relative; width: ${W}px; height: ${H}px; margin: 0 auto;
}
.tax-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.tax-lines path { fill: none; stroke: var(--border); stroke-width: 3; stroke-linecap: round; }

.tax-slot {
    position: absolute; font: inherit; font-size: 0.78rem; line-height: 1.15;
    display: flex; align-items: center; justify-content: center; text-align: center;
    padding: 0.2rem 0.35rem; cursor: pointer; box-sizing: border-box;
    border: 1.5px dashed hsl(var(--tax-c) / 0.55); border-radius: 7px;
    background: hsl(var(--tax-c) / 0.10); color: var(--text-secondary);
    transition: background 0.12s, border-color 0.12s, transform 0.12s;
}
.tax-slot .tax-ph { font-size: 0.66rem; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; }
.tax-slot.filled {
    border-style: solid; border-color: hsl(var(--tax-c) / 0.85);
    background: hsl(var(--tax-c) / 0.24); color: var(--text); font-weight: 600;
}
.tax-slot.over { background: hsl(var(--tax-c) / 0.40); transform: scale(1.04); }
.tax-slot.armed { border-style: solid; box-shadow: 0 0 0 2px hsl(var(--tax-c) / 0.45); }
.tax-slot.shake { animation: tax-shake 0.3s; border-color: var(--red); }
@keyframes tax-shake {
    0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
}
.tax-slot:hover:not(.filled) { background: hsl(var(--tax-c) / 0.22); }
@media (prefers-reduced-motion: reduce) {
    .tax-slot { transition: none; }
    .tax-slot.over { transform: none; }
    .tax-slot.shake { animation: none; }
}
.tax-tip {
    position: absolute; font-size: 0.76rem; font-weight: 600; color: var(--text);
    display: flex; align-items: center; height: ${BH}px;
    width: ${W - TIP_X - 8}px; line-height: 1.1;
}

.tax-tray { padding: 0.4rem 1.25rem 1rem; display: grid; gap: 0.75rem; }
.tax-group { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.4rem; }
.tax-group > b {
    font-size: 0.66rem; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--text-secondary); min-width: 4.5rem;
}
.tax-token {
    font: inherit; font-size: 0.78rem; padding: 0.28rem 0.7rem; cursor: grab;
    border: 1.5px solid hsl(var(--tax-c) / 0.7); border-radius: 999px;
    background: hsl(var(--tax-c) / 0.16); color: var(--text);
    transition: background 0.12s, box-shadow 0.12s;
}
.tax-token:hover { background: hsl(var(--tax-c) / 0.30); }
.tax-token[aria-pressed="true"] {
    background: hsl(var(--tax-c) / 0.42); box-shadow: 0 0 0 2px hsl(var(--tax-c) / 0.55);
    cursor: grabbing;
}
.tax-token[hidden] { display: none; }
.tax-group .tax-done { font-size: 0.72rem; color: var(--text-secondary); font-style: italic; }
.tax-slot:focus-visible, .tax-token:focus-visible {
    outline: 2px solid var(--blue); outline-offset: 2px;
}
[data-theme="dark"] .tax-slot:focus-visible, [data-theme="dark"] .tax-token:focus-visible {
    outline-color: var(--yellow);
}
`;
        document.head.appendChild(st);
    }

    // ---- the branch lines ---------------------------------------
    function linesSVG() {
        const d = [
            // root: order box out to the first fork
            `M100 167 H114`,
            `M114 ${ROW.cat} V300`,
            `M114 ${ROW.cat} H132`,          // to Felidae
            `M114 148 H132`,                 // to Mustelidae
            `M114 300 H132`,                 // to Canidae
            // Felidae -> Felis -> Felis catus
            `M244 ${ROW.cat} H274`,
            `M374 ${ROW.cat} H402`,
            // Mustelidae forks into two genera
            `M244 148 H256`,
            `M256 ${ROW.weasel} V${ROW.otter}`,
            `M256 ${ROW.weasel} H274`,
            `M256 ${ROW.otter} H274`,
            `M374 ${ROW.weasel} H402`,
            `M374 ${ROW.otter} H402`,
            // Canidae -> Canis, which then forks into two species
            `M244 300 H274`,
            `M374 300 H386`,
            `M386 ${ROW.jackal} V${ROW.wolf}`,
            `M386 ${ROW.jackal} H402`,
            `M386 ${ROW.wolf} H402`
        ];
        // species boxes out to the animal names
        Object.keys(ROW).forEach(k => d.push(`M546 ${ROW[k]} H${TIP_X}`));
        return `<svg class="tax-lines" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">` +
               d.map(p => `<path d="${p}"/>`).join('') + `</svg>`;
    }

    // =============================================================
    window.SIMS.taxonomy = function (root) {
        injectCSS();

        // ---- intro -------------------------------------------------
        const intro = U.el('div', 'sim-readout');
        intro.style.borderTop = '0';
        intro.innerHTML =
            'Five carnivores, and the branching diagram that classifies them. Drop each name into its ' +
            'slot — or click a name, then click a slot. Only the right name will go in, and a wrong ' +
            'one tells you why.';
        root.appendChild(intro);

        // ---- legend ------------------------------------------------
        const legend = U.el('div', 'tax-legend');
        legend.innerHTML = RANKS.map(r =>
            `<span class="tax-r-${r}"><i></i>${RANK_LABEL[r]}</span>`).join('');
        root.appendChild(legend);

        // ---- the diagram -------------------------------------------
        const scroll = U.el('div', 'tax-scroll');
        const tree = U.el('div', 'tax-tree');
        tree.innerHTML = linesSVG();
        scroll.appendChild(tree);
        root.appendChild(scroll);

        const slotEls = {};
        SLOTS.forEach(s => {
            const b = U.el('button', 'tax-slot tax-r-' + s.rank);
            b.type = 'button';
            b.dataset.slot = s.id;
            b.style.left = s.x + 'px';
            b.style.top = (s.y - BH / 2) + 'px';
            b.style.width = s.w + 'px';
            b.style.height = BH + 'px';
            b.addEventListener('click', () => onSlotClick(s));
            b.addEventListener('dragover', e => {
                if (!dragging) return;
                e.preventDefault(); b.classList.add('over');
            });
            b.addEventListener('dragleave', () => b.classList.remove('over'));
            b.addEventListener('drop', e => {
                e.preventDefault(); b.classList.remove('over');
                const label = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || dragging;
                if (label) place(label, s.id);
            });
            tree.appendChild(b);
            slotEls[s.id] = b;
        });

        Object.keys(ROW).forEach(k => {
            const t = U.el('div', 'tax-tip');
            t.style.left = (TIP_X + 6) + 'px';
            t.style.top = (ROW[k] - BH / 2) + 'px';
            t.textContent = ANIMALS[k].tip;
            tree.appendChild(t);
        });

        // ---- the tray of names -------------------------------------
        const tray = U.el('div', 'tax-tray');
        root.appendChild(tray);
        const tokenEls = {};
        const doneEls = {};
        RANKS.forEach(r => {
            const g = U.el('div', 'tax-group tax-r-' + r);
            const lab = document.createElement('b');
            lab.textContent = RANK_LABEL[r];
            g.appendChild(lab);
            SLOTS.filter(s => s.rank === r).forEach(s => {
                const b = U.el('button', 'tax-token');
                b.type = 'button';
                b.draggable = true;
                b.dataset.label = s.answer;
                b.innerHTML = fmt(s.answer, r);
                b.setAttribute('aria-pressed', 'false');
                b.addEventListener('click', () => onTokenClick(s.answer));
                b.addEventListener('dragstart', e => {
                    dragging = s.answer;
                    selected = s.answer;
                    syncAll();      // slot labels announce the held name too
                    if (e.dataTransfer) {
                        e.dataTransfer.setData('text/plain', s.answer);
                        e.dataTransfer.effectAllowed = 'move';
                    }
                });
                b.addEventListener('dragend', () => {
                    dragging = null;
                    document.querySelectorAll('.tax-slot.over')
                        .forEach(x => x.classList.remove('over'));
                });
                g.appendChild(b);
                tokenEls[s.answer] = b;
            });
            const done = U.el('span', 'tax-done');
            done.textContent = 'all placed';
            done.hidden = true;
            g.appendChild(done);
            doneEls[r] = done;
            tray.appendChild(g);
        });

        // ---- readout and controls ----------------------------------
        const readout = U.el('div', 'sim-readout');
        readout.setAttribute('aria-live', 'polite');
        root.appendChild(readout);
        const buttons = U.el('div', 'sim-buttons');
        const btnHint = U.button(buttons, 'Hint');
        const btnReset = U.button(buttons, 'Start again');
        root.appendChild(buttons);

        // ---- state -------------------------------------------------
        let placed = {};        // slot id -> label
        let selected = null;    // label picked up by click
        let dragging = null;    // label being dragged
        let last = null;        // { ok, label, slot, reason } for _simState

        function reset() {
            placed = {}; selected = null; dragging = null; last = null;
            syncAll();
            readout.innerHTML =
                '<strong>Start anywhere.</strong> The order goes at the root, the species names go ' +
                'beside the animals, and the families and genera fill the space between. Work out ' +
                'which branch each name belongs on before you drop it.';
        }

        function syncSlot(s) {
            const b = slotEls[s.id];
            const label = placed[s.id];
            b.classList.toggle('filled', !!label);
            if (label) {
                b.innerHTML = fmt(label, s.rank);
                b.setAttribute('aria-label',
                    RANK_LABEL[s.rank] + ' ' + label + ', correct. On the branch leading to ' +
                    listAnimals(s.covers) + '. Activate to take it back out.');
            } else {
                b.innerHTML = '<span class="tax-ph">' + RANK_LABEL[s.rank] + '</span>';
                b.setAttribute('aria-label',
                    'Empty ' + s.rank + ' slot on the branch leading to ' + listAnimals(s.covers) +
                    '. ' + (selected ? 'Activate to put ' + selected + ' here.'
                                     : 'Choose a name below first.'));
            }
        }
        function syncTokens() {
            SLOTS.forEach(s => {
                const b = tokenEls[s.answer];
                const used = Object.values(placed).indexOf(s.answer) !== -1;
                b.hidden = used;
                b.setAttribute('aria-pressed', String(selected === s.answer));
            });
            RANKS.forEach(r => {
                doneEls[r].hidden = SLOTS.filter(s => s.rank === r)
                    .some(s => !placed[s.id]);
            });
        }
        function armSlots() {
            SLOTS.forEach(s => {
                slotEls[s.id].classList.toggle('armed',
                    !!selected && !placed[s.id] && HOME[selected].rank === s.rank);
            });
        }
        function syncAll() { SLOTS.forEach(syncSlot); syncTokens(); armSlots(); }

        // ---- interaction -------------------------------------------
        function onTokenClick(label) {
            selected = (selected === label) ? null : label;
            syncAll();
            if (selected) {
                const s = HOME[selected];
                readout.innerHTML =
                    '<strong>' + fmt(selected, s.rank) + ' picked up.</strong> Now click the slot it ' +
                    'belongs in — or drag it there. Press it again to put it back.';
            }
        }
        function onSlotClick(s) {
            if (placed[s.id]) {                       // take it back out
                const label = placed[s.id];
                delete placed[s.id];
                selected = null; last = null;
                syncAll();
                tokenEls[label].focus();
                readout.innerHTML = '<strong>Removed.</strong> ' + fmt(label, s.rank) +
                    ' is back in the list below.';
                return;
            }
            if (!selected) {
                readout.innerHTML = '<strong>Pick a name first.</strong> Click one of the names ' +
                    'below, then click the slot you want it in. Dragging works too.';
                return;
            }
            place(selected, s.id);
        }

        function place(label, slotId) {
            const s = BY_ID[slotId];
            const home = HOME[label];
            if (!s || !home) return false;

            if (placed[slotId]) {
                last = { ok: false, label: label, slot: slotId, reason: 'occupied' };
                readout.innerHTML = '<strong>That slot is already filled.</strong> Click the name ' +
                    'sitting in it if you want to take it back out.';
                return false;
            }
            if (home.id === slotId) {                 // correct
                placed[slotId] = label;
                selected = null; dragging = null;
                last = { ok: true, label: label, slot: slotId, reason: null };
                syncAll();
                describeProgress(s, label);
                return true;
            }
            // wrong — say exactly why
            const reason = explain(label, home, s);
            last = { ok: false, label: label, slot: slotId, reason: reason.code };
            readout.innerHTML = reason.html;
            const b = slotEls[slotId];
            b.classList.remove('shake');
            void b.offsetWidth;                        // restart the animation
            b.classList.add('shake');
            setTimeout(() => b.classList.remove('shake'), 320);
            return false;
        }

        function explain(label, home, s) {
            // 1. wrong rank altogether
            if (home.rank !== s.rank) {
                return {
                    code: 'rank',
                    html: '<strong>Wrong rank.</strong> ' + fmt(label, home.rank) + ' is ' +
                        RANK_ART[home.rank] + ' name, but that slot holds ' + RANK_ART[s.rank] +
                        ' name. ' + RANK_CUE[home.rank]
                };
            }
            // 2. right rank, wrong branch
            if (home.rank === 'family') {
                return {
                    code: 'family-branch',
                    html: '<strong>Right rank, wrong branch.</strong> ' + label + ' is ' +
                        FAMILY_NOTE[label] + ', so it belongs on the branch leading to ' +
                        listAnimals(home.covers) + '. The branch you dropped it on leads to ' +
                        listAnimals(s.covers) + '.'
                };
            }
            if (home.rank === 'genus') {
                if (home.family === s.family) {
                    return {
                        code: 'genus-same-family',
                        html: '<strong>Close — same family, wrong genus.</strong> <em>' + label +
                            '</em> and <em>' + s.answer + '</em> are both inside ' + s.family +
                            ', so they sit on the same big branch. But a family can hold more than ' +
                            'one genus, and these are two of them. <em>' + label + '</em> is ' +
                            GENUS_NOTE[label] + ', so it goes on the branch leading to ' +
                            listAnimals(home.covers) + '.'
                    };
                }
                return {
                    code: 'genus-branch',
                    html: '<strong>Right rank, wrong branch.</strong> Genus <em>' + label +
                        '</em> sits inside the family ' + home.family + ' — ' +
                        FAMILY_NOTE[home.family] + '. That slot is inside the ' + s.family +
                        ' branch, which leads to ' + listAnimals(s.covers) + '.'
                };
            }
            // species
            if (home.genus === s.genus) {
                return {
                    code: 'species-same-genus',
                    html: '<strong>Same genus, different species.</strong> Both ' +
                        listAnimals(home.covers.concat(s.covers)) +
                        ' belong to genus <em>' + s.genus + '</em>, so they must sit inside ' +
                        'the same ' + s.family + ' branch — which is why these two slots come out ' +
                        'of one box. They are still two separate species, though: the wolf is ' +
                        '<em>Canis lupus</em> and the jackal is <em>Canis aureus</em>. Check which ' +
                        'animal you are filling in.'
                };
            }
            return {
                code: 'species-genus-mismatch',
                html: '<strong>Look at the first word.</strong> <em>' + label + '</em> begins with ' +
                    '<em>' + home.genus + '</em>, so it can only sit on the branch coming out of the ' +
                    '<em>' + home.genus + '</em> box — the one leading to ' +
                    listAnimals(home.covers) + '. The slot you chose comes out of <em>' + s.genus +
                    '</em>, and leads to ' + listAnimals(s.covers) + '. Every species name carries ' +
                    'its own genus at the front; that is what tells you where it goes.'
            };
        }

        function describeProgress(s, label) {
            const n = Object.keys(placed).length;
            if (n === SLOTS.length) { finish(); return; }
            let note;
            if (s.rank === 'order') {
                note = 'Carnivora is the widest group here. Every branch on the diagram comes out ' +
                    'of it, so all five animals are carnivorans.';
            } else if (s.rank === 'family') {
                note = label + ' is the branch leading to ' + listAnimals(s.covers) + '. ' +
                    (s.covers.length > 1
                        ? 'Those two share a family, so they are already closer to each other than ' +
                          'to anything on another branch.'
                        : 'Nothing else on this diagram is in that family.');
            } else if (s.rank === 'genus') {
                note = '<em>' + label + '</em> sits inside ' + s.family + ', on the branch leading ' +
                    'to ' + listAnimals(s.covers) + '. A genus is a smaller box than a family.';
            } else {
                note = '<em>' + label + '</em> starts with <em>' + s.genus + '</em> — the genus in ' +
                    'the box just before it. That is not a coincidence; it is how the naming ' +
                    'system works.';
            }
            readout.innerHTML = '<strong>' + n + ' of ' + SLOTS.length + ' placed.</strong> ' + note;
        }

        function finish() {
            readout.innerHTML =
                '<strong>Complete — now read it back.</strong> Look at the smallest box each pair ' +
                'shares.<br>' +
                'The <strong>wolf and the jackal</strong> share a genus: both are <em>Canis</em>. ' +
                'That is the smallest box on the diagram, so they are the closest relatives here — ' +
                'their branches meet last.<br>' +
                'The <strong>weasel and the otter</strong> share a family, Mustelidae, but they are ' +
                'in different genera — <em>Mustela</em> and <em>Lutra</em>. Related, but less ' +
                'closely than the wolf and the jackal.<br>' +
                'The <strong>cat</strong> shares only the order, Carnivora, with any of them. Its ' +
                'branch splits off first.<br>' +
                'So the naming system is not a list of labels. It is a set of boxes inside boxes ' +
                'that mirrors the branching: <strong>the smaller the box two species share, the ' +
                'more recently they shared an ancestor.</strong>';
        }

        btnReset.onclick = reset;
        btnHint.onclick = () => {
            const next = SLOTS.filter(s => !placed[s.id])[0];
            if (!next) { finish(); return; }
            readout.innerHTML =
                '<strong>Hint.</strong> The empty ' + next.rank + ' slot on the branch leading to ' +
                listAnimals(next.covers) + ' is the next one to fill. ' + RANK_CUE[next.rank];
        };

        // Escape puts down whatever is selected.
        root.addEventListener('keydown', e => {
            if (e.key === 'Escape' && selected) { selected = null; syncAll(); }
        });

        // ---- console hooks -----------------------------------------
        root._simState = () => ({
            placed: Object.assign({}, placed),
            filled: Object.keys(placed).length,
            total: SLOTS.length,
            complete: Object.keys(placed).length === SLOTS.length,
            selected: selected,
            last: last,
            remaining: SLOTS.filter(s => !placed[s.id]).map(s => s.id),
            answerKey: SLOTS.reduce((a, s) => { a[s.id] = s.answer; return a; }, {})
        });
        root._simPlace = (label, slotId) => place(label, slotId);

        reset();
    };
})();
