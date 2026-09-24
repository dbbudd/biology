/* =============================================================
   INTERACTIVE — Build a DNA molecule, then copy it
   -------------------------------------------------------------
   Registers window.SIMS['dna-replication'].  Supports HS-LS1-1.

   Two phases, because the learning target has two halves:
     PHASE 1 "build"  — pair bases against a template. Teaches the
       pairing rules, and that they are rules, not preferences.
     PHASE 2 "copy"   — unzip the finished molecule and build a new
       strand on one of the two templates. The other daughter is
       completed automatically once the reader has proved they can
       do it, because doing the same ten placements twice teaches
       nothing new and only costs patience.

   The payoff is withheld until phase 2 finishes: both daughters
   are half original, half new. That is semiconservative
   replication, and it is a conclusion the reader arrives at by
   looking at their own work rather than being told.

   Works by drag-and-drop, by click-then-click, and from the keyboard.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-dna-style';

    const PAIR = { A: 'T', T: 'A', G: 'C', C: 'G' };
    const FULL = { A: 'adenine', T: 'thymine', G: 'guanine', C: 'cytosine' };
    const LEN  = 10;

    // Why a wrong pairing is wrong — the shape reason, not just "no".
    const WHY = {
        'A-G': 'Adenine and guanine are both purines — two large bases. Put them opposite each other and the strands bulge apart. A pairs with T.',
        'A-C': 'Adenine pairs with thymine, not cytosine. Adenine forms two hydrogen bonds, and only thymine offers the matching two.',
        'A-A': 'Two adenines cannot pair — their hydrogen bonds face the wrong way. Adenine pairs with thymine.',
        'T-C': 'Thymine and cytosine are both pyrimidines — two small bases. Opposite each other they leave a gap. T pairs with A.',
        'T-G': 'Thymine pairs with adenine, not guanine. Guanine needs three hydrogen bonds; thymine only offers two.',
        'T-T': 'Two thymines cannot pair. Thymine pairs with adenine.',
        'G-A': 'Guanine and adenine are both purines — too wide to fit together. G pairs with C.',
        'G-T': 'Guanine forms three hydrogen bonds and needs a partner that offers three. Thymine offers two. G pairs with C.',
        'G-G': 'Two guanines cannot pair. Guanine pairs with cytosine.',
        'C-T': 'Cytosine and thymine are both pyrimidines — the strands would collapse inwards. C pairs with G.',
        'C-A': 'Cytosine needs three hydrogen bonds; adenine offers two. C pairs with G.',
        'C-C': 'Two cytosines cannot pair. Cytosine pairs with guanine.'
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.dna { padding: 1rem 1.25rem 0.25rem; }',
            '.dna { --dna-ok:#2e7d32; --dna-bad:#aa272f;',
            '       --b-a:#3f8f4a; --b-t:#c0392b; --b-g:#2f6fb5; --b-c:#c78a18; }',
            '[data-theme="dark"] .dna { --dna-ok:#7fc98a; --dna-bad:#e08a90;',
            '       --b-a:#68c47a; --b-t:#e07a80; --b-g:#6fa8dc; --b-c:#e0b755; }',
            '[data-theme="sepia"] .dna { --dna-ok:#4a6b3d; --dna-bad:#a04040; }',
            '.dna-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; }',
            '.dna-phase { font-size:0.62rem; font-weight:700; letter-spacing:0.09em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.4rem; }',

            '.dna-mol { overflow-x:auto; padding-bottom:0.35rem; margin-bottom:0.6rem; }',
            '.dna-strand { display:flex; gap:3px; min-width:min-content; }',
            '.dna-rungs { display:flex; gap:3px; min-width:min-content; height:14px; }',
            '.dna-rung { width:38px; display:flex; align-items:center; justify-content:center; }',
            '.dna-rung i { display:block; width:2px; height:100%; background:var(--border); }',
            '.dna-rung.on i { background:var(--dna-ok); width:3px; }',

            '.dna-base { width:38px; height:38px; flex:none; border-radius:7px;',
            '   display:flex; align-items:center; justify-content:center;',
            '   font-weight:800; font-size:0.95rem; color:#fff; border:1px solid transparent; }',
            '.b-A { background:var(--b-a); } .b-T { background:var(--b-t); }',
            '.b-G { background:var(--b-g); } .b-C { background:var(--b-c); }',
            '.dna-base.tmpl { opacity:0.92; }',
            '.dna-base.orig { box-shadow:inset 0 0 0 2px rgba(255,255,255,0.55); }',

            '.dna-slot { width:38px; height:38px; flex:none; border-radius:7px; font:inherit;',
            '   border:1.5px dashed var(--border); background:transparent; cursor:pointer;',
            '   color:var(--text-secondary); font-weight:800; font-size:0.95rem;',
            '   touch-action:manipulation; transition:all 0.12s; padding:0; }',
            '.dna-slot:hover { border-color:var(--light-teal); }',
            '.dna-slot:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.dna-slot.over { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.dna-slot.wrong { border-style:solid; border-color:var(--dna-bad); color:var(--dna-bad); }',

            '.dna-label { font-size:0.62rem; font-weight:700; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0.5rem 0 0.2rem; }',
            '.dna-palette { display:flex; gap:0.4rem; flex-wrap:wrap; margin:0.9rem 0 0.2rem;',
            '   align-items:center; }',
            '.dna-tile { font:inherit; cursor:grab; width:46px; height:46px; border-radius:9px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text);',
            '   font-weight:800; font-size:1.05rem; touch-action:manipulation; transition:all 0.12s;',
            '   display:flex; flex-direction:column; align-items:center; justify-content:center; }',
            '.dna-tile small { font-size:0.5rem; font-weight:600; letter-spacing:0.04em;',
            '   text-transform:uppercase; opacity:0.7; }',
            '.dna-tile:hover { border-color:var(--light-teal); }',
            '.dna-tile:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.dna-tile[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); }',
            '.dna-tile.t-A { color:var(--b-a); } .dna-tile.t-T { color:var(--b-t); }',
            '.dna-tile.t-G { color:var(--b-g); } .dna-tile.t-C { color:var(--b-c); }',

            '.dna-daughters { display:grid; gap:1rem; grid-template-columns:1fr; }',
            '.dna-daughter { border:1px solid var(--border); border-radius:10px; padding:0.7rem 0.8rem; }',
            '.dna-daughter h6 { margin:0 0 0.45rem; font-size:0.72rem; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); font-weight:700; }',

            '.dna-msg { margin:0.85rem 0 0; font-size:0.82rem; line-height:1.5; min-height:2.6em; }',
            '.dna-msg.ok { color:var(--dna-ok); } .dna-msg.bad { color:var(--dna-bad); }',
            '.dna-count { font-size:0.72rem; color:var(--text-secondary); margin:0.5rem 0 0; }',
            '.dna-reveal { margin-top:1rem; border:1px solid var(--dna-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .dna-reveal { background:rgba(127,201,138,0.12); }',
            '.dna-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.dna-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.dna-key { font-size:0.72rem; color:var(--text-secondary); margin:0.6rem 0 0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    const randSeq = n => Array.from({ length: n },
        () => 'ATGC'[Math.floor(Math.random() * 4)]).join('');

    window.SIMS['dna-replication'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'dna');
        const how  = U.el('p', 'dna-how');
        const phaseLab = U.el('p', 'dna-phase');
        const stage = U.el('div');
        const palette = U.el('div', 'dna-palette');
        const msg = U.el('p', 'dna-msg');
        msg.setAttribute('role', 'status');
        msg.setAttribute('aria-live', 'polite');
        const count = U.el('p', 'dna-count');
        const revealHost = U.el('div');

        wrap.appendChild(how); wrap.appendChild(phaseLab); wrap.appendChild(stage);
        wrap.appendChild(palette); wrap.appendChild(msg); wrap.appendChild(count);
        wrap.appendChild(revealHost);
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const nextBtn  = U.button(buttons, 'Unzip and copy it');
        const resetBtn = U.button(buttons, 'New sequence');
        wrap.appendChild(buttons);

        // ---------- state ----------
        let template = '';     // the strand the reader pairs against, 5' -> 3'
        let built = [];        // phase 1 answers
        let copy = [];         // phase 2 answers (new strand on template A)
        let phase = 'build';
        let selected = null;

        function reset() {
            template = randSeq(LEN);
            built = new Array(LEN).fill(null);
            copy  = new Array(LEN).fill(null);
            phase = 'build'; selected = null;
            msg.textContent = ''; msg.className = 'dna-msg';
            revealHost.innerHTML = '';
            render();
        }

        const doneBuild = () => built.every((b, i) => b === PAIR[template[i]]);
        const doneCopy  = () => copy.every((b, i) => b === PAIR[template[i]]);

        function place(base, i) {
            const arr = phase === 'build' ? built : copy;
            const want = PAIR[template[i]];
            arr[i] = base;
            selected = null;
            if (base === want) {
                msg.textContent = FULL[template[i]] + ' pairs with ' + FULL[base] + '. ' +
                    (base === 'A' || base === 'T'
                        ? 'A and T are held together by two hydrogen bonds.'
                        : 'G and C are held together by three hydrogen bonds, which makes that pair the stronger of the two.');
                msg.className = 'dna-msg ok';
            } else {
                msg.textContent = WHY[template[i] + '-' + base] ||
                    (FULL[template[i]] + ' does not pair with ' + FULL[base] + '.');
                msg.className = 'dna-msg bad';
            }
            render();
        }

        function clear(i) {
            (phase === 'build' ? built : copy)[i] = null;
            msg.textContent = ''; msg.className = 'dna-msg';
            render();
        }

        function baseEl(b, cls) {
            const e = U.el('div', 'dna-base b-' + b + (cls ? ' ' + cls : ''));
            e.textContent = b;
            return e;
        }

        function slotEl(arr, i) {
            const b = arr[i];
            const s = U.el('button', 'dna-slot');
            s.type = 'button';
            if (b) {
                s.textContent = b;
                if (b === PAIR[template[i]]) {
                    s.className = 'dna-base b-' + b;      // correct: becomes a solid base
                    s.style.cursor = 'pointer';
                } else {
                    s.classList.add('wrong');
                }
                s.setAttribute('aria-label', b + ' placed at position ' + (i + 1) +
                    (b === PAIR[template[i]] ? ', correct' : ', not correct') + '. Activate to remove.');
                s.addEventListener('click', () => clear(i));
            } else {
                s.setAttribute('aria-label', 'Empty position ' + (i + 1) +
                    ', opposite ' + FULL[template[i]]);
                s.addEventListener('click', () => { if (selected) place(selected, i); });
            }
            s.addEventListener('dragover', e => { e.preventDefault(); s.classList.add('over'); });
            s.addEventListener('dragleave', () => s.classList.remove('over'));
            s.addEventListener('drop', e => {
                e.preventDefault(); s.classList.remove('over');
                const k = e.dataTransfer.getData('text/plain');
                if (k) place(k, i);
            });
            return s;
        }

        function strandRow(chars, cls) {
            const r = U.el('div', 'dna-strand');
            chars.split('').forEach(ch => r.appendChild(baseEl(ch, cls)));
            return r;
        }
        function slotRow(arr) {
            const r = U.el('div', 'dna-strand');
            for (let i = 0; i < LEN; i++) r.appendChild(slotEl(arr, i));
            return r;
        }
        function rungRow(arr) {
            const r = U.el('div', 'dna-rungs');
            for (let i = 0; i < LEN; i++) {
                const c = U.el('div', 'dna-rung' + (arr[i] === PAIR[template[i]] ? ' on' : ''));
                c.appendChild(document.createElement('i'));
                r.appendChild(c);
            }
            return r;
        }
        function label(t) { const e = U.el('p', 'dna-label'); e.textContent = t; return e; }

        function render() {
            // ---- instructions + phase ----
            how.textContent = phase === 'build'
                ? 'Pair a base against every base of the template strand. Drag a base down, or click a base and then click a space. Click a placed base to take it back.'
                : 'The molecule has unzipped. Each original strand is now a template for a new one. Build the new strand on the left-hand template — the right-hand one will then be completed for you.';
            phaseLab.textContent = phase === 'build'
                ? 'Step 1 of 2 — build the molecule'
                : 'Step 2 of 2 — copy it';

            stage.innerHTML = '';
            if (phase === 'build') {
                const box = U.el('div', 'dna-mol');
                box.appendChild(label('Template strand'));
                box.appendChild(strandRow(template, 'tmpl'));
                box.appendChild(rungRow(built));
                box.appendChild(slotRow(built));
                box.appendChild(label('Your strand'));
                stage.appendChild(box);
            } else {
                const grid = U.el('div', 'dna-daughters');
                // daughter 1 — reader builds this one
                const d1 = U.el('div', 'dna-daughter');
                const h1 = document.createElement('h6');
                h1.textContent = 'Daughter molecule 1';
                d1.appendChild(h1);
                const m1 = U.el('div', 'dna-mol');
                m1.appendChild(label('Original strand (kept)'));
                m1.appendChild(strandRow(template, 'orig'));
                m1.appendChild(rungRow(copy));
                m1.appendChild(slotRow(copy));
                m1.appendChild(label('New strand'));
                d1.appendChild(m1);
                grid.appendChild(d1);

                // daughter 2 — filled in once daughter 1 is right
                const other = built.join('');
                const d2 = U.el('div', 'dna-daughter');
                const h2 = document.createElement('h6');
                h2.textContent = 'Daughter molecule 2';
                d2.appendChild(h2);
                const m2 = U.el('div', 'dna-mol');
                m2.appendChild(label('Original strand (kept)'));
                m2.appendChild(strandRow(other, 'orig'));
                if (doneCopy()) {
                    const full = new Array(LEN).fill(null)
                        .map((_, i) => PAIR[other[i]]);
                    m2.appendChild(rungRow(full.map((b, i) => PAIR[template[i]] === b ? b : b)));
                    m2.appendChild(strandRow(full.join('')));
                    m2.appendChild(label('New strand'));
                } else {
                    const wait = U.el('p', 'dna-key');
                    wait.textContent = 'Waiting — finish daughter 1 first.';
                    m2.appendChild(wait);
                }
                d2.appendChild(m2);
                grid.appendChild(d2);
                stage.appendChild(grid);
            }

            // ---- palette ----
            palette.innerHTML = '';
            if (!(phase === 'copy' && doneCopy())) {
                'ATGC'.split('').forEach(b => {
                    const t = U.el('button', 'dna-tile t-' + b);
                    t.type = 'button'; t.draggable = true;
                    t.innerHTML = b + '<small>' + FULL[b].slice(0, 3) + '</small>';
                    t.setAttribute('aria-pressed', selected === b ? 'true' : 'false');
                    t.setAttribute('aria-label', FULL[b]);
                    t.addEventListener('click', () => { selected = selected === b ? null : b; render(); });
                    t.addEventListener('dragstart', e => {
                        e.dataTransfer.setData('text/plain', b);
                        e.dataTransfer.effectAllowed = 'copy';
                        selected = b;
                    });
                    palette.appendChild(t);
                });
                const k = U.el('p', 'dna-key');
                k.textContent = 'A pairs with T · G pairs with C';
                palette.appendChild(k);
            }

            // ---- progress + buttons ----
            const arr = phase === 'build' ? built : copy;
            const right = arr.filter((b, i) => b === PAIR[template[i]]).length;
            count.textContent = right + ' of ' + LEN + ' correctly paired.';
            nextBtn.hidden = !(phase === 'build' && doneBuild());
            if (phase === 'copy' && doneCopy()) showReveal();
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const d = U.el('div', 'dna-reveal');
            d.innerHTML =
                '<h5>Look at what you ended up with.</h5>' +
                '<p>Two molecules, and they are identical to each other and to the one you started with. ' +
                'But look at the shading: <strong>each daughter molecule is half original and half new</strong>. ' +
                'Neither one is a brand-new molecule, and neither one is the old molecule untouched. ' +
                'Every copy keeps one of the two original strands. Biologists call this ' +
                '<strong>semiconservative</strong> replication — half of the parent is conserved in each child.</p>' +
                '<p>Now notice something about the work you just did: at no point did you have to ' +
                '<em>remember</em> the sequence. Each base told you what had to go opposite it. ' +
                'That is the whole reason this molecule can be copied at all — the information is ' +
                'written twice, once on each strand, and either strand is enough to rebuild the other.</p>';
            revealHost.appendChild(d);
            msg.textContent = 'Both daughter molecules complete.';
            msg.className = 'dna-msg ok';
        }

        nextBtn.addEventListener('click', () => {
            if (!doneBuild()) return;
            phase = 'copy'; selected = null;
            msg.textContent = 'Unzipped. The hydrogen bonds between the bases break, but the strands themselves stay intact.';
            msg.className = 'dna-msg';
            render();
        });
        resetBtn.addEventListener('click', reset);
        reset();

        root._simState = () => ({
            phase, template,
            built: built.join(''), copy: copy.join(''),
            buildComplete: doneBuild(), copyComplete: doneCopy(),
            correctNow: (phase === 'build' ? built : copy)
                .filter((b, i) => b === PAIR[template[i]]).length
        });
        root._simSolve = () => {                       // verification helper
            const fill = a => { for (let i = 0; i < LEN; i++) a[i] = PAIR[template[i]]; };
            if (phase === 'build') { fill(built); render(); }
            else { fill(copy); render(); }
        };
    };
})();
