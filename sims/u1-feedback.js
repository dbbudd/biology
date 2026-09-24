/* =============================================================
   INTERACTIVE — Feedback loop builder
   -------------------------------------------------------------
   Registers window.SIMS['u1-feedback'].  Supports HS-LS1-3.

   Six loops, three of which (clotting, vomiting, sneezing) are
   named in the learning targets and appear nowhere in the source
   slides. They are built here from scratch.

   Every loop runs the same three steps:
     1 CLASSIFY — negative or positive, committed before anything
       is explained. Guessing is fine; guessing and then finding
       out is the point.
     2 BUILD    — place stimulus, receptor, control centre,
       effector and response. The five words are useless until
       you have had to decide which is which on a real case.
     3 RUN      — the variable is plotted from a model, not drawn
       by hand, so a negative loop visibly settles and a positive
       loop visibly runs away and then stops for an outside
       reason.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u1-feedback-style';

    const PARTS = ['Stimulus', 'Receptor', 'Control centre', 'Effector', 'Response'];

    const LOOPS = [
        {
            id: 'temp', name: 'Too hot', kind: 'negative',
            scene: 'You are running outside in Hong Kong in June. Your core temperature has climbed to 38.2 °C.',
            why: 'Negative. The response — losing heat — pushes the temperature back down towards the set point, which is the opposite direction to the stimulus. "Negative" here means opposing, not bad.',
            parts: [
                'Core body temperature rises above the set point of about 37 °C',
                'Thermoreceptors in the skin, and others inside the hypothalamus itself',
                'The hypothalamus, which compares the reading with the set point',
                'Sweat glands, and the smooth muscle in the arterioles of the skin',
                'Sweating, and vasodilation that brings blood to the surface — heat is lost and temperature falls'
            ],
            axis: { label: 'Core temperature (°C)', set: 37, lo: 35.5, hi: 39.5, unit: '°C' },
            model: { start: 37, disturb: +1.4, k: 0.09 },
            note: 'Note what the graph does not do. It never sits exactly on 37 °C — it oscillates gently around it. A loop that corrects can only correct after the variable has already moved, so a small wobble is not a failure of homeostasis. It is what homeostasis looks like.'
        },
        {
            id: 'glucose', name: 'Blood glucose after a meal', kind: 'negative',
            scene: 'You have just eaten the sandwich from Chapter 1.3. Glucose is pouring into your blood and the concentration has risen from 5 to 8 mmol/L.',
            why: 'Negative. Insulin lowers what a high reading raised. If glucose falls too far instead, the mirror-image loop runs — glucagon is released and the liver breaks glycogen back down.',
            parts: [
                'Blood glucose concentration rises above about 5 mmol/L',
                'The beta cells of the pancreatic islets, which sense glucose directly',
                'The pancreas, which decides which hormone to release',
                'Liver cells and muscle cells, which carry insulin receptors',
                'Insulin is released; cells take glucose in and store it as glycogen; blood glucose falls'
            ],
            axis: { label: 'Blood glucose (mmol/L)', set: 5, lo: 3, hi: 9, unit: ' mmol/L' },
            model: { start: 5, disturb: +3, k: 0.075 },
            note: 'Type 1 diabetes breaks this loop at the control centre — the beta cells are destroyed, so no insulin is released and the effectors are never told. Type 2 breaks it at the effector — insulin is released but the cells stop responding to it. Same loop, two different broken components, and knowing which one it is decides the treatment.'
        },
        {
            id: 'clotting', name: 'A cut finger', kind: 'positive',
            scene: 'You cut your finger on a tin. The vessel wall is torn and the collagen underneath is exposed to the blood.',
            why: 'Positive. Each platelet that sticks releases chemicals that make more platelets stick. The response increases the stimulus instead of opposing it, so the process accelerates — which is exactly what you want when you are bleeding.',
            parts: [
                'A blood vessel is torn and the collagen beneath the lining is exposed',
                'Platelets, which stick to exposed collagen on contact',
                'The clotting cascade in the plasma, centred on the enzyme thrombin',
                'More platelets, and the soluble plasma protein fibrinogen',
                'Stuck platelets release ADP and thromboxane, which attract more platelets, which release more — and thrombin converts fibrinogen to a fibrin mesh'
            ],
            axis: { label: 'Platelets at the wound (relative)', set: 0, lo: 0, hi: 100, unit: '' },
            model: { start: 3, grow: 0.09, cap: 96, endAt: 0.72,
                     endText: 'the hole is sealed — no more collagen is exposed, and the loop loses its stimulus' },
            note: 'Positive feedback is dangerous precisely because it is powerful, so the body fences it in. Healthy vessel lining releases chemicals that stop platelets sticking, which keeps the clot to the damaged patch. When that fencing fails, a clot grows where it is not wanted — that is a thrombosis, and it is why the same mechanism that saves you from a cut can cause a stroke.'
        },
        {
            id: 'vomiting', name: 'Food poisoning', kind: 'positive',
            scene: 'Two hours after a bad meal, bacterial toxin is irritating the lining of your stomach.',
            why: 'Positive. Each retch stretches and irritates the stomach and oesophagus further, which sends more signals to the vomiting centre, which drives a stronger retch. The cycle escalates rather than settling.',
            parts: [
                'Toxin irritates the stomach lining, and the stomach wall is stretched',
                'Chemoreceptors and stretch receptors in the stomach wall, and the chemoreceptor trigger zone in the brainstem',
                'The vomiting centre in the medulla',
                'The diaphragm, the abdominal wall muscles, and the stomach itself',
                'Forceful co-ordinated contraction; each retch irritates and stretches further, so the next one is stronger, until the stomach is emptied'
            ],
            axis: { label: 'Strength of retching (relative)', set: 0, lo: 0, hi: 100, unit: '' },
            model: { start: 5, grow: 0.11, cap: 92, endAt: 0.62,
                     endText: 'the stomach is empty — the irritant is gone and the loop has removed its own stimulus' },
            note: 'This is a self-limiting positive loop, and most of the ones in your body are. It does not run away forever; it runs away just far enough to destroy the thing that started it. That is a very common design in biology — the escalation is the mechanism, and the ending is built into what the escalation achieves.'
        },
        {
            id: 'sneezing', name: 'Pepper in your nose', kind: 'positive',
            scene: 'A speck of pepper lands on the lining inside your nose. There is a faint tickle. Within four seconds it is unbearable.',
            why: 'Positive. The build-up phase feeds itself: irritation triggers signals that increase blood flow and secretion in the nose, which moves the irritant against more sensory endings, which raises the signal further — until it crosses the threshold and fires.',
            parts: [
                'An irritant particle touches the sensitive lining inside the nose',
                'Sensory endings of the trigeminal nerve in the nasal lining',
                'The sneeze centre in the medulla',
                'The diaphragm, the intercostal muscles, and the muscles of the throat and face',
                'A deep breath in, then a sudden explosive breath out through the nose and mouth — the urge builds until it fires, and the blast carries the irritant away'
            ],
            axis: { label: 'Urge to sneeze (relative)', set: 0, lo: 0, hi: 100, unit: '' },
            model: { start: 4, grow: 0.14, cap: 98, endAt: 0.55,
                     endText: 'the sneeze fires and the irritant is gone — the stimulus is removed' },
            note: 'Look at the shape of that curve. Nothing much happens, nothing much happens, and then it is unstoppable. That accelerating shape is the signature of positive feedback, and once you have seen it you will recognise it in graphs that have nothing to do with sneezing — an epidemic, a rumour, a nuclear chain reaction. The mathematics does not care what the thing is.'
        },
        {
            id: 'birth', name: 'Childbirth', kind: 'positive',
            scene: 'Labour has begun. The baby\'s head is resting against the cervix.',
            why: 'Positive. The contraction pushes the head harder into the cervix, which stretches it more, which releases more oxytocin, which causes a stronger contraction. Each turn of the loop makes the next turn larger.',
            parts: [
                'The baby\'s head pushes against the cervix and stretches it',
                'Stretch receptors in the cervix',
                'The hypothalamus, which instructs the posterior pituitary',
                'The muscular wall of the uterus',
                'Oxytocin is released and the uterus contracts, pushing the head harder into the cervix — so the stretch increases and more oxytocin is released'
            ],
            axis: { label: 'Strength of contractions (relative)', set: 0, lo: 0, hi: 100, unit: '' },
            model: { start: 6, grow: 0.075, cap: 94, endAt: 0.88,
                     endText: 'the baby is born — the cervix is no longer stretched, so the loop stops' },
            note: 'Every positive loop in this list ends the same way: by destroying its own stimulus. That is worth stating as a rule, because it answers the question students always ask — why does it not just keep going? It does keep going, right up until the thing causing it no longer exists.'
        }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.fbk { padding:1rem 1.25rem 0.25rem; --f-ok:#2e7d32; --f-bad:#aa272f; --f-accent:var(--light-teal);',
            '   --f-neg:#2f6fb5; --f-pos:#c0392b; }',
            '[data-theme="dark"] .fbk { --f-ok:#7fc98a; --f-bad:#e08a90; --f-neg:#6fa8dc; --f-pos:#e07a80; }',
            '[data-theme="sepia"] .fbk { --f-ok:#4a6b3d; --f-bad:#a04040; }',
            '.fbk-pick { display:flex; flex-wrap:wrap; gap:0.35rem; margin:0 0 0.9rem; }',
            '.fbk-pick button { font:inherit; font-size:0.76rem; padding:0.35rem 0.6rem; border-radius:999px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text); cursor:pointer; }',
            '.fbk-pick button[aria-pressed="true"] { border-color:var(--f-accent); background:var(--f-accent); color:#fff; }',
            '.fbk-pick button.done::after { content:" \\2713"; }',
            '.fbk-phase { font-size:0.62rem; font-weight:700; letter-spacing:0.09em; text-transform:uppercase;',
            '   color:var(--text-secondary); margin:0 0 0.4rem; }',
            '.fbk-scene { font-size:0.88rem; line-height:1.6; margin:0 0 0.9rem; }',
            '.fbk-opt { display:block; width:100%; text-align:left; font:inherit; font-size:0.86rem;',
            '   padding:0.55rem 0.75rem; margin:0 0 0.4rem; border-radius:8px; border:1.5px solid var(--border);',
            '   background:transparent; color:var(--text); cursor:pointer; line-height:1.5; }',
            '.fbk-opt:hover { border-color:var(--f-accent); }',
            '.fbk-opt:focus-visible { outline:2px solid var(--f-accent); outline-offset:2px; }',
            '.fbk-opt.r-ok { border-color:var(--f-ok); background:rgba(46,125,50,0.10); cursor:default; }',
            '.fbk-opt.r-bad { border-color:var(--f-bad); background:rgba(170,39,47,0.08); cursor:default; }',
            '.fbk-slotrow { display:flex; align-items:stretch; gap:0.5rem; margin:0 0 0.35rem; }',
            '.fbk-slotlab { flex:none; width:6.6rem; font-size:0.68rem; font-weight:700; letter-spacing:0.04em;',
            '   text-transform:uppercase; color:var(--text-secondary); display:flex; align-items:center; }',
            '.fbk-slot { flex:1; min-height:36px; font:inherit; font-size:0.82rem; line-height:1.45;',
            '   text-align:left; padding:0.4rem 0.65rem; border-radius:8px; border:1.5px dashed var(--border);',
            '   background:transparent; color:var(--text-secondary); cursor:pointer; }',
            '.fbk-slot.filled { border-style:solid; border-color:var(--f-accent); color:var(--text); }',
            '.fbk-slot.right { border-color:var(--f-ok); background:rgba(46,125,50,0.10); color:var(--text); }',
            '.fbk-slot.wrong { border-color:var(--f-bad); background:rgba(170,39,47,0.08); color:var(--text); }',
            '.fbk-slot:focus-visible { outline:2px solid var(--f-accent); outline-offset:2px; }',
            '.fbk-pool { display:flex; flex-direction:column; gap:0.3rem; margin:0.8rem 0 0; }',
            '.fbk-card { font:inherit; font-size:0.82rem; line-height:1.45; text-align:left; padding:0.4rem 0.65rem;',
            '   border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text);',
            '   cursor:pointer; }',
            '.fbk-card:hover { border-color:var(--f-accent); }',
            '.fbk-card[aria-pressed="true"] { border-color:var(--f-accent); box-shadow:0 0 0 2px var(--f-accent); }',
            '.fbk-label { font-size:0.62rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;',
            '   color:var(--text-secondary); margin:0.8rem 0 0.2rem; }',
            '.fbk-chart { margin:0.8rem 0 0; }',
            '.fbk-chart svg { width:100%; height:auto; }',
            '.fbk-msg { margin:0.8rem 0 0; font-size:0.82rem; line-height:1.55; min-height:1.6em; }',
            '.fbk-msg.ok { color:var(--f-ok); } .fbk-msg.bad { color:var(--f-bad); }',
            '.fbk-note { border:1px solid var(--border); border-left-width:4px; border-radius:8px;',
            '   padding:0.7rem 0.85rem; margin:0.9rem 0 0; font-size:0.84rem; line-height:1.6; }',
            '.fbk-note.neg { border-left-color:var(--f-neg); }',
            '.fbk-note.pos { border-left-color:var(--f-pos); }',
            '.fbk-count { font-size:0.72rem; color:var(--text-secondary); margin:0.6rem 0 0; }',
            '.fbk-reveal { margin-top:1rem; border:1px solid var(--f-accent); border-radius:10px;',
            '   background:rgba(87,120,153,0.10); padding:0.85rem 1rem; }',
            '.fbk-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.fbk-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.fbk-reveal p:last-child { margin-bottom:0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    const shuffled = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);

    /* ---- the two models. Both return an array of {t, v}. ---- */
    function runNegative(m, n) {
        const out = []; let v = m.start;
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            if (i === Math.round(n * 0.12)) v += m.disturb;     // the disturbance arrives
            v += -m.k * (v - m.start);                          // the loop opposes it
            out.push({ t, v });
        }
        return out;
    }
    function runPositive(m, n) {
        const out = []; let v = m.start; let ended = null;
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            if (ended === null) {
                v += m.grow * v * (1 - v / (m.cap * 1.06));      // response feeds the stimulus
                if (t >= m.endAt) { ended = t; }
            } else {
                v += -0.16 * v;                                  // stimulus destroyed, loop collapses
            }
            out.push({ t, v });
        }
        return { series: out, ended };
    }

    window.SIMS['u1-feedback'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'fbk');
        const pick = U.el('div', 'fbk-pick');
        const phaseLab = U.el('p', 'fbk-phase');
        const scene = U.el('p', 'fbk-scene');
        const stage = U.el('div');
        const msg = U.el('p', 'fbk-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const count = U.el('p', 'fbk-count');
        const revealHost = U.el('div');
        [pick, phaseLab, scene, stage, msg, count, revealHost].forEach(n => wrap.appendChild(n));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const checkBtn = U.button(buttons, 'Check my loop', 'primary');
        const runBtn = U.button(buttons, 'Run the loop');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let li = 0;
        let phase = 'classify';            // classify | build | run
        let guess = null;
        let slots = new Array(5).fill(null);
        let pool = [];
        let selected = null;
        let marked = false;
        const done = new Set();

        function reset() {
            li = 0; done.clear();
            loadLoop(0);
            revealHost.innerHTML = '';
        }
        function loadLoop(k) {
            li = k; phase = 'classify'; guess = null; marked = false; selected = null;
            slots = new Array(5).fill(null);
            pool = shuffled(LOOPS[k].parts.slice());
            msg.textContent = ''; msg.className = 'fbk-msg';
            render();
        }

        const built = () => slots.every(Boolean);
        const correct = () => slots.every((v, i) => v === LOOPS[li].parts[i]);

        function render() {
            const L = LOOPS[li];

            pick.innerHTML = '';
            LOOPS.forEach((l, k) => {
                const b = document.createElement('button');
                b.type = 'button'; b.textContent = l.name;
                b.setAttribute('aria-pressed', k === li ? 'true' : 'false');
                if (done.has(l.id)) b.classList.add('done');
                b.addEventListener('click', () => loadLoop(k));
                pick.appendChild(b);
            });

            scene.textContent = L.scene;
            stage.innerHTML = '';
            checkBtn.hidden = true; runBtn.hidden = true;

            if (phase === 'classify') {
                phaseLab.textContent = 'Step 1 of 3 — classify it first';
                [['Negative feedback — the response opposes the change', 'negative'],
                 ['Positive feedback — the response amplifies the change', 'positive']].forEach(([t, v]) => {
                    const b = U.el('button', 'fbk-opt');
                    b.type = 'button';
                    if (guess === null) {
                        b.textContent = t;
                        b.addEventListener('click', () => {
                            guess = v;
                            const got = v === L.kind;
                            msg.textContent = (got ? '' : 'Not this one. ') + L.why;
                            msg.className = 'fbk-msg ' + (got ? 'ok' : 'bad');
                            phase = 'build';
                            render();
                        });
                    } else {
                        b.disabled = true;
                        b.className = 'fbk-opt ' + (v === L.kind ? 'r-ok' : (v === guess ? 'r-bad' : ''));
                        b.textContent = t;
                    }
                    stage.appendChild(b);
                });

            } else if (phase === 'build') {
                phaseLab.textContent = 'Step 2 of 3 — name the five components';
                const box = U.el('div');
                PARTS.forEach((p, i) => {
                    const row = U.el('div', 'fbk-slotrow');
                    const lab = U.el('div', 'fbk-slotlab'); lab.textContent = p;
                    const slot = U.el('button', 'fbk-slot');
                    slot.type = 'button';
                    if (slots[i]) {
                        slot.classList.add('filled');
                        if (marked) slot.classList.add(slots[i] === L.parts[i] ? 'right' : 'wrong');
                        slot.textContent = slots[i];
                        slot.setAttribute('aria-label', p + ': ' + slots[i] + '. Activate to take it back.');
                        slot.addEventListener('click', () => {
                            pool.push(slots[i]); slots[i] = null; marked = false; render();
                        });
                    } else {
                        slot.textContent = 'empty — choose a card below';
                        slot.setAttribute('aria-label', p + ' is empty.');
                        slot.addEventListener('click', () => {
                            if (!selected) return;
                            slots[i] = selected;
                            pool.splice(pool.indexOf(selected), 1);
                            selected = null; marked = false; render();
                        });
                    }
                    row.appendChild(lab); row.appendChild(slot);
                    box.appendChild(row);
                });
                stage.appendChild(box);

                const lab = U.el('p', 'fbk-label');
                lab.textContent = pool.length ? 'Cards still to place' : 'All placed — now commit';
                stage.appendChild(lab);
                const p = U.el('div', 'fbk-pool');
                pool.forEach(v => {
                    const c = U.el('button', 'fbk-card');
                    c.type = 'button'; c.textContent = v;
                    c.setAttribute('aria-pressed', selected === v ? 'true' : 'false');
                    c.addEventListener('click', () => { selected = selected === v ? null : v; render(); });
                    p.appendChild(c);
                });
                stage.appendChild(p);
                checkBtn.hidden = false;
                runBtn.hidden = !(marked && correct());

            } else {
                phaseLab.textContent = 'Step 3 of 3 — run it';
                stage.appendChild(chartFor(L));
                const note = U.el('div', 'fbk-note ' + (L.kind === 'negative' ? 'neg' : 'pos'));
                note.textContent = L.note;
                stage.appendChild(note);
                done.add(L.id);
            }

            count.textContent = done.size + ' of ' + LOOPS.length + ' loops built and run.';
            if (done.size === LOOPS.length) showReveal();
        }

        function chartFor(L) {
            const W = 620, H = 240, pad = { l: 56, r: 16, t: 16, b: 34 };
            const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
            const a = L.axis;
            const neg = L.kind === 'negative';
            const N = 200;
            const res = neg ? { series: runNegative(L.model, N), ended: null }
                            : runPositive(L.model, N);
            const y = v => pad.t + ph - ((v - a.lo) / (a.hi - a.lo)) * ph;
            const x = t => pad.l + t * pw;
            const pts = res.series.map(p => x(p.t).toFixed(1) + ',' + y(p.v).toFixed(1)).join(' ');
            const colour = neg ? 'var(--f-neg)' : 'var(--f-pos)';

            const gridVals = [];
            for (let i = 0; i <= 4; i++) gridVals.push(a.lo + (a.hi - a.lo) * i / 4);

            const host = U.el('div', 'fbk-chart');
            host.innerHTML =
                '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
                esc(a.label + ' plotted against time for the ' + L.name + ' loop. ' +
                    (neg ? 'The value is pushed away from the set point and the loop brings it back.'
                         : 'The value accelerates upwards until the loop removes its own stimulus and collapses.')) + '">' +
                gridVals.map(v => '<line x1="' + pad.l + '" y1="' + y(v).toFixed(1) + '" x2="' + (pad.l + pw) +
                    '" y2="' + y(v).toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>' +
                    '<text x="' + (pad.l - 8) + '" y="' + (y(v) + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" ' +
                    'fill="var(--text-secondary)">' + (Math.abs(a.hi - a.lo) < 12 ? v.toFixed(1) : v.toFixed(0)) + '</text>').join('') +
                (neg ? '<line x1="' + pad.l + '" y1="' + y(a.set).toFixed(1) + '" x2="' + (pad.l + pw) +
                    '" y2="' + y(a.set).toFixed(1) + '" stroke="var(--text-secondary)" stroke-width="1.5" ' +
                    'stroke-dasharray="5 4"/><text x="' + (pad.l + pw - 4) + '" y="' + (y(a.set) - 6).toFixed(1) +
                    '" text-anchor="end" font-size="10" fill="var(--text-secondary)">set point ' + a.set + a.unit + '</text>' : '') +
                '<polyline points="' + pts + '" fill="none" stroke="' + colour + '" stroke-width="2.5" ' +
                'stroke-linejoin="round"/>' +
                (res.ended !== null
                    ? '<line x1="' + x(res.ended).toFixed(1) + '" y1="' + pad.t + '" x2="' + x(res.ended).toFixed(1) +
                      '" y2="' + (pad.t + ph) + '" stroke="var(--text-secondary)" stroke-width="1" stroke-dasharray="3 3"/>'
                    : '') +
                '<line x1="' + pad.l + '" y1="' + (pad.t + ph) + '" x2="' + (pad.l + pw) + '" y2="' + (pad.t + ph) +
                '" stroke="var(--text-secondary)" stroke-width="1"/>' +
                '<text x="' + (pad.l + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" ' +
                'fill="var(--text-secondary)">time</text>' +
                '<text transform="translate(14,' + (pad.t + ph / 2) + ') rotate(-90)" text-anchor="middle" ' +
                'font-size="11" fill="var(--text-secondary)">' + esc(a.label) + '</text>' +
                '</svg>';

            const cap = U.el('p', 'fbk-count');
            cap.textContent = neg
                ? 'The disturbance arrives early on. Everything after it is the loop working: the further the value is from the set point, the harder the loop pulls, so it comes back and then holds.'
                : 'Nothing much, then everything. The curve accelerates because the response feeds the stimulus — until ' + L.model.endText + ', and the loop has nothing left to amplify.';
            host.appendChild(cap);
            return host;
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const d = U.el('div', 'fbk-reveal');
            d.innerHTML =
                '<h5>Two shapes, and how to tell them apart in one question</h5>' +
                '<p>You have now built six loops out of the same five components. The components never ' +
                'changed — stimulus, receptor, control centre, effector, response — and neither did the ' +
                'wiring. Only one thing differed, and it is the only thing you ever have to check:</p>' +
                '<p><strong>Does the response push the variable back towards where it started, or further ' +
                'away from it?</strong> Back is negative feedback and you get a wobbling line that settles. ' +
                'Further away is positive feedback and you get a curve that accelerates.</p>' +
                '<p>Almost everything your body regulates uses the negative kind, because staying alive ' +
                'means staying in range. The positive ones are reserved for the handful of jobs where ' +
                'the point is <em>not</em> to stay in range — sealing a wound, expelling a poison, ' +
                'delivering a baby. Every one of them ends by destroying the thing that started it.</p>';
            revealHost.appendChild(d);
        }

        checkBtn.addEventListener('click', () => {
            if (!built()) {
                msg.textContent = 'Place all five cards first.';
                msg.className = 'fbk-msg bad'; return;
            }
            marked = true;
            if (correct()) {
                msg.textContent = 'All five in the right role. Now run it and watch what the loop does to the variable.';
                msg.className = 'fbk-msg ok';
            } else {
                const bad = slots.findIndex((v, i) => v !== LOOPS[li].parts[i]);
                msg.textContent = 'Not yet. Look at the ' + PARTS[bad].toLowerCase() + ' row. ' +
                    hint(PARTS[bad]);
                msg.className = 'fbk-msg bad';
            }
            render();
        });
        runBtn.addEventListener('click', () => { phase = 'run'; render(); });
        resetBtn.addEventListener('click', reset);
        reset();

        function hint(part) {
            return ({
                'Stimulus': 'The stimulus is the change itself — what moved, not what noticed it.',
                'Receptor': 'The receptor is whatever detects the change. It is a structure, not an action.',
                'Control centre': 'The control centre compares the reading with what it should be and decides what to do.',
                'Effector': 'The effector is the muscle, gland or cell that carries the instruction out.',
                'Response': 'The response is what the effector actually does, and its effect on the variable.'
            })[part] || '';
        }

        // ---------------- verification hooks ----------------
        root._simState = () => ({
            loop: LOOPS[li].id, kind: LOOPS[li].kind, phase, guess,
            guessCorrect: guess === LOOPS[li].kind,
            slots: slots.slice(), built: built(), correct: correct(), marked,
            completed: [...done], allComplete: done.size === LOOPS.length
        });
        root._simSolve = () => {
            const L = LOOPS[li];
            if (phase === 'classify') { guess = L.kind; phase = 'build'; }
            slots = L.parts.slice(); pool = []; marked = true; selected = null;
            if (phase === 'build') phase = 'run';
            msg.textContent = 'Filled in.'; msg.className = 'fbk-msg ok';
            render();
        };
    };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
})();
