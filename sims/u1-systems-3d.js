/* =============================================================
   INTERACTIVE — One body, five systems
   -------------------------------------------------------------
   Registers window.SIMS['u1-systems-3d'].  Supports HS-LS1-2.

   Figure 1.19 draws the eleven systems as eleven copies of the
   same outline, and its caption makes the claim this interactive
   exists to demonstrate: they are not eleven machines side by
   side, they are eleven ways of looking at one object. Here the
   body does not change when you switch systems — only what is
   drawn inside it does.

   The caption names two organs that belong to two systems at
   once: the diaphragm (respiratory and muscular) and the pancreas
   (digestive and endocrine). Both are in here, and switching
   either of their systems off leaves them on screen, because they
   have not stopped being part of the other one.

   Geometry: models/systems.{json,bin} — twenty organs from
   BodyParts3D 4.0 (CC BY 4.0), ~3,200 triangles each, quantised
   into one shared bounding box so the systems stay in register
   with each other. 279 KB over the wire, loaded on demand.

   The vagus nerve is not in BodyParts3D, so the gut-brain connection
   itself is not drawn here — Figure 1.21 carries it. This gives the
   two ends of it, to scale and in place.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sys3d-css';

    const SYSTEMS = {
        digestive:   { label: 'Digestive',   hex: 0xc27a4e },
        circulatory: { label: 'Circulatory', hex: 0xb03a45 },
        respiratory: { label: 'Respiratory', hex: 0x5d87a8 },
        urinary:     { label: 'Urinary',     hex: 0xd0a63c },
        nervous:     { label: 'Nervous',     hex: 0x8a72b5 }
    };

    // hex per organ, plus the systems it belongs to. `also` is a system this
    // model does not draw but the organ is still part of — the chapter's point.
    const PARTS = {
        'esophagus':       { hex: 0xc98b6b, sys: ['digestive'],
            note: 'The tube from throat to stomach. Nothing is digested here; it is transport.' },
        'stomach':         { hex: 0xc4575d, sys: ['digestive'],
            note: 'Churns food into chyme and starts on protein.' },
        'small-intestine': { hex: 0xd99a4e, sys: ['digestive'],
            note: 'Where absorption happens — and where the two routes out of a villus begin.' },
        'large-intestine': { hex: 0x8f9e5a, sys: ['digestive'],
            note: 'Reclaims water. What leaves here was never inside your body in the first place.' },
        'liver':           { hex: 0x9c5b4a, sys: ['digestive'],
            note: 'Every molecule of glucose and amino acid absorbed from the gut reaches the liver before it reaches anywhere else.' },
        'pancreas':        { hex: 0xb58a55, sys: ['digestive', 'endocrine'],
            note: 'Sends digestive enzymes into the duodenum AND insulin into the blood. It is a digestive organ and an endocrine organ at the same time — not a special case.' },
        'gallbladder':     { hex: 0x6f8f5c, sys: ['digestive'],
            note: 'Stores bile until a fatty meal arrives.' },
        'heart':           { hex: 0xb03a45, sys: ['circulatory'],
            note: 'Two pumps in one casing: one sends blood to the lungs, the other to everywhere else.' },
        'aorta':           { hex: 0xc0505c, sys: ['circulatory'],
            note: 'The main line out of the left side. Everything the body gets, it gets through here first.' },
        'right-lung':      { hex: 0x7ba2c4, sys: ['respiratory'],
            note: 'Three lobes on this side. Gas exchange happens across a surface the size of a tennis court.' },
        'left-lung':       { hex: 0x6f97ba, sys: ['respiratory'],
            note: 'Two lobes — the heart takes the room the third would have used.' },
        'trachea':         { hex: 0x9db8cf, sys: ['respiratory'],
            note: 'Held open by rings of cartilage, so it cannot collapse when you breathe in hard.' },
        'diaphragm':       { hex: 0xa8626a, sys: ['respiratory', 'muscular'],
            note: 'A sheet of skeletal muscle. It is the muscle that breathes you — respiratory and muscular at once, and it does not have to choose.' },
        'right-kidney':    { hex: 0xd0a63c, sys: ['urinary'],
            note: 'Filters the blood and makes urine. What leaves here was inside a cell first — that is excretion, not egestion.' },
        'left-kidney':     { hex: 0xc79c33, sys: ['urinary'],
            note: 'The left sits a little higher than the right, because the liver takes the room on the other side.' },
        'right-ureter':    { hex: 0xdcb861, sys: ['urinary'],
            note: 'Carries urine down to the bladder. Compare its width with the large intestine beside it.' },
        'left-ureter':     { hex: 0xdcb861, sys: ['urinary'],
            note: 'Carries urine down to the bladder. Compare its width with the large intestine beside it.' },
        'bladder':         { hex: 0xe0c477, sys: ['urinary'],
            note: 'Holds the urine until you let it go. Kidney, ureter, bladder, urethra — the whole excretory route, sitting behind and below the gut.' },
        'brain':           { hex: 0x9d85c6, sys: ['nervous'],
            note: 'Switch the digestive system on beside it and look at the distance. The vagus nerve closes that gap, and about nine tenths of its fibres carry traffic upwards — the gut reporting, far more than the brain commanding.' },
        'spinal-cord':     { hex: 0xb3a0d4, sys: ['nervous'],
            note: 'The other route between gut and brain. Pain from the gut travels this way; the quieter everyday reporting goes by the vagus.' }
    };

    window.SIMS['u1-systems-3d'] = function (root) {
        injectCss();
        const shell = window.COURSE_SHELL || {};
        const rootPath = shell.root || '';

        const stage = U.el('div', 'sim-stage o3d-stage');
        root.appendChild(stage);

        // system switches, not buttons: they are states, and more than one is on
        const bar = U.el('div', 'sys-switches');
        const on = { digestive: true, circulatory: true, respiratory: true, urinary: true, nervous: true };
        const switches = {};
        Object.keys(SYSTEMS).forEach(k => {
            const b = U.el('button', 'sys-sw on');
            b.type = 'button';
            b.setAttribute('aria-pressed', 'true');
            b.style.setProperty('--sys', '#' + SYSTEMS[k].hex.toString(16).padStart(6, '0'));
            b.innerHTML = '<i></i>' + SYSTEMS[k].label;
            b.onclick = () => {
                on[k] = !on[k];
                b.classList.toggle('on', on[k]);
                b.setAttribute('aria-pressed', String(on[k]));
                apply();
            };
            bar.appendChild(b);
            switches[k] = b;
        });
        root.appendChild(bar);

        const buttons = U.el('div', 'sim-buttons');
        const btnAll = U.button(buttons, 'Show them all');
        const btnReset = U.button(buttons, 'Reset the view');
        root.appendChild(buttons);

        const readout = U.el('div', 'sim-readout sys-readout');
        root.appendChild(readout);

        const credit = U.el('p', 'o3d-credit');
        credit.innerHTML = 'Anatomy: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html" ' +
            'target="_blank" rel="noopener">BodyParts3D</a>, © The Database Center for Life Science, ' +
            '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. ' +
            'Simplified for the web.';
        root.appendChild(credit);

        let view = null, selected = null;

        // An organ is shown when ANY system it belongs to is switched on. That is
        // the whole demonstration: turn the respiratory system off and the
        // diaphragm stays, because it is still a muscle.
        // A system with no switch has no switch to be off.
        const isOn = sys => (sys in on) ? on[sys] : true;
        const visible = id => (PARTS[id].sys || []).some(isOn);
        const stayed = () => Object.keys(PARTS).filter(id =>
            visible(id) && !(PARTS[id].sys || []).some(x => (x in on) && on[x]));

        function apply() {
            // Re-fit on every switch: with the brain in, a view without it is a
            // third of the height, and framing the whole model wastes the frame.
            if (view) { view.show(visible); view.frameVisible(); }
            if (selected && !visible(selected)) pick(null);
            else describe(selected);
        }

        function say(html, cls) {
            readout.className = 'sim-readout sys-readout' + (cls ? ' ' + cls : '');
            readout.innerHTML = html;
        }

        function tags(id) {
            return (PARTS[id].sys || []).map(sys => SYSTEMS[sys]
                ? '<span class="sys-tag" style="--sys:#' + SYSTEMS[sys].hex.toString(16).padStart(6, '0') +
                  '">' + SYSTEMS[sys].label + '</span>'
                : '<span class="sys-tag sys-also">' + esc(sys) + '</span>').join('');
        }

        function describe(id) {
            const shown = Object.keys(on).filter(k => on[k]);
            const left = stayed();
            if (!id) {
                const n = Object.keys(PARTS).filter(visible).length;
                say('<b>Drag to turn the body.</b> ' +
                    (shown.length === Object.keys(on).length
                        ? 'All five systems are drawn in the same space, because they occupy the same space. '
                        : 'The body has not changed — only what is drawn inside it has. ') +
                    'Click any organ to see which systems it belongs to. ' +
                    '<span class="sys-count">' + n + ' organs shown</span>' +
                    (window.ORGAN3D ? window.ORGAN3D.indexLink(rootPath) : '') +
                    (left.length ? '<br><span class="sys-note">Still here with their system ' +
                        'switched off: ' + left.map(i => esc(labelOf(i).toLowerCase())).join(' and ') +
                        ' — each belongs to a second system as well.</span>' : ''));
                return;
            }
            const p = PARTS[id];
            const two = (p.sys || []).length > 1;
            say('<b>' + esc(labelOf(id)) + '</b> ' + tags(id) + '<br>' + esc(p.note) +
                (two ? '<br><span class="sys-note">Two systems, one organ. Switch either of them ' +
                       'off and it is still here, because it has not stopped being the other.</span>' : '') +
                (window.ORGAN3D ? window.ORGAN3D.crossLinks(id, { root: rootPath }) : ''));
        }

        function pick(id) {
            selected = id;
            if (view) { view.select(id); }
            describe(id);
        }

        btnAll.onclick = () => {
            Object.keys(on).forEach(k => {
                on[k] = true;
                switches[k].classList.add('on');
                switches[k].setAttribute('aria-pressed', 'true');
            });
            // Switching everything back on has to clear the selection too, or a
            // leftover highlight keeps the other nineteen organs dimmed.
            pick(null);
            apply();
        };
        btnReset.onclick = () => { if (view) view.resetView(); };

        root._simState = () => ({
            systems: Object.assign({}, on), selected, rendering: !!view,
            shown: Object.keys(PARTS).filter(visible)
        });
        root._simPick = pick;
        root._simToggle = k => { if (k in on) switches[k].click(); };

        describe(null);

        loadOrgan3d(rootPath, shell.assetV).then(() =>
            window.ORGAN3D.create({
                stage, rootPath, assetV: shell.assetV, model: 'systems', parts: PARTS, onPick: pick
            })
        ).then(v => {
            view = v;
            v.canvas.setAttribute('aria-label',
                'A rotatable three-dimensional model of one body showing the digestive, ' +
                'circulatory and respiratory organs together.');
            apply();
            btnAll.disabled = btnReset.disabled = false;
        }).catch(err => {
            console.warn('[systems-3d] 3D unavailable:', err);
            stage.innerHTML = '<p class="sim-fallback">The 3D model could not load here. ' +
                'Figure 1.19 above makes the same point in two dimensions, and nothing later ' +
                'in the chapter depends on this view.</p>';
            stage.style.height = '';
            bar.querySelectorAll('button').forEach(b => { b.disabled = true; });
            btnAll.disabled = btnReset.disabled = true;
        });
    };

    function labelOf(id) {
        return ({ 'esophagus': 'Oesophagus', 'stomach': 'Stomach',
                  'small-intestine': 'Small intestine', 'large-intestine': 'Large intestine',
                  'liver': 'Liver', 'gallbladder': 'Gall bladder', 'pancreas': 'Pancreas',
                  'heart': 'Heart', 'aorta': 'Aorta', 'right-lung': 'Right lung',
                  'left-lung': 'Left lung', 'trachea': 'Trachea', 'diaphragm': 'Diaphragm',
                  'right-kidney': 'Right kidney', 'left-kidney': 'Left kidney',
                  'right-ureter': 'Right ureter', 'left-ureter': 'Left ureter',
                  'bladder': 'Bladder',
                  'brain': 'Brain', 'spinal-cord': 'Spinal cord' })[id] || id;
    }

    // The shared viewer loads once per page, whichever 3D sim asks for it first.
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
.sys-switches { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.75rem 0 0.25rem; }
.sys-sw {
    font: inherit; font-size: 0.8rem; cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.7rem; border-radius: 999px;
    border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-secondary);
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.sys-sw > i {
    width: 9px; height: 9px; border-radius: 50%; flex: 0 0 9px;
    background: var(--sys); opacity: 0.35;
}
.sys-sw.on { color: var(--text); border-color: var(--sys); background: color-mix(in srgb, var(--sys) 10%, transparent); }
.sys-sw.on > i { opacity: 1; }
.sys-sw:hover { border-color: var(--sys); }
.sys-sw[disabled] { opacity: 0.45; cursor: default; }
.sys-readout { min-height: 3.4rem; line-height: 1.55; }
.sys-tag {
    display: inline-block; font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0.1rem 0.45rem; border-radius: 999px; margin-left: 0.25rem;
    color: var(--sys); border: 1px solid var(--sys);
}
.sys-tag.sys-also { color: var(--text-secondary); border-color: var(--border); border-style: dashed; }
.sys-note { font-size: 0.82rem; color: var(--text-secondary); }
.sys-count { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }
`;
        document.head.appendChild(s);
    }
})();
