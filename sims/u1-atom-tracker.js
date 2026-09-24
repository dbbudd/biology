/* =============================================================
   INTERACTIVE — Atom tracker
   -------------------------------------------------------------
   Registers window.SIMS['u1-atom-tracker'].  Supports HS-LS1-6.

   HS-LS1-6 asks for an explanation of how carbon, hydrogen and
   oxygen from sugar combine with other elements to build amino
   acids and other large carbon-based molecules. The source decks
   teach condensation and hydrolysis and stop there — the
   atom-tracking itself is taught nowhere, so it is built here.

   The reader takes one glucose molecule apart and follows its
   six carbon atoms to two different destinations: a fatty acid,
   and an amino acid. The carbon ledger on screen is recomputed
   from the pool after every step, so it cannot fail to balance
   and cannot be fudged. Where a needed element is missing —
   nitrogen — the reader has to say where it comes from before
   the pathway will continue, because that is the exact question
   the standard asks and the one the POGIL never answers.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u1-atom-style';

    /* Every formula below was checked for balance in Node before it was
       written here. See the chapter for the worked equations. */
    const MOL = {
        glucose:  { label: 'glucose',        formula: 'C6H12O6', c: 6 },
        pyruvate: { label: 'pyruvate',       formula: 'C3H4O3',  c: 3 },
        acetyl:   { label: 'acetyl group',   formula: 'C2H3O',   c: 2 },
        co2:      { label: 'carbon dioxide', formula: 'CO2',     c: 1 },
        palmitic: { label: 'palmitic acid',  formula: 'C16H32O2', c: 16 },
        alanine:  { label: 'alanine',        formula: 'C3H7NO2', c: 3 }
    };

    const OPENER = {
        q: 'Before you start. An amino acid contains nitrogen. Glucose does not. So when your body builds an amino acid out of sugar, where does the nitrogen come from?',
        options: [
            { t: 'From the nitrogen gas in the air you breathe in', ok: false,
              why: 'Almost 80 per cent of every breath you take is nitrogen gas, and you breathe every molecule of it straight back out. The triple bond in N₂ is one of the strongest in chemistry, and no animal has an enzyme that can break it. Only certain bacteria can — everything else in the living world depends on them for its nitrogen.' },
            { t: 'From the protein in your food, passed along from one amino acid to another', ok: true,
              why: 'Correct. You dismantled protein into amino acids in Chapter 1.3; the nitrogen in those amino acids is the pool your body draws on. An enzyme moves an amino group from one molecule to another — a reaction called transamination — so nitrogen is passed around rather than made.' },
            { t: 'It is made from carbon and hydrogen inside the cell', ok: false,
              why: 'Elements cannot be made from other elements by any chemical reaction. That takes a star. If an atom of nitrogen is in your muscle, an atom of nitrogen came in through your mouth.' },
            { t: 'From water', ok: false,
              why: 'Water is H₂O — hydrogen and oxygen only. It supplies both of those generously, and no nitrogen at all.' }
        ]
    };

    const PATHS = {
        fat: {
            name: 'Glucose → a fatty acid',
            intro: 'You have eaten more sugar than you need right now. Follow the carbon atoms of one glucose molecule as your body converts the surplus into fat for storage.',
            target: 'palmitic',
            steps: [
                { q: 'Step 1. The first thing that happens to glucose is that it is cut in half. What do you get?',
                  options: [
                    { t: 'Two molecules of pyruvate, three carbons each', ok: true,
                      why: 'C6H12O6 becomes two molecules of C3H4O3, plus four hydrogen atoms carried away. Six carbons in, six carbons out — nothing has been lost yet, it has only been divided.' },
                    { t: 'One molecule of pyruvate, six carbons', ok: false,
                      why: 'Pyruvate is a three-carbon molecule. Cutting a six-carbon sugar in half gives you two of them.' },
                    { t: 'Six molecules of carbon dioxide', ok: false,
                      why: 'That is what happens if the glucose is burned all the way down for energy. You are not burning it here — you are rebuilding it into something else, and you need to keep the carbon.' },
                    { t: 'Three molecules of acetyl group, two carbons each', ok: false,
                      why: 'Right total, wrong route. Glucose does not go straight to acetyl groups; it goes to pyruvate first, and something important happens on the way.' }
                  ],
                  apply: p => ({ ...p, pool: [['pyruvate', 2]] })
                },
                { q: 'Step 2. Each pyruvate now enters the mitochondrion and is converted to an acetyl group. What happens to its carbon?',
                  options: [
                    { t: 'One carbon leaves as carbon dioxide, leaving a two-carbon acetyl group', ok: true,
                      why: 'This is the step that decides how much of your sugar can become fat. Every three-carbon pyruvate gives up one carbon as CO₂ — which you breathe out — and only two carbons carry on. A third of the carbon is gone before fat building even starts.' },
                    { t: 'Nothing is lost — pyruvate becomes a three-carbon acetyl group', ok: false,
                      why: 'An acetyl group has two carbons, not three. The missing one has to go somewhere, and it goes out through your lungs.' },
                    { t: 'Two carbons leave as carbon dioxide, leaving one', ok: false,
                      why: 'Only one carbon is removed at this step. A one-carbon unit could not build a fatty acid chain in two-carbon steps.' },
                    { t: 'A carbon is added from carbon dioxide in the blood', ok: false,
                      why: 'Animals cannot build sugar or fat out of CO₂. That is photosynthesis, and it is Unit 2 — and plants, not you.' }
                  ],
                  apply: p => ({ ...p, pool: [['acetyl', 2]], released: p.released + 2 })
                },
                { q: 'Step 3. Acetyl groups are joined end to end, two carbons at a time, to build the chain of a fatty acid. Palmitic acid is C16H32O2. How many acetyl groups does one molecule of it take?',
                  options: [
                    { t: '8', ok: true,
                      why: '16 carbons ÷ 2 carbons per acetyl group = 8. This is why almost every fatty acid in your body has an even number of carbons — they are built two at a time, so an odd number is nearly impossible to reach.' },
                    { t: '16', ok: false, why: 'That would give 32 carbons. Each acetyl group contributes two, not one.' },
                    { t: '4', ok: false, why: 'Four acetyl groups make an 8-carbon chain, half the length of palmitic acid.' },
                    { t: '32', ok: false, why: 'Far too many — that would build a 64-carbon chain.' }
                  ],
                  apply: p => ({ ...p, need: 8 })
                },
                { q: 'Step 4. One glucose gave you two acetyl groups. So how many glucose molecules does one palmitic acid take?',
                  options: [
                    { t: '4', ok: true,
                      why: 'Eight acetyl groups, two per glucose, so four glucose molecules. Four glucose contain 24 carbon atoms: 16 of them end up in the fat, and 8 have already left as carbon dioxide.' },
                    { t: '8', ok: false, why: 'Eight glucose would give sixteen acetyl groups — enough for two palmitic acids.' },
                    { t: '2', ok: false, why: 'Two glucose give four acetyl groups, which builds an 8-carbon chain.' },
                    { t: '16', ok: false, why: 'Far too many. Check how many acetyl groups one glucose provides.' }
                  ],
                  apply: p => ({ ...p, pool: [['palmitic', 1]], released: 8, started: 4 })
                }
            ],
            close: 'Every one of the sixteen carbon atoms in that fat molecule was, an hour ago, part of a sugar molecule in your food. Nothing was created. The atoms were taken apart and reassembled — and eight of the twenty-four were breathed out along the way.'
        },
        amino: {
            name: 'Glucose → an amino acid',
            intro: 'Now the harder one, and the one the standard actually asks for. Follow the carbon atoms of one glucose molecule into an amino acid — alanine, C3H7NO2.',
            target: 'alanine',
            steps: [
                { q: 'Step 1. Same start. Glucose is cut in half. What do you get?',
                  options: [
                    { t: 'Two molecules of pyruvate, three carbons each', ok: true,
                      why: 'Exactly as before. Notice that the two very different destinations share their first step — the cell keeps its options open for as long as it can.' },
                    { t: 'Two molecules of alanine', ok: false,
                      why: 'Not yet. Compare the formulae: pyruvate is C3H4O3 and alanine is C3H7NO2. Same three carbons — but alanine has something pyruvate does not.' },
                    { t: 'Six carbon dioxide molecules', ok: false, why: 'That is burning it, not building with it.' },
                    { t: 'One molecule of pyruvate, six carbons', ok: false, why: 'Pyruvate has three carbons.' }
                  ],
                  apply: p => ({ ...p, pool: [['pyruvate', 2]] })
                },
                { q: 'Step 2. Line the two formulae up. Pyruvate is C3H4O3. Alanine is C3H7NO2. What is pyruvate missing?',
                  options: [
                    { t: 'Nitrogen', ok: true,
                      why: 'The carbon count already matches — three and three. Alanine is essentially a pyruvate molecule with a nitrogen-containing amino group bolted on where an oxygen used to be. That single atom is the difference between a sugar breakdown product and a building block of protein.' },
                    { t: 'Carbon', ok: false, why: 'Both have three carbons. Count them in the formulae.' },
                    { t: 'Oxygen', ok: false,
                      why: 'The other way round — pyruvate has three oxygens and alanine has two. Alanine has fewer, not more.' },
                    { t: 'Nothing — they are the same molecule written differently', ok: false,
                      why: 'C3H4O3 and C3H7NO2 are different formulae with different atoms. Read the N.' }
                  ],
                  apply: p => ({ ...p, missing: 'N' })
                },
                { q: 'Step 3. So where does your cell get that nitrogen atom?',
                  options: [
                    { t: 'An amino group is transferred from another amino acid, usually glutamate', ok: true,
                      why: 'The reaction is called transamination, and it is how your body shuffles nitrogen between molecules. Glutamate acts as the cell\'s nitrogen currency: it hands its amino group to pyruvate, becomes a keto acid itself, and is recharged later from other amino acids that arrived in your food.' },
                    { t: 'From nitrogen gas dissolved in the blood', ok: false,
                      why: 'You cannot break the triple bond in N₂. Neither can any animal. Nitrogen-fixing bacteria can, and everything you eat traces its nitrogen back to them.' },
                    { t: 'It is built from three hydrogen atoms', ok: false,
                      why: 'Three hydrogens make part of an ammonia molecule, NH₃ — but the nitrogen atom in it still has to come from somewhere, and chemistry cannot make one.' },
                    { t: 'From carbon dioxide', ok: false, why: 'CO₂ contains carbon and oxygen. No nitrogen.' }
                  ],
                  apply: p => ({ ...p, nitrogen: true })
                },
                { q: 'Step 4. Put it together. Which of these is the balanced reaction?',
                  options: [
                    { t: 'C3H4O3 + NH3 + 2[H] → C3H7NO2 + H2O', ok: true,
                      why: 'Count each element on both sides. Left: 3 C, 4+3+2 = 9 H, 1 N, 3 O. Right: 3 C, 7+2 = 9 H, 1 N, 2+1 = 3 O. Balanced. The two hydrogen atoms come from a carrier molecule, and the spare oxygen leaves as water.' },
                    { t: 'C3H4O3 + NH3 → C3H7NO2', ok: false,
                      why: 'Count the hydrogens: 4 + 3 = 7 on the left, 7 on the right — but the oxygens are 3 on the left and 2 on the right. An oxygen atom has vanished. Atoms do not vanish.' },
                    { t: 'C3H4O3 + N2 → C3H7NO2 + H2O', ok: false,
                      why: 'Two problems. You cannot use N₂, and the equation has two nitrogen atoms on the left and one on the right.' },
                    { t: 'C6H12O6 + NH3 → C3H7NO2 + H2O', ok: false,
                      why: 'Six carbons on the left, three on the right. Half the carbon has disappeared without going anywhere.' }
                  ],
                  apply: p => ({ ...p, pool: [['alanine', 2]] })
                }
            ],
            close: 'Three of the six carbon atoms in that glucose are now inside an amino acid, and the other three are inside a second one. Add that amino acid to a growing chain and it is protein. That is the whole of HS-LS1-6 in one sentence: carbon, hydrogen and oxygen from a sugar, joined with an element that came in separately, makes a large carbon-based molecule that the sugar could never have made alone.'
        }
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.atm { padding:1rem 1.25rem 0.25rem; --a-ok:#2e7d32; --a-bad:#aa272f; --a-accent:var(--light-teal);',
            '   --a-c:#2f6fb5; --a-n:#7d4fa8; }',
            '[data-theme="dark"] .atm { --a-ok:#7fc98a; --a-bad:#e08a90; --a-c:#6fa8dc; --a-n:#b08ad8; }',
            '[data-theme="sepia"] .atm { --a-ok:#4a6b3d; --a-bad:#a04040; }',
            '.atm-pick { display:flex; flex-wrap:wrap; gap:0.35rem; margin:0 0 0.9rem; }',
            '.atm-pick button { font:inherit; font-size:0.78rem; padding:0.35rem 0.65rem; border-radius:999px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text); cursor:pointer; }',
            '.atm-pick button[aria-pressed="true"] { border-color:var(--a-accent); background:var(--a-accent); color:#fff; }',
            '.atm-pick button.done::after { content:" \\2713"; }',
            '.atm-h { font-size:0.62rem; font-weight:700; letter-spacing:0.09em; text-transform:uppercase;',
            '   color:var(--text-secondary); margin:0 0 0.4rem; }',
            '.atm-lead { font-size:0.86rem; line-height:1.6; margin:0 0 0.9rem; }',
            '.atm-pool { border:1px solid var(--border); border-radius:10px; padding:0.75rem 0.85rem;',
            '   background:var(--bg-surface); margin:0 0 0.9rem; }',
            '.atm-pool h6 { margin:0 0 0.55rem; font-size:0.66rem; letter-spacing:0.07em; text-transform:uppercase;',
            '   color:var(--text-secondary); font-weight:700; }',
            '.atm-mols { display:flex; flex-wrap:wrap; gap:0.5rem; }',
            '.atm-mol { border:1px solid var(--border); border-radius:8px; padding:0.4rem 0.55rem; background:var(--bg);',
            '   min-width:96px; }',
            '.atm-mol b { display:block; font-size:0.78rem; }',
            '.atm-mol code { font-size:0.72rem; color:var(--text-secondary); }',
            '.atm-dots { display:flex; flex-wrap:wrap; gap:2px; margin-top:0.3rem; max-width:120px; }',
            '.atm-dot { width:8px; height:8px; border-radius:50%; background:var(--a-c); }',
            '.atm-dot.n { background:var(--a-n); }',
            '.atm-ledger { font-size:0.8rem; line-height:1.7; margin:0.7rem 0 0; padding-top:0.6rem;',
            '   border-top:1px solid var(--border); color:var(--text-secondary); }',
            '.atm-ledger b { color:var(--text); font-variant-numeric:tabular-nums; }',
            '.atm-ledger .bal { color:var(--a-ok); font-weight:700; }',
            '.atm-q { font-size:0.88rem; font-weight:700; line-height:1.5; margin:0.5rem 0 0.55rem; }',
            '.atm-opt { display:block; width:100%; text-align:left; font:inherit; font-size:0.85rem;',
            '   line-height:1.5; padding:0.55rem 0.7rem; margin:0 0 0.35rem; border-radius:8px;',
            '   border:1.5px solid var(--border); background:transparent; color:var(--text); cursor:pointer; }',
            '.atm-opt:hover { border-color:var(--a-accent); }',
            '.atm-opt:focus-visible { outline:2px solid var(--a-accent); outline-offset:2px; }',
            '.atm-opt.r-ok { border-color:var(--a-ok); background:rgba(46,125,50,0.10); cursor:default; }',
            '.atm-opt.r-bad { border-color:var(--a-bad); background:rgba(170,39,47,0.07); cursor:default; }',
            '.atm-why { display:block; margin-top:0.4rem; font-size:0.78rem; line-height:1.6; color:var(--text-secondary); }',
            '.atm-msg { margin:0.8rem 0 0; font-size:0.82rem; line-height:1.55; min-height:1.6em; }',
            '.atm-msg.ok { color:var(--a-ok); } .atm-msg.bad { color:var(--a-bad); }',
            '.atm-close { border:1px solid var(--a-ok); border-radius:10px; background:rgba(46,125,50,0.08);',
            '   padding:0.8rem 0.95rem; margin:0.9rem 0 0; font-size:0.85rem; line-height:1.65; }',
            '[data-theme="dark"] .atm-close { background:rgba(127,201,138,0.12); }',
            '.atm-reveal { margin-top:1rem; border:1px solid var(--a-accent); border-radius:10px;',
            '   background:rgba(87,120,153,0.10); padding:0.85rem 1rem; }',
            '.atm-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.atm-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.6; }',
            '.atm-reveal p:last-child { margin-bottom:0; }',
            '.atm-count { font-size:0.72rem; color:var(--text-secondary); margin:0.6rem 0 0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u1-atom-tracker'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'atm');
        const pick = U.el('div', 'atm-pick');
        const phaseLab = U.el('p', 'atm-h');
        const lead = U.el('p', 'atm-lead');
        const poolBox = U.el('div', 'atm-pool');
        const stage = U.el('div');
        const msg = U.el('p', 'atm-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const count = U.el('p', 'atm-count');
        const revealHost = U.el('div');
        [pick, phaseLab, lead, poolBox, stage, msg, count, revealHost].forEach(n => wrap.appendChild(n));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        const wrongMarks = {};
        let opened = null;             // index chosen for the opening question
        let path = 'fat';
        let step = 0;
        let chosen = {};               // "path:step" -> index chosen
        let state = fresh();
        const done = new Set();

        function fresh() { return { pool: [['glucose', 1]], released: 0, started: 1, need: 0, nitrogen: false, missing: null }; }

        function reset() {
            opened = null; path = 'fat'; step = 0; chosen = {}; state = fresh(); done.clear();
            Object.keys(wrongMarks).forEach(k => delete wrongMarks[k]);
            revealHost.innerHTML = '';
            msg.textContent = ''; msg.className = 'atm-msg';
            render();
        }
        function loadPath(p) {
            path = p; step = 0; state = fresh();
            Object.keys(chosen).forEach(k => { if (k.indexOf(p + ':') === 0) delete chosen[k]; });
            Object.keys(wrongMarks).forEach(k => { if (k.indexOf(p + ':') === 0) delete wrongMarks[k]; });
            msg.textContent = ''; msg.className = 'atm-msg';
            render();
        }

        function carbonIn() { return state.started * MOL.glucose.c; }
        function carbonHeld() { return state.pool.reduce((s, [k, n]) => s + MOL[k].c * n, 0); }
        function carbonOut() { return state.released * MOL.co2.c; }

        function render() {
            // ---- opening question gates everything ----
            if (opened === null) {
                pick.hidden = true; poolBox.hidden = true; count.hidden = true;
                phaseLab.textContent = 'First, one question';
                lead.textContent = OPENER.q;
                stage.innerHTML = '';
                OPENER.options.forEach((o, k) => {
                    const b = U.el('button', 'atm-opt');
                    b.type = 'button'; b.textContent = o.t;
                    b.addEventListener('click', () => {
                        opened = k;
                        msg.textContent = (o.ok ? '' : 'Not this one. ') + o.why;
                        msg.className = 'atm-msg ' + (o.ok ? 'ok' : 'bad');
                        render();
                    });
                    stage.appendChild(b);
                });
                return;
            }
            pick.hidden = false; poolBox.hidden = false; count.hidden = false;

            const P = PATHS[path];

            pick.innerHTML = '';
            Object.entries(PATHS).forEach(([k, p]) => {
                const b = document.createElement('button');
                b.type = 'button'; b.textContent = p.name;
                b.setAttribute('aria-pressed', k === path ? 'true' : 'false');
                if (done.has(k)) b.classList.add('done');
                b.addEventListener('click', () => loadPath(k));
                pick.appendChild(b);
            });

            phaseLab.textContent = 'Step ' + Math.min(step + 1, P.steps.length) + ' of ' + P.steps.length;
            lead.textContent = P.intro;

            // ---- pool + ledger ----
            poolBox.innerHTML = '<h6>What you are holding</h6>';
            const mols = U.el('div', 'atm-mols');
            state.pool.forEach(([k, n]) => {
                const m = MOL[k];
                const card = U.el('div', 'atm-mol');
                let dots = '';
                for (let i = 0; i < m.c * n; i++) dots += '<span class="atm-dot"></span>';
                if (k === 'alanine') for (let i = 0; i < n; i++) dots += '<span class="atm-dot n"></span>';
                card.innerHTML = '<b>' + n + ' × ' + m.label + '</b><code>' + m.formula + '</code>' +
                    '<div class="atm-dots" aria-hidden="true">' + dots + '</div>';
                mols.appendChild(card);
            });
            if (state.released) {
                const card = U.el('div', 'atm-mol');
                let dots = '';
                for (let i = 0; i < state.released; i++) dots += '<span class="atm-dot"></span>';
                card.innerHTML = '<b>' + state.released + ' × ' + MOL.co2.label + '</b><code>CO2 — breathed out</code>' +
                    '<div class="atm-dots" aria-hidden="true">' + dots + '</div>';
                card.style.opacity = '0.6';
                mols.appendChild(card);
            }
            poolBox.appendChild(mols);
            const led = U.el('p', 'atm-ledger');
            const held = carbonHeld(), out = carbonOut(), inC = carbonIn();
            led.innerHTML = 'Carbon ledger — started with <b>' + inC + '</b> carbon atoms from <b>' +
                state.started + '</b> glucose. Still held: <b>' + held + '</b>. Left as CO₂: <b>' + out + '</b>. ' +
                '<span class="bal">' + held + ' + ' + out + ' = ' + (held + out) +
                (held + out === inC ? ' ✓ balanced' : ' — check this') + '</span>' +
                (state.nitrogen ? '<br>Nitrogen atoms brought in from an amino acid in your food: <b>2</b> (purple).' : '');
            poolBox.appendChild(led);

            // ---- steps ----
            stage.innerHTML = '';
            if (step >= P.steps.length) {
                const box = U.el('div', 'atm-close');
                box.innerHTML = '<strong>Pathway complete.</strong> ' + esc(P.close);
                stage.appendChild(box);
                done.add(path);
            } else {
                const S = P.steps[step];
                const q = U.el('p', 'atm-q');
                q.textContent = S.q;
                stage.appendChild(q);
                const key = path + ':' + step;
                const bad = wrongMarks[key] || new Set();
                S.options.forEach((o, k) => {
                    const b = U.el('button', 'atm-opt');
                    b.type = 'button';
                    if (bad.has(k)) {
                        b.disabled = true;
                        b.className = 'atm-opt r-bad';
                        b.innerHTML = esc(o.t) + '<span class="atm-why">' + esc(o.why) + '</span>';
                    } else {
                        b.textContent = o.t;
                        b.addEventListener('click', () => {
                            msg.textContent = o.ok ? 'Correct.' : 'Not that one — read why, then choose again.';
                            msg.className = 'atm-msg ' + (o.ok ? 'ok' : 'bad');
                            if (o.ok) { chosen[key] = k; state = S.apply(state); step++; }
                            else markWrong(key, k);
                            render();
                        });
                    }
                    stage.appendChild(b);
                });
            }

            // once a step is passed, keep its explanation visible above the next one
            if (step > 0 && step <= P.steps.length) {
                const prev = P.steps[step - 1];
                const ok = prev.options.find(o => o.ok);
                const rec = U.el('div', 'atm-opt r-ok');
                rec.innerHTML = '<strong>' + esc(ok.t) + '</strong><span class="atm-why">' + esc(ok.why) + '</span>';
                stage.insertBefore(rec, stage.firstChild);
            }

            count.textContent = done.size + ' of ' + Object.keys(PATHS).length + ' pathways followed.';
            if (done.size === Object.keys(PATHS).length) showReveal();
        }

        function markWrong(key, k) {
            wrongMarks[key] = wrongMarks[key] || new Set();
            wrongMarks[key].add(k);
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const d = U.el('div', 'atm-reveal');
            d.innerHTML =
                '<h5>What the ledger was for</h5>' +
                '<p>It never went out of balance. Not once, on either pathway. Every carbon atom that ' +
                'started in a glucose molecule ended up either in the product or in the carbon dioxide you ' +
                'breathed out — and that is not a rule about biology, it is a rule about matter. ' +
                'Atoms are rearranged; they are never created, destroyed or converted into other elements.</p>' +
                '<p>The two pathways differed in exactly one way. Fat needed nothing but the carbon, ' +
                'hydrogen and oxygen the sugar already had. The amino acid needed a nitrogen atom, and ' +
                'there was no way to get one out of glucose — it had to come in from outside, from protein ' +
                'you ate, from an animal or plant that got it from a bacterium that pulled it out of the air.</p>' +
                '<p>That is also why nine of the twenty amino acids are called <strong>essential</strong>. ' +
                'It is not that they matter more. It is that your body cannot build their carbon skeletons ' +
                'from sugar at all, so they have to arrive already made. Everything you are is either ' +
                'rearranged food or arrived as food and stayed that shape.</p>';
            revealHost.appendChild(d);
        }

        resetBtn.addEventListener('click', reset);
        reset();

        // ---------------- verification hooks ----------------
        root._simState = () => ({
            opened, openerCorrect: opened !== null && OPENER.options[opened].ok,
            path, step, stepsInPath: PATHS[path].steps.length,
            pathComplete: step >= PATHS[path].steps.length,
            pool: state.pool.map(([k, n]) => n + '×' + MOL[k].formula),
            carbonStarted: carbonIn(), carbonHeld: carbonHeld(), carbonReleased: carbonOut(),
            ledgerBalances: carbonHeld() + carbonOut() === carbonIn(),
            completed: [...done], allComplete: done.size === Object.keys(PATHS).length
        });
        root._simSolve = () => {
            if (opened === null) opened = OPENER.options.findIndex(o => o.ok);
            const P = PATHS[path];
            while (step < P.steps.length) {
                const S = P.steps[step];
                chosen[path + ':' + step] = S.options.findIndex(o => o.ok);
                state = S.apply(state);
                step++;
            }
            msg.textContent = 'Pathway filled in.'; msg.className = 'atm-msg ok';
            render();
        };
    };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
})();
