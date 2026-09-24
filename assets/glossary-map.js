/* =============================================================
   GLOSSARY WORD MAP
   -------------------------------------------------------------
   The glossary page. One word sits in the middle with its
   definition. The words its definition uses sit on the left
   ("Built on"); the words whose definitions use it sit on the
   right ("Leads to"). Tapping any word moves it to the middle, so
   a student can follow an idea from word to word. A search box
   and each unit's words, listed by chapter, are the ways in.

   Nothing here is stored separately from the course:
     - the links come from the definitions in COURSE.glossary (toc.js)
     - each word's unit and chapter come from the chapters themselves,
       read through unit-content.js (the first unit that marks the word)
   so the map follows the content as it is edited.

   (A whole-course cluster view was tried on 2026-09-23 and dropped:
   the one-word view made more sense to read.)

   GlossaryMap.mount(el, { unitId, word })   build the map in el
   GlossaryMap.show(key)                     centre on a glossary key
   GlossaryMap.keyFor(text)                  glossary key for a word or slug, or null
   ============================================================= */
(function () {
    'use strict';
    if (window.GlossaryMap) return;

    const COURSE = window.COURSE || { glossary: {}, units: [], chapters: [] };
    const G = COURSE.glossary || {};
    const KEYS = Object.keys(G);
    const UNITS = COURSE.units || [];
    const unitIndex = id => { const i = UNITS.findIndex(u => u.id === id); return i < 0 ? 99 : i; };
    const unitById = id => UNITS.find(u => u.id === id);
    const unitNo = u => u.label.split(' — ')[0];
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const byLower = {}, bySlug = {};
    KEYS.forEach(k => { byLower[k.toLowerCase()] = k; bySlug[slug(k)] = k; });
    const keyFor = text => {
        const t = String(text || '').trim().toLowerCase();
        return byLower[t] || bySlug[t] || null;
    };
    const DUR = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480;
    // Timers, not requestAnimationFrame: frames are frozen in a hidden tab,
    // which would leave a half-finished animation waiting there.
    const frame = cb => setTimeout(() => cb(performance.now()), 16);

    // ===== LINKS, READ FROM THE DEFINITIONS =====
    // A definition "uses" another word when it names it, plural included
    // (gene/genes, nucleus/nuclei, mitochondrion/mitochondria). Longer words
    // are matched first and claim their text, so "gene expression" links to
    // Gene expression and not also to Gene.
    function forms(k) {
        const w = k.toLowerCase();
        const f = new Set([w, w + 's', w + 'es']);
        if (/[^aeiou]y$/.test(w)) f.add(w.slice(0, -1) + 'ies');
        if (/us$/.test(w)) f.add(w.slice(0, -2) + 'i');
        if (/um$/.test(w)) f.add(w.slice(0, -2) + 'a');
        if (/on$/.test(w)) f.add(w.slice(0, -2) + 'a');
        if (/is$/.test(w)) f.add(w.slice(0, -2) + 'es');
        if (/a$/.test(w)) f.add(w + 'e');
        return [...f].sort((a, b) => b.length - a.length);
    }
    // Everyday phrases that contain a glossary word without meaning it.
    // Add one here if the map ever links two words that are not related.
    const NOT_A_TERM = [
        /\bno matter\b/gi,              // "no matter how crowded" is not Matter
        /\bcarrier molecules?\b/gi,     // NADH's electron carrier is not a genetic Carrier
        /\bequal rates?\b/gi            // "at equal rates" is not Rate
    ];
    const MATCHERS = KEYS
        .map(k => ({ k, re: new RegExp('\\b(?:' + forms(k).map(reEsc).join('|') + ')\\b', 'gi') }))
        .sort((a, b) => b.k.length - a.k.length);

    const SPANS = {}, USES = {}, USED_BY = {};
    KEYS.forEach(k => { USES[k] = []; USED_BY[k] = []; });
    KEYS.forEach(a => {
        const text = String(G[a]);
        const taken = [], spans = [];
        NOT_A_TERM.forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(text))) taken.push([m.index, m.index + m[0].length]); });
        MATCHERS.forEach(({ k, re }) => {
            re.lastIndex = 0;
            let m;
            while ((m = re.exec(text))) {
                const s = m.index, e = s + m[0].length;
                if (taken.some(t => s < t[1] && e > t[0])) continue;
                taken.push([s, e]);
                if (k !== a) spans.push({ s, e, k });
            }
        });
        spans.sort((x, y) => x.s - y.s);
        SPANS[a] = spans;
        [...new Set(spans.map(x => x.k))].forEach(b => { USES[a].push(b); USED_BY[b].push(a); });
    });
    const degree = k => USES[k].length + USED_BY[k].length;

    // ===== WHERE EACH WORD IS TAUGHT =====
    const INFO = {};          // key -> { unitId, chapterTitle, url }
    let allLoaded = false;
    function assign(unit) {
        unit.terms.forEach(t => {
            const cur = INFO[t.key];
            if (!cur || unitIndex(unit.id) < unitIndex(cur.unitId)) {
                INFO[t.key] = { unitId: unit.id, chapterTitle: t.chapterTitle, url: t.url };
            }
        });
    }
    const hueOf = k => { const i = INFO[k]; const u = i && unitById(i.unitId); return u ? u.hue : null; };
    function paint(el, k) {
        const h = hueOf(k);
        if (h === null) { el.classList.add('gm-nohue'); el.style.removeProperty('--unit-h'); }
        else { el.classList.remove('gm-nohue'); el.style.setProperty('--unit-h', h); }
    }

    // ===== STATE =====
    const S = {
        root: null, stage: null, svg: null, card: null, headL: null, headR: null,
        trailEl: null, indexEl: null, legendEl: null, unitSel: null,
        unitId: null, centre: null, trail: [], expanded: { l: false, r: false },
        nodes: new Map(),     // id -> node { id, key, kind, side, el, path, x, y, o, tx, ty, to, w, h, leaving }
        card0: { x: 0, y: 0, tx: 0, ty: 0 },
        geo: null, timer: 0
    };
    const VISIBLE = 9;        // words per side before "+ N more"
    const ROW = 42;           // vertical spacing of words, wide layout
    const TOP = 48;           // room for the two side headings
    const GAP = 34;           // card edge to nearest word
    const CHIP = 170;         // widest a word may be (matches the CSS)

    // ===== BUILD =====
    function mount(el, opts) {
        opts = opts || {};
        S.root = el;
        el.classList.add('gm');
        el.innerHTML =
            '<div class="gm-bar">' +
                '<form class="gm-find" role="search">' +
                    '<svg class="gm-find-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>' +
                    '<input type="search" list="gm-words" placeholder="Search for a word…" aria-label="Search for a word" autocomplete="off">' +
                    '<datalist id="gm-words">' + KEYS.slice().sort().map(k => `<option value="${esc(k)}">`).join('') + '</datalist>' +
                '</form>' +
                '<label class="gm-unit-pick"><span>Words in</span>' +
                    '<select class="gm-unit">' +
                        UNITS.map(u => `<option value="${esc(u.id)}">${esc(unitNo(u))} · ${esc(u.short || '')}</option>`).join('') +
                    '</select>' +
                '</label>' +
            '</div>' +
            '<nav class="gm-trail" aria-label="Words you have visited"></nav>' +
            '<div class="gm-stage">' +
                '<svg class="gm-lines" aria-hidden="true"></svg>' +
                '<div class="gm-head gm-head-l"><b>Built on</b><span>words its definition uses</span></div>' +
                '<div class="gm-head gm-head-r"><b>Leads to</b><span>words whose definitions use it</span></div>' +
                '<article class="gm-card" aria-live="polite"><p class="gm-loading">Loading the words…</p></article>' +
            '</div>' +
            '<div class="gm-legend"></div>' +
            '<div class="gm-index">' +
                '<h3 class="gm-index-h"></h3>' +
                '<div class="gm-index-body"></div>' +
            '</div>';
        S.stage = el.querySelector('.gm-stage');
        S.svg = el.querySelector('.gm-lines');
        S.card = el.querySelector('.gm-card');
        S.headL = el.querySelector('.gm-head-l');
        S.headR = el.querySelector('.gm-head-r');
        S.trailEl = el.querySelector('.gm-trail');
        S.indexEl = el.querySelector('.gm-index-body');
        S.legendEl = el.querySelector('.gm-legend');
        S.unitSel = el.querySelector('.gm-unit');

        S.indexHead = el.querySelector('.gm-index-h');
        // picking a unit moves the map to that unit's most connected word
        // and lists the unit's words, by chapter, below
        S.unitSel.addEventListener('change', () => openUnit(S.unitSel.value, null, true));
        const form = el.querySelector('.gm-find'), input = form.querySelector('input');
        const find = () => {
            const k = keyFor(input.value);
            if (!k) return;
            input.value = '';
            input.blur();
            show(k);
        };
        form.addEventListener('submit', e => { e.preventDefault(); find(); });
        input.addEventListener('change', find);

        // one listener for every word button on the map, the card and the index
        el.addEventListener('click', e => {
            const more = e.target.closest('.gm-more');
            if (more) { S.expanded[more.dataset.side] = !S.expanded[more.dataset.side]; layout(true); return; }
            const b = e.target.closest('[data-key]');
            if (!b || !el.contains(b)) return;
            e.preventDefault();
            show(b.dataset.key);
        });

        let lastW = 0;
        new ResizeObserver(() => {
            const w = S.stage.clientWidth;
            if (w && Math.abs(w - lastW) > 1) { lastW = w; if (S.centre) layout(false); }
        }).observe(S.stage);

        legend();
        const word = opts.word ? keyFor(opts.word) : null;
        const unitId = (opts.unitId && unitById(opts.unitId)) ? opts.unitId : (UNITS[UNITS.length > 4 ? 4 : 0] || {}).id;
        openUnit(unitId, word);

        // Every other unit loads quietly afterwards, to colour words from other units.
        // A link to a word with no unit named then lists that word's own unit
        // below — unless the student has already moved on.
        const followWord = !!word && !opts.unitId;
        if (window.UnitContent) {
            Promise.all(UNITS.map(u => UnitContent.load(u.id).then(unit => { assign(unit); recolour(); }).catch(() => {})))
                .then(() => {
                    allLoaded = true;
                    recolour();
                    const home = INFO[word] && INFO[word].unitId;
                    if (followWord && S.centre === word && home && home !== S.unitId) openUnit(home, null);
                });
        }
    }

    function openUnit(unitId, word, jump) {
        S.unitId = unitId;
        S.unitSel.value = unitId;
        const u = unitById(unitId);
        S.indexHead.textContent = u ? 'Words in ' + unitNo(u) + ' · ' + (u.short || '') : '';
        S.indexEl.innerHTML = '<p class="gm-loading">Loading the words…</p>';
        const done = unit => {
            if (unit) assign(unit);
            if (S.unitId !== unitId) return;
            index(unit);
            if (!S.centre) { S.trail = []; centreOn(word || startWord(unit), true); }
            else if (word || jump) centreOn(word || startWord(unit));
            else saveUrl();
        };
        if (!window.UnitContent) { done(null); return; }
        UnitContent.load(unitId).then(done, () => done(null));
    }

    // Open on the unit's most connected word of its own
    function startWord(unit) {
        const own = unit ? unit.terms.map(t => t.key).filter(k => INFO[k] && INFO[k].unitId === unit.id) : [];
        const pool = own.length ? own : (unit ? unit.terms.map(t => t.key) : KEYS);
        return pool.slice().sort((a, b) => degree(b) - degree(a) || a.localeCompare(b))[0];
    }

    function saveUrl() {
        try {
            const q = new URLSearchParams(location.search);
            q.set('unit', S.unitId);
            if (S.centre) q.set('word', slug(S.centre));
            history.replaceState(history.state, '', location.pathname + '?' + q.toString());
        } catch (e) { }
    }

    // Centre on a word and bring the map into view (search, the list, links)
    function show(key) {
        if (!key || !(key in G)) return;
        centreOn(key);
        const r = S.root.getBoundingClientRect();
        if (r.top < 0 || r.top > innerHeight * 0.5) S.root.scrollIntoView({ behavior: DUR ? 'smooth' : 'auto', block: 'start' });
    }

    // ===== THE WORD IN THE MIDDLE =====
    function centreOn(key, fresh) {
        if (!key || !(key in G)) return;
        const changed = key !== S.centre;
        S.centre = key;
        S.expanded = { l: false, r: false };
        const at = S.trail.indexOf(key);
        if (at >= 0) S.trail = S.trail.slice(0, at + 1);
        else { S.trail.push(key); if (S.trail.length > 10) S.trail = S.trail.slice(-10); }
        cardContent();
        trail();
        S.indexEl.querySelectorAll('[data-key]').forEach(b => b.classList.toggle('current', b.dataset.key === key));
        saveUrl();
        layout(!fresh && changed);
    }

    function cardContent() {
        const k = S.centre, info = INFO[k], u = info && unitById(info.unitId);
        const text = String(G[k]);
        // a linked word keeps whatever is stuck to it ("organism’s", "genes,")
        // on the same line, since a button would otherwise let it wrap away
        let def = '', i = 0;
        SPANS[k].forEach((sp, j) => {
            const h = hueOf(sp.k);
            const next = j + 1 < SPANS[k].length ? SPANS[k][j + 1].s : text.length;
            const tail = text.slice(sp.e, next).match(/^[^\s]*/)[0];
            def += esc(text.slice(i, sp.s)) + '<span class="gm-nowrap">' +
                `<button type="button" class="gm-in${h === null ? ' gm-nohue' : ''}" data-key="${esc(sp.k)}"` +
                (h === null ? '' : ` style="--unit-h:${h}"`) + `>${esc(text.slice(sp.s, sp.e))}</button>` +
                esc(tail) + '</span>';
            i = sp.e + tail.length;
        });
        def += esc(text.slice(i));
        const eyebrow = u ? esc(unitNo(u)) + ' · ' + esc(u.short || '')
            : (allLoaded ? 'Not in a chapter yet' : '');
        S.card.innerHTML =
            `<div class="gm-eyebrow">${eyebrow}</div>` +
            `<h2 class="gm-term">${esc(k)}</h2>` +
            `<p class="gm-def">${def}</p>` +
            (info ? `<a class="gm-where" href="${esc(info.url)}">Where it’s taught: ${esc(info.chapterTitle)}</a>` : '');
        paint(S.card, k);
        S.card.classList.remove('swap');
        void S.card.offsetWidth;
        if (DUR) S.card.classList.add('swap');
    }

    function trail() {
        S.trailEl.innerHTML = S.trail.length < 2 ? '' :
            '<span class="gm-trail-h">Your path</span>' +
            S.trail.map((k, i) => i === S.trail.length - 1
                ? `<span class="gm-crumb" aria-current="true">${esc(k)}</span>`
                : `<button type="button" class="gm-crumb" data-key="${esc(k)}">${esc(k)}</button>`
            ).join('<span class="gm-sep" aria-hidden="true">›</span>');
    }

    // ===== THE WORDS AROUND IT =====
    function sides() {
        const c = S.centre, cu = INFO[c] && INFO[c].unitId;
        const same = k => (INFO[k] && INFO[k].unitId === cu) ? 1 : 0;
        const order = (a, b) => same(b) - same(a) || degree(b) - degree(a) || a.localeCompare(b);
        const build = (list, side) => {
            const all = list.slice().sort(order);
            if (!all.length) return [{ id: 'none:' + side, kind: 'none', side }];
            const open = S.expanded[side];
            const cut = all.length > VISIBLE && !open ? VISIBLE - 1 : all.length;
            const items = all.slice(0, cut).map(k => ({ id: 'w:' + k, key: k, kind: 'word', side }));
            if (all.length > VISIBLE) items.push({ id: 'more:' + side, kind: 'more', side, n: all.length - cut });
            return items;
        };
        return { l: build(USES[c], 'l'), r: build(USED_BY[c], 'r') };
    }

    function nodeEl(it) {
        let el;
        if (it.kind === 'word') {
            el = document.createElement('button');
            el.type = 'button';
            el.className = 'gm-node';
            el.dataset.key = it.key;
            el.textContent = it.key;
            paint(el, it.key);
        } else if (it.kind === 'more') {
            el = document.createElement('button');
            el.type = 'button';
            el.className = 'gm-node gm-more';
            el.dataset.side = it.side;
        } else {
            el = document.createElement('div');
            el.className = 'gm-node gm-none';
            el.textContent = 'None';
        }
        return el;
    }

    function layout(animate) {
        const W = S.stage.clientWidth;
        if (!W || !S.centre) return;
        const narrow = W < 700;
        S.stage.classList.toggle('narrow', narrow);
        const { l, r } = sides();
        const items = l.concat(r);
        const keep = new Set(items.map(it => it.id));

        // leaving: fade where they are — or, for the word that has just
        // become the centre, glide into the card
        S.nodes.forEach(n => {
            if (keep.has(n.id)) return;
            n.leaving = true;
            n.tx = n.x; n.ty = n.y; n.to = 0;
            if (n.key === S.centre) n.toCentre = true;
        });

        // card size first: everything is placed around it
        const CW = narrow ? W : Math.min(300, Math.round(W * 0.38));
        S.card.style.width = CW + 'px';
        const CH = S.card.offsetHeight;

        // create or update the elements, then measure them
        items.forEach(it => {
            let n = S.nodes.get(it.id);
            if (!n) {
                n = { id: it.id, key: it.key, kind: it.kind, el: nodeEl(it), x: 0, y: 0, o: 0, fresh: true };
                n.el.style.opacity = 0;
                S.stage.appendChild(n.el);
                if (it.kind === 'word') {
                    n.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    S.svg.appendChild(n.path);
                }
                S.nodes.set(it.id, n);
            }
            n.leaving = false; n.toCentre = false;
            n.side = it.side;
            if (it.kind === 'more') n.el.textContent = S.expanded[it.side] ? 'Show fewer' : '+ ' + it.n + ' more';
            n.el.setAttribute('aria-hidden', 'false');
            n.w = n.el.offsetWidth; n.h = n.el.offsetHeight;
            it.n_ = n;
        });

        let H, cx, cy;
        if (!narrow) {
            const rows = Math.max(l.length, r.length);
            H = TOP + Math.max(CH + 40, rows * ROW + 16);
            cx = W / 2; cy = TOP + (H - TOP) / 2;
            const bulge = Math.max(0, Math.min(80, W / 2 - CW / 2 - GAP - CHIP - 4));
            const place = (list, s) => {
                const half = (H - TOP) / 2 + ROW;
                list.forEach((it, i) => {
                    const n = it.n_;
                    const y = cy + (i - (list.length - 1) / 2) * ROW;
                    const dn = (y - cy) / half;
                    const xin = cx + s * (CW / 2 + GAP + bulge * Math.sqrt(Math.max(0, 1 - dn * dn)));
                    n.tx = s < 0 ? xin - n.w : xin;
                    n.ty = y - n.h / 2;
                    n.to = 1;
                });
            };
            place(l, -1); place(r, 1);
            S.headL.style.cssText = `left:auto;right:${Math.round(W - (cx - CW / 2 - GAP))}px;top:0;text-align:right`;
            S.headR.style.cssText = `right:auto;left:${Math.round(cx + CW / 2 + GAP)}px;top:0;text-align:left`;
            S.card0.tx = cx - CW / 2; S.card0.ty = cy - CH / 2;
        } else {
            let y = CH + 22;
            S.card0.tx = 0; S.card0.ty = 0;
            cx = W / 2; cy = CH / 2;
            const flow = (list, head) => {
                head.style.cssText = `left:0;right:auto;top:${y}px;text-align:left`;
                y += head.offsetHeight + 8;
                let x = 0, rowH = 0;
                list.forEach(it => {
                    const n = it.n_;
                    if (x > 0 && x + n.w > W) { x = 0; y += rowH + 8; rowH = 0; }
                    n.tx = x; n.ty = y; n.to = 1;
                    x += n.w + 8; rowH = Math.max(rowH, n.h);
                });
                y += rowH + 24;
            };
            flow(l, S.headL); flow(r, S.headR);
            H = y;
        }
        S.stage.style.height = Math.ceil(H) + 'px';
        S.svg.setAttribute('viewBox', `0 0 ${W} ${Math.ceil(H)}`);
        S.svg.setAttribute('width', W);
        S.svg.setAttribute('height', Math.ceil(H));
        S.geo = { narrow, W, H, CW, CH, cx, cy };

        // new words grow out of the card; the old centre word leaves into it
        S.nodes.forEach(n => {
            if (n.fresh) {
                n.fresh = false;
                if (animate) { n.x = cx - n.w / 2; n.y = cy - n.h / 2; n.o = 0; }
                else { n.x = n.tx; n.y = n.ty; n.o = 0; }
            }
            if (n.toCentre) { n.tx = S.card0.tx + CW / 2 - n.w / 2; n.ty = S.card0.ty + CH / 2 - n.h / 2; }
            if (n.leaving) n.el.setAttribute('aria-hidden', 'true');
        });
        run(animate ? DUR : 0);
    }

    // ===== MOTION =====
    const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    function run(dur) {
        clearTimeout(S.timer);
        const t0 = performance.now();
        S.nodes.forEach(n => { n.fx = n.x; n.fy = n.y; n.fo = n.o; });
        const c = S.card0; c.fx = c.x; c.fy = c.y;
        if (!dur) { c.fx = c.tx; c.fy = c.ty; }
        const step = now => {
            const p = dur ? Math.min(1, (now - t0) / dur) : 1, e = ease(p);
            c.x = c.fx + (c.tx - c.fx) * e; c.y = c.fy + (c.ty - c.fy) * e;
            S.card.style.transform = `translate(${c.x}px,${c.y}px)`;
            S.nodes.forEach(n => {
                n.x = n.fx + (n.tx - n.fx) * e;
                n.y = n.fy + (n.ty - n.fy) * e;
                n.o = n.fo + (n.to - n.fo) * e;
                n.el.style.transform = `translate(${n.x}px,${n.y}px)`;
                n.el.style.opacity = n.o;
                n.el.style.pointerEvents = n.leaving ? 'none' : '';
            });
            lines();
            if (p < 1) { S.timer = frame(step); return; }
            S.nodes.forEach(n => {
                if (!n.leaving) return;
                n.el.remove(); if (n.path) n.path.remove();
                S.nodes.delete(n.id);
            });
        };
        step(t0);
    }

    function lines() {
        const g = S.geo;
        if (!g) return;
        const cl = S.card0.x, cr = S.card0.x + g.CW, cm = S.card0.y + g.CH / 2;
        S.nodes.forEach(n => {
            if (!n.path) return;
            if (g.narrow) { n.path.setAttribute('d', ''); return; }
            const left = n.side === 'l';
            const ax = left ? n.x + n.w : n.x, ay = n.y + n.h / 2;
            const bx = left ? cl : cr;
            const lim = g.CH / 2 - 14;
            const by = cm + Math.max(-lim, Math.min(lim, (ay - cm) * 0.35));
            const mx = (ax + bx) / 2;
            n.path.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)}C${mx.toFixed(1)} ${ay.toFixed(1)} ${mx.toFixed(1)} ${by.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`);
            n.path.style.opacity = n.o;
            const h = hueOf(n.key);
            n.path.setAttribute('class', h === null ? 'gm-nohue' : '');
            if (h !== null) n.path.style.setProperty('--unit-h', h); else n.path.style.removeProperty('--unit-h');
        });
    }

    // ===== THE UNIT'S WORDS, BY CHAPTER =====
    function index(unit) {
        if (!unit || !unit.terms.length) { S.indexEl.innerHTML = ''; return; }
        const byCh = new Map();
        unit.chapters.forEach(ch => byCh.set(ch.id, { title: ch.title, keys: [] }));
        unit.terms.forEach(t => { const c = byCh.get(t.chapterId); if (c) c.keys.push(t.key); });
        S.indexEl.innerHTML = [...byCh.values()].filter(c => c.keys.length).map(c =>
            `<div class="gm-chapter"><div class="gm-chapter-h">${esc(c.title)}</div><div class="gm-chips">` +
            c.keys.map(k => `<button type="button" class="gm-chip${k === S.centre ? ' current' : ''}" data-key="${esc(k)}">${esc(k)}</button>`).join('') +
            '</div></div>').join('');
        S.indexEl.querySelectorAll('.gm-chip').forEach(b => paint(b, b.dataset.key));
    }

    function legend() {
        S.legendEl.innerHTML = '<span class="gm-legend-h">Colour shows the unit that first teaches a word:</span>' +
            UNITS.map(u => `<span class="gm-key" style="--unit-h:${u.hue}"><i></i>${esc(unitNo(u))}</span>`).join('');
    }

    // Other units arrive after the map is drawn: colour what is already there
    function recolour() {
        if (!S.centre) return;
        S.nodes.forEach(n => { if (n.kind === 'word') paint(n.el, n.key); });
        S.indexEl.querySelectorAll('.gm-chip').forEach(b => paint(b, b.dataset.key));
        // the card gains its unit label; rebuilding it would drop keyboard focus inside it
        if (!S.card.contains(document.activeElement)) {
            cardContent();
            S.card.classList.remove('swap');
            layout(false);
        }
        lines();
    }

    window.GlossaryMap = { mount, show, keyFor };
})();
