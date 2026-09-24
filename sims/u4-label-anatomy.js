/* =============================================================
   INTERACTIVE — Label the reproductive systems
   -------------------------------------------------------------
   Registers window.SIMS['u4-label-anatomy'].
   Supports HS-LS1-2, HS-LS1-4.

   The deck's labelling task used unattributed scanned line
   drawings. The diagrams are now course illustrations
   (images/u4/repro-female.jpeg, repro-male.jpeg) with numbered
   circles drawn in. The clickable markers here sit exactly over
   those circles and are drawn larger, so they cover them. Marker
   positions are in the images' own 2000 x 1116 coordinates,
   measured from the images rather than estimated. The numbering
   deliberately does not follow the route a gamete takes.

   The task is not "match the word to the arrow". Each marker is
   answered by choosing the structure, and the reader is then told
   what that structure DOES and where it sits in the path a gamete
   travels — because the learning target is to compare structure
   and function, not to recite a list.

   The register is deliberately plain and clinical, and the two
   systems are treated the same way as any other organ system in
   this course.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4la-style';

    const FEMALE = {
        key: 'female', name: 'Female reproductive system',
        view: 'Seen from the front, cut through the middle so you can see inside the uterus.',
        img: 'repro-female.jpeg',
        route: ['ovary', 'oviduct', 'uterus'],
        landmarks: [],
        desc: 'A front view of the female reproductive organs, cut through the middle. In the centre is the pear-shaped uterus, with a thick muscular wall and a deeper-coloured lining around a narrow cavity. From its upper corners an oviduct curves out on each side and ends in a fringed funnel that sits close to, but not joined to, an oval ovary. Below the uterus the narrow cervix opens into the vagina. Six numbered markers point to structures.',
        parts: [
            { k: 'endometrium', name: 'Endometrium (uterus lining)', x: 1787, y: 339,
              fn: 'The blood-rich lining that thickens every cycle to receive an embryo, and is ' +
                  'shed as a period if no embryo implants. Chapter 4.8 follows exactly what ' +
                  'builds it up and what takes it away.' },
            { k: 'ovary', name: 'Ovary', x: 212, y: 511,
              fn: 'Holds the immature egg cells, releases one mature egg roughly once a month, ' +
                  'and produces oestrogen and progesterone. It is both a gonad and an endocrine gland.' },
            { k: 'cervix', name: 'Cervix', x: 1787, y: 728,
              fn: 'The narrow neck at the base of the uterus. It stays almost closed, and its ' +
                  'mucus changes consistency across the cycle.' },
            { k: 'oviduct', name: 'Oviduct (fallopian tube)', x: 212, y: 263,
              fn: 'Carries the egg from the ovary to the uterus, moved along by cilia and by ' +
                  'muscle in the tube wall. Fertilisation normally happens here, in the upper ' +
                  'third of the tube — not in the uterus.' },
            { k: 'vagina', name: 'Vagina', x: 212, y: 883,
              fn: 'A muscular tube connecting the cervix to the outside of the body. It is the ' +
                  'route sperm take in and the route a baby takes out.' },
            { k: 'uterus', name: 'Uterus', x: 1787, y: 572,
              fn: 'A muscular chamber where an embryo implants and develops. Its wall is mostly ' +
                  'smooth muscle, which is what contracts during labour.' }
        ]
    };

    const MALE = {
        key: 'male', name: 'Male reproductive system',
        view: 'Seen from the side, cut through the middle, facing left.',
        img: 'repro-male.jpeg',
        route: ['testis', 'epididymis', 'vas', 'urethra'],
        landmarks: [['bladder', 1045, 330], ['pubic bone', 745, 445]],
        desc: 'A side view of the male reproductive organs, cut through the middle. The bladder sits in the upper centre, with the pubic bone in front of it. Below the bladder is the prostate gland, and behind the bladder the seminal vesicle. The urethra runs from the bladder through the prostate and along the penis. Below, the testis sits inside the scrotum with the epididymis along its top and back, and the vas deferens runs from the epididymis up into the body, over the bladder and down to the prostate. Eight numbered markers point to structures.',
        parts: [
            { k: 'prostate', name: 'Prostate gland', x: 1787, y: 491,
              fn: 'Adds an alkaline fluid that neutralises acid, protecting sperm on the way ' +
                  'through the vagina. The urethra runs straight through the middle of it.' },
            { k: 'testis', name: 'Testis', x: 212, y: 883,
              fn: 'Makes sperm, in tightly coiled seminiferous tubules, and makes testosterone. ' +
                  'Both jobs matter in Chapter 4.8. It sits outside the body cavity because sperm ' +
                  'production needs a temperature a couple of degrees below core body temperature.' },
            { k: 'urethra', name: 'Urethra', x: 212, y: 643,
              fn: 'The tube running the length of the penis. In males it carries both urine and ' +
                  'semen — at different times, never at once.' },
            { k: 'vesicle', name: 'Seminal vesicle', x: 1788, y: 348,
              fn: 'Adds a fluid rich in fructose — sugar the sperm use as fuel. Most of the ' +
                  'volume of semen comes from this gland, not from the testes.' },
            { k: 'scrotum', name: 'Scrotum', x: 212, y: 999,
              fn: 'The sac holding the testes outside the body. Muscle in its wall pulls the ' +
                  'testes closer to the body when cold and lets them hang lower when warm — a ' +
                  'temperature-control system, and a feedback loop in its own right.' },
            { k: 'vas', name: 'Vas deferens', x: 1788, y: 203,
              fn: 'The muscular tube that carries sperm from the epididymis up and over the ' +
                  'bladder. This is the tube that is cut in a vasectomy.' },
            { k: 'penis', name: 'Penis', x: 212, y: 511,
              fn: 'Delivers sperm into the vagina. It contains spongy tissue that fills with ' +
                  'blood to make it rigid.' },
            { k: 'epididymis', name: 'Epididymis', x: 1787, y: 728,
              fn: 'A coiled tube on the back of each testis where sperm are stored and finish ' +
                  'maturing. Sperm leaving the testis cannot yet swim properly; they gain that ' +
                  'here.' }
        ]
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.la { padding:1rem 1.25rem 1.25rem; }',
            '.la { --la-ok:#2e7d32; --la-bad:#aa272f; }',
            '[data-theme="dark"] .la { --la-ok:#7fc98a; --la-bad:#e08a90; }',
            '[data-theme="sepia"] .la { --la-ok:#4a6b3d; --la-bad:#a04040; }',
            '.la-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; line-height:1.55; }',
            '.la-tabs { display:flex; gap:0.4rem; margin-bottom:0.9rem; flex-wrap:wrap; }',
            '.la-tab { font:inherit; font-size:0.78rem; font-weight:600; cursor:pointer;',
            '   padding:0.4rem 0.8rem; border:1px solid var(--border); border-radius:999px;',
            '   background:var(--bg); color:var(--text-secondary); touch-action:manipulation; }',
            '.la-tab[aria-pressed="true"] { border-color:var(--light-teal); color:var(--text);',
            '   box-shadow:0 0 0 1px var(--light-teal); }',
            '.la-view { font-size:0.72rem; color:var(--text-secondary); margin:0 0 0.5rem; }',
            '.la-stage { border:1px solid var(--border); border-radius:11px; background:#f9f0db;',
            '   padding:0.5rem; overflow-x:auto; }',
            '.la-stage svg { display:block; width:100%; min-width:560px; height:auto; }',
            '.la-land { fill:#6d6259; font-size:34px; font-style:italic; paint-order:stroke; stroke:#f9f0db; stroke-width:9px; pointer-events:none; }',
            '.la-mk text.la-step { fill:#8a5a14; font-size:40px; font-weight:800; paint-order:stroke; stroke:#f9f0db; stroke-width:9px; pointer-events:none; }',
            '.la-mk.route circle { stroke:#d9982e !important; stroke-width:9 !important; }',
            '.la-fill { fill:var(--bg-surface); stroke:var(--text-secondary); stroke-width:1.6; }',
            '.la-fill2 { fill:var(--bg-nav-active); stroke:var(--text-secondary); stroke-width:1.6; }',
            '.la-lining { fill:hsl(340 55% 55% / 0.30); stroke:none; }',
            '.la-cavity { fill:var(--bg); stroke:none; }',
            '.la-tube { fill:none; stroke:var(--text-secondary); stroke-width:5; stroke-linecap:round; }',
            '.la-tube2 { fill:none; stroke:var(--text-secondary); stroke-width:3; stroke-linecap:round;',
            '   stroke-dasharray:none; }',
            '.la-line { fill:none; stroke:var(--text-secondary); stroke-width:1.2; opacity:0.7; }',
            '.la-ghost { fill:none; stroke:var(--text-secondary); stroke-width:1.2;',
            '   stroke-dasharray:4 4; opacity:0.5; }',
            '.la-ghost-t { fill:var(--text-secondary); font-size:11px; opacity:0.7; }',
            '.la-mk { cursor:pointer; }',
            '.la-mk circle { fill:#fff; stroke:#3b2330; stroke-width:5; }',
            '.la-mk text { fill:#2b1a22; font-size:52px; font-weight:800; text-anchor:middle; pointer-events:none; }',
            '.la-mk:focus { outline:none; } .la-mk:focus circle { stroke:var(--light-teal); stroke-width:9; }',
            '.la-mk.here circle { fill:var(--light-teal); stroke:var(--light-teal); }',
            '.la-mk.here text { fill:#fff; }',
            '.la-mk.got circle { fill:#dcefdc; stroke:#2e7d32; }',
            '.la-q { font-size:0.86rem; font-weight:600; margin:0.9rem 0 0.5rem; }',
            '.la-opts { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.5rem; }',
            '.la-opt { font:inherit; font-size:0.78rem; cursor:pointer; padding:0.4rem 0.7rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; }',
            '.la-opt:hover { border-color:var(--light-teal); }',
            '.la-opt.done { border-color:var(--la-ok); color:var(--la-ok); opacity:0.45;',
            '   text-decoration:line-through; }',
            '.la-opt.wrong { border-color:var(--la-bad); color:var(--la-bad); opacity:0.6; }',
            '.la-msg { font-size:0.83rem; line-height:1.6; margin:0.55rem 0 0; min-height:2.4em; }',
            '.la-msg.ok { color:var(--la-ok); } .la-msg.bad { color:var(--la-bad); }',
            '.la-msg b { color:var(--text); }',
            '.la-list { margin:0.9rem 0 0; border:1px solid var(--border); border-radius:10px;',
            '   background:var(--bg-surface); padding:0.75rem 0.9rem; font-size:0.83rem; }',
            '.la-list dt { font-weight:700; margin-top:0.55rem; }',
            '.la-list dt:first-child { margin-top:0; }',
            '.la-list dd { margin:0.15rem 0 0; line-height:1.6; color:var(--text-secondary); }',
            '.la-done { margin-top:0.9rem; border:1px solid var(--la-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; font-size:0.84rem; line-height:1.6; }',
            '[data-theme="dark"] .la-done { background:rgba(127,201,138,0.12); }',
            '.la-done h5 { margin:0 0 0.4rem; font-size:0.9rem; }',
            '.la-done p { margin:0 0 0.55rem; } .la-done p:last-child { margin-bottom:0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-label-anatomy'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'la');
        root.appendChild(wrap);

        let sys = FEMALE;
        let active = 0;
        let got = {};            // 'female:ovary' -> true
        let wrong = [];
        let msgText = null;

        const has = (s, k) => !!got[s.key + ':' + k];
        const remaining = () => sys.parts.filter(p => !has(sys, p.k));

        function render() {
            wrap.innerHTML = '';

            const how = U.el('p', 'la-how');
            how.innerHTML = 'Two organ systems, treated the same way as any other in this course. ' +
                'Click a numbered marker, then choose which structure its line points to. Each correct ' +
                'answer tells you what that structure <em>does</em> — which is what the learning ' +
                'target actually asks for.';
            wrap.appendChild(how);

            const tabs = U.el('div', 'la-tabs');
            [FEMALE, MALE].forEach(s => {
                const b = U.el('button', 'la-tab');
                const done = s.parts.every(p => has(s, p.k));
                b.type = 'button';
                b.textContent = s.name + (done ? ' ✓' : '');
                b.setAttribute('aria-pressed', s.key === sys.key ? 'true' : 'false');
                b.addEventListener('click', () => {
                    sys = s; active = 0; wrong = []; msgText = null; render();
                });
                tabs.appendChild(b);
            });
            wrap.appendChild(tabs);

            const view = U.el('p', 'la-view');
            view.textContent = sys.view;
            wrap.appendChild(view);

            const stage = U.el('div', 'la-stage');
            stage.innerHTML = svg();
            wrap.appendChild(stage);
            stage.querySelectorAll('.la-mk').forEach(g => {
                const act = () => {
                    active = +g.dataset.i; wrong = []; msgText = null; render();
                };
                g.addEventListener('click', act);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                });
            });

            if (remaining().length) {
                const q = U.el('p', 'la-q');
                q.innerHTML = 'Marker <b>' + (active + 1) + '</b> — which structure is it pointing at?';
                wrap.appendChild(q);
                const opts = U.el('div', 'la-opts');
                sys.parts.forEach(p => {
                    const done = has(sys, p.k);
                    const b = U.el('button', 'la-opt' + (done ? ' done' : '') +
                        (wrong.indexOf(p.k) > -1 ? ' wrong' : ''));
                    b.type = 'button'; b.textContent = p.name; b.disabled = done;
                    b.addEventListener('click', () => {
                        const want = sys.parts[active];
                        if (p.k === want.k) {
                            got[sys.key + ':' + p.k] = true;
                            wrong = [];
                            msgText = { cls: 'ok', html: '<b>' + want.name + '.</b> ' + want.fn };
                            const next = sys.parts.findIndex(x => !has(sys, x.k));
                            if (next > -1) active = next;
                        } else {
                            wrong.push(p.k);
                            msgText = { cls: 'bad', html: 'That is the ' + p.name.toLowerCase() +
                                ', which is somewhere else on this diagram. Find where it must be ' +
                                'from what it does — ' + p.fn.split('.')[0].toLowerCase() + '.' };
                        }
                        render();
                    });
                    opts.appendChild(b);
                });
                wrap.appendChild(opts);
            }

            const msg = U.el('p', 'la-msg' + (msgText ? ' ' + msgText.cls : ''));
            msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
            if (msgText) msg.innerHTML = msgText.html;
            wrap.appendChild(msg);

            if (!remaining().length) wrap.appendChild(doneBox());

            const btns = U.el('div', 'sim-buttons');
            U.button(btns, 'Clear this diagram').addEventListener('click', () => {
                sys.parts.forEach(p => { delete got[sys.key + ':' + p.k]; });
                active = 0; wrong = []; msgText = null; render();
            });
            wrap.appendChild(btns);
        }

        function svg() {
            const W = 2000, H = 1116, R = 58;
            const root = (document.body.dataset.root || '../') + 'images/u4/';
            const complete = !remaining().length;
            let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="' + sys.desc + '">';
            s += '<image href="' + root + sys.img + '" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="xMidYMid meet"/>';
            sys.landmarks.forEach(l => {
                s += '<text class="la-land" x="' + l[1] + '" y="' + l[2] + '" text-anchor="middle">' + l[0] + '</text>';
            });
            sys.parts.forEach((p, i) => {
                const step = complete ? sys.route.indexOf(p.k) : -1;
                const cls = 'la-mk' + (has(sys, p.k) ? ' got' : i === active ? ' here' : '') + (step > -1 ? ' route' : '');
                s += '<g class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" ' +
                    'aria-label="Marker ' + (i + 1) + (has(sys, p.k) ? ': ' + p.name : '') + '">' +
                    '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + R + '"/>' +
                    '<text x="' + p.x + '" y="' + (p.y + 19) + '">' + (i + 1) + '</text>';
                if (step > -1) {
                    // beside the marker, just under its leader line, so it never lands on a neighbouring marker
                    const left = p.x < W / 2;
                    s += '<text class="la-step" x="' + (left ? p.x + R + 14 : p.x - R - 14) + '" y="' + (p.y + 40) + '" style="text-anchor:' + (left ? 'start' : 'end') + '">step ' + (step + 1) + '</text>';
                }
                s += '</g>';
            });
            s += '</svg>';
            return s;
        }

        function doneBox() {
            const d = U.el('div', 'la-done');
            let html = '<h5>' + sys.name + ' — complete</h5>';
            if (sys.key === 'female') {
                html += '<p>The gold markers now show the path an egg takes, step by step, and the whole system makes sense in order: ' +
                    '<b>ovary → oviduct → uterus</b>, with the cervix and vagina below as the way ' +
                    'in and out. Fertilisation happens in the oviduct, not the uterus — which is ' +
                    'why the embryo arrives in the uterus several days old and already dividing.</p>' +
                    '<p>Two of these structures are doing endocrine work as well as plumbing. The ' +
                    'ovary makes oestrogen and progesterone; the endometrium responds to them. ' +
                    'Chapter 4.8 is about that conversation.</p>';
            } else {
                html += '<p>The gold markers now show the path a sperm takes, step by step, and the order is again the explanation: ' +
                    '<b>testis → epididymis → vas deferens → urethra</b>, with the seminal vesicle ' +
                    'and prostate adding fluid on the way past. Sperm are a small fraction of the ' +
                    'volume of semen; most of it is fuel and buffer added by those two glands.</p>' +
                    '<p>Notice how much of the design is about conditions rather than transport. ' +
                    'The scrotum keeps the testes cool enough to make sperm at all. The prostate ' +
                    'makes its fluid alkaline because sperm have to survive an acidic environment. ' +
                    'Structure follows function every time.</p>';
            }
            const other = sys.key === 'female' ? MALE : FEMALE;
            if (!other.parts.every(p => has(other, p.k)))
                html += '<p>Now do the ' + other.name.toLowerCase() + '.</p>';
            d.innerHTML = html;
            return d;
        }

        render();

        root._simState = () => ({
            system: sys.key, active,
            labelled: sys.parts.filter(p => has(sys, p.k)).map(p => p.k),
            total: sys.parts.length,
            complete: !remaining().length,
            bothComplete: FEMALE.parts.every(p => has(FEMALE, p.k)) &&
                          MALE.parts.every(p => has(MALE, p.k))
        });
        root._simSolve = () => {
            sys.parts.forEach(p => { got[sys.key + ':' + p.k] = true; });
            msgText = null; render();
        };
    };
})();
