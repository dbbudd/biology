/* =============================================================
   INTERACTIVE — Energy and matter tracker
   -------------------------------------------------------------
   Registers window.SIMS['u2-energy-tracker'].  Supports HS-LS1-5,
   and the Crosscutting Concept "Energy and Matter" that Unit 2 is
   built on.

   This is the "Energy and Matter" graphic organizer from Anchor
   Guide 1 (CC BY-NC-SA 4.0, www.thewonderofscience.com, adapted
   from Amy & Jeremy Peacock) rebuilt as a live model, so the
   attribution is printed inside the sim and travels with it.

   The organizer asks five things:
     1  name the phenomenon        (chosen by the reader)
     2  list the components        (checkboxes)
     3  identify the INPUTS        — matter sorted by state, plus energy
     4  identify the OUTPUTS       — same
     5  state the transformation   — from what form of energy, to what

   The reader must commit to all of it and press Check before any
   explanation appears. Nothing is scored until then.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2et-style';

    // role: 'in' | 'out' | 'no'   kind: 'matter' | 'energy'
    // state: solid | liquid | gas | '-' (energy has no state)
    const PHENOMENA = [
        {
            id: 'egg',
            name: 'Frying an egg',
            blurb: 'A raw egg is cracked into a hot pan. Within a minute the clear ' +
                   'albumen has turned white and solid, and it will not turn back.',
            from: 'thermal', to: 'chemical',
            tokens: [
                { t: 'Raw egg white (liquid protein)', kind: 'matter', state: 'liquid', role: 'in' },
                { t: 'Heat from the hob', kind: 'energy', state: '-', role: 'in' },
                { t: 'Cooked egg white (solid protein)', kind: 'matter', state: 'solid', role: 'out' },
                { t: 'Water vapour steaming off', kind: 'matter', state: 'gas', role: 'out' },
                { t: 'Heat radiating into the kitchen', kind: 'energy', state: '-', role: 'out' },
                { t: 'Sunlight', kind: 'energy', state: '-', role: 'no' },
                { t: 'Carbon dioxide', kind: 'matter', state: 'gas', role: 'no' }
            ],
            explain: 'The heat does not make new atoms. Every atom in the cooked egg was ' +
                'in the raw egg. What changed is the <em>shape</em> of the protein molecules: ' +
                'thermal energy shook the long chains until the weak bonds holding them folded ' +
                'came apart, and they tangled into a solid mesh. That is denaturing, and it is ' +
                'why the change will not reverse — the new arrangement sits at lower energy ' +
                'than the old one.'
        },
        {
            id: 'photo',
            name: 'A leaf in sunlight',
            blurb: 'A green leaf sits in the sun. Over a day it gains mass, and bubbles of gas ' +
                   'collect on a pondweed shoot doing the same thing underwater.',
            from: 'light', to: 'chemical',
            tokens: [
                { t: 'Carbon dioxide from the air', kind: 'matter', state: 'gas', role: 'in' },
                { t: 'Water from the roots', kind: 'matter', state: 'liquid', role: 'in' },
                { t: 'Sunlight', kind: 'energy', state: '-', role: 'in' },
                { t: 'Glucose', kind: 'matter', state: 'solid', role: 'out' },
                { t: 'Oxygen', kind: 'matter', state: 'gas', role: 'out' },
                { t: 'Chemical energy stored in glucose bonds', kind: 'energy', state: '-', role: 'out' },
                { t: 'Nitrogen from the air', kind: 'matter', state: 'gas', role: 'no' },
                { t: 'ATP made in the mitochondrion', kind: 'energy', state: '-', role: 'no' }
            ],
            explain: 'This is the transformation the whole unit turns on. Light energy arrives, ' +
                'and leaves again as chemical energy held in the bonds of a sugar molecule. ' +
                'Notice that the matter is <em>rearranged</em>, not created: six carbon atoms ' +
                'that arrived as six separate CO<sub>2</sub> molecules leave joined together in ' +
                'one glucose. The gas bubbling off the pondweed is the leftover oxygen from the ' +
                'water molecules that were taken apart.'
        },
        {
            id: 'paper',
            name: 'A piece of paper on fire',
            blurb: 'A sheet of paper is lit. It burns down to a small pile of ash — far ' +
                   'lighter than the paper was.',
            from: 'chemical', to: 'thermal',
            tokens: [
                { t: 'Paper (cellulose)', kind: 'matter', state: 'solid', role: 'in' },
                { t: 'Oxygen from the air', kind: 'matter', state: 'gas', role: 'in' },
                { t: 'Chemical energy in the cellulose bonds', kind: 'energy', state: '-', role: 'in' },
                { t: 'Carbon dioxide', kind: 'matter', state: 'gas', role: 'out' },
                { t: 'Water vapour', kind: 'matter', state: 'gas', role: 'out' },
                { t: 'Ash', kind: 'matter', state: 'solid', role: 'out' },
                { t: 'Heat and light', kind: 'energy', state: '-', role: 'out' },
                { t: 'Glucose', kind: 'matter', state: 'solid', role: 'no' }
            ],
            explain: 'The ash weighs less than the paper, and students often conclude that ' +
                'matter was destroyed. It was not — most of it left as invisible gas. Weigh the ' +
                'whole sealed room and nothing has changed. What the fire did was break bonds in ' +
                'cellulose and oxygen and make stronger ones in CO<sub>2</sub> and water; the ' +
                'difference came out as heat and light. Hold onto this one: cellular respiration ' +
                'is the same reaction, run slowly and in stages.'
        },
        {
            id: 'phone',
            name: 'Charging a phone',
            blurb: 'A phone is plugged in overnight. In the morning the battery is full and ' +
                   'the charger is slightly warm.',
            from: 'electrical', to: 'chemical',
            tokens: [
                { t: 'Electricity from the mains', kind: 'energy', state: '-', role: 'in' },
                { t: 'Discharged lithium compounds in the battery', kind: 'matter', state: 'solid', role: 'in' },
                { t: 'Charged lithium compounds in the battery', kind: 'matter', state: 'solid', role: 'out' },
                { t: 'Chemical energy stored in the battery', kind: 'energy', state: '-', role: 'out' },
                { t: 'Waste heat from the charger', kind: 'energy', state: '-', role: 'out' },
                { t: 'Oxygen', kind: 'matter', state: 'gas', role: 'no' },
                { t: 'Sunlight', kind: 'energy', state: '-', role: 'no' }
            ],
            explain: 'Nothing goes into or out of a sealed battery — the atoms inside are simply ' +
                'pushed into a higher-energy arrangement, and they stay there until you ask for ' +
                'them back. That is exactly what ATP is for in a cell, and exactly what a ' +
                'glucose molecule is: a store you charge up now and spend later. Notice the ' +
                'warm charger. Every transfer leaks some energy as heat, every time.'
        },
        {
            id: 'coal',
            name: 'A power station burning coal',
            blurb: 'Coal is burned. Water boils, steam spins a turbine, and electricity goes ' +
                   'out along the wires. Cooling towers give off clouds of vapour.',
            from: 'chemical', to: 'electrical',
            tokens: [
                { t: 'Coal', kind: 'matter', state: 'solid', role: 'in' },
                { t: 'Oxygen from the air', kind: 'matter', state: 'gas', role: 'in' },
                { t: 'Water in the boiler', kind: 'matter', state: 'liquid', role: 'in' },
                { t: 'Chemical energy in the coal', kind: 'energy', state: '-', role: 'in' },
                { t: 'Carbon dioxide up the chimney', kind: 'matter', state: 'gas', role: 'out' },
                { t: 'Steam from the cooling towers', kind: 'matter', state: 'gas', role: 'out' },
                { t: 'Electricity', kind: 'energy', state: '-', role: 'out' },
                { t: 'Waste heat', kind: 'energy', state: '-', role: 'out' },
                { t: 'Glucose', kind: 'matter', state: 'solid', role: 'no' }
            ],
            explain: 'Follow the energy backwards and it is startling. The chemical energy in ' +
                'coal was put there by photosynthesis in a forest three hundred million years ' +
                'ago; the sunlight that fell on those trees is what is running your lights. ' +
                'Follow the carbon backwards and it is the same story — every CO<sub>2</sub> ' +
                'molecule leaving the chimney was pulled out of the Carboniferous atmosphere by ' +
                'a plant. Chapter 2.8 is about what happens when you put it all back at once.'
        }
    ];

    const ENERGY_FORMS = [
        ['light', 'light energy'], ['chemical', 'chemical energy'],
        ['thermal', 'thermal (heat) energy'], ['electrical', 'electrical energy'],
        ['kinetic', 'kinetic (motion) energy'], ['sound', 'sound energy']
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2et { padding:1rem 1.25rem 0.25rem; --ok:#2e7d32; --bad:#aa272f; }',
            '[data-theme="dark"] .u2et { --ok:#7fc98a; --bad:#e08a90; }',
            '[data-theme="sepia"] .u2et { --ok:#4a6b3d; --bad:#a04040; }',
            '.u2et-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.8rem;line-height:1.5}',
            '.u2et-step{font-size:0.62rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;',
            '  color:var(--text-secondary);margin:1rem 0 0.35rem}',
            '.u2et-phen{display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.5rem}',
            '.u2et-chip{font:inherit;font-size:0.78rem;padding:0.32rem 0.6rem;border-radius:999px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2et-chip:hover{border-color:var(--light-teal)}',
            '.u2et-chip[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2et-chip[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2et-blurb{font-size:0.86rem;line-height:1.55;margin:0.4rem 0 0;',
            '  padding:0.6rem 0.8rem;border-left:3px solid var(--light-teal);background:var(--bg-surface)}',
            '.u2et-cols{display:grid;grid-template-columns:1fr 1fr;gap:0.7rem;margin-top:0.4rem}',
            '@media (max-width:620px){.u2et-cols{grid-template-columns:1fr}}',
            '.u2et-zone{border:1.5px dashed var(--border);border-radius:10px;padding:0.5rem 0.6rem;min-height:70px}',
            '.u2et-zone.over{border-color:var(--light-teal);box-shadow:0 0 0 2px var(--light-teal)}',
            '.u2et-zone h6{margin:0 0 0.35rem;font-size:0.68rem;letter-spacing:0.07em;',
            '  text-transform:uppercase;color:var(--text-secondary)}',
            '.u2et-bank{border:1px solid var(--border);border-radius:10px;padding:0.5rem 0.6rem;',
            '  background:var(--bg-surface);min-height:52px}',
            '.u2et-tok{display:inline-flex;align-items:center;gap:0.3rem;font:inherit;font-size:0.75rem;',
            '  padding:0.26rem 0.5rem;margin:0.15rem;border-radius:7px;cursor:pointer;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);text-align:left}',
            '.u2et-tok:hover{border-color:var(--light-teal)}',
            '.u2et-tok[aria-pressed="true"]{box-shadow:0 0 0 2px var(--light-teal)}',
            '.u2et-tok .st{font-size:0.6rem;letter-spacing:0.05em;text-transform:uppercase;',
            '  color:var(--text-secondary);border:1px solid var(--border);border-radius:4px;padding:0 0.25rem}',
            '.u2et-tok.k-energy{border-left:4px solid var(--yellow)}',
            '.u2et-tok.k-matter{border-left:4px solid var(--light-teal)}',
            '.u2et-tok.good{border-color:var(--ok);box-shadow:inset 0 0 0 1px var(--ok)}',
            '.u2et-tok.bad{border-color:var(--bad);box-shadow:inset 0 0 0 1px var(--bad)}',
            '.u2et-tr{display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;font-size:0.82rem;margin-top:0.3rem}',
            '.u2et-tr select{font:inherit;font-size:0.8rem;padding:0.2rem 0.35rem;border-radius:6px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text)}',
            '.u2et-msg{margin:0.9rem 0 0;font-size:0.82rem;line-height:1.55;min-height:1.4em}',
            '.u2et-msg.ok{color:var(--ok)} .u2et-msg.bad{color:var(--bad)}',
            '.u2et-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2et-rev{background:rgba(127,201,138,0.12)}',
            '.u2et-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2et-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}',
            '.u2et-attr{font-size:0.66rem;color:var(--text-secondary);margin:1rem 0 0;line-height:1.5}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u2-energy-tracker'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u2et');
        const how = U.el('p', 'u2et-how');
        how.innerHTML = 'Pick a phenomenon, then build a model of it. Sort every card into ' +
            '<strong>inputs</strong> or <strong>outputs</strong> — leave out anything that is not ' +
            'involved at all — and then say what the energy was transformed <em>from</em> and ' +
            '<em>into</em>. Nothing is marked until you press Check.';
        wrap.appendChild(how);

        const phenRow = U.el('div', 'u2et-phen');
        wrap.appendChild(phenRow);
        const blurb = U.el('p', 'u2et-blurb');
        wrap.appendChild(blurb);

        const bankLab = U.el('p', 'u2et-step'); bankLab.textContent = 'Components — click one, then click a box';
        const bank = U.el('div', 'u2et-bank');
        const zonesLab = U.el('p', 'u2et-step'); zonesLab.textContent = 'Steps 3 and 4 — inputs and outputs';
        const cols = U.el('div', 'u2et-cols');
        const zIn = U.el('div', 'u2et-zone'); zIn.innerHTML = '<h6>Inputs — what goes in</h6>';
        const zOut = U.el('div', 'u2et-zone'); zOut.innerHTML = '<h6>Outputs — what comes out</h6>';
        cols.appendChild(zIn); cols.appendChild(zOut);
        const trLab = U.el('p', 'u2et-step'); trLab.textContent = 'Step 5 — the energy transformation';
        const tr = U.el('div', 'u2et-tr');
        [bankLab, bank, zonesLab, cols, trLab, tr].forEach(e => wrap.appendChild(e));

        const msg = U.el('p', 'u2et-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        wrap.appendChild(msg); wrap.appendChild(revealHost);

        const attr = U.el('p', 'u2et-attr');
        attr.innerHTML = 'Structure adapted from the <em>Energy and Matter</em> graphic organizer, ' +
            'CC BY-NC-SA 4.0 &middot; www.thewonderofscience.com &middot; adapted from Amy &amp; Jeremy Peacock.';
        wrap.appendChild(attr);
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const checkBtn = U.button(buttons, 'Check my model', 'primary');
        const resetBtn = U.button(buttons, 'Clear');
        wrap.appendChild(buttons);

        let P = PHENOMENA[0];
        let placed = {};          // token index -> 'in' | 'out'
        let selected = null;      // token index
        let checked = false;
        let fromSel, toSel;

        function fresh(p) {
            P = p; placed = {}; selected = null; checked = false;
            msg.textContent = ''; msg.className = 'u2et-msg';
            revealHost.innerHTML = '';
            render();
        }

        function tokEl(i, where) {
            const tk = P.tokens[i];
            const b = U.el('button', 'u2et-tok k-' + tk.kind);
            b.type = 'button';
            b.innerHTML = (tk.state !== '-' ? '<span class="st">' + tk.state + '</span>' : '<span class="st">energy</span>') +
                '<span>' + tk.t + '</span>';
            b.setAttribute('aria-pressed', selected === i ? 'true' : 'false');
            b.draggable = true;
            b.addEventListener('dragstart', e => { selected = i; e.dataTransfer.setData('text/plain', String(i)); });
            b.addEventListener('click', () => {
                if (where) { delete placed[i]; selected = null; }
                else selected = (selected === i ? null : i);
                checked = false; revealHost.innerHTML = '';
                msg.textContent = ''; msg.className = 'u2et-msg';
                render();
            });
            if (checked) {
                const right = (where && tk.role === where) || (!where && tk.role === 'no');
                b.classList.add(right ? 'good' : 'bad');
            }
            b.setAttribute('aria-label', tk.t + (where ? ', in ' + (where === 'in' ? 'inputs' : 'outputs') +
                '. Activate to send back.' : '. Activate to select, then choose a box.'));
            return b;
        }

        function fillZone(zone, where) {
            [...zone.querySelectorAll('.u2et-tok')].forEach(e => e.remove());
            P.tokens.forEach((t, i) => { if (placed[i] === where) zone.appendChild(tokEl(i, where)); });
        }

        function wireDrop(zone, where) {
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('over'));
            zone.addEventListener('drop', e => {
                e.preventDefault(); zone.classList.remove('over');
                const i = +e.dataTransfer.getData('text/plain');
                if (!isNaN(i)) { placed[i] = where; selected = null; checked = false;
                    revealHost.innerHTML = ''; msg.textContent = ''; render(); }
            });
            zone.addEventListener('click', e => {
                if (e.target.closest('.u2et-tok')) return;
                if (selected !== null) { placed[selected] = where; selected = null; checked = false;
                    revealHost.innerHTML = ''; msg.textContent = ''; render(); }
            });
        }
        wireDrop(zIn, 'in'); wireDrop(zOut, 'out');

        function render() {
            phenRow.innerHTML = '';
            PHENOMENA.forEach(p => {
                const c = U.el('button', 'u2et-chip');
                c.type = 'button'; c.textContent = p.name;
                c.setAttribute('aria-pressed', p.id === P.id ? 'true' : 'false');
                c.addEventListener('click', () => fresh(p));
                phenRow.appendChild(c);
            });
            blurb.textContent = P.blurb;

            bank.innerHTML = '';
            let any = false;
            P.tokens.forEach((t, i) => { if (!placed[i]) { bank.appendChild(tokEl(i, null)); any = true; } });
            if (!any) {
                const done = U.el('span', 'u2et-tok');
                done.style.opacity = '0.6'; done.textContent = 'All cards placed.';
                bank.appendChild(done);
            }
            fillZone(zIn, 'in'); fillZone(zOut, 'out');

            if (!fromSel) {
                tr.innerHTML = '';
                const s1 = U.el('span'); s1.textContent = 'This phenomenon transforms';
                tr.appendChild(s1);
                fromSel = U.select(tr, '', [['', 'choose…']].concat(ENERGY_FORMS), '');
                fromSel.el.parentElement.style.margin = '0';
                const s2 = U.el('span'); s2.textContent = 'into';
                tr.appendChild(s2);
                toSel = U.select(tr, '', [['', 'choose…']].concat(ENERGY_FORMS), '');
                toSel.el.parentElement.style.margin = '0';
                [fromSel, toSel].forEach(s => s.el.addEventListener('change', () => {
                    checked = false; revealHost.innerHTML = '';
                    msg.textContent = ''; msg.className = 'u2et-msg';
                }));
            }
        }

        function score() {
            let right = 0, wrong = 0, missing = 0;
            P.tokens.forEach((t, i) => {
                const put = placed[i] || 'no';
                if (put === t.role) right++;
                else if (t.role === 'no' || put === 'no') { if (put === 'no') missing++; else wrong++; }
                else wrong++;
            });
            return { right, wrong, missing, total: P.tokens.length };
        }

        checkBtn.addEventListener('click', () => {
            checked = true;
            const s = score();
            const fOK = fromSel.value === P.from, tOK = toSel.value === P.to;
            render();
            const bits = [];
            bits.push(s.right + ' of ' + s.total + ' cards in the right place.');
            if (s.wrong) bits.push(s.wrong + ' in the wrong box.');
            if (s.missing) bits.push(s.missing + ' still unplaced — remember that some cards belong nowhere.');
            if (!fromSel.value || !toSel.value) bits.push('You have not finished the transformation sentence yet.');
            else if (!fOK || !tOK) bits.push('The transformation is not right yet.');
            const perfect = s.right === s.total && fOK && tOK;
            msg.innerHTML = bits.join(' ');
            msg.className = 'u2et-msg ' + (perfect ? 'ok' : 'bad');
            if (perfect) showReveal();
        });

        function showReveal() {
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2et-rev');
            const fromT = (ENERGY_FORMS.find(e => e[0] === P.from) || ['', P.from])[1];
            const toT = (ENERGY_FORMS.find(e => e[0] === P.to) || ['', P.to])[1];
            const ins = P.tokens.filter(t => t.role === 'in').map(t => t.t);
            const outs = P.tokens.filter(t => t.role === 'out').map(t => t.t);
            d.innerHTML = '<h5>' + P.name + ' — modelled</h5>' +
                '<p><strong>In:</strong> ' + ins.join('; ') + '.<br>' +
                '<strong>Out:</strong> ' + outs.join('; ') + '.<br>' +
                '<strong>Transformation:</strong> ' + fromT + ' &rarr; ' + toT + '.</p>' +
                '<p>' + P.explain + '</p>' +
                '<p>Now count the atoms rather than the cards. Every atom on the input side is ' +
                'still there on the output side — matter is conserved, always, with no exceptions. ' +
                'Energy is conserved too, but it does not stay in a useful form: some of it always ' +
                'leaves as heat. That asymmetry is the reason matter <em>cycles</em> and energy ' +
                '<em>flows</em>, which is the title of this whole unit.</p>';
            revealHost.appendChild(d);
        }

        resetBtn.addEventListener('click', () => fresh(P));
        fresh(PHENOMENA[0]);

        root._simState = () => ({
            phenomenon: P.id, placed: Object.assign({}, placed),
            from: fromSel ? fromSel.value : '', to: toSel ? toSel.value : '',
            checked, score: score(),
            expected: {
                inputs: P.tokens.filter(t => t.role === 'in').map(t => t.t),
                outputs: P.tokens.filter(t => t.role === 'out').map(t => t.t),
                notInvolved: P.tokens.filter(t => t.role === 'no').map(t => t.t),
                from: P.from, to: P.to
            }
        });
        root._simSolve = () => {
            placed = {};
            P.tokens.forEach((t, i) => { if (t.role !== 'no') placed[i] = t.role; });
            fromSel.el.value = P.from; toSel.el.value = P.to;
            checked = true; render();
            msg.textContent = 'Solved.'; msg.className = 'u2et-msg ok';
            showReveal();
        };
    };
})();
