/* =============================================================
   PRESENT — topic picker and slide preview (in the reader)
   -------------------------------------------------------------
   window.Present.open({ unitId, root, assetV })

   Called by the toolbar's Present button (assets/course.js), which
   has already loaded assets/unit-content.js. Opens a dialog:

   1. Topics  — choose the unit, tick chapters and sections, set
                the options. Teaching sections start ticked and
                Practice sections do not.
   2. Preview — every slide that will be shown, drawn for real and
                scaled down. Play, or open the presenter view.

   Play runs in this page, in an overlay taken full screen straight
   from the click. The presenter view also runs in this page, and
   opens the slides in a second window (present.html) — on the other
   screen when the browser can say where that is. Which of the two
   is offered first depends on whether the screens are extended or
   mirrored, because a presenter view on a mirrored screen shows the
   speaker notes to the whole room.
   ============================================================= */
(function () {
    'use strict';
    if (window.Present) return;

    let state = null;          // the open dialog, or null

    function open(opts) {
        opts = opts || {};
        if (state) { state.dialog.focus(); return Promise.resolve(); }
        const root = opts.root || '';
        const v = opts.assetV || '1';
        const q = '?v=' + encodeURIComponent(v);
        // Opened straight from disk, the browser refuses to let a page read the
        // other chapters, so say what to do instead of building half a deck.
        if (location.protocol === 'file:') return loadCss(root + 'assets/present.css' + q).then(fileMessage);
        return Promise.all([
            loadCss(root + 'assets/present.css' + q),
            loadScript(root + 'assets/present-core.js' + q)
                .then(() => loadScript(root + 'assets/present-player.js' + q))
        ]).then(() => build(Object.assign({ root, assetV: v }, opts)));
    }

    // Before present-core.js is here, so it cannot use that file's helpers.
    function loadScript(src) {
        if (document.querySelector('script[data-present-src="' + src + '"]')) {
            return window.PresentPlayer && window.PresentCore ? Promise.resolve() : new Promise(r => setTimeout(r, 50)).then(() => loadScript(src));
        }
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.dataset.presentSrc = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error('could not load ' + src));
            document.head.appendChild(s);
        });
    }
    function loadCss(href) {
        if (document.querySelector('link[data-present-css]')) return Promise.resolve();
        return new Promise(resolve => {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = href;
            l.dataset.presentCss = '1';
            l.onload = l.onerror = () => resolve();
            document.head.appendChild(l);
        });
    }

    function fileMessage() {
        const returnFocus = document.activeElement;
        const backdrop = document.createElement('div');
        backdrop.className = 'prm-backdrop';
        backdrop.innerHTML =
            '<div class="prm" role="dialog" aria-modal="true" aria-labelledby="prm-file-title" style="width:min(34rem,100%)">' +
                '<div class="prm-head"><div class="prm-head-text"><h2 id="prm-file-title">Present needs the course’s web address</h2></div>' +
                    '<button type="button" class="prm-x" aria-label="Close">&times;</button></div>' +
                '<div class="prm-body"><p>This page was opened as a file, so the browser will not let Present read the chapters it makes slides from.</p>' +
                    '<p style="margin-top:0.6rem">Open the course from its web address instead — for example <b>http://localhost:4321</b> — and choose Present again.</p></div>' +
                '<div class="prm-foot"><span class="prm-spacer"></span><button type="button" class="prm-btn primary">OK</button></div>' +
            '</div>';
        document.body.appendChild(backdrop);
        const done = () => { document.removeEventListener('keydown', onKey, true); backdrop.remove(); if (returnFocus && returnFocus.focus) returnFocus.focus(); };
        const onKey = e => {
            if (e.key === 'Escape') { e.preventDefault(); done(); }
            else if (e.key === 'Tab') { e.preventDefault(); const b = [...backdrop.querySelectorAll('button')]; b[(b.indexOf(document.activeElement) + 1) % b.length].focus(); }
        };
        document.addEventListener('keydown', onKey, true);
        backdrop.querySelectorAll('button').forEach(b => b.addEventListener('click', done));
        backdrop.querySelector('.primary').focus();
    }

    function build(opts) {
        const PC = window.PresentCore, PP = window.PresentPlayer, UC = window.UnitContent;
        const esc = PC.esc;
        const units = UC.units();
        const returnFocus = document.activeElement;
        const liveChapter = document.body.dataset.chapter || null;

        const backdrop = document.createElement('div');
        backdrop.className = 'prm-backdrop';
        backdrop.innerHTML =
            '<div class="prm" role="dialog" aria-modal="true" aria-labelledby="prm-title" aria-describedby="prm-sub" tabindex="-1">' +
                '<div class="prm-head"><div class="prm-head-text"><h2 id="prm-title">Present</h2>' +
                    '<p id="prm-sub">Choose what to show. Every slide is made from the chapters’ own text; the full text is in the speaker notes.</p></div>' +
                    '<button type="button" class="prm-x" data-act="close" aria-label="Close">&times;</button></div>' +
                '<div class="prm-body"></div>' +
                '<div class="prm-foot"></div>' +
            '</div>';
        document.body.appendChild(backdrop);
        const dialog = backdrop.querySelector('.prm');
        const body = dialog.querySelector('.prm-body');
        const foot = dialog.querySelector('.prm-foot');
        const title = dialog.querySelector('#prm-title');
        const sub = dialog.querySelector('#prm-sub');
        const prevOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';

        const S = state = {
            dialog, unit: null, unitId: opts.unitId || null, selected: new Set(),
            options: Object.assign({}, PC.DEFAULT_OPTIONS), slides: [], step: 'topics',
            expanded: new Set(), view: null, grid: null, loadToken: 0,
            skipped: new Set(), lastToggle: null
        };

        /* ---- skipped slides ---- */
        // A teacher's cuts are kept per unit, by slide id, so they survive closing
        // Present and ticking other topics. Ids for slides that are not in the
        // current deck are kept too (they come back if the topic is ticked again)
        // and simply ignored when counting.
        const skipKey = id => 'bio_present_skip_' + id;
        function loadSkips(unitId) {
            let ids = [];
            try { ids = JSON.parse(localStorage.getItem(skipKey(unitId)) || '[]'); } catch (e) { ids = []; }
            S.skipped = new Set(Array.isArray(ids) ? ids.filter(x => typeof x === 'string') : []);
        }
        function saveSkips() {
            if (!S.unit) return;
            try {
                if (S.skipped.size) localStorage.setItem(skipKey(S.unit.id), JSON.stringify([...S.skipped]));
                else localStorage.removeItem(skipKey(S.unit.id));
            } catch (e) { /* storage unavailable: skips last for this visit only */ }
        }
        const playable = () => PC.playable(S.slides, S.skipped);

        /* ---- closing and focus ---- */
        function close() {
            if (S.view) { S.view.destroy(); S.view = null; }
            if (S.grid) { S.grid.destroy(); S.grid = null; }
            document.removeEventListener('keydown', onKey, true);
            backdrop.remove();
            document.documentElement.style.overflow = prevOverflow;
            state = null;
            if (returnFocus && returnFocus.focus) returnFocus.focus();
        }
        const focusables = () => [...dialog.querySelectorAll('button, input, select, a[href], [tabindex]:not([tabindex="-1"])')]
            .filter(el => !el.disabled && el.getClientRects().length && !el.closest('[inert]'));
        function onKey(e) {
            if (S.view || backdrop.hidden) return;             // the player has the keyboard
            if (e.key === 'Escape') {
                e.preventDefault(); e.stopPropagation();
                if (S.step === 'preview') showTopics(); else close();
            } else if (e.key === 'Tab') {
                const f = focusables();
                if (!f.length) return;
                const first = f[0], last = f[f.length - 1];
                if (!dialog.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
                else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
        document.addEventListener('keydown', onKey, true);
        backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) close(); });

        /* ---- step 1: topics ---- */
        function showTopics() {
            if (S.grid) { S.grid.destroy(); S.grid = null; }
            S.step = 'topics';
            dialog.classList.remove('prm-wide');
            title.textContent = 'Present';
            sub.textContent = 'Choose what to show. Every slide is made from the chapters’ own text; the full text is in the speaker notes.';
            body.innerHTML =
                '<div class="prm-row"><label for="prm-unit">Unit</label><select id="prm-unit">' +
                    (S.unitId ? '' : '<option value="">Choose a unit…</option>') +
                    units.map(u => '<option value="' + esc(u.id) + '"' + (u.id === S.unitId ? ' selected' : '') + '>' + esc(u.label) + '</option>').join('') +
                '</select></div>' +
                '<div class="prm-load" role="status" aria-live="polite"></div>' +
                '<fieldset class="prm-options"><legend>Include</legend>' +
                    check('figures', 'Figures') + check('sims', 'Interactive slides') + check('questions', 'Check and quiz questions, with answers to reveal') +
                '</fieldset>' +
                '<div class="prm-tools" hidden>' +
                    '<button type="button" class="prm-btn small" data-act="defaults">Teaching sections</button>' +
                    '<button type="button" class="prm-btn small" data-act="all">Everything</button>' +
                    '<button type="button" class="prm-btn small" data-act="none">Clear</button>' +
                    (liveChapter ? '<button type="button" class="prm-btn small" data-act="this">Just this chapter</button>' : '') +
                '</div>' +
                '<ul class="prm-tree" aria-label="Chapters and sections"></ul>';
            foot.innerHTML = '<span class="prm-spacer"></span><span class="prm-count" aria-live="polite"></span>' +
                '<button type="button" class="prm-btn primary" data-act="preview">Preview slides</button>';
            body.querySelector('#prm-unit').addEventListener('change', e => { S.unitId = e.target.value; loadUnit(); });
            body.querySelectorAll('.prm-options input').forEach(inp => inp.addEventListener('change', () => {
                S.options[inp.dataset.opt] = inp.checked;
                if (inp.dataset.opt === 'questions' && S.unit) tickQuestionSections(inp.checked);
                refresh();
            }));
            if (S.unit && S.unit.id === S.unitId) { drawTree(); refresh(); }
            else if (S.unitId) loadUnit();
            else refresh();
            const focusTarget = body.querySelector('#prm-unit');
            setTimeout(() => (S.unitId ? (body.querySelector('.prm-tree input') || focusTarget) : focusTarget).focus(), 30);
        }
        const check = (key, label) => '<label class="prm-check"><input type="checkbox" data-opt="' + key + '"' +
            (S.options[key] ? ' checked' : '') + '> ' + esc(label) + '</label>';

        function loadUnit() {
            const token = ++S.loadToken;
            const load = body.querySelector('.prm-load');
            const tree = body.querySelector('.prm-tree');
            tree.innerHTML = '';
            body.querySelector('.prm-tools').hidden = true;
            S.unit = null;
            refresh();
            if (!S.unitId) return;
            const label = (units.find(u => u.id === S.unitId) || {}).label || S.unitId;
            load.innerHTML = '<p class="prm-status">Reading the chapters of ' + esc(label) + '…</p><div class="prm-bar"><i></i></div>';
            UC.load(S.unitId, {
                onProgress(done, total) {
                    if (token !== S.loadToken) return;
                    const p = load.querySelector('.prm-status');
                    if (p) p.textContent = 'Reading chapters… ' + done + ' of ' + total;
                    const bar = load.querySelector('.prm-bar i');
                    if (bar) bar.style.width = Math.round(100 * done / total) + '%';
                }
            }).then(unit => {
                if (token !== S.loadToken || state !== S) return;
                S.unit = unit;
                loadSkips(unit.id);
                S.selected = new Set();
                unit.chapters.forEach(ch => ch.sections.forEach(sec => { if (PC.defaultOn(sec)) S.selected.add(PC.sectionKey(ch, sec)); }));
                S.expanded = new Set([unit.chapters.some(c => c.id === liveChapter) ? liveChapter : (unit.chapters[0] || {}).id]);
                load.innerHTML = unit.errors.length
                    ? '<p class="prm-alert">' + unit.errors.length + ' chapter' + (unit.errors.length === 1 ? '' : 's') + ' could not be read and ' +
                        (unit.errors.length === 1 ? 'is' : 'are') + ' left out: ' + unit.errors.map(e => esc(e.title)).join(', ') +
                        (unit.errors[0].fileProtocol ? '. The course needs to be opened from a web address, not as a file.' : '.') + '</p>'
                    : '';
                drawTree();
                refresh();
            }).catch(err => {
                if (token !== S.loadToken) return;
                load.innerHTML = '<p class="prm-status error">The unit could not be read: ' + esc(err.message || err) + '</p>';
            });
        }

        // The questions live in the Practice sections, which start unticked, so the
        // option would otherwise appear to do nothing. Turning it on ticks the
        // sections that hold questions; turning it off unticks only those it ticked.
        function tickQuestionSections(on) {
            S.autoTicked = S.autoTicked || new Set();
            S.unit.chapters.forEach(ch => ch.sections.forEach(sec => {
                if (!sec.blocks.some(b => b.type === 'quiz' || b.type === 'check')) return;
                const k = PC.sectionKey(ch, sec);
                if (on && !S.selected.has(k)) { S.selected.add(k); S.autoTicked.add(k); }
                if (!on && S.autoTicked.has(k)) { S.selected.delete(k); S.autoTicked.delete(k); }
            }));
            syncChapters();
        }

        function drawTree() {
            const tree = body.querySelector('.prm-tree');
            if (!tree || !S.unit) return;
            body.querySelector('.prm-tools').hidden = false;
            tree.style.setProperty('--unit-h', S.unit.hue);
            tree.innerHTML = S.unit.chapters.map((ch, ci) => {
                const open = S.expanded.has(ch.id);
                const name = ch.number ? '<span class="prm-num">' + esc(ch.number) + '</span> ' + esc(ch.title.replace(/^\d+\.\d+\s*/, '')) : esc(ch.title);
                return '<li class="prm-ch" data-ch="' + esc(ch.id) + '">' +
                    '<div class="prm-ch-row">' +
                        '<button type="button" class="prm-disclose" aria-expanded="' + open + '" aria-controls="prm-secs-' + ci + '" aria-label="Show sections of ' + esc(ch.title) + '"><span aria-hidden="true">&#9656;</span></button>' +
                        '<label class="prm-check"><input type="checkbox" data-chapter="' + esc(ch.id) + '"> <span>' + name + '</span></label>' +
                        '<span class="prm-n" data-n="' + esc(ch.id) + '"></span>' +
                    '</div>' +
                    '<ul class="prm-secs" id="prm-secs-' + ci + '"' + (open ? '' : ' hidden') + '>' +
                        ch.sections.map(sec => {
                            const key = PC.sectionKey(ch, sec);
                            const label = sec.id === 'overview' ? 'Chapter opening' : (sec.title || sec.id);
                            return '<li><label class="prm-check"><input type="checkbox" data-key="' + esc(key) + '"' + (S.selected.has(key) ? ' checked' : '') + '> ' + esc(label) + '</label>' +
                                (sec.kind ? '<span class="prm-kind' + (/practice/i.test(sec.kind) ? ' practice' : '') + '">' + esc(sec.kind) + '</span>' : '') + '</li>';
                        }).join('') +
                    '</ul></li>';
            }).join('');
            syncChapters();
        }

        function syncChapters() {
            if (!S.unit) return;
            S.unit.chapters.forEach(ch => {
                const box = body.querySelector('input[data-chapter="' + CSS.escape(ch.id) + '"]');
                if (!box) return;
                const on = ch.sections.filter(s => S.selected.has(PC.sectionKey(ch, s))).length;
                box.checked = on > 0 && on === ch.sections.length;
                box.indeterminate = on > 0 && on < ch.sections.length;
                body.querySelectorAll('input[data-key^="' + CSS.escape(ch.id) + '#"]').forEach(inp => { inp.checked = S.selected.has(inp.dataset.key); });
            });
        }

        body.addEventListener('change', e => {
            const t = e.target;
            if (!S.unit) return;
            if (t.dataset.key) {
                if (t.checked) S.selected.add(t.dataset.key); else S.selected.delete(t.dataset.key);
            } else if (t.dataset.chapter) {
                const ch = S.unit.chapters.find(c => c.id === t.dataset.chapter);
                ch.sections.forEach(s => { const k = PC.sectionKey(ch, s); if (t.checked) S.selected.add(k); else S.selected.delete(k); });
            } else return;
            syncChapters();
            refresh();
        });

        /* ---- counting ---- */
        function refresh() {
            S.slides = S.unit ? PC.build(S.unit, S.selected, S.options) : [];
            const n = S.slides.length;
            const live = playable();
            const count = foot.querySelector('.prm-count');
            if (count) count.textContent = live.length + ' slide' + (live.length === 1 ? '' : 's') +
                (live.length < n ? ' · ' + (n - live.length) + ' skipped' : '');
            const pv = foot.querySelector('[data-act="preview"]');
            if (pv) pv.disabled = !n;
            if (S.unit && S.step === 'topics') {
                const per = {};
                live.forEach(s => { if (s.chapterId) per[s.chapterId] = (per[s.chapterId] || 0) + 1; });
                body.querySelectorAll('[data-n]').forEach(el => {
                    const k = per[el.dataset.n] || 0;
                    el.textContent = k ? k + ' slide' + (k === 1 ? '' : 's') : '';
                });
            }
        }

        /* ---- step 2: preview ---- */
        function showPreview() {
            if (!S.slides.length) return;
            S.step = 'preview';
            dialog.classList.add('prm-wide');
            sub.textContent = S.unit.label + '. Choose a slide to start from it, or untick slides to skip them.';
            body.innerHTML = '<div class="prm-screens" role="region" aria-label="Screens"></div>' +
                '<div class="prm-grid-bar"><span class="prm-include-count" role="status" aria-live="polite"></span>' +
                '<button type="button" class="prm-btn small" data-act="include-all">Include all slides</button>' +
                '<span class="prm-note">Untick a slide to skip it. Shift-click a box to skip or include every slide since the last one you changed.</span></div>' +
                '<div class="prm-grid-bar prm-trbar">' +
                '<label class="prm-note" for="prm-lang">Language</label>' +
                '<select id="prm-lang" class="prm-select"></select>' +
                '<button type="button" class="prm-btn small" data-act="translate">Translate deck</button>' +
                (S.slidesEn ? '<button type="button" class="prm-btn small" data-act="untranslate">Back to English</button>' : '') +
                '<label class="prm-note prm-check"><input type="checkbox" id="prm-tr-notes"' +
                (S.trNotes ? ' checked' : '') + '> also translate speaker notes</label>' +
                '<span class="prm-tr-status" role="status" aria-live="polite"></span></div>' +
                '<div class="prm-grid-host"></div>';
            S.lastToggle = null;
            fillLangs();
            drawScreens();
            const full = Object.assign(deckFor(), { slides: S.slides });
            S.grid = PP.grid(body.querySelector('.prm-grid-host'), full, {
                scrollRoot: body, pickLabel: 'Play from here',
                onPick: i => {
                    // a skipped slide starts the show at the next slide that is included
                    const live = playable();
                    const at = live.find(p => p.fullIndex >= i) || live[live.length - 1];
                    if (at) play(at.index);
                },
                toggles: {
                    isSkipped: sl => S.skipped.has(sl.id),
                    numberOf: sl => S.numbers && S.numbers.get(sl.id),
                    onToggle: (sl, include, e) => {
                        const from = e.shiftKey && S.lastToggle != null ? Math.min(S.lastToggle, sl.index) : sl.index;
                        const to = e.shiftKey && S.lastToggle != null ? Math.max(S.lastToggle, sl.index) : sl.index;
                        for (let i = from; i <= to; i++) {
                            if (include) S.skipped.delete(S.slides[i].id); else S.skipped.add(S.slides[i].id);
                        }
                        S.lastToggle = sl.index;
                        saveSkips();
                        updateSkips();
                    }
                },
                onChapter: (chapterId, include) => {
                    S.slides.filter(sl => sl.chapterId === chapterId)
                        .forEach(sl => { if (include) S.skipped.delete(sl.id); else S.skipped.add(sl.id); });
                    saveSkips();
                    updateSkips();
                }
            });
            updateSkips();
            setTimeout(() => { const b = foot.querySelector('.primary:not([disabled])') || foot.querySelector('[data-act="back"]'); if (b) b.focus(); }, 30);
        }

        // Counts, dimming, and whether there is anything left to play.
        function updateSkips() {
            if (S.step !== 'preview') return;
            const live = playable();
            S.numbers = new Map(live.map(p => [p.id, p.index + 1]));
            const total = S.slides.length, n = live.length;
            title.textContent = 'Preview · ' + (n === total ? total + ' slides' : n + ' of ' + total + ' slides');
            const c = body.querySelector('.prm-include-count');
            if (c) c.textContent = n + ' of ' + total + ' slides included';
            const ia = body.querySelector('[data-act="include-all"]');
            if (ia) ia.disabled = n === total;
            if (S.grid) S.grid.refresh();
            const fc = foot.querySelector('.prm-count');
            if (fc) fc.textContent = n === total ? total + ' slides' : n + ' of ' + total + ' slides';
            foot.querySelectorAll('[data-act="play"], [data-act="presenter"]').forEach(b => { b.disabled = !n; });
            let msg = foot.querySelector('.prm-skip-msg');
            if (!n && !msg) {
                msg = document.createElement('span');
                msg.className = 'prm-skip-msg';
                msg.setAttribute('role', 'status');
                msg.textContent = 'Every slide is skipped. Include at least one to play.';
                foot.insertBefore(msg, foot.querySelector('.prm-spacer'));
            } else if (n && msg) msg.remove();
        }

        const deckFor = session => ({
            slides: playable(), hue: S.unit.hue, unitLabel: S.unit.label, root: opts.root, assetV: opts.assetV, session: session || null
        });

        // What the screens look like decides which way of presenting comes first.
        function drawScreens() {
            const box = body.querySelector('.prm-screens');
            if (!box) return;
            const scr = PC.screens();
            const change = scr.source === 'remembered' ? ' <button type="button" class="prm-btn small" data-act="screens-reset">Change</button>' : '';
            let primary = 'play';
            box.classList.remove('warn');
            if (scr.mode === 'single') {
                box.classList.add('warn');
                box.innerHTML = '<p>Your screens are mirrored or you have one screen, so speaker notes stay hidden. Press <b>N</b> to peek — the room will see it.' + change + '</p>';
            } else if (scr.mode === 'extended') {
                primary = 'presenter';
                box.innerHTML = scr.source === 'detected'
                    ? '<p>Two screens found. The presenter view, with your notes, stays on this screen and the slides open on the other one.</p>'
                    : '<p>You said you use two screens (extended). The slides open in a new window: drag it to the projector and press <b>F</b>.' + change + '</p>';
            } else {
                box.innerHTML =
                    '<p><b>Is the projector showing a second screen, or a copy of this one?</b></p>' +
                    '<p>Extended: the projector is a separate screen, so your notes can stay on your laptop. Mirrored: the room sees exactly what your laptop shows. To switch, on macOS open System Settings → Displays; on Windows press Win+P.</p>' +
                    '<div class="prm-row"><button type="button" class="prm-btn" data-act="screens-extended">Two screens (extended)</button>' +
                    '<button type="button" class="prm-btn" data-act="screens-single">One screen / mirrored</button></div>';
            }
            const presenterLabel = scr.mode === 'extended' && scr.source === 'detected'
                ? 'Presenter view here, slides on the other screen'
                : (scr.mode === 'single' ? 'Presenter view anyway' : 'Presenter view');
            const btn = (act, label, isPrimary) => '<button type="button" class="prm-btn' + (isPrimary ? ' primary' : '') + '" data-act="' + act + '">' + esc(label) + '</button>';
            foot.innerHTML =
                '<button type="button" class="prm-btn" data-act="back">&#8592; Back to topics</button>' +
                '<span class="prm-spacer"></span>' +
                '<button type="button" class="prm-btn small" data-act="export-pptx" ' +
                'title="Editable PowerPoint. Canva and Google Slides both import it.">PowerPoint</button>' +
                '<button type="button" class="prm-btn small" data-act="export-pdf" ' +
                'title="One slide per page, through your browser’s print dialog">PDF</button>' +
                '<span class="prm-count">' + S.slides.length + ' slides</span>' +
                (primary === 'presenter'
                    ? btn('play', 'Play on this screen', false) + btn('presenter', presenterLabel, true)
                    : btn('presenter', presenterLabel, false) + btn('play', 'Play', true));
            updateSkips();
        }

        /* ---- translation ----
           The deck is translated as data and put back into S.slides, so playing,
           the presenter view, the thumbnails and both exports all pick it up with
           no further work — deckFor() reads S.slides. The English deck is kept in
           S.slidesEn so "Back to English" is free. */
        let trP = null;
        function loadTranslator() {
            if (window.TranslateCore) return Promise.resolve();
            if (trP) return trP;
            trP = new Promise((ok, no) => {
                const el = document.createElement('script');
                el.src = new URL((opts.root || './') + 'assets/translate-core.js', location.href).href +
                    (opts.assetV ? '?v=' + opts.assetV : '');
                el.async = false;
                el.onload = () => (window.TranslateCore ? ok() : no(new Error('the translator did not register')));
                el.onerror = () => no(new Error('could not load the translator'));
                document.head.appendChild(el);
            });
            return trP;
        }

        function fillLangs() {
            const sel = body.querySelector('#prm-lang');
            if (!sel) return;
            const list = (window.TranslateCore && window.TranslateCore.LANGS) || [
                ['zh-Hant', '繁體中文 — Traditional Chinese'], ['zh', '简体中文 — Simplified Chinese'],
                ['ko', '한국어 — Korean'], ['ja', '日本語 — Japanese'], ['es', 'Español — Spanish'],
                ['fr', 'Français — French'], ['pt', 'Português — Portuguese'], ['de', 'Deutsch — German'],
                ['hi', 'हिन्दी — Hindi'], ['vi', 'Tiếng Việt — Vietnamese'], ['th', 'ไทย — Thai'],
                ['id', 'Bahasa Indonesia'], ['ar', 'العربية — Arabic'], ['ru', 'Русский — Russian']
            ];
            sel.innerHTML = list.map(l => '<option value="' + esc(l[0]) + '">' + esc(l[1]) + '</option>').join('');
            if (S.lang) sel.value = S.lang;
            const st = body.querySelector('.prm-tr-status');
            if (st && S.lang && window.TranslateCore) {
                st.textContent = 'Showing ' + window.TranslateCore.labelFor(S.lang) +
                    '. Glossary terms stay in English.';
            }
        }

        let translating = false;
        async function runTranslate(btn) {
            if (translating) return;
            const sel = body.querySelector('#prm-lang');
            if (!sel) return;
            const lang = sel.value;
            S.trNotes = !!(body.querySelector('#prm-tr-notes') || {}).checked;
            const say = m => { const st = body.querySelector('.prm-tr-status'); if (st) st.textContent = m; };
            translating = true;
            btn.disabled = true;
            const label = btn.textContent;
            btn.textContent = 'Translating…';
            try {
                await loadTranslator();
                if (!window.TranslateCore.supported()) {
                    say('This browser has no on-device translator. Chrome or Edge 138 and later have one; ' +
                        'otherwise use your browser\u2019s own Translate on the chapter page.');
                } else {
                    say('Preparing ' + window.TranslateCore.labelFor(lang) + '\u2026');
                    const src = S.slidesEn || S.slides;
                    const r = await PC.translateDeck(src, lang, {
                        notes: S.trNotes,
                        onStatus: say,
                        onProgress: (n, t, kept) => {
                            btn.textContent = n + '/' + t + '\u2026';
                            say('Translating\u2026 ' + n + ' of ' + t + (kept ? ' (' + kept + ' kept in English)' : ''));
                        }
                    });
                    S.slidesEn = src;
                    S.slides = r.slides;
                    S.lang = lang;
                    showPreview();
                    say('Showing ' + window.TranslateCore.labelFor(lang) + ' \u2014 ' + r.strings +
                        ' pieces of text' + (r.keptEnglish ? ', ' + r.keptEnglish + ' kept in English' : '') +
                        '. Glossary terms stay in English. Exports follow this language.');
                }
            } catch (e) {
                say((e && e.message ? e.message : 'Translation failed') +
                    '. The chapter page\u2019s Translate button explains where your browser keeps its own.');
            }
            translating = false;
            const b2 = body.querySelector('[data-act="translate"]');
            if (b2) { b2.disabled = false; b2.textContent = label; }
        }

        /* ---- export ----
           The exporter and the 450KB PptxGenJS bundle behind it are only fetched when
           someone actually exports, so an ordinary present never pays for them. */
        let exporting = false;
        let exporterP = null;

        function loadExporter() {
            if (window.PresentExport) return Promise.resolve();
            if (exporterP) return exporterP;
            exporterP = new Promise((ok, no) => {
                const el = document.createElement('script');
                el.src = new URL((opts.root || './') + 'assets/present-export.js', location.href).href +
                    (opts.assetV ? '?v=' + opts.assetV : '');
                el.async = false;
                el.onload = () => (window.PresentExport ? ok() : no(new Error('the exporter did not register')));
                el.onerror = () => no(new Error('could not load the exporter'));
                document.head.appendChild(el);
            });
            return exporterP;
        }

        function runExport(asPdf, btn) {
            if (exporting) return;
            const deck = deckFor();
            if (!deck.slides.length) return;
            const label = btn.textContent;
            const count = foot.querySelector('.prm-count');
            const was = count ? count.textContent : '';
            const done = msg => {
                exporting = false;
                btn.disabled = false;
                btn.textContent = label;
                if (count) count.textContent = msg || was;
            };
            exporting = true;
            btn.disabled = true;
            btn.textContent = asPdf ? 'Preparing…' : 'Exporting…';
            loadExporter()
                .then(() => asPdf
                    ? window.PresentExport.pdf(deck)
                    : window.PresentExport.pptx(deck, {
                        onProgress: (n, total) => { btn.textContent = n + '/' + total + '…'; }
                    }))
                .then(() => done(asPdf ? 'Sent to your print dialog' : 'Saved ' + deck.slides.length + ' slides'))
                .catch(err => done('Export failed: ' + ((err && err.message) || 'unknown error')));
        }

        /* ---- play and present ---- */
        function hideDialog() { backdrop.hidden = true; }
        function backToPreview() {
            if (S.view) { S.view.destroy(); S.view = null; }
            if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) { /* ignore */ } }
            backdrop.hidden = false;
            drawScreens();
            const b = foot.querySelector('.primary');
            if (b) b.focus();
        }

        function play(start) {
            const deck = deckFor();
            if (!deck.slides.length) return;
            const ctl = PP.controller(deck, { start: start || 0 });
            hideDialog();
            let player = null;
            const scr = PC.screens();
            player = PP.player(document.body, deck, {
                controller: ctl, role: 'single', inPage: true,
                onExit: backToPreview,
                notice: scr.mode === 'single' ? 'Speaker notes are hidden because the room can see this screen. Press N to peek.' : null
            });
            S.view = { destroy() { ctl.close(); player.destroy(); } };
            // still inside the click, so the browser allows full screen straight away
            const el = player.root;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (req) {
                try {
                    const p = req.call(el);
                    if (p && p.catch) p.catch(() => player.toast('Press F for full screen.'));
                } catch (e) { player.toast('Press F for full screen.'); }
            }
        }

        async function presenter(start) {
            if (!playable().length) return;
            const scr = PC.screens();
            const session = PC.newSession({
                unitId: S.unit.id, sections: [...S.selected], options: S.options, assetV: opts.assetV, at: start || 0,
                skipped: [...S.skipped]
            });
            const url = new URL(opts.root + 'present.html', location.href);
            url.search = new URLSearchParams({ session, role: 'audience', v: opts.assetV }).toString();
            const name = 'bio-present-audience-' + session;
            // open the slides window first, while this click still counts as a gesture
            const first = await PC.openAudienceWindow(url.href, name);
            const deck = deckFor(session);
            const ctl = PP.controller(deck, { session, role: 'presenter', start: start || 0 });
            hideDialog();
            const pv = PP.presenter(document.body, deck, {
                controller: ctl, inPage: true,
                audience: first,
                warnSingle: scr.mode === 'single',
                openAudience: () => PC.openAudienceWindow(url.href, name),
                onSlidesOnly: () => { const at = ctl.at; S.view.destroy(); S.view = null; play(at); },
                onExit: () => {
                    if (first.win && !first.win.closed) { try { first.win.close(); } catch (e) { /* ignore */ } }
                    backToPreview();
                }
            });
            S.view = { destroy() { ctl.close(); pv.destroy(); } };
        }

        /* ---- buttons ---- */
        dialog.addEventListener('click', e => {
            const d = e.target.closest('.prm-disclose');
            if (d) {
                const li = d.closest('.prm-ch');
                const secs = li.querySelector('.prm-secs');
                const openNow = secs.hidden;
                secs.hidden = !openNow;
                d.setAttribute('aria-expanded', String(openNow));
                if (openNow) S.expanded.add(li.dataset.ch); else S.expanded.delete(li.dataset.ch);
                return;
            }
            const b = e.target.closest('[data-act]');
            if (!b || b.disabled || !dialog.contains(b)) return;
            const act = b.dataset.act;
            if (act === 'close') close();
            else if (act === 'preview') showPreview();
            else if (act === 'back') showTopics();
            else if (act === 'include-all') { S.skipped = new Set(); S.lastToggle = null; saveSkips(); updateSkips(); }
            else if (act === 'translate') runTranslate(b);
            else if (act === 'untranslate') {
                S.slides = S.slidesEn; S.slidesEn = null; S.lang = null;
                showPreview();
            }
            else if (act === 'export-pptx' || act === 'export-pdf') runExport(act === 'export-pdf', b);
            else if (act === 'play') play(0);
            else if (act === 'presenter') presenter(0);
            else if (act === 'screens-extended' || act === 'screens-single') {
                PC.rememberScreens(act === 'screens-extended' ? 'extended' : 'single');
                drawScreens();
                const p = foot.querySelector('.primary'); if (p) p.focus();
            } else if (act === 'screens-reset') { PC.rememberScreens(null); drawScreens(); }
            else if (S.unit && (act === 'defaults' || act === 'all' || act === 'none' || act === 'this')) {
                S.selected = new Set();
                S.unit.chapters.forEach(ch => ch.sections.forEach(sec => {
                    const on = act === 'all' || (act === 'defaults' && PC.defaultOn(sec)) || (act === 'this' && ch.id === liveChapter && PC.defaultOn(sec));
                    if (on) S.selected.add(PC.sectionKey(ch, sec));
                }));
                if (act === 'this') {
                    S.expanded = new Set([liveChapter]);
                    drawTree();
                } else syncChapters();
                refresh();
            }
        });

        showTopics();
        S.test = { play, presenter, showPreview, showTopics, drawScreens, close };
        window.Present._state = S;               // handy when checking the tool from the console
        return S;
    }

    window.Present = { open };
})();
