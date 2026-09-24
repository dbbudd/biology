/* =============================================================
   INTERACTIVE — Name the eleven organ systems
   -------------------------------------------------------------
   Registers window.SIMS['u1-body-systems'].  Supports HS-LS1-2
   and the chapter objective "name the major organ systems".

   Deliberately placed AFTER Figure 1.19 and the table, not under
   the figure: the figure carries the names, so a drill sitting
   beside it would be copying rather than recall.

   Eleven panels, the same eleven drawings as Figure 1.19, with the
   names taken off. The reader puts each name back.

   The reveal for a correct answer is NOT the table's "what it does"
   column — that table is on the same page and restating it would
   waste the reader's effort. Each reveal gives the identifying
   feature instead: what to look for in the picture, plus the one
   fact about that system worth carrying away.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u1sys-style';

    const SYSTEMS = [
        { id: 'digestive', name: 'Digestive',
          tell: 'One continuous tube from mouth to anus, with the liver sitting alongside it.' },
        { id: 'circulatory', name: 'Circulatory',
          tell: 'A pump and a closed branching network — every vessel eventually loops back.' },
        { id: 'respiratory', name: 'Respiratory',
          tell: 'It stops at the chest: a windpipe and two lungs, and nothing below them.' },
        { id: 'lymphatic', name: 'Lymphatic',
          tell: 'Almost the circulatory system again — but beaded with nodes, and with no pump at all.' },
        { id: 'urinary', name: 'Urinary',
          tell: 'Two kidneys, two tubes and one bladder, and nothing above the waist.' },
        { id: 'nervous', name: 'Nervous',
          tell: 'A cord straight down the middle, with branches reaching everywhere else.' },
        { id: 'endocrine', name: 'Endocrine',
          tell: 'The only one that is not joined up — separate glands that send messages through the blood.' },
        { id: 'muscular', name: 'Muscular',
          tell: 'It covers almost the whole body, immediately under the skin.' },
        { id: 'skeletal', name: 'Skeletal',
          tell: 'The only one of the eleven that would still stand up on its own.' },
        { id: 'integumentary', name: 'Integumentary',
          tell: 'The whole outline is the organ. Your skin is the largest one you have.' },
        { id: 'reproductive', name: 'Reproductive',
          tell: 'The only system you can live an entire life without ever using.' }
    ];

    function shuffled(a) {
        const b = a.slice();
        for (let i = b.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [b[i], b[j]] = [b[j], b[i]];
        }
        return b;
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u1sy{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u1sy{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u1sy{--ok:#4a6b3d;--bad:#a04040}',
            '.u1sy-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.7rem;line-height:1.5}',
            '.u1sy-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:0.45rem;',
            '  background:#F7F1E5;border:1px solid var(--border);border-radius:11px;padding:0.5rem}',
            '@media (max-width:820px){.u1sy-grid{grid-template-columns:repeat(4,1fr)}}',
            '@media (max-width:520px){.u1sy-grid{grid-template-columns:repeat(3,1fr)}}',
            /* Each panel is a button so it is keyboard reachable without extra wiring. The
               artwork is light in every theme, so the panel chrome is pinned to its own
               colours rather than themed. */
            '.u1sy-cell{display:flex;flex-direction:column;align-items:center;gap:0.2rem;',
            '  font:inherit;background:none;border:2px solid transparent;border-radius:9px;',
            '  padding:0.2rem 0.1rem 0.3rem;cursor:pointer}',
            '.u1sy-cell img{width:100%;height:auto;display:block;border-radius:6px}',
            '.u1sy-cell:hover{border-color:#577899}',
            '.u1sy-cell:focus{outline:none;border-color:#577899}',
            '.u1sy-cell b{font-size:0.7rem;font-weight:700;color:#1f2933;min-height:1.1em;line-height:1.2;',
            '  text-align:center}',
            '.u1sy-cell.done{cursor:default;border-color:var(--ok)}',
            '.u1sy-cell.done b{color:#1f5a22}',
            '.u1sy-bank{display:flex;gap:0.4rem;flex-wrap:wrap;margin:0.85rem 0 0.2rem}',
            '.u1sy-chip{font:inherit;font-size:0.78rem;padding:0.3rem 0.6rem;border-radius:7px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u1sy-chip:hover{border-color:var(--light-teal)}',
            '.u1sy-chip[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u1sy-chip[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u1sy-msg{margin:0.85rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u1sy-msg.ok{color:var(--ok)} .u1sy-msg.bad{color:var(--bad)}',
            '.u1sy-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u1sy-rev{background:rgba(127,201,138,0.12)}',
            '.u1sy-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u1sy-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}',
            '.u1sy-rev p:last-child{margin-bottom:0}'
        ].join('\n');
        document.head.appendChild(s);
    }

    const ALT = {
        digestive: 'A body outline with a stomach, liver and coiled intestine drawn inside it in amber.',
        circulatory: 'A body outline with a heart and a branching tree of red vessels reaching the limbs.',
        respiratory: 'A body outline with a windpipe and two blue lungs in the chest only.',
        lymphatic: 'A body outline with fine green vessels and small beaded nodes throughout.',
        urinary: 'A body outline with two kidneys, two tubes and a bladder low in the abdomen.',
        nervous: 'A body outline with a violet brain, a spinal cord and nerves branching to the limbs.',
        endocrine: 'A body outline with a few small separate teal glands and nothing joining them.',
        muscular: 'A body outline filled with deep rose surface muscles.',
        skeletal: 'A body outline with a pale skull, spine, ribcage and limb bones.',
        integumentary: 'A body outline tinted evenly in soft peach, with no organs drawn inside.',
        reproductive: 'A body outline with a single small pink structure low in the abdomen.'
    };

    window.SIMS['u1-body-systems'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u1sy');
        const how = U.el('p', 'u1sy-how');
        how.textContent = 'The names have been taken off. Click a name, then click the body it belongs to. ' +
            'Two of these are easy to confuse on purpose — look for what is missing as well as what is there.';
        const grid = U.el('div', 'u1sy-grid');
        const bank = U.el('div', 'u1sy-bank');
        const msg = U.el('p', 'u1sy-msg');
        msg.setAttribute('role', 'status');
        msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, grid, bank, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        const ROOT = document.body.dataset.root || '../';
        let done = {};
        let selected = null;
        let order = shuffled(SYSTEMS);
        const cells = {};

        function build() {
            grid.innerHTML = '';
            order.forEach(sys => {
                const b = U.el('button', 'u1sy-cell');
                b.type = 'button';
                const img = document.createElement('img');
                img.src = ROOT + 'images/u1/systems/' + sys.id + '.jpeg';
                img.alt = ALT[sys.id];
                const cap = U.el('b');
                b.appendChild(img);
                b.appendChild(cap);
                b.addEventListener('click', () => place(sys.id));
                grid.appendChild(b);
                cells[sys.id] = { btn: b, cap: cap };
            });
        }

        function place(id) {
            if (done[id]) return;
            if (selected === null) {
                msg.textContent = 'Pick a name from the list below first, then click the body it belongs to.';
                msg.className = 'u1sy-msg';
                return;
            }
            const picked = SYSTEMS[selected];
            if (picked.id === id) {
                done[id] = true;
                selected = null;
                msg.textContent = picked.name + ' — ' + picked.tell;
                msg.className = 'u1sy-msg ok';
            } else {
                const truth = SYSTEMS.find(s => s.id === id);
                msg.textContent = 'Not that one — that is the ' + truth.name.toLowerCase() +
                    ' system. ' + picked.tell;
                msg.className = 'u1sy-msg bad';
            }
            render();
        }

        function render() {
            SYSTEMS.forEach(sys => {
                const c = cells[sys.id];
                if (!c) return;
                c.btn.classList.toggle('done', !!done[sys.id]);
                c.cap.textContent = done[sys.id] ? sys.name : '?';
                c.btn.setAttribute('aria-label', done[sys.id]
                    ? sys.name + ' system — named'
                    : 'Unnamed system. ' + ALT[sys.id]);
                if (done[sys.id]) c.btn.setAttribute('disabled', 'disabled');
                else c.btn.removeAttribute('disabled');
            });

            bank.innerHTML = '';
            SYSTEMS.forEach((s, i) => {
                if (done[s.id]) return;
                const c = U.el('button', 'u1sy-chip');
                c.type = 'button';
                c.textContent = s.name;
                c.setAttribute('aria-pressed', selected === i ? 'true' : 'false');
                c.addEventListener('click', () => {
                    selected = selected === i ? null : i;
                    render();
                });
                bank.appendChild(c);
            });

            revealHost.innerHTML = '';
            if (SYSTEMS.every(s => done[s.id])) {
                const box = U.el('div', 'u1sy-rev');
                const h = U.el('h5');
                h.textContent = 'All eleven.';
                const p1 = U.el('p');
                p1.textContent = 'Notice what you were actually doing. The outline never changed — ' +
                    'you were not telling eleven objects apart, you were telling apart eleven ways of ' +
                    'looking at the same one.';
                const p2 = U.el('p');
                p2.textContent = 'That is why the boundaries leak. Your diaphragm is muscular and ' +
                    'respiratory at once; your pancreas is digestive and endocrine at once. Neither is a ' +
                    'special case — the eleven are a convenience we impose, and the body does not always ' +
                    'respect them.';
                box.appendChild(h); box.appendChild(p1); box.appendChild(p2);
                revealHost.appendChild(box);
            }
        }

        function reset() {
            done = {}; selected = null; order = shuffled(SYSTEMS);
            msg.textContent = ''; msg.className = 'u1sy-msg';
            build(); render();
        }
        resetBtn.addEventListener('click', reset);

        root._simState = function () {
            return {
                named: SYSTEMS.filter(s => done[s.id]).map(s => s.id),
                allNamed: SYSTEMS.every(s => done[s.id]),
                panels: order.map(s => s.id),
                selected: selected === null ? null : SYSTEMS[selected].id
            };
        };
        root._simSolve = function () {
            SYSTEMS.forEach(s => { done[s.id] = true; });
            selected = null;
            msg.textContent = 'All eleven named.';
            msg.className = 'u1sy-msg ok';
            render();
        };

        build();
        render();
    };
}());
