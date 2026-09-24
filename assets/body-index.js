/* =============================================================
   BODY INDEX — find the course by body part
   -------------------------------------------------------------
   The same organ model the Unit 1 chapters use, wired as an
   index: click an organ and it tells you where the course covers
   it. The list beside the model does the same job, and is what a
   reader gets when WebGL is unavailable — nothing here is only
   reachable by clicking on a picture.

   WHERE takes one or two destinations per organ. They were chosen
   by scoring every <section> in the course for the organ's terms
   and then reading the winners, which is why two organs carry a
   link into homeostasis rather than digestion: the pancreas and
   the liver are genuinely taught in both places.

   An organ with `only` is mentioned but not taught, and one with
   no entry at all is not covered. Both say so. This is an honest
   index of a course that is not an anatomy course, and pretending
   otherwise would waste a reader's time.
   ============================================================= */
(function () {
    'use strict';
    const shell = window.COURSE_SHELL;
    const host = document.getElementById('body-nav');
    if (!shell || !host || !window.BODY_MAP) return;
    const ROOT = shell.root || '';
    const esc = s => String(s).replace(/[&<>"]/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // The map itself lives in assets/body-map.js, shared with the chapter
    // interactives so an organ's colour and its coverage cannot drift apart.
    const SYSTEMS = window.BODY_MAP.systems;
    const ORGANS = window.BODY_MAP.organs;

    const byId = window.BODY_MAP.byId;
    const chapterOf = id => (window.COURSE.chapters || []).find(c => c.id === id);

    injectCss();

    // Model and panel share the left column: the panel fills the space under
    // the model that was empty, and stays in view instead of being pushed below
    // the fold by a list of 25 organs.
    // The attribution sits at the foot of the page with the scope note, not
    // between the model and the answer it produces.
    host.innerHTML =
        '<div class="body-stage-wrap">' +
            '<div class="sim-stage o3d-stage" id="body-stage"></div>' +
        '</div>' +
        '<div class="body-side"><div class="body-list" id="body-list" role="list"></div></div>' +
        '<div class="body-panel" id="body-panel"></div>';

    const stage = document.getElementById('body-stage');
    const list = document.getElementById('body-list');
    const panel = document.getElementById('body-panel');
    let view = null, selected = null;

    // Reproductive organs come in two sets that the model cannot show at once;
    // everything else is shared. The switch sits on the Reproductive group, so
    // it is clear that nothing else changes. The choice is remembered.
    let sex = 'female';
    try { if (localStorage.getItem('bio_body_sex') === 'male') sex = 'male'; } catch (e) { /* storage blocked */ }
    const shownFor = o => !o.sex || o.sex === sex;

    // The list is the index in its own right, not a caption for the model.
    let html = '';
    Object.keys(SYSTEMS).forEach(sys => {
        const mine = ORGANS.filter(o => o.sys === sys);
        if (!mine.length) return;
        const split = mine.some(o => o.sex);
        html += '<div class="body-group" style="--sys:#' + SYSTEMS[sys].hex.toString(16).padStart(6, '0') + '">' +
                '<div class="body-group-label">' + esc(SYSTEMS[sys].label) +
                (split ? '<span class="body-sex" role="group" aria-label="Which reproductive organs to show">' +
                    '<button type="button" data-sex="female">Female</button>' +
                    '<button type="button" data-sex="male">Male</button></span>' : '') +
                '</div>';
        mine.forEach(o => {
            html += '<button type="button" class="body-item' + (o.where.length ? '' : ' thin') +
                    '" data-organ="' + esc(o.id) + '"' + (o.sex ? ' data-sex="' + o.sex + '"' : '') + ' role="listitem">' +
                    '<i style="background:#' + o.hex.toString(16).padStart(6, '0') + '"></i>' +
                    esc(o.name) + (o.where.length ? '' : '<span class="body-none">not covered</span>') +
                    '</button>';
        });
        html += '</div>';
    });
    list.innerHTML = html;

    list.addEventListener('click', e => {
        const s = e.target.closest('.body-sex button');
        if (s) { setSex(s.dataset.sex); return; }
        const b = e.target.closest('.body-item');
        if (b) pick(b.dataset.organ);
    });

    function setSex(next) {
        sex = next;
        try { localStorage.setItem('bio_body_sex', sex); } catch (e) { /* storage blocked */ }
        list.querySelectorAll('.body-sex button').forEach(b =>
            b.setAttribute('aria-pressed', String(b.dataset.sex === sex)));
        list.querySelectorAll('.body-item[data-sex]').forEach(b => { b.hidden = b.dataset.sex !== sex; });
        if (selected && !shownFor(byId[selected])) {
            selected = null;
            list.querySelectorAll('.body-item.on').forEach(b => b.classList.remove('on'));
            if (view) view.select(null);
            render(null);
        }
        if (view) view.show(id => shownFor(byId[id]));
    }
    setSex(sex);

    function pick(id) {
        selected = id;
        list.querySelectorAll('.body-item').forEach(b =>
            b.classList.toggle('on', b.dataset.organ === id));
        if (view) view.select(id);
        render(id);
        const b = list.querySelector('.body-item[data-organ="' + id + '"]');
        if (b) b.scrollIntoView({ block: 'nearest' });
    }

    function render(id) {
        if (!id) {
            panel.innerHTML = '<p class="body-hint">Pick an organ to see where the course covers it.</p>';
            return;
        }
        const o = byId[id];
        let h = '<h2>' + esc(o.name) + '</h2>';
        if (o.note) h += '<p class="body-note">' + esc(o.note) + '</p>';
        if (o.only) h += '<p class="body-warn">' + esc(o.only) + '</p>';
        if (o.where.length) {
            h += '<div class="body-where-label">' +
                 (o.where.length > 1 ? 'Covered in two places' : 'Covered in') + '</div><ul class="body-where">';
            o.where.forEach(([chap, sec, label]) => {
                const c = chapterOf(chap);
                if (!c) return;
                h += '<li><a href="' + ROOT + esc(c.file) + '#' + esc(sec) + '">' +
                     '<span class="bw-chap">' + esc(c.title) + '</span>' +
                     '<span class="bw-sec">' + esc(label) + '</span></a></li>';
            });
            h += '</ul>';
        }
        panel.innerHTML = h;
    }
    render(null);

    // The model is the second way in. If it cannot load, the list above has
    // already done the whole job.
    loadScript(ROOT + 'sims/_organ3d.js?v=' + (shell.assetV || ''))
        .then(() => window.ORGAN3D.create({
            stage, rootPath: ROOT, assetV: shell.assetV, model: 'systems',
            parts: byId, aspect: 0.86, onPick: id => { if (id) pick(id); }
        }))
        .then(v => {
            view = v;
            v.show(id => shownFor(byId[id]));
            v.canvas.setAttribute('aria-label',
                'A rotatable three-dimensional model of the body\'s organs. The list beside it ' +
                'offers the same choices.');
        })
        .catch(err => {
            console.warn('[body-index] 3D unavailable:', err);
            stage.innerHTML = '<p class="sim-fallback">The 3D model could not load here — ' +
                'the list beside it does the same job.</p>';
            stage.style.height = '';
        });

    function loadScript(src) {
        if (window.ORGAN3D) return Promise.resolve();
        return new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = res; s.onerror = () => rej(new Error(src + ' failed to load'));
            document.head.appendChild(s);
        });
    }

    function injectCss() {
        if (document.getElementById('body-index-css')) return;
        const s = document.createElement('style');
        s.id = 'body-index-css';
        s.textContent = `
.body-nav { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr); gap: 1.1rem 1.4rem; margin: 1.75rem 0 1.5rem; align-items: start; }
.body-stage-wrap { grid-column: 1; grid-row: 1; min-width: 0; }
.body-side { grid-column: 2; grid-row: 1 / span 2; min-width: 0; }
.body-panel { grid-column: 1; grid-row: 2; min-width: 0; }
.body-list { display: flex; flex-direction: column; gap: 0.7rem; }
.body-group { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.body-group-label {
    flex-basis: 100%; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.09em;
    text-transform: uppercase; color: var(--sys); margin-bottom: 0.05rem;
}
/* Small on purpose: 25 of these, and the panel beside them matters more. */
.body-item {
    font: inherit; font-size: 0.74rem; line-height: 1.2; cursor: pointer; text-align: left;
    display: inline-flex; align-items: center; gap: 0.32rem;
    padding: 0.2rem 0.45rem; border-radius: 999px;
    border: 1px solid var(--border); background: var(--bg-surface); color: var(--text);
}
.body-item > i { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 7px; }
.body-item:hover { border-color: var(--sys); }
.body-item.on { border-color: var(--sys); background: color-mix(in srgb, var(--sys) 14%, transparent); font-weight: 600; }
.body-item.thin { opacity: 0.6; }
.body-none { font-size: 0.6rem; color: var(--text-secondary); }
.body-item[hidden] { display: none; }
/* Female / Male: the dropdowns' segmented chips, sized to sit in a group label */
.body-group-label { display: flex; align-items: center; gap: 0.5rem; }
.body-sex { display: inline-flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
    letter-spacing: 0.04em; }
.body-sex button {
    font: inherit; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; cursor: pointer;
    padding: 0.15rem 0.5rem; border: 0; background: var(--bg-surface); color: var(--text-secondary);
}
.body-sex button + button { border-left: 1px solid var(--border); }
.body-sex button[aria-pressed="true"] { background: var(--pick, var(--dark-blue)); color: var(--pick-ink, #fff); }
@media (pointer: coarse) { .body-sex button { font-size: 0.66rem; padding: 0.45rem 0.8rem; } }
.body-panel { margin-top: 0.55rem; min-height: 8rem; }
/* The site gives every h2 a 2.5rem top margin and a 2px rule. Neither belongs
   on a panel heading that sits directly under the model it describes. */
.body-panel h2 {
    margin: 0 0 0.4rem; padding-bottom: 0; border-bottom: 0;
    font-size: 1.02rem;
}
.body-hint, .body-note, .body-warn { font-size: 0.82rem; line-height: 1.5; margin: 0 0 0.5rem; }
.body-hint { color: var(--text-secondary); }
.body-note { color: var(--text-secondary); }
.body-warn { color: var(--text); border-left: 3px solid var(--yellow); padding-left: 0.6rem; }
.body-where-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text-secondary); margin: 0.7rem 0 0.35rem; }
.body-where { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.body-where a {
    display: block; padding: 0.45rem 0.6rem; border-radius: 8px;
    border: 1px solid var(--border); text-decoration: none; color: var(--text); background: var(--bg-surface);
}
.body-where a:hover { border-color: var(--light-teal); text-decoration: none; }
.bw-chap { display: block; font-size: 0.68rem; color: var(--text-secondary); }
.bw-sec { display: block; font-weight: 600; font-size: 0.84rem; }
.body-scope { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6; margin-top: 1.5rem; }
/* One column on a narrow screen, and the panel goes LAST — you tap in the list,
   so the answer must not be above the thing you tapped. display:contents lets
   the three blocks be ordered independently of the wrapper they share. */
/* One column. The source order is already model, list, panel — which is what
   a phone wants, since you tap in the list and read the answer below it. */
@media (max-width: 860px) {
    .body-nav { grid-template-columns: 1fr; }
    .body-stage-wrap, .body-side, .body-panel { grid-column: 1; grid-row: auto; }
}
`;
        document.head.appendChild(s);
    }
})();
