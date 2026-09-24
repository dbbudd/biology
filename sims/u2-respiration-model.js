/* =============================================================
   INTERACTIVE — Build the respiration model
   -------------------------------------------------------------
   Registers window.SIMS['u2-respiration-model'].  Supports HS-LS1-7
   and learning targets D1, D2, D4.

   This is the A3 mitochondrion modelling task from page 8 of Anchor
   Guide 2, rebuilt. The paper version is a blank outline with the
   word "Mitochondria" on it and nothing else; a reader working alone
   has no way to check what they drew.

   The canvas is a course illustration (images/u2/mitochondrion-stages.jpeg)
   with eight numbered circles drawn in. The clickable markers here sit
   exactly over those circles — centres measured by fitting a ring to
   each one, all 72 sample points landing on every ring — and are drawn
   slightly larger so they cover them. Re-measure if the artwork is ever
   regenerated; do not estimate.

   Every marker has its OWN visual anchor in the artwork: a glucose ring
   outside the organelle, pyruvate crossing the membranes, CO2 in the
   matrix, a cycle of arrows, carrier tokens, a chain of proteins in a
   crista, and oxygen with water at the end of it. So the reader answers
   from what is drawn, not by elimination. The numbering is scrambled
   against the order of the stages.

   Names are never written on the artwork; a placed name fills the
   numbered key underneath instead.

   PHASE 1 "place"  — put eight things on the mitochondrion.
   PHASE 2 "tally"  — say what each stage yields. The reader supplies
     the direct ATP, the NADH and the FADH2 per stage; the sim
     computes the electron-transport-chain yield and the grand total
     from those numbers at runtime. No total is ever typed into this
     file, so the prose in the chapter cannot drift away from it.

   The deck's own figure (slides 94, 105, 143) gives 2 + 2 + about 28
   = about 32 ATP, and the arithmetic below reproduces that from
   2.5 ATP per NADH and 1.5 per FADH2.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2rm-style';

    /* ---------- the model everything is computed from ---------- */
    const ATP_PER_NADH = 2.5;
    const ATP_PER_FADH2 = 1.5;

    const STAGES = [
        { id: 'gly', name: 'Glycolysis', where: 'cytosol', o2: false,
          atp: 2, nadh: 2, fadh2: 0, co2: 0,
          note: 'Glycolysis makes 4 ATP but spends 2 getting started, so the <em>net</em> output ' +
                'is 2. This is the number students most often get wrong, because most diagrams ' +
                'print only the net figure.' },
        { id: 'pox', name: 'Pyruvate oxidation', where: 'matrix', o2: false,
          atp: 0, nadh: 2, fadh2: 0, co2: 2,
          note: 'Runs twice, once per pyruvate. Each time, one carbon is snipped off as CO₂ and ' +
                'the rest becomes acetyl-CoA. No ATP is made here at all.' },
        { id: 'cac', name: 'Citric acid cycle', where: 'matrix', o2: false,
          atp: 2, nadh: 6, fadh2: 2, co2: 4,
          note: 'Also runs twice. Between them the two turns release the remaining four carbons ' +
                'as CO₂ and load up most of the electron carriers.' }
    ];

    function tally() {
        const sum = k => STAGES.reduce((a, s) => a + s[k], 0);
        const direct = sum('atp'), nadh = sum('nadh'), fadh2 = sum('fadh2'), co2 = sum('co2');
        const etc = nadh * ATP_PER_NADH + fadh2 * ATP_PER_FADH2;
        return { direct, nadh, fadh2, co2, etc, total: direct + etc };
    }

    const ZONES = [
        { id: 'gly',  n: 6, x: 716,  y: 164,  label: 'Glycolysis',
          hint: 'in the cytosol, outside the mitochondrion' },
        { id: 'pyr',  n: 2, x: 236,  y: 1192, label: 'Pyruvate',
          hint: 'crossing both membranes' },
        { id: 'pox',  n: 4, x: 2352, y: 1234, label: 'Pyruvate oxidation → acetyl-CoA',
          hint: 'in the matrix' },
        { id: 'cac',  n: 3, x: 1388, y: 164,  label: 'Citric acid cycle',
          hint: 'in the matrix' },
        { id: 'etc',  n: 1, x: 2064, y: 164,  label: 'Electron transport chain',
          hint: 'built into the inner membrane, on a crista' },
        { id: 'carr', n: 5, x: 1872, y: 772,  label: 'NADH and FADH₂',
          hint: 'ferrying electrons to the chain' },
        { id: 'o2',   n: 7, x: 2340, y: 350,  label: 'O₂ → H₂O',
          hint: 'the very end of the chain' },
        { id: 'co2',  n: 8, x: 1010, y: 1408, label: 'CO₂ leaves',
          hint: 'released in the matrix' }
    ];
    const IMG_W = 2752, IMG_H = 1536, MARK_R = 78;
    const IMG_DESC = 'A mitochondrion cut open, with a folded inner membrane, a pale matrix and ' +
        'surrounding fluid. Outside it are a glucose molecule and two three-carbon pyruvate ' +
        'molecules about to cross in. Inside are carbon dioxide molecules, a ring of curved ' +
        'arrows, two carrier tokens, a row of proteins built into one fold, and an oxygen ' +
        'molecule with a water molecule at the end of that row. Eight numbered markers, 1 to 8, ' +
        'point to these, not in the order the stages happen.';

    const WHY = {
        gly: 'Glycolysis happens in the cytosol — outside the mitochondrion entirely. That is why ' +
             'a red blood cell, which has no mitochondria at all, can still make a little ATP.',
        pyr: 'Glucose itself never enters a mitochondrion. It is cut in half in the cytosol first, ' +
             'and it is the two pyruvate molecules that cross the membranes.',
        pox: 'Pyruvate oxidation happens in the matrix, the fluid inside the inner membrane. It is ' +
             'the short link step between glycolysis and the citric acid cycle.',
        cac: 'The citric acid cycle also runs in the matrix — a soup of enzymes, not a structure.',
        etc: 'The electron transport chain is different: it is a set of proteins embedded in the ' +
             'inner membrane. That is what the folds are for. Cristae multiply the membrane area, ' +
             'and so multiply the number of chains that will fit.',
        carr: 'NADH and FADH₂ are not energy. They are carriers — they collect electrons from the ' +
              'earlier stages and walk them to the chain.',
        o2: 'Oxygen sits at the far end of the chain and does one job: it accepts the spent ' +
            'electrons and picks up hydrogen to become water. Nothing else in the cell will take ' +
            'them, which is why you die without it.',
        co2: 'All six CO₂ molecules come out of the matrix — two from pyruvate oxidation and four ' +
             'from the citric acid cycle. None come from the electron transport chain, and none ' +
             'from glycolysis.'
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2rm{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2rm{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2rm{--ok:#4a6b3d;--bad:#a04040}',
            '.u2rm-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2rm-phase{font-size:0.62rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;',
            '  color:var(--text-secondary);margin:0 0 0.45rem}',
            '.u2rm-svg{width:100%;max-width:740px;display:block;margin:0 auto}',
            '.u2rm-stage{border:1px solid var(--border);border-radius:11px;background:#fdf6ee;',
            '  padding:0.4rem;overflow-x:auto}',
            '.u2rm-svg{width:100%;min-width:560px;height:auto;display:block}',
            /* artwork is a light image in every theme, so markers are pinned to its colours */
            '.u2rm-mk{cursor:pointer}',
            '.u2rm-mk circle{fill:#fff;stroke:#3b2330;stroke-width:9}',
            '.u2rm-mk text{fill:#2b1a22;font-size:88px;font-weight:800;text-anchor:middle;pointer-events:none}',
            '.u2rm-mk:hover circle{stroke:#577899;stroke-width:14}',
            '.u2rm-mk:focus{outline:none} .u2rm-mk:focus circle{stroke:#577899;stroke-width:16}',
            '.u2rm-mk.done circle{fill:#2e7d32;stroke:#1f5a22}',
            '.u2rm-mk.done text{fill:#fff}',
            '.u2rm-key{display:grid;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr));',
            '  gap:0.3rem 0.9rem;margin:0.7rem 0 0;padding:0;list-style:none;font-size:0.8rem}',
            '.u2rm-key li{display:flex;gap:0.45rem;align-items:baseline;color:var(--text-secondary)}',
            '.u2rm-key b{display:inline-block;min-width:1.35rem;height:1.35rem;line-height:1.35rem;',
            '  text-align:center;border-radius:50%;border:1.5px solid var(--border);font-size:0.72rem;',
            '  color:var(--text)}',
            '.u2rm-key li.done{color:var(--text);font-weight:600}',
            '.u2rm-key li.done b{background:#2e7d32;border-color:#2e7d32;color:#fff}',
            '.u2rm-zone{fill:transparent;stroke:var(--border);stroke-width:1.4;stroke-dasharray:5 4;',
            '  rx:8;cursor:pointer}',
            '.u2rm-zone:hover{stroke:var(--light-teal);fill:rgba(87,120,153,0.14)}',
            '.u2rm-zone.filled{stroke-dasharray:none;stroke:var(--text-secondary);fill:var(--bg)}',
            '.u2rm-zone.good{stroke:var(--ok);fill:rgba(46,125,50,0.12)}',
            '.u2rm-zone.badz{stroke:var(--bad);fill:rgba(170,39,47,0.12)}',
            '.u2rm-zt{font-size:10.5px;font-weight:700;fill:var(--text);pointer-events:none}',
            '.u2rm-zh{font-size:8.5px;fill:var(--text-secondary);pointer-events:none}',
            '.u2rm-bank{display:flex;gap:0.4rem;flex-wrap:wrap;border:1px solid var(--border);',
            '  border-radius:10px;padding:0.5rem 0.6rem;background:var(--bg-surface);min-height:46px;margin-top:0.6rem}',
            '.u2rm-tok{font:inherit;font-size:0.78rem;padding:0.28rem 0.55rem;border-radius:7px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2rm-tok:hover{border-color:var(--light-teal)}',
            '.u2rm-tok[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2rm-tok[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2rm-tbl{overflow-x:auto;margin-top:0.5rem}',
            '.u2rm-tbl table{border-collapse:collapse;font-size:0.8rem;width:100%;min-width:420px}',
            '.u2rm-tbl th,.u2rm-tbl td{border:1px solid var(--border);padding:0.28rem 0.45rem;text-align:center}',
            '.u2rm-tbl th{color:var(--text-secondary);font-weight:700;font-size:0.72rem}',
            '.u2rm-tbl td:first-child,.u2rm-tbl th:first-child{text-align:left}',
            '.u2rm-tbl input{font:inherit;font-size:0.8rem;width:3.4rem;padding:0.16rem 0.3rem;',
            '  border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);text-align:center}',
            '.u2rm-tbl input.ok{border-color:var(--ok)} .u2rm-tbl input.bad{border-color:var(--bad)}',
            '.u2rm-sum{margin-top:0.6rem;font-size:0.84rem;line-height:1.6;padding:0.6rem 0.8rem;',
            '  border-left:3px solid var(--light-teal);background:var(--bg-surface)}',
            '.u2rm-sum b{font-variant-numeric:tabular-nums}',
            '.u2rm-msg{margin:0.85rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2rm-msg.ok{color:var(--ok)} .u2rm-msg.bad{color:var(--bad)}',
            '.u2rm-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2rm-rev{background:rgba(127,201,138,0.12)}',
            '.u2rm-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2rm-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}',
            '.u2rm-rev img{width:100%;border-radius:8px;border:1px solid var(--border);margin:0.4rem 0}',
            '.u2rm-rev figcaption{font-size:0.74rem;color:var(--text-secondary);line-height:1.5;margin-bottom:0.6rem}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function mitoSVG() {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 740 400');
        svg.setAttribute('class', 'u2rm-svg');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label',
            'A blank mitochondrion drawn as a large oval with a smooth outer membrane and a ' +
            'folded inner membrane forming finger-like cristae around a central matrix, with ' +
            'empty dashed boxes placed in the cytosol outside, across the membranes, in the ' +
            'matrix and on one crista.');
        let g = '';
        g += '<defs><style>' +
             '.mm-out{fill:none;stroke:var(--text-secondary);stroke-width:2.4}' +
             '.mm-in{fill:none;stroke:var(--text-secondary);stroke-width:2;opacity:0.85}' +
             '.mm-mx{fill:var(--bg-surface);opacity:0.55}' +
             '.mm-lab{font-size:10px;fill:var(--text-secondary)}' +
             '</style></defs>';
        // matrix fill + outer membrane
        g += '<ellipse cx="400" cy="205" rx="300" ry="160" class="mm-mx"/>';
        g += '<ellipse cx="400" cy="205" rx="300" ry="160" class="mm-out"/>';
        // inner membrane: a wavy closed path making cristae
        let d = 'M 400 55 ';
        const cx = 400, cy = 205, rx = 282, ry = 143, lobes = 7;
        for (let i = 0; i <= 200; i++) {
            const th = -Math.PI / 2 + (i / 200) * Math.PI * 2;
            const wob = 1 + 0.13 * Math.sin(lobes * th * 2);
            const x = cx + rx * wob * Math.cos(th) * 0.94;
            const y = cy + ry * wob * Math.sin(th) * 0.94;
            d += 'L ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
        }
        d += 'Z';
        g += '<path d="' + d + '" class="mm-in"/>';
        // helper labels for the anatomy the reader already knows
        g += '<text x="26" y="392" class="mm-lab">cytosol</text>';
        g += '<text x="614" y="196" class="mm-lab">outer membrane</text>';
        g += '<text x="600" y="212" class="mm-lab">inner membrane</text>';
        g += '<text x="404" y="300" class="mm-lab" text-anchor="middle">matrix</text>';
        g += '<line x1="700" y1="190" x2="712" y2="176" stroke="var(--text-secondary)" stroke-width="1"/>';
        g += '<text x="352" y="20" class="mm-lab">Glucose arrives here →</text>';
        svg.innerHTML = g;
        return svg;
    }

    window.SIMS['u2-respiration-model'] = function (root) {
        injectStyle();
        const ns = 'http://www.w3.org/2000/svg';
        const wrap = U.el('div', 'u2rm');
        const how = U.el('p', 'u2rm-how');
        const phaseLab = U.el('p', 'u2rm-phase');
        const stageHost = U.el('div');
        const bank = U.el('div', 'u2rm-bank');
        const tallyHost = U.el('div');
        const msg = U.el('p', 'u2rm-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, phaseLab, stageHost, bank, tallyHost, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const nextBtn = U.button(buttons, 'Now count the ATP', 'primary');
        const checkBtn = U.button(buttons, 'Check the tally', 'primary');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let phase = 'place';
        let filled = {};        // zone id -> true
        let selected = null;    // zone id whose label is held
        let marked = false;
        let entered = {};       // stageId -> {atp, nadh, fadh2}
        let svg, keyEl, zoneEls = {};

        function build() {
            stageHost.innerHTML = '';
            const stage = U.el('div', 'u2rm-stage');
            svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', '0 0 ' + IMG_W + ' ' + IMG_H);
            svg.setAttribute('class', 'u2rm-svg');
            svg.setAttribute('role', 'group');
            svg.setAttribute('aria-label', IMG_DESC);
            const im = document.createElementNS(ns, 'image');
            im.setAttribute('href', (document.body.dataset.root || '../') + 'images/u2/mitochondrion-stages.jpeg');
            im.setAttribute('x', 0); im.setAttribute('y', 0);
            im.setAttribute('width', IMG_W); im.setAttribute('height', IMG_H);
            svg.appendChild(im);
            zoneEls = {};
            ZONES.forEach(z => {
                const g = document.createElementNS(ns, 'g');
                g.setAttribute('class', 'u2rm-mk');
                g.setAttribute('tabindex', '0');
                g.setAttribute('role', 'button');
                g.innerHTML = '<circle cx="' + z.x + '" cy="' + z.y + '" r="' + MARK_R + '"/>' +
                    '<text x="' + z.x + '" y="' + (z.y + 32) + '">' + z.n + '</text>';
                const act = () => drop(z.id);
                g.addEventListener('click', act);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                });
                svg.appendChild(g);
                zoneEls[z.id] = g;
            });
            stage.appendChild(svg);
            stageHost.appendChild(stage);
            keyEl = U.el('ol', 'u2rm-key');
            stageHost.appendChild(keyEl);
        }

        function drop(zid) {
            if (phase !== 'place') return;
            if (filled[zid]) { delete filled[zid]; marked = false; render(); return; }
            if (!selected) {
                msg.textContent = 'Pick a label from the tray first, then click its numbered marker.';
                msg.className = 'u2rm-msg';
                return;
            }
            if (selected === zid) {
                filled[zid] = true; selected = null; marked = false;
                msg.innerHTML = WHY[zid];
                msg.className = 'u2rm-msg ok';
            } else {
                const want = ZONES.find(z => z.id === selected);
                msg.innerHTML = 'Not there. ' + WHY[selected];
                msg.className = 'u2rm-msg bad';
            }
            render();
        }

        function render() {
            how.innerHTML = phase === 'place'
                ? 'Pick a label, then click the numbered marker where it belongs. Each marker ' +
                  'points at something drawn — a molecule, a cycle, a row of proteins — so work ' +
                  'from the picture. Getting the <em>place</em> right is half the model: three of ' +
                  'these stages happen in the matrix and one is built into the membrane, and that ' +
                  'difference is the whole reason a mitochondrion is folded.'
                : 'Now the accounting. For each stage, enter the ATP made <strong>directly</strong>, ' +
                  'and the number of NADH and FADH₂ it hands to the chain. The electron transport ' +
                  'chain total is not something you enter — it is calculated from your carriers.';
            phaseLab.textContent = phase === 'place'
                ? 'Step 1 of 2 — place the eight parts' : 'Step 2 of 2 — count the ATP';

            ZONES.forEach(z => {
                const g = zoneEls[z.id];
                g.classList.toggle('done', !!filled[z.id]);
                g.setAttribute('aria-label', 'Marker ' + z.n + (filled[z.id]
                    ? ': ' + z.label + ', ' + z.hint + '. Activate to remove.' : ''));
            });
            keyEl.innerHTML = '';
            ZONES.slice().sort((a, b) => a.n - b.n).forEach(z => {
                const li = U.el('li', filled[z.id] ? 'done' : '');
                li.innerHTML = '<b>' + z.n + '</b><span>' + (filled[z.id] ? z.label : '?') + '</span>';
                keyEl.appendChild(li);
            });

            bank.innerHTML = '';
            if (phase === 'place') {
                const left = ZONES.filter(z => !filled[z.id]);
                if (!left.length) {
                    const p = U.el('span'); p.style.fontSize = '0.78rem';
                    p.style.color = 'var(--text-secondary)';
                    p.textContent = 'Model complete. Now count the ATP.';
                    bank.appendChild(p);
                } else left.forEach(z => {
                    const b = U.el('button', 'u2rm-tok');
                    b.type = 'button'; b.innerHTML = z.label;
                    b.setAttribute('aria-pressed', selected === z.id ? 'true' : 'false');
                    b.addEventListener('click', () => {
                        selected = selected === z.id ? null : z.id; render();
                    });
                    bank.appendChild(b);
                });
            }
            bank.hidden = phase !== 'place';

            tallyHost.innerHTML = '';
            if (phase === 'tally') {
                const box = U.el('div', 'u2rm-tbl');
                let html = '<table><thead><tr><th>Stage</th><th>Where</th>' +
                    '<th>ATP made<br>directly</th><th>NADH</th><th>FADH₂</th></tr></thead><tbody>';
                STAGES.forEach(s => {
                    html += '<tr><td><strong>' + s.name + '</strong></td><td>' + s.where + '</td>' +
                        ['atp', 'nadh', 'fadh2'].map(k =>
                            '<td><input type="number" min="0" max="12" step="1" data-s="' + s.id +
                            '" data-k="' + k + '" value="' +
                            (entered[s.id] && entered[s.id][k] !== undefined ? entered[s.id][k] : '') +
                            '" aria-label="' + s.name + ' ' + k + '"></td>').join('') + '</tr>';
                });
                html += '<tr><td colspan="2"><strong>Electron transport chain</strong></td>' +
                    '<td colspan="3" id="u2rm-etc">calculated from your carriers</td></tr>';
                html += '</tbody></table>';
                box.innerHTML = html;
                box.querySelectorAll('input').forEach(inp => {
                    inp.addEventListener('input', () => {
                        const s = inp.dataset.s, k = inp.dataset.k;
                        entered[s] = entered[s] || {};
                        entered[s][k] = inp.value === '' ? undefined : Math.max(0, +inp.value);
                        inp.className = '';
                        msg.textContent = ''; msg.className = 'u2rm-msg';
                        revealHost.innerHTML = '';
                        liveSum();
                    });
                });
                tallyHost.appendChild(box);
                const sum = U.el('div', 'u2rm-sum');
                sum.id = 'u2rm-sum';
                tallyHost.appendChild(sum);
                liveSum();
            }

            nextBtn.hidden = !(phase === 'place' && ZONES.every(z => filled[z.id]));
            checkBtn.hidden = phase !== 'tally';
        }

        function readEntered() {
            const direct = STAGES.reduce((a, s) => a + ((entered[s.id] || {}).atp || 0), 0);
            const nadh = STAGES.reduce((a, s) => a + ((entered[s.id] || {}).nadh || 0), 0);
            const fadh2 = STAGES.reduce((a, s) => a + ((entered[s.id] || {}).fadh2 || 0), 0);
            const etc = nadh * ATP_PER_NADH + fadh2 * ATP_PER_FADH2;
            return { direct, nadh, fadh2, etc, total: direct + etc };
        }

        function liveSum() {
            const el = document.getElementById('u2rm-sum');
            if (!el) return;
            const g = readEntered();
            el.innerHTML = 'Your model so far: <b>' + g.nadh + '</b> NADH &times; ' + ATP_PER_NADH +
                ' + <b>' + g.fadh2 + '</b> FADH₂ &times; ' + ATP_PER_FADH2 + ' = <b>' + g.etc +
                '</b> ATP from the electron transport chain, plus <b>' + g.direct +
                '</b> made directly. <strong>Total = ' + g.total + ' ATP per glucose.</strong>';
        }

        function checkTally() {
            const box = tallyHost.querySelector('table');
            let right = 0, cells = 0;
            STAGES.forEach(s => {
                ['atp', 'nadh', 'fadh2'].forEach(k => {
                    cells++;
                    const inp = box.querySelector('input[data-s="' + s.id + '"][data-k="' + k + '"]');
                    const v = (entered[s.id] || {})[k];
                    const ok = v === s[k];
                    if (v !== undefined) inp.className = ok ? 'ok' : 'bad';
                    if (ok) right++;
                });
            });
            const T = tally();
            if (right === cells) {
                msg.innerHTML = 'Every stage right, and the total comes out at <strong>' +
                    T.total + ' ATP</strong> per glucose.';
                msg.className = 'u2rm-msg ok';
                showReveal();
            } else {
                const firstBad = STAGES.find(s => ['atp', 'nadh', 'fadh2']
                    .some(k => (entered[s.id] || {})[k] !== s[k]));
                msg.innerHTML = right + ' of ' + cells + ' figures correct. Look at <strong>' +
                    firstBad.name + '</strong> again. ' + firstBad.note;
                msg.className = 'u2rm-msg bad';
                revealHost.innerHTML = '';
            }
            return right;
        }

        function showReveal() {
            const T = tally();
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2rm-rev');
            const rows = STAGES.map(s =>
                '<tr><td>' + s.name + '</td><td>' + s.atp + '</td><td>' + s.nadh + '</td><td>' +
                s.fadh2 + '</td><td>' + s.co2 + '</td></tr>').join('');
            d.innerHTML =
                '<h5>Where the 32 ATP actually come from</h5>' +
                '<div class="u2rm-tbl"><table><thead><tr><th>Stage</th><th>ATP direct</th>' +
                '<th>NADH</th><th>FADH₂</th><th>CO₂</th></tr></thead><tbody>' + rows +
                '<tr><td><strong>Totals</strong></td><td><strong>' + T.direct + '</strong></td>' +
                '<td><strong>' + T.nadh + '</strong></td><td><strong>' + T.fadh2 + '</strong></td>' +
                '<td><strong>' + T.co2 + '</strong></td></tr></tbody></table></div>' +
                '<p>Then the chain converts the carriers: ' + T.nadh + ' NADH &times; ' + ATP_PER_NADH +
                ' = ' + (T.nadh * ATP_PER_NADH) + ', and ' + T.fadh2 + ' FADH₂ &times; ' + ATP_PER_FADH2 +
                ' = ' + (T.fadh2 * ATP_PER_FADH2) + '. That is <strong>' + T.etc +
                ' ATP</strong> from oxidative phosphorylation, on top of the ' + T.direct +
                ' made directly — <strong>' + T.total + ' ATP per glucose</strong>.</p>' +
                '<p>Two things worth noticing. First, the stage that makes almost no ATP by itself ' +
                '— the citric acid cycle, with just ' + STAGES[2].atp + ' — is the one that loads ' +
                'most of the carriers, and the carriers are where the energy really is. Second, ' +
                'the ' + T.co2 + ' CO₂ released is exactly the number of carbon atoms in one ' +
                'glucose molecule. Every carbon you eat leaves through your lungs.</p>' +
                '<p>You will see older books say 36 or 38 ATP. They used 3 ATP per NADH and 2 per ' +
                'FADH₂; careful measurement brought those down to ' + ATP_PER_NADH + ' and ' +
                ATP_PER_FADH2 + '. Either way, the ratio that matters is unchanged: aerobic ' +
                'respiration gets you around <strong>' + Math.round(T.total / 2) +
                ' times</strong> the ATP that glycolysis alone can.</p>' +
                '<figure><img src="../images/u2/mitochondria-model-filled.png" ' +
                'alt="A hand-drawn worked version of the same blank mitochondrion. Glycolysis is ' +
                'written in the cytosol with glucose becoming two pyruvate and yielding two ATP. ' +
                'An arrow carries pyruvate across the membranes into the matrix, where it becomes ' +
                'acetyl-CoA and enters a loop labelled CAC. NADH and FADH2 arrows run from those ' +
                'stages to a chain drawn on one crista, where oxygen becomes water and the ATP ' +
                'tally is written out.">' +
                '<figcaption>The teacher’s own worked version of the same A3 template. Compare it ' +
                'with what you built — the arrows should go to the same places, even where the ' +
                'handwriting splits the ATP tally slightly differently from the table above.' +
                '</figcaption></figure>';
            revealHost.appendChild(d);
        }

        nextBtn.addEventListener('click', () => {
            marked = true; phase = 'tally';
            msg.textContent = ''; msg.className = 'u2rm-msg';
            render();
        });
        checkBtn.addEventListener('click', checkTally);
        resetBtn.addEventListener('click', () => {
            phase = 'place'; filled = {}; selected = null; marked = false; entered = {};
            msg.textContent = ''; msg.className = 'u2rm-msg'; revealHost.innerHTML = '';
            build(); render();
        });

        build(); render();

        root._simState = () => ({
            phase, placed: Object.keys(filled),
            allPlaced: ZONES.every(z => filled[z.id]),
            entered: JSON.parse(JSON.stringify(entered)),
            studentTotals: readEntered(),
            modelTotals: tally(),
            stages: STAGES.map(s => ({ id: s.id, name: s.name, where: s.where,
                atp: s.atp, nadh: s.nadh, fadh2: s.fadh2, co2: s.co2 })),
            constants: { ATP_PER_NADH, ATP_PER_FADH2 }
        });
        root._simSolve = () => {
            ZONES.forEach(z => filled[z.id] = true);
            marked = true; phase = 'tally';
            STAGES.forEach(s => entered[s.id] = { atp: s.atp, nadh: s.nadh, fadh2: s.fadh2 });
            render(); checkTally();
        };
    };
})();
