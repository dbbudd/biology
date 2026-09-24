/* =============================================================
   INTERACTIVE — Light reactions and Calvin cycle
   -------------------------------------------------------------
   Registers window.SIMS['u2-photosynthesis'].  Supports HS-LS1-5
   and learning targets L2 and D4 ("develop a model based on
   evidence to illustrate the relationships between systems or
   components of a system").

   Anchor Guide 1 pages 11 to 14 ask, over and over: what matter is
   entering and leaving the light reactions? What is entering and
   leaving the Calvin cycle? What is hydrogen used for? Where does
   the ATP go? Where does the oxygen go? Those questions have no
   answers printed anywhere. This sim is the answer sheet, but the
   reader has to commit to a route for every molecule before any
   explanation appears.

   The per-glucose totals in the reveal are COMPUTED from the Calvin
   cycle's own stoichiometry at runtime (3 CO2, 9 ATP, 6 NADPH per
   G3P; 2 G3P per glucose; 2 electrons per NADPH; 2 electrons per
   water split; 2 water per O2), never typed in. Change the model and
   the prose follows it.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2ph-style';

    /* --- the model the whole sim is derived from --- */
    const CALVIN_PER_G3P = { co2: 3, atp: 9, nadph: 6 };
    const G3P_PER_GLUCOSE = 2;
    const ELECTRONS_PER_NADPH = 2;
    const ELECTRONS_PER_WATER = 2;
    const WATER_PER_O2 = 2;

    function totals() {
        const co2 = CALVIN_PER_G3P.co2 * G3P_PER_GLUCOSE;
        const atp = CALVIN_PER_G3P.atp * G3P_PER_GLUCOSE;
        const nadph = CALVIN_PER_G3P.nadph * G3P_PER_GLUCOSE;
        const electrons = nadph * ELECTRONS_PER_NADPH;
        const water = electrons / ELECTRONS_PER_WATER;
        const o2 = water / WATER_PER_O2;
        return { co2, atp, nadph, electrons, water, o2, glucose: 1, netWater: water - co2 };
    }

    const ZONES = [
        { id: 'in-lr',  label: 'In &rarr; light reactions',
          hint: 'arriving from outside the chloroplast' },
        { id: 'out-lr', label: 'Light reactions &rarr; out',
          hint: 'leaving the chloroplast altogether' },
        { id: 'lr-cc',  label: 'Light reactions &rarr; Calvin cycle',
          hint: 'handed across, inside the chloroplast' },
        { id: 'cc-lr',  label: 'Calvin cycle &rarr; light reactions',
          hint: 'handed back, inside the chloroplast' },
        { id: 'in-cc',  label: 'In &rarr; Calvin cycle',
          hint: 'arriving from outside the chloroplast' },
        { id: 'out-cc', label: 'Calvin cycle &rarr; out',
          hint: 'leaving the chloroplast altogether' }
    ];

    const TOKENS = [
        { id: 'light', label: 'Light', sub: 'energy', zone: 'in-lr', kind: 'energy',
          why: 'Light is the energy source, and it is absorbed by chlorophyll in the thylakoid ' +
               'membrane. That is what makes these the LIGHT reactions.' },
        { id: 'h2o', label: 'H₂O', sub: 'water', zone: 'in-lr', kind: 'matter',
          why: 'Water is split in the thylakoid — this is called photolysis. Splitting it gives ' +
               'up electrons to replace the ones chlorophyll just lost, hydrogen ions to build a ' +
               'gradient, and oxygen as a leftover.' },
        { id: 'o2', label: 'O₂', sub: 'oxygen', zone: 'out-lr', kind: 'matter',
          why: 'Every oxygen atom you have ever breathed came off a water molecule that was ' +
               'split in a thylakoid. Oxygen is not made from CO₂, and it is not made in the ' +
               'Calvin cycle — it is waste from taking water apart.' },
        { id: 'atp', label: 'ATP', sub: 'charged carrier', zone: 'lr-cc', kind: 'energy',
          why: 'The light reactions charge ATP; the Calvin cycle spends it. ATP never leaves the ' +
               'chloroplast to do this job — it is made a few nanometres from where it is used.' },
        { id: 'nadph', label: 'NADPH', sub: 'loaded with H and e⁻', zone: 'lr-cc', kind: 'energy',
          why: 'NADPH is the hydrogen delivery van. The hydrogen came from water; the Calvin ' +
               'cycle needs it to turn CO₂ (which has no hydrogen at all) into sugar (which is ' +
               'half hydrogen).' },
        { id: 'adp', label: 'ADP + Pᵢ', sub: 'flat battery', zone: 'cc-lr', kind: 'energy',
          why: 'Once the Calvin cycle has spent the ATP, the empty ADP goes straight back to be ' +
               'recharged. The cell holds only a tiny stock of these carriers and cycles them ' +
               'thousands of times a second.' },
        { id: 'nadp', label: 'NADP⁺', sub: 'empty carrier', zone: 'cc-lr', kind: 'energy',
          why: 'Same idea: the unloaded carrier returns to the thylakoid to pick up more hydrogen. ' +
               'Nothing is thrown away.' },
        { id: 'co2', label: 'CO₂', sub: 'carbon dioxide', zone: 'in-cc', kind: 'matter',
          why: 'CO₂ enters through the stomata and diffuses to the stroma. It plays no part in ' +
               'the light reactions at all — a very common wrong answer.' },
        { id: 'sugar', label: 'Sugar', sub: 'G3P → glucose', zone: 'out-cc', kind: 'matter',
          why: 'The Calvin cycle builds a three-carbon sugar called G3P. Two of those are joined ' +
               'to make one glucose, which is exported or stored as starch.' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2ph{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2ph{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2ph{--ok:#4a6b3d;--bad:#a04040}',
            '.u2ph-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.8rem;line-height:1.5}',
            '.u2ph-bank{display:flex;gap:0.4rem;flex-wrap:wrap;border:1px solid var(--border);',
            '  border-radius:10px;padding:0.5rem 0.6rem;background:var(--bg-surface);min-height:48px}',
            '.u2ph-tok{font:inherit;font-size:0.82rem;font-weight:700;padding:0.3rem 0.55rem;',
            '  border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);',
            '  cursor:pointer;display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1.2}',
            '.u2ph-tok small{font-weight:400;font-size:0.62rem;color:var(--text-secondary)}',
            '.u2ph-tok.k-energy{border-left:4px solid var(--yellow)}',
            '.u2ph-tok.k-matter{border-left:4px solid var(--light-teal)}',
            '.u2ph-tok:hover{border-color:var(--light-teal)}',
            '.u2ph-tok[aria-pressed="true"]{box-shadow:0 0 0 2px var(--light-teal)}',
            '.u2ph-tok.good{border-color:var(--ok);box-shadow:inset 0 0 0 1px var(--ok)}',
            '.u2ph-tok.bad{border-color:var(--bad);box-shadow:inset 0 0 0 1px var(--bad)}',
            '.u2ph-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-top:0.7rem}',
            '@media (max-width:640px){.u2ph-grid{grid-template-columns:1fr}}',
            '.u2ph-zone{border:1.5px dashed var(--border);border-radius:10px;padding:0.45rem 0.55rem;min-height:62px}',
            '.u2ph-zone.over{border-color:var(--light-teal);box-shadow:0 0 0 2px var(--light-teal)}',
            '.u2ph-zone h6{margin:0 0 0.05rem;font-size:0.7rem;color:var(--text)}',
            '.u2ph-zone .hint{display:block;font-size:0.62rem;color:var(--text-secondary);margin-bottom:0.3rem}',
            '.u2ph-msg{margin:0.85rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2ph-msg.ok{color:var(--ok)} .u2ph-msg.bad{color:var(--bad)}',
            '.u2ph-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2ph-rev{background:rgba(127,201,138,0.12)}',
            '.u2ph-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2ph-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}',
            '.u2ph-rev table{width:100%;border-collapse:collapse;font-size:0.78rem;margin:0.4rem 0 0.7rem}',
            '.u2ph-rev th,.u2ph-rev td{border:1px solid var(--border);padding:0.22rem 0.4rem;text-align:left}',
            '.u2ph-rev th{color:var(--text-secondary);font-weight:700}',
            '.u2ph-note{font-size:0.78rem;line-height:1.55;margin:0.5rem 0 0;color:var(--text-secondary)}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u2-photosynthesis'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u2ph');
        const how = U.el('p', 'u2ph-how');
        how.innerHTML = 'Nine things move through a chloroplast. Click one, then click the route ' +
            'it takes — or drag it there. Some go in, some come out, and four of them never leave ' +
            'the chloroplast at all: they shuttle between the two halves. <strong>Route all nine, ' +
            'then press Check.</strong>';
        const bank = U.el('div', 'u2ph-bank');
        const grid = U.el('div', 'u2ph-grid');
        const msg = U.el('p', 'u2ph-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, bank, grid, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const checkBtn = U.button(buttons, 'Check my routing', 'primary');
        const resetBtn = U.button(buttons, 'Clear');
        wrap.appendChild(buttons);

        let placed = {};     // token id -> zone id
        let selected = null;
        let checked = false;
        const zoneEls = {};

        ZONES.forEach(z => {
            const d = U.el('div', 'u2ph-zone');
            d.innerHTML = '<h6>' + z.label + '</h6><span class="hint">' + z.hint + '</span>';
            d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('over'); });
            d.addEventListener('dragleave', () => d.classList.remove('over'));
            d.addEventListener('drop', e => {
                e.preventDefault(); d.classList.remove('over');
                const id = e.dataTransfer.getData('text/plain');
                if (id) { placed[id] = z.id; selected = null; clearCheck(); render(); }
            });
            d.addEventListener('click', e => {
                if (e.target.closest('.u2ph-tok')) return;
                if (selected) { placed[selected] = z.id; selected = null; clearCheck(); render(); }
            });
            grid.appendChild(d);
            zoneEls[z.id] = d;
        });

        function clearCheck() {
            checked = false; revealHost.innerHTML = '';
            msg.textContent = ''; msg.className = 'u2ph-msg';
        }

        function tokEl(t, inZone) {
            const b = U.el('button', 'u2ph-tok k-' + t.kind);
            b.type = 'button'; b.draggable = true;
            b.innerHTML = '<span>' + t.label + '</span><small>' + t.sub + '</small>';
            b.setAttribute('aria-pressed', selected === t.id ? 'true' : 'false');
            b.setAttribute('aria-label', t.label + ', ' + t.sub +
                (inZone ? '. Placed. Activate to send back.' : '. Activate to select.'));
            b.addEventListener('dragstart', e => { selected = t.id; e.dataTransfer.setData('text/plain', t.id); });
            b.addEventListener('click', () => {
                if (inZone) { delete placed[t.id]; selected = null; }
                else selected = selected === t.id ? null : t.id;
                clearCheck(); render();
            });
            if (checked && inZone) b.classList.add(placed[t.id] === t.zone ? 'good' : 'bad');
            return b;
        }

        function render() {
            bank.innerHTML = '';
            const left = TOKENS.filter(t => !placed[t.id]);
            if (!left.length) {
                const p = U.el('span'); p.style.fontSize = '0.78rem';
                p.style.color = 'var(--text-secondary)';
                p.textContent = 'All nine routed. Press Check.';
                bank.appendChild(p);
            } else left.forEach(t => bank.appendChild(tokEl(t, false)));

            ZONES.forEach(z => {
                const d = zoneEls[z.id];
                [...d.querySelectorAll('.u2ph-tok')].forEach(e => e.remove());
                TOKENS.forEach(t => { if (placed[t.id] === z.id) d.appendChild(tokEl(t, true)); });
            });
        }

        checkBtn.addEventListener('click', () => {
            const unplaced = TOKENS.filter(t => !placed[t.id]);
            if (unplaced.length) {
                msg.textContent = 'Route all nine first — ' + unplaced.length + ' still in the tray.';
                msg.className = 'u2ph-msg bad';
                return;
            }
            checked = true;
            const wrong = TOKENS.filter(t => placed[t.id] !== t.zone);
            render();
            if (!wrong.length) {
                msg.textContent = 'All nine routed correctly.';
                msg.className = 'u2ph-msg ok';
                showReveal();
            } else {
                const w = wrong[0];
                msg.innerHTML = wrong.length + ' of 9 are in the wrong place. Start with <strong>' +
                    w.label + '</strong>: ' + w.why;
                msg.className = 'u2ph-msg bad';
            }
        });

        function showReveal() {
            const T = totals();
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2ph-rev');
            let rows = '';
            TOKENS.forEach(t => {
                const z = ZONES.find(z => z.id === t.zone);
                rows += '<tr><td><strong>' + t.label + '</strong></td><td>' +
                        z.label.replace(/&rarr;/g, '→') + '</td><td>' + t.why + '</td></tr>';
            });
            d.innerHTML = '<h5>Two halves, one process</h5>' +
                '<p>Read your finished model as a sentence. The light reactions take in light and ' +
                'water and push out oxygen; everything else they produce is handed sideways to the ' +
                'Calvin cycle, which takes in CO₂ and pushes out sugar. Neither half can run without ' +
                'the other: the Calvin cycle would run out of ATP and NADPH in seconds, and the light ' +
                'reactions would run out of empty carriers to load.</p>' +
                '<table><thead><tr><th>Molecule</th><th>Route</th><th>Why</th></tr></thead><tbody>' +
                rows + '</tbody></table>' +
                '<h5>Now count, for one glucose</h5>' +
                '<p>The Calvin cycle spends ' + CALVIN_PER_G3P.atp + ' ATP and ' +
                CALVIN_PER_G3P.nadph + ' NADPH, and fixes ' + CALVIN_PER_G3P.co2 +
                ' CO₂, to make one G3P. It takes ' + G3P_PER_GLUCOSE +
                ' G3P to build one glucose. So for a single glucose molecule:</p>' +
                '<table><tbody>' +
                '<tr><td>CO₂ fixed</td><td><strong>' + T.co2 + '</strong> — one per carbon atom in glucose</td></tr>' +
                '<tr><td>ATP spent</td><td><strong>' + T.atp + '</strong></td></tr>' +
                '<tr><td>NADPH spent</td><td><strong>' + T.nadph + '</strong></td></tr>' +
                '<tr><td>electrons needed</td><td><strong>' + T.electrons + '</strong> (' +
                ELECTRONS_PER_NADPH + ' per NADPH)</td></tr>' +
                '<tr><td>water split</td><td><strong>' + T.water + '</strong> (' +
                ELECTRONS_PER_WATER + ' electrons each)</td></tr>' +
                '<tr><td>O₂ released</td><td><strong>' + T.o2 + '</strong> (' +
                WATER_PER_O2 + ' water per O₂)</td></tr>' +
                '</tbody></table>' +
                '<p class="u2ph-note">Look at the last line. The balanced equation says 6 CO₂ + ' +
                '6 H₂O → C₆H₁₂O₆ + 6 O₂, and here the light reactions have split <strong>' +
                T.water + '</strong> water molecules, not 6. Both are right. The Calvin cycle ' +
                'makes ' + T.co2 + ' water molecules of its own as it builds the sugar, so the ' +
                '<em>net</em> water used is ' + T.water + ' − ' + T.co2 + ' = <strong>' +
                T.netWater + '</strong>. The simple equation reports the net figure; the ' +
                'mechanism runs on the gross one.</p>';
            revealHost.appendChild(d);
        }

        resetBtn.addEventListener('click', () => { placed = {}; selected = null; clearCheck(); render(); });
        render();

        root._simState = () => ({
            placed: Object.assign({}, placed),
            checked,
            correct: TOKENS.filter(t => placed[t.id] === t.zone).length,
            total: TOKENS.length,
            answers: TOKENS.map(t => ({ id: t.id, zone: t.zone })),
            perGlucose: totals()
        });
        root._simSolve = () => {
            TOKENS.forEach(t => placed[t.id] = t.zone);
            checked = true; render();
            msg.textContent = 'Solved.'; msg.className = 'u2ph-msg ok';
            showReveal();
        };
    };
})();
