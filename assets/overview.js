/* =============================================================
   UNIT OVERVIEW PAGES
   -------------------------------------------------------------
   Three pieces of an overview are written as plain lists, so they
   still read sensibly anywhere the page is read as text (Present,
   Cards and Printout go through unit-content.js), and this file
   turns them into the designed versions on the page itself:

   <ul class="std-list">                      the unit's standards
     <li data-std="HS-LS1-2"><strong>HS-LS1-2</strong> — the question it answers</li>
   → a card: the standard's chip (linked to the standards page), the
     question, the full NGSS wording with its skill highlighted, and
     the chapters that address it — read from toc.js, so the chapter
     list follows the course when chapters are retagged.

   <div class="tgt-group" data-std="HS-LS1-2"> <h3>…</h3>
     <ul class="targets">
       <li data-at="u1-what-is-alive#alive" data-kind="sep|cc">I can …</li>
   → each "I can" statement gets a link to where it is taught (chapter
     and section; several allowed, comma separated), a badge for a
     practice or crosscutting concept, and the group heading gets the
     standard's chip. Section names are read from the chapters
     themselves once they have loaded, so a renamed section never
     leaves a stale label here.

   <ul class="do-list">
     <li data-at="u1-what-is-alive#hierarchy"><b>1.2</b> What you do</li>
   → a card per chapter's interactive, linked to where it sits.
   ============================================================= */
