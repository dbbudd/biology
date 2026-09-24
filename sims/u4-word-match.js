/* =============================================================
   INTERACTIVE — Seven words that sound alike
   -------------------------------------------------------------
   Registers window.SIMS['u4-word-match'].  Supports HS-LS1-4.

   Replaces a two-column word/meaning table. The section's own
   argument is that the difficulty is not the process but five words
   that sound alike, so the reader sorts the words onto their
   definitions instead of reading a list.

   A wrong match is answered for the specific confusion it reveals:
   chromatin for chromosome is a packing mistake, chromosome for
   chromatid is a counting mistake, centromere for centriole is the
   "centr-" trap. Pairs with no special answer point at the one
   detail in the definition that only fits one word.

   Once every word is placed the cards reorder into the logical
   sequence and become the reference list the table used to be, with
   each word marked as a glossary term. Words are not marked while
   they sit in the bank, so hovering cannot give the answers away.

   Definitions are the chapter's own wording, unchanged.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4wm-style';

    // In reading order: the order the finished list is shown in.
    // `gloss` is the COURSE.glossary key that supplies the popover definition.
    const WORDS = [
        { k: 'chromatin', label: 'Chromatin', gloss: 'chromatin',
          def: 'DNA in its unwound, working state — long thin threads, too fine to see as separate objects.',
          clue: 'unwound',
          right: 'This is the form DNA is in almost all the time, because genes can only be read while it is unwound.' },
        { k: 'chromosome', label: 'Chromosome', gloss: 'chromosome',
          def: 'One DNA molecule, wound up tightly enough to be seen and moved. Humans have 46.',
          clue: 'one DNA molecule',
          right: 'A human body cell has 46 of them — before S phase and after it.' },
        { k: 'chromatid', label: 'Chromatid', gloss: 'chromatid',
          def: 'One half of a copied chromosome. Two sister chromatids are identical copies joined at the centromere.',
          clue: 'one half',
          right: 'After S phase a human cell has 46 chromosomes but 92 chromatids.' },
        { k: 'centromere', label: 'Centromere', gloss: 'centromere',
          def: 'The point where sister chromatids are held together, and where the spindle attaches.',
          clue: 'the point where',
          right: 'It is also how you count: one centromere, one chromosome, however many arms you can see.' },
        { k: 'homologous', label: 'Homologous chromosomes', gloss: 'homologous chromosomes',
          def: 'A matching pair — same genes in the same order, one inherited from each parent. You have 23 pairs.',
          clue: 'one inherited from each parent',
          right: 'Same genes in the same places, but the versions of those genes can differ — that is the top band in Figure 4.4.' },
        { k: 'spindle', label: 'Spindle fibres', gloss: 'spindle fibre',
          def: 'Protein cables that grow out from opposite ends of the cell, attach to centromeres, and pull chromosomes apart.',
          clue: 'protein cables',
          right: 'They are what actually does the pulling when the copies separate.' },
        { k: 'centriole', label: 'Centrioles', gloss: 'centriole',
          def: 'Small structures that organise the spindle in animal cells. Plant cells build a spindle without them.',
          clue: 'organise the spindle',
          right: 'Animal cells only. A plant cell builds its spindle without them, so you will not find any in an onion root tip.' }
    ];
    const W = {};
    WORDS.forEach(w => { W[w.k] = w; });

    // Fixed shuffles, so every reader sees the same puzzle and neither column
    // lines up with the other or with the finished order.
    const CARD_ORDER = ['homologous', 'centriole', 'chromatid', 'chromatin', 'spindle', 'chromosome', 'centromere'];
    const BANK_ORDER = ['centromere', 'chromatin', 'homologous', 'chromatid', 'centriole', 'chromosome', 'spindle'];

    // The confusions worth answering by name. Keyed by the two words, sorted.
    const PAIRS = {
        'chromatin|chromosome': 'Same DNA, different packing. Chromatin is the loose working form; a chromosome is that same molecule wound up tightly enough to see and move.',
        'chromatid|chromosome': 'A chromatid is only half of a copied chromosome. Count centromeres: one centromere means one chromosome, however many arms it has.',
        'chromatid|chromatin': 'They sound alike and are nothing alike. Chromatin is the unwound state DNA is in; a chromatid is one of the two identical copies that make up a copied chromosome.',
        'centriole|centromere': 'Both start with “centr-”, and that is the whole trap. The centromere is a place on a chromosome; centrioles are separate structures out in the cytoplasm that organise the spindle.',
        'chromatid|homologous': 'Sister chromatids are identical copies of one chromosome, made in S phase. Homologous chromosomes are two different chromosomes, one from each parent — the two panels of Figure 4.4.',
        'chromosome|homologous': 'Homologous chromosomes are a pair of chromosomes, one from each parent, not a single chromosome.',
        'centromere|spindle': 'The spindle fibres are the cables; the centromere is the point on the chromosome where they grab hold.',
        'centriole|spindle': 'Centrioles organise the spindle; the spindle fibres are the cables that actually pull. Plant cells build spindle fibres with no centrioles at all.',
        'centromere|chromatid': 'The centromere is the join, not one of the two halves it joins.'
    };
    function wrongMsg(placed, target) {
        const key = [placed, target].sort().join('|');
        const lead = '<b>Not ' + W[placed].label.toLowerCase() + '.</b> ';
        if (PAIRS[key]) return lead + PAIRS[key];
        return lead + 'This definition belongs to a different word. The detail that gives it away is “' +
            W[target].clue + '”.';
    }

    function glossaryDef(key) {
        const g = (window.COURSE && window.COURSE.glossary) || {};
        const hit = Object.keys(g).find(x => x.toLowerCase() === key);
        return hit ? g[hit] : '';
    }
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.wm { padding:1rem 1.25rem 1.25rem; }',
            '.wm { --wm-ok:#2e7d32; --wm-bad:#aa272f; }',
            '[data-theme="dark"] .wm { --wm-ok:#7fc98a; --wm-bad:#e08a90; }',
            '[data-theme="sepia"] .wm { --wm-ok:#4a6b3d; --wm-bad:#a04040; }',
            '.wm-how { font-size:0.8rem; color:var(--text-secondary); margin:0 0 0.8rem; line-height:1.6; }',
            '.wm-how b { color:var(--text); }',
            '.wm-bank { display:flex; flex-wrap:wrap; gap:0.45rem; margin:0 0 0.9rem; min-height:2.3rem; }',
            '.wm-chip { font:inherit; font-size:0.84rem; font-weight:700; cursor:grab; touch-action:none;',
            '   padding:0.45rem 0.8rem; border:1px solid var(--border); border-radius:999px;',
            '   background:var(--bg); color:var(--text); user-select:none; -webkit-user-select:none; }',
            '.wm-chip:hover { border-color:var(--light-teal); }',
            '.wm-chip:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.wm-chip.sel { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.wm-chip.lift { opacity:0.35; }',
            '.wm-bank-done { font-size:0.8rem; color:var(--text-secondary); align-self:center; }',
            '.wm-ghost { position:fixed; left:0; top:0; z-index:1000; pointer-events:none; font-size:0.84rem;',
            '   font-weight:700; padding:0.45rem 0.8rem; border:1px solid var(--light-teal); border-radius:999px;',
            '   background:var(--bg); color:var(--text); box-shadow:0 6px 18px rgba(0,0,0,0.25); white-space:nowrap; }',
            '.wm-cards { display:grid; gap:0.5rem; }',
            '.wm-card { display:grid; grid-template-columns:minmax(8.5rem, 11rem) 1fr; gap:0.3rem 0.9rem;',
            '   align-items:start; padding:0.65rem 0.8rem; border:1px solid var(--border); border-radius:10px;',
            '   background:var(--bg); cursor:pointer; text-align:left; }',
            '.wm-card:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.wm-card.hot { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.wm-card.miss { border-color:var(--wm-bad); box-shadow:0 0 0 2px var(--wm-bad); }',
            '.wm-card.done { cursor:default; border-color:var(--wm-ok); }',
            '.wm-slot { font-size:0.84rem; font-weight:700; min-height:1.9rem; display:flex; align-items:center;',
            '   padding:0.2rem 0.55rem; border:1.5px dashed var(--border); border-radius:8px; color:var(--text-secondary); }',
            '.wm-card.armed .wm-slot { border-color:var(--light-teal); color:var(--text); }',
            '.wm-card.done .wm-slot { border-style:solid; border-color:transparent; padding-left:0; color:var(--text); }',
            '.wm-def { font-size:0.85rem; line-height:1.55; margin:0; padding-top:0.25rem; color:var(--text); }',
            '.wm-note { grid-column:1 / -1; font-size:0.8rem; line-height:1.55; margin:0.15rem 0 0; }',
            '.wm-note.ok { color:var(--wm-ok); } .wm-note.bad { color:var(--wm-bad); }',
            '.wm-note b { color:var(--text); }',
            '.wm-done { margin-top:0.9rem; border:1px solid var(--wm-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; font-size:0.84rem; line-height:1.6; }',
            '[data-theme="dark"] .wm-done { background:rgba(127,201,138,0.12); }',
            '.wm-done, .wm-done p, .wm-done li { color:var(--text); }',
            '.wm-done h5 { margin:0 0 0.4rem; font-size:0.9rem; }',
            '.wm-done p { margin:0 0 0.5rem; } .wm-done p:last-child { margin-bottom:0; }',
            '.wm-done ul { margin:0 0 0.5rem 1.1rem; padding:0; } .wm-done li { margin:0.15rem 0; }',
            '.wm .sim-buttons { padding:0; margin-top:0.9rem; }',
            '@media (max-width: 560px) {',
            '  .wm { padding:0.85rem 0.75rem 1rem; }',
            '  .wm-card { grid-template-columns:1fr; }',
            '  .wm-def { padding-top:0; }',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-word-match'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'wm');
        root.appendChild(wrap);

        let placed = {};        // word key -> true once matched to its own definition
        let revealed = false;   // "Show all answers" was used
        let selected = null;    // word key picked up by tap or keyboard
        let wrongs = 0;
        let note = null;        // { card, cls, html } — feedback shown on the card it concerns
        let dragging = null;    // { k, ghost, hot } while a chip is being dragged

        const complete = () => WORDS.every(w => placed[w.k]);

        function render(focusKey) {
            wrap.innerHTML = '';
            const done = complete();

            const how = U.el('p', 'wm-how');
            how.innerHTML = done
                ? 'Every word is in place. This is now your reference list — hover or tap an underlined word for its glossary entry.'
                : 'Drag each word onto the definition it belongs to, or <b>tap a word and then tap its definition</b>. ' +
                  'With a keyboard, press Enter on a word, then Enter on a definition. A wrong match stays in the bank ' +
                  'and tells you which mix-up it was.';
            wrap.appendChild(how);

            if (!done) {
                const bank = U.el('div', 'wm-bank');
                bank.setAttribute('aria-label', 'Words still to place');
                const left = BANK_ORDER.filter(k => !placed[k]);
                left.forEach(k => {
                    const chip = U.el('button', 'wm-chip' + (selected === k ? ' sel' : ''));
                    chip.type = 'button';
                    chip.textContent = W[k].label;
                    chip.setAttribute('data-k', k);
                    chip.setAttribute('aria-pressed', selected === k ? 'true' : 'false');
                    wireChip(chip, k);
                    bank.appendChild(chip);
                });
                wrap.appendChild(bank);
            }

            const cards = U.el('div', 'wm-cards');
            (done ? WORDS.map(w => w.k) : CARD_ORDER).forEach(k => {
                const w = W[k], isDone = !!placed[k];
                const card = U.el('div', 'wm-card' + (isDone ? ' done' : '') + (!isDone && selected ? ' armed' : ''));
                card.setAttribute('data-card', k);
                if (!isDone) {
                    card.setAttribute('role', 'button');
                    card.setAttribute('tabindex', '0');
                    card.setAttribute('aria-label', 'Definition: ' + w.def + (selected ? ' Press Enter to place ' + W[selected].label + ' here.' : ''));
                }
                const slot = U.el('div', 'wm-slot');
                if (isDone) {
                    // a real glossary term again, now that it cannot give an answer away
                    const def = glossaryDef(w.gloss);
                    slot.innerHTML = '<span class="term"' + (def ? ' data-def="' + esc(def) + '"' : '') + '>' +
                        esc(w.label) + '</span>';
                } else {
                    slot.textContent = selected ? 'Place “' + W[selected].label + '” here' : 'Drop a word here';
                }
                card.appendChild(slot);
                const def = U.el('p', 'wm-def');
                def.textContent = w.def;
                card.appendChild(def);
                if (note && note.card === k) {
                    const n = U.el('p', 'wm-note ' + note.cls);
                    n.setAttribute('role', 'status');
                    n.innerHTML = note.html;
                    card.appendChild(n);
                }
                if (!isDone) {
                    card.addEventListener('click', () => { if (selected) attempt(selected, k, true); });
                    card.addEventListener('keydown', e => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        if (selected) attempt(selected, k, true, true);
                    });
                }
                cards.appendChild(card);
            });
            wrap.appendChild(cards);

            if (done) {
                const box = U.el('div', 'wm-done');
                box.innerHTML = '<h5>' + (revealed ? 'The seven words' : 'All seven, separated') + '</h5>' +
                    '<p>Three pairs are worth keeping apart for the rest of this unit:</p><ul>' +
                    '<li><b>Chromatin and chromosome</b> — the same DNA, packed differently.</li>' +
                    '<li><b>Chromosome and chromatid</b> — a copied chromosome is two chromatids; count centromeres, not arms.</li>' +
                    '<li><b>Centromere and centriole</b> — a place on the chromosome, and a structure out in the cytoplasm.</li>' +
                    '</ul><p>The five stages of mitosis, next, lean on these words in almost every sentence.</p>';
                wrap.appendChild(box);
            }

            const btns = U.el('div', 'sim-buttons');
            if (!done) U.button(btns, 'Show all answers').addEventListener('click', () => {
                WORDS.forEach(w => { placed[w.k] = true; });
                revealed = true; selected = null; note = null; render();
            });
            else U.button(btns, 'Start again').addEventListener('click', () => {
                placed = {}; revealed = false; selected = null; wrongs = 0; note = null; render();
            });
            wrap.appendChild(btns);

            if (focusKey) {
                const el = wrap.querySelector(focusKey);
                if (el) el.focus({ preventScroll: true });
            }
        }

        // byTap: after a miss the word stays picked up, so the next tap can try
        // another definition. A dragged word is dropped back into the bank.
        function attempt(k, card, byTap, byKey) {
            if (placed[k] || placed[card]) return;
            if (k === card) {
                placed[k] = true;
                selected = null;
                note = { card, cls: 'ok', html: '<b>' + W[k].label + '.</b> ' + W[k].right };
                const next = BANK_ORDER.find(x => !placed[x]);
                render(byKey && next ? '.wm-chip[data-k="' + next + '"]' : null);
            } else {
                wrongs++;
                selected = byTap ? k : null;
                note = { card, cls: 'bad', html: wrongMsg(k, card) };
                render(byKey ? '.wm-card[data-card="' + card + '"]' : null);
                const el = wrap.querySelector('.wm-card[data-card="' + card + '"]');
                if (el) { el.classList.add('miss'); setTimeout(() => el.classList.remove('miss'), 700); }
            }
        }

        function cardAt(x, y) {
            const el = document.elementFromPoint(x, y);
            const card = el && el.closest && el.closest('.wm-card');
            return card && wrap.contains(card) && !card.classList.contains('done') ? card : null;
        }

        function wireChip(chip, k) {
            let start = null, suppressClick = false;
            chip.addEventListener('pointerdown', e => {
                if (e.button > 0) return;
                start = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
                chip.setPointerCapture(e.pointerId);
            });
            chip.addEventListener('pointermove', e => {
                if (!start) return;
                if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
                    const ghost = U.el('div', 'wm-ghost');
                    ghost.textContent = W[k].label;
                    wrap.appendChild(ghost);   // inside .wm so theme variables apply
                    chip.classList.add('lift');
                    dragging = { k, ghost, hot: null };
                }
                if (dragging) {
                    const g = dragging.ghost;
                    // on a touch screen, hold the word above the finger so it stays visible
                    g.style.transform = 'translate(' + (e.clientX - g.offsetWidth / 2) + 'px,' +
                        (e.clientY - g.offsetHeight * (start.touch ? 1.8 : 0.5)) + 'px)';
                    const hot = cardAt(e.clientX, e.clientY);
                    if (hot !== dragging.hot) {
                        if (dragging.hot) dragging.hot.classList.remove('hot');
                        if (hot) hot.classList.add('hot');
                        dragging.hot = hot;
                    }
                }
            });
            const finish = drop => {
                if (dragging) {
                    suppressClick = true;
                    const hot = dragging.hot;
                    dragging.ghost.remove();
                    chip.classList.remove('lift');
                    if (hot) hot.classList.remove('hot');
                    dragging = null;
                    if (drop && hot) attempt(k, hot.getAttribute('data-card'), false);
                }
                start = null;
            };
            chip.addEventListener('pointerup', () => finish(true));
            chip.addEventListener('pointercancel', () => finish(false));
            const toggle = () => {
                selected = selected === k ? null : k;
                note = null;
                render('.wm-chip[data-k="' + k + '"]');
            };
            chip.addEventListener('click', () => {
                if (suppressClick) { suppressClick = false; return; }
                toggle();
            });
            // handled on keydown rather than left to the button's own activation,
            // which not every environment synthesises into a click
            chip.addEventListener('keydown', e => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                toggle();
            });
        }

        render();

        root._simState = () => ({
            placed: WORDS.filter(w => placed[w.k]).map(w => w.k),
            remaining: WORDS.filter(w => !placed[w.k]).map(w => w.k),
            selected, wrongs, revealed, complete: complete()
        });
        root._simSolve = () => {
            WORDS.forEach(w => { placed[w.k] = true; });
            selected = null; note = null; render();
        };
    };
})();
