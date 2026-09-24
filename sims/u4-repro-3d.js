/* =============================================================
   INTERACTIVE — The two reproductive systems in three dimensions
   -------------------------------------------------------------
   Registers window.SIMS['u4-repro-3d'].  Supports HS-LS1-2.

   The labelling interactive above this in 4.7 names every part of
   both systems on flat diagrams. This is the other half: where the
   organs actually sit, how big they are relative to each other, and
   how each system is laid out around the bladder. A Female / Male
   switch shows one set at a time; the bladder stays as a landmark.
   The choice is shared with the Body Index (bio_body_sex).

   Geometry: models/systems.{json,bin}. The male organs are
   BodyParts3D 4.0; the female organs are the Human Reference Atlas
   (HuBMAP, Visible Human female), placed into the same space by
   matching the two bladders. Both CC BY 4.0, both credited below.
   See MORNING-NOTES.md for how they were built and placed.


   Not in the model, and said so on the page: the vas deferens and
   the vagina. Where WebGL is missing the sim says so and points at
   the labelling interactive, which carries the same anatomy.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    // Copy follows the chapter's own wording, so the model and the text agree.
    const ORGANS = {
        'ovary':           { sex: 'female', hex: 0x2f8f9d, label: 'Ovary',
            note: 'Holds the immature egg cells and releases one mature egg roughly once a month. ' +
                  'It also makes oestrogen and progesterone. Look closely: it is not joined to the oviduct.' },
        'oviduct':         { sex: 'female', hex: 0xc2cf6e, label: 'Oviduct',
            note: 'Also called the fallopian tube. Carries the egg towards the uterus, moved by cilia and ' +
                  'muscle. Its fringed end sweeps the egg in, and fertilisation normally happens in its upper third.' },
        'uterus':          { sex: 'female', hex: 0x4f9a63, label: 'Uterus',
            note: 'A muscular chamber where an embryo implants and develops. The narrow neck at its base ' +
                  'is the cervix.' },
        'testis':          { sex: 'male', hex: 0x2f8f9d, label: 'Testis',
            note: 'Meiosis happens inside its coiled seminiferous tubules. It sits outside the body cavity, ' +
                  'in the scrotum, where it is a couple of degrees cooler.' },
        'epididymis':      { sex: 'male', hex: 0x86c1b6, label: 'Epididymis',
            note: 'A coiled tube on the back of the testis, where sperm are stored and finish maturing.' },
        'seminal-vesicle': { sex: 'male', hex: 0x93a94a, label: 'Seminal vesicle',
            note: 'Adds a fluid rich in fructose: fuel for the sperm\'s tail.' },
        'prostate':        { sex: 'male', hex: 0x4f9a63, label: 'Prostate gland',
            note: 'Adds an alkaline fluid, which helps sperm survive an acidic environment on the way.' },
        'urethra':         { sex: 'male', hex: 0xc2cf6e, label: 'Urethra',
            note: 'Carries both urine and semen, at different times.' },
        'bladder':         { hex: 0xe0c477, label: 'Bladder',
            note: 'Not a reproductive organ. It is here as a landmark: both systems are laid out around it.' }
    };
    const INTRO = {
        female: 'The ovaries sit either side of the uterus, each under the fringed end of an oviduct. ' +
                'The vagina is not in this model.',
        male: 'Follow the line: testis, epididymis, then the vas deferens up and over the bladder ' +
              '(too fine to be in this model), then the urethra, with two glands adding fluid on the way.'
    };
    const MODE = {
        parts: ['ovary', 'oviduct', 'uterus', 'testis', 'epididymis', 'seminal-vesicle', 'prostate', 'urethra', 'bladder'],
        aspect: 0.72,
        aria: 'A rotatable three-dimensional model of the reproductive organs around the bladder. ' +
              'Female: ovaries, oviducts and uterus. Male: testes, epididymis, seminal vesicles, ' +
              'prostate gland and urethra.'
    };
    const STYLE_ID = 'rp3d-css';

    window.SIMS['u4-repro-3d'] = function (root) {
        const PARTS = {};
        MODE.parts.forEach(id => { PARTS[id] = ORGANS[id]; });
        injectCss();
        const rootPath = (window.COURSE_SHELL && window.COURSE_SHELL.root) || '';

        const bar = U.el('div', 'sim-buttons rp-bar');
        const seg = U.el('div', 'rp-seg');
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', 'Which system to show');
        const btnF = U.el('button'); btnF.type = 'button'; btnF.textContent = 'Female'; btnF.dataset.sex = 'female';
        const btnM = U.el('button'); btnM.type = 'button'; btnM.textContent = 'Male'; btnM.dataset.sex = 'male';
        seg.append(btnF, btnM);
        bar.appendChild(seg);
        const btnReset = U.button(bar, 'Reset the view');
        btnReset.disabled = true;

        const stage = U.el('div', 'sim-stage o3d-stage');
        root.appendChild(bar);
        root.appendChild(stage);

        const readout = U.el('div', 'sim-readout rp-readout');
        root.appendChild(readout);

        const credit = U.el('p', 'o3d-credit');
        credit.innerHTML = 'Anatomy: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html" ' +
            'target="_blank" rel="noopener">BodyParts3D</a>, © The Database Center for Life Science; female organs: ' +
            '<a href="https://humanatlas.io/3d-reference-library" target="_blank" rel="noopener">Human Reference Atlas</a> ' +
            '(HuBMAP), from the Visible Human Project of the U.S. National Library of Medicine. Both ' +
            '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. ' +
            'Simplified for the web.';
        root.appendChild(credit);

        let sex = 'female', selected = null, view = null;
        try { if (localStorage.getItem('bio_body_sex') === 'male') sex = 'male'; } catch (e) { /* storage blocked */ }
        const shown = id => !PARTS[id].sex || PARTS[id].sex === sex;

        function say(html) { readout.innerHTML = html; }

        function describe(id) {
            if (!id) {
                say('<b>Drag to turn the model.</b> Click any organ to find out what it does. ' +
                    esc(INTRO[sex]) + (window.ORGAN3D ? window.ORGAN3D.indexLink(rootPath) : ''));
                return;
            }
            const o = ORGANS[id];
            say('<b>' + esc(o.label) + '</b> — ' + esc(o.note) +
                (id !== 'bladder' && window.ORGAN3D ? window.ORGAN3D.crossLinks(id, { root: rootPath }) : ''));
        }

        function pick(id) {
            selected = id;
            if (view) view.select(id);
            describe(id);
        }

        function setSex(next) {
            sex = next;
            try { localStorage.setItem('bio_body_sex', sex); } catch (e) { /* storage blocked */ }
            [btnF, btnM].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sex === sex)));
            if (selected && !shown(selected)) selected = null;
            if (view) {
                view.select(selected);
                view.show(shown);
                view.resetView();
            }
            describe(selected);
        }
        seg.addEventListener('click', e => {
            const b = e.target.closest('button[data-sex]');
            if (b && b.dataset.sex !== sex) setSex(b.dataset.sex);
        });
        btnReset.onclick = () => { if (view) view.resetView(); };

        root._simState = () => ({ sex, selected, rendering: !!view });
        root._simPick = pick;

        setSex(sex);

        // ---- geometry and rendering -------------------------------------
        const shell = window.COURSE_SHELL || {};
        loadOrgan3d(rootPath, shell.assetV).then(() =>
            window.ORGAN3D.create({
                stage, rootPath, assetV: shell.assetV, model: 'systems', parts: PARTS,
                onPick: pick, aspect: MODE.aspect
            })
        ).then(v => {
            view = v;
            v.canvas.setAttribute('aria-label', MODE.aria);
            v.show(shown);
            v.resetView();
            btnReset.disabled = false;
        }).catch(err => {
            console.warn('[repro-3d] 3D unavailable:', err);
            stage.innerHTML = '<p class="sim-fallback">The 3D model could not load here. ' +
                'The labelling interactive above carries the same anatomy, and the rest of the ' +
                'chapter does not depend on this view.</p>';
            btnReset.disabled = true;
        });
    };

    let pending = null;
    function loadOrgan3d(rootPath, v) {
        if (window.ORGAN3D) return Promise.resolve();
        if (pending) return pending;
        pending = new Promise((res, rej) => {
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
.rp-bar { align-items: center; margin-bottom: 0.6rem; }
.rp-seg { display: inline-flex; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; }
.rp-seg button {
    font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer;
    padding: 0.4rem 0.9rem; border: 0; background: var(--bg-surface); color: var(--text);
}
.rp-seg button + button { border-left: 1px solid var(--border); }
.rp-seg button[aria-pressed="true"] { background: var(--pick, var(--dark-blue)); color: var(--pick-ink, #fff); }
.rp-readout { min-height: 3.2rem; line-height: 1.5; }
`;
        document.head.appendChild(s);
    }
})();