(function () {
    'use strict';
    const shell = window.COURSE_SHELL;
    const C = window.COURSE;
    if (!shell || !C || !shell.chapter) return;
    const ROOT = shell.root;
    const tag = window.COURSE_STANDARD_TAG || (code => '<span class="standard-tag">' + esc(code) + '</span>');
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const unit = shell.unitOf(shell.chapter.unit);
    const chById = id => (C.chapters || []).find(c => c.id === id);
    const numOf = t => (/^([\d.]+)\s/.exec(t) || [])[1] || '';
    const nameOf = t => String(t).replace(/^[\d.]+\s+/, '');
    const main = document.querySelector('main');
    if (!main || !unit) return;
    main.style.setProperty('--unit-h', unit.hue);

    // A link in the prose whose text is just a chapter number ("1.3") is
    // drawn as a pill, the same as the pills after each learning target,
    // and names its chapter in a tooltip.
    main.querySelectorAll('a[href]').forEach(a => {
        if (!/^\d+\.\d+$/.test(a.textContent.trim()) || a.closest('.progression, .lesson-table')) return;
        a.classList.add('ch-pill');
        const file = a.getAttribute('href').split('#')[0].split('/').pop();
        const ch = (C.chapters || []).find(c => c.file.split('/').pop() === file);
        if (ch && !a.title) a.title = ch.title;
    });

    // "Chapter.html#section" -> { ch, sec, href }
    function place(at) {
        const [id, sec] = String(at).split('#');
        const ch = chById(id.trim());
        if (!ch) return null;
        return { ch, sec: (sec || '').trim(), href: ROOT + ch.file + (sec ? '#' + sec.trim() : '') };
    }

    // ===== STANDARDS =====
    // The skill a standard asks for is the words before its first "to",
    // "that", "for", "about" or "based on": "Develop and use a model",
    // "Plan and conduct an investigation", "Evaluate the evidence".
    function statement(code) {
        let d = ((C.standards || {})[code] || {}).description || '';
        let title = '';
        const i = d.indexOf(' — ');           // the LS4 wordings open with a title
        if (i > -1) { title = d.slice(0, i); d = d.slice(i + 3); d = d.charAt(0).toUpperCase() + d.slice(1); }
        const m = /^(.*?)(?=\s(?:to|that|for|about|based on)\s)/.exec(d);
        const verb = m ? m[1] : '';
        return { title, html: verb ? '<mark class="std-verb">' + esc(verb) + '</mark>' + esc(d.slice(verb.length)) : esc(d) };
    }
    main.querySelectorAll('ul.std-list').forEach(list => {
        const grid = document.createElement('div');
        grid.className = 'std-cards';
        [...list.children].forEach(li => {
            const code = li.dataset.std;
            if (!code) return;
            // the authored line is "<strong>CODE</strong>: question"
            const q = li.cloneNode(true);
            const lead = q.querySelector('strong');
            if (lead && lead.textContent.trim() === code) lead.remove();
            const question = q.innerHTML.replace(/^\s*(?:—|&mdash;|-|:)\s*/, '').trim();
            const s = statement(code);
            const chs = shell.chaptersInUnit(unit).filter(c => c.kind !== 'Overview' && (c.standards || []).includes(code));
            const card = document.createElement('div');
            card.className = 'std-card';
            card.id = 'std-' + code;
            card.innerHTML =
                '<div class="std-card-top">' + tag(code) +
                    (s.title ? '<span class="std-card-title">' + esc(s.title) + '</span>' : '') + '</div>' +
                '<p class="std-card-q">' + question + '</p>' +
                '<p class="std-card-text">' + s.html + '</p>' +
                (chs.length ? '<div class="std-card-chs"><span>Chapters</span>' +
                    chs.map(c => '<a href="' + ROOT + c.file + '" title="' + esc(c.title) + '">' + esc(numOf(c.title) || nameOf(c.title)) + '</a>').join('') +
                '</div>' : '');
            grid.appendChild(card);
        });
        list.replaceWith(grid);
    });

    // ===== LEARNING TARGETS =====
    const KIND = {
        sep: ['Practice', 'A science and engineering practice: a skill scientists use'],
        cc: ['Crosscutting', 'A crosscutting concept: an idea that runs through every area of science']
    };
    main.querySelectorAll('.tgt-group[data-std]').forEach(g => {
        const h = g.querySelector('h3');
        const codes = g.dataset.std.split(',').map(s => s.trim()).filter(Boolean);
        if (h && codes.length) h.insertAdjacentHTML('beforeend', '<span class="tgt-stds">' + codes.map(tag).join('') + '</span>');
    });
    const wanted = new Set();      // units whose section names we need
    // Each target reads: the statement, then its Practice / Crosscutting tag,
    // then one small pill per chapter that teaches it. A chapter named for
    // several sections still gets one pill (linked to the first section);
    // the section names go in its tooltip.
    main.querySelectorAll('ul.targets > li').forEach(li => {
        const kind = KIND[li.dataset.kind];
        const body = document.createElement('span');
        body.className = 'tgt-text';
        while (li.firstChild) body.appendChild(li.firstChild);
        li.appendChild(body);
        if (kind) body.insertAdjacentHTML('beforeend', ' <span class="tgt-kind tgt-' + li.dataset.kind + '" title="' + esc(kind[1]) + '">' + kind[0] + '</span>');
        const places = (li.dataset.at || '').split(',').map(place).filter(Boolean);
        if (!places.length) return;
        const byCh = new Map();
        places.forEach(p => {
            wanted.add(p.ch.unit);
            if (!byCh.has(p.ch.id)) byCh.set(p.ch.id, { first: p, secs: [] });
            if (p.sec) byCh.get(p.ch.id).secs.push(p.sec);
        });
        li.insertAdjacentHTML('beforeend', ' <span class="tgt-where">' + [...byCh.values()].map(g =>
            '<a href="' + esc(g.first.href) + '" data-ch="' + esc(g.first.ch.id) + '" data-secs="' + esc(g.secs.join(',')) + '"' +
                ' title="' + esc(g.first.ch.title) + '">' + esc(numOf(g.first.ch.title) || nameOf(g.first.ch.title)) + '</a>').join('') + '</span>');
    });

    // ===== WHAT YOU WILL DO =====
    main.querySelectorAll('ul.do-list').forEach(list => {
        const grid = document.createElement('div');
        grid.className = 'do-cards';
        [...list.children].forEach(li => {
            const p = place(li.dataset.at || '');
            const c = li.cloneNode(true);
            const b = c.querySelector('b');
            if (b) b.remove();
            const card = document.createElement(p ? 'a' : 'div');
            card.className = 'do-card';
            if (p) card.href = p.href;
            card.innerHTML =
                (p ? '<span class="do-ch"><b>' + esc(numOf(p.ch.title)) + '</b> ' + esc(nameOf(p.ch.title)) + '</span>' : '') +
                '<span class="do-text">' + c.innerHTML.trim() + '</span>' +
                (p ? '<span class="do-go" aria-hidden="true">Open →</span>' : '');
            grid.appendChild(card);
        });
        list.replaceWith(grid);
    });

    // ===== SECTION NAMES FOR THE PILLS' TOOLTIPS =====
    // Loaded after the page is drawn; until then a pill's tooltip names the chapter.
    if (!wanted.size || location.protocol === 'file:') return;
    const load = window.UnitContent ? Promise.resolve()
        : new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = ROOT + 'assets/unit-content.js?v=' + shell.assetV;
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    load.then(() => Promise.all([...wanted].map(id => UnitContent.load(id).catch(() => null))))
        .then(units => {
            const titles = {};
            units.filter(Boolean).forEach(u => u.chapters.forEach(ch => ch.sections.forEach(s => { titles[ch.id + '#' + s.id] = s.title; })));
            main.querySelectorAll('.tgt-where a[data-secs]').forEach(a => {
                const names = a.dataset.secs.split(',').map(s => titles[a.dataset.ch + '#' + s]).filter(Boolean);
                if (names.length) a.title = a.title + ' — ' + names.join('; ');
            });
        })
        .catch(() => { });
})();
