/* =============================================================
   INTERACTIVE — Mitotic index counter
   -------------------------------------------------------------
   Registers window.SIMS['u4-mitotic-index'].  Supports HS-LS1-4.

   Two modes.

   1. NAME THE STAGE — the eleven micrographs from the deck, one at
      a time. The reader commits to a stage before any explanation
      appears, and the explanation names the ONE feature that
      settles it.

   2. COUNT A FIELD — a field of onion root-tip cells drawn from a
      known model. The reader predicts which phase will dominate,
      then clicks every cell that is dividing. The mitotic index and
      the per-phase percentages are computed from the actual counts
      in the field, never from a remembered figure — the deck's own
      numbers (56/27/8/5/3) sum to 99, which is exactly the failure
      computing from counts avoids.

   Phase durations are then derived from the percentages against a
   24-hour cycle, because a percentage the reader cannot feel is not
   yet an explanation.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4mi-style';

    const STAGES = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase'];

    /* The micrographs, paired animal / plant, in cycle order.
       Credited on-slide to bioweb.uncc.edu. */
    const SHOTS = [
        { img: 'image8.png',  stage: 'Interphase', kind: 'Animal cell',
          tell: 'The nucleus is a single round blob with a visible nucleolus, and you cannot see separate chromosomes at all. That is the give-away: chromatin is still unwound.',
          alt: 'A stained animal cell under high power. A single round darkly stained nucleus sits in the middle of pale cytoplasm, with a denser spot inside it. No separate chromosomes are visible.' },
        { img: 'image9.png',  stage: 'Interphase', kind: 'Plant cell',
          tell: 'A rectangular plant cell with one solid oval nucleus and no distinct threads. Interphase again — and notice how much of any field looks like this.',
          alt: 'A rectangular plant cell bounded by a green cell wall, containing one solid red-stained oval nucleus. No separate chromosomes can be seen.' },
        { img: 'image10.png', stage: 'Prophase', kind: 'Animal cell',
          tell: 'Dark thread-like chromosomes have appeared inside the nuclear area, but they are scattered rather than lined up. Condensed but not organised means prophase.',
          alt: 'An animal cell in which several short dark rod-shaped chromosomes are scattered within the nuclear region. The nuclear outline is faint and breaking up.' },
        { img: 'image11.png', stage: 'Prophase', kind: 'Plant cell',
          tell: 'Separate red chromosomes are visible, still filling the whole nuclear region rather than sitting on one line.',
          alt: 'A plant cell whose nuclear region is filled with distinct curved red chromosomes, scattered rather than aligned.' },
        { img: 'image12.png', stage: 'Metaphase', kind: 'Animal cell',
          tell: 'One dense dark band straight across the middle of the cell, with spindle fibres fanning out to both poles. A single line is metaphase.',
          alt: 'An animal cell with a solid dark bar of chromosomes across the centre and pale spindle fibres fanning out to a point at each side.' },
        { img: 'image13.png', stage: 'Metaphase', kind: 'Plant cell',
          tell: 'The chromosomes sit in one row across the equator of the cell. Plant cells have no centrioles, but the plate looks the same.',
          alt: 'A plant cell with its red chromosomes arranged in a single row across the middle of the cell.' },
        { img: 'image14.png', stage: 'Anaphase', kind: 'Animal cell',
          tell: 'Two dark masses moving apart, with a clear gap opening between them. Two groups, still one cell, means anaphase.',
          alt: 'An animal cell in which two dark masses of chromosomes are separating towards opposite ends, with pale fibres stretched between them.' },
        { img: 'image15.png', stage: 'Anaphase', kind: 'Plant cell',
          tell: 'Two V-shaped clusters pulling to opposite ends, centromeres leading. The V shape is the chromosome being dragged by its middle.',
          alt: 'A plant cell in which two clusters of red chromosomes are being pulled towards opposite ends, each chromosome bent into a V.' },
        { img: 'image16.png', stage: 'Telophase', kind: 'Animal cell',
          tell: 'Two compact clumps at the poles, and the cell itself is starting to pinch in between them. Chromosomes have arrived and are decondensing.',
          alt: 'An animal cell with two dark compact clumps of chromosomes at opposite ends and the cell membrane beginning to pinch inwards between them.' },
        { img: 'image17.png', stage: 'Telophase', kind: 'Plant cell',
          tell: 'Two round nuclei re-forming inside one cell, with the new wall not yet finished between them.',
          alt: 'A plant cell containing two round red nuclei re-forming at either end, with a faint new wall appearing between them.' },
        { img: 'image20.png', stage: 'Anaphase', kind: 'Plant cell',
          tell: 'Another anaphase — two separating groups with fibres between them. Once you have the rule, a new picture takes about a second.',
          alt: 'A plant cell photographed during anaphase, with two groups of chromosomes separating towards opposite ends of the cell.' }
    ];

    /* ---- the counted field ------------------------------------------
       Built once from a fixed seed so every reader sees the same field
       and the numbers in the prose can be checked against it. */
    function rng(seed) {
        let s = seed >>> 0;
        return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    function buildField() {
        const r = rng(20260907);
        // Proportions typical of an onion root-tip meristem, where most
        // cells are still in interphase at any instant.
        const deck = [];
        const want = { Interphase: 58, Prophase: 22, Metaphase: 7, Anaphase: 5, Telophase: 8 };
        Object.keys(want).forEach(k => { for (let i = 0; i < want[k]; i++) deck.push(k); });
        // Fisher-Yates with the seeded generator
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(r() * (i + 1));
            const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
        }
        return deck.map((stage, i) => ({
            i, stage, col: i % 10, row: Math.floor(i / 10),
            jx: (r() - 0.5) * 3, jy: (r() - 0.5) * 3
        }));
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.mi { padding:1rem 1.25rem 1.25rem; }',
            '.mi { --mi-ok:#2e7d32; --mi-bad:#aa272f; }',
            '[data-theme="dark"] .mi { --mi-ok:#7fc98a; --mi-bad:#e08a90; }',
            '[data-theme="sepia"] .mi { --mi-ok:#4a6b3d; --mi-bad:#a04040; }',
            '.mi-tabs { display:flex; gap:0.4rem; margin-bottom:0.9rem; flex-wrap:wrap; }',
            '.mi-tab { font:inherit; font-size:0.78rem; font-weight:600; cursor:pointer;',
            '   padding:0.4rem 0.8rem; border:1px solid var(--border); border-radius:999px;',
            '   background:var(--bg); color:var(--text-secondary); touch-action:manipulation; }',
            '.mi-tab[aria-pressed="true"] { border-color:var(--light-teal); color:var(--text);',
            '   box-shadow:0 0 0 1px var(--light-teal); }',
            '.mi-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.9rem; line-height:1.5; }',
            '.mi-shotwrap { display:flex; gap:1rem; flex-wrap:wrap; align-items:flex-start; }',
            '.mi-shot { flex:0 0 240px; max-width:240px; }',
            '.mi-shot img { display:block; width:100%; height:auto; border:1px solid var(--border);',
            '   border-radius:10px; background:#fff; }',
            '.mi-shotmeta { font-size:0.7rem; color:var(--text-secondary); margin:0.4rem 0 0; }',
            '.mi-side { flex:1 1 260px; min-width:240px; }',
            '.mi-q { font-size:0.86rem; font-weight:600; margin:0 0 0.55rem; }',
            '.mi-opts { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.6rem; }',
            '.mi-opt { font:inherit; font-size:0.78rem; cursor:pointer; padding:0.4rem 0.7rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; }',
            '.mi-opt:hover { border-color:var(--light-teal); }',
            '.mi-opt.right { border-color:var(--mi-ok); color:var(--mi-ok); font-weight:700; }',
            '.mi-opt.wrong { border-color:var(--mi-bad); color:var(--mi-bad); opacity:0.6; }',
            '.mi-msg { font-size:0.82rem; line-height:1.55; margin:0.5rem 0 0; min-height:3em; }',
            '.mi-msg.ok { color:var(--mi-ok); } .mi-msg.bad { color:var(--mi-bad); }',
            '.mi-msg b { color:var(--text); }',
            '.mi-progress { font-size:0.7rem; color:var(--text-secondary); margin:0.7rem 0 0;',
            '   letter-spacing:0.04em; text-transform:uppercase; font-weight:700; }',

            '.mi-field { border:1px solid var(--border); border-radius:10px; padding:0.6rem;',
            '   background:var(--bg); overflow-x:auto; }',
            '.mi-field svg { display:block; width:100%; min-width:420px; height:auto; }',
            '.mi-cell { cursor:pointer; }',
            '.mi-cw { fill:var(--bg-surface); stroke:var(--text-secondary); stroke-width:1; opacity:0.9; }',
            '.mi-cell.picked .mi-cw { fill:rgba(46,125,50,0.18); stroke:var(--mi-ok); stroke-width:2; }',
            '.mi-cell.shown-right .mi-cw { fill:rgba(46,125,50,0.20); stroke:var(--mi-ok); stroke-width:2; }',
            '.mi-cell.shown-miss .mi-cw { fill:rgba(170,39,47,0.16); stroke:var(--mi-bad);',
            '   stroke-width:2; stroke-dasharray:3 2; }',
            '.mi-ink { fill:var(--text); }',
            '.mi-tally { display:flex; gap:0.8rem; flex-wrap:wrap; align-items:baseline;',
            '   margin:0.7rem 0 0; font-size:0.8rem; }',
            '.mi-tally b { font-size:1.15rem; }',
            '.mi-table { width:100%; border-collapse:collapse; margin-top:0.9rem; font-size:0.8rem; }',
            '.mi-table th, .mi-table td { border-bottom:1px solid var(--border); padding:0.35rem 0.5rem;',
            '   text-align:right; }',
            '.mi-table th:first-child, .mi-table td:first-child { text-align:left; }',
            '.mi-table thead th { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.05em;',
            '   color:var(--text-secondary); }',
            '.mi-result { margin-top:1rem; border:1px solid var(--mi-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .mi-result { background:rgba(127,201,138,0.12); }',
            '.mi-result h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.mi-result p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.mi-result p:last-child { margin-bottom:0; }',
            '.mi-legend { font-size:0.72rem; color:var(--text-secondary); margin:0.5rem 0 0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-mitotic-index'] = function (root) {
        injectStyle();
        const ROOT = (document.body.dataset.root || '../') + 'images/u4/';
        const wrap = U.el('div', 'mi');
        const tabs = U.el('div', 'mi-tabs');
        const body = U.el('div');
        wrap.appendChild(tabs); wrap.appendChild(body);
        root.appendChild(wrap);

        let mode = 'name';
        const field = buildField();
        const TOTAL = field.length;
        const trueCounts = {};
        STAGES.forEach(s => { trueCounts[s] = field.filter(c => c.stage === s).length; });
        const trueMitotic = TOTAL - trueCounts.Interphase;

        // --- mode 1 state ---
        let shotIndex = 0, shotTried = [], shotDone = [], shotScore = 0;
        // --- mode 2 state ---
        let predicted = null, predictTried = [];
        let picked = {}, revealed = false;

        function tabButton(key, label) {
            const b = U.el('button', 'mi-tab');
            b.type = 'button'; b.textContent = label;
            b.setAttribute('aria-pressed', mode === key ? 'true' : 'false');
            b.addEventListener('click', () => { mode = key; render(); });
            tabs.appendChild(b);
        }

        /* ---------------- mode 1 ---------------- */
        function renderName() {
            const shot = SHOTS[shotIndex];
            const solved = shotDone.indexOf(shotIndex) > -1;

            const how = U.el('p', 'mi-how');
            how.textContent = 'Every picture below is a real cell, fixed and stained mid-division. ' +
                'Decide the stage before you read anything — then check what actually settled it.';
            body.appendChild(how);

            const row = U.el('div', 'mi-shotwrap');
            const left = U.el('div', 'mi-shot');
            const img = document.createElement('img');
            img.src = ROOT + shot.img; img.alt = shot.alt; img.loading = 'lazy';
            left.appendChild(img);
            const meta = U.el('p', 'mi-shotmeta');
            meta.textContent = shot.kind + ' · micrograph ' + (shotIndex + 1) + ' of ' + SHOTS.length +
                ' · source: bioweb.uncc.edu';
            left.appendChild(meta);
            row.appendChild(left);

            const side = U.el('div', 'mi-side');
            const q = U.el('p', 'mi-q');
            q.textContent = 'Which stage is this cell in?';
            side.appendChild(q);
            const opts = U.el('div', 'mi-opts');
            STAGES.forEach(s => {
                const b = U.el('button', 'mi-opt' +
                    (solved && s === shot.stage ? ' right' : '') +
                    (shotTried.indexOf(s) > -1 ? ' wrong' : ''));
                b.type = 'button'; b.textContent = s;
                b.disabled = solved;
                b.addEventListener('click', () => {
                    if (s === shot.stage) {
                        if (shotTried.length === 0) shotScore++;
                        shotDone.push(shotIndex);
                        msgText = { cls: 'ok', html: '<b>' + s + '.</b> ' + shot.tell };
                    } else {
                        shotTried.push(s);
                        msgText = { cls: 'bad', html: 'Not ' + s.toLowerCase() + '. ' + hintFor(s) };
                    }
                    render();
                });
                opts.appendChild(b);
            });
            side.appendChild(opts);

            const msg = U.el('p', 'mi-msg' + (msgText ? ' ' + msgText.cls : ''));
            msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
            if (msgText) msg.innerHTML = msgText.html;
            side.appendChild(msg);

            const prog = U.el('p', 'mi-progress');
            prog.textContent = shotDone.length + ' of ' + SHOTS.length + ' identified · ' +
                shotScore + ' right first time';
            side.appendChild(prog);

            const btns = U.el('div', 'sim-buttons');
            const prev = U.button(btns, '‹ Previous');
            prev.addEventListener('click', () => { step(-1); });
            const next = U.button(btns, 'Next cell ›');
            next.addEventListener('click', () => { step(1); });
            side.appendChild(btns);
            row.appendChild(side);
            body.appendChild(row);
        }
        function step(d) {
            shotIndex = (shotIndex + d + SHOTS.length) % SHOTS.length;
            shotTried = []; msgText = null; render();
        }
        function hintFor(guess) {
            const map = {
                Interphase: 'Interphase means no separate chromosomes are visible at all — just one solid nucleus.',
                Prophase: 'Prophase has visible chromosomes but no order to them; they have not been lined up.',
                Metaphase: 'Metaphase is one single line of chromosomes across the middle. Count the groups: one means metaphase.',
                Anaphase: 'Anaphase is two groups moving apart with a gap opening between them, still inside one cell.',
                Telophase: 'Telophase is two groups that have arrived at the poles and are re-forming into nuclei, with the cell starting to divide.'
            };
            return map[guess] + ' Look again and count the groups of chromosomes.';
        }
        let msgText = null;

        /* ---------------- mode 2 ---------------- */
        function cellSVG() {
            const CW = 62, CH = 46, PAD = 6;
            const cols = 10, rows = Math.ceil(TOTAL / cols);
            const w = cols * CW + PAD * 2, h = rows * CH + PAD * 2;
            let s = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" ' +
                'role="group" aria-label="A field of ' + TOTAL + ' onion root-tip cells. ' +
                'Click every cell that is dividing.">';
            field.forEach(c => {
                const x = PAD + c.col * CW, y = PAD + c.row * CH;
                const cls = 'mi-cell' + (picked[c.i] ? ' picked' : '') +
                    (revealed ? (c.stage !== 'Interphase'
                        ? (picked[c.i] ? ' shown-right' : ' shown-miss')
                        : (picked[c.i] ? ' shown-miss' : '')) : '');
                s += '<g class="' + cls + '" data-i="' + c.i + '" role="button" tabindex="0" ' +
                    'aria-label="Cell ' + (c.i + 1) + '">';
                s += '<rect class="mi-cw" x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (CW - 4) +
                    '" height="' + (CH - 4) + '" rx="5"/>';
                s += glyph(x + CW / 2 + c.jx, y + CH / 2 + c.jy, c.stage);
                s += '</g>';
            });
            s += '</svg>';
            return s;
        }
        function glyph(cx, cy, stage) {
            const ink = 'class="mi-ink"';
            if (stage === 'Interphase')
                return '<circle ' + ink + ' cx="' + cx + '" cy="' + cy + '" r="8" opacity="0.8"/>';
            if (stage === 'Prophase') {
                let p = '';
                for (let k = 0; k < 5; k++) {
                    const a = k * 1.25, r = 5.5;
                    p += '<rect ' + ink + ' x="' + (cx - 1.4 + Math.cos(a) * r) + '" y="' +
                        (cy - 4 + Math.sin(a) * r) + '" width="2.8" height="8" rx="1.4" ' +
                        'transform="rotate(' + (a * 40) + ' ' + (cx + Math.cos(a) * r) + ' ' + (cy + Math.sin(a) * r) + ')"/>';
                }
                return p;
            }
            if (stage === 'Metaphase') {
                let p = '';
                for (let k = -2; k <= 2; k++)
                    p += '<rect ' + ink + ' x="' + (cx - 1.4) + '" y="' + (cy + k * 4 - 3.5) +
                        '" width="2.8" height="7" rx="1.4"/>';
                return p;
            }
            if (stage === 'Anaphase') {
                let p = '';
                [-9, 9].forEach(dx => {
                    for (let k = -1; k <= 1; k++)
                        p += '<rect ' + ink + ' x="' + (cx + dx - 1.3) + '" y="' + (cy + k * 4.5 - 3) +
                            '" width="2.6" height="6" rx="1.3"/>';
                });
                p += '<line x1="' + (cx - 7) + '" y1="' + cy +
                    '" x2="' + (cx + 7) + '" y2="' + cy +
                    '" stroke="var(--text-secondary)" stroke-width="0.8" opacity="0.6"/>';
                return p;
            }
            // Telophase
            return '<circle ' + ink + ' cx="' + (cx - 10) + '" cy="' + cy + '" r="6" opacity="0.85"/>' +
                   '<circle ' + ink + ' cx="' + (cx + 10) + '" cy="' + cy + '" r="6" opacity="0.85"/>' +
                   '<line x1="' + cx + '" y1="' + (cy - 12) + '" x2="' + cx + '" y2="' + (cy + 12) +
                   '" stroke="var(--text-secondary)" stroke-width="1" opacity="0.7"/>';
        }

        function renderCount() {
            const how = U.el('p', 'mi-how');
            how.innerHTML = 'This is the online onion root-tip investigation, done properly. ' +
                'A field of <b>' + TOTAL + '</b> cells from the growing tip of a root, each drawn as it ' +
                'would appear under the microscope. Predict first, then count.';
            body.appendChild(how);

            // --- predict ---
            if (predicted === null) {
                const q = U.el('p', 'mi-q');
                q.textContent = 'Before you count: which stage do you expect MOST of these cells to be in?';
                body.appendChild(q);
                const opts = U.el('div', 'mi-opts');
                STAGES.forEach(s => {
                    const b = U.el('button', 'mi-opt' + (predictTried.indexOf(s) > -1 ? ' wrong' : ''));
                    b.type = 'button'; b.textContent = s;
                    b.addEventListener('click', () => {
                        if (s === 'Interphase') { predicted = s; msgText = null; }
                        else {
                            predictTried.push(s);
                            msgText = { cls: 'bad', html: 'Not ' + s.toLowerCase() +
                                '. Here is the reasoning you need: a stained root tip is a <b>snapshot</b>. ' +
                                'The fraction of cells caught in a stage is the fraction of the cycle that ' +
                                'stage takes up. So the answer is whichever stage lasts longest.' };
                        }
                        render();
                    });
                    opts.appendChild(b);
                });
                body.appendChild(opts);
                if (msgText) {
                    const m = U.el('p', 'mi-msg ' + msgText.cls);
                    m.innerHTML = msgText.html; body.appendChild(m);
                }
                return;
            }

            const task = U.el('p', 'mi-q');
            task.innerHTML = 'Click every cell that is <b>dividing</b> — that is, every cell showing ' +
                'separate chromosomes rather than one solid nucleus.';
            body.appendChild(task);

            const fieldBox = U.el('div', 'mi-field');
            fieldBox.innerHTML = cellSVG();
            body.appendChild(fieldBox);
            fieldBox.querySelectorAll('.mi-cell').forEach(g => {
                const act = () => {
                    if (revealed) return;
                    const i = +g.dataset.i;
                    if (picked[i]) delete picked[i]; else picked[i] = true;
                    render();
                };
                g.addEventListener('click', act);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                });
            });

            const legend = U.el('p', 'mi-legend');
            legend.textContent = 'One solid circle = interphase. Scattered bars = prophase. ' +
                'A line of bars = metaphase. Two groups apart = anaphase. Two circles with a new ' +
                'wall between = telophase.';
            body.appendChild(legend);

            const nPicked = Object.keys(picked).length;
            const tally = U.el('div', 'mi-tally');
            tally.innerHTML = '<span>Cells marked as dividing: <b>' + nPicked + '</b></span>' +
                '<span>Total cells in the field: <b>' + TOTAL + '</b></span>' +
                '<span>Your mitotic index: <b>' + (nPicked / TOTAL * 100).toFixed(1) + '%</b></span>';
            body.appendChild(tally);

            const btns = U.el('div', 'sim-buttons');
            if (!revealed) {
                U.button(btns, 'Check my count').addEventListener('click', () => { revealed = true; render(); });
                U.button(btns, 'Clear').addEventListener('click', () => { picked = {}; render(); });
            } else {
                U.button(btns, 'Count it again').addEventListener('click', () => {
                    picked = {}; revealed = false; render();
                });
            }
            body.appendChild(btns);

            if (revealed) body.appendChild(resultBox(nPicked));
        }

        function resultBox(nPicked) {
            const hits = field.filter(c => c.stage !== 'Interphase' && picked[c.i]).length;
            const misses = trueMitotic - hits;
            const falsePos = nPicked - hits;
            const d = U.el('div', 'mi-result');
            const cycleMin = 24 * 60;
            let rows = '';
            STAGES.forEach(s => {
                const n = trueCounts[s], pc = n / TOTAL * 100;
                rows += '<tr><td>' + s + '</td><td>' + n + '</td><td>' + pc.toFixed(1) + '%</td><td>' +
                    Math.round(pc / 100 * cycleMin) + ' min</td></tr>';
            });
            const sumPc = STAGES.reduce((a, s) => a + trueCounts[s] / TOTAL * 100, 0);
            d.innerHTML =
                '<h5>' + hits + ' of the ' + trueMitotic + ' dividing cells found' +
                (misses ? ', ' + misses + ' missed' : '') +
                (falsePos ? ', ' + falsePos + ' interphase cell' + (falsePos === 1 ? '' : 's') + ' marked by mistake' : '') + '.</h5>' +
                '<p>The <b>mitotic index</b> is the fraction of cells caught in mitosis: ' +
                trueMitotic + ' ÷ ' + TOTAL + ' = <b>' + (trueMitotic / TOTAL * 100).toFixed(1) +
                '%</b>. Here is the full breakdown, and the reason it matters.</p>' +
                '<table class="mi-table"><thead><tr><th>Stage</th><th>Cells</th><th>% of field</th>' +
                '<th>Time in a 24 h cycle</th></tr></thead><tbody>' + rows + '</tbody>' +
                '<tfoot><tr><td><b>Total</b></td><td><b>' + TOTAL + '</b></td><td><b>' +
                sumPc.toFixed(1) + '%</b></td><td><b>24 h</b></td></tr></tfoot></table>' +
                '<p style="margin-top:0.8rem">Read the last column again. Nothing in the field is moving — ' +
                'these cells were killed and stained. Yet by counting still pictures you have just ' +
                'measured <em>how long each stage lasts</em>. That works because the field is a fair ' +
                'sample of one cycle: if a stage takes up a tenth of the cycle, about a tenth of the ' +
                'cells will be caught in it.</p>' +
                '<p>And notice the percentages sum to exactly 100, because they were computed from the ' +
                'counts rather than remembered. If a set of percentages you are given sums to 99, ' +
                'that is rounding — go back to the counts.</p>';
            return d;
        }

        function render() {
            tabs.innerHTML = ''; body.innerHTML = '';
            tabButton('name', '1 · Name the stage');
            tabButton('count', '2 · Count a field');
            if (mode === 'name') renderName(); else renderCount();
        }
        render();

        root._simState = () => ({
            mode,
            micrographs: { index: shotIndex, answer: SHOTS[shotIndex].stage,
                identified: shotDone.length, of: SHOTS.length, rightFirstTime: shotScore },
            field: {
                total: TOTAL, trueCounts: Object.assign({}, trueCounts),
                trueMitotic, mitoticIndexPercent: +(trueMitotic / TOTAL * 100).toFixed(1),
                predicted, picked: Object.keys(picked).length, revealed,
                percentSum: +STAGES.reduce((a, s) => a + trueCounts[s] / TOTAL * 100, 0).toFixed(1)
            }
        });
        root._simSolve = () => {
            shotDone = SHOTS.map((_, i) => i); shotTried = [];
            predicted = 'Interphase'; picked = {};
            field.forEach(c => { if (c.stage !== 'Interphase') picked[c.i] = true; });
            revealed = true; render();
        };
    };
})();
