/* =============================================================
   INTERACTIVE — The digestive tract in three dimensions
   -------------------------------------------------------------
   Registers window.SIMS['u1-digestive-3d'].  Supports HS-LS1-2.

   Figure 1.7 in this chapter is deliberately schematic: boxes and
   arrows saying what acts on what. This is the other half of that
   — where the organs actually are, how big they are relative to
   each other, and which ones the food genuinely passes through.
   Drag to turn the body, click an organ to hear what it does, or
   switch to "Name them" and be asked to find each one.

   Geometry: models/digestive.{json,bin}, built from BodyParts3D
   4.0 (CC BY 4.0) — seven organs decimated to ~3,500 triangles
   each, positions quantised to Int16 in one shared bounding box so
   they stay in anatomical register. 102 KB over the wire.

   three.js loads on demand from vendor/. Where WebGL is missing
   the sim says so and points at the figures, which carry the same
   anatomy — nothing in the chapter lives only in here.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    // Colour and copy per organ. The tube/accessory split is the chapter's
    // own distinction and the one students most often get wrong.
    const ORGANS = {
        'esophagus':       { hex: 0xc98b6b, order: 1, tube: true,
            note: 'Peristalsis pushes the bolus down. No digestion happens here at all.' },
        'stomach':         { hex: 0xc4575d, order: 2, tube: true,
            note: 'Churns the bolus into chyme, and pepsin starts on protein in acid.' },
        'small-intestine': { hex: 0xd99a4e, order: 3, tube: true,
            note: 'Chemical digestion finishes here, and nearly all absorption happens here.' },
        'large-intestine': { hex: 0x8f9e5a, order: 4, tube: true,
            note: 'Reclaims water. Bacteria work on what is left; no enzymes of yours.' },
        'liver':           { hex: 0x9c5b4a, order: 5, tube: false,
            note: 'Makes bile. No food ever passes through it — it is an accessory organ.' },
        'gallbladder':     { hex: 0x6f8f5c, order: 6, tube: false,
            note: 'Stores the bile the liver makes, and squirts it into the duodenum.' },
        'pancreas':        { hex: 0xb58a55, order: 7, tube: false,
            note: 'Sends in the enzymes that do most of the chemical work — and it is not in the tube.' }
    };
    const STYLE_ID = 'dg3d-css';

    window.SIMS['u1-digestive-3d'] = function (root) {
        injectCss();
        const rootPath = (window.COURSE_SHELL && window.COURSE_SHELL.root) || '';

        const stage = U.el('div', 'sim-stage o3d-stage');
        root.appendChild(stage);

        const controls = U.el('div', 'sim-controls dg-controls');
        const buttons = U.el('div', 'sim-buttons');
        const btnTube = U.button(buttons, 'Show only the tube');
        const btnQuiz = U.button(buttons, 'Name them', 'primary');
        const btnReset = U.button(buttons, 'Reset the view');
        root.appendChild(controls);
        root.appendChild(buttons);

        const readout = U.el('div', 'sim-readout dg-readout');
        root.appendChild(readout);

        const credit = U.el('p', 'o3d-credit');
        credit.innerHTML = 'Anatomy: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html" ' +
            'target="_blank" rel="noopener">BodyParts3D</a>, © The Database Center for Life Science, ' +
            '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. ' +
            'Simplified for the web.';
        root.appendChild(credit);

        // ---- state that does not depend on anything being drawn ----------
        let selected = null, tubeOnly = false, view = null;
        let quiz = null;   // { asked: [ids], at, right, wrong }

        function say(html, cls) {
            readout.className = 'sim-readout dg-readout' + (cls ? ' ' + cls : '');
            readout.innerHTML = html;
        }

        function describe(id) {
            if (!id) {
                say('<b>Drag to turn the body.</b> Click any organ to find out what it does. ' +
                    'Four of these seven are the tube the food actually travels through; three are ' +
                    'accessory organs that only send chemicals in.' +
                    (window.ORGAN3D ? window.ORGAN3D.indexLink(rootPath) : ''));
                return;
            }
            const o = ORGANS[id], label = labelOf(id);
            say('<b>' + esc(label) + '</b> — <span class="dg-tag ' + (o.tube ? 'dg-tube' : 'dg-acc') + '">' +
                (o.tube ? 'in the tube' : 'accessory organ') + '</span><br>' + esc(o.note) +
                (window.ORGAN3D ? window.ORGAN3D.crossLinks(id, { root: rootPath }) : ''));
        }

        // ---- the quiz: the labelling task, but you have to find it in 3D --
        function startQuiz() {
            const ids = Object.keys(ORGANS).sort(() => Math.random() - 0.5);
            quiz = { asked: ids, at: 0, right: 0, wrong: 0 };
            if (view) view.select(null);
            selected = null;
            tubeOnly = false;
            if (view) view.show(null);
            btnTube.disabled = true;
            btnQuiz.textContent = 'Stop';
            askNext();
        }
        function stopQuiz() {
            quiz = null;
            btnTube.disabled = false;
            btnQuiz.textContent = 'Name them';
            describe(selected);
        }
        function askNext() {
            if (!quiz) return;
            if (quiz.at >= quiz.asked.length) {
                const n = quiz.asked.length;
                say('<b>' + quiz.right + ' of ' + n + ' first time.</b> ' +
                    (quiz.right === n ? 'Every one, straight off.'
                                      : 'Turn the body and try again — the awkward ones are usually the three that are not in the tube.'),
                    quiz.right === n ? 'dg-good' : '');
                quiz = null;
                btnTube.disabled = false;
                btnQuiz.textContent = 'Name them';
                return;
            }
            say('<b>Find the ' + esc(labelOf(quiz.asked[quiz.at]).toLowerCase()) + '.</b> ' +
                'Click it on the model. <span class="dg-score">' + quiz.right + ' right · ' +
                quiz.wrong + ' wrong</span>');
        }
        function answer(id) {
            if (!quiz) return;
            const want = quiz.asked[quiz.at];
            if (id === want) {
                quiz.right++;
                quiz.at++;
                say('<b>Yes — the ' + esc(labelOf(want).toLowerCase()) + '.</b> ' + esc(ORGANS[want].note),
                    'dg-good');
                setTimeout(askNext, 1300);
            } else {
                quiz.wrong++;
                say('<b>That is the ' + esc(labelOf(id).toLowerCase()) + '.</b> Try again — ' +
                    'find the ' + esc(labelOf(want).toLowerCase()) + '. ' +
                    '<span class="dg-score">' + quiz.right + ' right · ' + quiz.wrong + ' wrong</span>',
                    'dg-bad');
            }
        }

        function pick(id) {
            selected = id;
            if (view) view.select(id);
            if (quiz) { if (id) answer(id); }
            else describe(id);
        }

        btnTube.onclick = () => {
            tubeOnly = !tubeOnly;
            btnTube.textContent = tubeOnly ? 'Show every organ' : 'Show only the tube';
            if (view) view.show(tubeOnly ? (id => ORGANS[id].tube) : null);
            if (tubeOnly && selected && !ORGANS[selected].tube) pick(null);
        };
        btnQuiz.onclick = () => { quiz ? stopQuiz() : startQuiz(); };
        btnReset.onclick = () => { if (view) view.resetView(); };

        root._simState = () => ({
            selected, tubeOnly, rendering: !!view,
            quiz: quiz ? { asking: quiz.asked[quiz.at], right: quiz.right, wrong: quiz.wrong } : null
        });
        root._simPick = pick;

        describe(null);

        // ---- geometry and rendering -------------------------------------
        const shell = window.COURSE_SHELL || {};
        loadOrgan3d(rootPath, shell.assetV).then(() =>
            window.ORGAN3D.create({
                stage, rootPath, assetV: shell.assetV, model: 'digestive', parts: ORGANS, onPick: pick
            })
        ).then(v => {
            view = v;
            v.canvas.setAttribute('aria-label',
                'A rotatable three-dimensional model of the digestive organs: oesophagus, stomach, ' +
                'small intestine, large intestine, liver, gall bladder and pancreas.');
            btnReset.disabled = false;
        }).catch(err => {
            console.warn('[digestive-3d] 3D unavailable:', err);
            stage.innerHTML = '<p class="sim-fallback">The 3D model could not load here. ' +
                'Figure 1.7 above carries the same anatomy, and the rest of the chapter does not ' +
                'depend on this view.</p>';
            btnTube.disabled = btnQuiz.disabled = btnReset.disabled = true;
        });

        function labelOf(id) {
            const m = { 'esophagus': 'Oesophagus', 'stomach': 'Stomach',
                        'small-intestine': 'Small intestine', 'large-intestine': 'Large intestine',
                        'liver': 'Liver', 'gallbladder': 'Gall bladder', 'pancreas': 'Pancreas' };
            return m[id] || id;
        }
        window.SIMS['u1-digestive-3d'].labelOf = labelOf;
    };

    let pending = null;
    function loadOrgan3d(rootPath, v) {
        if (window.ORGAN3D) return Promise.resolve();
        if (pending) return pending;
        pending = new Promise((res, rej) => {
            // The body map comes with the viewer: the organ readouts use it to
            // offer the other places the course covers the same organ.
            const add = (src) => new Promise((ok, no) => {
                const sc = document.createElement('script');
                sc.src = rootPath + src + (v ? '?v=' + v : '');
                sc.onload = ok; sc.onerror = () => no(new Error(src + ' failed to load'));
                document.head.appendChild(sc);
            });
            add('assets/body-map.js').catch(() => {})      // links are a bonus, not a blocker
                .then(() => add('sims/_organ3d.js'))
                .then(res, rej);
        });
        return pending;
    }

    const esc = s => String(s).replace(/[&<>"]/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function injectCss() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
.dg-readout { min-height: 3.2rem; line-height: 1.5; }
.dg-readout.dg-good { border-left: 3px solid var(--ok); padding-left: 0.6rem; }
.dg-readout.dg-bad  { border-left: 3px solid var(--red); padding-left: 0.6rem; }
.dg-tag {
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.1rem 0.45rem; border-radius: 999px; white-space: nowrap;
}
.dg-tube { background: rgba(170,39,47,0.12); color: var(--red); }
.dg-acc  { background: rgba(87,120,153,0.18); color: var(--light-teal); }
[data-theme="dark"] .dg-acc { color: #8fb3d9; }
.dg-score { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }
`;
        document.head.appendChild(s);
    }
})();
