/* =============================================================
   INTERACTIVE — Model it: matter, energy, and what changes
   -------------------------------------------------------------
   Registers window.SIMS['u2-model-arrows'].  Supports HS-LS1-5
   and the modelling task in Anchor Guide 1.

   The guide's task is "draw two chloroplasts, low light and high,
   and show how matter and energy differ". Drawing it is the easy
   half. The assessed half is the three judgements underneath it,
   so this sim asks for those judgements one at a time:

     NAME   — which arrow is which, on a diagram where every arrow
              is drawn identically. The molecules are ball-and-stick
              in the same colours as Figures 2.10 and 2.12, so the
              reader identifies them from the chemistry, and the two
              carrier arrows are told apart by DIRECTION.
     SORT   — matter or energy. This is the distinction the standard
              names, and the one most student models leave out.
     PREDICT— turn the light up: which arrows speed up? Every one
              does, and the CO2 arrow is the one people get wrong,
              because only the light was changed.

   Marker centres are measured from the artwork
   (images/u2/chloroplast-arrows.jpeg) by fitting a ring to each
   circle — all 72 sample points landed on every ring. If the
   artwork is regenerated, re-measure; do not estimate. Numbering is
   deliberately scrambled so it cannot be answered by reading round
   the diagram.

   Names are never written on the artwork; they fill a numbered key
   underneath, so nothing can collide with the drawing.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2ma-style';

    const W = 2752, H = 1536, R = 74;          // marker radius drawn a little over the ring

    const ARROWS = [
        { n: 1, id: 'o2', x: 906, y: 1108, name: 'Oxygen out', kind: 'matter',
          fn: 'Oxygen leaving the thylakoids, on its way out of the leaf.',
          why: 'Matter. It is the leftover from splitting water — atoms, leaving the chloroplast.' },
        { n: 2, id: 'spent', x: 1374, y: 1036, name: 'ADP + NADP⁺ back', kind: 'energy',
          fn: 'The empty carriers returning to the thylakoids to be recharged.',
          why: 'Energy. The same molecules shuttle back and forth; what changes is how much energy ' +
               'they carry. Nothing is entering or leaving the chloroplast here.' },
        { n: 3, id: 'glucose', x: 2400, y: 827, name: 'Glucose out', kind: 'matter',
          fn: 'Sugar leaving the Calvin cycle.',
          why: 'Matter. The carbon that was CO₂ is now locked into a ring.' },
        { n: 4, id: 'light', x: 626, y: 232, name: 'Light in', kind: 'energy',
          fn: 'Sunlight arriving at the thylakoids.',
          why: 'Energy. Light has no mass and no atoms — it is the one input that is not matter.' },
        { n: 5, id: 'carriers', x: 1376, y: 502, name: 'ATP + NADPH across', kind: 'energy',
          fn: 'Charged carriers taking energy from the thylakoids to the Calvin cycle.',
          why: 'Energy. This is the traffic that connects the two halves, and it never leaves the ' +
               'chloroplast.' },
        { n: 6, id: 'water', x: 656, y: 930, name: 'Water in', kind: 'matter',
          fn: 'Water arriving at the thylakoids, where it is split.',
          why: 'Matter. Its atoms end up in the oxygen you breathe and on the carriers.' },
        { n: 7, id: 'co2', x: 2400, y: 475, name: 'Carbon dioxide in', kind: 'matter',
          fn: 'Carbon dioxide arriving at the Calvin cycle.',
          why: 'Matter. Every carbon atom in the sugar came in through this arrow.' }
    ];
    const byN = n => ARROWS.filter(p => p.n === n)[0];
    const byId = id => ARROWS.filter(p => p.id === id)[0];

    const DESC = 'One chloroplast, with a stack of green discs on the left and a ring of curved ' +
        'arrows on the right. Seven identical arrows connect them to a sun, a water molecule, an ' +
        'oxygen molecule, a carbon dioxide molecule and a glucose molecule, all drawn as balls and ' +
        'sticks. Each arrow carries a numbered marker, 1 to 7, not in order.';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2ma{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2ma{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2ma{--ok:#4a6b3d;--bad:#a04040}',
            '.u2ma-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2ma-phase{font-size:0.62rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;',
            '  color:var(--text-secondary);margin:0 0 0.5rem}',
            '.u2ma-stage{border:1px solid var(--border);border-radius:11px;background:#fdf6ee;',
            '  padding:0.4rem;overflow-x:auto}',
            '.u2ma-svg{width:100%;min-width:540px;height:auto;display:block}',
            /* the artwork is a light image in every theme, so markers are pinned to its colours.
               Sizes are in the image's 2752-wide space; the stage draws it at about 0.28 of that. */
            '.u2ma-mk{cursor:pointer}',
            '.u2ma-mk circle{fill:#fff;stroke:#3b2330;stroke-width:9}',
            '.u2ma-mk text{fill:#2b1a22;font-size:86px;font-weight:800;text-anchor:middle;pointer-events:none}',
            '.u2ma-mk:hover circle{stroke:#577899;stroke-width:14}',
            '.u2ma-mk:focus{outline:none} .u2ma-mk:focus circle{stroke:#577899;stroke-width:16}',
            '.u2ma-mk.done{cursor:default} .u2ma-mk.done circle{fill:#2e7d32;stroke:#1f5a22}',
            '.u2ma-mk.done text{fill:#fff}',
            '.u2ma-key{display:grid;grid-template-columns:repeat(auto-fill,minmax(12.5rem,1fr));',
            '  gap:0.3rem 0.9rem;margin:0.7rem 0 0;padding:0;list-style:none;font-size:0.8rem}',
            '.u2ma-key li{display:flex;gap:0.45rem;align-items:baseline;color:var(--text-secondary)}',
            '.u2ma-key b{display:inline-block;min-width:1.35rem;height:1.35rem;line-height:1.35rem;',
            '  text-align:center;border-radius:50%;border:1.5px solid var(--border);font-size:0.72rem;',
            '  color:var(--text)}',
            '.u2ma-key li.done{color:var(--text);font-weight:600}',
            '.u2ma-key li.done b{background:var(--ok);border-color:var(--ok);color:#fff}',
            '.u2ma-bank{display:flex;gap:0.4rem;flex-wrap:wrap;margin:0.8rem 0 0.2rem}',
            '.u2ma-chip{font:inherit;font-size:0.78rem;padding:0.3rem 0.6rem;border-radius:7px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2ma-chip:hover{border-color:var(--light-teal)}',
            '.u2ma-chip[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2ma-chip[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2ma-rows{margin:0.6rem 0 0;display:grid;gap:0.35rem}',
            '.u2ma-row{display:grid;grid-template-columns:1.6rem 1fr auto;gap:0.6rem;align-items:center;',
            '  font-size:0.84rem}',
            '.u2ma-row b{font-size:0.72rem;text-align:center;border-radius:50%;border:1.5px solid var(--border);',
            '  height:1.35rem;line-height:1.35rem;color:var(--text)}',
            '.u2ma-pick{display:flex;gap:0.3rem}',
            '.u2ma-opt{font:inherit;font-size:0.76rem;padding:0.24rem 0.6rem;border-radius:7px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2ma-opt[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2ma-opt[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2ma-opt.ok{border-color:var(--ok);color:var(--ok)}',
            '.u2ma-opt.ok[aria-pressed="true"]{background:var(--ok);border-color:var(--ok);color:#fff}',
            '.u2ma-opt.bad[aria-pressed="true"]{background:var(--bad);border-color:var(--bad);color:#fff}',
            '.u2ma-msg{margin:0.85rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2ma-msg.ok{color:var(--ok)} .u2ma-msg.bad{color:var(--bad)}',
            '.u2ma-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2ma-rev{background:rgba(127,201,138,0.12)}',
            '.u2ma-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2ma-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u2-model-arrows'] = function (root) {
        injectStyle();
        const ns = 'http://www.w3.org/2000/svg';
        const wrap = U.el('div', 'u2ma');
        const how = U.el('p', 'u2ma-how');
        const phaseL = U.el('p', 'u2ma-phase');
        const holder = U.el('div');
        const bank = U.el('div', 'u2ma-bank');
        const rowHost = U.el('div');
        const msg = U.el('p', 'u2ma-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, phaseL, holder, bank, rowHost, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const btns = U.el('div', 'sim-buttons');
        const nextBtn = U.button(btns, 'Next: matter or energy?', 'primary');
        const checkBtn = U.button(btns, 'Check', 'primary');
        const resetBtn = U.button(btns, 'Start again');
        wrap.appendChild(btns);

        let mode = 'name';       // name -> sort -> predict
        let done = {};           // id -> true (named)
        let selected = null;     // index into ARROWS, for the name bank
        let sort = {};           // id -> 'matter' | 'energy'
        let pred = {};           // id -> 'up' | 'same'
        let checked = false;
        let svg, key, marks = {};

        function build() {
            holder.innerHTML = '';
            const stage = U.el('div', 'u2ma-stage');
            svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
            svg.setAttribute('class', 'u2ma-svg');
            svg.setAttribute('role', 'group');
            svg.setAttribute('aria-label', DESC);
            const img = document.createElementNS(ns, 'image');
            img.setAttribute('href', (document.body.dataset.root || '../') + 'images/u2/chloroplast-arrows.jpeg');
            img.setAttribute('x', 0); img.setAttribute('y', 0);
            img.setAttribute('width', W); img.setAttribute('height', H);
            svg.appendChild(img);
            marks = {};
            ARROWS.forEach(p => {
                const g = document.createElementNS(ns, 'g');
                g.setAttribute('class', 'u2ma-mk');
                g.setAttribute('tabindex', '0');
                g.setAttribute('role', 'button');
                g.innerHTML = '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + R + '"/>' +
                    '<text x="' + p.x + '" y="' + (p.y + 31) + '">' + p.n + '</text>';
                const go = () => place(p.id);
                g.addEventListener('click', go);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
                });
                svg.appendChild(g);
                marks[p.id] = g;
            });
            stage.appendChild(svg);
            holder.appendChild(stage);
            key = U.el('ol', 'u2ma-key');
            holder.appendChild(key);
        }

        function place(id) {
            if (mode !== 'name' || done[id]) return;
            if (selected === null) {
                msg.textContent = 'Pick a name from the list below first, then click its numbered marker.';
                msg.className = 'u2ma-msg';
                return;
            }
            const pick = ARROWS[selected];
            if (pick.id === id) {
                done[id] = true; selected = null;
                msg.textContent = pick.name + ' — ' + pick.fn;
                msg.className = 'u2ma-msg ok';
            } else {
                const truth = byId(id);
                msg.textContent = 'Not quite — marker ' + truth.n + ' is ' + truth.name.toLowerCase() +
                    '. ' + hintFor(pick.id);
                msg.className = 'u2ma-msg bad';
                selected = null;
            }
            render();
        }

        function hintFor(id) {
            switch (id) {
                case 'light': return 'Light comes from the sun, and it is the only arrow with no molecule at its tail.';
                case 'water': return 'Water is the red ball with two white ones, and it feeds the discs.';
                case 'co2': return 'Carbon dioxide is the black ball between two red ones, and it feeds the ring.';
                case 'o2': return 'Oxygen is the two red balls joined together, and it leaves the discs.';
                case 'glucose': return 'Glucose is the big ring of six, and it leaves the Calvin cycle.';
                case 'carriers': return 'The charged carriers run FROM the discs TO the ring — check the arrowhead.';
                case 'spent': return 'The spent carriers run FROM the ring BACK to the discs — check the arrowhead.';
                default: return '';
            }
        }

        function rows(host, store, opts, showMark) {
            const g = U.el('div', 'u2ma-rows');
            ARROWS.slice().sort((a, b) => a.n - b.n).forEach(p => {
                const row = U.el('div', 'u2ma-row');
                const b = U.el('b'); b.textContent = p.n; row.appendChild(b);
                const t = U.el('div'); t.textContent = p.name; row.appendChild(t);
                const pick = U.el('div', 'u2ma-pick');
                opts.forEach(o => {
                    const btn = U.el('button', 'u2ma-opt');
                    btn.type = 'button'; btn.textContent = o.label;
                    btn.setAttribute('aria-pressed', store[p.id] === o.v ? 'true' : 'false');
                    btn.setAttribute('aria-label', o.label + ' for ' + p.name);
                    if (showMark && store[p.id] === o.v) btn.classList.add(o.v === showMark(p) ? 'ok' : 'bad');
                    if (showMark && o.v === showMark(p)) btn.classList.add('ok');
                    btn.addEventListener('click', () => {
                        if (checked) return;
                        store[p.id] = o.v; msg.textContent = ''; msg.className = 'u2ma-msg';
                        render();
                    });
                    pick.appendChild(btn);
                });
                row.appendChild(pick);
                g.appendChild(row);
            });
            host.appendChild(g);
        }

        function render() {
            how.innerHTML = mode === 'name'
                ? 'Every arrow is drawn the same on purpose — nothing about the picture tells you ' +
                  'which is which. Work each one out from what is at its tail, and which way it points.'
                : mode === 'sort'
                ? 'Now the judgement the standard actually asks for. For each arrow: is it carrying ' +
                  '<b>matter</b> — atoms that could be weighed — or <b>energy</b>?'
                : 'Last one. The light intensity is turned up, and nothing else is changed. For each ' +
                  'arrow, decide whether it speeds up or stays the same.';
            phaseL.textContent = mode === 'name'
                ? 'Step 1 of 3 — name the seven arrows'
                : mode === 'sort' ? 'Step 2 of 3 — matter or energy?'
                : 'Step 3 of 3 — turn the light up';

            ARROWS.forEach(p => {
                const g = marks[p.id];
                g.classList.toggle('done', !!done[p.id]);
                g.setAttribute('aria-label', 'Marker ' + p.n + (done[p.id] ? ': ' + p.name : ''));
                if (done[p.id] || mode !== 'name') g.removeAttribute('tabindex');
                else g.setAttribute('tabindex', '0');
            });
            key.innerHTML = '';
            ARROWS.slice().sort((a, b) => a.n - b.n).forEach(p => {
                const li = U.el('li', done[p.id] ? 'done' : '');
                li.innerHTML = '<b>' + p.n + '</b><span>' + (done[p.id] ? p.name : '?') + '</span>';
                key.appendChild(li);
            });

            bank.innerHTML = '';
            if (mode === 'name') {
                ARROWS.forEach((p, i) => {
                    if (done[p.id]) return;
                    const c = U.el('button', 'u2ma-chip');
                    c.type = 'button'; c.textContent = p.name;
                    c.setAttribute('aria-pressed', selected === i ? 'true' : 'false');
                    c.addEventListener('click', () => { selected = selected === i ? null : i; render(); });
                    bank.appendChild(c);
                });
            }

            rowHost.innerHTML = '';
            if (mode === 'sort') rows(rowHost, sort,
                [{ v: 'matter', label: 'matter' }, { v: 'energy', label: 'energy' }],
                checked ? (p => p.kind) : null);
            if (mode === 'predict') rows(rowHost, pred,
                [{ v: 'up', label: 'speeds up' }, { v: 'same', label: 'no change' }],
                checked ? (() => 'up') : null);

            const named = ARROWS.every(p => done[p.id]);
            nextBtn.hidden = !(mode === 'name' && named);
            nextBtn.textContent = 'Next: matter or energy?';
            checkBtn.hidden = mode === 'name';
            checkBtn.textContent = checked && mode === 'sort' ? 'Next: turn the light up' : 'Check';
        }

        function check() {
            if (mode === 'sort' && checked) {           // acting as "next"
                mode = 'predict'; checked = false;
                msg.textContent = ''; msg.className = 'u2ma-msg'; render(); return;
            }
            const store = mode === 'sort' ? sort : pred;
            const answer = mode === 'sort' ? (p => p.kind) : (() => 'up');
            const missing = ARROWS.filter(p => !store[p.id]).length;
            if (missing) {
                msg.textContent = 'Answer all seven first — ' + missing + ' still blank.';
                msg.className = 'u2ma-msg'; return;
            }
            const right = ARROWS.filter(p => store[p.id] === answer(p)).length;
            checked = true;
            if (right === ARROWS.length) {
                msg.textContent = mode === 'sort'
                    ? 'All seven. Three arrows carry energy — light in, and the carriers going each way — and four carry matter.'
                    : 'All seven. Every arrow speeds up.';
                msg.className = 'u2ma-msg ok';
                if (mode === 'predict') showReveal();
            } else {
                msg.textContent = right + ' of 7. The ones marked in green are the right answers — ' +
                    'compare them with what you chose, then read why below.';
                msg.className = 'u2ma-msg bad';
                if (mode === 'predict') showReveal();
            }
            render();
        }

        function showReveal() {
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2ma-rev');
            d.innerHTML = '<h5>Only the light changed — so why did the CO₂ arrow change?</h5>' +
                '<p>This is the one most people get wrong. The reasoning that fails is: “I only ' +
                'turned up the light, so only the light arrow changes.” But the arrows are not ' +
                'independent. More light means more ATP and NADPH; a Calvin cycle with more ATP and ' +
                'NADPH fixes carbon faster; and fixing carbon faster means <b>pulling CO₂ in faster</b>. ' +
                'The CO₂ arrow is downstream of the light arrow, even though CO₂ has nothing to do ' +
                'with light directly.</p>' +
                '<p>The same argument runs through the whole diagram, which is why all seven speed up. ' +
                'Water is split faster, so oxygen leaves faster. Sugar is built faster, so glucose ' +
                'leaves faster. The carriers shuttle faster in <em>both</em> directions — and notice ' +
                'that the returning carriers are not a waste arrow, they are the same molecules going ' +
                'back to be recharged.</p>' +
                '<p><b>One caveat worth holding onto.</b> This cannot go on for ever. Keep raising the ' +
                'light and eventually something else runs out — CO₂ supply, or temperature — and the ' +
                'rate levels off. That is the next thing this chapter takes apart.</p>';
            revealHost.appendChild(d);
        }

        nextBtn.addEventListener('click', () => {
            mode = 'sort'; checked = false; msg.textContent = ''; msg.className = 'u2ma-msg'; render();
        });
        checkBtn.addEventListener('click', check);
        resetBtn.addEventListener('click', () => {
            mode = 'name'; done = {}; selected = null; sort = {}; pred = {}; checked = false;
            msg.textContent = ''; msg.className = 'u2ma-msg'; revealHost.innerHTML = '';
            build(); render();
        });

        build(); render();

        root._simState = () => ({
            mode, checked,
            named: ARROWS.filter(p => done[p.id]).map(p => p.id),
            allNamed: ARROWS.every(p => done[p.id]),
            sortCorrect: ARROWS.filter(p => sort[p.id] === p.kind).length,
            predictCorrect: ARROWS.filter(p => pred[p.id] === 'up').length,
            arrows: ARROWS.map(p => ({ n: p.n, id: p.id, name: p.name, kind: p.kind }))
        });
        root._simSolve = () => {
            if (mode === 'name') { ARROWS.forEach(p => { done[p.id] = true; }); selected = null; render(); }
            else if (mode === 'sort') { ARROWS.forEach(p => { sort[p.id] = p.kind; }); checked = false; render(); check(); }
            else { ARROWS.forEach(p => { pred[p.id] = 'up'; }); checked = false; render(); check(); }
        };
    };
})();
