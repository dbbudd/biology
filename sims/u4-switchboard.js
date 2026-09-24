/* =============================================================
   INTERACTIVE — Gene expression switchboard
   -------------------------------------------------------------
   Registers window.SIMS['u4-switchboard'].
   Supports HS-LS1-2, HS-LS1-4.

   The deck's own slide ends with the words "You try!" and then
   stops. This is the "you try".

   Every cell on the board carries the SAME twelve genes, because
   every cell in a body carries the same genome. The reader builds
   a cell type by switching genes on and off. What comes out is
   computed by comparing the switch pattern with the real
   expression pattern of that cell type — so a wrong cell is wrong
   for a reason it can be told.

   Two traps are deliberate and both are marked:
     - housekeeping genes must stay ON in every cell type;
     - switching a gene OFF is not the same as the gene not
       being there.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4sb-style';

    const GENES = [
        { k: 'ACTB',  name: 'ACTB',  protein: 'actin — part of the cell’s internal skeleton',
          house: true },
        { k: 'GAPDH', name: 'GAPDH', protein: 'an enzyme every cell needs to release energy from glucose',
          house: true },
        { k: 'HBB',   name: 'HBB',   protein: 'beta-globin, half of a haemoglobin molecule' },
        { k: 'MYH7',  name: 'MYH7',  protein: 'a myosin motor that pulls muscle fibres shorter' },
        { k: 'NEFL',  name: 'NEFL',  protein: 'neurofilament, the internal cable that holds an axon open' },
        { k: 'INS',   name: 'INS',   protein: 'insulin, the hormone that tells cells to take up glucose' },
        { k: 'KRT14', name: 'KRT14', protein: 'keratin, the tough fibre that makes skin waterproof' },
        { k: 'AMY1',  name: 'AMY1',  protein: 'amylase, the enzyme in saliva that breaks down starch' },
        { k: 'RHO',   name: 'RHO',   protein: 'rhodopsin, the light-detecting pigment of the retina' },
        { k: 'ALB',   name: 'ALB',   protein: 'albumin, the blood protein the liver exports by the gram' }
    ];
    const HOUSE = GENES.filter(g => g.house).map(g => g.k);

    const TYPES = [
        { k: 'rbc', name: 'Red blood cell',
          on: ['HBB'],
          job: 'Carry oxygen from the lungs to every tissue.',
          note: 'A mature red blood cell is an extreme case: it pushes its nucleus out ' +
                'altogether, so it has no DNA at all and can never make another protein. ' +
                'That is why it lasts only about 120 days.' },
        { k: 'muscle', name: 'Skeletal muscle cell',
          on: ['MYH7'],
          job: 'Shorten on demand, and pull on a bone.',
          note: 'Muscle cells fuse together as they mature, so a single muscle fibre ends up ' +
                'with many nuclei — all with the same genome, all running the same programme.' },
        { k: 'neuron', name: 'Neuron',
          on: ['NEFL'],
          job: 'Carry an electrical signal, sometimes a metre, without losing it.',
          note: 'Most neurons never divide again once they have differentiated. They spend your ' +
                'whole life in G0.' },
        { k: 'beta', name: 'Pancreatic beta cell',
          on: ['INS'],
          job: 'Measure blood glucose and release insulin when it rises.',
          note: 'Losing these cells is what type 1 diabetes is. The loop that normally ' +
                'controls them — glucose rises, insulin is released, glucose falls, insulin ' +
                'stops — is negative feedback, exactly like the hormone loops in Chapter 4.8.' },
        { k: 'skin', name: 'Skin cell (keratinocyte)',
          on: ['KRT14'],
          job: 'Make a tough, waterproof, replaceable outer layer.',
          note: 'Skin cells are replaced constantly, which is why the mitotic index of skin is ' +
                'high and the mitotic index of brain is close to zero.' },
        { k: 'rod', name: 'Rod cell (retina)',
          on: ['RHO'],
          job: 'Turn a single photon of light into an electrical signal.',
          note: 'Rod cells also express NEFL-type filaments, but rhodopsin is what makes a rod ' +
                'a rod rather than any other neuron.' },
        { k: 'liver', name: 'Liver cell (hepatocyte)',
          on: ['ALB'],
          job: 'Process everything absorbed from the gut, and export blood proteins.',
          note: 'Liver cells keep the ability to divide their whole lives — which is why a liver ' +
                'can regrow after part of it is removed.' },
        { k: 'salivary', name: 'Salivary gland cell',
          on: ['AMY1'],
          job: 'Secrete amylase into the mouth to start digesting starch.',
          note: 'The number of copies of AMY1 in the genome varies between people, and populations ' +
                'with starchy diets tend to carry more.' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.sb { padding:1rem 1.25rem 1.25rem; }',
            '.sb { --sb-ok:#2e7d32; --sb-bad:#aa272f; }',
            '[data-theme="dark"] .sb { --sb-ok:#7fc98a; --sb-bad:#e08a90; }',
            '[data-theme="sepia"] .sb { --sb-ok:#4a6b3d; --sb-bad:#a04040; }',
            '.sb-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.9rem; line-height:1.55; }',
            '.sb-target { display:flex; gap:0.4rem; flex-wrap:wrap; margin:0 0 0.9rem; }',
            '.sb-t { font:inherit; font-size:0.76rem; cursor:pointer; padding:0.35rem 0.65rem;',
            '   border:1px solid var(--border); border-radius:999px; background:var(--bg);',
            '   color:var(--text-secondary); touch-action:manipulation; }',
            '.sb-t[aria-pressed="true"] { border-color:var(--light-teal); color:var(--text);',
            '   font-weight:700; box-shadow:0 0 0 1px var(--light-teal); }',
            '.sb-job { font-size:0.85rem; line-height:1.55; margin:0 0 0.85rem; }',
            '.sb-board { display:grid; gap:0.4rem; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); }',
            '.sb-gene { display:flex; align-items:center; gap:0.6rem; border:1px solid var(--border);',
            '   border-radius:9px; padding:0.45rem 0.6rem; background:var(--bg); cursor:pointer;',
            '   font:inherit; color:var(--text); text-align:left; width:100%; touch-action:manipulation; }',
            '.sb-gene:hover { border-color:var(--light-teal); }',
            '.sb-gene .sb-led { flex:0 0 auto; width:34px; height:18px; border-radius:999px;',
            '   background:var(--border); position:relative; transition:background 0.12s; }',
            '.sb-gene .sb-led::after { content:""; position:absolute; top:2px; left:2px; width:14px;',
            '   height:14px; border-radius:50%; background:var(--bg-surface); transition:left 0.12s; }',
            '.sb-gene.on .sb-led { background:var(--sb-ok); }',
            '.sb-gene.on .sb-led::after { left:18px; }',
            '.sb-gene .sb-txt { flex:1 1 auto; min-width:0; }',
            '.sb-gene b { display:block; font-size:0.82rem; letter-spacing:0.02em; }',
            '.sb-gene small { display:block; font-size:0.68rem; color:var(--text-secondary); line-height:1.4; }',
            '.sb-gene.house { border-style:dashed; }',
            '.sb-gene .sb-tag { font-size:0.58rem; font-weight:800; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); }',
            '.sb-count { font-size:0.72rem; color:var(--text-secondary); margin:0.75rem 0 0; }',
            '.sb-msg { font-size:0.83rem; line-height:1.6; margin:0.8rem 0 0; min-height:2.5em; }',
            '.sb-msg.ok { color:var(--sb-ok); } .sb-msg.bad { color:var(--sb-bad); }',
            '.sb-msg b { color:var(--text); }',
            '.sb-out { margin-top:0.9rem; border:1px solid var(--sb-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .sb-out { background:rgba(127,201,138,0.12); }',
            '.sb-out h5 { margin:0 0 0.45rem; font-size:0.9rem; }',
            '.sb-out p { margin:0 0 0.55rem; font-size:0.84rem; line-height:1.6; }',
            '.sb-out p:last-child { margin-bottom:0; }',
            '.sb-genome { margin-top:1rem; border:1px solid var(--border); border-radius:10px;',
            '   padding:0.75rem 0.9rem; background:var(--bg-surface); font-size:0.82rem; line-height:1.6; }',
            '.sb-strip { display:flex; gap:2px; margin:0.5rem 0; flex-wrap:wrap; }',
            '.sb-chip { font-size:0.6rem; font-weight:700; letter-spacing:0.04em; padding:0.18rem 0.35rem;',
            '   border-radius:4px; border:1px solid var(--border); }',
            '.sb-chip.on { background:rgba(46,125,50,0.18); border-color:var(--sb-ok); }',
            '.sb-chip.off { opacity:0.5; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-switchboard'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'sb');
        root.appendChild(wrap);

        let target = TYPES[0];
        let on = {};
        let solved = {};
        HOUSE.forEach(k => { on[k] = true; });

        const expected = t => {
            const set = {};
            HOUSE.forEach(k => { set[k] = true; });
            t.on.forEach(k => { set[k] = true; });
            return set;
        };
        function diff() {
            const want = expected(target);
            const missing = [], extra = [], houseOff = [];
            GENES.forEach(g => {
                const isOn = !!on[g.k], shouldBe = !!want[g.k];
                if (shouldBe && !isOn) { (g.house ? houseOff : missing).push(g); }
                if (!shouldBe && isOn) extra.push(g);
            });
            return { missing, extra, houseOff, ok: !missing.length && !extra.length && !houseOff.length };
        }

        function render() {
            wrap.innerHTML = '';

            const how = U.el('p', 'sb-how');
            how.innerHTML = 'Every cell below carries the <b>same ten genes</b>, because every cell in ' +
                'your body carries the same genome. The only thing that differs between a neuron and ' +
                'a red blood cell is which of those genes is switched on. Pick a cell type, then set ' +
                'the switches so the cell can do its job.';
            wrap.appendChild(how);

            const bar = U.el('div', 'sb-target');
            TYPES.forEach(t => {
                const b = U.el('button', 'sb-t');
                b.type = 'button';
                b.textContent = t.name + (solved[t.k] ? ' ✓' : '');
                b.setAttribute('aria-pressed', t.k === target.k ? 'true' : 'false');
                b.addEventListener('click', () => {
                    target = t;
                    on = {}; HOUSE.forEach(k => { on[k] = true; });
                    render();
                });
                bar.appendChild(b);
            });
            wrap.appendChild(bar);

            const job = U.el('p', 'sb-job');
            job.innerHTML = '<b>' + target.name + '.</b> ' + target.job +
                ' Which of these genes does it need transcribed?';
            wrap.appendChild(job);

            const board = U.el('div', 'sb-board');
            GENES.forEach(g => {
                const b = U.el('button', 'sb-gene' + (on[g.k] ? ' on' : '') + (g.house ? ' house' : ''));
                b.type = 'button';
                b.setAttribute('aria-pressed', on[g.k] ? 'true' : 'false');
                b.innerHTML = '<span class="sb-led" aria-hidden="true"></span>' +
                    '<span class="sb-txt"><b>' + g.name +
                    (g.house ? ' <span class="sb-tag">housekeeping</span>' : '') + '</b>' +
                    '<small>' + g.protein + '</small></span>';
                b.addEventListener('click', () => {
                    if (on[g.k]) delete on[g.k]; else on[g.k] = true;
                    render();
                });
                board.appendChild(b);
            });
            wrap.appendChild(board);

            const nOn = Object.keys(on).length;
            const count = U.el('p', 'sb-count');
            count.textContent = nOn + ' of ' + GENES.length + ' genes expressed. ' +
                'The other ' + (GENES.length - nOn) + ' are still in the DNA — switched off, not removed.';
            wrap.appendChild(count);

            const msg = U.el('p', 'sb-msg');
            msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
            wrap.appendChild(msg);

            const btns = U.el('div', 'sim-buttons');
            U.button(btns, 'Build this cell').addEventListener('click', () => {
                const d = diff();
                if (d.ok) {
                    solved[target.k] = true;
                    msg.className = 'sb-msg ok';
                    msg.innerHTML = 'That is a working ' + target.name.toLowerCase() + '.';
                    render();
                    wrap.appendChild(success());
                } else if (d.houseOff.length) {
                    msg.className = 'sb-msg bad';
                    const one = d.houseOff.length === 1;
                    msg.innerHTML = 'You switched off <b>' + d.houseOff.map(g => g.name).join(' and ') +
                        '</b>. That is a <b>housekeeping gene</b>'.replace('That is a', one ? 'That is a' : 'Those are') +
                        (one ? '' : 's') + ' — every living cell needs ' + (one ? 'it' : 'them') + ', ' +
                        'whatever else it does. A cell with no GAPDH cannot release energy from ' +
                        'glucose, and a cell with no actin has no internal skeleton. Differentiation ' +
                        'switches off the genes a cell does not need; it never switches off the ones ' +
                        'that keep it alive.';
                } else if (d.missing.length) {
                    msg.className = 'sb-msg bad';
                    msg.innerHTML = 'Not yet. Read the job again: <em>' + target.job + '</em> ' +
                        'Which protein in the list does that, and is its gene on?';
                } else {
                    msg.className = 'sb-msg bad';
                    msg.innerHTML = 'Close — the right gene is on, but so is <b>' +
                        d.extra.map(g => g.name).join(', ') + '</b>. A ' + target.name.toLowerCase() +
                        ' does not make ' + d.extra[0].protein.split(',')[0].split(' — ')[0] +
                        '. Expressing a protein a cell has no use for costs energy and can be ' +
                        'actively harmful, so differentiated cells keep those genes firmly off.';
                }
            });
            U.button(btns, 'Turn everything off').addEventListener('click', () => { on = {}; render(); });
            wrap.appendChild(btns);

            if (Object.keys(solved).length >= 3) wrap.appendChild(genomeBox());
        }

        function success() {
            const d = U.el('div', 'sb-out');
            d.innerHTML = '<h5>' + target.name + ' — built</h5>' +
                '<p>' + target.note + '</p>' +
                '<p>Now the point. You did not add a gene, delete a gene, or change a single base. ' +
                'The DNA on this board is identical to the DNA on every other cell type’s board. ' +
                'All you changed was <b>which genes are being transcribed</b> — and that was enough ' +
                'to turn one kind of cell into a completely different one.</p>' +
                '<p>That is what <b>differentiation</b> is, and it is why the answer to "if every ' +
                'cell has the same genome, why is a neuron not a red blood cell?" is not about the ' +
                'genome at all. It is about gene expression.</p>';
            return d;
        }

        function genomeBox() {
            const d = U.el('div', 'sb-genome');
            let html = '<b>Compare the cell types you have built.</b>';
            TYPES.filter(t => solved[t.k]).forEach(t => {
                const want = expected(t);
                html += '<div style="margin-top:0.5rem"><span style="font-size:0.74rem;font-weight:700">' +
                    t.name + '</span><div class="sb-strip">';
                GENES.forEach(g => {
                    html += '<span class="sb-chip ' + (want[g.k] ? 'on' : 'off') + '">' + g.name + '</span>';
                });
                html += '</div></div>';
            });
            html += '<p style="margin:0.7rem 0 0">Every row contains every gene. The rows differ only ' +
                'in which chips are lit. Two genes are lit in every single row — those are the ' +
                'housekeeping genes, and they are the reason a cell can be specialised and still ' +
                'be a cell.</p>';
            d.innerHTML = html;
            return d;
        }

        render();

        root._simState = () => ({
            target: target.k, targetName: target.name,
            on: Object.keys(on).sort(),
            expected: Object.keys(expected(target)).sort(),
            correct: diff().ok,
            solved: Object.keys(solved),
            housekeeping: HOUSE.slice(),
            genesTotal: GENES.length
        });
        root._simSolve = () => {
            on = {}; Object.keys(expected(target)).forEach(k => { on[k] = true; });
            solved[target.k] = true;
            render();
            wrap.appendChild(success());
        };
    };
})();
