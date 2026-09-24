/* =============================================================
   FIGURE 3.17 — Pull out the keystone
   -------------------------------------------------------------
   Registers window.SIMS['u3-keystone'].  Supports HS-LS2-6.

   The metaphor and the experiment it names, side by side:

                    keystone in place     keystone removed
     the metaphor   a stone arch          the same arch, fallen
     the shore      Paine's rock          the same rock, no sea stars

   The keystone stone and the sea stars are drawn in the same
   ochre on purpose, so the eye links them before the words do.

   The right-hand column starts covered. The reader must first
   predict what removing the sea star does to the number of
   species — and the obvious answer ("more: its prey are freed")
   is wrong. Only then does pulling the keystone uncover both
   rows at once. It is an uncover rather than an in-place switch
   because the two shore panels are not pixel-identical rocks;
   side by side, they compare honestly.

   The drawing exaggerates for clarity. The real numbers — fifteen
   species to eight within three years, about five by the end —
   come from Figure 3.16 and are quoted in the result.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u3ks-style';

    const PANELS = {
        archIn:  { src: 'keystone-arch-intact.jpeg',
                   alt: 'A stone arch on two pillars. Its stones press tightly against one another, and the single wedge-shaped stone at the very top is coloured ochre; every other stone is grey.',
                   note: 'Every stone presses on its neighbours. The ochre wedge at the top locks them.' },
        archOut: { src: 'keystone-arch-fallen.jpeg',
                   alt: 'The same two pillars, still standing, but the ochre keystone is gone and every other arch stone has fallen into a heap on the ground between them.',
                   note: 'Only the keystone was taken. Everything else fell.' },
        shoreIn: { src: 'keystone-shore-with.jpeg',
                   alt: 'A rock at low tide crowded with many different species: two ochre sea stars, clusters of mussels, white acorn barnacles, goose barnacles, limpets, chitons, green sea anemones, snails, and red and brown seaweed, with bare rock between them.',
                   note: 'With the sea star: mussels, barnacles, limpets, chitons, anemones, snails and seaweed.' },
        shoreOut:{ src: 'keystone-shore-without.jpeg',
                   alt: 'A rock at low tide with no sea stars at all, covered almost entirely by a dense carpet of dark mussels with goose barnacles among them. The seaweed, limpets, chitons and anemones are gone.',
                   note: 'Without it: mussels carpet the rock. The seaweed, limpets, chitons and anemones are gone.' }
    };

    const CHOICES = [
        { k: 'up',   t: 'It went up — the sea star’s prey were set free' },
        { k: 'down', t: 'It went down' },
        { k: 'same', t: 'It stayed about the same' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u3ks { --ks-ok:#2e7d32; --ks-bad:#aa272f; --ks-ochre:#c9852e; }',
            '[data-theme="dark"] .u3ks { --ks-ok:#7fc98a; --ks-bad:#e8878f; --ks-ochre:#e0a85a; }',
            '.u3ks-grid { display:grid; grid-template-columns:auto 1fr 1fr; gap:0.55rem 0.7rem; align-items:start; }',
            '.u3ks-colhead { font-size:0.72rem; font-weight:800; letter-spacing:0.05em; text-transform:uppercase;',
            '   color:var(--text-secondary); text-align:center; padding-bottom:0.1rem; }',
            '.u3ks-rowhead { font-size:0.8rem; font-weight:700; color:var(--text); writing-mode:vertical-rl; text-orientation:sideways;',
            '   transform:rotate(180deg); text-align:center; align-self:center; white-space:nowrap; }',
            '.u3ks-cell { position:relative; }',
            '.u3ks-cell img { display:block; width:100%; height:auto; margin:0; border-radius:10px;',
            '   border:1px solid var(--border); }',
            '.u3ks-note { font-size:0.74rem; line-height:1.45; color:var(--text-secondary); margin:0.3rem 0 0; }',
            // the covered column: the image is present but hidden behind a panel until the pull
            '.u3ks-frame { position:relative; }',
            // the cover is pinned to the image itself, not to an aspect ratio, so text wrapping on a
            // narrow screen can never make it spill past the picture it hides
            '.u3ks-cover { position:absolute; inset:0; overflow:hidden; border-radius:10px;',
            '   display:flex; align-items:center; justify-content:center; text-align:center;',
            '   background:repeating-linear-gradient(135deg, var(--bg-surface) 0 10px, var(--bg) 10px 20px);',
            '   border:1px dashed var(--text-secondary); color:var(--text-secondary);',
            '   font-size:0.8rem; font-weight:700; padding:0.5rem; transition:opacity 0.6s ease; }',
            '.u3ks-cover span { font-size:1.6rem; display:block; line-height:1; margin-bottom:0.2rem; }',
            '.u3ks-hidden { visibility:hidden; }',
            '.u3ks-out img, .u3ks-out .u3ks-note { transition:opacity 0.6s ease 0.15s; }',
            '.u3ks.pulled .u3ks-cover { opacity:0; pointer-events:none; }',
            '.u3ks-q { margin:1rem 0 0.45rem; font-size:0.9rem; font-weight:700; }',
            '.u3ks-opts { display:flex; flex-direction:column; gap:0.35rem; }',
            '.u3ks-opt { font:inherit; font-size:0.85rem; text-align:left; cursor:pointer; padding:0.5rem 0.75rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text);',
            '   touch-action:manipulation; }',
            '.u3ks-opt:hover { border-color:var(--light-teal); }',
            '.u3ks-opt[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); font-weight:700; }',
            '.u3ks.pulled .u3ks-opt { cursor:default; }',
            '.u3ks-opt.right { border-color:var(--ks-ok); box-shadow:0 0 0 2px var(--ks-ok); }',
            '.u3ks-opt.wrong { border-color:var(--ks-bad); box-shadow:0 0 0 2px var(--ks-bad); }',
            '.u3ks .sim-buttons { padding:0; margin-top:0.75rem; }',
            '.u3ks .sim-btn:disabled { opacity:0.45; cursor:not-allowed; }',
            '.u3ks-result { margin-top:0.85rem; border:1px solid var(--border); border-left:4px solid var(--ks-ochre);',
            '   border-radius:8px; background:var(--bg-surface); padding:0.8rem 0.95rem; font-size:0.86rem; line-height:1.65; }',
            '.u3ks-result p { margin:0 0 0.55rem; } .u3ks-result p:last-child { margin-bottom:0; }',
            '.u3ks-verdict { font-weight:800; }',
            '.u3ks-verdict.right { color:var(--ks-ok); } .u3ks-verdict.wrong { color:var(--ks-bad); }',
            '@media (max-width:560px) { .u3ks-grid { gap:0.45rem 0.45rem; } .u3ks-note { font-size:0.7rem; }',
            '   .u3ks-cover { font-size:0.66rem; padding:0.2rem; } .u3ks-cover span { font-size:1.15rem; } }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u3-keystone'] = function (root) {
        injectStyle();
        const IMG = (document.body.dataset.root || '../') + 'images/u3/';
        const wrap = U.el('div', 'u3ks');
        root.appendChild(wrap);

        let guess = null, pulled = false;

        function cell(key, isOut) {
            const P = PANELS[key];
            const c = U.el('div', 'u3ks-cell' + (isOut ? ' u3ks-out' : ''));
            const img = document.createElement('img');
            img.src = IMG + P.src;
            img.alt = P.alt;
            img.loading = 'lazy';
            const note = U.el('p', 'u3ks-note');
            note.textContent = P.note;
            const frame = U.el('div', 'u3ks-frame');
            frame.appendChild(img);
            c.appendChild(frame);
            c.appendChild(note);
            if (isOut) {
                // until the pull, the answer is hidden from sight and from screen readers
                img.classList.toggle('u3ks-hidden', !pulled);
                note.classList.toggle('u3ks-hidden', !pulled);
                img.setAttribute('aria-hidden', pulled ? 'false' : 'true');
                const cover = U.el('div', 'u3ks-cover');
                cover.innerHTML = '<div><span>?</span>What happens<br>without it?</div>';
                cover.setAttribute('aria-hidden', 'true');
                frame.appendChild(cover);
            }
            return c;
        }

        function render() {
            wrap.innerHTML = '';
            wrap.classList.toggle('pulled', pulled);

            const grid = U.el('div', 'u3ks-grid');
            grid.appendChild(U.el('div'));
            const h1 = U.el('div', 'u3ks-colhead'); h1.textContent = 'Keystone in place'; grid.appendChild(h1);
            const h2 = U.el('div', 'u3ks-colhead'); h2.textContent = 'Keystone removed'; grid.appendChild(h2);

            const r1 = U.el('div', 'u3ks-rowhead'); r1.textContent = 'The metaphor'; grid.appendChild(r1);
            grid.appendChild(cell('archIn', false));
            grid.appendChild(cell('archOut', true));

            const r2 = U.el('div', 'u3ks-rowhead'); r2.textContent = 'Paine’s shore'; grid.appendChild(r2);
            grid.appendChild(cell('shoreIn', false));
            grid.appendChild(cell('shoreOut', true));
            wrap.appendChild(grid);

            const q = U.el('p', 'u3ks-q');
            q.textContent = pulled
                ? 'Your prediction'
                : 'Before you pull it: Paine removed every ochre sea star from his plot. What happened to the number of species living on that rock?';
            wrap.appendChild(q);

            const opts = U.el('div', 'u3ks-opts');
            CHOICES.forEach(ch => {
                const b = U.el('button', 'u3ks-opt');
                b.type = 'button';
                b.textContent = ch.t;
                b.setAttribute('aria-pressed', guess === ch.k ? 'true' : 'false');
                if (pulled && guess === ch.k) b.classList.add(ch.k === 'down' ? 'right' : 'wrong');
                b.disabled = pulled;
                b.addEventListener('click', () => { if (!pulled) { guess = ch.k; render(); } });
                opts.appendChild(b);
            });
            wrap.appendChild(opts);

            const btns = U.el('div', 'sim-buttons');
            const pull = U.button(btns, pulled ? 'Put it back' : 'Pull out the keystone', pulled ? '' : 'primary');
            pull.disabled = !pulled && !guess;
            pull.addEventListener('click', () => {
                if (pulled) { pulled = false; guess = null; }
                else pulled = true;
                render();
            });
            wrap.appendChild(btns);

            if (!pulled) {
                const hint = U.el('p', 'u3ks-note');
                hint.textContent = guess ? 'Now pull it, and see both rows at once.'
                                         : 'Commit to an answer first — the button unlocks once you do.';
                wrap.appendChild(hint);
                return;
            }

            const right = guess === 'down';
            const res = U.el('div', 'u3ks-result');
            res.setAttribute('role', 'status');
            res.innerHTML =
                '<p><span class="u3ks-verdict ' + (right ? 'right' : 'wrong') + '">' +
                (right ? 'Yes — it went down.' : guess === 'up'
                    ? 'That is the answer almost everyone gives, and it is wrong. It went down.'
                    : 'It did not stay the same. It went down.') + '</span> ' +
                'In Paine’s plot the number of species fell from <strong>fifteen to eight within three years</strong>, ' +
                'and to about five by the end &mdash; the result in Figure 3.16.</p>' +
                '<p>Removing a predator did free its prey. But one of those prey, the mussel, is a superb competitor for ' +
                'the thing everything on that rock needs: <strong>space</strong>. With nothing eating it, the mussel covered ' +
                'the rock and smothered the barnacles, limpets, chitons and seaweed that had been living there. The sea star ' +
                'had been holding the whole community in place without anyone noticing &mdash; which is exactly what a ' +
                'keystone does in an arch.</p>' +
                '<p style="color:var(--text-secondary);font-size:0.8rem">The drawing exaggerates the loss so it shows at a ' +
                'glance. Use the numbers above, not the picture, when you write about it.</p>';
            wrap.appendChild(res);
        }

        render();

        root._simState = () => ({ guess, pulled, correct: pulled ? guess === 'down' : null });
        root._simSolve = () => { guess = 'down'; pulled = true; render(); return root._simState(); };
    };
})();
