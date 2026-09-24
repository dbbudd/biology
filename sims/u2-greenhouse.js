/* =============================================================
   INTERACTIVE — The greenhouse effect: what actually changed
   -------------------------------------------------------------
   Registers window.SIMS['u2-greenhouse'].  Supports HS-LS2-5.

   Two panels drawn from identical geometry — same sun, same beam,
   same Earth — so the only differences are the thickness of the gas
   layer and the widths of the escaping and returning arrows. That
   was verified by measuring the artwork, not by eye:

       atmosphere band   79 px  ->  167 px   (2.1x thicker)
       escaping arrow    95 px  ->   46 px   (narrower)
       returning arrow   41 px  ->   94 px   (wider)
       surface arrow     68 px  ->   69 px   (unchanged)
       sun, Earth dome           unchanged

   That matters for step 2: the reader is asked what changed, so
   nothing may drift that is not part of the answer.

   PHASE 1 "name"    — name the eight numbered markers.
   PHASE 2 "compare" — for each quantity, is it more, less or
     unchanged on the right? The numbering pairs across the panels
     (2 with 8, 7 with 1, 3 with 6) and the sunlight marker 5 is the
     one that has NOT changed, which is the whole point: nothing
     about the sun is different, yet the surface warms.

   Marker centres measured by fitting a ring to each circle in the
   2752 x 1536 original; all 72 sample points landed on every ring.
   Re-measure if the artwork is regenerated; do not estimate.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2gh-style';

    const IMG_W = 2752, IMG_H = 1536, MARK_R = 72;

    const MARKS = [
        { n: 5, id: 'sun-l',  x: 218,  y: 624,  side: 'left',
          name: 'Sunlight arriving', where: 'left panel' },
        { n: 2, id: 'gas-l',  x: 704,  y: 512,  side: 'left',
          name: 'Greenhouse gas layer', where: 'left panel' },
        { n: 7, id: 'out-l',  x: 1202, y: 564,  side: 'left',
          name: 'Heat escaping to space', where: 'left panel' },
        { n: 3, id: 'back-l', x: 1170, y: 954,  side: 'left',
          name: 'Heat returning to the surface', where: 'left panel' },
        { n: 8, id: 'gas-r',  x: 2046, y: 464,  side: 'right',
          name: 'Greenhouse gas layer', where: 'right panel' },
        { n: 1, id: 'out-r',  x: 2534, y: 524,  side: 'right',
          name: 'Heat escaping to space', where: 'right panel' },
        { n: 6, id: 'back-r', x: 2550, y: 976,  side: 'right',
          name: 'Heat returning to the surface', where: 'right panel' },
        { n: 4, id: 'earth',  x: 2232, y: 1312, side: 'right',
          name: "The Earth's surface", where: 'right panel' }
    ];
    const byId = id => MARKS.filter(m => m.id === id)[0];

    /* Step 2. Each row pairs a left marker with its right counterpart, except the
       sunlight row, which is the control — nothing about the sun changed. */
    const PAIRS = [
        { k: 'gas',  left: 2, right: 8, label: 'the greenhouse gas layer', answer: 'more',
          why: 'Thicker. This is the one thing that was actually changed — two centuries of ' +
               'extra CO₂, methane and nitrous oxide. Everything else on the right-hand panel ' +
               'follows from it.' },
        { k: 'out',  left: 7, right: 1, label: 'heat escaping to space', answer: 'less',
          why: 'Less. A thicker layer absorbs more of the outgoing infrared, so a smaller share ' +
               'of it makes it out to space.' },
        { k: 'back', left: 3, right: 6, label: 'heat returning to the surface', answer: 'more',
          why: 'More. The absorbed infrared is re-radiated in all directions, and some of it ' +
               'goes back down. That returning heat is what warms the surface.' },
        { k: 'sun',  left: 5, right: null, label: 'sunlight arriving from the sun', answer: 'same',
          why: 'Unchanged — and this is the point of the whole figure. The sun is doing exactly ' +
               'what it was doing before. The surface gets warmer without any more energy ' +
               'arriving, because less of it is leaving.' }
    ];

    const DESC = 'Two panels side by side showing the greenhouse effect, drawn from identical ' +
        'geometry. In each, a sun sends a beam down to the curved green surface of the Earth, a ' +
        'red arrow rises from the surface, and it splits into one arrow escaping to space and one ' +
        'returning to the surface. A blue band is the layer of greenhouse gases: thin on the left, ' +
        'about twice as thick on the right. On the left the escaping arrow is wide and the ' +
        'returning arrow narrow; on the right that is reversed. Eight numbered markers point to ' +
        'these features, not in order.';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2gh{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2gh{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2gh{--ok:#4a6b3d;--bad:#a04040}',
            '.u2gh-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2gh-phase{font-size:0.62rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;',
            '  color:var(--text-secondary);margin:0 0 0.5rem}',
            '.u2gh-stage{border:1px solid var(--border);border-radius:11px;background:#fdf6ee;',
            '  padding:0.4rem;overflow-x:auto}',
            '.u2gh-svg{width:100%;min-width:560px;height:auto;display:block}',
            /* artwork is a light image in every theme, so markers are pinned to its colours */
            '.u2gh-mk{cursor:pointer}',
            '.u2gh-mk circle{fill:#fff;stroke:#3b2330;stroke-width:9}',
            '.u2gh-mk text{fill:#2b1a22;font-size:84px;font-weight:800;text-anchor:middle;pointer-events:none}',
            '.u2gh-mk:hover circle{stroke:#577899;stroke-width:14}',
            '.u2gh-mk:focus{outline:none} .u2gh-mk:focus circle{stroke:#577899;stroke-width:16}',
            '.u2gh-mk.done circle{fill:#2e7d32;stroke:#1f5a22}',
            '.u2gh-mk.done text{fill:#fff}',
            '.u2gh-key{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));',
            '  gap:0.3rem 0.9rem;margin:0.7rem 0 0;padding:0;list-style:none;font-size:0.8rem}',
            '.u2gh-key li{display:flex;gap:0.45rem;align-items:baseline;color:var(--text-secondary)}',
            '.u2gh-key b{display:inline-block;min-width:1.35rem;height:1.35rem;line-height:1.35rem;',
            '  text-align:center;border-radius:50%;border:1.5px solid var(--border);font-size:0.72rem;',
            '  color:var(--text)}',
            '.u2gh-key li.done{color:var(--text);font-weight:600}',
            '.u2gh-key li.done b{background:var(--ok);border-color:var(--ok);color:#fff}',
            '.u2gh-bank{display:flex;gap:0.4rem;flex-wrap:wrap;margin:0.8rem 0 0.2rem}',
            '.u2gh-chip{font:inherit;font-size:0.78rem;padding:0.3rem 0.6rem;border-radius:7px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2gh-chip:hover{border-color:var(--light-teal)}',
            '.u2gh-chip[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2gh-chip[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2gh-rows{margin:0.6rem 0 0;display:grid;gap:0.4rem}',
            '.u2gh-row{display:grid;grid-template-columns:auto 1fr auto;gap:0.7rem;align-items:center;font-size:0.84rem}',
            '.u2gh-pairs{display:flex;gap:0.2rem}',
            '.u2gh-pairs b{display:inline-block;min-width:1.3rem;height:1.3rem;line-height:1.3rem;text-align:center;',
            '  border-radius:50%;border:1.5px solid var(--border);font-size:0.7rem;color:var(--text)}',
            '.u2gh-pick{display:flex;gap:0.3rem}',
            '.u2gh-opt{font:inherit;font-size:0.76rem;padding:0.24rem 0.6rem;border-radius:7px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2gh-opt[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2gh-opt[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2gh-opt.ok{border-color:var(--ok);color:var(--ok)}',
            '.u2gh-opt.ok[aria-pressed="true"]{background:var(--ok);border-color:var(--ok);color:#fff}',
            '.u2gh-opt.bad[aria-pressed="true"]{background:var(--bad);border-color:var(--bad);color:#fff}',
            '.u2gh-msg{margin:0.85rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2gh-msg.ok{color:var(--ok)} .u2gh-msg.bad{color:var(--bad)}',
            '.u2gh-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2gh-rev{background:rgba(127,201,138,0.12)}',
            '.u2gh-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2gh-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u2-greenhouse'] = function (root) {
        injectStyle();
        const ns = 'http://www.w3.org/2000/svg';
        const wrap = U.el('div', 'u2gh');
        const how = U.el('p', 'u2gh-how');
        const phaseL = U.el('p', 'u2gh-phase');
        const holder = U.el('div');
        const bank = U.el('div', 'u2gh-bank');
        const rowHost = U.el('div');
        const msg = U.el('p', 'u2gh-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, phaseL, holder, bank, rowHost, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const btns = U.el('div', 'sim-buttons');
        const nextBtn = U.button(btns, 'Next: what changed?', 'primary');
        const checkBtn = U.button(btns, 'Check', 'primary');
        const resetBtn = U.button(btns, 'Start again');
        wrap.appendChild(btns);

        let phase = 'name';
        let done = {};          // marker id -> true
        let selected = null;    // index into MARKS
        let pick = {};          // pair key -> 'more' | 'less' | 'same'
        let checked = false;
        let svg, keyEl, mkEls = {};

        function build() {
            holder.innerHTML = '';
            const stage = U.el('div', 'u2gh-stage');
            svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', '0 0 ' + IMG_W + ' ' + IMG_H);
            svg.setAttribute('class', 'u2gh-svg');
            svg.setAttribute('role', 'group');
            svg.setAttribute('aria-label', DESC);
            const im = document.createElementNS(ns, 'image');
            im.setAttribute('href', (document.body.dataset.root || '../') + 'images/u2/greenhouse-panels.jpeg');
            im.setAttribute('x', 0); im.setAttribute('y', 0);
            im.setAttribute('width', IMG_W); im.setAttribute('height', IMG_H);
            svg.appendChild(im);
            mkEls = {};
            MARKS.forEach(m => {
                const g = document.createElementNS(ns, 'g');
                g.setAttribute('class', 'u2gh-mk');
                g.setAttribute('tabindex', '0');
                g.setAttribute('role', 'button');
                g.innerHTML = '<circle cx="' + m.x + '" cy="' + m.y + '" r="' + MARK_R + '"/>' +
                    '<text x="' + m.x + '" y="' + (m.y + 30) + '">' + m.n + '</text>';
                const act = () => place(m.id);
                g.addEventListener('click', act);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                });
                svg.appendChild(g);
                mkEls[m.id] = g;
            });
            stage.appendChild(svg);
            holder.appendChild(stage);
            keyEl = U.el('ol', 'u2gh-key');
            holder.appendChild(keyEl);
        }

        function place(id) {
            if (phase !== 'name' || done[id]) return;
            if (selected === null) {
                msg.textContent = 'Pick a name from the list below first, then click its numbered marker.';
                msg.className = 'u2gh-msg';
                return;
            }
            const chosen = MARKS[selected];
            const target = byId(id);
            // the same name is correct for either panel's copy — it is the panel that differs
            if (chosen.name === target.name && chosen.id === target.id) {
                done[id] = true; selected = null;
                msg.textContent = target.name + ' — ' + target.where + '.';
                msg.className = 'u2gh-msg ok';
            } else {
                msg.textContent = 'Not that one. Marker ' + target.n + ' is ' +
                    target.name.toLowerCase() + ' in the ' + target.where + '.';
                msg.className = 'u2gh-msg bad';
                selected = null;
            }
            render();
        }

        function render() {
            how.innerHTML = phase === 'name'
                ? 'Both panels are drawn the same on purpose — same sun, same sunlight arriving, ' +
                  'same Earth. Name each numbered marker, then we will ask what is different.'
                : 'Now compare the two panels. For each quantity, is it <b>more</b>, <b>less</b>, ' +
                  'or <b>unchanged</b> in the right-hand panel? The numbers in each row tell you ' +
                  'which markers to compare.';
            phaseL.textContent = phase === 'name'
                ? 'Step 1 of 2 — name the eight markers'
                : 'Step 2 of 2 — what changed?';

            MARKS.forEach(m => {
                const g = mkEls[m.id];
                g.classList.toggle('done', !!done[m.id]);
                g.setAttribute('aria-label', 'Marker ' + m.n + (done[m.id] ? ': ' + m.name + ', ' + m.where : ''));
                if (done[m.id] || phase !== 'name') g.removeAttribute('tabindex');
                else g.setAttribute('tabindex', '0');
            });
            keyEl.innerHTML = '';
            MARKS.slice().sort((a, b) => a.n - b.n).forEach(m => {
                const li = U.el('li', done[m.id] ? 'done' : '');
                li.innerHTML = '<b>' + m.n + '</b><span>' + (done[m.id] ? m.name : '?') + '</span>';
                keyEl.appendChild(li);
            });

            bank.innerHTML = '';
            if (phase === 'name') {
                MARKS.forEach((m, i) => {
                    if (done[m.id]) return;
                    const c = U.el('button', 'u2gh-chip');
                    c.type = 'button';
                    c.textContent = m.name + ' — ' + m.where;
                    c.setAttribute('aria-pressed', selected === i ? 'true' : 'false');
                    c.addEventListener('click', () => { selected = selected === i ? null : i; render(); });
                    bank.appendChild(c);
                });
            }

            rowHost.innerHTML = '';
            if (phase === 'compare') {
                const g = U.el('div', 'u2gh-rows');
                PAIRS.forEach(p => {
                    const row = U.el('div', 'u2gh-row');
                    const nums = U.el('div', 'u2gh-pairs');
                    nums.innerHTML = '<b>' + p.left + '</b>' + (p.right ? '<b>' + p.right + '</b>' : '');
                    row.appendChild(nums);
                    const t = U.el('div'); t.textContent = p.label; row.appendChild(t);
                    const pk = U.el('div', 'u2gh-pick');
                    [['more', 'more'], ['less', 'less'], ['same', 'unchanged']].forEach(([v, lbl]) => {
                        const b = U.el('button', 'u2gh-opt');
                        b.type = 'button'; b.textContent = lbl;
                        b.setAttribute('aria-pressed', pick[p.k] === v ? 'true' : 'false');
                        b.setAttribute('aria-label', lbl + ' for ' + p.label);
                        if (checked) {
                            if (v === p.answer) b.classList.add('ok');
                            else if (pick[p.k] === v) b.classList.add('bad');
                        }
                        b.addEventListener('click', () => {
                            if (checked) return;
                            pick[p.k] = v; msg.textContent = ''; msg.className = 'u2gh-msg'; render();
                        });
                        pk.appendChild(b);
                    });
                    row.appendChild(pk);
                    g.appendChild(row);
                });
                rowHost.appendChild(g);
            }

            const named = MARKS.every(m => done[m.id]);
            nextBtn.hidden = !(phase === 'name' && named);
            checkBtn.hidden = phase !== 'compare';
        }

        function check() {
            const missing = PAIRS.filter(p => !pick[p.k]).length;
            if (missing) {
                msg.textContent = 'Answer all four first — ' + missing + ' still blank.';
                msg.className = 'u2gh-msg'; return;
            }
            const right = PAIRS.filter(p => pick[p.k] === p.answer).length;
            checked = true;
            msg.textContent = right === PAIRS.length
                ? 'All four. Nothing about the sun changed — and the surface still gets warmer.'
                : right + ' of 4. The right answers are outlined in green; read why below.';
            msg.className = 'u2gh-msg ' + (right === PAIRS.length ? 'ok' : 'bad');
            showReveal();
            render();
        }

        function showReveal() {
            revealHost.innerHTML = '';
            const d = U.el('div', 'u2gh-rev');
            d.innerHTML = '<h5>One thing was changed, and everything else followed</h5>' +
                PAIRS.map(p => '<p><b>' + p.label.charAt(0).toUpperCase() + p.label.slice(1) +
                    ':</b> ' + p.why + '</p>').join('') +
                '<p><b>One honest caveat about the picture.</b> The arrow rising from the surface ' +
                'is drawn the same width in both panels, but in reality it grows as the surface ' +
                'warms — a warmer surface radiates more. That is exactly how the planet reaches a ' +
                'new balance: it warms until enough heat is escaping again to match what arrives. ' +
                'The warming is not the system breaking; it is the system rebalancing at a higher ' +
                'temperature.</p>';
            revealHost.appendChild(d);
        }

        nextBtn.addEventListener('click', () => {
            phase = 'compare'; checked = false; msg.textContent = ''; msg.className = 'u2gh-msg'; render();
        });
        checkBtn.addEventListener('click', check);
        resetBtn.addEventListener('click', () => {
            phase = 'name'; done = {}; selected = null; pick = {}; checked = false;
            msg.textContent = ''; msg.className = 'u2gh-msg'; revealHost.innerHTML = '';
            build(); render();
        });

        build(); render();

        root._simState = () => ({
            phase, checked,
            named: MARKS.filter(m => done[m.id]).map(m => m.id),
            allNamed: MARKS.every(m => done[m.id]),
            compareCorrect: PAIRS.filter(p => pick[p.k] === p.answer).length,
            pairs: PAIRS.map(p => ({ label: p.label, answer: p.answer, chose: pick[p.k] || null })),
            marks: MARKS.map(m => ({ n: m.n, id: m.id, name: m.name, where: m.where }))
        });
        root._simSolve = () => {
            if (phase === 'name') { MARKS.forEach(m => { done[m.id] = true; }); selected = null; render(); }
            else { PAIRS.forEach(p => { pick[p.k] = p.answer; }); checked = false; render(); check(); }
        };
    };
})();
