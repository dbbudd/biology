/* =============================================================
   INTERACTIVE — Pedigree detective
   -------------------------------------------------------------
   Registers window.SIMS['pedigree'].  Supports HS-LS3-3.

   Replaces five worksheet screenshots of pedigrees. A pedigree is
   read BACKWARDS — you are given phenotypes and must infer genotypes
   — so the interactive is built the same way round: decide whether
   the trait is dominant or recessive first, because every genotype
   after that depends on the answer.

   The deliberate difficulty is that some individuals CANNOT be
   determined. An unaffected person in a recessive pedigree may be AA
   or Aa, and there is no way to tell from the diagram. Students
   routinely guess one; the interactive makes "cannot tell" a real
   answer, because in genetics it often is.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-ped-style';

    // x,y in a 560 x 320 viewBox. sex: m|f. aff: affected?
    const PEOPLE = [
        { id:'I-1',  x: 170, y: 46,  sex:'m', aff:false, gen:'I'  },
        { id:'I-2',  x: 250, y: 46,  sex:'f', aff:false, gen:'I'  },
        { id:'II-1', x: 110, y: 150, sex:'m', aff:true,  gen:'II' },
        { id:'II-2', x: 190, y: 150, sex:'f', aff:false, gen:'II' },
        { id:'II-3', x: 280, y: 150, sex:'m', aff:false, gen:'II' },
        { id:'II-4', x: 360, y: 150, sex:'f', aff:false, gen:'II' },
        { id:'III-1',x: 300, y: 254, sex:'f', aff:true,  gen:'III'},
        { id:'III-2',x: 380, y: 254, sex:'m', aff:false, gen:'III'}
    ];
    // couples and their children, for drawing the connecting lines
    const UNIONS = [
        { a:'I-1',  b:'I-2',  kids:['II-1','II-2','II-3'] },
        { a:'II-3', b:'II-4', kids:['III-1','III-2'] }
    ];

    // The answers, derived by the same reasoning the reader must do.
    // 'AA?' means unaffected but genuinely undetermined: AA or Aa.
    const TRUTH = {
        mode: 'recessive',
        geno: {
            'I-1':'Aa', 'I-2':'Aa',          // unaffected, yet have an affected child
            'II-1':'aa',                      // affected
            'II-2':'?',                       // unaffected child of Aa x Aa — cannot tell
            'II-3':'Aa',                      // unaffected, yet has an affected child
            'II-4':'Aa',                      // married in, but must carry it
            'III-1':'aa',                     // affected
            'III-2':'?'                       // unaffected child of Aa x Aa — cannot tell
        }
    };
    const WHY = {
        'I-1':'Unaffected, but their son II-1 is affected. An affected child needs one recessive allele from each parent, so I-1 must be a carrier.',
        'I-2':'Same reasoning as I-1 — an affected son means both parents carry the allele.',
        'II-1':'Affected, and the trait is recessive, so both alleles must be recessive.',
        'II-2':'Unaffected, so at least one dominant allele. But their parents were both Aa, so they could be AA or Aa — the pedigree gives you no way to tell them apart. Saying "Aa" here is a guess, not a deduction.',
        'II-3':'Unaffected, but their daughter III-1 is affected. So II-3 must have passed on a recessive allele.',
        'II-4':'Married into the family and is unaffected — but her daughter III-1 is affected, so she must carry the allele too. Recessive alleles travel silently through carriers, which is why they appear in families with no history of the condition.',
        'III-1':'Affected, so both alleles are recessive.',
        'III-2':'Unaffected, with two carrier parents. AA or Aa — undetermined.'
    };

    const OPTS = [
        { k:'AA', t:'AA' }, { k:'Aa', t:'Aa' }, { k:'aa', t:'aa' }, { k:'?', t:'Cannot tell' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.pd { padding:1rem 1.25rem 0.25rem; }',
            '.pd { --pd-ok:#2e7d32; --pd-bad:#aa272f; }',
            '[data-theme="dark"] .pd { --pd-ok:#7fc98a; --pd-bad:#e08a90; }',
            '[data-theme="sepia"] .pd { --pd-ok:#4a6b3d; --pd-bad:#a04040; }',
            '.pd-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; }',
            '.pd-step { font-size:0.62rem; font-weight:700; letter-spacing:0.09em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.4rem; }',
            '.pd-svg { width:100%; max-width:560px; height:auto; display:block; margin:0 auto; }',
            '.pd-sym { stroke:var(--text); stroke-width:2; }',
            '.pd-sym.aff { fill:var(--text); }',
            '.pd-sym.un  { fill:none; }',
            '.pd-sym.sel { stroke:var(--light-teal); stroke-width:3.5; }',
            '.pd-line { stroke:var(--text-secondary); stroke-width:1.6; fill:none; }',
            '.pd-id { font-size:11px; fill:var(--text-secondary); }',
            '.pd-gt { font-size:12px; font-weight:800; fill:var(--pd-ok); }',
            '.pd-gt.bad { fill:var(--pd-bad); }',
            '.pd-hit { fill:transparent; cursor:pointer; }',
            '.pd-hit:focus-visible { outline:2px solid var(--light-teal); }',
            '.pd-key { font-size:0.7rem; color:var(--text-secondary); margin:0.5rem 0 0;',
            '   display:flex; gap:1rem; flex-wrap:wrap; justify-content:center; }',
            '.pd-opts { display:flex; gap:0.4rem; flex-wrap:wrap; margin:0.9rem 0 0; }',
            '.pd-opt { font:inherit; font-size:0.78rem; cursor:pointer; padding:0.4rem 0.75rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; }',
            '.pd-opt:hover { border-color:var(--light-teal); }',
            '.pd-opt:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.pd-opt.right { border-color:var(--pd-ok); color:var(--pd-ok); font-weight:700; }',
            '.pd-opt.wrong { border-color:var(--pd-bad); color:var(--pd-bad); opacity:0.65; }',
            '.pd-msg { margin:0.85rem 0 0; font-size:0.82rem; line-height:1.5; min-height:2.6em; }',
            '.pd-msg.ok { color:var(--pd-ok); } .pd-msg.bad { color:var(--pd-bad); }',
            '.pd-count { font-size:0.72rem; color:var(--text-secondary); margin:0.5rem 0 0; }',
            '.pd-reveal { margin-top:1rem; border:1px solid var(--pd-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .pd-reveal { background:rgba(127,201,138,0.12); }',
            '.pd-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.pd-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['pedigree'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'pd');
        const how = U.el('p', 'pd-how');
        const step = U.el('p', 'pd-step');
        const svgHost = U.el('div');
        const key = U.el('div', 'pd-key');
        key.innerHTML = '<span>&#9633; unaffected male</span><span>&#9632; affected male</span>' +
                        '<span>&#9711; unaffected female</span><span>&#9679; affected female</span>';
        const optHost = U.el('div');
        const msg = U.el('p', 'pd-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const count = U.el('p', 'pd-count');
        const revealHost = U.el('div');
        [how, step, svgHost, key, optHost, msg, count, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        U.button(buttons, 'Start again').addEventListener('click', () => {
            mode = null; modeTried = []; answers = {}; sel = null;
            msg.textContent = ''; msg.className = 'pd-msg'; revealHost.innerHTML = ''; render();
        });
        wrap.appendChild(buttons);

        let mode = null;           // 'dominant' | 'recessive' once answered
        let modeTried = [];
        let answers = {};          // id -> genotype
        let sel = null;            // selected person id

        const person = id => PEOPLE.filter(p => p.id === id)[0];
        const solvedAll = () => PEOPLE.every(p => answers[p.id] === TRUTH.geno[p.id]);

        function drawSvg() {
            const NS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 470 300');
            svg.setAttribute('class', 'pd-svg');
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label',
                'A three-generation pedigree. In generation one an unaffected male and an unaffected ' +
                'female have three children: an affected male, an unaffected female and an unaffected ' +
                'male. That unaffected male and his unaffected partner have two children: an affected ' +
                'female and an unaffected male.');
            const add = (tag, attrs, cls) => {
                const e = document.createElementNS(NS, tag);
                Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
                if (cls) e.setAttribute('class', cls);
                svg.appendChild(e); return e;
            };
            // union + sibship lines
            UNIONS.forEach(u => {
                const a = person(u.a), b = person(u.b);
                const my = a.y, midx = (a.x + b.x) / 2;
                add('path', { d: 'M' + (a.x + 16) + ' ' + my + ' H' + (b.x - 16) }, 'pd-line');
                const kidY = person(u.kids[0]).y;
                const dropY = my + 34;
                add('path', { d: 'M' + midx + ' ' + my + ' V' + dropY }, 'pd-line');
                const xs = u.kids.map(k => person(k).x);
                add('path', { d: 'M' + Math.min.apply(null, xs) + ' ' + dropY +
                                  ' H' + Math.max.apply(null, xs) }, 'pd-line');
                u.kids.forEach(k => {
                    add('path', { d: 'M' + person(k).x + ' ' + dropY + ' V' + (kidY - 16) }, 'pd-line');
                });
            });
            // symbols
            PEOPLE.forEach(p => {
                const cls = 'pd-sym ' + (p.aff ? 'aff' : 'un') + (sel === p.id ? ' sel' : '');
                if (p.sex === 'm') add('rect', { x: p.x - 15, y: p.y - 15, width: 30, height: 30 }, cls);
                else add('circle', { cx: p.x, cy: p.y, r: 15 }, cls);
                const t = add('text', { x: p.x, y: p.y + 32, 'text-anchor': 'middle' }, 'pd-id');
                t.textContent = p.id;
                const g = answers[p.id];
                if (g) {
                    const ok = g === TRUTH.geno[p.id];
                    const gt = add('text', { x: p.x, y: p.y - 22, 'text-anchor': 'middle' },
                        'pd-gt' + (ok ? '' : ' bad'));
                    gt.textContent = g === '?' ? 'AA or Aa' : g;
                }
                const hit = add('rect', { x: p.x - 20, y: p.y - 20, width: 40, height: 40,
                    tabindex: '0', role: 'button',
                    'aria-label': p.id + ', ' + (p.aff ? 'affected' : 'unaffected') + ' ' +
                        (p.sex === 'm' ? 'male' : 'female') +
                        (answers[p.id] ? ', assigned ' + answers[p.id] : ', no genotype yet') }, 'pd-hit');
                const choose = () => { if (mode) { sel = p.id; msg.textContent = ''; msg.className = 'pd-msg'; render(); } };
                hit.addEventListener('click', choose);
                hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
            });
            return svg;
        }

        function render() {
            how.textContent = !mode
                ? 'Look at the pedigree. Two unaffected parents in generation I have an affected son. That single fact settles the first question.'
                : 'Click a person, then choose their genotype. Not everyone can be worked out — one of the four buttons says so, and sometimes it is the right answer.';
            step.textContent = !mode ? 'Step 1 of 2 — dominant or recessive?'
                                     : 'Step 2 of 2 — assign the genotypes';

            svgHost.innerHTML = ''; svgHost.appendChild(drawSvg());

            optHost.innerHTML = '';
            if (!mode) {
                const box = U.el('div', 'pd-opts');
                [['recessive', 'Recessive'], ['dominant', 'Dominant']].forEach(([k, t]) => {
                    const b = U.el('button', 'pd-opt' + (modeTried.indexOf(k) > -1 ? ' wrong' : ''));
                    b.type = 'button'; b.textContent = t;
                    b.addEventListener('click', () => {
                        if (k === TRUTH.mode) {
                            mode = k;
                            msg.textContent = 'Right — and here is the reasoning. I-1 and I-2 are both ' +
                                'unaffected, yet their son II-1 is affected. A trait that appears in a ' +
                                'child of two unaffected parents cannot be dominant, because a dominant ' +
                                'allele always shows itself. It must be recessive, and both parents must ' +
                                'be carriers.';
                            msg.className = 'pd-msg ok';
                        } else {
                            modeTried.push(k);
                            msg.textContent = 'If the trait were dominant, every affected person would ' +
                                'have at least one affected parent. Look at II-1 and check whether that holds.';
                            msg.className = 'pd-msg bad';
                        }
                        render();
                    });
                    box.appendChild(b);
                });
                optHost.appendChild(box);
                count.textContent = '';
                return;
            }

            if (sel) {
                const box = U.el('div', 'pd-opts');
                OPTS.forEach(o => {
                    const b = U.el('button', 'pd-opt' +
                        (answers[sel] === o.k ? (o.k === TRUTH.geno[sel] ? ' right' : ' wrong') : ''));
                    b.type = 'button'; b.textContent = o.t;
                    b.addEventListener('click', () => {
                        answers[sel] = o.k;
                        if (o.k === TRUTH.geno[sel]) {
                            msg.textContent = sel + ': ' + WHY[sel];
                            msg.className = 'pd-msg ok';
                        } else if (TRUTH.geno[sel] === '?') {
                            msg.textContent = 'Careful. ' + sel + ' is unaffected, so they have at ' +
                                'least one dominant allele — but can you prove which? Both their parents ' +
                                'are carriers, so this person could be AA or Aa and the pedigree does ' +
                                'not distinguish them.';
                            msg.className = 'pd-msg bad';
                        } else {
                            msg.textContent = 'Not right. Look at who ' + sel + ' is connected to — ' +
                                'especially their children, if they have any. An affected child forces ' +
                                'a parent to carry the recessive allele.';
                            msg.className = 'pd-msg bad';
                        }
                        render();
                    });
                    box.appendChild(b);
                });
                const head = U.el('p', 'pd-step');
                head.textContent = 'Genotype for ' + sel;
                optHost.appendChild(head); optHost.appendChild(box);
            }

            const n = PEOPLE.filter(p => answers[p.id] === TRUTH.geno[p.id]).length;
            count.textContent = n + ' of ' + PEOPLE.length + ' genotypes correct.';
            if (solvedAll()) showReveal();
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const d = U.el('div', 'pd-reveal');
            d.innerHTML =
                '<h5>You just read inheritance backwards.</h5>' +
                '<p>A Punnett square runs forwards: you know the parents and you predict the children. ' +
                'A pedigree runs the other way — you can see only the phenotypes, and you have to ' +
                'reason back to the genotypes that must have produced them.</p>' +
                '<p>Two moves did almost all the work. <strong>Two unaffected parents with an affected ' +
                'child</strong> proves the trait is recessive and both parents are carriers. ' +
                '<strong>An affected child</strong> forces a recessive allele into both of their parents, ' +
                'even someone who married into the family with no history of it — which is exactly how ' +
                'cystic fibrosis appears in families that have never seen it before.</p>' +
                '<p>And notice II-2 and III-2. Unaffected, so certainly carrying at least one dominant ' +
                'allele — but AA or Aa? Nothing in the diagram can tell you. Being able to say ' +
                '<em>"this cannot be determined"</em> is a real answer, and knowing when to say it is ' +
                'part of the skill.</p>';
            revealHost.appendChild(d);
        }

        render();

        root._simState = () => ({
            mode, answers: Object.assign({}, answers),
            truth: TRUTH, correct: PEOPLE.filter(p => answers[p.id] === TRUTH.geno[p.id]).length,
            complete: solvedAll()
        });
        root._simSolve = () => {
            mode = TRUTH.mode;
            PEOPLE.forEach(p => { answers[p.id] = TRUTH.geno[p.id]; });
            render();
        };
    };
})();
