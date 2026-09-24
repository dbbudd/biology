/* =============================================================
   INTERACTIVE — Trace the nutrient
   -------------------------------------------------------------
   Registers window.SIMS['u1-systems'].  Supports HS-LS1-2.

   Five things leave or enter the gut and have to get somewhere.
   The reader chooses the next structure at every step; the sim
   names the body system each structure belongs to and builds a
   coloured chain, so the answer to "which systems interact with
   the digestive system" is assembled rather than listed.

   The routes are chosen so that the two most-missed facts fall
   out of the doing: sugar and amino acids go to the liver first
   and fat does not, and the gut talks to the brain.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u1-systems-style';

    const SYS = {
        dig: ['Digestive', '#c0392b'],
        circ: ['Circulatory', '#aa272f'],
        lymph: ['Lymphatic', '#2f6fb5'],
        resp: ['Respiratory', '#3f8f4a'],
        urin: ['Urinary', '#c78a18'],
        nerv: ['Nervous', '#7d4fa8'],
        endo: ['Endocrine', '#b26a00'],
        musc: ['Muscular', '#557']
    };

    const ROUTES = [
        {
            id: 'glucose',
            name: 'Glucose from the bread',
            open: 'A slice of bread has been digested to glucose, and the glucose is sitting in the lumen of your small intestine. It has to reach a working muscle cell in your leg. Choose each step.',
            close: 'Glucose from your gut visits the liver before it reaches anything else. The liver takes the first look at everything you absorb, decides how much sugar the rest of the body is allowed, and stores the rest as glycogen. That is why blood sugar after a meal rises far less than the size of the meal suggests it should.',
            steps: [
                { q: 'The glucose is in the lumen. What does it cross first?',
                  o: [
                    { t: 'Into an epithelial cell of a villus, through the SGLT1 transporter', ok: true, sys: 'dig',
                      why: 'Glucose is a large polar molecule, so it cannot dissolve through the oily core of the membrane. SGLT1 is a protein built to carry it, and it drags glucose in alongside sodium — so glucose is absorbed even when there is more of it inside the cell than outside.' },
                    { t: 'Straight into a capillary, without entering any cell', ok: false,
                      why: 'There is a continuous sheet of epithelial cells between the lumen and the blood. Nothing gets to the capillary without going through a cell first — which is exactly how the body controls what is allowed in.' },
                    { t: 'Into a lacteal', ok: false,
                      why: 'The lacteal is the lymph vessel in the middle of the villus, and it takes fat. Water-soluble molecules like glucose take the blood route.' },
                    { t: 'Through an aquaporin', ok: false,
                      why: 'Aquaporins carry water and essentially nothing else. Their selectivity is the point of the protein.' }
                  ] },
                { q: 'It is inside the villus epithelial cell. Where next?',
                  o: [
                    { t: 'Into the capillary network inside the villus', ok: true, sys: 'circ',
                      why: 'Every villus has its own dense capillary bed a few micrometres from the surface. The distance from lumen to blood is tiny, which is what makes absorption fast.' },
                    { t: 'Back into the lumen', ok: false, why: 'Nothing is gained by that, and the SGLT1 transporter only runs one way.' },
                    { t: 'Into the lacteal', ok: false, why: 'Still the fat route. Glucose is water-soluble and belongs in the blood.' },
                    { t: 'Into the lymph node', ok: false, why: 'Lymph nodes filter lymph for pathogens. Absorbed sugar has no business there.' }
                  ] },
                { q: 'It is in the blood leaving the villus. Where does that blood go?',
                  o: [
                    { t: 'To the liver, along the hepatic portal vein', ok: true, sys: 'circ',
                      why: 'This is the unusual bit of plumbing worth remembering. Blood leaving the gut does not go straight back to the heart — it goes to the liver first, through a vein that runs from one capillary bed to another. The liver gets first refusal on everything you absorb.' },
                    { t: 'Straight to the heart, then out to the body', ok: false,
                      why: 'That is what happens to absorbed fat, but not to sugar. Sugar and amino acids are routed through the liver first.' },
                    { t: 'To the kidneys, to be filtered', ok: false,
                      why: 'Blood does reach the kidneys eventually, but healthy kidneys put all the glucose back. Glucose in urine is a sign that blood glucose is too high — it is a symptom, not a route.' },
                    { t: 'To the lungs, to collect oxygen', ok: false,
                      why: 'It will reach the lungs later, on its way round the circulation. But the first stop after the gut is the liver.' }
                  ] },
                { q: 'The liver has taken its share. How does the rest reach the leg muscle?',
                  o: [
                    { t: 'Hepatic vein → heart → aorta → arteries → capillaries in the muscle', ok: true, sys: 'circ',
                      why: 'From here it is ordinary circulation. The heart is the pump that makes every one of these journeys possible, which is why the circulatory system appears in almost every route you can trace.' },
                    { t: 'Through the lymphatic system', ok: false, why: 'Lymph moves slowly and has no pump of its own. It is not how you deliver fuel to a working muscle.' },
                    { t: 'Along a nerve', ok: false, why: 'Nerves carry signals, not cargo. Nothing material is delivered along an axon to a distant organ.' },
                    { t: 'Through the bile duct', ok: false, why: 'The bile duct runs from the liver back into the gut. It is an exit, not a delivery route.' }
                  ] },
                { q: 'Last step — into the muscle cell itself.',
                  o: [
                    { t: 'Through a GLUT4 transporter, which insulin puts into the membrane', ok: true, sys: 'endo',
                      why: 'Muscle and fat cells only take up much glucose when insulin tells them to, by moving GLUT4 transporters into the membrane. The endocrine system decides who is allowed to eat — which is where Chapter 1.6 picks the story up.' },
                    { t: 'By dissolving through the phospholipid bilayer', ok: false,
                      why: 'Glucose is polar. It will not dissolve in the oily core of the membrane, however much of it there is outside.' },
                    { t: 'By osmosis', ok: false,
                      why: 'Osmosis is the movement of water, not of solutes. Glucose is the solute here.' },
                    { t: 'Through an aquaporin', ok: false, why: 'Water only.' }
                  ] }
            ]
        },
        {
            id: 'fat',
            name: 'A fatty acid from the butter',
            open: 'The butter has been emulsified by bile and broken up by lipase. Fatty acids are now in the lumen. Follow one to a fat store under the skin.',
            close: 'Fat takes the lymphatic route and enters the bloodstream near the heart. That means digested fat reaches the rest of your body *before* the liver sees it — the exact opposite of sugar. One meal, two nutrients, two different sets of body systems.',
            steps: [
                { q: 'Into the villus epithelial cell. How does a fatty acid cross the membrane?',
                  o: [
                    { t: 'It dissolves straight through the membrane — it is non-polar', ok: true, sys: 'dig',
                      why: 'Fatty acids are lipids, and the middle of the membrane is lipid. This is the one nutrient that does not need a transport protein, and it is the clearest example in the body of "chemistry, not size" deciding what crosses.' },
                    { t: 'Through SGLT1', ok: false, why: 'SGLT1 is the sodium–glucose transporter. Fat does not need it and does not fit it.' },
                    { t: 'Through an aquaporin', ok: false, why: 'Water only — and fat and water are the least compatible pair in the body.' },
                    { t: 'By active transport, using ATP', ok: false, why: 'No energy is needed. Fatty acids move down their concentration gradient through a membrane they dissolve in.' }
                  ] },
                { q: 'Inside the cell, the fatty acids are rebuilt into fats and wrapped in protein. Where does that package go?',
                  o: [
                    { t: 'Into the lacteal — a lymph vessel in the centre of the villus', ok: true, sys: 'lymph',
                      why: 'The packages, called chylomicrons, are far too big for a capillary wall. Lacteals are leakier, so fat goes into the lymph. This is why lymph leaving the gut after a fatty meal looks milky.' },
                    { t: 'Into the villus capillary, with the glucose', ok: false,
                      why: 'A chylomicron is roughly a hundred times wider than a glucose molecule. Capillary walls will not pass it.' },
                    { t: 'Back into the lumen', ok: false, why: 'That would undo the entire process.' },
                    { t: 'Into the hepatic portal vein', ok: false,
                      why: 'That is the sugar and amino acid route. Fat deliberately bypasses the liver on the way in.' }
                  ] },
                { q: 'The lymph carries it away. Where does lymph finally go?',
                  o: [
                    { t: 'Up the thoracic duct and into a vein near the collarbone', ok: true, sys: 'lymph',
                      why: 'The lymphatic system is a one-way drainage network. Everything it collects is returned to the blood at the base of the neck — which is why absorbed fat joins the circulation close to the heart rather than at the gut.' },
                    { t: 'Into the kidney to be filtered', ok: false, why: 'Lymph is not filtered by the kidney. It rejoins the blood first.' },
                    { t: 'Into the liver', ok: false, why: 'The liver deals with fat later, once it is circulating — but not on the way in.' },
                    { t: 'Back into the small intestine', ok: false, why: 'Lymph never flows backwards; there are valves preventing it.' }
                  ] },
                { q: 'Now it is in the blood. Last step.',
                  o: [
                    { t: 'Heart → arteries → a fat-storing cell, which stores it as a triglyceride', ok: true, sys: 'circ',
                      why: 'Fat is stored rather than used immediately because it carries more than twice the energy per gram of sugar or protein — 9 kcal per gram against 4. It is the body\'s long-term account.' },
                    { t: 'Straight out in the urine', ok: false, why: 'Fat is not water-soluble, so the kidney cannot excrete it. Nothing useful is thrown away here.' },
                    { t: 'Exhaled through the lungs', ok: false,
                      why: 'Interestingly, when fat is eventually *broken down* most of its mass does leave as carbon dioxide through the lungs. But not as fat, and not now.' },
                    { t: 'Back to the small intestine to be digested again', ok: false, why: 'It has already been digested and absorbed.' }
                  ] }
            ]
        },
        {
            id: 'oxygen',
            name: 'Oxygen for burning that glucose',
            open: 'Glucose has arrived at the muscle cell. On its own it is useless — releasing its energy needs oxygen. Trace one oxygen molecule from the air to the same cell.',
            close: 'The digestive system delivers the fuel and the respiratory system delivers the oxygen, but neither of them can move anything more than a few micrometres. Every long-distance step in both routes was made by the circulatory system.',
            steps: [
                { q: 'Air is drawn into the lungs. Where does oxygen leave the air?',
                  o: [
                    { t: 'At an alveolus — a thin-walled air sac wrapped in capillaries', ok: true, sys: 'resp',
                      why: 'There are roughly 300 million alveoli, giving a gas-exchange surface of around 70 m². Folding again — the same trick as the villus, for the same reason.' },
                    { t: 'In the trachea', ok: false, why: 'The trachea is a tube for moving air. Its wall is thick and cartilage-reinforced; no gas crosses it.' },
                    { t: 'In the bronchi', ok: false, why: 'Also plumbing. Exchange happens only where the wall is one cell thick.' },
                    { t: 'In the nose', ok: false, why: 'The nose warms, moistens and filters air. It does not exchange gas.' }
                  ] },
                { q: 'How does oxygen cross from the air into the blood?',
                  o: [
                    { t: 'By diffusion — it is small and non-polar, so it dissolves straight through', ok: true, sys: 'resp',
                      why: 'No pump, no protein, no energy. There is more oxygen in the air sac than in the blood, so it moves down the gradient — exactly the process you met in Chapter 1.1.' },
                    { t: 'By active transport', ok: false, why: 'None is needed, and none is used. Diffusion is free.' },
                    { t: 'Through aquaporins', ok: false, why: 'Water only.' },
                    { t: 'By osmosis', ok: false, why: 'Osmosis moves water. Oxygen is not water.' }
                  ] },
                { q: 'It is in the blood. How is it carried?',
                  o: [
                    { t: 'Bound to haemoglobin inside a red blood cell', ok: true, sys: 'circ',
                      why: 'Oxygen dissolves poorly in water. Haemoglobin raises how much blood can carry by around seventy times — without it, your circulation could not supply a resting body, let alone a running one.' },
                    { t: 'Dissolved in the plasma, and only in the plasma', ok: false,
                      why: 'A little is, but nowhere near enough. Around 98 per cent of the oxygen in your blood is on haemoglobin.' },
                    { t: 'In the lymph', ok: false, why: 'Lymph does not carry oxygen to tissues.' },
                    { t: 'Attached to white blood cells', ok: false, why: 'White cells fight infection. Oxygen transport is the red cell\'s job.' }
                  ] },
                { q: 'Last step — into the muscle cell and to the organelle that uses it.',
                  o: [
                    { t: 'Diffuses out of a capillary, into the cell, into a mitochondrion', ok: true, sys: 'musc',
                      why: 'The mitochondrion is where glucose and oxygen finally meet. Both routes you have traced — one through the digestive system, one through the respiratory system — end at the same organelle. That is Unit 2.' },
                    { t: 'Is pumped into the nucleus', ok: false, why: 'The nucleus holds DNA. Nothing is burned there.' },
                    { t: 'Stays in the blood and is exhaled again', ok: false, why: 'Some is, but a working muscle takes a great deal of it out.' },
                    { t: 'Is filtered out by the kidney', ok: false, why: 'The kidney removes waste, not the oxygen the body needs.' }
                  ] }
            ]
        },
        {
            id: 'urea',
            name: 'The nitrogen left over from the cheese',
            open: 'Amino acids from the cheese have arrived at the liver. You have absorbed more than you need, and unlike fat and sugar, surplus amino acids cannot simply be stored. Follow the leftover nitrogen out of the body.',
            close: 'Here is the point most people miss: the digestive system has no way of getting rid of anything it has already absorbed. Once a molecule is in the blood, only the urinary system can remove it. Egestion and excretion are different jobs done by different systems.',
            steps: [
                { q: 'The liver breaks down the surplus amino acid. What happens to its nitrogen?',
                  o: [
                    { t: 'The amino group is removed and converted to urea — deamination', ok: true, sys: 'dig',
                      why: 'The carbon skeleton left behind can be burned for energy or turned into fat. The nitrogen cannot, and free ammonia is toxic, so the liver converts it to urea, which is far safer to carry in the blood.' },
                    { t: 'It is stored in the liver for later', ok: false,
                      why: 'The body has no store for surplus protein. This is why eating extra protein does not build extra muscle on its own.' },
                    { t: 'It is sent back to the intestine', ok: false, why: 'The gut cannot take back something already absorbed.' },
                    { t: 'It is breathed out', ok: false, why: 'The lungs remove carbon dioxide and water, not nitrogen waste.' }
                  ] },
                { q: 'Urea is in the blood. Which organ removes it?',
                  o: [
                    { t: 'The kidney', ok: true, sys: 'urin',
                      why: 'Your kidneys filter roughly 180 litres of fluid a day and put nearly all of it back, keeping the urea and the excess salt and water. It is the second great reabsorption surface in the body, after the gut.' },
                    { t: 'The large intestine', ok: false,
                      why: 'The large intestine handles material that was never absorbed. Urea was made inside your own cells; it has to leave by a different door.' },
                    { t: 'The liver', ok: false, why: 'The liver made the urea. Something else has to take it out.' },
                    { t: 'The spleen', ok: false, why: 'The spleen recycles old red blood cells. It is not an excretory organ.' }
                  ] },
                { q: 'Out of the kidney, and out of the body.',
                  o: [
                    { t: 'Ureter → bladder → urethra', ok: true, sys: 'urin',
                      why: 'Removing waste your own cells made is called excretion. Removing material that was never absorbed is called egestion, and that is what leaves the other end. Two different processes, two different systems, two different meanings.' },
                    { t: 'Into the rectum with the faeces', ok: false, why: 'Faeces are undigested residue. Urea never entered the gut contents.' },
                    { t: 'Out through the skin only', ok: false,
                      why: 'A very small amount of urea does leave in sweat, which is why sweat tastes salty and slightly bitter — but the kidney does almost all of it.' },
                    { t: 'It is broken down to nitrogen gas and exhaled', ok: false, why: 'Humans cannot do this. Only certain bacteria can.' }
                  ] }
            ]
        },
        {
            id: 'signal',
            name: 'The message that says "stop eating"',
            open: 'Nothing material leaves the gut this time. Your small intestine has detected fat and protein arriving, and somehow, twenty minutes later, you stop feeling hungry. Trace the signal.',
            close: 'Your gut is lined with more nerve cells than your spinal cord contains, and it is in constant two-way conversation with your brain. The digestive system is not a passive tube being told what to do — it is a sense organ.',
            steps: [
                { q: 'Nutrients arrive in the small intestine. What detects them?',
                  o: [
                    { t: 'Specialised cells in the gut lining that release hormones when nutrients touch them', ok: true, sys: 'endo',
                      why: 'These are enteroendocrine cells, and there are enough of them scattered through the gut lining to make the intestine the largest hormone-producing organ in your body. They release CCK and GLP-1 when fat and protein arrive.' },
                    { t: 'The brain, directly', ok: false, why: 'The brain has no way of tasting what is in your intestine. Something in the gut has to tell it.' },
                    { t: 'The liver', ok: false, why: 'The liver responds later, to what has been absorbed. It is not the detector.' },
                    { t: 'The stomach only, by stretching', ok: false,
                      why: 'Stretch receptors in the stomach do report fullness, and they matter — but they cannot tell what you ate. The intestine can.' }
                  ] },
                { q: 'The hormones are released. How does the message travel?',
                  o: [
                    { t: 'In the blood, and along the vagus nerve at the same time', ok: true, sys: 'nerv',
                      why: 'Both routes at once — a slow chemical one and a fast electrical one. The vagus nerve carries far more traffic from the gut to the brain than the other way round.' },
                    { t: 'Only in the blood', ok: false, why: 'That would be far too slow on its own. The nerve route carries the fast half of the message.' },
                    { t: 'Only along nerves', ok: false, why: 'The hormones are genuinely released into the blood and act on the brain there too.' },
                    { t: 'Through the lymphatic system', ok: false, why: 'Lymph is a drainage system, not a signalling one.' }
                  ] },
                { q: 'Where does the message arrive?',
                  o: [
                    { t: 'The hypothalamus, which sets hunger and fullness', ok: true, sys: 'nerv',
                      why: 'The hypothalamus is the control centre for hunger, temperature, thirst and several other regulated variables. You will meet it again in Chapter 1.6 as the control centre of a feedback loop.' },
                    { t: 'The cerebellum, which controls balance', ok: false, why: 'Balance and coordination. Not appetite.' },
                    { t: 'The spinal cord, and no further', ok: false, why: 'The spinal cord relays; it does not decide that you are full.' },
                    { t: 'The pituitary gland, directly', ok: false,
                      why: 'The pituitary releases hormones, but under instruction from the hypothalamus above it.' }
                  ] }
            ]
        }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.trc { padding:1rem 1.25rem 0.25rem; --t-ok:#2e7d32; --t-bad:#aa272f; --t-accent:var(--light-teal); }',
            '[data-theme="dark"] .trc { --t-ok:#7fc98a; --t-bad:#e08a90; }',
            '[data-theme="sepia"] .trc { --t-ok:#4a6b3d; --t-bad:#a04040; }',
            '.trc-pick { display:flex; flex-wrap:wrap; gap:0.35rem; margin:0 0 0.9rem; }',
            '.trc-pick button { font:inherit; font-size:0.76rem; padding:0.35rem 0.6rem; border-radius:999px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text); cursor:pointer; }',
            '.trc-pick button[aria-pressed="true"] { border-color:var(--t-accent); background:var(--t-accent); color:#fff; }',
            '.trc-pick button.done::after { content:" \\2713"; }',
            '.trc-open { font-size:0.85rem; line-height:1.55; color:var(--text-secondary); margin:0 0 0.9rem; }',
            '.trc-chain { display:flex; flex-direction:column; gap:0; margin:0 0 0.9rem; }',
            '.trc-link { display:flex; align-items:flex-start; gap:0.55rem; }',
            '.trc-link .dot { flex:none; width:11px; height:11px; border-radius:50%; margin-top:0.35rem; }',
            '.trc-link .body { flex:1; padding-bottom:0.5rem; }',
            '.trc-link .body b { font-size:0.85rem; display:block; line-height:1.4; }',
            '.trc-link .body span { font-size:0.66rem; font-weight:700; letter-spacing:0.06em;',
            '   text-transform:uppercase; }',
            '.trc-q { font-size:0.88rem; font-weight:700; margin:0.6rem 0 0.5rem; line-height:1.45; }',
            '.trc-opt { display:block; width:100%; text-align:left; font:inherit; font-size:0.84rem;',
            '   line-height:1.5; padding:0.5rem 0.7rem; margin:0 0 0.35rem; border-radius:8px;',
            '   border:1.5px solid var(--border); background:transparent; color:var(--text); cursor:pointer; }',
            '.trc-opt:hover { border-color:var(--t-accent); }',
            '.trc-opt:focus-visible { outline:2px solid var(--t-accent); outline-offset:2px; }',
            '.trc-opt.wrong { border-color:var(--t-bad); background:rgba(170,39,47,0.07); cursor:default; }',
            '.trc-why { display:block; margin-top:0.35rem; font-size:0.77rem; line-height:1.55;',
            '   color:var(--text-secondary); }',
            '.trc-msg { margin:0.8rem 0 0; font-size:0.82rem; line-height:1.55; min-height:1.6em; }',
            '.trc-msg.ok { color:var(--t-ok); } .trc-msg.bad { color:var(--t-bad); }',
            '.trc-close { border:1px solid var(--t-ok); border-radius:10px; background:rgba(46,125,50,0.08);',
            '   padding:0.8rem 0.95rem; margin:0.9rem 0 0; font-size:0.85rem; line-height:1.6; }',
            '[data-theme="dark"] .trc-close { background:rgba(127,201,138,0.12); }',
            '.trc-sys { display:flex; flex-wrap:wrap; gap:0.3rem; margin:0.7rem 0 0; }',
            '.trc-sys span { font-size:0.66rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase;',
            '   padding:0.2rem 0.5rem; border-radius:999px; color:#fff; }',
            '.trc-count { font-size:0.72rem; color:var(--text-secondary); margin:0.6rem 0 0; }',
            '.trc-reveal { margin-top:1rem; border:1px solid var(--t-accent); border-radius:10px;',
            '   background:rgba(87,120,153,0.10); padding:0.85rem 1rem; }',
            '.trc-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.trc-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.trc-reveal p:last-child { margin-bottom:0; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u1-systems'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'trc');
        const pick = U.el('div', 'trc-pick');
        const open = U.el('p', 'trc-open');
        const chain = U.el('div', 'trc-chain');
        const qEl = U.el('p', 'trc-q');
        const opts = U.el('div');
        const msg = U.el('p', 'trc-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const closeHost = U.el('div');
        const count = U.el('p', 'trc-count');
        const revealHost = U.el('div');
        [pick, open, chain, qEl, opts, msg, closeHost, count, revealHost].forEach(n => wrap.appendChild(n));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const resetBtn = U.button(buttons, 'Clear all routes');
        wrap.appendChild(buttons);

        let ri = 0;                       // current route
        let step = 0;                     // step within it
        let built = [];                   // links placed for the current route
        const rejected = {};              // "ri:step" -> Set of rejected option indices
        const completed = new Set();

        function reset() {
            ri = 0; step = 0; built = [];
            Object.keys(rejected).forEach(k => delete rejected[k]);
            completed.clear();
            revealHost.innerHTML = '';
            msg.textContent = ''; msg.className = 'trc-msg';
            render();
        }

        function loadRoute(k) {
            ri = k; step = 0; built = [];
            msg.textContent = ''; msg.className = 'trc-msg';
            if (completed.has(ROUTES[k].id)) {
                // replay the finished chain rather than making them redo it
                built = ROUTES[k].steps.map(s => s.o.find(o => o.ok));
                step = ROUTES[k].steps.length;
            }
            render();
        }

        function render() {
            const R = ROUTES[ri];

            pick.innerHTML = '';
            ROUTES.forEach((r, k) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.textContent = r.name;
                b.setAttribute('aria-pressed', k === ri ? 'true' : 'false');
                if (completed.has(r.id)) b.classList.add('done');
                b.addEventListener('click', () => loadRoute(k));
                pick.appendChild(b);
            });

            open.textContent = R.open;

            chain.innerHTML = '';
            built.forEach(link => {
                const row = U.el('div', 'trc-link');
                const [sysName, colour] = SYS[link.sys] || ['', 'var(--text-secondary)'];
                const dot = U.el('div', 'dot'); dot.style.background = colour;
                const body = U.el('div', 'body');
                body.innerHTML = '<b>' + esc(link.t) + '</b><span style="color:' + colour + '">' +
                    esc(sysName) + ' system</span>';
                row.appendChild(dot); row.appendChild(body);
                chain.appendChild(row);
            });

            const done = step >= R.steps.length;
            qEl.hidden = done;
            opts.innerHTML = '';
            closeHost.innerHTML = '';

            if (!done) {
                const S = R.steps[step];
                qEl.textContent = 'Step ' + (step + 1) + ' of ' + R.steps.length + ' — ' + S.q;
                const bad = rejected[ri + ':' + step] || new Set();
                S.o.forEach((o, k) => {
                    const b = U.el('button', 'trc-opt' + (bad.has(k) ? ' wrong' : ''));
                    b.type = 'button';
                    if (bad.has(k)) {
                        b.disabled = true;
                        b.innerHTML = esc(o.t) + '<span class="trc-why">' + esc(o.why) + '</span>';
                    } else {
                        b.textContent = o.t;
                        b.addEventListener('click', () => choose(k));
                    }
                    opts.appendChild(b);
                });
            } else {
                const box = U.el('div', 'trc-close');
                box.innerHTML = '<strong>Route complete.</strong> ' + esc(R.close);
                const sysRow = U.el('div', 'trc-sys');
                const seen = [];
                built.forEach(l => { if (l.sys && !seen.includes(l.sys)) seen.push(l.sys); });
                seen.forEach(s => {
                    const t = document.createElement('span');
                    t.textContent = SYS[s][0];
                    t.style.background = SYS[s][1];
                    sysRow.appendChild(t);
                });
                box.appendChild(sysRow);
                closeHost.appendChild(box);
            }

            count.textContent = completed.size + ' of ' + ROUTES.length + ' routes traced.';
            if (completed.size === ROUTES.length) showReveal();
        }

        function choose(k) {
            const S = ROUTES[ri].steps[step];
            const o = S.o[k];
            if (o.ok) {
                built.push(o);
                step++;
                msg.textContent = o.why;
                msg.className = 'trc-msg ok';
                if (step >= ROUTES[ri].steps.length) completed.add(ROUTES[ri].id);
            } else {
                const key = ri + ':' + step;
                rejected[key] = rejected[key] || new Set();
                rejected[key].add(k);
                msg.textContent = 'Not that one — the reason is under the option. Try again.';
                msg.className = 'trc-msg bad';
            }
            render();
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const d = U.el('div', 'trc-reveal');
            d.innerHTML =
                '<h5>Count the systems you used</h5>' +
                '<p>Five routes, and the digestive system appeared as the whole story in exactly none of ' +
                'them. Absorbing a meal needed the circulatory system to carry it, the lymphatic system for ' +
                'the fat, the respiratory system for the oxygen that makes the fuel worth having, the ' +
                'urinary system to remove what was left over, and the nervous and endocrine systems to ' +
                'decide when to stop.</p>' +
                '<p>Look back at the chains and notice how short each system\'s own contribution is. ' +
                'The digestive system only ever moves things a few micrometres — from the lumen, across a ' +
                'cell. Every long journey in every route belonged to something else. That is what "no ' +
                'system works alone" actually means: not that the systems co-operate politely, but that ' +
                'each one is physically incapable of finishing its own job.</p>';
            revealHost.appendChild(d);
        }

        resetBtn.addEventListener('click', reset);
        reset();

        // ---------------- verification hooks ----------------
        root._simState = () => ({
            route: ROUTES[ri].id, step,
            routeComplete: step >= ROUTES[ri].steps.length,
            chain: built.map(l => l.t),
            systems: [...new Set(built.map(l => l.sys).filter(Boolean))],
            completed: [...completed],
            allComplete: completed.size === ROUTES.length
        });
        root._simSolve = () => {
            const R = ROUTES[ri];
            built = R.steps.map(s => s.o.find(o => o.ok));
            step = R.steps.length;
            completed.add(R.id);
            msg.textContent = 'Route filled in.'; msg.className = 'trc-msg ok';
            render();
        };
    };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
})();
