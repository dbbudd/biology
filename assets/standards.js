/* =============================================================
   CURRICULUM STANDARDS — a coverage matrix
   -------------------------------------------------------------
   Rows are standards, columns are units, and each cell is shaded
   by how many sections address that standard in that unit. So the
   page answers, at a glance, the questions a list of links cannot:
   which unit owns which standards, which standards run across
   units, which are thin, and which are not addressed at all.

   Click a row to reveal the full performance expectation and every
   section that addresses it. The same rows can be regrouped by the
   Science and Engineering Practice each standard asks for — one of
   the three NGSS dimensions the contents page explains — which
   shows what the course asks students to DO, not only what it asks
   them to know.

   Data: chapter-level coverage from assets/toc.js, section-level
   from each chapter's <section data-standards="…">, fetched and
   parsed. That attribute is split on commas OR whitespace — five
   sections in 2.6, 5.2 and 5.6 separate their codes with a space,
   and a comma-only split read "HS-LS1-7 HS-LS2-3" as one code and
   credited neither.

   A URL hash naming a standard (#HS-LS1-4) opens that row, so a
   chapter can link straight to its standard here.
   ============================================================= */
(function () {
    'use strict';
    const host = document.getElementById('standards-app');
    if (!host || !window.COURSE) return;
    const C = window.COURSE;
    const STD = C.standards || {};
    const UNITS = C.units || [];
    const ROOT = (window.COURSE_SHELL && window.COURSE_SHELL.root) || '../';
    const esc = s => String(s).replace(/[&<>"]/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const split = v => String(v || '').split(/[\s,]+/).map(x => x.trim()).filter(Boolean);

    // NGSS core ideas. The names are the framework's own.
    const DCI = {
        LS1: 'From Molecules to Organisms: Structures and Processes',
        LS2: 'Ecosystems: Interactions, Energy, and Dynamics',
        LS3: 'Heredity: Inheritance and Variation of Traits',
        LS4: 'Biological Evolution: Unity and Diversity'
    };
    // NGSS Science and Engineering Practices, in the framework's order.
    const SEP = {
        1: 'Asking questions',
        2: 'Developing and using models',
        3: 'Planning and carrying out investigations',
        4: 'Analyzing and interpreting data',
        5: 'Using mathematics and computational thinking',
        6: 'Constructing explanations',
        7: 'Engaging in argument from evidence',
        8: 'Obtaining, evaluating and communicating information'
    };
    // A short label for each row, and the practice its opening verb names.
    // Written from each standard's own wording; a code missing here falls back
    // to the start of its description rather than breaking the page.
    const META = {
        'HS-LS1-1': ['DNA shapes proteins', 6],
        'HS-LS1-2': ['Systems within organisms', 2],
        'HS-LS1-3': ['Feedback and homeostasis', 3],
        'HS-LS1-4': ['Mitosis and differentiation', 2],
        'HS-LS1-5': ['Photosynthesis', 2],
        'HS-LS1-6': ['Building large carbon molecules', 6],
        'HS-LS1-7': ['Cellular respiration', 2],
        'HS-LS2-1': ['Carrying capacity', 5],
        'HS-LS2-2': ['Biodiversity and populations', 5],
        'HS-LS2-3': ['Matter and energy, with and without oxygen', 6],
        'HS-LS2-4': ['Energy through a food web', 5],
        'HS-LS2-5': ['The carbon cycle', 2],
        'HS-LS2-6': ['Ecosystem stability and change', 7],
        'HS-LS2-8': ['Group behaviour and survival', 7],
        'HS-LS3-1': ['DNA, chromosomes and traits', 1],
        'HS-LS3-2': ['Where genetic variation comes from', 7],
        'HS-LS3-3': ['Probability and trait distribution', 5],
        'HS-LS4-1': ['Evidence of common ancestry', 8],
        'HS-LS4-2': ['The four factors of natural selection', 6],
        'HS-LS4-3': ['Advantageous traits spread', 5],
        'HS-LS4-4': ['Selection leads to adaptation', 6],
        'HS-LS4-5': ['Change, speciation and extinction', 7]
    };
    const shortOf = code => (META[code] && META[code][0]) ||
        String((STD[code] || {}).description || code).split(/\s+/).slice(0, 5).join(' ') + '…';
    const sepOf = code => (META[code] && META[code][1]) || null;
    const dciOf = code => (/LS(\d)/.exec(code) || [])[0] || 'Other';
    // The LS4 descriptions carry a title before an em dash; the practice
    // text is what follows it.
    const bodyOf = code => {
        const d = (STD[code] || {}).description || '';
        const i = d.indexOf(' — ');
        return i > -1 ? d.slice(i + 3).replace(/^./, c => c.toUpperCase()) : d;
    };

    // ---------- coverage ----------
    // code -> unitId -> { chapters: Map(chapterId -> {chapter, sections[]}) }
    const cov = {};
    const codes = Object.keys(STD).sort((a, b) =>
        a.localeCompare(b, 'en', { numeric: true }));
    codes.forEach(c => { cov[c] = {}; });
    const slot = (code, ch) => {
        cov[code] = cov[code] || {};
        const u = cov[code][ch.unit] = cov[code][ch.unit] || { chapters: new Map() };
        if (!u.chapters.has(ch.id)) u.chapters.set(ch.id, { chapter: ch, sections: [] });
        return u.chapters.get(ch.id);
    };
    C.chapters.forEach(ch => (ch.standards || []).forEach(code => slot(code, ch)));

    async function readSections() {
        const ready = C.chapters.filter(c => c.status !== 'planned');
        let ok = true;
        await Promise.all(ready.map(async ch => {
            try {
                const res = await fetch(ROOT + ch.file);
                if (!res.ok) throw new Error(res.status);
                const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
                doc.querySelectorAll('main > section[data-standards]').forEach(sec => {
                    const h = sec.querySelector('h2, h1');
                    const title = h ? h.textContent.trim() : sec.id;
                    split(sec.dataset.standards).forEach(code => {
                        const s = slot(code, ch);
                        if (!s.sections.some(x => x.id === sec.id)) s.sections.push({ id: sec.id, title });
                    });
                });
            } catch (e) { ok = false; }
        }));
        return ok;
    }

    const cellOf = (code, unitId) => {
        const u = (cov[code] || {})[unitId];
        if (!u) return { sections: 0, chapters: 0 };
        let n = 0; u.chapters.forEach(v => { n += v.sections.length; });
        return { sections: n, chapters: u.chapters.size };
    };
    const totalOf = code => UNITS.reduce((a, u) => a + cellOf(code, u.id).sections, 0);
    const touchedOf = code => UNITS.filter(u => cellOf(code, u.id).chapters > 0).length;

    // ---------- state ----------
    let groupBy = 'dci';
    const open = new Set();

    // ---------- render ----------
    function render() {
        const max = Math.max(1, ...codes.flatMap(c => UNITS.map(u => cellOf(c, u.id).sections)));
        const covered = codes.filter(c => touchedOf(c) > 0);
        const gaps = codes.filter(c => touchedOf(c) === 0);
        const spans = codes.filter(c => touchedOf(c) > 1);

        const summary =
            '<div class="std-summary">' +
                stat(codes.length, 'standards') +
                stat(covered.length, 'addressed') +
                stat(spans.length, 'span more than one unit') +
                stat(gaps.length, 'not yet addressed', gaps.length ? 'gap' : '') +
            '</div>';

        const controls =
            '<div class="std-controls">' +
                '<div class="std-seg" role="group" aria-label="Group standards by">' +
                    '<span class="std-seg-label">Group by</span>' +
                    seg('dci', 'Core idea') + seg('sep', 'Practice') +
                '</div>' +
                '<button type="button" class="std-btn" data-act="all">' +
                    (open.size === codes.length ? 'Collapse all' : 'Expand all') + '</button>' +
            '</div>';

        const head =
            '<div class="std-row std-head" role="row">' +
                '<span class="std-lab" role="columnheader">Standard</span>' +
                UNITS.map(u => '<span class="std-uhead" role="columnheader" style="--unit-h:' + u.hue +
                    '" title="' + esc(u.label) + '">U' + esc(unitNum(u)) + '</span>').join('') +
                '<span class="std-tot" role="columnheader" title="Sections, across the course">Σ</span>' +
            '</div>';

        // groups
        const groups = [];
        if (groupBy === 'dci') {
            Object.keys(DCI).forEach(k => {
                const rows = codes.filter(c => dciOf(c) === k);
                if (rows.length) groups.push({ key: k, title: k, sub: DCI[k], rows });
            });
            const other = codes.filter(c => !DCI[dciOf(c)]);
            if (other.length) groups.push({ key: 'other', title: 'Other', sub: '', rows: other });
        } else {
            Object.keys(SEP).forEach(k => {
                const rows = codes.filter(c => String(sepOf(c)) === k);
                if (rows.length) groups.push({ key: 'sep' + k, title: 'Practice ' + k, sub: SEP[k], rows });
            });
            const none = codes.filter(c => !sepOf(c));
            if (none.length) groups.push({ key: 'sepnone', title: 'Unassigned', sub: '', rows: none });
        }

        const body = groups.map(g =>
            '<div class="std-group" role="rowgroup">' +
                '<div class="std-ghead"><b>' + esc(g.title) + '</b>' +
                (g.sub ? '<span>' + esc(g.sub) + '</span>' : '') +
                '<em>' + g.rows.length + '</em></div>' +
                g.rows.map(code => row(code, max)).join('') +
            '</div>').join('');

        const legend =
            '<div class="std-legend">' +
                '<span class="std-key"><i class="std-swatch" style="--a:.18"></i><i class="std-swatch" style="--a:.5"></i>' +
                '<i class="std-swatch" style="--a:.95"></i> sections in that unit — darker is more</span>' +
                '<span class="std-key"><i class="std-swatch std-mention"></i> covered across a chapter</span>' +
                '<span class="std-key"><i class="std-swatch std-none"></i> not addressed</span>' +
            '</div>';


        host.innerHTML = summary + controls +
            '<div class="std-matrix" role="table" aria-label="Standards against units" style="--nu:' + UNITS.length + '">' + head + body + '</div>' +
            legend;
    }

    function stat(n, label, cls) {
        return '<div class="std-stat' + (cls ? ' ' + cls : '') + '"><b>' + n + '</b><span>' + esc(label) + '</span></div>';
    }
    function seg(val, label) {
        return '<button type="button" class="std-segbtn' + (groupBy === val ? ' on' : '') +
               '" data-group="' + val + '" aria-pressed="' + (groupBy === val) + '">' + esc(label) + '</button>';
    }
    function unitNum(u) { return (/(\d+)/.exec(u.label) || [])[1] || '?'; }

    function row(code, max) {
        const isOpen = open.has(code);
        const tot = totalOf(code), touched = touchedOf(code);
        const cells = UNITS.map(u => {
            const c = cellOf(code, u.id);
            if (!c.chapters) return '<span class="std-cell std-none" role="cell" aria-label="' + esc(u.label) + ': not addressed"></span>';
            if (!c.sections) return '<span class="std-cell std-mention" role="cell" style="--unit-h:' + u.hue +
                '" title="' + esc(u.label) + ' — covered across ' + (c.chapters > 1 ? c.chapters + ' chapters' : 'a chapter') +
                '" aria-label="' + esc(u.label) + ': covered across a chapter">·</span>';
            // square-root scale, so one section is visible and thirty is not a wall
            const a = 0.16 + 0.8 * Math.sqrt(c.sections / max);
            return '<span class="std-cell" role="cell" style="--unit-h:' + u.hue + ';--a:' + a.toFixed(2) +
                '" title="' + esc(u.label) + ' — ' + c.sections + ' section' + (c.sections > 1 ? 's' : '') +
                ' in ' + c.chapters + ' chapter' + (c.chapters > 1 ? 's' : '') + '">' +
                '<span class="' + (a > 0.55 ? 'std-n light' : 'std-n') + '">' + c.sections + '</span></span>';
        }).join('');
        const flag = touched === 0 ? '<span class="std-flag gap">not yet addressed</span>'
                   : (tot > 0 && tot <= 3 ? '<span class="std-flag thin">thin</span>' : '');
        return '<div class="std-item' + (isOpen ? ' open' : '') + (touched === 0 ? ' is-gap' : '') + '" id="' + esc(code) + '">' +
            '<button type="button" class="std-row" role="row" aria-expanded="' + isOpen + '" ' +
                    'aria-controls="std-d-' + esc(code) + '" data-code="' + esc(code) + '">' +
                '<span class="std-lab" role="rowheader">' +
                    '<span class="std-chev" aria-hidden="true"></span>' +
                    '<code>' + esc(code) + '</code>' +
                    '<span class="std-short">' + esc(shortOf(code)) + '</span>' + flag +
                '</span>' +
                cells +
                '<span class="std-tot" role="cell">' + (tot || (touched ? '·' : '—')) + '</span>' +
            '</button>' +
            '<div class="std-detail" id="std-d-' + esc(code) + '"' + (isOpen ? '' : ' hidden') + '>' +
                (isOpen ? detail(code) : '') +
            '</div>' +
        '</div>';
    }

    function detail(code) {
        const sep = sepOf(code), dci = dciOf(code);
        let h = '<p class="std-body">' + esc(bodyOf(code)) + '</p>' +
            '<div class="std-tags">' +
                (DCI[dci] ? '<span class="std-tag">Core idea · ' + esc(dci) + '</span>' : '') +
                (sep ? '<span class="std-tag">Practice ' + sep + ' · ' + esc(SEP[sep]) + '</span>' : '') +
            '</div>';
        const units = UNITS.filter(u => cellOf(code, u.id).chapters > 0);
        if (!units.length) {
            h += '<p class="std-empty">The course does not cover this standard yet.</p>';
            return h;
        }
        h += '<div class="std-where">';
        units.forEach(u => {
            const block = cov[code][u.id];
            h += '<div class="std-unit" style="--unit-h:' + u.hue + '"><div class="std-unit-name">' + esc(u.label) + '</div>';
            block.chapters.forEach(({ chapter: ch, sections }) => {
                const href = ROOT + ch.file;
                h += '<div class="std-chap">' +
                    (ch.status === 'planned'
                        ? '<span class="std-chap-title planned">' + esc(ch.title) + ' (planned)</span>'
                        : '<a class="std-chap-title" href="' + esc(href) + '">' + esc(ch.title) + '</a>') +
                    (sections.length
                        ? '<div class="std-secs">' + sections.map(s =>
                            '<a class="std-sec" href="' + esc(href + '#' + s.id) + '">' + esc(s.title) + '</a>').join('') + '</div>'
                        : '<div class="std-secs"><span class="std-sec none">Covered across the whole chapter</span></div>') +
                '</div>';
            });
            h += '</div>';
        });
        return h + '</div>';
    }

    // ---------- interaction ----------
    host.addEventListener('click', e => {
        const r = e.target.closest('.std-row[data-code]');
        if (r) { toggle(r.dataset.code); return; }
        const g = e.target.closest('[data-group]');
        if (g) { groupBy = g.dataset.group; render(); return; }
        const all = e.target.closest('[data-act="all"]');
        if (all) {
            if (open.size === codes.length) open.clear(); else codes.forEach(c => open.add(c));
            render();
        }
    });

    // Open one row in place rather than re-rendering the page, so the reader's
    // scroll position and focus survive the click.
    function toggle(code, force) {
        const want = typeof force === 'boolean' ? force : !open.has(code);
        if (want) open.add(code); else open.delete(code);
        const item = document.getElementById(code);
        if (!item) return;
        const btn = item.querySelector('.std-row'), d = item.querySelector('.std-detail');
        item.classList.toggle('open', want);
        btn.setAttribute('aria-expanded', String(want));
        if (want) { d.innerHTML = detail(code); d.hidden = false; }
        else { d.hidden = true; }
        const all = host.querySelector('[data-act="all"]');
        if (all) all.textContent = open.size === codes.length ? 'Collapse all' : 'Expand all';
        if (want) history.replaceState(null, '', '#' + code);
    }

    function openFromHash() {
        const code = decodeURIComponent(location.hash.slice(1));
        if (!code || !(code in cov)) return;
        toggle(code, true);
        const el = document.getElementById(code);
        if (el) el.scrollIntoView({ block: 'center' });
    }

    render();
    readSections().then(() => { render(); openFromHash(); });
    addEventListener('hashchange', openFromHash);
    addEventListener('themechange', render);
})();
