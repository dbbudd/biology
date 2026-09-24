/* =============================================================
   COURSE READER SHELL
   -------------------------------------------------------------
   Adapted from the HKIS Teaching & Learning Handbook shell.
   Renders the toolbar, sidebar, progress bar and reading-position
   bar so that each content page only has to contain <main>.

   A page needs:
     <body data-root="../" data-chapter="ch01-cell-membrane">
     <main class="main"> ... </main>
     <script src="../assets/toc.js"></script>
     <script src="../assets/course.js"></script>

   data-root  path back to the site root ('' on index.html)
   data-chapter  matches an id in COURSE.chapters (omit on index)
   ============================================================= */
(function () {
    'use strict';

    const ASSET_V = 330;   // bump when shipping changes to sims/
    const COURSE  = window.COURSE || { title: 'Course', chapters: [], glossary: {} };
    const ROOT    = document.body.dataset.root || '';
    const CHAP_ID = document.body.dataset.chapter || null;
    const chapters = COURSE.chapters || [];
    const chapIdx = chapters.findIndex(c => c.id === CHAP_ID);
    const chapter = chapIdx >= 0 ? chapters[chapIdx] : null;
    const main    = document.querySelector('main.main');

    // ===== UNITS =====
    // COURSE.units is the ordered registry; a chapter's `unit` is an id in it.
    // Falls back to treating the chapter's unit string as its own unit so an
    // older toc.js without a units array still renders.
    const units = (COURSE.units && COURSE.units.length)
        ? COURSE.units
        : [...new Set(chapters.map(c => c.unit))].map((u, i) => ({
            id: u, label: u, hue: (i * 67) % 360
        }));
    const unitOf = id => units.find(u => u.id === id) || { id, label: id, hue: 210 };
    const chaptersInUnit = u => chapters.filter(c => c.unit === u.id);
    function unitCount(u) {
        return chaptersInUnit(u).reduce((a, c) => {
            const { done, total } = chapterCount(c);
            return { done: a.done + done, total: a.total + total };
        }, { done: 0, total: 0 });
    }
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // Heading text without the injected action buttons, for nav labels,
    // the search index and prerequisite pill names.
    function headingText(el) {
        if (!el) return '';
        const clone = el.cloneNode(true);
        clone.querySelectorAll('.head-actions').forEach(n => n.remove());
        return clone.textContent.trim();
    }

    // ===== PREFS =====
    const P = {
        get(k, d) { try { return localStorage.getItem('bio_' + k) || d; } catch { return d; } },
        set(k, v) { try { localStorage.setItem('bio_' + k, v); } catch { } }
    };

    // ===== CHROME =====
    function renderChrome() {
        const toolbar = `
<header class="toolbar" role="banner">
    <div class="toolbar-left">
        <button class="menu-toggle" aria-label="Toggle navigation" onclick="toggleNav()">&#9776;</button>
        <img src="${ROOT}images/HKIS-logo.png" alt="HKIS logo" class="toolbar-logo">
        <span class="toolbar-brand">${esc(COURSE.title)}</span>
    </div>
    <div class="toolbar-right">
        <div class="tp-wrap">
            <button type="button" class="toolbar-progress" id="toolbar-progress"
                    onclick="toggleProgress()" aria-haspopup="true" aria-expanded="false"
                    aria-controls="tp-panel" aria-label="Course progress — open unit list">
                <span class="tp-count" id="tp-count">0/0</span>
                <span class="tp-bar" id="tp-bar" role="progressbar"
                      aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                      aria-label="Course progress"></span>
                <span class="tp-caret" aria-hidden="true">&#9662;</span>
            </button>
            <div class="tp-panel" id="tp-panel" hidden></div>
        </div>
        <div class="search-wrap">
            <button class="tb" id="btn-search" onclick="toggleSearch()" aria-label="Search" title="Search the course (Ctrl/Cmd K)">&#128269;</button>
            <input type="text" class="search-input" id="search-input" placeholder="Search the course..." aria-label="Search the course" autocomplete="off">
            <div class="search-results" id="search-results"></div>
        </div>
        <span class="tb-sep" aria-hidden="true"></span>
        <div class="aa-wrap">
            <button class="tb tb-tool" id="btn-aa" onclick="toggleAa()" aria-label="Reading settings" title="Text size, font and theme"><span class="tb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18.5 8.2 6.2l5.2 12.3"/><path d="M4.8 14.6h6.8"/><path d="M19 18.5v-7"/><path d="M16.6 13.6 19 11.2l2.4 2.4"/></svg></span><span class="tb-label">Text</span></button>
            <div class="aa-popover" id="aa-popover">
                <div class="aa-section">
                    <div class="aa-label">Text Size</div>
                    <div class="aa-size-row">
                        <button class="tb" onclick="adjustFontSize(-1)" aria-label="Smaller text">A&minus;</button>
                        <span class="aa-size-label" id="size-label">100%</span>
                        <button class="tb" onclick="adjustFontSize(1)" aria-label="Larger text">A+</button>
                    </div>
                </div>
                <div class="aa-section">
                    <div class="aa-label">Font</div>
                    <div class="aa-row">
                        <button class="tb" id="btn-font-sans" onclick="setFont('sans')">Sans</button>
                        <button class="tb" id="btn-font-serif" onclick="setFont('serif')">Serif</button>
                        <button class="tb" id="btn-font-dyslexic" onclick="setFont('dyslexic')">Dyslexic</button>
                    </div>
                </div>
                <div class="aa-section">
                    <div class="aa-label">Progress</div>
                    <div class="aa-row">
                        <button class="tb" onclick="resetProgress()" title="Clear every completed section">Reset progress</button>
                    </div>
                </div>
                <div class="aa-section">
                    <div class="aa-label">Theme</div>
                    <div class="aa-themes">
                        <div class="aa-theme-opt"><div class="theme-swatch swatch-light" onclick="setTheme('light')" id="sw-light" title="Light"></div><span>Light</span></div>
                        <div class="aa-theme-opt"><div class="theme-swatch swatch-sepia" onclick="setTheme('sepia')" id="sw-sepia" title="Sepia"></div><span>Sepia</span></div>
                        <div class="aa-theme-opt"><div class="theme-swatch swatch-dark" onclick="setTheme('dark')" id="sw-dark" title="Dark"></div><span>Dark</span></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="tr-wrap"><button class="tb tb-tool" id="btn-translate" onclick="openTranslate()" aria-label="Translate this chapter" title="Translate this chapter"><span class="tb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5h8"/><path d="M7.5 4v1.5"/><path d="M9.6 5.5c-.5 3.2-2.7 5.7-6.1 6.8"/><path d="M5.2 8.4c.9 1.9 2.8 3.2 5 3.7"/><path d="M12.2 20l3.9-9 3.9 9"/><path d="M13.6 17h5"/></svg></span><span class="tb-label">Translate</span></button></div>
        <button class="tb tb-tool" id="btn-listen" onclick="toggleListen()" aria-label="Read this chapter aloud" title="Read this chapter aloud, from where you are. Click any sentence to jump there; arrow keys step; Esc stops."><span class="tb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4z"/><path d="M16 9.2a4 4 0 0 1 0 5.6"/><path d="M18.4 6.6a7.5 7.5 0 0 1 0 10.8"/></svg></span><span class="tb-label">Listen</span></button>
        <button class="tb tb-tool" id="btn-focus" onclick="toggleFocus()" aria-label="Focus mode" title="Focus mode — hide the sidebar"><span class="tb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4.5h4.5"/><path d="M20 9V4.5h-4.5"/><path d="M4 15v4.5h4.5"/><path d="M20 15v4.5h-4.5"/></svg></span><span class="tb-label">Focus</span></button>
        <span class="tb-sep" aria-hidden="true"></span>
        <button class="tb tb-tool tb-accent" id="btn-cards" onclick="openFlashcards()" aria-label="Flash cards" title="Revision flash cards for this unit"><span class="tb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.4C10.9 4.1 8.4 4.2 7.6 5.9 5.6 5.8 4 7.5 4.6 9.4 2.9 10.4 3 12.8 4.8 13.7 4.5 15.6 6.2 17.2 8.1 16.9 8.8 18.5 11 18.9 12 17.6"/><path d="M12 5.4c1.1-1.3 3.6-1.2 4.4.5 2-.1 3.6 1.6 3 3.5 1.7 1 1.6 3.4-.2 4.3.3 1.9-1.4 3.5-3.3 3.2-.7 1.6-2.9 2-3.9.7"/><path d="M12 5.4v12.2"/></svg></span><span class="tb-label">Cards</span></button>
        <button class="tb tb-tool tb-accent" id="btn-printout" onclick="openPrintout()" aria-label="Printout" title="Build a paper workbook for this unit"><span class="tb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9V3.5h11V9"/><path d="M6.5 17.5h-2A1.5 1.5 0 0 1 3 16v-5a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 11v5a1.5 1.5 0 0 1-1.5 1.5h-2"/><path d="M6.5 14h11v6.5h-11z"/></svg></span><span class="tb-label">Printout</span></button>
        <button class="tb tb-tool tb-accent" id="btn-present" onclick="openPresent()" aria-label="Present" title="Present this unit as slides"><span class="tb-icon" aria-hidden="true">&#9655;</span><span class="tb-label">Present</span></button>
        <div class="more-wrap"><button class="tb tb-tool tb-accent" id="btn-more" onclick="toggleMore()" aria-label="More tools" aria-haspopup="true" aria-expanded="false" title="More tools"><span class="tb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></span><span class="tb-label">More</span></button></div>
    </div>
</header>
<div class="progress-bar"><div class="progress-bar-fill" id="progress-fill"></div></div>
<nav class="sidebar" id="sidebar" role="navigation" aria-label="Course navigation">${sidebarHTML()}</nav>
<div class="overlay" id="overlay" onclick="toggleNav()"></div>
<div id="term-popover"></div>`;

        const readingPos = `
<div class="reading-pos">
    <span class="reading-pos-section" id="rp-section"></span>
    <span class="reading-pos-progress">
        <span id="rp-label"></span>
        <span class="reading-pos-bar"><span class="reading-pos-bar-fill" id="rp-bar-fill"></span></span>
        <span id="rp-pct">0%</span>
    </span>
</div>`;

        document.body.insertAdjacentHTML('afterbegin', toolbar);
        document.body.insertAdjacentHTML('beforeend', readingPos);
    }

    function sidebarHTML() {
        let html = `<div class="nav-section-label">${esc(COURSE.title)}</div>` +
                   navItem(`${ROOT}index.html`, '', 'Contents', '', !CHAP_ID);
        if (!CHAP_ID) html += '<div class="nav-onpage" id="nav-onpage"></div>';
        // The course's second way in: by body part rather than by unit. It sits
        // at the same level as Contents because it does the same job.
        html += navItem(`${ROOT}reference/body.html`, '', 'Body Index', '', CHAP_ID === 'body');
        if (CHAP_ID === 'body') html += '<div class="nav-onpage" id="nav-onpage"></div>';

        let unit = null;
        chapters.forEach(c => {
            if (c.unit !== unit) {
                unit = c.unit;
                const u = unitOf(unit);
                html += `<div class="nav-unit" data-unit="${esc(u.id)}" style="--unit-h:${u.hue}">` +
                        `<div class="nav-section-label nav-unit-label">${esc(u.label)}</div></div>`;
            }
            const isCurrent = c.id === CHAP_ID;
            const { num, label } = splitTitle(c.title);
            const hue = unitOf(c.unit).hue;
            if (c.status === 'planned') {
                html += navItem(null, num, label, 'Soon', false, hue);
            } else {
                html += navItem(`${ROOT}${c.file}`, num, label, c.kind || 'Lesson', isCurrent, hue);
            }
            if (isCurrent) html += '<div class="nav-onpage" id="nav-onpage"></div>';
        });

        // Pinned to the foot of the sidebar: these are lookup tools, and behind
        // 47 chapters they were 2,000px down a 2,090px column — present, and
        // invisible.
        html += '<div class="nav-reference">';
        html += '<div class="nav-section-label">Reference</div>' +
                navItem(`${ROOT}reference/glossary.html`, '', 'Glossary', '', CHAP_ID === 'glossary');
        if (CHAP_ID === 'glossary') html += '<div class="nav-onpage" id="nav-onpage"></div>';
        html += navItem(`${ROOT}reference/standards.html`, '', 'Curriculum Standards', '', CHAP_ID === 'standards');
        if (CHAP_ID === 'standards') html += '<div class="nav-onpage" id="nav-onpage"></div>';
        html += '</div>';
        return html;
    }

    // "6.1 Evidence of Common Ancestry" -> { num: '6.1', label: 'Evidence...' }
    function splitTitle(t) {
        const m = String(t).match(/^([\d.]+)\s+(.*)$/);
        return m ? { num: m[1], label: m[2] } : { num: '', label: t };
    }
    function badgeClass(kind) {
        return 'badge-' + String(kind).toLowerCase().replace(/[^a-z]+/g, '-');
    }
    // One-letter flags instead of full words: the sidebar has room for a
    // narrow gutter but not for "Worked example" on its own line. Every kind
    // in use has a distinct initial, so the map is mostly a formality — but
    // it is explicit so a new kind cannot silently collide with an old one.
    const FLAG_LETTER = {
        'Practice': 'P', 'Case study': 'C', 'Simulation': 'S',
        'Orientation': 'O', 'Worked example': 'W', 'Reference': 'R',
        'Investigation': 'I', 'Lesson': 'L', 'Overview': 'V'
    };
    function flag(kind) {
        const letter = FLAG_LETTER[kind] || String(kind).trim().charAt(0).toUpperCase();
        // The full word survives as the accessible name and the hover title,
        // so shortening it costs a sighted reader a hover and costs a screen
        // reader nothing.
        return `<span class="nav-flag ${badgeClass(kind)}" title="${esc(kind)}"` +
               ` role="img" aria-label="${esc(kind)}">${esc(letter)}</span>`;
    }
    // A badge only earns its place when it tells you something the row does
    // not already say. 'Lesson' is the default and would sit on almost every
    // row; 'Overview' on a row labelled "Unit 2 Overview" is just repetition.
    function showBadge(kind, label) {
        if (!kind || kind === 'Lesson') return false;
        return !String(label).toLowerCase().includes(String(kind).toLowerCase());
    }
    function navItem(href, num, label, kind, current, hue) {
        const cls = 'nav-link' + (current ? ' current-page' : '') + (href ? '' : ' disabled');
        const style = hue !== undefined ? ` style="--unit-h:${hue}"` : '';
        const inner =
            // No empty gutter for unnumbered rows — an overview aligns where
            // the numbers are, so the left edge stays honest about hierarchy.
            (num ? `<span class="nav-num">${esc(num)}</span>` : '') +
            // Chapter rows carry their number in the gutter and their kind on
            // the contents card, so a flag here would only repeat what the row
            // already says. 'Soon' is the exception — it is a status rather
            // than a category, and 'S' would be read as Simulation.
            `<span class="nav-text">${esc(label)}` +
            (kind === 'Soon' ? '<span class="nav-badge badge-soon">Soon</span>' : '') +
            `</span>`;
        return href
            ? `<a href="${href}" class="${cls}"${style}>${inner}</a>`
            : `<span class="${cls}"${style} title="Not written yet">${inner}</span>`;
    }

    // ===== THEME =====
    function initTheme() {
        const saved = P.get('theme', null);
        if (saved) setThemeDOM(saved);
        else if (matchMedia('(prefers-color-scheme:dark)').matches) setThemeDOM('dark');
        else setThemeDOM('light');
    }
    function setThemeDOM(t) {
        document.documentElement.setAttribute('data-theme', t);
        document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
        const sw = document.getElementById('sw-' + t);
        if (sw) sw.classList.add('active');
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
    }
    window.setTheme = function (t) { setThemeDOM(t); P.set('theme', t); };

    // ===== FONT SIZE =====
    let scale = parseFloat(P.get('fontScale', '1'));
    function applyScale() {
        document.documentElement.style.setProperty('--font-scale', scale);
        P.set('fontScale', scale);
        const lbl = document.getElementById('size-label');
        if (lbl) lbl.textContent = Math.round(scale * 100) + '%';
    }
    window.adjustFontSize = function (dir) {
        scale = dir === 0 ? 1 : Math.max(0.75, Math.min(1.5, +(scale + dir * 0.1).toFixed(2)));
        applyScale();
    };

    // ===== FONT FAMILY =====
    const fonts = {
        sans: "'Segoe UI',system-ui,-apple-system,sans-serif",
        serif: "Georgia,'Times New Roman',serif",
        dyslexic: "'OpenDyslexic','Comic Sans MS',sans-serif"
    };
    function initFont() { setFontDOM(P.get('font', 'sans')); }
    function setFontDOM(t) {
        document.documentElement.style.setProperty('--body-font', fonts[t] || fonts.sans);
        document.documentElement.style.setProperty('--heading-font', fonts[t] || fonts.sans);
        document.querySelectorAll('[id^="btn-font-"]').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById('btn-font-' + t);
        if (btn) btn.classList.add('active');
    }
    window.setFont = function (t) { setFontDOM(t); P.set('font', t); };

    // ===== AA POPOVER =====
    // ===== PROGRESS PANEL =====
    // The toolbar bar is a map of the whole course, so it doubles as the way to
    // travel it: click it and the same units open as a list you can jump to.
    function renderProgressPanel() {
        const p = document.getElementById('tp-panel');
        if (!p) return;
        const here = chapter ? chapter.unit : null;
        const rows = units.map(u => {
            const { done, total } = unitCount(u);
            const pct = total ? Math.round(done / total * 100) : 0;
            const open = chaptersInUnit(u).filter(c => c.status !== 'planned');
            const body =
                '<span class="tp-row-dot"></span>' +
                '<span class="tp-row-label">' + esc(u.label) + '</span>' +
                '<span class="tp-row-bar"><span style="width:' + pct + '%"></span></span>' +
                '<span class="tp-row-count">' + (total ? done + '/' + total : 'soon') + '</span>';
            const cls = 'tp-row' + (u.id === here ? ' current' : '') +
                        (total && done >= total ? ' done' : '');
            const style = 'style="--unit-h:' + u.hue + '"';
            // A unit with nothing published yet is shown, but is not a link —
            // the map should not have holes in it.
            if (!open.length) {
                return '<span class="' + cls + ' off" ' + style + ' aria-disabled="true">' + body + '</span>';
            }
            return '<a class="' + cls + '" ' + style + ' href="' + ROOT + esc(open[0].file) + '"' +
                   (u.id === here ? ' aria-current="true"' : '') + '>' + body + '</a>';
        }).join('');
        p.innerHTML = '<div class="tp-panel-head">Jump to a unit</div>' + rows +
            '<a class="tp-row tp-row-all" href="' + ROOT + 'index.html">' +
            '<span class="tp-row-dot"></span><span class="tp-row-label">All contents</span></a>';
    }

    window.toggleProgress = function (force) {
        const p = document.getElementById('tp-panel');
        const b = document.getElementById('toolbar-progress');
        if (!p || !b) return;
        const open = typeof force === 'boolean' ? force : p.hidden;
        // one panel at a time
        if (open) { closePopovers('.tp-wrap'); renderProgressPanel(); }
        p.hidden = !open;
        b.setAttribute('aria-expanded', String(open));
        if (open) { const first = p.querySelector('a'); if (first) first.focus(); }
    };

    document.addEventListener('click', function (e) {
        const wrap = document.querySelector('.tp-wrap');
        if (wrap && !wrap.contains(e.target)) toggleProgress(false);
    });
    document.addEventListener('keydown', function (e) {
        const p = document.getElementById('tp-panel');
        if (!p || p.hidden) return;
        if (e.key === 'Escape') {
            e.preventDefault(); toggleProgress(false);
            const b = document.getElementById('toolbar-progress'); if (b) b.focus();
            return;
        }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = [...p.querySelectorAll('a')];
        if (!items.length) return;
        e.preventDefault();
        const at = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? at + 1 : at - 1;
        items[(next + items.length) % items.length].focus();
    });

    window.toggleAa = function () {
        const aa = document.getElementById('aa-popover');
        if (!aa.classList.contains('open')) closePopovers('.aa-wrap');
        aa.classList.toggle('open');
    };
    document.addEventListener('click', function (e) {
        const wrap = document.querySelector('.aa-wrap');
        if (wrap && !wrap.contains(e.target)) document.getElementById('aa-popover').classList.remove('open');
    });

    // ===== FOCUS MODE =====
    function initFocus() {
        if (P.get('focus', 'false') === 'true') document.body.classList.add('focus-mode');
        updateFocusBtn();
    }
    // ===== UNIT TOOLS: FLASH CARDS AND PRESENT =====
    // Both read the whole unit through assets/unit-content.js, and each lives in
    // its own file that loads on first use, so a page that never opens them pays
    // nothing. The unit is the one being read; pages outside a unit pass null and
    // the tool asks which unit.
    function openUnitTool(file, globalName, btn) {
        const unitId = chapter ? chapter.unit : null;
        if (btn) btn.classList.add('loading');
        loadScript(ROOT + 'assets/unit-content.js?v=' + ASSET_V)
            .then(() => loadScript(ROOT + 'assets/' + file + '.js?v=' + ASSET_V))
            .then(() => {
                const tool = window[globalName];
                if (!tool || typeof tool.open !== 'function') throw new Error('assets/' + file + '.js did not register window.' + globalName);
                tool.open({ unitId, root: ROOT, assetV: ASSET_V });
            })
            .catch(err => {
                console.error('[' + file + ']', err);
                alert('Sorry, this tool could not open. ' + (location.protocol === 'file:' ? 'It needs the course to be served from a web address rather than opened as a file.' : err.message));
            })
            .then(() => { if (btn) btn.classList.remove('loading'); });
    }
    window.openFlashcards = function () { openUnitTool('flashcards', 'Flashcards', document.getElementById('btn-cards')); };
    window.openPresent = function () { openUnitTool('present', 'Present', document.getElementById('btn-present')); };
    // The printout is a page of its own rather than a panel, because printing wants a
    // document with nothing else on it. A new tab keeps the reader where it was.
    window.openPrintout = function () {
        const unitId = chapter ? chapter.unit : '';
        const url = ROOT + 'printout.html?v=' + ASSET_V + (unitId ? '&unit=' + encodeURIComponent(unitId) : '');
        window.open(new URL(url, location.href).href, '_blank', 'noopener');
    };

    window.toggleFocus = function () {
        document.body.classList.toggle('focus-mode');
        P.set('focus', document.body.classList.contains('focus-mode'));
        updateFocusBtn();
    };
    function updateFocusBtn() {
        const btn = document.getElementById('btn-focus');
        if (btn) btn.classList.toggle('active', document.body.classList.contains('focus-mode'));
    }

    // ===== MOBILE NAV =====
    window.toggleNav = function () {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('overlay').classList.toggle('active');
    };

    // ===== ON THIS PAGE + SCROLL SPY =====
    let spyLinks = [];
    function buildOnThisPage() {
        const holder = document.getElementById('nav-onpage');
        if (!holder || !main) return;
        const heads = [];
        // Link to the section's own id rather than copying it onto the <h2>,
        // which would leave two elements sharing one id.
        main.querySelectorAll(':scope > section[id]').forEach(sec => {
            const h = sec.querySelector(':scope > h2, :scope > .section-head > h2');
            if (h) heads.push({ el: h, id: sec.id, sec });
        });
        holder.innerHTML = heads.map(h => {
            const kind = (h.sec.dataset.kind || '').trim();
            // Core is the default and would appear on almost every row, so it
            // gets no badge — only the things worth spotting do.
            let flags = (kind && kind !== 'Core') ? flag(kind) : '';
            // Detected rather than declared: any section holding a [data-sim]
            // is flagged, so this can never fall out of step with the sims.
            if (h.sec.querySelector('[data-sim]')) flags += flag('Simulation');
            return `<a href="#${h.id}"><span class="nav-flags">${flags}</span>` +
                   `<span class="nav-text">${esc(headingText(h.el))}</span></a>`;
        }).join('');
        spyLinks = heads.map(h => ({ el: h.el, link: holder.querySelector(`a[href="#${CSS.escape(h.id)}"]`) }));

        holder.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNavOnMobile));
        document.querySelectorAll('.sidebar a.nav-link').forEach(a => a.addEventListener('click', closeNavOnMobile));
    }
    function closeNavOnMobile() {
        if (innerWidth <= 900) {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('overlay').classList.remove('active');
        }
    }

    // ===== PROGRESS + READING POSITION =====
    let sections = [], sectionNames = [];
    function initProgress() {
        sections = main ? [...main.querySelectorAll(':scope > section')] : [];
        sectionNames = sections.map(s => headingText(s.querySelector('h1,h2')));
        const label = document.getElementById('rp-label');
        if (label) {
            label.textContent = chapter
                ? `Chapter ${chapIdx + 1} of ${chapters.length}`
                : (CHAP_ID === 'glossary' ? 'Reference' : 'Contents');
        }
    }
    function updateProgress() {
        const docH = document.documentElement.scrollHeight - innerHeight;
        const pct = docH > 0 ? Math.min(100, (scrollY / docH) * 100) : 0;
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = pct.toFixed(1) + '%';

        let current = 0;
        sections.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
        const rpSec = document.getElementById('rp-section');
        if (rpSec) rpSec.textContent = sectionNames[current] || '';
        const bar = document.getElementById('rp-bar-fill');
        if (bar) bar.style.width = Math.round(pct) + '%';
        const rpPct = document.getElementById('rp-pct');
        if (rpPct) rpPct.textContent = Math.round(pct) + '%';

        // scroll spy on the "on this page" list
        let activeSpy = null;
        spyLinks.forEach(s => {
            if (s.el.getBoundingClientRect().top < innerHeight * 0.35) activeSpy = s;
        });
        spyLinks.forEach(s => s.link && s.link.classList.toggle('active', s === activeSpy));
    }

    // ===== CHAPTER PREV / NEXT =====
    // Chapter titles run to 47 characters, which made the two cards unequal and
    // truncated the longer one. The destination is shown as its number instead.
    // "1.6 Homeostasis and Feedback" -> "Unit 1.6"; unit overviews keep their title.
    function navLabel(c) {
        const m = /^(\d+\.\d+)\s/.exec(c.title);
        if (m) return 'Unit ' + m[1];
        // "Unit 3 Overview" is too wide for the card and was truncating on the six
        // chapters that follow an overview. The unit on its own is the shorter form
        // of the same thing, and sits naturally above "Unit 3.1".
        const u = /^Unit (\d+) Overview$/.exec(c.title);
        return u ? 'Unit ' + u[1] : c.title;
    }

    function renderChapterNav() {
        if (!chapter || !main) return;
        const ready = chapters.filter(c => c.status !== 'planned');
        const i = ready.findIndex(c => c.id === CHAP_ID);
        const prev = i > 0 ? ready[i - 1] : null;
        const next = i >= 0 && i < ready.length - 1 ? ready[i + 1] : null;
        const nav = document.createElement('nav');
        nav.className = 'chapter-nav';
        nav.setAttribute('aria-label', 'Chapter navigation');
        nav.innerHTML =
            (prev ? `<a class="prev" href="${ROOT}${prev.file}"><small>&larr; Previous</small><span>${esc(navLabel(prev))}</span></a>`
                  : `<a class="prev" href="${ROOT}index.html"><small>&larr; Back</small><span>Contents</span></a>`) +
            (next ? `<a class="next" href="${ROOT}${next.file}"><small>Next &rarr;</small><span>${esc(navLabel(next))}</span></a>` : '');
        main.appendChild(nav);
    }

    // ===== SIMULATION LOADER =====
    // <div class="sim" data-sim="osmosis"> ... optional fallback ... </div>
    const simsLoading = {};
    function loadSims() {
        document.querySelectorAll('[data-sim]').forEach(el => {
            const name = el.dataset.sim;
            const mount = () => {
                const fn = (window.SIMS || {})[name];
                if (typeof fn === 'function') {
                    try { fn(el); addSimShare(el, name); } catch (err) { simError(el, name, err); }
                } else simError(el, name, new Error('sims/' + name + '.js did not register window.SIMS.' + name));
            };
            if ((window.SIMS || {})[name]) { mount(); return; }
            if (simsLoading[name]) { simsLoading[name].then(mount); return; }
            // Shared controls load once, before any simulation.
            // Version query keeps browsers from serving a stale sim after an
            // edit. Bump ASSET_V in one place when shipping a change.
            simsLoading[name] = loadScript(ROOT + 'sims/_ui.js?v=' + ASSET_V)
                .then(() => loadScript(ROOT + 'sims/' + name + '.js?v=' + ASSET_V))
                .catch(err => simError(el, name, err))
                .then(mount);
        });
    }
    // ===== SHARING ONE INTERACTIVE =====
    // embed.html renders a single sim and nothing else, so one of these can be
    // dropped into SharePoint or Google Sites the way a YouTube video is while the
    // reader stays here. The height is MEASURED from the live sim rather than
    // guessed: a cross-origin frame cannot resize itself, because that needs script
    // on the host page and SharePoint will not run ours.
    function embedBase() {
        const saved = P.get('embed_base', '');
        if (saved) return saved;
        if (/^https?:$/.test(location.protocol)) {
            return new URL(ROOT || './', location.href).href.replace(/\/+$/, '/');
        }
        return '';
    }

    // Interactives had no full-screen at all: the lightbox only ever looked at
    // <figure> elements. A sim cannot be cloned into one either — it is live, with
    // its own canvas and state — so the real element goes full screen instead.
    // Nothing in sims/ listens for resize, but their stages are sized in CSS
    // (canvas.style.width = '100%'), so the content follows the new width by itself.
    function addSimFullscreen(el, head) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sim-full-btn';
        btn.textContent = 'Full screen';
        btn.title = 'Show this interactive full screen (Esc to leave)';
        (head || el).appendChild(btn);

        // The Fullscreen API is refused more often than you would expect — a
        // permissions policy, an embedded webview, an iframe without allowfullscreen.
        // Rather than have the button do nothing in those places it falls back to
        // filling the window instead, which looks the same and cannot be blocked.
        let faux = false;
        const paint = on => {
            el.classList.toggle('sim-is-full', on);
            document.body.classList.toggle('sim-full-open', on);
            btn.textContent = on ? 'Leave full screen' : 'Full screen';
        };
        const enterFaux = () => { faux = true; paint(true); };
        const exitFaux = () => { faux = false; paint(false); };

        btn.addEventListener('click', () => {
            if (faux) { exitFaux(); return; }
            if (document.fullscreenElement === el) {
                if (document.exitFullscreen) document.exitFullscreen();
                return;
            }
            const go = el.requestFullscreen || el.webkitRequestFullscreen;
            if (!go) { enterFaux(); return; }
            let p;
            try { p = go.call(el); } catch (err) { enterFaux(); return; }
            if (p && p.catch) p.catch(() => enterFaux());
        });

        document.addEventListener('fullscreenchange', () => {
            if (faux) return;
            paint(document.fullscreenElement === el);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && faux) { e.stopPropagation(); exitFaux(); }
        }, true);
    }

    function addSimShare(el, name) {
        if (el.querySelector(':scope > .sim-share-wrap')) return;
        const head = el.querySelector(':scope > .sim-header');
        addSimFullscreen(el, head);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sim-share-btn';
        btn.textContent = 'Share';
        btn.setAttribute('aria-expanded', 'false');
        btn.title = 'Link to this interactive, or embed it in another site';
        (head || el).appendChild(btn);

        const wrap = document.createElement('div');
        wrap.className = 'sim-share-wrap';
        wrap.hidden = true;
        el.appendChild(wrap);

        // A sim reflows, so its height depends on the width it is drawn at. Measuring
        // it here in the reader's column therefore gives the wrong number for a
        // narrower host — osmosis came out 110px short. So the real embed is loaded
        // offscreen at the width the page will use and asked how tall it became.
        // The probe is deliberately relative: we are measuring geometry, not checking
        // that the entered site address is live yet.
        let probed = 0;
        const readerGuess = () => {
            const h = el.getBoundingClientRect().height;
            const hh = head ? head.getBoundingClientRect().height : 0;
            const sw = wrap.hidden ? 0 : wrap.getBoundingClientRect().height;
            return Math.max(320, Math.round((h - hh - sw + 16) / 10) * 10);
        };
        const measure = () => Math.max(320, Math.round(((probed || readerGuess()) + 12) / 10) * 10);

        function probe(width) {
            const said = wrap.querySelector('.sim-share-said');
            if (said) said.textContent = 'Measuring…';
            return new Promise(resolve => {
                const f = document.createElement('iframe');
                f.setAttribute('aria-hidden', 'true');
                f.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;width:' +
                    width + 'px;height:300px;visibility:hidden';
                let best = 0, done = false;
                const onMsg = ev => {
                    const d = ev.data;
                    if (!d || d.type !== 'bio-embed-size' || d.sim !== name) return;
                    if (d.height > best) best = d.height;
                };
                window.addEventListener('message', onMsg);
                const finish = () => {
                    if (done) return;
                    done = true;
                    window.removeEventListener('message', onMsg);
                    f.remove();
                    if (best) probed = best;
                    if (said) said.textContent = '';
                    resolve(best);
                };
                f.src = ROOT + 'embed.html?sim=' + encodeURIComponent(name) + '&v=' + ASSET_V;
                document.body.appendChild(f);
                setTimeout(finish, 4000);
            });
        }

        function draw() {
            const base = embedBase();
            const v = ASSET_V;
            const url = base + 'embed.html?sim=' + encodeURIComponent(name) + '&v=' + v;
            const code = '<iframe src="' + url + '" title="' + esc(name) + ' interactive" ' +
                'width="100%" height="' + measure() + '" loading="lazy" allowfullscreen ' +
                'style="border:1px solid #d9d9d9;border-radius:10px"></iframe>';
            wrap.innerHTML =
                '<div class="sim-share">' +
                '<label class="sim-share-row"><span>Site address</span>' +
                '<input type="text" class="sim-share-base" value="' + esc(base) + '" ' +
                'placeholder="https://you.github.io/biology/" spellcheck="false"></label>' +
                '<p class="sim-share-note">Where this site is published. Saved for next time.</p>' +
                '<label class="sim-share-row"><span>Width of the column it will sit in</span>' +
                '<input type="number" class="sim-share-w" min="280" max="2000" step="10" value="' +
                esc(P.get('embed_width', '700')) + '"></label>' +
                '<p class="sim-share-note">The height below is measured by rendering the interactive ' +
                'at this width, because these reflow. A SharePoint content column is around 700px.</p>' +
                '<label class="sim-share-row"><span>Link</span>' +
                '<input type="text" class="sim-share-link" readonly value="' + esc(url) + '"></label>' +
                '<label class="sim-share-row"><span>Embed code</span>' +
                '<textarea class="sim-share-code" rows="3" readonly>' + esc(code) + '</textarea></label>' +
                '<div class="sim-share-actions">' +
                '<button type="button" class="sim-share-copy" data-what="link">Copy link</button>' +
                '<button type="button" class="sim-share-copy" data-what="code">Copy embed code</button>' +
                '<span class="sim-share-said" role="status"></span></div>' +
                '<p class="sim-share-note">Height is measured from this interactive. A framed page cannot ' +
                'resize itself, so the number is fixed here rather than worked out by the host. ' +
                'Add <code>&amp;theme=dark</code> to match a dark page. ' +
                '<b>SharePoint only embeds sites on its allowed list</b>, so your admin may need to add ' +
                'this address once.</p>' +
                '</div>';
        }

        btn.addEventListener('click', () => {
            const open = wrap.hidden;
            if (open) { draw(); probe(+P.get('embed_width', '700')).then(h => { if (h) draw(); }); }
            wrap.hidden = !open;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.classList.toggle('is-open', open);
            if (open) { const f = wrap.querySelector('.sim-share-base'); if (f) f.focus(); }
        });

        let wTimer = 0;
        wrap.addEventListener('input', e => {
            const w = e.target.closest('.sim-share-w');
            if (w) {
                const px = Math.max(280, Math.min(2000, +w.value || 700));
                P.set('embed_width', String(px));
                clearTimeout(wTimer);
                wTimer = setTimeout(() => probe(px).then(() => {
                    const keep = w.value;
                    draw();
                    const again = wrap.querySelector('.sim-share-w');
                    if (again) { again.value = keep; again.focus(); }
                }), 500);
                return;
            }
            const f = e.target.closest('.sim-share-base');
            if (!f) return;
            let v = f.value.trim();
            if (v && !/\/$/.test(v)) v += '/';
            P.set('embed_base', v);
            const keep = f.selectionStart;
            draw();
            const again = wrap.querySelector('.sim-share-base');
            if (again) { again.focus(); try { again.setSelectionRange(keep, keep); } catch (e) { } }
        });

        wrap.addEventListener('click', e => {
            const c = e.target.closest('.sim-share-copy');
            if (!c) return;
            const field = wrap.querySelector(c.dataset.what === 'link' ? '.sim-share-link' : '.sim-share-code');
            if (!field) return;
            field.select();
            const said = wrap.querySelector('.sim-share-said');
            const ok = () => { if (said) { said.textContent = 'Copied'; setTimeout(() => { said.textContent = ''; }, 1600); } };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(field.value).then(ok, () => { document.execCommand('copy'); ok(); });
            } else { try { document.execCommand('copy'); ok(); } catch (err) { } }
        });
    }

    const scriptCache = {};
    function loadScript(src) {
        if (scriptCache[src]) return scriptCache[src];
        scriptCache[src] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error('could not load ' + src));
            document.head.appendChild(s);
        });
        return scriptCache[src];
    }
    function simError(el, name, err) {
        console.error('[sim:' + name + ']', err);
        const stage = el.querySelector('.sim-stage') || el;
        stage.innerHTML = '<p class="sim-fallback">This simulation could not load. ' +
            'The surrounding text explains the same idea.</p>';
    }

    // ===== SEARCH =====
    // Indexes this page in full, plus every chapter's title / summary /
    // keywords from toc.js so results can point at other chapters.
    let searchIndex = null;
    function buildSearchIndex() {
        const idx = [];
        if (main) {
            main.querySelectorAll(':scope > section').forEach(s => {
                const h = s.querySelector('h1,h2');
                if (!h) return;
                const texts = [];
                s.querySelectorAll('p, li, figcaption, .callout').forEach(p => texts.push(p.textContent.trim()));
                idx.push({ title: headingText(h), text: texts.join(' '), hash: s.id, here: true, type: 'section' });
            });
            main.querySelectorAll('.check-q').forEach(d => {
                const sum = d.querySelector('summary'), ans = d.querySelector('.check-a');
                if (sum) idx.push({
                    title: headingText(sum), text: ans ? ans.textContent.trim() : '',
                    hash: d.id || null, el: d, here: true, type: 'question'
                });
            });
        }
        chapters.forEach(c => {
            if (c.id === CHAP_ID || c.status === 'planned') return;
            idx.push({
                title: c.title, text: (c.summary || '') + ' ' + (c.keywords || ''),
                url: ROOT + c.file, where: c.unit, type: 'chapter'
            });
        });
        Object.entries(COURSE.glossary || {}).forEach(([term, def]) => {
            idx.push({
                title: term, text: def, type: 'glossary',
                url: CHAP_ID === 'glossary' ? null : ROOT + 'reference/glossary.html',
                hash: CHAP_ID === 'glossary' ? slug(term) : null,
                here: CHAP_ID === 'glossary'
            });
        });
        return idx;
    }
    function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

    // ===== TOOLBAR DROPDOWNS =====
    // Jump to a unit, Text, Translate and Search each grew their own rules for
    // closing. They share one set now: only one open at a time, and every one
    // closes on a click elsewhere or on Esc, handing focus back to its button.
    // Each close() checks state first, so it is safe alongside the older
    // handlers that still do the same for their own panel.
    const POPS = [
        { wrap: '.tp-wrap', trigger: 'toolbar-progress',
          isOpen: () => { const p = document.getElementById('tp-panel'); return !!p && !p.hidden; },
          close: () => window.toggleProgress && window.toggleProgress(false) },
        { wrap: '.aa-wrap', trigger: 'btn-aa',
          isOpen: () => { const p = document.getElementById('aa-popover'); return !!p && p.classList.contains('open'); },
          close: () => document.getElementById('aa-popover').classList.remove('open') },
        { wrap: '.tr-wrap', trigger: 'btn-translate',
          isOpen: () => !!document.getElementById('tr-panel'),
          close: () => { const p = document.getElementById('tr-panel'); if (p) p.remove(); } },
        { wrap: '.more-wrap', trigger: 'btn-more',
          isOpen: () => !!document.getElementById('more-panel'),
          close: () => {
              const p = document.getElementById('more-panel'); if (p) p.remove();
              const b = document.getElementById('btn-more'); if (b) b.setAttribute('aria-expanded', 'false');
          } },
        { wrap: '.search-wrap', trigger: 'btn-search',
          isOpen: () => { const i = document.getElementById('search-input'); return !!i && i.classList.contains('open'); },
          close: () => window.toggleSearch && window.toggleSearch() }
    ];
    function closePopovers(keep) {
        POPS.forEach(p => { if (p.wrap !== keep && p.isOpen()) p.close(); });
    }
    document.addEventListener('click', e => {
        POPS.forEach(p => { if (p.isOpen() && !e.target.closest(p.wrap)) p.close(); });
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        POPS.forEach(p => {
            if (!p.isOpen()) return;
            p.close();
            const t = document.getElementById(p.trigger);
            if (t) t.focus();
        });
    });

    // On a phone the bar cannot hold every tool, so the three teaching tools fold
    // in here. Names and descriptions are read off the real buttons, so they
    // stay in step with whatever those buttons say.
    window.toggleMore = function () {
        const btn = document.getElementById('btn-more');
        if (document.getElementById('more-panel')) { closePopovers(); return; }
        closePopovers('.more-wrap');
        const p = document.createElement('div');
        p.className = 'more-panel'; p.id = 'more-panel'; p.setAttribute('role', 'menu');
        p.innerHTML = '<div class="more-label">More tools</div>' +
            ['btn-cards', 'btn-printout', 'btn-present'].map(id => {
                const src = document.getElementById(id);
                if (!src) return '';
                const name = ((src.querySelector('.tb-label') || {}).textContent || '').trim();
                const icon = (src.querySelector('.tb-icon') || {}).innerHTML || '';
                return '<button type="button" class="more-item" role="menuitem" data-for="' + id + '">' +
                    '<span class="more-icon" aria-hidden="true">' + icon + '</span>' +
                    '<span class="more-text"><b>' + esc(name) + '</b><span>' + esc(src.title || '') + '</span></span></button>';
            }).join('');
        p.addEventListener('click', e => {
            const it = e.target.closest('.more-item');
            if (!it) return;
            closePopovers();
            const real = document.getElementById(it.dataset.for);
            if (real) real.click();
        });
        document.querySelector('.more-wrap').appendChild(p);
        btn.setAttribute('aria-expanded', 'true');
        const first = p.querySelector('.more-item');
        if (first) first.focus();
    };

    window.toggleSearch = function () {
        const inp = document.getElementById('search-input');
        const res = document.getElementById('search-results');
        if (inp.classList.contains('open')) {
            inp.classList.remove('open'); res.classList.remove('open'); inp.value = '';
        } else {
            closePopovers('.search-wrap');
            inp.classList.add('open');
            setTimeout(() => inp.focus(), 260);
            if (!searchIndex) searchIndex = buildSearchIndex();
        }
    };

    function wireSearch() {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');

        searchInput.addEventListener('input', function () {
            const q = this.value.trim().toLowerCase();
            if (q.length < 2) { searchResults.classList.remove('open'); return; }
            if (!searchIndex) searchIndex = buildSearchIndex();

            const matches = [];
            searchIndex.forEach(item => {
                const t = item.title.toLowerCase(), x = (item.text || '').toLowerCase();
                let score = 0;
                if (t.includes(q)) score += 10;
                if (x.includes(q)) score += 1;
                if (item.here) score += 2;          // prefer results on this page
                if (score > 0) matches.push({ ...item, score });
            });
            matches.sort((a, b) => b.score - a.score);

            if (!matches.length) {
                searchResults.innerHTML = '<div class="search-no-results">No results for "' + esc(q) + '"</div>';
                searchResults.classList.add('open');
                return;
            }

            const shown = matches.slice(0, 8);
            let html = '<div class="search-results-header">' + matches.length +
                       ' result' + (matches.length !== 1 ? 's' : '') + '</div>';
            shown.forEach((m, i) => {
                const text = m.text || '';
                const at = text.toLowerCase().indexOf(q);
                let snippet;
                if (at >= 0) {
                    const a = Math.max(0, at - 40), b = Math.min(text.length, at + q.length + 60);
                    snippet = (a > 0 ? '…' : '') + esc(text.slice(a, at)) +
                              '<mark>' + esc(text.slice(at, at + q.length)) + '</mark>' +
                              esc(text.slice(at + q.length, b)) + (b < text.length ? '…' : '');
                } else {
                    snippet = esc(text.slice(0, 100)) + (text.length > 100 ? '…' : '');
                }
                const icon = m.type === 'glossary' ? '&#128218; ' : m.type === 'question' ? '&#10067; '
                           : m.type === 'chapter' ? '&#128214; ' : '&#128196; ';
                const where = m.here ? 'On this page' : (m.where || 'Elsewhere in the course');
                html += '<a class="search-result" data-idx="' + i + '">' +
                        '<div class="search-result-title">' + icon + esc(m.title) + '</div>' +
                        '<div class="search-result-snippet">' + snippet + '</div>' +
                        '<div class="search-result-where">' + esc(where) + '</div></a>';
            });
            searchResults.innerHTML = html;
            searchResults.classList.add('open');

            searchResults.querySelectorAll('.search-result').forEach((el, i) => {
                el.addEventListener('click', () => {
                    const m = shown[i];
                    if (m.url) { location.href = m.url + (m.hash ? '#' + m.hash : ''); return; }
                    const target = m.el || (m.hash ? document.getElementById(m.hash) : null);
                    // a page can take over the jump (the glossary moves its word map instead)
                    const reveal = new CustomEvent('course:reveal', { bubbles: true, cancelable: true });
                    if (target && target.dispatchEvent(reveal)) {
                        if (target.tagName === 'DETAILS') target.open = true;
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    searchResults.classList.remove('open');
                    searchInput.classList.remove('open');
                    searchInput.value = '';
                });
            });
        });

        document.addEventListener('click', function (e) {
            const wrap = document.querySelector('.search-wrap');
            if (wrap && !wrap.contains(e.target)) searchResults.classList.remove('open');
        });
        document.addEventListener('keydown', function (e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); toggleSearch(); }
            if (e.key === 'Escape' && searchInput.classList.contains('open')) {
                searchInput.classList.remove('open');
                searchResults.classList.remove('open');
                searchInput.value = '';
            }
        });
    }

    // ===== PROGRESS =====
    // One store for the whole course, keyed by chapter then section:
    //   { 'ch01-cell-membrane': { osmosis: true }, ... }
    // A section opts in to tracking with data-track on the <section>.
    const PROGRESS_KEY = 'bio_progress';
    function loadProgress() {
        try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; }
    }
    function saveProgress(d) {
        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(d)); } catch { }
    }
    function chapterDone(chapId) { return loadProgress()[chapId] || {}; }
    // Anything with data-track and an id counts: a <section> (a lesson) or a
    // .check-q / any other block inside one (an activity).
    function trackedIds() {
        return main ? [...main.querySelectorAll('[data-track][id]')].map(s => s.id) : [];
    }
    // Section counts for chapters other than this one come from toc.js, so the
    // contents page can show progress without loading every chapter.
    function chapterTotal(c) {
        if (c.id === CHAP_ID) return trackedIds().length || (c.sections || 0);
        return c.sections || 0;
    }
    function chapterCount(c) {
        const done = chapterDone(c.id);
        const total = chapterTotal(c);
        const n = Object.keys(done).filter(k => done[k]).length;
        return { done: Math.min(n, total || n), total };
    }

    window.toggleComplete = function (btn) {
        const id = btn.dataset.id;
        const store = loadProgress();
        store[CHAP_ID] = store[CHAP_ID] || {};
        if (store[CHAP_ID][id]) delete store[CHAP_ID][id]; else store[CHAP_ID][id] = true;
        saveProgress(store);
        applyProgress();
    };
    window.resetProgress = function () {
        if (!confirm('Clear your progress for the whole course? This cannot be undone.')) return;
        try { localStorage.removeItem(PROGRESS_KEY); } catch { }
        applyProgress();
        document.dispatchEvent(new CustomEvent('progresschange'));
    };

    function applyProgress() {
        const done = chapterDone(CHAP_ID);

        // section buttons + heading state
        trackedIds().forEach(id => {
            const isDone = !!done[id];
            const sec = document.getElementById(id);
            if (sec) sec.classList.toggle('section-done', isDone);
            const btn = document.querySelector('.complete-btn[data-id="' + CSS.escape(id) + '"]');
            if (btn) {
                btn.classList.toggle('completed', isDone);
                // Label stays fixed so the pill keeps its width and the
                // heading row doesn't jump; the icon carries the state.
                btn.innerHTML = '<span class="btn-icon">' + (isDone ? '&#10003;' : '&#9675;') +
                                '</span><span class="btn-label">Complete</span>';
                btn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
                btn.setAttribute('aria-label', isDone ? 'Mark incomplete' : 'Mark complete');
            }
            // sidebar "on this page" tick
            const link = document.querySelector('.nav-onpage a[href="#' + CSS.escape(id) + '"]');
            if (link) {
                link.classList.toggle('done', isDone);
                let tick = link.querySelector('.nav-done');
                const host = link.querySelector('.nav-text') || link;
                if (isDone && !tick) { tick = document.createElement('span'); tick.className = 'nav-done'; tick.textContent = '✓'; host.appendChild(tick); }
                if (!isDone && tick) tick.remove();
            }
        });

        // prerequisite pills turn green once their section is complete
        document.querySelectorAll('.pill-prereq').forEach(pill => {
            const needed = (pill.dataset.prereq || '').split(',').map(x => x.trim()).filter(Boolean);
            pill.classList.toggle('met', needed.length > 0 && needed.every(id => done[id]));
        });

        // sidebar chapter ticks + per-chapter counts
        chapters.forEach(c => {
            const link = document.querySelector('.sidebar a.nav-link[href="' + ROOT + c.file + '"]');
            if (!link) return;
            const { done: d, total } = chapterCount(c);
            const finished = total > 0 && d >= total;
            link.classList.toggle('done', finished);
            let tick = link.querySelector('.nav-done');
            const host = link.querySelector('.nav-text') || link;
            if (finished && !tick) { tick = document.createElement('span'); tick.className = 'nav-done'; tick.textContent = '✓'; host.appendChild(tick); }
            if (!finished && tick) tick.remove();
        });

        updateChapterLabel();
        updateCourseProgress();
        document.dispatchEvent(new CustomEvent('progresschange'));
    }

    function updateCourseProgress() {
        // Toolbar: one segment per unit, sized by that unit's share of the
        // course, filled by that unit's completion, coloured by its hue.
        const bar = document.getElementById('tp-bar');
        const counts = units.map(u => ({ unit: u, ...unitCount(u) }));
        const totals = counts.reduce((a, c) => ({ done: a.done + c.done, total: a.total + c.total }),
            { done: 0, total: 0 });
        const pct = totals.total ? Math.round(totals.done / totals.total * 100) : 0;

        if (bar) {
            // One segment per unit, always — six units, six segments — so the
            // bar reads as a map of the course rather than only of the parts
            // that happen to have content. Equal widths keep every unit
            // legible; each fills with its own colour as it is completed.
            const here = chapter ? chapter.unit : null;
            bar.innerHTML = counts.map(c => {
                const pct = c.total ? Math.round(c.done / c.total * 100) : 0;
                const isHere = c.unit.id === here;
                const done = c.total > 0 && c.done >= c.total;
                let marker = '';
                if (isHere && chapter && c.total) {
                    const inUnit = chaptersInUnit(c.unit);
                    let before = 0;
                    for (const ch of inUnit) {
                        if (ch.id === chapter.id) break;
                        before += chapterTotal(ch);
                    }
                    const at = Math.min(100, (before / c.total) * 100);
                    marker = `<span class="tp-here" style="left:${at.toFixed(1)}%"></span>`;
                }
                const cls = 'tp-seg' + (isHere ? ' current' : '') +
                            (done ? ' done' : '') + (c.total ? '' : ' empty');
                const title = c.total
                    ? `${c.unit.label} — ${c.done} of ${c.total} (${pct}%)`
                    : `${c.unit.label} — no material yet`;
                return `<span class="${cls}" style="--unit-h:${c.unit.hue}" title="${esc(title)}">` +
                       `<span class="tp-fill" style="width:${pct}%"></span>${marker}</span>`;
            }).join('');
        }

        const wrap = document.getElementById('toolbar-progress');
        if (wrap) {
            document.getElementById('tp-count').textContent = totals.done + '/' + totals.total;
            if (bar) bar.setAttribute('aria-valuenow', pct);
            const perUnit = counts.filter(c => c.total > 0)
                .map(c => c.unit.label + ' ' + c.done + '/' + c.total).join(' · ');
            wrap.title = totals.total
                ? totals.done + ' of ' + totals.total + ' sections complete (' + pct + '%)' +
                  (perUnit ? ' — ' + perUnit : '')
                : 'No sections to track yet';
            wrap.classList.toggle('complete', totals.total > 0 && totals.done >= totals.total);
            const panel = document.getElementById('tp-panel');
            if (panel && !panel.hidden) renderProgressPanel();
        }

        // Sidebar unit headings mark themselves complete, but carry no bar —
        // the toolbar is the single place progress is displayed.
        counts.forEach(c => {
            const block = document.querySelector('.nav-unit[data-unit="' + CSS.escape(c.unit.id) + '"]');
            if (block) block.classList.toggle('unit-complete', c.total > 0 && c.done >= c.total);
        });
    }

    function updateChapterLabel() {
        const label = document.getElementById('rp-label');
        if (!label) return;
        if (chapter) {
            const { done: d, total } = chapterCount(chapter);
            label.textContent = 'Chapter ' + (chapIdx + 1) + ' of ' + chapters.length +
                (total ? ' · ' + d + '/' + total + ' done' : '');
        } else {
            label.textContent = (CHAP_ID === 'glossary' || CHAP_ID === 'standards') ? 'Reference' : 'Contents';
        }
    }

    // ===== DEEP LINKS =====
    // Every section and activity heading carries a copy-link button so a
    // teacher can paste a link straight into an LMS. Following such a link
    // has to open any collapsed <details> on the way to the target and then
    // scroll to it, which the browser will not do on its own.
    window.copyDeepLink = function (btn) {
        const id = btn.dataset.target;
        if (!id) return;
        const url = location.origin + location.pathname + '#' + id;
        const icon = btn.querySelector('.link-icon');
        const flash = () => {
            btn.classList.add('copied');
            const prevTitle = btn.title;
            if (icon) icon.textContent = '✓';
            btn.title = 'Link copied';
            setTimeout(() => {
                btn.classList.remove('copied');
                if (icon) icon.textContent = '🔗';
                btn.title = prevTitle;
            }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(flash).catch(() => { legacyCopy(url); flash(); });
        } else { legacyCopy(url); flash(); }
    };
    function legacyCopy(text) {
        // Older browsers, and any non-secure context, where the clipboard API
        // is unavailable.
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch { /* best effort */ }
    }

    function revealTarget(id) {
        const el = id && document.getElementById(id);
        if (!el) return false;
        let node = el;
        while (node && node !== document.body) {
            if (node.tagName === 'DETAILS') node.open = true;
            node = node.parentElement;
        }
        if (el.tagName === 'DETAILS') el.open = true;
        // Scroll now, then again once late layout has settled — images, the
        // canvas in a simulation and a just-opened <details> all change the
        // page height after the first attempt. Timers rather than
        // requestAnimationFrame, which is frozen while the tab is hidden.
        // The offset is computed rather than left to scrollIntoView so the
        // target clears the fixed toolbar by a predictable margin.
        const go = () => {
            const bar = document.querySelector('.toolbar');
            const offset = (bar ? bar.offsetHeight : 48) + 20;
            const y = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
        };
        go();
        setTimeout(go, 120);
        setTimeout(go, 400);
        if (document.readyState !== 'complete') window.addEventListener('load', go, { once: true });
        el.classList.add('link-target');
        setTimeout(() => el.classList.remove('link-target'), 2000);
        return true;
    }
    function handleHash() {
        if (location.hash.length > 1) revealTarget(decodeURIComponent(location.hash.slice(1)));
    }
    window.addEventListener('hashchange', handleHash);

    // ===== SECTION METADATA (tags + pill bar) =====
    // Authored declaratively on the <section>:
    //   data-kind="Core"                  a type tag
    //   data-standards="NGSS HS-LS1-2, IB B2.1"
    //   data-time="20 min"                estimated-time pill
    //   data-prereq="diffusion"           prerequisite pill (comma separated)
    //   data-track                        adds the completion pill
    const CLOCK = '<span class="pill-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>';

    function standardTag(code) {
        const std = (COURSE.standards || {})[code];
        const def = std ? (std.framework ? std.framework + ' — ' : '') + std.description : null;
        // Only prefix the framework when the code doesn't already name it,
        // so 'NGSS HS-LS1-2' doesn't render as 'NGSS NGSS HS-LS1-2'.
        const named = std && std.framework &&
            code.toLowerCase().startsWith(std.framework.toLowerCase().split(' ')[0]);
        const fw = (std && std.framework && !named)
            ? '<span class="std-framework">' + esc(std.framework) + '</span> ' : '';
        // A known standard links to its row on the standards page, which opens
        // the row named in the hash; an unknown code stays a plain label.
        const open = std
            ? '<a class="standard-tag" href="' + ROOT + 'reference/standards.html#' + encodeURIComponent(code) + '"'
            : '<span class="standard-tag"';
        return open + (def ? ' data-def="' + esc(def) + '"' : '') +
               ' title="' + esc(std ? std.description : code) + '">' + fw + esc(code) + (std ? '</a>' : '</span>');
    }
    window.COURSE_STANDARD_TAG = standardTag;

    // Adds the "Complete" pill and the copy-link button to a heading.
    // A <section>'s <h2> is wrapped in .section-head so the buttons sit on
    // the heading row without becoming part of the heading's own text; a
    // <summary> already lays out as a row, so they are appended directly.
    function decorateHeading(heading, id, trackable, kind) {
        if (!id || heading.querySelector('.head-actions')) return;
        const what = kind === 'activity' ? 'question' : 'section';
        let html = '<span class="head-actions">';
        if (trackable) {
            html += '<button type="button" class="complete-btn" data-id="' + esc(id) +
                    '" onclick="toggleComplete(this)" aria-pressed="false">' +
                    '<span class="btn-icon">&#9675;</span><span class="btn-label">Complete</span></button>';
        }
        html += '<button type="button" class="copy-link" data-target="' + esc(id) +
                '" onclick="copyDeepLink(this)" title="Copy link to this ' + what + '"' +
                ' aria-label="Copy link to this ' + what + '">' +
                '<span class="link-icon" aria-hidden="true">🔗</span></button></span>';

        if (heading.tagName === 'SUMMARY') {
            heading.insertAdjacentHTML('beforeend', html);
            return;
        }
        const wrap = document.createElement('div');
        // The chapter title (h1) needs no leading gap; section h2s do.
        wrap.className = 'section-head' + (heading.tagName === 'H1' ? ' head-h1' : '');
        heading.parentNode.insertBefore(wrap, heading);
        wrap.appendChild(heading);
        wrap.insertAdjacentHTML('beforeend', html);
    }

    function renderSectionMeta() {
        if (!main) return;
        main.querySelectorAll(':scope > section').forEach(sec => {
            const d = sec.dataset;
            const heading = sec.querySelector('h1, h2');
            if (!heading) return;

            // tags row, above the heading
            const tags = [];
            if (d.kind) tags.push('<span class="section-tag kind">' + esc(d.kind) + '</span>');
            (d.standards || '').split(',').map(x => x.trim()).filter(Boolean).forEach(c => tags.push(standardTag(c)));
            if (tags.length) {
                const row = document.createElement('div');
                row.className = 'section-tags';
                row.innerHTML = tags.join('');
                heading.parentNode.insertBefore(row, heading);
            }

            // pill bar, below the heading (and below a .lead if one follows)
            const pills = [];
            if (d.time) pills.push('<span class="pill-time">' + CLOCK + esc(d.time) + '</span>');
            const prereqs = (d.prereq || '').split(',').map(x => x.trim()).filter(Boolean);
            if (prereqs.length) {
                const first = document.getElementById(prereqs[0]);
                const full = (first ? headingText(first.querySelector('h2')) : prereqs[0]) || prereqs[0];
                // Headings can be long; the pill shows a trimmed label and
                // carries the full wording in its tooltip.
                const trimmed = full.length > 42 ? full.slice(0, 40).trimEnd() + '…' : full;
                pills.push('<a class="pill-prereq" data-prereq="' + esc(prereqs.join(',')) + '" href="#' + esc(prereqs[0]) + '"' +
                    ' title="' + esc('Read this first: ' + full) + '">' +
                    '<span class="pill-icon" aria-hidden="true">⚠</span> First: ' + esc(trimmed.trim()) + '</a>');
            }
            // Completion and copy-link controls live in the heading itself,
            // so every lesson and activity carries them in the same place.
            decorateHeading(heading, sec.id, d.track !== undefined, 'section');

            if (pills.length) {
                const bar = document.createElement('div');
                bar.className = 'section-pills';
                bar.innerHTML = pills.join('');
                let after = heading.closest('.section-head') || heading;
                const next = after.nextElementSibling;
                if (next && next.classList.contains('lead')) after = next;
                after.parentNode.insertBefore(bar, after.nextSibling);
            }
        });

        // Activities: any .check-q (or other block) with an id gets the same
        // heading controls, on its <summary>.
        main.querySelectorAll('.check-q[id]').forEach(q => {
            const sum = q.querySelector('summary');
            if (sum) decorateHeading(sum, q.id, q.dataset.track !== undefined, 'activity');
        });

        // chapter-level meta bar, filled from toc.js
        const meta = main.querySelector('.chapter-meta');
        if (meta && chapter) {
            const tags = (chapter.standards || []).map(standardTag).join('');
            const pills = chapter.time ? '<span class="pill-time">' + CLOCK + esc(chapter.time) + '</span>' : '';
            meta.innerHTML =
                (pills ? '<div class="section-pills">' + pills + '</div>' : '') +
                (tags ? '<div class="section-tags">' + tags + '</div>' : '');
        }
    }

    // ===== VIDEO EMBEDS =====
    // Two forms:
    //   <div class="video" data-video="YOUTUBE_ID" ...>
    //   <div class="video" data-embed="https://provider/embed/..." ...>
    // Optional: data-title, data-source (attribution), data-note (timestamp
    // guidance), data-link (the page the video lives on).
    //
    // A facade is rendered first; the provider's iframe is only inserted when
    // the reader clicks, so opening a chapter makes no third-party request.
    // Where a source is named it is shown with the player, and where a link is
    // given the reader can always reach the original page — some providers
    // ask that their material be credited and linked wherever it is used.
    function renderVideos() {
        document.querySelectorAll('.video[data-video], .video[data-embed]').forEach(el => {
            if (el.dataset.rendered) return;
            el.dataset.rendered = 'true';
            const id = el.dataset.video;
            const embed = el.dataset.embed;
            const title = el.dataset.title || 'Video';
            const source = el.dataset.source || '';
            const note = el.dataset.note || '';
            const link = el.dataset.link || (id ? 'https://youtu.be/' + encodeURIComponent(id) : '');
            const linkLabel = el.dataset.linkLabel || (id ? 'Open on YouTube' : 'View the original page');

            el.classList.add('video-embed');
            // YouTube's own poster image, so the video can be recognised before it plays.
            // sddefault (640px) exists for almost every video; hqdefault (480px) always does.
            const thumb = id ? '<img class="video-thumb" alt="" loading="lazy" decoding="async" src="https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/sddefault.jpg">' : '';
            el.innerHTML =
                '<div class="video-frame">' +
                    '<button type="button" class="video-play' + (id ? ' has-thumb' : '') + '" aria-label="Play video: ' + esc(title) + '">' +
                        thumb +
                        '<span class="video-play-icon" aria-hidden="true">&#9654;</span>' +
                        '<span class="video-play-label">' + esc(title) + '</span>' +
                        '<span class="video-play-hint">Click to load' + (source ? ' from ' + esc(source) : '') + '</span>' +
                    '</button>' +
                '</div>' +
                '<div class="video-meta">' +
                    (source ? '<span class="video-source">' + esc(source) + '</span>' : '') +
                    (note ? '<span class="video-note">' + esc(note) + '</span>' : '') +
                    (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' +
                            esc(linkLabel) + ' &rarr;</a>' : '') +
                '</div>';

            const thumbImg = el.querySelector('.video-thumb');
            if (thumbImg) {
                // a missing size comes back as an error or as YouTube's 120px grey stand-in
                const fallback = () => {
                    if (thumbImg.dataset.fallback) return;
                    thumbImg.dataset.fallback = '1';
                    thumbImg.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg';
                };
                thumbImg.addEventListener('error', fallback);
                thumbImg.addEventListener('load', () => { if (thumbImg.naturalWidth <= 120) fallback(); });
            }

            el.querySelector('.video-play').addEventListener('click', function () {
                const frame = el.querySelector('.video-frame');
                // YouTube refuses to play an embed when it cannot tell which site
                // is embedding it ("Error 153"), and a page opened straight from
                // disk (file://) never says. Rather than show a broken player,
                // open the video on YouTube itself.
                if (location.protocol === 'file:' && id) {
                    window.open(link, '_blank', 'noopener');
                    const hint = el.querySelector('.video-play-hint');
                    if (hint) hint.textContent = 'Opened on YouTube — videos only play inside the course when it is opened from its web address';
                    return;
                }
                // YouTube's own Share > Embed code, attribute for attribute, on the
                // standard youtube.com player: school filters and YouTube Restricted
                // Mode are set up for that address, and some block youtube-nocookie.com.
                // The referrer policy is the part that matters most — YouTube refuses
                // an embed that does not say which site it is on ("Error 153").
                const iframe = document.createElement('iframe');
                iframe.src = embed
                    ? embed + (embed.indexOf('?') > -1 ? '&' : '?') + 'autoplay=true'
                    : 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?rel=0&autoplay=1';
                iframe.title = title;
                iframe.setAttribute('frameborder', '0');
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
                iframe.referrerPolicy = 'strict-origin-when-cross-origin';
                iframe.allowFullscreen = true;
                frame.innerHTML = '';
                frame.appendChild(iframe);
            });
        });
    }

    // ===== PROGRESSION STRIP =====
    // <div class="progression" data-progression></div> renders the unit's
    // chapters in order, each with the question it answers, marking what is
    // already established, where the reader is, and what is still to come.
    function renderProgression() {
        if (!main || !chapter) return;
        const host = main.querySelector('[data-progression]');
        if (!host) return;
        const u = unitOf(chapter.unit);
        const steps = chaptersInUnit(u).filter(c => c.question);
        if (steps.length < 2) return;
        const at = steps.findIndex(c => c.id === chapter.id);

        host.classList.add('progression');
        host.style.setProperty('--unit-h', u.hue);
        host.innerHTML =
            `<div class="progression-title">${esc(u.label)} — how the ideas build</div><ol>` +
            steps.map((c, i) => {
                const state = i < at ? 'done' : (i === at ? 'here' : 'ahead');
                // The number column is narrow; an unnumbered chapter (the unit
                // overview) gets a short marker rather than its full title.
                const { num } = splitTitle(c.title);
                const name = num || 'Start';
                const text = esc(c.question);
                const body = (i === at)
                    ? text
                    : (c.status === 'planned'
                        ? text
                        : `<a href="${ROOT}${c.file}">${text}</a>`);
                return `<li class="${state}"><span class="step-num">${esc(name)}</span><span>${body}</span></li>`;
            }).join('') + '</ol>';
    }

    // ===== QUICK CHECK (auto-marked multiple choice) =====
    // <div class="quiz" data-quiz>
    //   <div class="quiz-q" data-answer="2" data-review="anatomy">
    //     <p class="quiz-stem">...</p>
    //     <ol class="quiz-options"><li>...</li><li>...</li></ol>
    //     <div class="quiz-why">...</div>
    //   </div>
    // </div>
    // data-answer is the 1-based index of the correct option; data-review is
    // the id of the section to send the reader back to when they get it wrong.
    //
    // A question may offer a second attempt by wrapping each version in a
    // .quiz-variant, which carries its own data-answer:
    //   <div class="quiz-q" data-review="routes">
    //     <div class="quiz-variant" data-answer="1"> stem, options, why </div>
    //     <div class="quiz-variant" data-answer="3"> stem, options, why </div>
    //   </div>
    // Clicking Review then swaps in the next version, so the reader comes back
    // from the section to a fresh question rather than the one they just saw.
    // Variants are optional — a .quiz-q without any behaves exactly as before.
    const LETTERS = 'ABCDEFGH';
    function renderQuizzes() {
        if (!main) return;
        main.querySelectorAll('.quiz').forEach(quiz => {
            if (quiz.dataset.wired) return;
            quiz.dataset.wired = 'true';
            const qs = [...quiz.querySelectorAll('.quiz-q')];
            const state = new Array(qs.length).fill(null);

            const score = document.createElement('div');
            score.className = 'quiz-score';
            quiz.appendChild(score);

            qs.forEach((q, qi) => {
                const found = [...q.querySelectorAll(':scope > .quiz-variant')];
                const variants = found.length ? found : [q];
                q._variants = variants;
                q._at = 0;
                variants.forEach((v, vi) => {
                    if (found.length && vi > 0) v.hidden = true;
                    wireVariant(q, qi, v);
                });
            });

            function wireVariant(q, qi, v) {
                const stem = v.querySelector('.quiz-stem');
                if (stem && !stem.querySelector('.quiz-n')) {
                    stem.insertAdjacentHTML('afterbegin', `<span class="quiz-n">${qi + 1}.</span>`);
                }
                const answer = parseInt(v.dataset.answer || q.dataset.answer, 10);
                const opts = [...v.querySelectorAll('.quiz-options > li')];
                opts.forEach((li, i) => {
                    const why = li.dataset.why || '';
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'quiz-opt';
                    btn.innerHTML = `<span class="quiz-key">${LETTERS[i]}</span><span>${li.innerHTML}</span>`;
                    li.innerHTML = '';
                    li.appendChild(btn);
                    btn.addEventListener('click', () => {
                        if (q.classList.contains('answered')) return;
                        const right = (i + 1) === answer;
                        state[qi] = right;
                        q.classList.add('answered');
                        v.querySelectorAll('.quiz-opt').forEach((b, bi) => {
                            b.disabled = true;
                            if (bi + 1 === answer) b.classList.add('reveal-right');
                        });
                        btn.classList.add(right ? 'chosen-right' : 'chosen-wrong');
                        const box = v.querySelector('.quiz-why');
                        if (box) {
                            if (!right && why) {
                                box.insertAdjacentHTML('afterbegin',
                                    `<p><strong>Not quite.</strong> ${why}</p>`);
                            }
                            if (!right) {
                                const link = reviewLink(q.dataset.review, q._variants.length > 1);
                                if (link) {
                                    box.insertAdjacentHTML('beforeend', link);
                                    const a = box.querySelector('.quiz-review');
                                    if (a) a.addEventListener('click', () => advance(q, qi));
                                }
                            }
                        }
                        updateScore();
                    });
                });
            }

            // Swap in the next version of a question and clear its answer, so the
            // reader returns from the section to something they have not just seen.
            function advance(q, qi) {
                const vs = q._variants;
                if (!vs || vs.length < 2) return;
                const from = vs[q._at];
                resetVariant(from);
                from.hidden = true;
                q._at = (q._at + 1) % vs.length;
                const to = vs[q._at];
                resetVariant(to);
                to.hidden = false;
                const stem = to.querySelector('.quiz-stem');
                if (stem && !stem.querySelector('.quiz-again')) {
                    stem.insertAdjacentHTML('beforeend', ' <span class="quiz-again">another go</span>');
                }
                q.classList.remove('answered');
                state[qi] = null;
                score.className = 'quiz-score';
            }

            function resetVariant(v) {
                v.querySelectorAll('.quiz-opt').forEach(b => {
                    b.disabled = false;
                    b.classList.remove('chosen-right', 'chosen-wrong', 'reveal-right');
                });
                const box = v.querySelector('.quiz-why');
                if (box) {
                    box.querySelectorAll('.quiz-review').forEach(a => a.remove());
                    const first = box.firstElementChild;
                    if (first && first.textContent.startsWith('Not quite.')) first.remove();
                }
                const st = v.querySelector('.quiz-stem .quiz-again');
                if (st) st.remove();
            }

            function reviewLink(id, hasAnother) {
                if (!id) return '';
                const sec = document.getElementById(id);
                const h = sec && sec.querySelector('h2');
                const name = h ? headingText(h) : id;
                const tail = hasAnother ? ', then try another' : '';
                return `<a class="quiz-review" href="#${esc(id)}">&#8593; Review: ${esc(name)}${tail}</a>`;
            }

            function updateScore() {
                const done = state.filter(v => v !== null).length;
                if (done < qs.length) return;
                const right = state.filter(Boolean).length;
                const wrong = qs.map((q, i) => state[i] ? null : q.dataset.review)
                                .filter(Boolean);
                const seen = [];
                wrong.forEach(id => { if (!seen.includes(id)) seen.push(id); });
                // Do the links below hand back a fresh question, or only scroll?
                const canSwap = qs.some((q, i) => !state[i] && q._variants && q._variants.length > 1);
                score.className = 'quiz-score show' + (right === qs.length ? ' all-right' : '');
                score.innerHTML =
                    `<strong>${right} out of ${qs.length}.</strong> ` +
                    (right === qs.length
                        ? 'Every one right — you are ready for the written questions below.'
                        : canSwap
                            ? 'Worth another look before you go on. Each link gives you a fresh question on the way back:'
                            : 'Worth another look before you go on:') +
                    (seen.length
                        ? '<ul>' + seen.map(id => {
                            const sec = document.getElementById(id);
                            const h = sec && sec.querySelector('h2');
                            return `<li><a href="#${esc(id)}">${esc(h ? headingText(h) : id)}</a></li>`;
                          }).join('') + '</ul>'
                        : '') +
                    '<button type="button" class="quiz-reset">Try again</button>';
                // One section can own several questions, so a link advances all of the
                // ones the reader got wrong, not just the first.
                score.querySelectorAll('li a').forEach(a => {
                    const id = a.getAttribute('href').slice(1);
                    a.addEventListener('click', () => {
                        qs.forEach((q, i) => {
                            if (!state[i] && q.dataset.review === id) advance(q, i);
                        });
                    });
                });
                score.querySelector('.quiz-reset').addEventListener('click', () => {
                    qs.forEach((q, i) => {
                        state[i] = null;
                        q.classList.remove('answered');
                        (q._variants || [q]).forEach(resetVariant);
                    });
                    score.className = 'quiz-score';
                    quiz.scrollIntoView({ block: 'start' });
                });
            }
        });
    }

    // A cloned SVG brings its ids with it. Renaming them in the copy keeps every
    // url(#…) fill, mask and marker pointing at the copy's own defs.
    let cloneSeq = 0;
    function uniqueIds(root) {
        const tag = 'lb' + (++cloneSeq) + '-';
        const map = {};
        root.querySelectorAll('[id]').forEach(n => {
            const was = n.id;
            map[was] = tag + was;
            n.id = map[was];
        });
        if (!Object.keys(map).length) return;
        const attrs = ['fill', 'stroke', 'clip-path', 'mask', 'filter', 'marker-start',
            'marker-mid', 'marker-end', 'href', 'xlink:href'];
        root.querySelectorAll('*').forEach(n => {
            attrs.forEach(a => {
                const v = n.getAttribute && n.getAttribute(a);
                if (!v) return;
                const m = /^url\(#(.+?)\)$/.exec(v) || /^#(.+)$/.exec(v);
                if (m && map[m[1]]) n.setAttribute(a, v.indexOf('url(') === 0 ? 'url(#' + map[m[1]] + ')' : '#' + map[m[1]]);
            });
            const st = n.getAttribute && n.getAttribute('style');
            if (st && st.indexOf('url(#') >= 0) {
                n.setAttribute('style', st.replace(/url\(#(.+?)\)/g, (all, id) => map[id] ? 'url(#' + map[id] + ')' : all));
            }
        });
    }

    // ===== LIGHTBOX =====
    // Figures are shown at column width (~820px) but several diagrams carry
    // fine detail and labelled text, so any figure can be opened full-screen.
    // Works for both <img> photos and inline <svg> diagrams; arrow keys move
    // between the figures on the page.
    function wireLightbox() {
        if (!main) return;
        const figs = [...main.querySelectorAll('figure')].filter(f => f.querySelector('img, svg'));
        if (!figs.length) return;

        const box = document.createElement('div');
        box.className = 'lightbox';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', 'Enlarged figure');
        box.hidden = true;
        box.innerHTML =
            '<button type="button" class="lb-close" aria-label="Close (Esc)">&times;</button>' +
            '<button type="button" class="lb-prev" aria-label="Previous figure">&#8249;</button>' +
            '<button type="button" class="lb-next" aria-label="Next figure">&#8250;</button>' +
            '<figure class="lb-stage"><div class="lb-media"></div>' +
            '<figcaption class="lb-cap"></figcaption></figure>';
        document.body.appendChild(box);

        const media = box.querySelector('.lb-media');
        const cap = box.querySelector('.lb-cap');
        const btnClose = box.querySelector('.lb-close');
        const btnPrev = box.querySelector('.lb-prev');
        const btnNext = box.querySelector('.lb-next');
        let at = 0, opener = null;

        figs.forEach((f, i) => {
            f.classList.add('zoomable');
            const target = f.querySelector('img, svg');
            target.addEventListener('click', () => open(i, target));
            // keyboard: the figure itself is focusable and activates
            f.setAttribute('tabindex', '0');
            f.setAttribute('role', 'button');
            const label = (f.querySelector('figcaption') || {}).textContent || 'figure';
            f.setAttribute('aria-label', 'Enlarge: ' + label.trim().slice(0, 80));
            f.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, f); }
            });
        });

        function show(i) {
            at = (i + figs.length) % figs.length;
            const src = figs[at].querySelector('img, svg');
            media.innerHTML = '';
            // Figures scope their own rules to ".diagram svg". Lifted out of the page the
            // ancestor is gone, those rules stop matching, and every fill falls back to
            // the SVG default — solid black. Carrying the class keeps them matching.
            media.classList.toggle('diagram', src.tagName !== 'IMG');
            if (src.tagName === 'IMG') {
                const img = document.createElement('img');
                img.src = src.currentSrc || src.src;
                img.alt = src.alt || '';
                media.appendChild(img);
            } else {
                // clone the SVG so the original stays in the page
                const svg = src.cloneNode(true);
                svg.removeAttribute('width'); svg.removeAttribute('height');
                // An SVG carrying only a viewBox has no intrinsic CSS size. Dropped into
                // a shrink-to-fit flex parent it therefore measured 0x0, and the lightbox
                // showed a caption over an empty space with the real figure dimly visible
                // through the backdrop. Handing it the viewBox's ratio gives width:100%
                // and max-height something to work with.
                const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
                if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
                    svg.style.aspectRatio = vb[2] + ' / ' + vb[3];
                }
                svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                // Two copies of the same ids are now in the document, and a gradient or
                // clip referenced by url(#id) would resolve to whichever came first —
                // the original, still sitting in the page.
                uniqueIds(svg);
                media.appendChild(svg);
            }
            const c = figs[at].querySelector('figcaption');
            cap.textContent = c ? c.textContent.trim() : '';
            const many = figs.length > 1;
            btnPrev.hidden = btnNext.hidden = !many;
        }

        function open(i, from) {
            opener = from || document.activeElement;
            show(i);
            box.hidden = false;
            document.body.classList.add('lb-open');
            btnClose.focus();
        }
        function close() {
            box.hidden = true;
            document.body.classList.remove('lb-open');
            media.innerHTML = '';
            if (opener && opener.focus) opener.focus();
        }

        btnClose.addEventListener('click', close);
        btnPrev.addEventListener('click', () => show(at - 1));
        btnNext.addEventListener('click', () => show(at + 1));
        // clicking the backdrop closes; clicking the image itself does not
        box.addEventListener('click', e => { if (e.target === box || e.target === box.querySelector('.lb-stage')) close(); });
        document.addEventListener('keydown', e => {
            if (box.hidden) return;
            if (e.key === 'Escape') { e.preventDefault(); close(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
            else if (e.key === 'Tab') {
                // keep focus inside the dialog
                const f = [...box.querySelectorAll('button')].filter(b => !b.hidden);
                const i = f.indexOf(document.activeElement);
                e.preventDefault();
                f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
            }
        });
    }

    // ===== REPLACEMENT QUEUE =====
    // Some images are kept in the reader on purpose — the teacher needs to see
    // the subject in place in order to re-author it — but they carry
    // third-party copyright and must never ship. Every figure using one gets a
    // badge it is impossible to miss, driven off COURSE.replacements so the
    // marking can never drift from the list.
    function markReplacements() {
        const list = COURSE.replacements || {};
        if (!Object.keys(list).length) return;
        document.querySelectorAll('main img[src]').forEach(img => {
            const m = img.getAttribute('src').match(/images\/(u\d\/[^"']+)$/);
            if (!m) return;
            const reason = list[m[1]];
            if (!reason) return;
            const fig = img.closest('figure') || img.parentElement;
            fig.classList.add('needs-replacing');
            const cap = fig.querySelector('figcaption');
            const tag = document.createElement('span');
            tag.className = 'replace-tag';
            tag.textContent = 'REPLACE — ' + reason;
            tag.title = 'This image cannot be published. It is here so the subject ' +
                        'can be seen and re-authored.';
            (cap || fig).appendChild(tag);
        });
    }

    // ===== GLOSSARY TERM POPOVER =====
    function wirePopover() {
        const popover = document.getElementById('term-popover');
        let timer = null;

        // Terms marked <span class="term"> with no data-def inherit the
        // definition from COURSE.glossary, matched case-insensitively.
        const byLower = {};
        Object.entries(COURSE.glossary || {}).forEach(([k, v]) => { byLower[k.toLowerCase()] = v; });
        document.querySelectorAll('.term:not([data-def])').forEach(el => {
            const def = byLower[el.textContent.trim().toLowerCase()];
            if (def) el.setAttribute('data-def', def);
        });

        function show(term) {
            const def = term.getAttribute('data-def');
            if (!def) return;
            popover.textContent = def;
            popover.className = 'visible';
            const r = term.getBoundingClientRect();
            const pw = popover.offsetWidth, ph = popover.offsetHeight;
            let left = Math.max(8, Math.min(r.left + r.width / 2 - pw / 2, innerWidth - pw - 8));
            let top;
            if (r.top - ph - 12 > 0) { top = r.top - ph - 10; popover.classList.add('arrow-bottom'); }
            else { top = r.bottom + 10; popover.classList.add('arrow-top'); }
            popover.style.left = left + 'px';
            popover.style.top = top + 'px';
        }
        function hide() { popover.className = ''; popover.style.left = '-9999px'; }

        const hasDef = el => el && el.hasAttribute && el.hasAttribute('data-def');
        document.addEventListener('mouseenter', function (e) {
            if (hasDef(e.target)) { clearTimeout(timer); show(e.target); }
        }, true);
        document.addEventListener('mouseleave', function (e) {
            if (hasDef(e.target)) timer = setTimeout(hide, 120);
        }, true);
        document.addEventListener('click', function (e) {
            if (hasDef(e.target)) {
                popover.classList.contains('visible') ? hide() : show(e.target);
            } else if (!popover.contains(e.target)) hide();
        });
    }

    // ===== INIT =====
    if (main && chapter) main.style.setProperty('--unit-h', unitOf(chapter.unit).hue);
    renderChrome();
    renderSectionMeta();
    initTheme();
    applyScale();
    initFont();
    initFocus();
    buildOnThisPage();
    initProgress();
    renderChapterNav();
    wireSearch();
    markReplacements();
    wirePopover();
    wireLightbox();
    renderProgression();
    renderQuizzes();
    renderVideos();
    applyProgress();
    loadSims();
    updateProgress();
    handleHash();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    // expose a little for page-level scripts / sims
    window.COURSE_SHELL = { root: ROOT, assetV: ASSET_V, chapter, prefs: P, chapterCount, loadProgress,
                            units, unitOf, chaptersInUnit, unitCount };

    // ===== READING TOOLS — read aloud =====
    // speechSynthesis is built into every modern browser: no key, no network,
    // no cost, and it uses the reader's own OS voices. Two things need care.
    //
    // 1. The chemistry reads badly raw. "CO2" becomes "co two" and the em dash
    //    — which appears about 2,000 times in this book — is swallowed or
    //    mispaused. Everything therefore goes through a pronunciation pass
    //    built from the formulae, symbols and units that actually occur in the
    //    prose, not from guesswork.
    // 2. Chrome silently stops after roughly fifteen seconds of one utterance,
    //    so the text is queued sentence by sentence and nudged with resume().
    // Only the English rules expand words ("degrees Celsius", "parts per
    // million"). Once the page has been translated those would be nonsense, so
    // just the language-neutral rules run — spacing out subscripts and turning
    // an em dash into a pause, which read correctly in any language.
    const RT_SPEAK = [
        // formulae, longest first so C6H12O6 is not eaten by CO2
        [/C₆H₁₂O₆/g, 'C 6 H 12 O 6'], [/CO₂/g, 'carbon dioxide'], [/H₂O/g, 'water'],
        [/O₂/g, 'oxygen'], [/N₂/g, 'nitrogen'], [/NH₃/g, 'ammonia'], [/CH₄/g, 'methane'],
        // anything else with subscripts: space the digits out so they are read singly
        [/([A-Za-z])([₀-₉]+)/g, (m, a, d) => a + ' ' + d.replace(/[₀-₉]/g, c => '₀₁₂₃₄₅₆₇₈₉'.indexOf(c)) + ' '],
        // abbreviations a voice mangles
        [/\bpH\b/g, 'P H'], [/\bppm\b/g, 'parts per million'],
        [/\bSGLT1\b/g, 'S G L T 1'], [/\bGLUT4\b/g, 'GLUT 4'],
        // units, only ever after a number
        [/(\d)\s?°C\b/g, '$1 degrees Celsius'], [/(\d)\s?kcal\b/g, '$1 kilocalories'],
        [/(\d)\s?kJ\b/g, '$1 kilojoules'], [/(\d)\s?mmol\/L\b/g, '$1 millimoles per litre'],
        [/(\d)\s?mg\/dL\b/g, '$1 milligrams per decilitre'], [/(\d)\s?[µμ]m\b/g, '$1 micrometres'],
        [/(\d)\s?nm\b/g, '$1 nanometres'], [/(\d)\s?mm\b/g, '$1 millimetres'],
        [/(\d)\s?cm\b/g, '$1 centimetres'], [/(\d)\s?km\b/g, '$1 kilometres'],
        [/(\d)\s?mL\b/g, '$1 millilitres'], [/(\d)\s?kg\b/g, '$1 kilograms'],
        [/(\d)\s?%/g, '$1 per cent'],
        // symbols
        [/(\d)\s?–\s?(\d)/g, '$1 to $2'],      // numeric range
        [/\s?→\s?/g, ' to '], [/\s?↔\s?/g, ' and back to '],
        [/\s?×\s?/g, ' times '], [/\s?÷\s?/g, ' divided by '],
        [/≈/g, 'about '], [/~(\d)/g, 'about $1'], [/±/g, 'plus or minus '],
        [/²/g, ' squared'], [/³/g, ' cubed'],
        // a coefficient must not fuse onto the word it multiplies: 6CO2 -> 6 carbon dioxide
        [/(\d)\s?(carbon dioxide|water|oxygen|nitrogen|ammonia|methane)/g, '$1 $2'],
        // textContent joins adjacent elements with no space, e.g. "2.1Where does..."
        [/(\d)([A-Z])/g, '$1 $2'],
        [/\s?–\s?/g, ', ']
    ];
    // Safe in any language: spacing, punctuation, and digits that have run into
    // the next word because textContent joined two elements.
    const RT_SPEAK_ANY = [
        [/([A-Za-z])([₀-₉]+)/g, (m, a, d) => a + ' ' + d.replace(/[₀-₉]/g, c => '₀₁₂₃₄₅₆₇₈₉'.indexOf(c)) + ' '],
        [/(\d)([A-Z])/g, '$1 $2'],
        [/\s?—\s?/g, ', '],
        [/\s?·\s?/g, ', '],
        [/\s+/g, ' ']
    ];
    function rtSay(s, lang) {
        if (!lang || /^en/i.test(lang)) RT_SPEAK.forEach(([re, to]) => { s = s.replace(re, to); });
        RT_SPEAK_ANY.forEach(([re, to]) => { s = s.replace(re, to); });
        return s.trim();
    }
    // What language is on the page right now — English unless it has been translated.
    function rtLang() { return (typeof TR !== 'undefined' && TR.on && TR.lang) ? TR.lang : 'en'; }

    window.rtSay = rtSay;   // exposed so the pronunciation pass can be tested

    // "1.5 No System Works Alone" must not split into "1." and "5 No System...".
    // Each guarded full stop is swapped for a single placeholder character, so
    // every offset still lines up with the page's own text and the sentence can
    // be taken back out of the original string with its real punctuation.
    const RT_KEEP = '\uE000';
    function rtGuard(t) {
        return t
            .replace(/(\d)\.(\d)/g, '$1' + RT_KEEP + '$2')
            .replace(/\b([eE])\.([gG])\./g, '$1' + RT_KEEP + '$2' + RT_KEEP)
            .replace(/\b([iI])\.([eE])\./g, '$1' + RT_KEEP + '$2' + RT_KEEP)
            .replace(/\betc\./gi, m => m.slice(0, -1) + RT_KEEP)
            .replace(/\b(Mr|Mrs|Ms|Dr|Prof|St|vs|approx|Fig|No)\./g, (m) => m.slice(0, -1) + RT_KEEP);
    }

    // ===== WHERE THE VOICE COMES FROM =====
    // Two engines, and the reader switches between them in the Listen bar.
    //   natural — Piper neural voices that run inside the reader's own browser,
    //             from files on this site (vendor/piper/). The same voice on every
    //             device; no account, key or install. About 75MB the first time on
    //             each device, then cached.
    //   device  — the voices the browser or operating system provides. Instant and
    //             no download, but quality varies enormously between devices.
    // Natural voices are English only, so a translated page always uses device voices.
    //
    // SHAREPOINT / MICROSOFT 365. Text that lives in SharePoint pages is read by
    // Microsoft's Immersive Reader, which SharePoint provides itself — nothing here
    // is involved and nothing needs building for it. This Listen bar belongs to the
    // reader on GitHub Pages. Set offerNatural to false to drop the natural voices
    // (and their download) and fall back to device voices only. If Microsoft's own
    // voices are ever wanted in the reader as well, the Immersive Reader SDK could be
    // added as a third engine beside these two — but it needs an Azure resource and a
    // small token server, which is why it is not the default.
    const LISTEN = {
        offerNatural: true,
        defaultMode: 'natural',                  // for someone who has never chosen
        voices: [                                // public-domain recordings, trained from scratch
            { id: 'en_US-ljspeech-medium', label: 'US English' },
            { id: 'en_GB-cori-medium', label: 'British English' }
        ]
    };

    const RT = { items: [], at: 0, on: false, rate: 1, voice: null, keep: null, wired: false,
                 mode: 'device', natVoice: null, gen: 0, cache: new Map(),
                 nvState: 'idle', nvReady: null, nvReadyVoice: null, nvGot: 0, nvPct: null, nvNote: '', nvRtf: [] };

    function rtNatAvailable() {
        return LISTEN.offerNatural && typeof WebAssembly === 'object' && typeof Worker === 'function' &&
            !!(window.AudioContext || window.webkitAudioContext);
    }
    // Natural only when chosen, supported, the page is in English, and it has not
    // already failed or proved too slow on this page.
    function rtNatural() {
        return RT.mode === 'natural' && rtNatAvailable() && /^en/i.test(rtLang()) && RT.nvState !== 'failed';
    }
    function rtPaused() {
        if (rtNatural()) return !!(window.NaturalVoice && NaturalVoice.paused());
        return ('speechSynthesis' in window) && speechSynthesis.paused;
    }
    // Silence whichever engine is speaking, and make any callback still in flight
    // from the old sentence harmless. flushQueue also drops natural sentences that
    // were being prepared ahead, for when the reader has moved somewhere else.
    function rtHalt(flushQueue) {
        RT.gen++;
        try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { }
        if (window.NaturalVoice) { NaturalVoice.stop(); if (flushQueue) { NaturalVoice.flush(); RT.cache.clear(); } }
    }
    function rtPauseEngine() {
        if (rtNatural()) { if (window.NaturalVoice) NaturalVoice.pause(); }
        else if ('speechSynthesis' in window) speechSynthesis.pause();
    }
    function rtResumeEngine() {
        if (rtNatural()) { if (window.NaturalVoice) NaturalVoice.resume(); }
        else if ('speechSynthesis' in window) speechSynthesis.resume();
    }
    // Audio may only start inside a click, and the voice script is fetched after
    // the first one — so the audio context is created and woken here, during the
    // click, and handed over. The one-sample sound is what iPad Safari needs before
    // it will let later audio play.
    function rtUnlockAudio() {
        if (!rtNatAvailable() || RT.mode !== 'natural') return;
        const AC = window.AudioContext || window.webkitAudioContext;
        try { if (!window.LISTEN_CTX) window.LISTEN_CTX = new AC(); } catch (e) { return; }
        const c = window.LISTEN_CTX;
        if (c.state === 'suspended' && !(window.NaturalVoice && NaturalVoice.paused())) c.resume();
        try {
            const b = c.createBuffer(1, 1, 22050), src = c.createBufferSource();
            src.buffer = b; src.connect(c.destination); src.start(0);
        } catch (e) { }
    }
    function rtNatLoad() {
        if (RT.nvReady && RT.nvReadyVoice === RT.natVoice) return RT.nvReady;
        RT.nvState = 'loading'; RT.nvGot = 0; RT.nvPct = null;
        rtRender();
        RT.nvReadyVoice = RT.natVoice;
        const want = RT.natVoice;
        RT.nvReady = loadScript(ROOT + 'assets/listen-voice.js?v=' + ASSET_V)
            .then(() => {
                window.LISTEN_V = ASSET_V;
                return NaturalVoice.prepare(want, ROOT, (got, total) => {
                    RT.nvGot = got; RT.nvPct = total ? Math.round(100 * got / total) : null;
                    rtRender();
                });
            })
            .then(() => { if (RT.natVoice === want) { RT.nvState = 'ready'; rtRender(); } });
        RT.nvReady.catch(() => { if (RT.nvReadyVoice === want) { RT.nvReady = null; RT.nvReadyVoice = null; } });
        return RT.nvReady;
    }
    // Sentences are made ahead while the current one plays, so a device that is
    // slower than this one still keeps up. Keyed by voice and speed as well as
    // position, so a change of either can never play the wrong audio.
    function rtNatFetch(i) {
        if (!RT.items[i]) return null;
        const key = RT.natVoice + '|' + RT.rate + '|' + i;
        let p = RT.cache.get(key);
        if (!p) {
            p = NaturalVoice.synth(RT.items[i].text, RT.rate);
            p.catch(() => RT.cache.delete(key));
            RT.cache.set(key, p);
            if (RT.cache.size > 12) RT.cache.delete(RT.cache.keys().next().value);
        }
        return p;
    }
    // A device that makes speech more slowly than it can be heard would stall
    // mid-sentence. After three sentences the average tells, and Listen moves to a
    // device voice rather than stuttering — and remembers, so this device starts
    // on its own voices next time. Choosing Natural again tries once more.
    function rtNatTooSlow(res) {
        RT.nvRtf.push(res.synthMs / 1000 / Math.max(0.5, res.seconds));
        if (RT.nvRtf.length > 5) RT.nvRtf.shift();
        const avg = RT.nvRtf.reduce((a, b) => a + b, 0) / RT.nvRtf.length;
        return RT.nvRtf.length >= 3 && avg > 0.95;
    }
    function rtNatFallback(reason) {
        RT.nvState = 'failed';
        RT.nvNote = reason === 'slow'
            ? 'The natural voice is too slow on this device, so Listen switched to a device voice.'
            : 'The natural voice ran into a problem here, so Listen switched to a device voice.';
        if (reason === 'slow') { try { localStorage.setItem('bio-rt-slow', '1'); } catch (e) { } }
        rtHalt(true);
        if (RT.refillVoices) RT.refillVoices();
        if (RT.on) { if ('speechSynthesis' in window) rtSpeak(); else rtFail(); }
        rtRender();
    }
    function rtSpeakNatural() {
        const gen = RT.gen, at = RT.at, item = RT.items[at];
        if (RT.nvState !== 'ready') rtMark(item);           // show where it will start while it loads
        rtNatLoad().then(() => {
            if (gen !== RT.gen || !RT.on) return;
            const p = rtNatFetch(at);
            rtNatFetch(at + 1); rtNatFetch(at + 2);
            return p.then(res => {
                if (gen !== RT.gen || !RT.on) return;
                if (rtNatTooSlow(res)) { rtNatFallback('slow'); return; }
                rtMark(item);
                rtRender();
                NaturalVoice.play(res, () => {
                    if (gen !== RT.gen || !RT.on) return;
                    RT.at++;
                    rtSpeak();
                });
            });
        }).catch(err => {
            if (gen !== RT.gen) return;
            console.error('[listen] natural voice', err);
            rtNatFallback('load');
        });
    }

    // Everything worth hearing, in reading order. Sims, quizzes, figures and
    // collapsed answers are skipped — a closed <details> is not on screen.
    function rtCollect() {
        if (!main) return [];
        return [...main.querySelectorAll('h1, h2, h3, p, li, figcaption')].filter(el => {
            if (el.closest('.sim, .quiz, svg, .chapter-nav, .rt-bar')) return false;
            if (el.closest('details:not([open])')) return false;
            if (el.querySelector('p, li')) return false;
            return el.textContent.trim().length > 1;
        });
    }

    function rtBuild(fromHere) {
        const els = rtCollect();
        const top = fromHere ? scrollY + 90 : 0;
        RT.items = [];
        els.forEach(el => {
            if (el.getBoundingClientRect().top + scrollY + el.offsetHeight < top) return;
            // The sentence split happens on the ORIGINAL text so its offsets still
            // point into the page's own characters; the pronunciation pass runs
            // afterwards, per sentence. Doing it the other way round made the
            // offsets meaningless, because "CO2" is 3 characters on the page and
            // 14 once spoken.
            const raw = el.textContent;
            const guarded = rtGuard(raw);      // same length, so offsets still hold
            // Chinese and Japanese end sentences with 。！？, Arabic with ؟ and Hindi with ।.
            // Splitting only on . ! ? read a whole translated paragraph as one block,
            // so nothing was highlighted sentence by sentence.
            const re = /[^.!?\u3002\uFF01\uFF1F\u061F\u0964]+[.!?\u3002\uFF01\uFF1F\u061F\u0964]*/g;
            let m;
            while ((m = re.exec(guarded)) !== null) {
                if (m[0].trim().length < 2) continue;
                const original = raw.slice(m.index, m.index + m[0].length);
                const spoken = rtSay(original, rtLang());
                if (!spoken) continue;
                RT.items.push({ el: el, text: spoken, from: m.index, to: m.index + m[0].length });
            }
        });
        RT.at = 0;
    }

    // Speech voices carry no quality flag, so quality is read from the name. That
    // works better than it sounds: the good ones announce themselves (Edge's
    // "…Online (Natural)", macOS "(Premium)" and "(Enhanced)", Chrome's "Google …"),
    // and the bad ones are a fixed, known set. A Mac ships 41 English voices and 35
    // of them are novelty or robotic, and the list used to be taken in the order the
    // system gave it — so the default could easily be Albert or Bad News.
    const RT_NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Fred|Good News|Hysterical|Jester|Junior|Kathy|Organ|Pipe Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i;
    const RT_ELOQUENCE = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;   // formant synthesis, 1990s-era
    function rtScore(v) {
        const n = v.name || '';
        if (RT_NOVELTY.test(n)) return 0;
        if (RT_ELOQUENCE.test(n)) return 5;
        if (/\b(Natural|Neural)\b/i.test(n)) return 100;
        if (/\(Premium\)/i.test(n)) return 95;
        if (/\bSiri\b/i.test(n)) return 90;
        if (/\(Enhanced\)/i.test(n)) return 85;
        if (/^Google\b/i.test(n)) return 70;
        if (/^Microsoft\b/i.test(n)) return 30;       // the older Windows desktop voices
        return 50;                                     // an ordinary system voice: Samantha, Daniel…
    }
    const RT_ROBOTIC = 20;                             // below this, hidden unless asked for

    // Voices for whatever the page is currently in, best first. If the device has
    // none for that language we say so rather than reading Spanish in an English accent.
    // If every voice for a language is robotic they are all shown: a poor voice beats none.
    // Traditional characters are read by Taiwan and Hong Kong voices, Simplified by
    // mainland ones. Quality still comes first; region breaks the tie.
    const RT_REGION = { 'zh-hant': /^zh[-_](TW|HK|MO|Hant)/i, 'zh': /^zh[-_](CN|SG|Hans)/i };
    function rtVoices(lang) {
        const full = (lang || rtLang()).toLowerCase();
        const want = full.split('-')[0];
        const near = RT_REGION[full] || null;
        const all = ('speechSynthesis' in window) ? speechSynthesis.getVoices() : [];
        const hit = all.filter(v => (v.lang || '').split(/[-_]/)[0].toLowerCase() === want);
        const ranked = (hit.length ? hit : all)
            .map(v => ({ v, s: rtScore(v), r: near && near.test(v.lang || '') ? 1 : 0 }))
            .sort((a, b) => b.s - a.s || b.r - a.r || a.v.name.localeCompare(b.v.name));
        const good = ranked.filter(x => x.s >= RT_ROBOTIC);
        const use = (RT.allVoices || !good.length) ? ranked : good;
        return {
            list: use.map(x => x.v), scores: use.map(x => x.s),
            matched: hit.length > 0, want: want,
            hidden: ranked.length - use.length, best: ranked.length ? ranked[0].s : 0
        };
    }

    function rtSpeak() {
        if (RT.at >= RT.items.length) { rtStop(); return; }
        if (rtNatural()) { rtSpeakNatural(); return; }
        if (!('speechSynthesis' in window)) { rtFail(); return; }
        const item = RT.items[RT.at];
        const u = new SpeechSynthesisUtterance(item.text);
        u.rate = RT.rate;
        u.lang = rtLang();
        const fit = RT.voice && (RT.voice.lang || '').split(/[-_]/)[0].toLowerCase()
                    === u.lang.split('-')[0].toLowerCase();
        if (!fit) { const v = rtVoices(u.lang); RT.voice = v.matched ? v.list[0] : null; }
        if (RT.voice) u.voice = RT.voice;
        u.onstart = () => { RT.errs = 0; };
        u.onend = () => { if (RT.on) { RT.at++; rtSpeak(); } };
        // If no usable voice is installed every utterance errors at once, and
        // without this the queue would silently tear through the whole chapter.
        u.onerror = e => {
            if (!RT.on) return;
            if (e && e.error === 'interrupted') return;
            RT.errs = (RT.errs || 0) + 1;
            if (RT.errs > 3) { rtFail(); return; }
            RT.at++; rtSpeak();
        };
        rtMark(item);
        speechSynthesis.speak(u);
        rtRender();
    }

    // Speech is unavailable on this device — say so rather than appearing to work.
    function rtFail() {
        rtStop();
        const bar = document.getElementById('rt-bar');
        if (!bar) return;
        bar.classList.add('show', 'rt-failed');
        bar.innerHTML = '<span class="rt-msg">No speech voice is available in this browser. ' +
            'Try a different browser, or add a voice in your system settings.</span>' +
            '<button class="rt-b rt-x" onclick="rtStop();document.getElementById(\'rt-bar\').remove();RTreset()" aria-label="Close">&times;</button>';
    }
    window.RTreset = function () { RT.wired = false; RT.on = false; RT.items = []; };

    // The CSS Custom Highlight API paints a Range without touching the DOM, so
    // the glossary spans, quiz buttons and the translator's saved markup are all
    // left exactly as they were. Where it is missing, the paragraph tint alone
    // still shows where the voice is.
    function rtHiInit() {
        if (RT.hi !== undefined) return;
        RT.hi = (window.CSS && CSS.highlights && typeof Highlight === 'function')
            ? new Highlight() : null;
        if (RT.hi) CSS.highlights.set('rt-sentence', RT.hi);
    }

    // A Range covering characters [from,to) of el.textContent, walking its text
    // nodes so a sentence that runs through a <span class="term"> still works.
    function rtRange(el, from, to) {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const r = document.createRange();
        let node, pos = 0, open = false;
        while ((node = walk.nextNode())) {
            const len = node.nodeValue.length;
            if (!open && pos + len > from) { r.setStart(node, from - pos); open = true; }
            if (open && pos + len >= to) { r.setEnd(node, to - pos); return r; }
            pos += len;
        }
        return null;
    }

    function rtMark(item) {
        document.querySelectorAll('.rt-now').forEach(e => e.classList.remove('rt-now'));
        rtHiInit();
        if (RT.hi) RT.hi.clear();
        if (!item || !item.el) return;
        const el = item.el;
        el.classList.add('rt-now');
        if (RT.hi && typeof item.from === 'number') {
            try {
                const r = rtRange(el, item.from, item.to);
                if (r) RT.hi.add(r);
            } catch (e) { /* highlighting is a nicety, never a blocker */ }
        }
        const b = el.getBoundingClientRect();
        if (b.top < 80 || b.bottom > innerHeight - 90) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    window.rtPlay = function (fromHere) {
        if (!('speechSynthesis' in window) && !rtNatAvailable()) return;
        rtEnsureBar();
        rtUnlockAudio();                                   // must happen inside the click
        if (RT.on && rtPaused()) { rtResumeEngine(); rtRender(); return; }
        if (RT.on) return;
        if (!RT.items.length || fromHere) rtBuild(fromHere !== false);
        // Selected a passage first? Start there rather than at the scroll line.
        if (fromHere) {
            const p = rtPointAt(null);
            if (p) { const i = rtIndexAt(p.el, p.off); if (i >= 0) RT.at = i; }
        }
        RT.on = true;
        rtHalt(false);
        // Chrome stops speaking if left alone; a periodic resume keeps it going.
        // Only the device engine needs it.
        clearInterval(RT.keep);
        RT.keep = setInterval(() => {
            if (RT.on && !rtNatural() && ('speechSynthesis' in window) && !speechSynthesis.paused) speechSynthesis.resume();
        }, 9000);
        rtSpeak();
    };
    window.rtPause = function () {
        if (!RT.on) return;
        if (rtPaused()) rtResumeEngine(); else rtPauseEngine();
        rtRender();
    };
    window.rtStop = function () {
        RT.on = false;
        clearInterval(RT.keep);
        rtHalt(true);
        if (window.NaturalVoice && NaturalVoice.paused()) NaturalVoice.resume();
        document.querySelectorAll('.rt-now').forEach(e => e.classList.remove('rt-now'));
        if (RT.hi) RT.hi.clear();
        rtRender();
    };
    // ===== CLICK OR SELECT TO MOVE THE VOICE =====
    // While a listening session is live, tapping a sentence (or selecting
    // inside it) sends the voice there. Only while it is live, so ordinary
    // reading, links, glossary terms and quiz buttons behave as before.

    // Safari's caret APIs are patchy — caretPositionFromPoint is very recent,
    // and caretRangeFromPoint happily answers with the paragraph element rather
    // than a text node, which used to land every click on sentence one. So the
    // caret API is only a hint now: anything that is not a real text node falls
    // through to measuring the glyphs, which behaves the same everywhere.
    // Where a click lands is worked out by measuring the rendered glyphs, not
    // by asking the browser's caret API. caretPositionFromPoint /
    // caretRangeFromPoint disagree between engines — Safari's answers drift by
    // a word or two and sometimes name the paragraph rather than the text —
    // whereas character boxes are character boxes everywhere.

    // Character offset of (node, offset) within host.textContent — the same
    // coordinate space the queue's from/to already use.
    function rtOffsetIn(host, node, offset) {
        // An element container (Safari hands one back for a triple-click) carries
        // a CHILD index, not a character offset — add up what comes before it.
        if (node.nodeType === 1) {
            let pos = 0;
            for (let i = 0; i < offset && i < node.childNodes.length; i++) {
                pos += (node.childNodes[i].textContent || '').length;
            }
            if (node === host) return pos;
            const inner = node.firstChild ? rtOffsetIn(host, node.firstChild, 0) : 0;
            return inner + pos;
        }
        const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
        let n, pos = 0;
        while ((n = walk.nextNode())) {
            if (n === node) return pos + offset;
            pos += n.nodeValue.length;
        }
        return 0;
    }

    // The queue entry holding character `off` of `el`; the last one in that
    // element if the click landed past its final sentence (trailing space).
    function rtIndexAt(el, off) {
        let best = -1;
        for (let i = 0; i < RT.items.length; i++) {
            const it = RT.items[i];
            if (it.el !== el) continue;
            if (off < it.to) return i;
            best = i;
        }
        return best;
    }

    function rtHintSeen() {
        try { localStorage.setItem('bio-rt-hint', '1'); } catch (e) {}
        const h = document.getElementById('rt-hint');
        if (h) h.hidden = true;
    }

    window.rtJump = function (el, off) {
        if (!el) return false;
        let i = rtIndexAt(el, off);
        // The queue may have been built from further down the page, in which
        // case this paragraph simply is not in it yet. Rebuild the whole
        // chapter and look again.
        if (i < 0) { const at = RT.at, cur = RT.items[at]; rtBuild(false); i = rtIndexAt(el, off);
            if (i < 0 && cur) { const j = rtIndexAt(cur.el, cur.from); if (j >= 0) RT.at = j; return false; } }
        if (i < 0) return false;
        RT.at = i;
        rtHalt(true);
        // Jumping is an instruction to read THAT, so a paused voice picks up again.
        if (RT.on && rtPaused()) rtResumeEngine();
        if (RT.on) rtSpeak(); else { rtMark(RT.items[i]); rtRender(); }
        rtHintSeen();
        return true;
    };

    // Character offset within el.textContent of the glyph under (x, y), found
    // by measuring. Two passes: the text node whose rects contain the point,
    // then the character inside it. A click in the margin snaps to the nearest
    // character on the same line, which is what a reader means by it.
    function rtOffsetFromPoint(el, x, y) {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const r = document.createRange();
        let n, base = 0, hit = null, hitBase = 0, near = null, nearD = Infinity, nearBase = 0;
        while ((n = walk.nextNode())) {
            const len = n.nodeValue.length;
            if (len) {
                r.setStart(n, 0); r.setEnd(n, len);
                for (const b of r.getClientRects()) {
                    if (!b.width && !b.height) continue;
                    // WebKit's range rects hug the glyphs rather than the line
                    // box, so at 1.7 line-height there is a real gap between
                    // lines. Nothing may contain the point; the nearest line
                    // then wins, weighted so the same line beats the same column.
                    const dy = y < b.top ? b.top - y : (y > b.bottom ? y - b.bottom : 0);
                    const dx = x < b.left ? b.left - x : (x > b.right ? x - b.right : 0);
                    if (!dy && !dx) { hit = n; hitBase = base; break; }
                    const d = dy * 4 + dx;
                    if (d < nearD) { nearD = d; near = n; nearBase = base; }
                }
            }
            if (hit) break;
            base += len;
        }
        const node = hit || near;
        if (!node) return null;
        const at = hit ? hitBase : nearBase;
        const len = node.nodeValue.length;
        let best = 0, bestD = Infinity;
        for (let i = 0; i < len; i++) {
            r.setStart(node, i); r.setEnd(node, i + 1);
            for (const b of r.getClientRects()) {
                if (!b.width && !b.height) continue;
                if (y >= b.top && y <= b.bottom && x >= b.left && x <= b.right) return at + i;
                const dy = y < b.top ? b.top - y : (y > b.bottom ? y - b.bottom : 0);
                const dx = x < b.left ? b.left - x : (x > b.right ? x - b.right : 0);
                const d = dy * 4 + dx;   // same line beats same column
                if (d < bestD) { bestD = d; best = at + i; }
            }
        }
        return best;
    }

    // Where the reader is pointing, as (element, offset).
    //
    // A click uses the click point. Safari can still be reporting the PREVIOUS
    // selection at mouseup, so a live selection is only believed when the
    // pointer is genuinely inside it — which is exactly the drag-to-select case,
    // where starting at the top of what you highlighted is what you meant.
    // With no event at all (the Listen button) the selection is all there is.
    function rtPointAt(e) {
        const block = 'h1, h2, h3, p, li, figcaption';
        const sel = getSelection();
        const live = sel && sel.rangeCount && !sel.isCollapsed ? sel.getRangeAt(0) : null;
        let selEl = null, selFrom = 0, selTo = 0;
        if (live) {
            const c = live.startContainer;
            const host = (c.nodeType === 1 ? c : c.parentNode).closest(block);
            if (host && main && main.contains(host)) {
                selEl = host;
                selFrom = rtOffsetIn(host, live.startContainer, live.startOffset);
                selTo = live.endContainer === live.startContainer || host.contains(live.endContainer)
                    ? rtOffsetIn(host, live.endContainer, live.endOffset) : Infinity;
            }
        }
        if (!e) return selEl ? { el: selEl, off: selFrom } : null;

        const el = e.target.closest ? e.target.closest(block) : null;
        if (!el || !main || !main.contains(el)) return null;
        const off = rtOffsetFromPoint(el, e.clientX, e.clientY);
        if (off === null) return null;
        if (selEl === el && off >= selFrom - 1 && off <= selTo + 1) return { el: el, off: selFrom };
        return { el: el, off: off };
    }

    function rtWireJump() {
        if (RT.jumpWired) return;
        RT.jumpWired = true;
        // Esc stops the reading — but only once the things that own Esc more
        // strongly (the lightbox, the translate panel, the search box, an open
        // dropdown) have had their turn.
        // The other keyboard owners — the lightbox, the translate panel, the
        // search box — close or act on the way up, so by the time these
        // handlers run there is no sign they were ever open. One Esc would shut
        // the figure AND stop the reading; one arrow would page the lightbox
        // AND step the voice. So their state is stamped in the capture phase,
        // before anyone has had a chance to act on it.
        const RT_KEYS = { Escape: 1, ArrowLeft: 1, ArrowRight: 1 };
        document.addEventListener('keydown', e => {
            if (!RT_KEYS[e.key]) return;
            RT.keyBusy = !!(document.querySelector('.lightbox:not([hidden])')
                || document.getElementById('tr-panel')
                || document.querySelector('.search-input.open, .search.open')
                || document.querySelector('.tp-panel:not([hidden])')
                || document.querySelector('.aa-popover.open'));
        }, true);

        // Esc stops; left and right walk the sentences, which is how you land
        // on the one you actually wanted.
        document.addEventListener('keydown', e => {
            if (!RT_KEYS[e.key] || !RT.on) return;
            if (RT.keyBusy || e.defaultPrevented) return;
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
            const t = e.target;
            // Form controls and the wheel sims own their own arrow keys.
            if (t && t.closest && t.closest('input, select, textarea, .sim, [contenteditable]')) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                rtStop();
                const btn = document.getElementById('btn-listen');
                if (btn) btn.focus();
                return;
            }
            if (!RT.items.length) return;
            e.preventDefault();
            rtStep(e.key === 'ArrowRight' ? 1 : -1);
        });

        document.addEventListener('mouseup', e => {
            if (!RT.on || !RT.items.length) return;
            if (!e.target.closest) return;
            if (e.target.closest('a, button, summary, input, select, textarea, label, .sim, .quiz, .rt-bar, .toolbar, .sidebar')) return;
            const p = rtPointAt(e);
            if (p) rtJump(p.el, p.off);
        });
    }

    window.rtStep = function (d) {
        if (!RT.items.length) return;
        RT.at = Math.max(0, Math.min(RT.items.length - 1, RT.at + d));
        rtHalt(true);
        // Stepping is an instruction to read THAT, so a paused voice picks up
        // again — otherwise the cancel leaves a paused engine with nothing in it.
        if (RT.on && rtPaused()) rtResumeEngine();
        if (RT.on) rtSpeak(); else { rtMark(RT.items[RT.at]); rtRender(); }
    };
    window.rtRate = function (r) {
        RT.rate = r;
        try { localStorage.setItem('bio-rt-rate', String(r)); } catch (e) {}
        if (RT.on) { rtHalt(true); rtSpeak(); }
        rtRender();
    };
    window.toggleListen = function () {
        if (rtCanSpeak() === false) {
            rtExplain(document.getElementById('btn-listen'),
                'This device has no ' + rtLangName() + ' voice, so Listen cannot read the translated page. ' +
                'Press \u201cBack to English\u201d to listen again.');
            return;
        }
        if (!('speechSynthesis' in window) && !rtNatAvailable()) return;
        if (RT.on && !rtPaused()) rtPause();
        else if (RT.on) rtPause();
        else rtPlay(true);
    };

    // The page's language just changed: the spoken queue and the chosen voice
    // both belong to the old one.
    function rtLangChanged() {
        rtHalt(true);
        RT.on = false; RT.items = []; RT.voice = null;
        if (RT.hi) RT.hi.clear();
        document.querySelectorAll('.rt-now').forEach(e => e.classList.remove('rt-now'));
        if (RT.refillVoices) RT.refillVoices();
        rtRender();
        rtAvailability();
    }

    // ===== CAN LISTEN READ THIS PAGE? =====
    // English always can: a natural voice, or the device's own. A translated page
    // needs a device voice for that language — the natural voices are English only —
    // and plenty of devices have none. Handing Chinese to an English voice gave
    // silence that looked like a broken button. So where there is no voice the button
    // is greyed out, and tapping it says why, until the page is back in English.
    // It is not simply disabled: on a tablet a disabled button cannot say anything.
    // Voices arrive a moment after the page loads, so "none yet" is not "none".
    function rtCanSpeak() {
        if (/^en/i.test(rtLang())) return ('speechSynthesis' in window) || rtNatAvailable();
        if (!('speechSynthesis' in window)) return false;
        if (!speechSynthesis.getVoices().length) return null;
        return rtVoices(rtLang()).matched;
    }
    function rtLangName() {
        try {
            const l = TR_LANGS.find(x => x[0] === rtLang());
            if (l) return l[1].split(' \u2014 ').pop();
        } catch (e) { }
        return rtLang();
    }
    function rtAvailability() {
        const btn = document.getElementById('btn-listen');
        if (!btn) return;
        const blocked = rtCanSpeak() === false;
        if (btn.dataset.title === undefined) btn.dataset.title = btn.title || '';
        btn.setAttribute('aria-disabled', blocked ? 'true' : 'false');
        btn.title = blocked ? 'No ' + rtLangName() + ' voice on this device' : btn.dataset.title;
    }
    function rtExplain(btn, msg) {
        let tip = document.getElementById('rt-explain');
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'rt-explain';
            tip.className = 'rt-explain';
            tip.setAttribute('role', 'status');
            document.body.appendChild(tip);
        }
        tip.textContent = msg;
        const r = btn.getBoundingClientRect();
        tip.style.top = Math.round(r.bottom + 8) + 'px';
        tip.style.left = Math.round(Math.max(8, Math.min(innerWidth - 308, r.left + r.width / 2 - 150))) + 'px';
        tip.hidden = false;
        clearTimeout(tip._t);
        tip._t = setTimeout(() => { tip.hidden = true; }, 6000);
    }

    function rtEnsureBar() {
        if (RT.wired) return;
        RT.wired = true;
        try { RT.rate = parseFloat(localStorage.getItem('bio-rt-rate')) || 1; } catch (e) {}
        const bar = document.createElement('div');
        bar.className = 'rt-bar';
        bar.id = 'rt-bar';
        bar.innerHTML =
            '<button class="rt-b" onclick="rtStep(-1)" aria-label="Previous sentence (left arrow)" title="Previous sentence (&larr;)">&#9198;</button>' +
            '<button class="rt-b rt-main" id="rt-toggle" onclick="rtPause()" aria-label="Pause">&#10074;&#10074;</button>' +
            '<button class="rt-b" onclick="rtStep(1)" aria-label="Next sentence (right arrow)" title="Next sentence (&rarr;)">&#9197;</button>' +
            '<span class="rt-pos" id="rt-pos"></span>' +
            '<span class="rt-sp">' +
            [0.8, 1, 1.25, 1.5].map(r => `<button class="rt-r" data-r="${r}" onclick="rtRate(${r})">${r}&times;</button>`).join('') +
            '</span>' +
            (rtNatAvailable()
                ? '<span class="rt-mode" role="group" aria-label="Voice type">' +
                  '<button class="rt-m" data-mode="natural" title="Natural voice \u2014 sounds the same on every device. Downloads once, about 75MB.">Natural</button>' +
                  '<button class="rt-m" data-mode="device" title="Device voice \u2014 built into this browser. Starts instantly, but varies from device to device.">Device</button>' +
                  '</span>'
                : '') +
            '<select class="rt-voice" id="rt-voice" aria-label="Voice"></select>' +
            '<span class="rt-note" id="rt-note" role="status" aria-live="polite"></span>' +
            '<button class="rt-b rt-x" onclick="rtStop()" aria-label="Stop reading (Esc)" title="Stop reading (Esc)">&times;</button>' +
            '<span class="rt-hint" id="rt-hint" hidden>Click any sentence to read from there &middot; &larr; &rarr; step &middot; Esc stops</span>';
        document.body.appendChild(bar);
        rtWireJump();
        let hintSeen = true;
        try { hintSeen = localStorage.getItem('bio-rt-hint') === '1'; } catch (e) {}
        if (!hintSeen) {
            const h = bar.querySelector('#rt-hint');
            if (h) { h.hidden = false; setTimeout(() => { h.hidden = true; }, 9000); }
        }
        const sel = bar.querySelector('#rt-voice');
        try { RT.allVoices = localStorage.getItem('bio-rt-allvoices') === '1'; } catch (e) {}
        // Which engine: the reader's own last choice, else "device" on a device that
        // has already proved too slow, else the course default.
        let savedMode = null, slow = false, savedNat = null;
        try {
            savedMode = localStorage.getItem('bio-rt-mode');
            slow = localStorage.getItem('bio-rt-slow') === '1';
            savedNat = localStorage.getItem('bio-rt-natvoice');
        } catch (e) { }
        RT.mode = rtNatAvailable() ? (savedMode || (slow ? 'device' : LISTEN.defaultMode)) : 'device';
        RT.natVoice = LISTEN.voices.some(v => v.id === savedNat) ? savedNat : LISTEN.voices[0].id;
        const modeBox = bar.querySelector('.rt-mode');
        if (modeBox) modeBox.addEventListener('click', e => {
            const b = e.target.closest('[data-mode]');
            if (!b || b.dataset.mode === RT.mode && RT.nvState !== 'failed') return;
            RT.mode = b.dataset.mode;
            try { localStorage.setItem('bio-rt-mode', RT.mode); } catch (e2) { }
            if (RT.mode === 'natural') {
                // an explicit choice deserves another try, even after a fallback
                if (RT.nvState === 'failed') RT.nvState = RT.nvReady ? 'ready' : 'idle';
                RT.nvNote = ''; RT.nvRtf = [];
                try { localStorage.removeItem('bio-rt-slow'); } catch (e2) { }
                rtUnlockAudio();
            }
            fillVoices();
            if (RT.on) { rtHalt(true); rtSpeak(); }
            rtRender();
        });
        const tierOf = sc => sc >= 85 ? 'Most natural' : sc >= 60 ? 'Online' : sc >= 40 ? 'Standard'
            : sc >= RT_ROBOTIC ? 'Older' : 'Robotic';
        function fillVoices() {
            if (rtNatural()) {
                sel.hidden = false;
                sel.title = 'Natural voices sound the same on every device';
                sel.innerHTML = LISTEN.voices.map((v, i) =>
                    '<option value="nat' + i + '"' + (v.id === RT.natVoice ? ' selected' : '') + '>' +
                    esc(v.label) + '</option>').join('');
                return;
            }
            const got = rtVoices();
            const vs = got.list;
            if (!vs.length) { sel.hidden = true; return; }
            sel.hidden = false;
            sel.title = got.matched ? '' :
                'No voice installed for this language — falling back to the device default';
            // grouped by tier so the good ones are visibly the good ones
            let html = '', open = '';
            vs.forEach((v, i) => {
                const t = tierOf(got.scores[i]);
                if (t !== open) { html += (open ? '</optgroup>' : '') + '<optgroup label="' + t + '">'; open = t; }
                html += `<option value="${i}">${esc(v.name)}${got.matched ? '' : ' (' + esc(v.lang) + ')'}</option>`;
            });
            if (open) html += '</optgroup>';
            if (got.hidden) html += '<option value="toggle">Show ' + got.hidden + ' robotic voices…</option>';
            else if (RT.allVoices) html += '<option value="toggle">Hide robotic voices</option>';
            // Nothing better than a standard voice installed: say that it can be fixed.
            if (got.best < 85) html += '<option disabled>More natural voices can be added in this device\u2019s speech settings</option>';
            sel.innerHTML = html;
            let saved = null;
            try { saved = localStorage.getItem('bio-rt-voice'); } catch (e) {}
            const k = vs.findIndex(v => v.name === saved);
            // a saved voice that is now hidden falls back to the best one, not the first one
            const pick = k >= 0 ? k : 0;
            sel.value = String(pick); RT.voice = vs[pick];
        }
        fillVoices();
        RT.refillVoices = fillVoices;
        if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', fillVoices);
        sel.addEventListener('change', () => {
            if (sel.value.indexOf('nat') === 0) {
                const v = LISTEN.voices[+sel.value.slice(3)];
                if (!v) return;
                RT.natVoice = v.id;
                try { localStorage.setItem('bio-rt-natvoice', v.id); } catch (e) { }
                rtUnlockAudio();
                if (RT.on) { rtHalt(true); rtSpeak(); }
                rtRender();
                return;
            }
            if (sel.value === 'toggle') {
                RT.allVoices = !RT.allVoices;
                try { localStorage.setItem('bio-rt-allvoices', RT.allVoices ? '1' : '0'); } catch (e) {}
                fillVoices();
                return;
            }
            const vs = rtVoices().list;
            RT.voice = vs[+sel.value] || null;
            try { localStorage.setItem('bio-rt-voice', RT.voice ? RT.voice.name : ''); } catch (e) {}
            if (RT.on) { rtHalt(true); rtSpeak(); }
        });
    }

    function rtRender() {
        const bar = document.getElementById('rt-bar');
        const btn = document.getElementById('btn-listen');
        if (btn) {
            btn.classList.toggle('active', RT.on);
            const lab = btn.querySelector('.tb-label');
            if (lab) lab.textContent = RT.on && !rtPaused() ? 'Pause' : 'Listen';
        }
        if (!bar) return;
        bar.classList.toggle('show', RT.on);
        const t = bar.querySelector('#rt-toggle');
        if (t) {
            const paused = rtPaused();
            t.innerHTML = paused ? '&#9654;' : '&#10074;&#10074;';
            t.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
        }
        const pos = bar.querySelector('#rt-pos');
        if (pos) pos.textContent = RT.items.length ? (RT.at + 1) + ' / ' + RT.items.length : '';
        bar.querySelectorAll('.rt-m').forEach(b => {
            const on = b.dataset.mode === (rtNatural() ? 'natural' : 'device');
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        const nat = bar.querySelector('.rt-m[data-mode="natural"]');
        if (nat) nat.disabled = !/^en/i.test(rtLang());   // natural voices are English only
        const note = bar.querySelector('#rt-note');
        if (note) {
            let msg = '';
            if (rtNatural() && RT.nvState === 'loading') {
                msg = 'Preparing natural voice\u2026 ' + (RT.nvPct != null ? RT.nvPct + '%'
                    : Math.round(RT.nvGot / 1048576) + ' MB');
            } else if (RT.nvNote && !rtNatural()) msg = RT.nvNote;
            else if (RT.mode === 'natural' && !/^en/i.test(rtLang())) msg = 'Natural voices are English only.';
            note.textContent = msg;
            note.hidden = !msg;
        }
        bar.querySelectorAll('.rt-r').forEach(b => {
            b.classList.toggle('on', parseFloat(b.dataset.r) === RT.rate);
        });
    }

    addEventListener('beforeunload', () => { try { speechSynthesis.cancel(); } catch (e) {} });
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', () => rtAvailability());
    // deferred: rtLang() reads the translator's state, which is declared further down
    setTimeout(rtAvailability, 0);


    // ===== READING TOOLS — translate, and pointers to the browser's own tools =====
    // Chromium 138+ exposes an on-device Translator: no key, no server, nothing
    // leaves the machine. Where it is missing (Safari, Firefox) the same button
    // shows the reader where their browser keeps its own translate instead, so
    // it is never a dead end.
    const TR_LANGS = [
        ['zh-Hant', '繁體中文 — Traditional Chinese'], ['zh', '简体中文 — Simplified Chinese'],
        ['ko', '한국어 — Korean'], ['ja', '日本語 — Japanese'],
        ['es', 'Español — Spanish'], ['fr', 'Français — French'],
        ['pt', 'Português — Portuguese'], ['de', 'Deutsch — German'],
        ['hi', 'हिन्दी — Hindi'], ['vi', 'Tiếng Việt — Vietnamese'],
        ['th', 'ไทย — Thai'], ['id', 'Bahasa Indonesia'],
        ['ar', 'العربية — Arabic'], ['ru', 'Русский — Russian']
    ];
    const TR = { on: false, busy: false, lang: null, saved: null };

    function trSupported() { return typeof Translator !== 'undefined'; }

    function trBrowser() {
        const ua = navigator.userAgent;
        if (/Edg\//.test(ua)) return 'edge';
        if (/OPR\//.test(ua)) return 'opera';
        if (/Firefox\//.test(ua)) return 'firefox';
        if (/Chrome\//.test(ua)) return 'chrome';
        if (/Safari\//.test(ua)) return 'safari';
        return 'other';
    }

    // Where each browser keeps its own reading tools. Menu paths rather than
    // keyboard shortcuts wherever possible, because the shortcuts move between
    // versions and the menus do not.
    const TR_HINTS = {
        edge: [['Reader', 'Press F9, or click the book icon in the address bar'],
               ['Read aloud', 'Right-click the page and choose Read aloud'],
               ['Translate', 'Click the translate icon at the right of the address bar']],
        chrome: [['Reader', 'Chrome has no built-in reader — use Focus in the toolbar above'],
                 ['Read aloud', 'Chrome has no built-in read-aloud — use Listen in the toolbar above'],
                 ['Translate', 'Right-click the page and choose Translate to…']],
        safari: [['Reader', 'View menu → Show Reader, or the ≡ icon at the left of the address bar'],
                 ['Read aloud', 'Edit → Speech → Start Speaking, or use Listen in the toolbar above'],
                 ['Translate', 'Click the Aa icon in the address bar and choose Translate']],
        firefox: [['Reader', 'Click the reader-view icon in the address bar'],
                  ['Read aloud', 'Open reader view, then use its listen control'],
                  ['Translate', 'Click the translate icon in the address bar']],
        opera: [['Reader', 'Use Focus in the toolbar above'],
                ['Read aloud', 'Use Listen in the toolbar above'],
                ['Translate', 'Right-click the page and choose Translate']],
        other: [['Reader', 'Use Focus in the toolbar above'],
                ['Read aloud', 'Use Listen in the toolbar above'],
                ['Translate', 'Look for a translate option in your browser menu']]
    };

    // What gets translated. Quiz option buttons are built from their <li>, so the
    // <li> itself must be left alone and the label span targeted instead —
    // replacing the <li> text would destroy the button.
    function trCollect() {
        if (!main) return [];
        const out = [];
        main.querySelectorAll('h1, h2, h3, h4, p, li, figcaption, summary, .quiz-stem').forEach(el => {
            if (el.closest('svg, .sim, .rt-bar, .tr-panel, .quiz-opt, .quiz-options')) return;
            if (el.querySelector('p, li, .quiz-stem')) return;
            if (el.textContent.trim().length > 1) out.push(el);
        });
        main.querySelectorAll('.quiz-opt > span:last-child').forEach(el => {
            if (el.textContent.trim().length > 1) out.push(el);
        });
        return out;
    }

    // The Translator API can hang rather than reject — a browser with the flag
    // off, a managed device, or no model service will simply never answer. Without
    // a deadline the panel sits on "Checking..." with its button disabled forever.
    function trDeadline(promise, ms, what) {
        let timer;
        const bell = new Promise((_, rej) => {
            timer = setTimeout(() => rej(new Error(what + ' timed out after ' + Math.round(ms / 1000) + 's')), ms);
        });
        return Promise.race([promise, bell]).finally(() => clearTimeout(timer));
    }

    window.openTranslate = function () {
        let p = document.getElementById('tr-panel');
        if (p) { p.remove(); return; }
        p = document.createElement('div');
        p.className = 'tr-panel';
        p.id = 'tr-panel';
        p.setAttribute('role', 'dialog');
        p.setAttribute('aria-label', 'Translate');

        // A tip that only points back at a toolbar button adds nothing in a
        // panel opened from that same toolbar.
        const hints = (TR_HINTS[trBrowser()] || TR_HINTS.other)
            .filter(([, v]) => !/toolbar above/.test(v));
        const own = hints.find(([k]) => k === 'Translate');

        let body;
        if (trSupported()) {
            body = '<div class="tr-row"><select id="tr-lang" aria-label="Language">' +
                '<option value="">Choose a language…</option>' +
                TR_LANGS.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('') +
                '</select>' +
                '<button class="tr-btn" id="tr-go" onclick="trRun()">Translate</button>' +
                '<button class="tr-btn" id="tr-back" onclick="trRestore()" hidden>Back to English</button>' +
                '</div><div class="tr-status" id="tr-status" aria-live="polite"></div>';
        } else {
            // This browser cannot translate the chapter from here, so its own
            // translator is the way — say how, rather than burying it in tips.
            body = '<p class="tr-lead">' + esc(own ? own[1] : 'Use the translate option in your browser\u2019s menu') + '.</p>' +
                '<p class="tr-alt">Or open this page in Chrome or Edge to choose a language here.</p>';
        }
        const rest = hints.filter(([k]) => trSupported() || k !== 'Translate');
        const more = rest.length
            ? '<details class="tr-more"><summary>Other ways to read</summary><ul class="tr-hints">' +
              rest.map(([k, v]) => '<li><b>' + esc(k) + '</b><span>' + esc(v) + '</span></li>').join('') +
              '</ul></details>'
            : '';

        p.innerHTML = '<div class="tr-label">Translate this chapter</div>' + body + more;
        closePopovers('.tr-wrap');
        (document.querySelector('.tr-wrap') || document.body).appendChild(p);
        // The panel is rebuilt each time it opens, so it has to be told what is
        // already true — otherwise "Back to English" hides itself while the page
        // is still translated and the reader has no way back.
        if (TR.on && trSupported()) {
            const sel = document.getElementById('tr-lang');
            if (sel) sel.value = TR.lang || '';
            const back = document.getElementById('tr-back');
            if (back) back.hidden = false;
            trStatus('Showing ' + trName(TR.lang) + '.');
        }
    };

    // "Español — Spanish" -> "Español": the name a reader of that language knows.
    function trName(code) {
        const hit = TR_LANGS.find(l => l[0] === code);
        return hit ? String(hit[1]).split(' — ')[0] : code;
    }

    // Keeps the toolbar honest: while translated the button reads as active and
    // names the language, so the way back is visible without opening the panel.
    function trBadge() {
        const b = document.getElementById('btn-translate');
        if (!b) return;
        b.classList.toggle('active', !!TR.on);
        const lab = b.querySelector('.tb-label');
        if (!lab) return;
        if (TR.on) {
            const name = (TR_LANGS.find(l => l[0] === TR.lang) || [null, TR.lang])[1] || '';
            lab.textContent = String(name).split(' — ')[0].slice(0, 10) || 'Translated';
            b.title = 'Showing a translation — open to go back to English';
        } else {
            lab.textContent = 'Translate';
            b.title = 'Translate this chapter';
        }
    }

    function trStatus(msg) {
        const s = document.getElementById('tr-status');
        if (s) s.textContent = msg;
    }

    window.trRun = async function () {
        if (TR.busy) return;
        const sel = document.getElementById('tr-lang');
        const lang = sel && sel.value;
        if (!lang) { trStatus('Choose a language first.'); return; }
        const els = trCollect();
        if (!els.length) { trStatus('Nothing to translate on this page.'); return; }
        TR.busy = true;
        document.getElementById('tr-go').disabled = true;
        try {
            trStatus('Checking ' + trName(lang) + '…');
            const avail = await trDeadline(
                Translator.availability({ sourceLanguage: 'en', targetLanguage: lang }),
                15000, 'Checking the language');
            if (avail === 'unavailable') {
                trStatus('This browser cannot translate into that language yet.');
                TR.busy = false; document.getElementById('tr-go').disabled = false; return;
            }
            // A first download is allowed to be slow, so each progress event
            // renews the deadline; total silence for 45s is treated as a stall.
            let alive = Date.now();
            const made = Translator.create({
                sourceLanguage: 'en', targetLanguage: lang,
                monitor(m) {
                    m.addEventListener('downloadprogress', e => {
                        alive = Date.now();
                        trStatus('Getting ' + trName(lang) + ' ready… ' + Math.round((e.loaded || 0) * 100) + '%');
                    });
                }
            });
            const stall = new Promise((_, rej) => {
                const iv = setInterval(() => {
                    if (Date.now() - alive > 45000) { clearInterval(iv); rej(new Error('Preparing the language stalled')); }
                }, 2000);
                made.finally(() => clearInterval(iv));
            });
            const translator = await Promise.race([made, stall]);
            if (!TR.saved) TR.saved = els.map(el => ({ el: el, html: el.innerHTML }));
            let done = 0;
            // A few at a time: fast enough, and it keeps the page responsive.
            const queue = els.slice();
            async function worker() {
                while (queue.length) {
                    const el = queue.shift();
                    const src = el.textContent.trim();
                    try {
                        const out = await translator.translate(src);
                        el.textContent = out;
                    } catch (e) { /* leave this one in English */ }
                    done++;
                    if (done % 5 === 0 || !queue.length) {
                        trStatus('Translating… ' + done + ' of ' + els.length);
                    }
                }
            }
            await Promise.all([worker(), worker(), worker()]);
            TR.on = true; TR.lang = lang;
            document.documentElement.setAttribute('lang', lang);
            trStatus('Done. Glossary pop-ups are off while the chapter is translated.');
            document.getElementById('tr-back').hidden = false;
            trBadge();
            rtLangChanged();
        } catch (e) {
            // The reason is for whoever maintains this, not for the student
            // reading it; they need the way round, which is their browser's own
            // translator — so open the tips rather than just pointing at them.
            console.warn('[translate]', e);
            trStatus('This chapter couldn\u2019t be translated here. Your browser\u2019s own translator can do it instead:');
            const more = document.querySelector('#tr-panel .tr-more');
            if (more) more.open = true;
        }
        TR.busy = false;
        const go = document.getElementById('tr-go');
        if (go) go.disabled = false;
    };

    window.trRestore = function () {
        if (!TR.saved) return;
        TR.saved.forEach(s => { s.el.innerHTML = s.html; });
        TR.saved = null; TR.on = false; TR.lang = null;
        document.documentElement.setAttribute('lang', 'en');
        trStatus('Back to English.');
        const b = document.getElementById('tr-back');
        if (b) b.hidden = true;
        trBadge();
        rtLangChanged();
    };

})();
