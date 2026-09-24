/* =============================================================
   INTERACTIVE — Feedback model builder
   -------------------------------------------------------------
   Registers window.SIMS['u4-feedback-builder'].
   Supports HS-LS1-3, HS-LS1-2.

   HS-LS1-3 asks the reader to provide evidence that feedback
   mechanisms maintain homeostasis. Evidence means a prediction that
   could have come out otherwise — so this interactive does two
   things in order:

     BUILD — assemble the axis from its organs and hormones, with
             every arrow signed + or -. Nothing is placed for you.
     BREAK — choose a real intervention, PREDICT what happens to
             each hormone, and then see the model's answer.

   The answer is not stored against the intervention. Each model is
   a signed graph, and the outcome is found by relaxing the graph to
   a steady state — so if a link is cut or a node is clamped, the
   consequences propagate on their own, including back round the
   loop. That is what makes the counter-intuitive cases come out
   right: extra testosterone from outside REDUCES sperm production,
   and damaged testes RAISE LH.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4fb-style';

    const BASE = 50;

    /* ---------------- the models ------------------------------------ */
    const MODELS = {
        hpg: {
            key: 'hpg', name: 'The HPG axis (testosterone)',
            intro: 'Hypothalamus, pituitary and gonad — the loop that holds testosterone steady ' +
                   'and keeps sperm production running.',
            /* Drawn over a course illustration. sx/sy place the label plate, ax/ay the dot on
               the structure it names; both are in the image's own 2752 x 1536 coordinates,
               measured from the artwork rather than estimated. x/y are the fallback positions
               used by the plain diagram when no image is set. */
            img: 'hpg-axis.jpeg', imgW: 2752, imgH: 1536,
            desc: 'A head in side view, cut through the middle, with the brain visible. Deep in the ' +
                  'brain the hypothalamus is picked out in purple, and the pituitary gland hangs ' +
                  'just below it on a short stalk in amber. On the right is a testis, cut open to ' +
                  'show the coiled seminiferous tubules with sperm forming inside, and the ' +
                  'epididymis along its back. Two pale blood vessels loop between the brain and ' +
                  'the testis, one carrying hormones down and one carrying them back.',
            nodes: [
                { k: 'gnrh',   label: 'GnRH', sub: 'from the hypothalamus', x: 60,  y: 34,
                  sx: 1100, sy: 330,  ax: 590,  ay: 430 },
                { k: 'lh',     label: 'LH and FSH', sub: 'from the pituitary', x: 60,  y: 124,
                  sx: 1100, sy: 620,  ax: 558,  ay: 505 },
                { k: 'testis', label: 'Testis activity', sub: 'the gonad, switched on', x: 288, y: 124,
                  sx: 1450, sy: 880,  ax: 2250, ay: 950 },
                { k: 'test',   label: 'Testosterone', sub: 'released into the blood', x: 288, y: 34,
                  sx: 1950, sy: 140,  ax: 2008, ay: 500 },
                { k: 'sperm',  label: 'Sperm production', sub: 'in the seminiferous tubules', x: 288, y: 214,
                  sx: 1240, sy: 1120, ax: 2430, ay: 1250 }
            ],
            edges: [
                { from: 'gnrh',   to: 'lh',     sign: 1,  gain: 1.0, bend: 0, note: 'GnRH tells the pituitary to release LH and FSH.' },
                { from: 'lh',     to: 'testis', sign: 1,  gain: 1.0, bend: 0.10, note: 'LH and FSH switch the testis on. Nothing in the testis happens without them.' },
                { from: 'testis', to: 'test',   sign: 1,  gain: 1.0, bend: 0.08, note: 'A working testis releases testosterone into the blood.' },
                { from: 'testis', to: 'sperm',  sign: 1,  gain: 1.2, bend: 0, note: 'A working testis also makes sperm — driven by FSH and by testosterone at the very high concentration found inside the testis itself.' },
                { from: 'test',   to: 'gnrh',   sign: -1, gain: 0.85, bend: -0.13, at: 0.30, note: 'Testosterone in the blood switches the hypothalamus down. This is the negative feedback.' },
                { from: 'test',   to: 'lh',     sign: -1, gain: 0.55, bend: 0.13, at: 0.62, note: 'Testosterone also switches the pituitary down directly.' }
            ],
            lesions: [
                { k: 'none', label: 'Nothing — the loop is intact', clamp: {}, cut: [] },
                { k: 'steroid', label: 'Anabolic steroids taken from outside the body',
                  clamp: { test: 95 }, cut: [], external: ['test'],
                  ask: ['gnrh', 'lh', 'sperm'],
                  explain: 'This is the result that surprises everybody, and it is the whole reason ' +
                    'the anchor guide sets an experiment about it. Anabolic steroids are ' +
                    'testosterone-like molecules. The hypothalamus and pituitary cannot tell them ' +
                    'apart from the real thing, so they read the blood, decide there is far too ' +
                    'much testosterone, and shut GnRH and LH down. But <b>sperm production needs ' +
                    'the testis to be switched on</b> — it needs FSH, and it needs testosterone ' +
                    'made <em>inside</em> the testis at a concentration far higher than blood ' +
                    'levels. With the pituitary silenced the testis stops working, so sperm ' +
                    'production falls and the testes shrink. More testosterone in the blood, less ' +
                    'sperm. The feedback loop did exactly what it was built to do.' },
                { k: 'damage', label: 'The testes are damaged and cannot respond',
                  clamp: { testis: 6 }, cut: [], ask: ['test', 'lh', 'sperm'],
                  explain: 'Testosterone falls, so the negative feedback signal disappears — and ' +
                    'the hypothalamus and pituitary, hearing nothing, shout louder. GnRH and LH go ' +
                    '<b>up</b>. This is exactly what a doctor looks for: <b>low testosterone with ' +
                    'high LH</b> means the problem is in the testis, because the pituitary is ' +
                    'clearly still trying. Low testosterone with <em>low</em> LH would mean the ' +
                    'opposite — the signal never arrived.' },
                { k: 'pituitary', label: 'A pituitary injury stops LH and FSH being released',
                  clamp: { lh: 6 }, cut: [], ask: ['test', 'sperm', 'gnrh'],
                  explain: 'Without LH the testis is never told to make testosterone, so ' +
                    'testosterone falls and sperm production with it. GnRH rises, because the ' +
                    'hypothalamus has lost its negative feedback too — but it is shouting at a ' +
                    'pituitary that cannot answer. Compare this with the damaged-testis case: the ' +
                    'testosterone result is the same, and the LH result is opposite. That is how ' +
                    'you tell them apart.' },
                { k: 'cut', label: 'The negative feedback link itself is cut',
                  clamp: {}, cut: ['test>gnrh', 'test>lh'], ask: ['test', 'gnrh', 'lh'],
                  explain: 'With nothing telling the hypothalamus that testosterone has arrived, ' +
                    'GnRH never comes down, LH never comes down, and testosterone climbs and stays ' +
                    'climbing. <b>This is the evidence the standard asks for.</b> The loop is not ' +
                    'decoration: remove one arrow and the level it was holding steady stops being ' +
                    'steady. Homeostasis is the loop.' }
            ]
        },

        gh: {
            key: 'gh', name: 'The growth hormone axis',
            intro: 'The anchor guide’s modelling task, page 30 — and the two extra hormones it asks ' +
                   'you to add.',
            nodes: [
                { k: 'ghrh', label: 'GHRH', sub: 'from the hypothalamus', x: 70,  y: 34 },
                { k: 'ss',   label: 'Somatostatin', sub: 'from the hypothalamus', x: 300, y: 34 },
                { k: 'gh',   label: 'Growth hormone', sub: 'from the pituitary', x: 70,  y: 124 },
                { k: 'igf',  label: 'IGF-1', sub: 'from the liver', x: 300, y: 124 },
                { k: 'grow', label: 'Bone, muscle and fat', sub: 'the target tissues', x: 300, y: 214 },
                { k: 'ghre', label: 'Ghrelin', sub: 'from an empty stomach', x: 70, y: 214 }
            ],
            edges: [
                { from: 'ghrh', to: 'gh',  sign: 1,  gain: 1.0, note: 'GHRH tells the pituitary to release growth hormone.' },
                { from: 'ss',   to: 'gh',  sign: -1, gain: 0.9, at: 0.66, note: 'Somatostatin tells the pituitary to stop.' },
                { from: 'ghre', to: 'gh',  sign: 1,  gain: 0.4, note: 'Ghrelin, released by an empty stomach, also stimulates growth hormone.' },
                { from: 'gh',   to: 'igf', sign: 1,  gain: 1.0, note: 'Growth hormone makes the liver release IGF-1.' },
                { from: 'igf',  to: 'grow',sign: 1,  gain: 1.0, note: 'IGF-1 is what actually makes bone, muscle and fat cells respond.' },
                { from: 'igf',  to: 'ghrh',sign: -1, gain: 0.8, at: 0.30, note: 'IGF-1 switches GHRH down — negative feedback.' },
                { from: 'igf',  to: 'ss',  sign: 1,  gain: 0.7, bend: -0.13, note: 'IGF-1 also increases somatostatin, which switches growth hormone off. A second brake.' }
            ],
            lesions: [
                { k: 'none', label: 'Nothing — the loop is intact', clamp: {}, cut: [] },
                { k: 'inject', label: 'Growth hormone injected from outside',
                  clamp: { gh: 95 }, cut: [], external: ['gh'], ask: ['igf', 'ghrh', 'ss'],
                  explain: 'IGF-1 rises, and IGF-1 is the brake — so GHRH falls and somatostatin ' +
                    'rises. The body responds to injected growth hormone by trying to stop making ' +
                    'its own. Every hormone given as a drug does this, which is why they are not ' +
                    'simply "topping something up".' },
                { k: 'liver', label: 'Liver disease — IGF-1 cannot be made',
                  clamp: { igf: 6 }, cut: [], ask: ['ghrh', 'gh', 'grow'],
                  explain: 'Growth hormone levels go <b>up</b>, because the brake is gone — but the ' +
                    'tissues still do not grow, because growth hormone does not act on bone and ' +
                    'muscle directly. IGF-1 does. A high hormone level and no effect: the signal is ' +
                    'loud, and nothing is listening.' },
                { k: 'ghrelin', label: 'Ghrelin rises — the stomach is empty',
                  clamp: { ghre: 90 }, cut: [], ask: ['gh', 'igf'],
                  explain: 'Growth hormone rises, which is one reason it peaks during the night and ' +
                    'during fasting. Then IGF-1 rises behind it and pulls GHRH back down — so even ' +
                    'a push from outside the loop is absorbed by the loop. That is what "maintains ' +
                    'homeostasis" means in practice.' },
                { k: 'ss-block', label: 'Somatostatin is blocked by a drug',
                  clamp: {}, cut: ['igf>ss', 'ss>gh'], ask: ['gh', 'igf'],
                  explain: 'One of the two brakes is gone, so growth hormone and IGF-1 both settle ' +
                    'higher than they should. Notice the axis does not run away completely — the ' +
                    'IGF-1 to GHRH link is still working. Systems that matter usually have more ' +
                    'than one brake.' }
            ]
        },

        cycle: {
            key: 'cycle', name: 'The ovarian and menstrual cycles',
            intro: 'Two linked loops: one running the ovary, one running the lining of the uterus.',
            nodes: [
                { k: 'fsh',  label: 'FSH', sub: 'from the pituitary', x: 66,  y: 34 },
                { k: 'foll', label: 'Follicle', sub: 'in the ovary', x: 288, y: 34 },
                { k: 'oest', label: 'Oestrogen', sub: 'from the follicle', x: 288, y: 120 },
                { k: 'lh',   label: 'LH', sub: 'from the pituitary', x: 66,  y: 120 },
                { k: 'cl',   label: 'Corpus luteum', sub: 'what the follicle becomes', x: 66, y: 206 },
                { k: 'prog', label: 'Progesterone', sub: 'from the corpus luteum', x: 288, y: 206 },
                { k: 'endo', label: 'Endometrium', sub: 'the uterus lining', x: 288, y: 288 }
            ],
            edges: [
                { from: 'fsh',  to: 'foll', sign: 1,  gain: 1.0, note: 'FSH makes a follicle grow.' },
                { from: 'foll', to: 'oest', sign: 1,  gain: 1.0, note: 'The growing follicle releases oestrogen.' },
                { from: 'oest', to: 'endo', sign: 1,  gain: 0.9, note: 'Oestrogen rebuilds the uterus lining.' },
                { from: 'oest', to: 'fsh',  sign: -1, gain: 0.8, at: 0.32, note: 'Oestrogen switches FSH down, so only one follicle keeps growing.' },
                { from: 'oest', to: 'lh',   sign: 1,  gain: 0.9, bend: -0.13, at: 0.66, note: 'Once oestrogen is high enough the sign flips: it drives a surge of LH. This is POSITIVE feedback.' },
                { from: 'lh',   to: 'cl',   sign: 1,  gain: 1.0, note: 'The LH surge triggers ovulation, and what is left of the follicle becomes the corpus luteum.' },
                { from: 'cl',   to: 'prog', sign: 1,  gain: 1.0, note: 'The corpus luteum releases progesterone.' },
                { from: 'prog', to: 'endo', sign: 1,  gain: 0.9, note: 'Progesterone maintains the thickened lining.' },
                { from: 'prog', to: 'fsh',  sign: -1, gain: 0.85, bend: -0.16, at: 0.24, note: 'Progesterone switches FSH down, so no new follicle starts.' },
                { from: 'prog', to: 'lh',   sign: -1, gain: 0.85, at: 0.26, note: 'Progesterone switches LH down too.' }
            ],
            lesions: [
                { k: 'none', label: 'Nothing — the loops are intact', clamp: {}, cut: [] },
                { k: 'pill', label: 'Steady oestrogen and progesterone taken from outside',
                  clamp: { oest: 78, prog: 82 }, cut: ['oest>lh'], external: ['oest', 'prog'],
                  ask: ['fsh', 'lh', 'foll'],
                  explain: 'FSH and LH are both suppressed, so no follicle matures and there is no ' +
                    'LH surge — and with no LH surge there is <b>no ovulation</b>. This is how the ' +
                    'combined contraceptive pill works, and it is a pure feedback argument: it does ' +
                    'not block anything mechanically, it convinces the pituitary that the second ' +
                    'half of a cycle is already under way.' },
                { k: 'pregnant', label: 'Pregnancy — hCG from the embryo keeps the corpus luteum alive',
                  clamp: { cl: 92 }, cut: [], ask: ['prog', 'endo', 'fsh'],
                  explain: 'Normally the corpus luteum breaks down after about ten days, ' +
                    'progesterone collapses and the lining is shed — a period. If an embryo ' +
                    'implants it releases <b>hCG</b>, which keeps the corpus luteum alive, so ' +
                    'progesterone stays high and the lining is <em>not</em> shed. A missed period ' +
                    'is that arrow not happening, and a pregnancy test detects the hCG that ' +
                    'prevented it.' },
                { k: 'nolh', label: 'The LH surge fails to happen',
                  clamp: { lh: 8 }, cut: [], ask: ['cl', 'prog', 'endo'],
                  explain: 'No LH surge means no ovulation, so no corpus luteum, so almost no ' +
                    'progesterone. The lining is built by oestrogen but never maintained, so it ' +
                    'breaks down early. Slide 172 asks exactly this — "what happens if LH is low?" ' +
                    '— and the chain is the answer.' },
                { k: 'nofeedback', label: 'The negative feedback from oestrogen is cut',
                  clamp: {}, cut: ['oest>fsh'], ask: ['fsh', 'foll'],
                  explain: 'FSH stays high, so instead of one follicle continuing while the rest ' +
                    'stop, several keep growing. That negative feedback arrow is what normally ' +
                    'makes a cycle release <em>one</em> egg — and the drugs used in fertility ' +
                    'treatment work partly by overriding it, which is why multiple births are more ' +
                    'common after them.' }
            ]
        }
    };

    /* ---------------- the solver ------------------------------------
       Relax the signed graph to a steady state. Every node starts at
       its baseline; clamped nodes are held; cut edges contribute
       nothing. Damped iteration so negative loops settle rather than
       oscillate. */
    function solve(model, lesion) {
        const cut = {}; (lesion.cut || []).forEach(c => { cut[c] = true; });
        const level = {};
        model.nodes.forEach(n => { level[n.k] = BASE; });
        const clamp = lesion.clamp || {};

        /* A CUT edge is not an edge that carries nothing. It is a signal the
           target can no longer detect — so the target behaves as though the
           source were at zero. Cutting an inhibitory arrow therefore releases
           the brake and the target rises, which is the whole point of the
           "negative feedback removed" case. */
        for (let it = 0; it < 600; it++) {
            const next = {};
            model.nodes.forEach(n => {
                if (clamp[n.k] !== undefined) { next[n.k] = clamp[n.k]; return; }
                let v = BASE;
                model.edges.filter(e => e.to === n.k).forEach(e => {
                    const src = cut[e.from + '>' + e.to] ? 0 : level[e.from];
                    v += e.sign * e.gain * (src - BASE);
                });
                next[n.k] = Math.max(0, Math.min(100, v));
            });
            // damping
            let moved = 0;
            model.nodes.forEach(n => {
                const target = next[n.k];
                const nv = level[n.k] + (target - level[n.k]) * 0.25;
                moved += Math.abs(nv - level[n.k]);
                level[n.k] = nv;
            });
            if (moved < 1e-6) break;
        }
        return level;
    }
    const dirOf = v => v > BASE + 4 ? 'up' : v < BASE - 4 ? 'down' : 'same';
    const DIRWORD = { up: 'rises', down: 'falls', same: 'stays about the same' };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.fb { padding:1rem 1.25rem 1.25rem; }',
            '.fb { --fb-ok:#2e7d32; --fb-bad:#aa272f; }',
            '[data-theme="dark"] .fb { --fb-ok:#7fc98a; --fb-bad:#e08a90; }',
            '[data-theme="sepia"] .fb { --fb-ok:#4a6b3d; --fb-bad:#a04040; }',
            '.fb-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; line-height:1.55; }',
            '.fb-tabs { display:flex; gap:0.4rem; margin-bottom:0.85rem; flex-wrap:wrap; }',
            '.fb-tab { font:inherit; font-size:0.76rem; font-weight:600; cursor:pointer;',
            '   padding:0.38rem 0.75rem; border:1px solid var(--border); border-radius:999px;',
            '   background:var(--bg); color:var(--text-secondary); touch-action:manipulation; }',
            '.fb-tab[aria-pressed="true"] { border-color:var(--light-teal); color:var(--text);',
            '   box-shadow:0 0 0 1px var(--light-teal); }',
            '.fb-intro { font-size:0.84rem; line-height:1.55; margin:0 0 0.85rem; }',
            '.fb-phase { display:flex; gap:0.4rem; margin-bottom:0.8rem; flex-wrap:wrap; }',
            '.fb-ph { font:inherit; font-size:0.74rem; font-weight:700; cursor:pointer;',
            '   padding:0.32rem 0.7rem; border:1px solid var(--border); border-radius:7px;',
            '   background:var(--bg); color:var(--text-secondary); touch-action:manipulation; }',
            '.fb-ph[aria-pressed="true"] { border-color:var(--light-teal); color:var(--text); }',
            '.fb-ph:disabled { opacity:0.4; cursor:not-allowed; }',
            '.fb-stage { border:1px solid var(--border); border-radius:11px; background:var(--bg);',
            '   padding:0.5rem; overflow-x:auto; }',
            '.fb-stage svg { display:block; width:100%; min-width:440px; height:auto; }',
            '.fb-slot rect { fill:var(--bg-surface); stroke:var(--text-secondary); stroke-width:1.4;',
            '   stroke-dasharray:4 3; }',
            '.fb-slot.filled rect { stroke-dasharray:none; stroke-width:1.6; }',
            '.fb-slot.sel rect { stroke:var(--light-teal); stroke-width:2.4; stroke-dasharray:none; }',
            '.fb-slot.ext rect { stroke:#aa272f; stroke-width:2.2; stroke-dasharray:none; }',
            '.fb-slot text { fill:var(--text); font-size:12px; font-weight:700; }',
            '.fb-slot .fb-sub { fill:var(--text-secondary); font-size:9.5px; font-weight:400; }',
            '.fb-slot .fb-lv { font-size:9.5px; font-weight:800; }',
            '.fb-arrow { fill:none; stroke:var(--fb-ink); stroke-width:1.6; }',
            '.fb-arrow.neg { stroke-dasharray:5 3; }',
            '.fb-arrow.cut { opacity:0.2; }',
            '.fb-sign { font-size:12px; font-weight:800; }',
            '.fb-sign.pos { fill:#2e7d32; } .fb-sign.neg { fill:#aa272f; }',
            '.fb-bank { display:flex; gap:0.35rem; flex-wrap:wrap; margin:0.8rem 0 0; }',
            '.fb-chip { font:inherit; font-size:0.78rem; cursor:pointer; padding:0.38rem 0.68rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; }',
            '.fb-chip:hover { border-color:var(--light-teal); }',
            '.fb-chip[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); font-weight:700; }',
            '.fb-chip.used { opacity:0.35; text-decoration:line-through; }',
            '.fb-chip.dragging { opacity:0.45; }',
            /* the illustrated version: everything is drawn in the image's own coordinates,
               so type and strokes are sized for a 2752-wide viewBox, not for CSS pixels */
            '.fb-stage { --fb-ink:var(--text-secondary); }',
            /* The artwork is a light JPEG in every theme, so arrows and leaders drawn on top
               of it cannot follow the theme's text colour — in dark mode they would be pale
               ink on a cream background. Pin them to the artwork's own outline colour. */
            '.fb-stage.img { --fb-ink:#5d4952; }',
            '.fb-stage.img svg { min-width:680px; }',
            '.fb-slot.plate rect { fill:var(--bg-surface); stroke-width:5;',
            '   stroke-dasharray:14 10; }',
            '.fb-slot.plate.filled rect { stroke-dasharray:none; stroke-width:5; }',
            '.fb-slot.plate.sel rect { stroke:var(--light-teal); stroke-width:9; stroke-dasharray:none; }',
            '.fb-slot.plate.over rect { stroke:var(--light-teal); stroke-width:11; stroke-dasharray:none;',
            '   fill-opacity:1; }',
            '.fb-slot.plate.ext rect { stroke:#aa272f; stroke-width:8; stroke-dasharray:none; }',
            '.fb-slot.plate:focus { outline:none; }',
            '.fb-slot.plate:focus rect { stroke:var(--light-teal); stroke-width:11; }',
            '.fb-stage text.fb-pl { fill:var(--text); font-size:52px; font-weight:700; }',
            '.fb-stage text.fb-ps { fill:var(--text-secondary); font-size:34px; font-weight:400; }',
            '.fb-stage text.fb-plv { font-size:42px; font-weight:800; }',
            '.fb-stage text.fb-pq { fill:var(--text-secondary); font-size:62px; font-weight:700; }',
            '.fb-arrow.big { stroke-width:7; }',
            '.fb-arrow.big.neg { stroke-dasharray:20 13; }',
            '.fb-stage text.fb-sign.big { font-size:64px; paint-order:stroke; stroke:var(--bg-surface);',
            '   stroke-width:10px; }',
            '.fb-lead { fill:none; stroke:var(--fb-ink); stroke-width:7; opacity:0.85; }',
            '.fb-lead.waiting { stroke-dasharray:22 14; opacity:0.8; }',
            '.fb-leaddot { fill:var(--fb-ink); opacity:1; }',
            '.fb-leaddot.waiting { fill:none; stroke:var(--fb-ink); stroke-width:8; opacity:1; }',
            '.fb-halo { fill:none; stroke:#fff; stroke-width:17; opacity:0.9; }',
            '.fb-badge circle { fill:var(--bg-surface); stroke-width:1.5; }',
            '.fb-badge text { font-size:15px; font-weight:800; }',
            '.fb-badge.big circle { stroke-width:5; }',
            '.fb-badge.big text { font-size:62px; }',
            '.fb-badge.pos circle { stroke:#2e7d32; } .fb-badge.pos text { fill:#2e7d32; }',
            '.fb-badge.neg circle { stroke:#aa272f; } .fb-badge.neg text { fill:#aa272f; }',
            '.fb-q { font-size:0.85rem; font-weight:600; margin:0.9rem 0 0.45rem; }',
            '.fb-row { display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;',
            '   margin-bottom:0.45rem; font-size:0.82rem; }',
            '.fb-row b { min-width:8.5rem; }',
            '.fb-dir { font:inherit; font-size:0.76rem; cursor:pointer; padding:0.3rem 0.6rem;',
            '   border:1px solid var(--border); border-radius:7px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; }',
            '.fb-dir[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 1px var(--light-teal); font-weight:700; }',
            '.fb-dir.right { border-color:var(--fb-ok); color:var(--fb-ok); font-weight:700; }',
            '.fb-dir.wrong { border-color:var(--fb-bad); color:var(--fb-bad); opacity:0.6; }',
            '.fb-sel { font:inherit; font-size:0.82rem; padding:0.35rem 0.5rem; border-radius:7px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text);',
            '   max-width:100%; margin-bottom:0.6rem; }',
            '.fb-msg { font-size:0.83rem; line-height:1.6; margin:0.5rem 0 0; min-height:2.2em; }',
            '.fb-msg.ok { color:var(--fb-ok); } .fb-msg.bad { color:var(--fb-bad); }',
            '.fb-msg b { color:var(--text); }',
            '.fb-out { margin-top:0.9rem; border:1px solid var(--border);',
            '   border-left:4px solid var(--light-teal); border-radius:9px;',
            '   background:var(--bg-surface); padding:0.8rem 0.95rem; font-size:0.85rem; line-height:1.65; }',
            '.fb-out h6 { margin:0 0 0.4rem; font-size:0.9rem; }',
            '.fb-out p { margin:0 0 0.55rem; } .fb-out p:last-child { margin-bottom:0; }',
            '.fb-legend { font-size:0.72rem; color:var(--text-secondary); margin:0.55rem 0 0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-feedback-builder'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'fb');
        root.appendChild(wrap);

        let model = MODELS.hpg;
        let phase = 'build';
        let placed = {};             // slotKey -> nodeKey
        let held = null;             // chip currently picked up
        let lesion = null;
        let guesses = {};            // nodeKey -> 'up'|'down'|'same'
        let checked = false;
        let msgText = null;

        const built = () => model.nodes.every(n => placed[model.key + ':' + n.k] === n.k);
        const slotOf = k => placed[model.key + ':' + k];

        function shuffledBank() {
            const list = model.nodes.map(n => n.k);
            // deterministic shuffle so the bank order is stable across renders
            const seed = model.key.length * 7 + 3;
            return list.slice().sort((a, b) =>
                ((a.charCodeAt(0) * seed) % 97) - ((b.charCodeAt(0) * seed) % 97));
        }

        function render() {
            wrap.innerHTML = '';

            const how = U.el('p', 'fb-how');
            how.innerHTML = 'A feedback loop is a set of organs and hormones joined by arrows, ' +
                'each of which either turns the next thing <b>up (+)</b> or turns it ' +
                '<b>down (&minus;)</b>. First build the loop. Then break it, and see whether you ' +
                'can predict what the whole system does.';
            wrap.appendChild(how);

            const tabs = U.el('div', 'fb-tabs');
            Object.keys(MODELS).forEach(k => {
                const m = MODELS[k];
                const b = U.el('button', 'fb-tab');
                b.type = 'button'; b.textContent = m.name;
                b.setAttribute('aria-pressed', m.key === model.key ? 'true' : 'false');
                b.addEventListener('click', () => {
                    model = m; phase = 'build'; held = null; lesion = null;
                    guesses = {}; checked = false; msgText = null; render();
                });
                tabs.appendChild(b);
            });
            wrap.appendChild(tabs);

            const intro = U.el('p', 'fb-intro'); intro.textContent = model.intro; wrap.appendChild(intro);

            const ph = U.el('div', 'fb-phase');
            [['build', '1 · Build the loop'], ['break', '2 · Break it']].forEach(([k, label]) => {
                const b = U.el('button', 'fb-ph');
                b.type = 'button'; b.textContent = label;
                b.setAttribute('aria-pressed', phase === k ? 'true' : 'false');
                b.disabled = k === 'break' && !built();
                b.addEventListener('click', () => { phase = k; msgText = null; render(); });
                ph.appendChild(b);
            });
            wrap.appendChild(ph);

            const stage = U.el('div', 'fb-stage' + (model.img ? ' img' : ''));
            stage.innerHTML = diagram();
            wrap.appendChild(stage);
            stage.querySelectorAll('.fb-slot').forEach(g => {
                const drop = k => {                      // shared by clicking and by dropping
                    if (held === k) {
                        placed[model.key + ':' + k] = k; held = null;
                        msgText = { cls: 'ok', html: fitNote(k) };
                    } else {
                        const wrongNode = model.nodes.filter(n => n.k === held)[0];
                        msgText = { cls: 'bad', html: '<b>' + wrongNode.label + '</b> does not belong ' +
                            'there. Read the arrows going into it: ' + arrowsInto(k) };
                        held = null;
                    }
                    render();
                };
                // drag-and-drop, for anyone who reaches for it first
                g.addEventListener('dragover', e => {
                    if (phase !== 'build' || !held) return;
                    e.preventDefault(); g.classList.add('over');
                });
                g.addEventListener('dragleave', () => g.classList.remove('over'));
                g.addEventListener('drop', e => {
                    if (phase !== 'build' || !held) return;
                    e.preventDefault(); g.classList.remove('over');
                    drop(g.dataset.k);
                });
                const act = () => {
                    if (phase !== 'build') return;
                    const k = g.dataset.k;
                    if (!held) {
                        if (slotOf(k)) { delete placed[model.key + ':' + k]; render(); }
                        else {
                            msgText = { cls: '', html: 'Pick a label from the bank first — drag it ' +
                                'across, or click it and then click a space.' };
                            render();
                        }
                        return;
                    }
                    drop(k);
                };
                g.addEventListener('click', act);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                });
            });

            const legend = U.el('p', 'fb-legend');
            legend.innerHTML = 'Solid arrow with <b>+</b> = turns the next thing up. ' +
                'Dashed arrow with <b>&minus;</b> = turns it down. ' +
                'A loop with an odd number of minus signs is <b>negative feedback</b> — it pulls ' +
                'a level back towards where it was.';
            wrap.appendChild(legend);

            if (phase === 'build') renderBuild(); else renderBreak();

            const msg = U.el('p', 'fb-msg' + (msgText ? ' ' + msgText.cls : ''));
            msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
            if (msgText) msg.innerHTML = msgText.html;
            wrap.appendChild(msg);
        }

        function arrowsInto(k) {
            const ins = model.edges.filter(e => e.to === k);
            if (!ins.length) return 'nothing points into it, so it must be the thing that starts ' +
                'the loop.';
            return ins.map(e => (e.sign > 0 ? 'something turns it up' : 'something turns it down'))
                .join(', and ') + '. And out of it: ' +
                (model.edges.filter(e => e.from === k).length || 'nothing') + ' arrow(s).';
        }
        function fitNote(k) {
            const outs = model.edges.filter(e => e.from === k);
            const node = model.nodes.filter(n => n.k === k)[0];
            if (!outs.length) return '<b>' + node.label + '</b> — placed. Nothing leaves it; it is ' +
                'the end of the chain.';
            return '<b>' + node.label + '</b> — placed. ' + outs[0].note;
        }

        function diagram() {
            return model.img ? diagramOnImage() : diagramPlain();
        }

        /* ---- the illustrated version -------------------------------------
           The artwork supplies the anatomy and nothing else — no lettering — so
           every plate, arrow and leader is drawn here, in the image's own
           coordinates. Plate positions were checked against the artwork so that
           none of them lands on a drawn structure. */
        function diagramOnImage() {
            const W = model.imgW, H = model.imgH, PW = 560, PH = 140;
            const root = (document.body.dataset.root || '../') + 'images/u4/';
            const levels = (phase === 'break' && lesion && checked) ? solve(model, lesion) : null;
            const cut = {}; if (lesion) (lesion.cut || []).forEach(c => { cut[c] = true; });

            let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
                'role="group" aria-label="' + model.desc + '">';
            s += arrowDefs(5);
            s += '<image href="' + root + model.img + '" x="0" y="0" width="' + W + '" height="' +
                H + '" preserveAspectRatio="xMidYMid meet"/>';

            // A leader from every plate to the structure it names — drawn whether or not the
            // plate has been filled. An empty plate with no leader is just a box floating over
            // a picture; with one, it points at a structure, and working out what that
            // structure is IS the task.
            model.nodes.forEach(n => {
                const filled = slotOf(n.k) === n.k;
                const p = edgePoint(n.sx + PW / 2, n.sy + PH / 2, PW / 2 + 4, PH / 2 + 4, n.ax, n.ay);
                s += '<path class="fb-lead' + (filled ? '' : ' waiting') + '" d="M' + p[0] + ' ' +
                    p[1] + ' L ' + n.ax + ' ' + n.ay + '"/>';
                if (filled) {
                    s += '<circle class="fb-leaddot" cx="' + n.ax + '" cy="' + n.ay + '" r="18"/>';
                } else {
                    s += '<circle class="fb-halo" cx="' + n.ax + '" cy="' + n.ay + '" r="34"/>';
                    s += '<circle class="fb-leaddot waiting" cx="' + n.ax + '" cy="' + n.ay + '" r="34"/>';
                }
            });

            // arrows between plates
            const rects = model.nodes.map(n => [n.sx, n.sy, n.sx + PW, n.sy + PH]);
            const taken = [];
            model.edges.forEach(e => {
                const a = pos(e.from), b = pos(e.to);
                if (!a || !b) return;
                s += arrowSVG(a, b, PW, PH, e, !!cut[e.from + '>' + e.to], true, rects, taken);
            });

            model.nodes.forEach(n => {
                const filled = slotOf(n.k) === n.k;
                const ext = lesion && (lesion.external || []).indexOf(n.k) > -1 && phase === 'break';
                const cls = 'fb-slot plate' + (filled ? ' filled' : '') + (held === n.k ? ' sel' : '') +
                    (ext ? ' ext' : '');
                s += '<g class="' + cls + '" data-k="' + n.k + '" role="button" tabindex="0" ' +
                    'aria-label="' + (filled ? n.label + ', ' + n.sub : 'empty label space') + '">';
                s += '<rect x="' + n.sx + '" y="' + n.sy + '" width="' + PW + '" height="' + PH + '" rx="20"/>';
                if (filled) {
                    s += '<text class="fb-pl" x="' + (n.sx + 26) + '" y="' + (n.sy + 62) + '">' + n.label + '</text>';
                    // The second line carries whichever matters here: while building, what the
                    // thing is; once the model has been run, what happened to it. Fitting both
                    // on one plate makes the longest labels collide with their own result.
                    if (levels) {
                        const dr = dirOf(levels[n.k]);
                        const col = dr === 'up' ? '#2e7d32' : dr === 'down' ? '#aa272f' : 'var(--text-secondary)';
                        const glyph = dr === 'up' ? '▲ high' : dr === 'down' ? '▼ low' : '● steady';
                        s += '<text class="fb-plv" x="' + (n.sx + 26) + '" y="' + (n.sy + 112) +
                             '" fill="' + col + '">' + glyph + '</text>';
                    } else {
                        s += '<text class="fb-ps" x="' + (n.sx + 26) + '" y="' + (n.sy + 108) + '">' + n.sub + '</text>';
                    }
                } else {
                    s += '<text class="fb-pq" x="' + (n.sx + PW / 2) + '" y="' + (n.sy + PH / 2 + 22) +
                         '" text-anchor="middle">?</text>';
                }
                s += '</g>';
            });
            s += '</svg>';
            return s;
        }

        function diagramPlain() {
            const W = 470, H = model.key === 'cycle' ? 350 : model.key === 'gh' ? 272 : 282;
            const BW = 150, BH = 46;
            const levels = (phase === 'break' && lesion && checked) ? solve(model, lesion) : null;
            const cut = {}; if (lesion) (lesion.cut || []).forEach(c => { cut[c] = true; });

            let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
                'role="img" aria-label="' + model.name + '. ' +
                model.edges.map(e => nodeName(e.from) + (e.sign > 0 ? ' increases ' : ' decreases ') +
                    nodeName(e.to)).join('. ') + '.">';
            s += arrowDefs(6);

            // arrows first, so boxes sit on top
            const rects = model.nodes.map(n => [n.x, n.y, n.x + BW, n.y + BH]);
            const taken = [];
            model.edges.forEach(e => {
                const a = pos(e.from), b = pos(e.to);
                if (!a || !b) return;
                s += arrowSVG(a, b, BW, BH, e, !!cut[e.from + '>' + e.to], false, rects, taken);
            });

            model.nodes.forEach(n => {
                const filled = slotOf(n.k) === n.k;
                const ext = lesion && (lesion.external || []).indexOf(n.k) > -1 && phase === 'break';
                const cls = 'fb-slot' + (filled ? ' filled' : '') + (held === n.k ? ' sel' : '') +
                    (ext ? ' ext' : '');
                s += '<g class="' + cls + '" data-k="' + n.k + '" role="button" tabindex="0" ' +
                    'aria-label="' + (filled ? n.label : 'empty box') + '">';
                s += '<rect x="' + n.x + '" y="' + n.y + '" width="' + BW + '" height="' + BH + '" rx="9"/>';
                if (filled) {
                    s += '<text x="' + (n.x + 10) + '" y="' + (n.y + 20) + '">' + n.label + '</text>';
                    s += '<text class="fb-sub" x="' + (n.x + 10) + '" y="' + (n.y + 34) + '">' +
                         n.sub + '</text>';
                    if (levels) {
                        const d = dirOf(levels[n.k]);
                        const col = d === 'up' ? '#2e7d32' : d === 'down' ? '#aa272f' : 'var(--text-secondary)';
                        const glyph = d === 'up' ? '▲ high' : d === 'down' ? '▼ low' : '● steady';
                        s += '<text class="fb-lv" x="' + (n.x + BW - 8) + '" y="' + (n.y + 20) +
                             '" text-anchor="end" fill="' + col + '">' + glyph + '</text>';
                    }
                } else {
                    s += '<text class="fb-sub" x="' + (n.x + 10) + '" y="' + (n.y + 28) + '">?</text>';
                }
                s += '</g>';
            });
            s += '</svg>';
            return s;
        }
        function nodeName(k) {
            const n = model.nodes.filter(x => x.k === k)[0];
            return n ? n.label : k;
        }

        /* This has to sit INSIDE the <svg>. It previously did not — the string was prepended
           to the whole svg tag rather than inserted after it, which put the marker outside the
           document fragment, so marker-end resolved to nothing and no arrow ever had a head. */
        function arrowDefs(size) {
            return '<defs><marker id="fbhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="' +
                size + '" markerHeight="' + size + '" orient="auto-start-reverse">' +
                '<path d="M0 0 L10 5 L0 10 z" fill="var(--fb-ink)"/></marker></defs>';
        }

        /* One arrow with its sign. The sign is a badge rather than a bare glyph: at either
           scale a lone minus reads as a stray dash next to a dashed line.

           Where the badge sits is chosen rather than authored. The preferred spot is the one
           the edge asks for, but if that lands on a plate or on a badge already placed, the
           badge slides along its own arrow until it finds clear air. Hand-tuned positions
           only hold until a plate moves; this keeps holding. */
        function badgeSpot(a, b, BW, BH, e, rects, taken, r) {
            const bend = e.bend === undefined ? 0.13 : e.bend;
            const wanted = e.at === undefined ? 0.5 : e.at;
            const tries = [wanted, 0.36, 0.64, 0.26, 0.74, 0.18, 0.82, 0.5];
            let fallback = null;
            for (const t of tries) {
                const p = linkRect(a, b, BW, BH, bend, t);
                const onPlate = rects.some(R => p.mx > R[0] - r && p.mx < R[2] + r &&
                                                p.my > R[1] - r && p.my < R[3] + r);
                const onBadge = taken.some(q => Math.hypot(q[0] - p.mx, q[1] - p.my) < r * 2 + r * 0.2);
                if (!onPlate && !onBadge) return p;
                if (!fallback) fallback = p;
            }
            return fallback;
        }

        function arrowSVG(a, b, BW, BH, e, isCut, big, rects, taken) {
            const r = big ? 40 : 11, dy = big ? 22 : 6;
            const p = badgeSpot(a, b, BW, BH, e, rects, taken, r);
            taken.push([p.mx, p.my]);
            const o = isCut ? ' opacity="0.3"' : '';
            return '<path class="fb-arrow' + (big ? ' big' : '') + (e.sign < 0 ? ' neg' : '') +
                (isCut ? ' cut' : '') + '" d="' + p.d + '" marker-end="url(#fbhead)"/>' +
                '<g class="fb-badge ' + (big ? 'big ' : '') + (e.sign > 0 ? 'pos' : 'neg') + '"' + o + '>' +
                '<circle cx="' + p.mx + '" cy="' + p.my + '" r="' + r + '"/>' +
                '<text x="' + p.mx + '" y="' + (p.my + dy) + '" text-anchor="middle">' +
                (e.sign > 0 ? '+' : '−') + '</text></g>';
        }
        function pos(k) { return model.nodes.filter(n => n.k === k)[0]; }

        /* Where the straight line from (cx,cy) towards (tx,ty) leaves a box of half-size
           hw by hh. Walking out along the direction and stopping at whichever edge is hit
           first is what the old version got wrong: it snapped to one axis, so arrows
           between diagonally placed boxes started and ended in mid-air. */
        function edgePoint(cx, cy, hw, hh, tx, ty) {
            const dx = tx - cx, dy = ty - cy;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len, uy = dy / len;
            const t = Math.min(ux === 0 ? Infinity : hw / Math.abs(ux),
                               uy === 0 ? Infinity : hh / Math.abs(uy));
            return [Math.round(cx + ux * t), Math.round(cy + uy * t)];
        }

        /* A bowed arrow from box a to box b. `bend` is the sideways bow as a fraction of the
           arrow's length, signed, so two arrows running between the same pair of boxes — or
           along the same corridor — can be pushed apart instead of overlapping. */
        function linkRect(a, b, BW, BH, bend, at) {
            const A = model.img ? { x: a.sx, y: a.sy } : a, B = model.img ? { x: b.sx, y: b.sy } : b;
            const ax = A.x + BW / 2, ay = A.y + BH / 2, bx = B.x + BW / 2, by = B.y + BH / 2;
            const gap = model.img ? 10 : 3;
            const [sx, sy] = edgePoint(ax, ay, BW / 2 + gap, BH / 2 + gap, bx, by);
            const [ex, ey] = edgePoint(bx, by, BW / 2 + gap * 2.2, BH / 2 + gap * 2.2, ax, ay);
            const mx = (sx + ex) / 2, my = (sy + ey) / 2;
            const L = Math.hypot(ex - sx, ey - sy) || 1;
            const nx = -(ey - sy) / L, ny = (ex - sx) / L;         // unit normal to the arrow
            const k = (bend || 0) * L;
            const cx = mx + nx * k * 2, cy = my + ny * k * 2;      // control point: curve peaks at k
            // Put the sign on the curve itself, at `at` along it. Two arrows leaving the same
            // plate can then be given different `at` values so their signs never collide.
            const t = at === undefined ? 0.5 : at, u = 1 - t;
            const px = u * u * sx + 2 * u * t * cx + t * t * ex;
            const py = u * u * sy + 2 * u * t * cy + t * t * ey;
            const tx = 2 * u * (cx - sx) + 2 * t * (ex - cx);      // tangent, for the sideways nudge
            const ty = 2 * u * (cy - sy) + 2 * t * (ey - cy);
            const tl = Math.hypot(tx, ty) || 1;
            const off = (model.img ? 40 : 13) * (k >= 0 ? 1 : -1);
            return {
                d: 'M' + sx + ' ' + sy + ' Q ' + Math.round(cx) + ' ' + Math.round(cy) + ' ' + ex + ' ' + ey,
                mx: Math.round(px - ty / tl * off),
                my: Math.round(py + tx / tl * off)
            };
        }

        function renderBuild() {
            if (built()) {
                const d = U.el('div', 'fb-out');
                d.innerHTML = '<h6>Loop assembled</h6><p>Trace it round. ' + loopStory() +
                    '</p><p>Count the minus signs going round the loop: an <b>odd</b> number means ' +
                    'the loop opposes any change, which is <b>negative feedback</b>. That is what ' +
                    'holds a level steady. Now break it.</p>';
                wrap.appendChild(d);
                return;
            }
            const q = U.el('p', 'fb-q');
            q.textContent = model.img
                ? 'Drag each label onto the space it belongs in — or click a label and then click a space.'
                : 'Pick a label, then click the box it belongs in.';
            wrap.appendChild(q);
            const bank = U.el('div', 'fb-bank');
            shuffledBank().forEach(k => {
                const n = pos(k);
                const used = slotOf(k) === k;
                const b = U.el('button', 'fb-chip' + (used ? ' used' : ''));
                b.type = 'button'; b.textContent = n.label;
                b.disabled = used;
                b.setAttribute('aria-pressed', held === k ? 'true' : 'false');
                b.addEventListener('click', () => { held = held === k ? null : k; msgText = null; render(); });
                // Dragging is an alternative, never the only way in: picking the chip up by
                // dragging sets exactly the same `held` state that clicking it does, so touch
                // and keyboard users lose nothing.
                b.draggable = !used;
                b.addEventListener('dragstart', e => {
                    held = k; msgText = null;
                    b.classList.add('dragging');
                    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k); }
                });
                b.addEventListener('dragend', () => {
                    b.classList.remove('dragging');
                    wrap.querySelectorAll('.fb-slot.over').forEach(g => g.classList.remove('over'));
                });
                bank.appendChild(b);
            });
            wrap.appendChild(bank);
        }

        function loopStory() {
            return model.edges.map(e => nodeName(e.from) + (e.sign > 0 ? ' &rarr; ' : ' &#8867; ') +
                nodeName(e.to)).join('; ') + '.';
        }

        function renderBreak() {
            const q = U.el('p', 'fb-q');
            q.textContent = 'Choose an intervention.';
            wrap.appendChild(q);
            const sel = document.createElement('select');
            sel.className = 'fb-sel';
            model.lesions.forEach(l => {
                const o = document.createElement('option');
                o.value = l.k; o.textContent = l.label;
                if (lesion && lesion.k === l.k) o.selected = true;
                sel.appendChild(o);
            });
            sel.addEventListener('change', () => {
                lesion = model.lesions.filter(l => l.k === sel.value)[0];
                guesses = {}; checked = false; msgText = null; render();
            });
            wrap.appendChild(sel);
            if (!lesion) { lesion = model.lesions[0]; }

            if (lesion.k === 'none' || !lesion.ask) {
                const d = U.el('div', 'fb-out');
                d.innerHTML = '<h6>Nothing is broken</h6><p>Every hormone sits at its normal level, ' +
                    'and it stays there because the loop is pulling it back whenever it drifts. ' +
                    'Choose an intervention above to test whether you can predict what happens.</p>';
                wrap.appendChild(d);
                return;
            }

            const q2 = U.el('p', 'fb-q');
            q2.innerHTML = 'Predict, before you check. What happens to each of these?';
            wrap.appendChild(q2);
            const truth = solve(model, lesion);
            lesion.ask.forEach(k => {
                const row = U.el('div', 'fb-row');
                const b = document.createElement('b'); b.textContent = nodeName(k);
                row.appendChild(b);
                ['up', 'same', 'down'].forEach(d => {
                    const btn = U.el('button', 'fb-dir' +
                        (checked ? (d === dirOf(truth[k]) ? ' right'
                            : guesses[k] === d ? ' wrong' : '') : ''));
                    btn.type = 'button';
                    btn.textContent = d === 'up' ? 'Rises' : d === 'down' ? 'Falls' : 'No change';
                    btn.setAttribute('aria-pressed', guesses[k] === d ? 'true' : 'false');
                    btn.disabled = checked;
                    btn.addEventListener('click', () => { guesses[k] = d; msgText = null; render(); });
                    row.appendChild(btn);
                });
                wrap.appendChild(row);
            });

            const btns = U.el('div', 'sim-buttons');
            if (!checked) {
                const go = U.button(btns, 'Run the model');
                go.disabled = lesion.ask.some(k => !guesses[k]);
                go.addEventListener('click', () => { checked = true; render(); });
            } else {
                U.button(btns, 'Try another prediction').addEventListener('click', () => {
                    guesses = {}; checked = false; msgText = null; render();
                });
            }
            wrap.appendChild(btns);

            if (checked) {
                const right = lesion.ask.filter(k => guesses[k] === dirOf(truth[k])).length;
                const d = U.el('div', 'fb-out');
                d.innerHTML = '<h6>' + right + ' of ' + lesion.ask.length + ' correct</h6>' +
                    '<p>' + lesion.ask.map(k => '<b>' + nodeName(k) + '</b> ' +
                        DIRWORD[dirOf(truth[k])]).join('. ') + '.</p>' +
                    '<p>' + lesion.explain + '</p>';
                wrap.appendChild(d);
            }
        }

        render();

        root._simState = () => {
            const l = lesion || model.lesions[0];
            return {
                model: model.key, phase, built: built(),
                placed: model.nodes.filter(n => slotOf(n.k) === n.k).map(n => n.k),
                lesion: l.k, checked,
                guesses: Object.assign({}, guesses),
                levels: solve(model, l),
                directions: model.nodes.reduce((a, n) => {
                    a[n.k] = dirOf(solve(model, l)[n.k]); return a;
                }, {})
            };
        };
        root._simSolve = () => {
            model.nodes.forEach(n => { placed[model.key + ':' + n.k] = n.k; });
            phase = 'break';
            lesion = model.lesions[1];
            const truth = solve(model, lesion);
            guesses = {};
            (lesion.ask || []).forEach(k => { guesses[k] = dirOf(truth[k]); });
            checked = true; msgText = null; render();
        };
    };
})();
