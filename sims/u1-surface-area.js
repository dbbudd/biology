/* =============================================================
   INTERACTIVE — Surface area to volume workbench
   -------------------------------------------------------------
   Registers window.SIMS['u1-surface-area'].  Supports HS-LS1-2.

   The agar-cube lab in software, plus the two conclusions the lab
   is actually for.

     PHASE 1 "predict" — the reader commits to what happens to the
       ratio when a cube gets bigger, before any number appears.
       Getting this wrong is normal and useful: most people
       predict that a bigger cube has more surface so it must do
       better, which is exactly the intuition the numbers destroy.
     PHASE 2 "bench"   — a live cube. Every figure on screen is
       computed from the side length, including the diffusion
       front, so the arithmetic in the chapter and the arithmetic
       here cannot disagree.
     PHASE 3 "apply"   — the same ratio driving two real cases:
       chopping one big cube into many small ones, and folding a
       flat gut lining into villi.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u1-sav-style';

    const DEPTH = 0.5;      // cm the dye penetrates in the fixed time of the lab

    const PREDICTIONS = [
        { t: 'Both the surface area and the ratio get bigger.', ok: false,
          why: 'The surface area does get bigger — but the ratio does not. Surface area grows with the square of the side; volume grows with the cube of it. Volume wins every time, so the ratio falls.' },
        { t: 'The surface area gets bigger, but the surface area to volume ratio gets smaller.', ok: true,
          why: 'Exactly right, and it is the whole chapter in one line. Surface area is 6s², volume is s³, so the ratio is 6s²/s³ = 6/s. Double the side and you halve the ratio, no matter what the starting size was.' },
        { t: 'Both stay the same, because the shape has not changed.', ok: false,
          why: 'Shape is unchanged, but scale is not — and the ratio depends on scale. A cube of side 1 cm has a ratio of 6; a cube of side 6 cm has a ratio of 1. Same shape, six times worse.' },
        { t: 'The surface area gets smaller.', ok: false,
          why: 'Surface area always grows when an object grows — 6s² rises with s. The trap is not that surface shrinks; it is that volume grows faster.' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.sav { padding:1rem 1.25rem 0.25rem; --s-ok:#2e7d32; --s-bad:#aa272f; --s-accent:var(--light-teal); }',
            '[data-theme="dark"] .sav { --s-ok:#7fc98a; --s-bad:#e08a90; }',
            '[data-theme="sepia"] .sav { --s-ok:#4a6b3d; --s-bad:#a04040; }',
            '.sav-phase { font-size:0.62rem; font-weight:700; letter-spacing:0.09em; text-transform:uppercase;',
            '   color:var(--text-secondary); margin:0 0 0.4rem; }',
            '.sav-how { font-size:0.82rem; color:var(--text-secondary); margin:0 0 0.9rem; line-height:1.55; }',
            '.sav-opt { display:block; width:100%; text-align:left; font:inherit; font-size:0.86rem;',
            '   line-height:1.5; padding:0.55rem 0.7rem; margin:0 0 0.4rem; border-radius:8px;',
            '   border:1.5px solid var(--border); background:transparent; color:var(--text); cursor:pointer; }',
            '.sav-opt:hover { border-color:var(--s-accent); }',
            '.sav-opt:focus-visible { outline:2px solid var(--s-accent); outline-offset:2px; }',
            '.sav-opt.r-ok { border-color:var(--s-ok); background:rgba(46,125,50,0.10); cursor:default; }',
            '.sav-opt.r-bad { border-color:var(--s-bad); background:rgba(170,39,47,0.08); cursor:default; }',
            '.sav-opt.r-none { opacity:0.5; cursor:default; }',
            '.sav-why { display:block; margin-top:0.4rem; font-size:0.78rem; line-height:1.55; color:var(--text-secondary); }',
            '.sav-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:1rem; align-items:start; }',
            '@media (min-width:640px) { .sav-grid { grid-template-columns:minmax(0,220px) minmax(0,1fr); } }',
            '.sav-fig { display:flex; flex-direction:column; align-items:center; gap:0.4rem; }',
            '.sav-fig svg { width:100%; max-width:200px; height:auto; }',
            '.sav-cap { font-size:0.7rem; color:var(--text-secondary); text-align:center; line-height:1.4; }',
            '.sav-table { width:100%; border-collapse:collapse; font-size:0.83rem; }',
            '.sav-table th, .sav-table td { padding:0.3rem 0.45rem; text-align:right; border-bottom:1px solid var(--border); }',
            '.sav-table th:first-child, .sav-table td:first-child { text-align:left; }',
            '.sav-table th { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.05em;',
            '   color:var(--text-secondary); font-weight:700; }',
            '.sav-table td { font-variant-numeric:tabular-nums; }',
            '.sav-table tr.hi td { background:rgba(87,120,153,0.12); font-weight:700; }',
            '.sav-note { font-size:0.8rem; line-height:1.55; color:var(--text-secondary); margin:0.7rem 0 0; }',
            '.sav-note strong { color:var(--text); }',
            '.sav-reveal { margin-top:1rem; border:1px solid var(--s-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .sav-reveal { background:rgba(127,201,138,0.12); }',
            '.sav-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.sav-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.sav-reveal p:last-child { margin-bottom:0; }',
            '.sav-msg { margin:0.8rem 0 0; font-size:0.82rem; line-height:1.55; min-height:1.6em; }',
            '.sav-msg.ok { color:var(--s-ok); } .sav-msg.bad { color:var(--s-bad); }'
        ].join('\n');
        document.head.appendChild(s);
    }

    /* ---- the model. Everything on screen comes out of these four. ---- */
    const SA = s => 6 * s * s;
    const VOL = s => s * s * s;
    const RATIO = s => SA(s) / VOL(s);                 // identical to 6/s
    const REACHED = s => {                             // fraction of volume the dye reaches
        const core = Math.max(0, s - 2 * DEPTH);
        return 1 - (core ** 3) / (s ** 3);
    };

    window.SIMS['u1-surface-area'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'sav');
        const phaseLab = U.el('p', 'sav-phase');
        const how = U.el('p', 'sav-how');
        const stage = U.el('div');
        const msg = U.el('p', 'sav-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [phaseLab, how, stage, msg, revealHost].forEach(n => wrap.appendChild(n));
        root.appendChild(wrap);

        const controlHost = U.el('div', 'sim-controls');
        controlHost.hidden = true;
        wrap.appendChild(controlHost);
        const side = U.slider(controlHost, 'sav-side', 'Cube side length', 1, 6, 3,
            v => v.toFixed(1) + ' cm', 0.5);

        const buttons = U.el('div', 'sim-buttons');
        const nextBtn = U.button(buttons, 'Next', 'primary');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let phase = 'predict';
        let answered = null;

        side.input.addEventListener('input', () => { if (phase !== 'predict') render(); });

        function reset() {
            phase = 'predict'; answered = null;
            side.input.value = 3; side.sync();
            revealHost.innerHTML = '';
            msg.textContent = ''; msg.className = 'sav-msg';
            render();
        }

        // ------------- drawing -------------
        function cubeSvg(s) {
            const px = 12 + 26 * s;                      // 1 cm -> 26 px, so scale is honest
            const box = 190, o = (box - px) / 2;
            const core = Math.max(0, s - 2 * DEPTH);
            const cpx = core * 26, co = (box - cpx) / 2;
            return '<svg viewBox="0 0 ' + box + ' ' + box + '" role="img" aria-label="Cross-section of an agar cube of side ' +
                s.toFixed(1) + ' centimetres. The outer ' + DEPTH + ' centimetres has been reached by the dye; the core of side ' +
                core.toFixed(1) + ' centimetres has not.">' +
                '<rect x="' + o + '" y="' + o + '" width="' + px + '" height="' + px + '" rx="3" ' +
                'fill="var(--red)" opacity="0.55" stroke="var(--red)" stroke-width="1.5"/>' +
                (core > 0
                    ? '<rect x="' + co + '" y="' + co + '" width="' + cpx + '" height="' + cpx + '" rx="2" ' +
                      'fill="var(--bg)" stroke="var(--text-secondary)" stroke-width="1" stroke-dasharray="3 3"/>' +
                      '<text x="' + (box / 2) + '" y="' + (box / 2 + 4) + '" text-anchor="middle" ' +
                      'font-size="10" fill="var(--text-secondary)">not reached</text>'
                    : '<text x="' + (box / 2) + '" y="' + (box / 2 + 4) + '" text-anchor="middle" ' +
                      'font-size="10" fill="#fff">fully reached</text>') +
                '</svg>';
        }

        function benchTable(cur) {
            const rows = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map(s => {
                const hi = Math.abs(s - cur) < 0.01;
                return '<tr class="' + (hi ? 'hi' : '') + '">' +
                    '<td>' + s.toFixed(1) + '</td>' +
                    '<td>' + SA(s).toFixed(1) + '</td>' +
                    '<td>' + VOL(s).toFixed(1) + '</td>' +
                    '<td>' + RATIO(s).toFixed(2) + '</td>' +
                    '<td>' + (REACHED(s) * 100).toFixed(0) + '%</td></tr>';
            }).join('');
            return '<table class="sav-table"><thead><tr>' +
                '<th>Side (cm)</th><th>Surface (cm²)</th><th>Volume (cm³)</th>' +
                '<th>Surface ÷ volume</th><th>Volume reached</th></tr></thead><tbody>' +
                rows + '</tbody></table>';
        }

        function render() {
            stage.innerHTML = '';
            controlHost.hidden = phase === 'predict';
            nextBtn.hidden = true;

            if (phase === 'predict') {
                phaseLab.textContent = 'Step 1 of 3 — commit to a prediction';
                how.textContent = 'A cube of agar sits in dye. Make it bigger — same shape, same material, ' +
                    'just larger. What happens to its surface area, and what happens to its surface area ' +
                    'divided by its volume? Choose before you see any numbers.';
                PREDICTIONS.forEach((p, k) => {
                    const b = U.el('button', 'sav-opt');
                    b.type = 'button';
                    if (answered === null) {
                        b.textContent = p.t;
                        b.addEventListener('click', () => {
                            answered = k;
                            msg.textContent = p.ok ? 'Correct.' : 'Not this one — read why, then look at the numbers.';
                            msg.className = 'sav-msg ' + (p.ok ? 'ok' : 'bad');
                            render();
                        });
                    } else {
                        b.disabled = true;
                        b.className = 'sav-opt ' + (k === answered ? (p.ok ? 'r-ok' : 'r-bad') : (p.ok ? 'r-ok' : 'r-none'));
                        b.innerHTML = esc(p.t) + (k === answered || p.ok ? '<span class="sav-why">' + esc(p.why) + '</span>' : '');
                    }
                    stage.appendChild(b);
                });
                if (answered !== null) { nextBtn.hidden = false; nextBtn.textContent = 'Open the workbench'; }

            } else if (phase === 'bench') {
                phaseLab.textContent = 'Step 2 of 3 — the agar cube, live';
                how.textContent = 'Drag the slider. The dye soaks in ' + DEPTH + ' cm from every face in the ' +
                    'time the lab allows, so the red shell is always ' + DEPTH + ' cm thick no matter how big ' +
                    'the cube is — and everything the cube can do depends on how much of it that shell reaches.';
                const s = +side.input.value;
                const grid = U.el('div', 'sav-grid');
                const fig = U.el('div', 'sav-fig');
                fig.innerHTML = cubeSvg(s) +
                    '<p class="sav-cap">Cut through the middle of a ' + s.toFixed(1) + ' cm cube. ' +
                    'Red = reached by dye.</p>';
                const right = U.el('div');
                right.innerHTML = benchTable(s) +
                    '<p class="sav-note">Side <strong>' + s.toFixed(1) + ' cm</strong>: surface <strong>' +
                    SA(s).toFixed(1) + ' cm²</strong>, volume <strong>' + VOL(s).toFixed(1) + ' cm³</strong>, ratio <strong>' +
                    RATIO(s).toFixed(2) + '</strong>. The dye reaches <strong>' + (REACHED(s) * 100).toFixed(0) +
                    '%</strong> of the cube.<br>Check the ratio against <strong>6 ÷ ' + s.toFixed(1) + ' = ' +
                    (6 / s).toFixed(2) + '</strong>. It is the same number every time, because 6s² ÷ s³ is always 6 ÷ s.</p>';
                grid.appendChild(fig); grid.appendChild(right);
                stage.appendChild(grid);
                nextBtn.hidden = false; nextBtn.textContent = 'Apply it to a body';

            } else {
                phaseLab.textContent = 'Step 3 of 3 — the same ratio, twice, in a body';
                how.textContent = 'Nothing new is happening in either of these. Both are the cube result ' +
                    'used deliberately instead of suffered.';
                const big = 6, small = 2, n = (big / small) ** 3;
                const cells = U.el('div');
                cells.innerHTML =
                    '<p class="sav-note"><strong>1. Why cells are small rather than large.</strong> ' +
                    'Take one cube of side ' + big + ' cm and cut it into cubes of side ' + small + ' cm. ' +
                    'You get <strong>' + n + '</strong> of them. The total volume has not changed — ' +
                    VOL(big) + ' cm³ before, ' + (n * VOL(small)) + ' cm³ after — but the total surface has gone from <strong>' +
                    SA(big) + ' cm²</strong> to <strong>' + (n * SA(small)) + ' cm²</strong>, which is <strong>' +
                    (n * SA(small) / SA(big)).toFixed(0) + ' times</strong> as much. The ratio rises from ' +
                    RATIO(big).toFixed(2) + ' to ' + RATIO(small).toFixed(2) + '. ' +
                    'A body made of many small cells has vastly more membrane than the same body made of a few big ones — ' +
                    'and membrane is where everything enters and leaves.</p>' +
                    '<p class="sav-note"><strong>2. Why your gut is folded.</strong> ' +
                    'The small intestine is about 6 m long and about 3 cm across. As a smooth tube its inner ' +
                    'surface would be π × 0.03 × 6 = <strong>' + (Math.PI * 0.03 * 6).toFixed(2) + ' m²</strong> — ' +
                    'about the size of a bath towel. Now fold it three times over:</p>' +
                    foldTable() +
                    '<p class="sav-note">The folds multiply, they do not add. Careful modern measurements ' +
                    'put the real figure lower than the classic textbook one — somewhere between about 30 m² ' +
                    'and 300 m² depending on how you measure it — but either answer is the same story: ' +
                    'the gut cheats the cube result by never being a smooth tube in the first place.</p>';
                stage.appendChild(cells);
                showReveal();
            }
        }

        function foldTable() {
            let a = Math.PI * 0.03 * 6;
            const rows = [['Smooth tube', 1], ['× circular folds', 3], ['× villi on the folds', 10],
                          ['× microvilli on each cell', 20]];
            let html = '<table class="sav-table"><thead><tr><th>Level of folding</th><th>Multiplier</th>' +
                '<th>Surface (m²)</th></tr></thead><tbody>';
            rows.forEach(([n, f], i) => {
                if (i) a *= f;
                html += '<tr' + (i === rows.length - 1 ? ' class="hi"' : '') + '><td>' + n + '</td><td>' +
                    (i ? '×' + f : '—') + '</td><td>' + a.toFixed(2) + '</td></tr>';
            });
            return html + '</tbody></table>';
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const d = U.el('div', 'sav-reveal');
            d.innerHTML =
                '<h5>One ratio, three answers</h5>' +
                '<p>Surface area to volume is not a fact about cubes. It is a constraint on every living ' +
                'thing, and there are only two ways round it.</p>' +
                '<p><strong>Stay small.</strong> That is what cells do. A cell 20 µm across has a ratio ' +
                'around 0.3 per µm; grow it to the size of a grape and the middle would starve long before ' +
                'anything reached it. Being small is not a limitation cells put up with — it is the design.</p>' +
                '<p><strong>Or fold.</strong> That is what organs do. A villus, a microvillus, an alveolus, ' +
                'a gill lamella, a root hair, the folds in a mitochondrion: every one of them is the same ' +
                'move, which is to buy surface without buying volume. When you meet a folded structure in ' +
                'biology, the first question worth asking is always what is crossing it.</p>';
            revealHost.appendChild(d);
        }

        nextBtn.addEventListener('click', () => {
            if (phase === 'predict') { phase = 'bench'; msg.textContent = ''; msg.className = 'sav-msg'; }
            else if (phase === 'bench') phase = 'apply';
            render();
        });
        resetBtn.addEventListener('click', reset);
        reset();

        // ---------------- verification hooks ----------------
        root._simState = () => {
            const s = +side.input.value;
            return {
                phase, answered,
                predictionCorrect: answered !== null && PREDICTIONS[answered].ok,
                side: s, surfaceArea: SA(s), volume: VOL(s),
                ratio: RATIO(s), sixOverS: 6 / s,
                fractionReached: REACHED(s),
                depth: DEPTH
            };
        };
        root._simSolve = () => {
            if (phase === 'predict') {
                if (answered === null) {
                    answered = PREDICTIONS.findIndex(p => p.ok);
                    msg.textContent = 'Correct.'; msg.className = 'sav-msg ok';
                } else {
                    phase = 'bench';
                    msg.textContent = ''; msg.className = 'sav-msg';
                }
            } else if (phase === 'bench') { phase = 'apply'; }
            render();
        };
    };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
})();
