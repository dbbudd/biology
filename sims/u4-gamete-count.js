/* =============================================================
   INTERACTIVE — Four gametes or one
   -------------------------------------------------------------
   Registers window.SIMS['u4-gamete-count'].
   Supports HS-LS1-2, HS-LS1-4.

   Built on the numbered version of the Figure 4.25 artwork
   (images/u4/gametogenesis.jpeg, 2000 x 1116 in its own units).
   Flow drew twelve small numbered circles, each with a leader line
   to one cell; the markers below sit exactly over those circles
   and are deliberately larger, so the printed digits never have to
   be legible. Same pattern as sims/u4-label-anatomy.js.

   The reader works down the diagram one row at a time. Rows they
   have not reached are washed out, so the ending is not visible
   while they are still predicting. In each row they name every
   cell, then answer one question about it, and only then does the
   explanation appear — commit first, read after.

   Ploidy is stated by the model, not typed next to a picture. That
   matters here specifically: the old deck placed "(diploid; in
   prophase of meiosis I)" beside SECONDARY spermatocyte, and a
   secondary spermatocyte is haploid. Stage 3 is built around that.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    const STYLE_ID = 'sim-u4gc-style';

    const W = 2000, H = 1116, R = 62;

    /* Row bands measured from the artwork's own white gutters. */
    const BANDS = [[0, 209], [209, 429], [429, 649], [649, 868], [868, H]];

    /* Every numbered circle in the artwork, with the row it belongs to.
       x/y are the centres of Flow's printed circles. */
    const CELLS = [
        { k: 'spermatogonium', row: 0, x: 144, y: 105, side: 'sperm',
          name: 'Spermatogonium',
          opts: ['Primary spermatocyte', 'Spermatid', 'Sperm'],
          why: 'The stem cell of the testis. Diploid, and it divides by <b>mitosis</b> — this is the supply, not the meiosis.' },
        { k: 'oogonium', row: 0, x: 1855, y: 105, side: 'egg',
          name: 'Oogonium',
          opts: ['Primary oocyte', 'Ovum', 'Polar body'],
          why: 'The matching stem cell in the ovary. Also diploid, also mitotic — but every one a person will ever have is made before they are born.' },

        { k: 'primary-spermatocyte', row: 1, x: 144, y: 323, side: 'sperm',
          name: 'Primary spermatocyte',
          opts: ['Secondary spermatocyte', 'Spermatogonium', 'Spermatid'],
          why: 'It has grown and entered meiosis I. Still <b>diploid</b> — 46 chromosomes, each now two chromatids.' },
        { k: 'primary-oocyte', row: 1, x: 1855, y: 323, side: 'egg',
          name: 'Primary oocyte',
          opts: ['Secondary oocyte', 'Oogonium', 'Ootid'],
          why: 'The same stage on the egg side, and far larger. It is paused in prophase I, and has been since before birth.' },

        { k: 'secondary-spermatocyte', row: 2, x: 144, y: 545, side: 'sperm',
          name: 'Secondary spermatocyte',
          opts: ['Primary spermatocyte', 'Spermatid', 'Spermatogonium'],
          why: 'Meiosis I is finished, so there are two of them and each is <b>haploid</b>. The cytoplasm was split equally.' },
        { k: 'secondary-oocyte', row: 2, x: 1855, y: 487, side: 'egg',
          name: 'Secondary oocyte',
          opts: ['First polar body', 'Primary oocyte', 'Ootid'],
          why: 'The large product of meiosis I. Haploid, and it kept almost all of the cytoplasm.' },
        { k: 'first-polar-body', row: 2, x: 1855, y: 586, side: 'egg',
          name: 'First polar body',
          opts: ['Secondary oocyte', 'Ootid', 'Oogonium'],
          why: 'The other product of the same division — a full haploid set of chromosomes with almost no cytoplasm around it.' },

        { k: 'spermatid', row: 3, x: 144, y: 760, side: 'sperm',
          name: 'Spermatids',
          opts: ['Secondary spermatocytes', 'Sperm', 'Spermatogonia'],
          why: 'Four of them, equal in size, haploid. Meiosis is over; what is left is reshaping.' },
        { k: 'ootid', row: 3, x: 1855, y: 713, side: 'egg',
          name: 'Ootid',
          opts: ['Secondary oocyte', 'Ovum', 'Polar body'],
          why: 'The large product of meiosis II, haploid, still holding the stockpile.' },
        { k: 'polar-bodies', row: 3, x: 1855, y: 813, side: 'egg',
          name: 'Polar bodies',
          opts: ['Ootids', 'Secondary oocytes', 'Spermatids'],
          why: 'Three now: the second polar body, plus the two the first one divided into. Count the cells in this row — <b>four on each side</b>.' },

        { k: 'sperm', row: 4, x: 144, y: 986, side: 'sperm',
          name: 'Sperm',
          opts: ['Spermatids', 'Secondary spermatocytes', 'Ova'],
          why: 'Four usable gametes, each stripped down to a nucleus, a midpiece of mitochondria and a tail.' },
        { k: 'ovum', row: 4, x: 1855, y: 986, side: 'egg',
          name: 'Ovum',
          opts: ['Ootid', 'Secondary oocyte', 'First polar body'],
          why: 'One usable gamete. The polar bodies beside it break down.' }
    ];

    /* One row of the diagram = one stage of the walkthrough. */
    const STAGES = [
        {
            id: 'stem', name: 'The starting cells',
            ask: {
                q: 'Is a <b>spermatogonium</b> haploid or diploid?',
                opts: [['2n', 'Diploid (2n)'], ['n', 'Haploid (n)']],
                right: '2n',
                ok: 'Yes — diploid. Nothing has halved yet.',
                bad: 'Not yet. Meiosis has not started; these cells are still dividing by mitosis to keep the supply up.'
            },
            say: 'Both pathways start as an ordinary <b>diploid</b> cell in the gonad, dividing by ' +
                 '<b>mitosis</b>. Nothing about meiosis has happened yet.',
            timing: 'In males these cells keep dividing from puberty onwards, so the supply is ' +
                    'continually renewed. In females all of them have already been made, and the ' +
                    'supply is fixed before birth.'
        },
        {
            id: 'primary', name: 'Growth, then meiosis I begins',
            ask: {
                q: 'The primary oocyte is drawn far larger than the primary spermatocyte. What is it doing with that extra volume?',
                opts: [
                    ['cyto', 'Stockpiling cytoplasm, ribosomes, mitochondria and food reserves'],
                    ['chr', 'Carrying extra chromosomes'],
                    ['dna', 'Making more copies of its DNA than the sperm cell does'],
                    ['two', 'Getting ready to divide into more cells than the sperm cell will']
                ],
                right: 'cyto',
                ok: 'Yes. Whatever it builds now is all the zygote will have to live on for its first few days.',
                bad: 'No — both cells are diploid, both have copied their DNA exactly once, and both will end up with four nuclei. The difference is bulk, not genetics.'
            },
            say: 'Each cell has grown and entered meiosis I. Both are still <b>diploid</b> — 46 ' +
                 'chromosomes, each now made of two chromatids. The size difference is the whole ' +
                 'story of this diagram, and it starts here.',
            timing: 'Every primary oocyte a person will ever have is already present and paused in ' +
                    'prophase I before they are born. One of them resumes, decades later, in the ' +
                    'cycle that ovulates it.'
        },
        {
            id: 'secondary', name: 'Meiosis I completes',
            ask: {
                q: 'Is a <b>secondary spermatocyte</b> haploid or diploid?',
                opts: [['2n', 'Diploid (2n)'], ['n', 'Haploid (n)']],
                right: 'n',
                ok: 'Haploid — 23 chromosomes. Meiosis I is the reduction division, and it has already happened.',
                bad: 'No — and this is the exact error to watch for. A secondary spermatocyte has ' +
                     'been through meiosis I, so it has <b>23 chromosomes</b>. It looks diploid ' +
                     'because it still contains 46 <em>chromatids</em>, but chromatids are not ' +
                     'chromosomes. Count centromeres.'
            },
            say: 'Meiosis I has finished, so both pathways now hold <b>two haploid cells</b> — 23 ' +
                 'chromosomes each, still two chromatids each. Here is where they diverge. ' +
                 'Spermatogenesis divides the cytoplasm <em>equally</em>. Oogenesis divides it ' +
                 '<em>very unequally</em>: one cell keeps almost all of it, and the first polar ' +
                 'body gets a full set of chromosomes and almost nothing else.',
            trap: 'A secondary spermatocyte is <b>haploid</b>, and so is a first polar body. Being ' +
                  'small has nothing to do with it — ploidy is a count of chromosomes, not of ' +
                  'cytoplasm.'
        },
        {
            id: 'tetrad', name: 'Meiosis II completes',
            ask: {
                q: 'How many chromosomes does each of the tiny polar bodies contain?',
                opts: [['23', '23'], ['46', '46'], ['0', 'None — they have no nucleus'], ['few', 'A random handful']],
                right: '23',
                ok: 'Yes. A complete haploid set, in a cell with almost no cytoplasm to put it to work in.',
                bad: 'No. Meiosis divided the chromosomes evenly between all four cells — every one ' +
                     'of them got a complete haploid set. It was the cytoplasm that was divided unevenly.'
            },
            say: 'Meiosis II has separated the sister chromatids. <b>Both pathways have now made four ' +
                 'haploid nuclei</b> — the meiosis is identical. Four equal spermatids on the left; ' +
                 'one large ootid and three tiny polar bodies on the right.',
            trap: 'The polar bodies are not mistakes, and they are not the wreckage of a failed ' +
                  'division. They are the price of concentrating the cytoplasm. A cell cannot both ' +
                  'split its cytoplasm four ways and give one gamete enough to build an embryo with.'
        },
        {
            id: 'final', name: 'Maturation', final: true,
            ask: {
                q: 'Both pathways made <b>four</b> haploid nuclei. So why does oogenesis end with only one usable gamete?',
                opts: [
                    ['cyto', 'All four got a full set of chromosomes, but only one got enough cytoplasm'],
                    ['fail', 'Three of the four divisions failed'],
                    ['half', 'Oogenesis only does meiosis I'],
                    ['sex', 'The other three became sperm']
                ],
                right: 'cyto',
                ok: 'Exactly that.',
                bad: 'No. Look at the fourth row again: four cells on both sides, and all four carry ' +
                     'a complete haploid set. Nothing failed and nothing was skipped. What differs ' +
                     'is the <em>size</em> of the cells.'
            },
            say: 'The spermatids reshape: they shed most of their cytoplasm, pack mitochondria into ' +
                 'a midpiece and grow a flagellum. Four working sperm. The ootid becomes the ovum, ' +
                 'and the polar bodies break down. <b>One working egg.</b>'
        }
    ];

    const FACTS = [
        ['Gametes produced per meiosis', 'Four', 'One (plus three polar bodies)'],
        ['Cytoplasm divided', 'Equally', 'Very unequally'],
        ['Size of the finished gamete', 'The smallest cell in the body', 'The largest cell in the body'],
        ['When it starts', 'At puberty', 'Before birth'],
        ['When it stops', 'Continues throughout adult life', 'Stops at menopause'],
        ['Released', 'Hundreds of millions at a time', 'Usually one per cycle'],
        ['Time for one cell to finish', 'About 70 days', 'From before birth to ovulation — years to decades']
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.gc { padding:1rem 1.25rem 1.25rem; }',
            '.gc { --gc-ok:#2e7d32; --gc-bad:#aa272f; }',
            '[data-theme="dark"] .gc { --gc-ok:#7fc98a; --gc-bad:#e08a90; }',
            '[data-theme="sepia"] .gc { --gc-ok:#4a6b3d; --gc-bad:#a04040; }',
            '.gc-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.9rem; line-height:1.55; }',
            '.gc-step { font-size:0.66rem; font-weight:800; letter-spacing:0.07em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.2rem; }',
            '.gc-name { font-size:1rem; font-weight:700; margin:0 0 0.7rem; }',
            // the artwork is fixed cream, so the stage keeps its own background in every theme
            '.gc-stage { border:1px solid var(--border); border-radius:11px; background:#f9f0db;',
            '   padding:0.5rem; overflow-x:auto; }',
            '.gc-stage svg { display:block; width:100%; min-width:560px; height:auto; }',
            '.gc-mk { cursor:pointer; }',
            '.gc-mk circle.gc-disc { fill:#fff; stroke:#3b2330; stroke-width:5; }',
            '.gc-mk text { fill:#2b1a22; font-size:52px; font-weight:800; text-anchor:middle; pointer-events:none; }',
            '.gc-mk:focus { outline:none; } .gc-mk:focus circle.gc-disc { stroke:var(--light-teal); stroke-width:9; }',
            '.gc-mk.here circle.gc-disc { fill:var(--light-teal); stroke:var(--light-teal); }',
            '.gc-mk.here text { fill:#fff; }',
            '.gc-mk.got circle.gc-disc { fill:#dcefdc; stroke:#2e7d32; }',
            '.gc-mk.got text { fill:#2e7d32; }',
            '.gc-mk.sleep { cursor:default; opacity:0.45; }',
            '.gc-band { fill:none; stroke:#2e7d32; stroke-width:4; stroke-dasharray:16 12; opacity:0.55; }',
            '.gc-wash { fill:#f9f0db; }',
            '.gc-q { font-size:0.86rem; font-weight:600; margin:0.95rem 0 0.5rem; }',
            '.gc-opts { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.5rem; }',
            '.gc-opt { font:inherit; font-size:0.8rem; cursor:pointer; text-align:left;',
            '   padding:0.4rem 0.7rem; border:1px solid var(--border); border-radius:8px;',
            '   background:var(--bg); color:var(--text); touch-action:manipulation; }',
            '.gc-opt:hover { border-color:var(--light-teal); }',
            '.gc-opt.wrong { border-color:var(--gc-bad); color:var(--gc-bad); opacity:0.6; }',
            '.gc-msg { font-size:0.83rem; line-height:1.6; margin:0.55rem 0 0; min-height:2.4em; }',
            '.gc-msg.ok { color:var(--gc-ok); } .gc-msg.bad { color:var(--gc-bad); }',
            '.gc-msg b { color:var(--text); }',
            '.gc-named { display:flex; gap:0.35rem; flex-wrap:wrap; margin:0.7rem 0 0; }',
            '.gc-chip { font-size:0.72rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:999px;',
            '   border:1px solid var(--gc-ok); color:var(--gc-ok); background:rgba(46,125,50,0.08); }',
            '.gc-say { margin-top:0.85rem; border:1px solid var(--border); border-left:4px solid var(--light-teal);',
            '   border-radius:8px; background:var(--bg-surface); padding:0.75rem 0.9rem;',
            '   font-size:0.85rem; line-height:1.65; }',
            '.gc-say b { color:var(--text); }',
            '.gc-say p { margin:0 0 0.55rem; } .gc-say p:last-child { margin-bottom:0; }',
            '.gc-trap { margin-top:0.6rem; border:1px solid var(--gc-bad); border-radius:8px;',
            '   background:rgba(170,39,47,0.07); padding:0.7rem 0.85rem; font-size:0.83rem;',
            '   line-height:1.6; }',
            '[data-theme="dark"] .gc-trap { background:rgba(224,138,144,0.10); }',
            '.gc-trap::before { content:"Watch out"; display:block; font-size:0.62rem; font-weight:800;',
            '   letter-spacing:0.07em; text-transform:uppercase; color:var(--gc-bad); margin-bottom:0.3rem; }',
            '.gc-time { margin-top:0.6rem; font-size:0.8rem; line-height:1.6; color:var(--text-secondary); }',
            '.gc-table { width:100%; border-collapse:collapse; margin-top:1rem; font-size:0.8rem; }',
            '.gc-table th, .gc-table td { border-bottom:1px solid var(--border); padding:0.38rem 0.5rem;',
            '   text-align:left; vertical-align:top; }',
            '.gc-table thead th { font-size:0.64rem; text-transform:uppercase; letter-spacing:0.05em;',
            '   color:var(--text-secondary); }',
            '.gc-track { display:flex; gap:3px; margin:0.9rem 0 0; }',
            '.gc-dot { flex:1 1 0; height:5px; border-radius:3px; background:var(--border); }',
            '.gc-dot.done { background:var(--light-teal); }',
            '.gc-dot.here { background:var(--text); }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-gamete-count'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'gc');
        root.appendChild(wrap);

        let i = 0;                  // which row we are on
        let named = {};             // cell key -> true
        let active = null;          // cell key currently being asked about
        let wrongName = [];         // option labels already tried for `active`
        let askDone = {};           // stage id -> true
        let wrongAsk = [];
        let msgText = null;

        const stage = () => STAGES[i];
        const rowCells = n => CELLS.filter(c => c.row === n);
        const toName = () => rowCells(i).filter(c => !named[c.k]);
        const cellOf = k => CELLS.filter(c => c.k === k)[0];

        /* Options are shuffled once per cell and then held, so they do not
           jump around underneath the reader between renders. */
        const shuffled = {};
        function optionsFor(c) {
            if (!shuffled[c.k]) {
                const list = [c.name].concat(c.opts);
                for (let n = list.length - 1; n > 0; n--) {
                    const m = Math.floor(Math.random() * (n + 1));
                    const t = list[n]; list[n] = list[m]; list[m] = t;
                }
                shuffled[c.k] = list;
            }
            return shuffled[c.k];
        }

        function svg() {
            const rootPath = (document.body.dataset.root || '../') + 'images/u4/';
            let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
                'role="group" aria-label="Spermatogenesis on the left and oogenesis on the right, ' +
                'five rows deep, with twelve numbered cells to identify.">';
            s += '<image href="' + rootPath + 'gametogenesis.jpeg" x="0" y="0" width="' + W +
                 '" height="' + H + '" preserveAspectRatio="xMidYMid meet"/>';

            // rows further down than the one being worked on stay covered
            BANDS.forEach((b, n) => {
                if (n > i) s += '<rect class="gc-wash" x="0" y="' + b[0] + '" width="' + W +
                    '" height="' + (b[1] - b[0]) + '" opacity="0.88"/>';
            });
            const band = BANDS[i];
            s += '<rect class="gc-band" x="6" y="' + (band[0] + 6) + '" width="' + (W - 12) +
                 '" height="' + (band[1] - band[0] - 12) + '" rx="14"/>';

            CELLS.forEach((c, n) => {
                if (c.row > i) return;
                const done = !!named[c.k];
                const cls = 'gc-mk' + (done ? ' got' : c.row === i ? (c.k === active ? ' here' : '') : ' sleep');
                const live = !done && c.row === i;
                s += '<g class="' + cls + '" data-k="' + c.k + '"' +
                     (live ? ' role="button" tabindex="0"' : '') +
                     ' aria-label="Cell ' + (n + 1) + (done ? ': ' + c.name : '') + '">' +
                     '<circle class="gc-disc" cx="' + c.x + '" cy="' + c.y + '" r="' + R + '"/>' +
                     '<text x="' + c.x + '" y="' + (c.y + 19) + '">' + (done ? '✓' : (n + 1)) + '</text>' +
                     '</g>';
            });
            s += '</svg>';
            return s;
        }

        function render() {
            wrap.innerHTML = '';
            const st = stage();

            const how = U.el('p', 'gc-how');
            how.innerHTML = 'Sperm and eggs are both made by meiosis, from the same kind of starting ' +
                'cell, and both processes make four haploid nuclei. Work down the diagram one row at ' +
                'a time — name every cell in the row, answer the question, and find the point where ' +
                'the two pathways stop being the same. The cells are drawn to scale.';
            wrap.appendChild(how);

            const sn = U.el('p', 'gc-step');
            sn.textContent = 'Row ' + (i + 1) + ' of ' + STAGES.length;
            wrap.appendChild(sn);
            const nm = U.el('p', 'gc-name'); nm.textContent = st.name; wrap.appendChild(nm);

            const box = U.el('div', 'gc-stage');
            box.innerHTML = svg();
            wrap.appendChild(box);
            box.querySelectorAll('.gc-mk[role="button"]').forEach(g => {
                const act = () => {
                    active = g.dataset.k; wrongName = []; msgText = null; render();
                };
                g.addEventListener('click', act);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                });
            });

            const left = toName();
            if (left.length) {
                if (!active || named[active] || cellOf(active).row !== i) active = left[0].k;
                askName(cellOf(active), left.length);
            } else if (!askDone[st.id]) {
                askQuestion(st);
            } else {
                const say = U.el('div', 'gc-say'); say.innerHTML = st.say; wrap.appendChild(say);
                if (st.trap) { const t = U.el('div', 'gc-trap'); t.innerHTML = st.trap; wrap.appendChild(t); }
                if (st.timing) { const t = U.el('p', 'gc-time'); t.innerHTML = st.timing; wrap.appendChild(t); }
                if (st.final) wrap.appendChild(finalBox());
            }

            const msg = U.el('p', 'gc-msg' + (msgText ? ' ' + msgText.cls : ''));
            msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
            if (msgText) msg.innerHTML = msgText.html;
            wrap.appendChild(msg);

            const chips = rowCells(i).filter(c => named[c.k]);
            if (chips.length) {
                const row = U.el('div', 'gc-named');
                chips.forEach(c => {
                    const chip = U.el('span', 'gc-chip');
                    chip.textContent = c.name;
                    row.appendChild(chip);
                });
                wrap.appendChild(row);
            }

            const track = U.el('div', 'gc-track');
            STAGES.forEach((s, k) => {
                track.appendChild(U.el('i', 'gc-dot' + (k === i ? ' here' : k < i ? ' done' : '')));
            });
            wrap.appendChild(track);

            const btns = U.el('div', 'sim-buttons');
            const back = U.button(btns, '‹ Back'); back.disabled = i === 0;
            back.addEventListener('click', () => { i--; active = null; wrongName = []; wrongAsk = []; msgText = null; render(); });
            const next = U.button(btns, i === STAGES.length - 1 ? 'Start again' : 'Next row ›');
            next.disabled = !askDone[st.id] || (st.final && !askDone.final);
            next.addEventListener('click', () => {
                if (i === STAGES.length - 1) { named = {}; askDone = {}; i = 0; }
                else i++;
                active = null; wrongName = []; wrongAsk = []; msgText = null; render();
            });
            wrap.appendChild(btns);
        }

        function askName(c, leftCount) {
            const q = U.el('p', 'gc-q');
            const n = CELLS.indexOf(c) + 1;
            q.innerHTML = 'Marker <b>' + n + '</b> — what is this cell called? ' +
                '<span style="font-weight:400;color:var(--text-secondary)">(' + leftCount +
                ' still to name in this row)</span>';
            wrap.appendChild(q);
            const opts = U.el('div', 'gc-opts');
            optionsFor(c).forEach(label => {
                const b = U.el('button', 'gc-opt' + (wrongName.indexOf(label) > -1 ? ' wrong' : ''));
                b.type = 'button'; b.textContent = label;
                b.addEventListener('click', () => {
                    if (label === c.name) {
                        named[c.k] = true;
                        msgText = { cls: 'ok', html: '<b>' + c.name + '</b> — ' + c.why };
                        active = null; wrongName = [];
                    } else {
                        wrongName.push(label);
                        msgText = { cls: 'bad', html: 'Not this one. Follow the leader line and count ' +
                            'how many cells are in this row, and how many divisions it must have taken ' +
                            'to get there.' };
                    }
                    render();
                });
                opts.appendChild(b);
            });
            wrap.appendChild(opts);
        }

        function askQuestion(st) {
            const a = st.ask;
            const q = U.el('p', 'gc-q'); q.innerHTML = a.q; wrap.appendChild(q);
            const opts = U.el('div', 'gc-opts');
            a.opts.forEach(([k, label]) => {
                const b = U.el('button', 'gc-opt' + (wrongAsk.indexOf(k) > -1 ? ' wrong' : ''));
                b.type = 'button'; b.textContent = label;
                if (label.length > 24) b.style.maxWidth = '28rem';
                b.addEventListener('click', () => {
                    if (k === a.right) {
                        askDone[st.id] = true;
                        msgText = { cls: 'ok', html: a.ok };
                        wrongAsk = [];
                    } else {
                        wrongAsk.push(k);
                        msgText = { cls: 'bad', html: a.bad };
                    }
                    render();
                });
                opts.appendChild(b);
            });
            wrap.appendChild(opts);
        }

        function finalBox() {
            const box = U.el('div');
            const d = U.el('div', 'gc-say');
            d.innerHTML =
                '<p><b>Four gametes or one — the difference is cytoplasm, not chromosomes.</b> ' +
                'Meiosis is identical on both sides: two divisions, four haploid nuclei. What differs ' +
                'is how the cytoplasm is shared out, and that follows from what the two gametes have to do.</p>' +
                '<p>A sperm has to <em>travel</em>. It carries a haploid nucleus, a midpiece packed ' +
                'with mitochondria to power the tail, and almost nothing else — so making four small ' +
                'ones costs little, and four are better than one.</p>' +
                '<p>An egg has to <em>build</em>. After fertilisation the zygote divides repeatedly ' +
                'for several days before it implants and can draw on the parent for anything, and every ' +
                'one of those divisions runs on materials the egg stockpiled in advance: ribosomes, ' +
                'mitochondria, mRNA, food reserves. Splitting that stockpile four ways would leave ' +
                'four cells, none of which could do the job.</p>' +
                '<p>So the three polar bodies are not waste from a failure. They are what it looks ' +
                'like when a cell divides its <em>chromosomes</em> evenly and its <em>cytoplasm</em> ' +
                'deliberately unevenly.</p>';
            box.appendChild(d);

            const t = document.createElement('table');
            t.className = 'gc-table';
            t.innerHTML = '<thead><tr><th></th><th>Spermatogenesis</th><th>Oogenesis</th></tr></thead>' +
                '<tbody>' + FACTS.map(r => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] +
                '</td><td>' + r[2] + '</td></tr>').join('') + '</tbody>';
            box.appendChild(t);
            return box;
        }

        render();

        root._simState = () => ({
            row: i, of: STAGES.length, stage: stage().id,
            namedCount: Object.keys(named).length, cells: CELLS.length,
            rowNamed: rowCells(i).filter(c => named[c.k]).map(c => c.name),
            asked: !!askDone[stage().id],
            complete: Object.keys(named).length === CELLS.length && !!askDone.final
        });
        root._simSolve = () => {
            CELLS.forEach(c => { named[c.k] = true; });
            STAGES.forEach(s => { askDone[s.id] = true; });
            i = STAGES.length - 1; active = null; wrongName = []; wrongAsk = []; msgText = null;
            render();
        };
    };
})();
