/* =============================================================
   INTERACTIVE — Follow the sandwich
   -------------------------------------------------------------
   Registers window.SIMS['u1-digestion'].  Supports HS-LS1-2.

   One cheese sandwich, six compartments. At each compartment the
   reader decides which statements are true *there*, commits the
   whole set, and only then finds out. The distractors are not
   filler: every one of them is a claim that appears somewhere in
   the source slides or in a typical exam answer, including three
   the source decks get wrong —

     · pepsin makes peptides, not free amino acids
     · bile emulsifies; pancreatic hydrogencarbonate neutralises
     · glucose crosses via SGLT1, not via aquaporins

   The meal panel is computed from the model, never typed, so what
   the reader is told and what the sim shows cannot drift apart.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u1-digestion-style';

    /* The meal. `state` is rewritten by each stage's `effect`. */
    const MEAL0 = {
        starch: 'Starch — long chains of glucose (the bread)',
        protein: 'Protein — long folded chains of amino acids (the cheese)',
        fat: 'Fat — large triglyceride globules (the butter)',
        water: 'Water — mixed through the whole meal'
    };

    const STAGES = [
        {
            id: 'mouth', name: 'Mouth', system: 'Ingestion begins',
            blurb: 'You bite, chew and swallow. Two kinds of digestion start here at once.',
            options: [
                { t: 'Teeth cut and grind the food into smaller pieces — mechanical digestion.', ok: true,
                  why: 'Incisors cut, canines tear, premolars and molars crush. Nothing is chemically changed yet; the pieces are simply smaller, which matters because enzymes can only work on a surface.' },
                { t: 'Salivary amylase starts breaking starch down into maltose.', ok: true,
                  why: 'Amylase is the only digestive enzyme in saliva that matters here. It cuts the long starch chains into the two-glucose sugar maltose. This is why a plain cracker turns sweet if you hold it in your mouth.' },
                { t: 'Saliva lubricates the food so it can be swallowed as a bolus.', ok: true,
                  why: 'Mucus in saliva binds the chewed food into one slippery lump — the bolus. Without it, swallowing dry food is genuinely difficult.' },
                { t: 'Protein digestion begins in the mouth.', ok: false,
                  why: 'There is no protein-digesting enzyme in saliva. The cheese leaves your mouth chemically untouched — only physically broken up. Protein digestion waits for the stomach.' },
                { t: 'Nutrients are absorbed into the blood through the lining of the mouth.', ok: false,
                  why: 'Almost nothing is absorbed here. A few drugs are designed to cross under the tongue, but food is not — it has not been broken down small enough yet.' }
            ],
            effect: m => ({ ...m,
                starch: 'Starch part-cut into maltose by amylase; pieces physically smaller',
                protein: 'Protein — physically broken up, chemically unchanged',
                fat: 'Fat — physically broken up, chemically unchanged',
                water: 'Water — plus about 1.5 L of saliva added per day' })
        },
        {
            id: 'oesophagus', name: 'Oesophagus', system: 'Transport only',
            blurb: 'A muscular tube about 25 cm long, running from the throat to the stomach.',
            options: [
                { t: 'Rings of muscle squeeze behind the bolus and push it down — peristalsis.', ok: true,
                  why: 'Circular muscle contracts behind the bolus and relaxes in front of it, so a wave travels down the tube. It is not gravity: an astronaut can swallow, and so can you standing on your head.' },
                { t: 'The epiglottis folds over the trachea so food does not enter the airway.', ok: true,
                  why: 'The trachea and the oesophagus both open off the pharynx. The epiglottis is the flap that closes the wrong one. When it fails, you cough — which is the reflex that clears it.' },
                { t: 'No chemical digestion happens in the oesophagus.', ok: true,
                  why: 'The oesophagus secretes mucus and nothing else. It is plumbing. The swallowed amylase carries on working inside the bolus for a while, but the oesophagus itself adds no enzyme.' },
                { t: 'The oesophagus absorbs water from the bolus.', ok: false,
                  why: 'It does not. Food is in the oesophagus for a few seconds — there is no time, and no absorbing surface. Water absorption happens far further down.' }
            ],
            effect: m => m
        },
        {
            id: 'stomach', name: 'Stomach', system: 'Acid and protein',
            blurb: 'A muscular bag holding roughly 1 litre, lined with folds called rugae and full of acid at about pH 2.',
            options: [
                { t: 'Hydrochloric acid kills most bacteria in the food and unfolds the proteins.', ok: true,
                  why: 'pH 2 is corrosive enough to destroy most swallowed microorganisms, and it denatures protein — it unfolds the chains so an enzyme can reach the bonds inside them.' },
                { t: 'Pepsin breaks large proteins into shorter chains called peptides.', ok: true,
                  why: 'Pepsin cuts within a protein chain, so its products are shorter chains — peptides — not single amino acids. It only works in strong acid, which is why the stomach has to be acidic for protein digestion at all.' },
                { t: 'Pepsin breaks proteins all the way down into individual amino acids.', ok: false,
                  why: 'This one is worth remembering, because it is written incorrectly in a lot of places. Pepsin is an endopeptidase — it cuts chains into shorter chains. Free amino acids are produced later, in the small intestine, by trypsin, chymotrypsin and the brush-border peptidases.' },
                { t: 'Muscular churning mixes everything into a soupy liquid called chyme.', ok: true,
                  why: 'Three layers of muscle in the stomach wall run in different directions, so the stomach can genuinely churn rather than just squeeze. The bolus becomes chyme.' },
                { t: 'Fat is digested in the stomach by bile.', ok: false,
                  why: 'Bile is made in the liver and released into the small intestine, not the stomach. The butter leaves the stomach still in large globules.' }
            ],
            effect: m => ({ ...m,
                starch: 'Starch digestion stops — the acid destroys salivary amylase',
                protein: 'Protein denatured by acid, then cut by pepsin into shorter peptides',
                fat: 'Fat — still large globules, untouched',
                water: 'Water — plus about 2 L of gastric juice added per day' })
        },
        {
            id: 'duodenum', name: 'Small intestine — the first 25 cm', system: 'Where most chemical digestion happens',
            blurb: 'Chyme squirts into the duodenum. Two ducts open here: one from the gall bladder and one from the pancreas.',
            options: [
                { t: 'Bile emulsifies fat — it breaks large fat globules into many tiny droplets.', ok: true,
                  why: 'Bile is not an enzyme and it digests nothing. It is a detergent. Breaking one big globule into thousands of small ones multiplies the surface area that lipase can work on, which is the whole point.' },
                { t: 'Bile neutralises the stomach acid.', ok: false,
                  why: 'A very common slip, and both of the source slide decks make it. Bile emulsifies. The neutralising is done by hydrogencarbonate in pancreatic juice — which is the reason the pancreas has a duct into the duodenum at all.' },
                { t: 'Hydrogencarbonate from the pancreas raises the pH from about 2 to about 8.', ok: true,
                  why: 'Every enzyme working in the small intestine is destroyed by acid. The pancreas neutralises the chyme first so that its own enzymes can survive to work on it.' },
                { t: 'Pancreatic lipase breaks fat into fatty acids and glycerol.', ok: true,
                  why: 'Lipase can only reach the outside of a droplet, which is why emulsification has to happen first. Bile and lipase are a pair: one makes the surface, the other works on it.' },
                { t: 'Pancreatic protease and the brush-border enzymes finish proteins off into single amino acids.', ok: true,
                  why: 'Trypsin and chymotrypsin cut the peptides further, and peptidases built into the wall of the villus take the last bonds apart. Only now are there free amino acids.' },
                { t: 'Pancreatic amylase finishes starch off into glucose.', ok: true,
                  why: 'Amylase gets starch to maltose; maltase in the villus wall then splits maltose into two glucose molecules. Starch that survived the stomach is finished here.' }
            ],
            effect: m => ({ ...m,
                starch: 'Glucose — single molecules, small enough to absorb',
                protein: 'Amino acids — single molecules, small enough to absorb',
                fat: 'Fatty acids and glycerol, in tiny emulsified droplets',
                water: 'Water — plus about 2 L of bile and pancreatic juice per day' })
        },
        {
            id: 'ileum', name: 'Small intestine — the other 6 metres', system: 'Absorption',
            blurb: 'Everything is now small enough to cross a membrane. The job changes from breaking down to getting across.',
            options: [
                { t: 'Villi and microvilli fold the lining so the absorbing surface is hundreds of times larger.', ok: true,
                  why: 'Circular folds, then villi on the folds, then microvilli on each cell. Three levels of folding on top of one another, and each multiplies the last.' },
                { t: 'Glucose is carried into the cell by SGLT1, a transport protein that moves it together with sodium.', ok: true,
                  why: 'Glucose is a large polar molecule — it cannot dissolve through the oily core of a membrane, so it needs a protein built for it. SGLT1 uses the sodium gradient to drag glucose in even when there is more glucose inside than outside.' },
                { t: 'Glucose and amino acids pass through aquaporins.', ok: false,
                  why: 'Aquaporins are water channels, and their selectivity is the entire point of the protein — the pore is shaped so that water fits and almost nothing else does. Sugars and amino acids cross through their own transporters. Several of the source slides say otherwise; they are wrong.' },
                { t: 'Each villus contains a capillary network that carries glucose and amino acids away.', ok: true,
                  why: 'Absorbed sugar and amino acids enter the blood in the villus capillaries and travel straight to the liver in the hepatic portal vein.' },
                { t: 'Fatty acids are absorbed into a lacteal and enter the lymph, not the blood.', ok: true,
                  why: 'Digested fat is repackaged inside the cell and passed into the lacteal — a lymph vessel in the middle of each villus. It rejoins the blood near the heart, which means fat is the one nutrient that does not go to the liver first.' },
                { t: 'Water cannot be absorbed until it reaches the large intestine.', ok: false,
                  why: 'Around 7.5 of the 9 litres entering your gut each day are absorbed here, in the small intestine. The large intestine collects what is left.' }
            ],
            effect: m => ({ ...m,
                starch: 'Glucose absorbed → capillary → hepatic portal vein → liver',
                protein: 'Amino acids absorbed → capillary → hepatic portal vein → liver',
                fat: 'Fat repackaged → lacteal → lymph → bloodstream near the heart',
                water: 'About 7.5 L of the 9 L absorbed here' })
        },
        {
            id: 'colon', name: 'Large intestine', system: 'Water recovery and egestion',
            blurb: 'About 1.5 litres of watery residue arrives here every day. Almost all of it is recovered.',
            options: [
                { t: 'Water and mineral salts are reabsorbed, so the contents solidify.', ok: true,
                  why: 'Around 1.4 of the 1.5 litres arriving is reabsorbed. Water crosses through aquaporins in the cells lining the colon — genuinely aquaporins this time, because it really is only water.' },
                { t: 'Gut bacteria break down some fibre and make vitamin K and some B vitamins.', ok: true,
                  why: 'You cannot digest cellulose; the bacteria in your colon partly can. In doing so they release short-chain fatty acids you can use, and they synthesise vitamins you cannot make yourself.' },
                { t: 'Most nutrient absorption happens in the large intestine.', ok: false,
                  why: 'Almost none does. By the time material reaches the colon the useful molecules are gone. The colon absorbs water, salts and a few bacterial vitamins, and that is all.' },
                { t: 'What remains is stored in the rectum and removed through the anus — egestion.', ok: true,
                  why: 'Egestion is not the same as excretion. Faeces are mostly undigested fibre, dead gut lining and bacteria — material that was never inside a body cell. Excretion is getting rid of waste your cells actually made, such as urea.' }
            ],
            effect: m => ({ ...m,
                starch: 'Gone — absorbed upstream',
                protein: 'Gone — absorbed upstream',
                fat: 'Gone — absorbed upstream',
                water: 'About 1.4 L of the last 1.5 L recovered; roughly 0.1 L leaves in the faeces' })
        }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.dig { padding:1rem 1.25rem 0.25rem; --d-ok:#2e7d32; --d-bad:#aa272f; --d-miss:#b26a00;',
            '   --d-accent:var(--light-teal); }',
            '[data-theme="dark"] .dig { --d-ok:#7fc98a; --d-bad:#e08a90; --d-miss:#e0b755; }',
            '[data-theme="sepia"] .dig { --d-ok:#4a6b3d; --d-bad:#a04040; --d-miss:#8a6a20; }',
            '.dig-track { display:flex; gap:3px; margin:0 0 0.9rem; flex-wrap:wrap; }',
            '.dig-step { flex:1 1 auto; min-width:60px; font-size:0.6rem; font-weight:700; text-align:center;',
            '   letter-spacing:0.04em; text-transform:uppercase; padding:0.35rem 0.3rem; border-radius:6px;',
            '   background:var(--bg-surface); color:var(--text-secondary); border:1px solid var(--border); }',
            '.dig-step.here { background:var(--d-accent); color:#fff; border-color:var(--d-accent); }',
            '.dig-step.done { border-color:var(--d-ok); color:var(--d-ok); }',
            '.dig-h { margin:0 0 0.25rem; font-size:1rem; font-weight:700; }',
            '.dig-sub { margin:0 0 0.15rem; font-size:0.62rem; font-weight:700; letter-spacing:0.09em;',
            '   text-transform:uppercase; color:var(--text-secondary); }',
            '.dig-blurb { margin:0 0 0.9rem; font-size:0.85rem; color:var(--text-secondary); line-height:1.55; }',
            '.dig-opt { display:block; width:100%; text-align:left; font:inherit; font-size:0.85rem;',
            '   line-height:1.5; padding:0.55rem 0.7rem; margin:0 0 0.4rem; border-radius:8px;',
            '   border:1.5px solid var(--border); background:transparent; color:var(--text); cursor:pointer; }',
            '.dig-opt:hover { border-color:var(--d-accent); }',
            '.dig-opt:focus-visible { outline:2px solid var(--d-accent); outline-offset:2px; }',
            '.dig-opt[aria-pressed="true"] { border-color:var(--d-accent); background:rgba(87,120,153,0.12); }',
            '.dig-opt .tick { font-weight:800; margin-right:0.45rem; }',
            '.dig-opt.r-ok { border-color:var(--d-ok); background:rgba(46,125,50,0.10); cursor:default; }',
            '.dig-opt.r-bad { border-color:var(--d-bad); background:rgba(170,39,47,0.08); cursor:default; }',
            '.dig-opt.r-miss { border-color:var(--d-miss); background:rgba(178,106,0,0.10); cursor:default; }',
            '.dig-opt.r-none { opacity:0.55; cursor:default; }',
            '.dig-why { display:block; margin-top:0.4rem; font-size:0.78rem; line-height:1.55;',
            '   color:var(--text-secondary); }',
            '.dig-verdict { display:block; font-size:0.68rem; font-weight:700; letter-spacing:0.05em;',
            '   text-transform:uppercase; margin-bottom:0.25rem; }',
            '.dig-meal { border:1px solid var(--border); border-radius:10px; padding:0.7rem 0.85rem;',
            '   margin:1rem 0 0; background:var(--bg-surface); }',
            '.dig-meal h6 { margin:0 0 0.5rem; font-size:0.68rem; letter-spacing:0.07em; text-transform:uppercase;',
            '   color:var(--text-secondary); font-weight:700; }',
            '.dig-meal dl { margin:0; display:grid; grid-template-columns:auto 1fr; gap:0.3rem 0.7rem;',
            '   font-size:0.8rem; line-height:1.45; }',
            '.dig-meal dt { font-weight:700; color:var(--text); }',
            '.dig-meal dd { margin:0; color:var(--text-secondary); }',
            '.dig-msg { margin:0.85rem 0 0; font-size:0.82rem; line-height:1.55; min-height:2.2em; }',
            '.dig-msg.ok { color:var(--d-ok); } .dig-msg.bad { color:var(--d-bad); }',
            '.dig-reveal { margin-top:1rem; border:1px solid var(--d-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .dig-reveal { background:rgba(127,201,138,0.12); }',
            '.dig-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.dig-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.dig-reveal p:last-child { margin-bottom:0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u1-digestion'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'dig');
        const track = U.el('div', 'dig-track');
        const sub = U.el('p', 'dig-sub');
        const head = U.el('p', 'dig-h');
        const blurb = U.el('p', 'dig-blurb');
        const opts = U.el('div');
        const msg = U.el('p', 'dig-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const mealBox = U.el('div', 'dig-meal');
        const revealHost = U.el('div');
        [track, sub, head, blurb, opts, msg, mealBox, revealHost].forEach(n => wrap.appendChild(n));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const commitBtn = U.button(buttons, 'Commit my answer', 'primary');
        const nextBtn = U.button(buttons, 'Next compartment');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        // ---------------- state ----------------
        let i = 0;                 // current stage
        let picked = new Set();
        let committed = false;
        let meal = { ...MEAL0 };
        let scores = [];           // per stage: {right, wrong, missed}

        function reset() {
            i = 0; picked = new Set(); committed = false;
            meal = { ...MEAL0 }; scores = [];
            revealHost.innerHTML = '';
            msg.textContent = ''; msg.className = 'dig-msg';
            render();
        }

        function render() {
            const st = STAGES[i];

            track.innerHTML = '';
            STAGES.forEach((s, k) => {
                const e = U.el('div', 'dig-step' + (k === i ? ' here' : (k < i ? ' done' : '')));
                e.textContent = s.name.split('—')[0].trim();
                track.appendChild(e);
            });

            sub.textContent = 'Compartment ' + (i + 1) + ' of ' + STAGES.length + ' — ' + st.system;
            head.textContent = st.name;
            blurb.textContent = st.blurb + (committed ? '' :
                ' Select every statement that is true here, then commit. Some of them are true somewhere else in the gut, and some are simply false.');

            opts.innerHTML = '';
            st.options.forEach((o, k) => {
                const b = U.el('button', 'dig-opt');
                b.type = 'button';
                const chosen = picked.has(k);
                if (!committed) {
                    b.setAttribute('aria-pressed', chosen ? 'true' : 'false');
                    b.innerHTML = '<span class="tick">' + (chosen ? '&#10003;' : '&#9633;') + '</span>' + esc(o.t);
                    b.addEventListener('click', () => {
                        chosen ? picked.delete(k) : picked.add(k);
                        render();
                    });
                } else {
                    let cls, verdict;
                    if (o.ok && chosen) { cls = 'r-ok'; verdict = 'True here — and you had it'; }
                    else if (o.ok && !chosen) { cls = 'r-miss'; verdict = 'True here — you missed it'; }
                    else if (!o.ok && chosen) { cls = 'r-bad'; verdict = 'Not true — and you chose it'; }
                    else { cls = 'r-none'; verdict = 'Not true here'; }
                    b.className = 'dig-opt ' + cls;
                    b.disabled = true;
                    b.innerHTML = '<span class="dig-verdict">' + verdict + '</span>' + esc(o.t) +
                        '<span class="dig-why">' + esc(o.why) + '</span>';
                }
                opts.appendChild(b);
            });

            mealBox.innerHTML = '<h6>Where the sandwich is now</h6>';
            const dl = document.createElement('dl');
            [['Bread (starch)', meal.starch], ['Cheese (protein)', meal.protein],
             ['Butter (fat)', meal.fat], ['Water', meal.water]].forEach(([k, v]) => {
                const dt = document.createElement('dt'); dt.textContent = k;
                const dd = document.createElement('dd'); dd.textContent = v;
                dl.appendChild(dt); dl.appendChild(dd);
            });
            mealBox.appendChild(dl);

            commitBtn.hidden = committed;
            nextBtn.hidden = !committed || i >= STAGES.length - 1;
            if (committed && i === STAGES.length - 1) showReveal();
        }

        function commit() {
            const st = STAGES[i];
            const right = st.options.filter((o, k) => o.ok && picked.has(k)).length;
            const wrong = st.options.filter((o, k) => !o.ok && picked.has(k)).length;
            const missed = st.options.filter((o, k) => o.ok && !picked.has(k)).length;
            scores[i] = { right, wrong, missed, total: st.options.filter(o => o.ok).length };
            committed = true;
            meal = st.effect(meal);
            if (!wrong && !missed) {
                msg.textContent = 'All ' + right + ' correct, and nothing false chosen. Read the reasons anyway — ' +
                    'they carry the detail the statement does not.';
                msg.className = 'dig-msg ok';
            } else {
                msg.textContent = right + ' right' +
                    (missed ? ', ' + missed + ' true statement' + (missed > 1 ? 's' : '') + ' missed' : '') +
                    (wrong ? ', ' + wrong + ' false statement' + (wrong > 1 ? 's' : '') + ' chosen' : '') +
                    '. The reasons under each one explain why.';
                msg.className = 'dig-msg bad';
            }
            render();
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const tot = scores.reduce((a, s) => a + (s ? s.right : 0), 0);
            const max = STAGES.reduce((a, s) => a + s.options.filter(o => o.ok).length, 0);
            const bad = scores.reduce((a, s) => a + (s ? s.wrong : 0), 0);
            const d = U.el('div', 'dig-reveal');
            d.innerHTML =
                '<h5>The sandwich is gone. Look at what actually happened to it.</h5>' +
                '<p>You identified <strong>' + tot + ' of ' + max + '</strong> true processes and picked up <strong>' +
                bad + '</strong> false ones on the way.</p>' +
                '<p>Notice the shape of the journey. The first four compartments do almost nothing but ' +
                '<em>break things down</em> — and every one of them works by increasing surface area first ' +
                'and applying an enzyme second. Teeth before amylase. Churning before pepsin. Bile before ' +
                'lipase. Every single time, the structure comes first and makes the chemistry possible.</p>' +
                '<p>Then the job changes. From the moment the molecules are small enough to cross a ' +
                'membrane, nothing more needs breaking — the problem becomes getting seven metres of ' +
                'contents across a surface, and the gut solves that with folds inside folds inside folds. ' +
                'That is Chapter 1.4.</p>';
            revealHost.appendChild(d);
        }

        commitBtn.addEventListener('click', () => { if (!committed) commit(); });
        nextBtn.addEventListener('click', () => {
            if (i < STAGES.length - 1) {
                i++; picked = new Set(); committed = false;
                msg.textContent = ''; msg.className = 'dig-msg';
                render();
            }
        });
        resetBtn.addEventListener('click', reset);
        reset();

        // ---------------- verification hooks ----------------
        root._simState = () => ({
            stage: STAGES[i].id, index: i, committed,
            picked: [...picked].sort(),
            meal: { ...meal },
            scores: scores.slice(),
            totalRight: scores.reduce((a, s) => a + (s ? s.right : 0), 0),
            totalWrong: scores.reduce((a, s) => a + (s ? s.wrong : 0), 0)
        });
        root._simSolve = () => {
            picked = new Set(STAGES[i].options.map((o, k) => o.ok ? k : -1).filter(k => k >= 0));
            if (!committed) commit(); else render();
        };
    };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
})();
