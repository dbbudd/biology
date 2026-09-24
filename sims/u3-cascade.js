/* =============================================================
   INTERACTIVE — Trophic cascade builder: Operation Cat Drop
   -------------------------------------------------------------
   Registers window.SIMS['u3-cascade'].  Serves HS-LS2-6
   (targets 8, 11 and above all 12 — evaluating and critiquing
   established claims).

   Borneo in the 1950s is the best single case in this unit
   because one deliberate act runs through five trophic links and
   comes back to the people who ordered it. The reader picks each
   link BEFORE it is revealed, so the surprise lands where it
   should — on the step they got wrong.

   The last panel is not a victory lap. It asks how well each part
   of the story is actually evidenced, because the story is
   retold far more often than it was measured, and the widely
   quoted "14,000 cats" is not supported by any primary source.
   Telling a good story carefully is the skill; believing it
   uncritically is the failure mode.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u3cs-style';

    const STEPS = [
        {
            setup: 'Borneo, the early 1950s. Malaria is killing Dayak villagers, and the World Health ' +
                   'Organization sprays DDT through the longhouses. It works: the mosquitoes die and ' +
                   'malaria cases collapse. The DDT also settles on everything else in the building, ' +
                   'including the palm-thatch roof.',
            q: 'Two insects live in that thatch: caterpillars that eat it, and tiny parasitic wasps ' +
               'that lay their eggs inside the caterpillars. Which is hit harder by the spray?',
            opts: ['The caterpillars — they are bigger, so they eat more of it',
                   'The wasps — small, and they hunt across the whole sprayed surface',
                   'Both equally — the DDT is everywhere'],
            answer: 1,
            node: 'DDT sprayed',
            dir: 'down',
            why: 'The wasps. Two things worked against them. They are far smaller, so a dose that a ' +
                 'caterpillar survives kills a wasp; and a hunting wasp patrols the entire sprayed ' +
                 'surface looking for hosts, while a caterpillar sits chewing in one spot. A pesticide ' +
                 'almost never affects two species equally, and the one it hits hardest is often not ' +
                 'the one you were aiming at.'
        },
        {
            setup: 'So the wasps go first.',
            q: 'What happens to the thatch-eating caterpillars?',
            opts: ['They fall too — the DDT gets them eventually',
                   'They boom — the thing that controlled them is gone',
                   'Nothing measurable changes'],
            answer: 1,
            node: 'Wasps die',
            dir: 'down',
            why: 'They boom. The wasps were a density-dependent control on the caterpillars: the more ' +
                 'caterpillars there were, the more of them the wasps found. Remove that control and ' +
                 'the caterpillar population is released to grow the way Chapter 3.1 said it would.'
        },
        {
            setup: 'Caterpillar numbers climb through the roof — literally.',
            q: 'What happens to the villagers\' houses?',
            opts: ['Nothing — the caterpillars prefer live palm',
                   'The roofs start collapsing',
                   'The roofs become more weatherproof'],
            answer: 1,
            node: 'Caterpillars boom',
            dir: 'up',
            why: 'The roofs come down. The thatch these caterpillars eat is the roof, and there are now ' +
                 'orders of magnitude more of them eating it. A programme aimed at mosquitoes has ' +
                 'started destroying houses — and nothing in the plan predicted it, because nobody ' +
                 'had drawn the food web.'
        },
        {
            setup: 'Meanwhile, small lizards called geckos are eating the poisoned insects — dozens ' +
                   'a day, every day, for months.',
            q: 'What happens to the DDT inside a gecko?',
            opts: ['It passes straight through and is excreted',
                   'It is broken down into harmless products',
                   'It collects in the gecko\'s fat and keeps building up'],
            answer: 2,
            node: 'Roofs collapse',
            dir: 'down',
            why: 'It builds up. DDT dissolves in fat, not water, so an animal cannot flush it out in ' +
                 'urine. Every contaminated insect adds a little more, and none of it leaves. This is ' +
                 'called <strong>biomagnification</strong>, and it means concentration rises at every ' +
                 'step up a food chain. A dose too small to trouble an insect becomes a lethal dose ' +
                 'in whatever eats a thousand insects.'
        },
        {
            setup: 'Village cats hunt the slow, poisoned geckos — they are the easiest prey around.',
            q: 'What happens to the cats?',
            opts: ['They die',
                   'They are unaffected — mammals process DDT differently',
                   'They leave the villages for the forest'],
            answer: 0,
            node: 'Geckos poisoned',
            dir: 'down',
            why: 'They die. The cats are one more step up, so the concentration is higher again — and ' +
                 'they are hunting exactly the animals that carry the most, because those are the ones ' +
                 'too sluggish to escape. The poison actively steers itself into the predator.'
        },
        {
            setup: 'The village cats are gone.',
            q: 'What happens to the rats?',
            opts: ['They crash — the same poison reaches them',
                   'They boom',
                   'They stay steady; food, not cats, was limiting them'],
            answer: 1,
            node: 'Cats die',
            dir: 'down',
            why: 'They boom. The cats were the density-dependent brake on the rat population. With the ' +
                 'brake off, and grain stores full, the rats grow the way anything grows when its ' +
                 'limiting factor is removed.'
        },
        {
            setup: 'Rat numbers rise sharply in and around the longhouses.',
            q: 'And the consequence for the villagers?',
            opts: ['Very little — rats are a nuisance, not a danger',
                   'Rats eat the stored crops, and bring the risk of plague and typhus',
                   'The rats control the caterpillars, so the roofs recover'],
            answer: 1,
            node: 'Rats boom',
            dir: 'up',
            why: 'Crops eaten, and a serious disease risk — sylvatic plague and scrub typhus both ' +
                 'travel with rats and their fleas. A programme that began by saving people from one ' +
                 'disease has now exposed them to two others, plus hunger, plus no roof.'
        }
    ];

    const CLAIMS = [
        {
            text: 'DDT killed the parasitic wasps, so thatch-eating caterpillars boomed and roofs fell in.',
            answer: 'strong',
            note: 'Reported at the time by people who were there, including entomologists working in ' +
                  'Sarawak, and the mechanism is straightforward and testable. Treat this as well ' +
                  'supported.'
        },
        {
            text: 'Cats died because DDT concentrated up the chain from insects to geckos to cats.',
            answer: 'partly',
            note: 'Very plausible, consistent with everything known about how DDT behaves, and reported ' +
                  'by contemporary accounts — but it was never set up as a controlled food-web study ' +
                  'with measured tissue concentrations at each level. It is a <em>reconstruction</em>, ' +
                  'and should be described as one.'
        },
        {
            text: 'The RAF parachuted 14,000 cats into Borneo.',
            answer: 'weak',
            note: 'Not supported. A cat drop did happen — the RAF delivered cats to Bario in the ' +
                  'Kelabit Highlands in March 1960, in an operation the crews themselves nicknamed ' +
                  'Operation Cat Drop — but the documented delivery was of the order of twenty ' +
                  'animals, not fourteen thousand. The big number appears to have grown in the ' +
                  'retelling. If you use it in an answer, you are repeating something nobody ever ' +
                  'measured.'
        }
    ];
    const RATINGS = [
        ['strong', 'Well supported'],
        ['partly', 'Plausible but reconstructed'],
        ['weak', 'Not supported']
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u3cs { --u3-ok:#2e7d32; }',
            '[data-theme="dark"] .u3cs { --u3-ok:#7fc98a; }',
            '[data-theme="sepia"] .u3cs { --u3-ok:#4a6b3d; }',
            '.u3cs-chain { display:flex; flex-wrap:wrap; gap:0.35rem; padding:1rem 1.25rem 0.4rem; }',
            '.u3cs-link { font-size:0.72rem; padding:0.3rem 0.6rem; border-radius:999px;',
            '   border:1px dashed var(--border); color:var(--text-secondary); }',
            '.u3cs-link.on { border-style:solid; border-color:var(--red); color:var(--text); font-weight:700; }',
            '.u3cs-link.up { border-color:var(--red); }',
            '.u3cs-body { padding:0.6rem 1.25rem 0; font-size:0.88rem; line-height:1.65; }',
            '.u3cs-body p { margin:0 0 0.7rem; }',
            '.u3cs-setup { color:var(--text-secondary); }',
            '.u3cs-q { font-weight:700; }',
            '.u3cs-opts { display:flex; flex-direction:column; gap:0.4rem; margin:0 0 0.9rem; }',
            '.u3cs-opt { font:inherit; font-size:0.83rem; text-align:left; cursor:pointer;',
            '   padding:0.5rem 0.8rem; border:1px solid var(--border); border-radius:8px;',
            '   background:var(--bg); color:var(--text); transition:all 0.12s; }',
            '.u3cs-opt:hover { border-color:var(--light-teal); }',
            '.u3cs-opt:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.u3cs-opt[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.u3cs-opt.right { border-color:var(--u3-ok); box-shadow:0 0 0 2px var(--u3-ok); font-weight:600; }',
            '.u3cs-opt.wrong { border-color:var(--red); box-shadow:0 0 0 2px var(--red); opacity:0.78; }',
            '.u3cs-why { border-left:3px solid var(--light-teal); padding:0.1rem 0 0.1rem 0.85rem;',
            '   margin:0 0 0.9rem; font-size:0.85rem; line-height:1.6; }',
            '.u3cs-why.hit { border-left-color:var(--u3-ok); }',
            '.u3cs-claim { border:1px solid var(--border); border-radius:9px; padding:0.7rem 0.85rem;',
            '   margin-bottom:0.6rem; }',
            '.u3cs-claim > p { margin:0 0 0.55rem; font-size:0.85rem; font-weight:600; }',
            '.u3cs-rates { display:flex; gap:0.35rem; flex-wrap:wrap; }',
            '.u3cs-rate { font:inherit; font-size:0.74rem; cursor:pointer; padding:0.3rem 0.6rem;',
            '   border:1px solid var(--border); border-radius:7px; background:var(--bg); color:var(--text); }',
            '.u3cs-rate:hover { border-color:var(--light-teal); }',
            '.u3cs-rate[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.u3cs-rate.right { border-color:var(--u3-ok); box-shadow:0 0 0 2px var(--u3-ok); font-weight:700; }',
            '.u3cs-rate.wrong { border-color:var(--red); box-shadow:0 0 0 2px var(--red); opacity:0.78; }',
            '.u3cs-note { margin:0.55rem 0 0; font-size:0.8rem; color:var(--text-secondary); line-height:1.6; }',
            '.u3cs-hide { display:none; }',
            '.u3cs .sim-btn:disabled { opacity:0.45; cursor:not-allowed; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u3-cascade'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u3cs');
        root.appendChild(wrap);

        let step = 0;
        let picked = null;
        let locked = false;
        const answers = [];          // index chosen at each step
        let phase = 'chain';         // 'chain' | 'critique'
        const ratings = {};
        let ratingsChecked = false;

        const chain = U.el('div', 'u3cs-chain');
        const body = U.el('div', 'u3cs-body');
        const btns = U.el('div', 'sim-buttons');
        const readout = U.el('div', 'sim-readout');
        [chain, body, btns, readout].forEach(e => wrap.appendChild(e));

        const bLock = U.button(btns, 'Lock in my answer', 'primary');
        const bNext = U.button(btns, 'Next link');
        const bRestart = U.button(btns, 'Start again');

        bLock.addEventListener('click', () => {
            if (phase === 'chain') { if (picked === null || locked) return; locked = true; answers[step] = picked; render(); }
            else { ratingsChecked = true; render(); }
        });
        bNext.addEventListener('click', () => {
            if (phase !== 'chain' || !locked) return;
            if (step < STEPS.length - 1) { step++; picked = null; locked = false; }
            else phase = 'critique';
            render();
        });
        bRestart.addEventListener('click', () => {
            step = 0; picked = null; locked = false; answers.length = 0;
            phase = 'chain'; ratingsChecked = false;
            Object.keys(ratings).forEach(k => delete ratings[k]);
            render();
        });

        function drawChain() {
            chain.innerHTML = STEPS.map((s, i) => {
                const on = (phase === 'critique') || i < step || (i === step && locked);
                return '<span class="u3cs-link' + (on ? ' on' : '') + '">' +
                    (on ? (s.dir === 'up' ? '&#9650; ' : '&#9660; ') : (i + 1) + '. ') + s.node + '</span>';
            }).join('') +
            '<span class="u3cs-link' + (phase === 'critique' ? ' on' : '') + '">' +
            (phase === 'critique' ? '&#9660; ' : '8. ') + 'Crops eaten, disease risk</span>';
        }

        function render() {
            drawChain();
            if (phase === 'chain') {
                const S = STEPS[step];
                body.innerHTML =
                    '<p class="u3cs-setup">' + S.setup + '</p>' +
                    '<p class="u3cs-q">' + S.q + '</p>' +
                    '<div class="u3cs-opts">' + S.opts.map((o, i) => {
                        let cls = 'u3cs-opt';
                        if (locked) {
                            if (i === S.answer) cls += ' right';
                            else if (i === picked) cls += ' wrong';
                        }
                        return '<button type="button" class="' + cls + '" data-i="' + i +
                            '" aria-pressed="' + (picked === i ? 'true' : 'false') + '">' + o + '</button>';
                    }).join('') + '</div>' +
                    (locked ? '<div class="u3cs-why' + (picked === S.answer ? ' hit' : '') + '">' +
                        '<strong>' + (picked === S.answer ? 'Right. ' : '') + '</strong>' + S.why + '</div>' : '');
                body.querySelectorAll('.u3cs-opt').forEach(b => {
                    b.addEventListener('click', () => { if (!locked) { picked = +b.dataset.i; render(); } });
                });
                bLock.textContent = 'Lock in my answer';
                bLock.disabled = locked || picked === null;
                bNext.disabled = !locked;
                bNext.textContent = step < STEPS.length - 1 ? 'Next link' : 'Now judge the evidence';
                const right = answers.filter((a, i) => a === STEPS[i].answer).length;
                readout.innerHTML = 'Link <strong>' + (step + 1) + ' of ' + STEPS.length + '</strong>' +
                    (answers.length ? ' &middot; <strong>' + right + '</strong> of ' + answers.length +
                        ' predicted correctly so far.' : '.') +
                    (locked ? '' : ' Commit before you read on — the whole value of this is finding out ' +
                        'which link you did not see coming.');
            } else {
                body.innerHTML =
                    '<p>The chain closed on the people who started it: no roof, no crop, and rats in ' +
                    'the grain. The response was to fly cats back in — and the story is usually told ' +
                    'there, as a neat, satisfying loop.</p>' +
                    '<p class="u3cs-q">Before you use it in an answer: how good is the evidence for ' +
                    'each part? Rate all three.</p>' +
                    CLAIMS.map((c, i) =>
                        '<div class="u3cs-claim"><p>' + c.text + '</p><div class="u3cs-rates" data-c="' + i + '">' +
                        RATINGS.map(([id, lab]) => {
                            let cls = 'u3cs-rate';
                            if (ratingsChecked) {
                                if (id === c.answer) cls += ' right';
                                else if (ratings[i] === id) cls += ' wrong';
                            }
                            return '<button type="button" class="' + cls + '" data-r="' + id +
                                '" aria-pressed="' + (ratings[i] === id ? 'true' : 'false') + '">' + lab + '</button>';
                        }).join('') + '</div>' +
                        (ratingsChecked ? '<p class="u3cs-note">' + c.note + '</p>' : '') +
                        '</div>').join('') +
                    (ratingsChecked ?
                        '<p><strong>The point is not that the story is false.</strong> The cascade is real, ' +
                        'the mechanism is sound, and it is one of the clearest illustrations of ' +
                        'interconnection anyone has. The point is that a good story travels faster than ' +
                        'its evidence, and that a scientist has to be able to say which parts of it were ' +
                        'measured, which were inferred, and which were added along the way.</p>' +
                        '<p>The worksheet this is built from ends on a sentence worth keeping: ' +
                        '<em>if you don\'t understand the inter-relatedness of things, solutions often ' +
                        'cause more problems.</em> That applies to the DDT. It also applies to the cats.</p>'
                        : '');
                body.querySelectorAll('.u3cs-rates').forEach(row => {
                    row.querySelectorAll('.u3cs-rate').forEach(b => {
                        b.addEventListener('click', () => {
                            if (ratingsChecked) return;
                            ratings[row.dataset.c] = b.dataset.r;
                            render();
                        });
                    });
                });
                const all = CLAIMS.every((c, i) => ratings[i]);
                bLock.textContent = 'Check my judgements';
                bLock.disabled = ratingsChecked || !all;
                bNext.disabled = true;
                bNext.textContent = 'Now judge the evidence';
                const right = answers.filter((a, i) => a === STEPS[i].answer).length;
                const rr = CLAIMS.filter((c, i) => ratings[i] === c.answer).length;
                readout.innerHTML = 'Cascade: <strong>' + right + ' of ' + STEPS.length +
                    '</strong> links predicted correctly.' +
                    (ratingsChecked ? ' Evidence: <strong>' + rr + ' of ' + CLAIMS.length +
                        '</strong> judged correctly.' : ' Now rate the three claims.');
            }
        }

        render();

        /* ---------- verification hooks ------------------------------- */
        root._simState = () => ({
            phase, step, locked, picked,
            answers: answers.slice(),
            cascadeScore: answers.filter((a, i) => a === STEPS[i].answer).length,
            cascadeOutOf: STEPS.length,
            ratings: Object.assign({}, ratings),
            ratingsChecked,
            evidenceScore: ratingsChecked ? CLAIMS.filter((c, i) => ratings[i] === c.answer).length : null
        });
        root._simSolve = () => {
            step = 0; answers.length = 0; phase = 'chain'; ratingsChecked = false;
            STEPS.forEach((S, i) => { answers[i] = S.answer; });
            step = STEPS.length - 1; picked = STEPS[step].answer; locked = true;
            phase = 'critique';
            CLAIMS.forEach((c, i) => { ratings[i] = c.answer; });
            ratingsChecked = true;
            render();
            return root._simState();
        };
    };
})();
