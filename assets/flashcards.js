/* =============================================================
   FLASH CARDS
   -------------------------------------------------------------
   Registers window.Flashcards = { open({ unitId, root, assetV }) }.
   Opened by the "Cards" button in the toolbar (course.js), which
   loads assets/unit-content.js first.

   Revision cards for a whole unit, made from the chapters
   themselves: every glossary term the unit marks becomes a
   vocabulary card, and every figure becomes a diagram card.
   Interactives are never included — a card is something you can
   answer in your head, and a sim is not.

   Two ways to use them:
   - STUDY: look at the front, flip, then sort the card into
     "Know it" (gone for this session, remembered as known) or
     "Again" (comes back a few cards later).
   - QUIZ (vocabulary only): read a definition, type the term.
     Marking is lenient about the things that are not biology —
     capitals, hyphens, "the", a plural, a small typo — and strict
     about the one thing that is: typing a different real term
     (chromatin for chromatid) is wrong, however close it looks.

   Why CSS 3D and not three.js for the flip: the card faces stay
   real HTML, so text is crisp at any zoom and can be selected,
   screen readers can read whichever face is showing, inline SVG
   diagrams keep drawing with the page's theme variables, and it
   runs on a low-power phone with no WebGL at all.

   Progress is kept per unit in localStorage under bio_cards_<unit>
   as { known: { cardId: timestamp } }. Card ids come from the
   glossary key and the figure id, so they survive edits to the
   wording of a definition or caption.
   ============================================================= */
(function () {
    'use strict';
    if (window.Flashcards) return;

    const STYLE_ID = 'bio-flashcards-style';
    const PREFS_KEY = 'bio_cards_prefs';

    /* ---- small helpers ------------------------------------------------ */
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reRaw = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    function shuffle(list) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const store = {
        get(key) {
            try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode or full: progress just is not kept */ }
        },
        remove(key) {
            try { localStorage.removeItem(key); } catch (e) { }
        }
    };

    const progressKey = unitId => 'bio_cards_' + unitId;
    function loadKnown(unitId) {
        const v = store.get(progressKey(unitId));
        return (v && v.known && typeof v.known === 'object') ? v.known : {};
    }
    function saveKnown(unitId, known) { store.set(progressKey(unitId), { known }); }

    /* ---- quiz marking ------------------------------------------------- */
    // Everything that is not a letter or digit is noise to the marker:
    // "Spindle-fibre", "spindle fibre" and "Spindle Fibre." are one answer.
    function normalise(s) {
        return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[‐-―\-_/]/g, ' ')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ').trim()
            .replace(/^(a|an|the) /, '');
    }
    const squash = s => s.replace(/ /g, '');

    // A word and its simple plural share a form: fibres -> fibre, bodies -> body.
    function forms(n) {
        const c = squash(n);
        const out = new Set([c]);
        if (c.length > 3) {
            if (/ies$/.test(c)) out.add(c.slice(0, -3) + 'y');
            if (/es$/.test(c)) out.add(c.slice(0, -2));
            if (/s$/.test(c)) out.add(c.slice(0, -1));
        }
        return out;
    }
    const sharesForm = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };

    function levenshtein(a, b) {
        if (a === b) return 0;
        const m = a.length, n = b.length;
        if (!m) return n;
        if (!n) return m;
        let prev = Array.from({ length: n + 1 }, (_, j) => j);
        for (let i = 1; i <= m; i++) {
            const cur = [i];
            for (let j = 1; j <= n; j++) {
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
            prev = cur;
        }
        return prev[n];
    }

    let glossaryForms = null;      // [{ key, forms }] for every term in the course
    function otherTermFor(answerForms, targetKey) {
        if (!glossaryForms) {
            const g = (window.COURSE && window.COURSE.glossary) || {};
            glossaryForms = Object.keys(g).map(key => ({ key, forms: forms(normalise(key)) }));
        }
        const hit = glossaryForms.find(t => t.key !== targetKey && sharesForm(answerForms, t.forms));
        return hit ? hit.key : null;
    }

    // -> { ok, kind: 'exact' | 'typo' | 'other' | 'wrong' | 'empty', other }
    function mark(answer, term, key) {
        const a = normalise(answer), t = normalise(term);
        if (!a) return { ok: false, kind: 'empty' };
        const af = forms(a), tf = forms(t);
        if (sharesForm(af, tf)) return { ok: true, kind: 'exact' };
        // A real, different term is a real mistake, not a spelling slip.
        const other = otherTermFor(af, key || term);
        if (other) return { ok: false, kind: 'other', other };
        const letters = squash(t).length;
        // Very short terms (DNA, ATP) have no room for a typo: one letter
        // wrong is a different word.
        const allowed = letters <= 3 ? 0 : letters <= 7 ? 1 : 2;
        let best = Infinity;
        af.forEach(x => tf.forEach(y => { best = Math.min(best, levenshtein(x, y)); }));
        if (best <= allowed) return { ok: true, kind: 'typo' };
        return { ok: false, kind: 'wrong' };
    }

    // Blank out the term inside its own definition, so "definition first"
    // cards and quiz questions do not give the answer away.
    const BLANK = '\u2063blank\u2063';   // an invisible separator no definition contains
    function maskedHtml(definition, term) {
        const words = term.split(/\s+/).filter(Boolean).map(reRaw).join('[\\s\\-‐-―]+');
        let text = definition;
        if (words) text = text.replace(new RegExp('(^|[^A-Za-z])(' + words + ')(e?s)?(?![A-Za-z])', 'gi'), (m, pre) => pre + BLANK);
        return esc(text).split(BLANK).join('<span class="fc-blank"><span class="fc-sr">blank</span></span>');
    }

    /* ---- inline SVG without id collisions ----------------------------- */
    // Chapter SVGs carry ids (<title id>, <marker id>) that are referenced by
    // aria-labelledby, url(#…) and href="#…". A clone dropped into the page
    // would duplicate ids that may already be there, and a marker reference
    // would then resolve to whichever copy comes first. Every id in the clone
    // gets a unique prefix, and every reference to it is rewritten to match.
    let svgCount = 0;
    function cloneSvg(svgHtml, decorative) {
        const tpl = document.createElement('template');
        tpl.innerHTML = String(svgHtml || '').trim();
        const svg = tpl.content.querySelector('svg');
        if (!svg) return null;
        const prefix = 'fc' + (++svgCount) + '-';
        const map = {};
        [svg, ...svg.querySelectorAll('[id]')].forEach(n => {
            if (!n.id) return;
            map[n.id] = prefix + n.id;
            n.id = map[n.id];
        });
        const fixUrls = s => s.replace(/url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g,
            (m, q, id) => map[id] ? 'url(#' + map[id] + ')' : m);
        [svg, ...svg.querySelectorAll('*')].forEach(n => {
            [...n.attributes].forEach(attr => {
                const name = attr.name, v = attr.value;
                if ((name === 'href' || name === 'xlink:href') && v.charAt(0) === '#' && map[v.slice(1)]) {
                    n.setAttribute(name, '#' + map[v.slice(1)]);
                } else if (name === 'aria-labelledby' || name === 'aria-describedby') {
                    n.setAttribute(name, v.split(/\s+/).map(id => map[id] || id).join(' '));
                } else if (v.indexOf('url(') !== -1) {
                    n.setAttribute(name, fixUrls(v));
                }
            });
            if (n.tagName.toLowerCase() === 'style') {
                let css = fixUrls(n.textContent);
                Object.keys(map).forEach(id => {
                    css = css.replace(new RegExp('#' + reRaw(id) + '(?![\\w-])', 'g'), '#' + map[id]);
                });
                n.textContent = css;
            }
        });
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        if (decorative) {
            svg.setAttribute('aria-hidden', 'true');
            svg.removeAttribute('role');
            svg.removeAttribute('aria-labelledby');
            svg.removeAttribute('aria-describedby');
        }
        return svg;
    }

    /* ---- cards from a unit -------------------------------------------- */
    function buildCards(unit) {
        const chapterIdx = {}, sectionIdx = {};
        unit.chapters.forEach((c, ci) => {
            chapterIdx[c.id] = ci;
            c.sections.forEach((s, si) => { sectionIdx[c.id + '#' + s.id] = si; });
        });
        const cards = [];
        unit.terms.forEach((t, i) => cards.push({
            id: 'term:' + t.key, type: 'term', chapterId: t.chapterId, term: t,
            order: [chapterIdx[t.chapterId] || 0, sectionIdx[t.chapterId + '#' + t.sectionId] || 0, 0, i]
        }));
        unit.figures.forEach((f, i) => {
            if (!(f.images && f.images.length) && !f.svg) return;
            cards.push({
                id: 'fig:' + f.id, type: 'figure', chapterId: f.chapterId, figure: f,
                order: [chapterIdx[f.chapterId] || 0, sectionIdx[f.chapterId + '#' + f.sectionId] || 0, 1, i]
            });
        });
        // reading order: chapter, then section, then words before the figures they explain
        cards.sort((a, b) => {
            for (let k = 0; k < 4; k++) if (a.order[k] !== b.order[k]) return a.order[k] - b.order[k];
            return 0;
        });
        return cards;
    }

    /* ---- styles ------------------------------------------------------- */
    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            /* tokens: the page's theme variables, plus a few of our own per theme */
            '.fc-root { --fc-hue:210; --fc-card:var(--bg, #fff); --fc-panel:var(--bg, #fff);',
            '   --fc-ground:var(--bg-surface, #f8f8f8); --fc-ink:var(--text, #1a1a1a); --fc-soft:var(--text-secondary, #555);',
            '   --fc-line:var(--border, #e0e0e0); --fc-accent:var(--dark-blue, #002a42); --fc-accent-ink:#fff;',
            '   --fc-focus:var(--light-teal, #577899); --fc-link:#14509e;',
            '   --fc-ok:#2e7d32; --fc-ok-bg:rgba(46,125,50,0.09); --fc-bad:#aa272f; --fc-bad-bg:rgba(170,39,47,0.08);',
            '   --fc-stripe:hsl(var(--fc-hue) 50% 45%); --fc-shadow:0 10px 30px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);',
            '   --fc-shadow-lift:0 28px 60px rgba(0,0,0,0.22), 0 6px 14px rgba(0,0,0,0.1); }',
            '[data-theme="sepia"] .fc-root { --fc-accent:#3e2f1c; --fc-accent-ink:#f5edd6; --fc-link:#6b4a1c;',
            '   --fc-ok:#4a6b3d; --fc-ok-bg:rgba(74,107,61,0.12); --fc-bad:#a04040; --fc-bad-bg:rgba(160,64,64,0.1);',
            '   --fc-stripe:hsl(var(--fc-hue) 35% 42%); --fc-shadow:0 10px 30px rgba(62,47,28,0.16), 0 2px 6px rgba(62,47,28,0.08); }',
            '[data-theme="dark"] .fc-root { --fc-card:#1e1e1e; --fc-panel:#1a1a1a; --fc-ground:#121212;',
            '   --fc-accent:#8fb0d0; --fc-accent-ink:#0b1a26; --fc-focus:#8fb0d0; --fc-link:#9cc3ea;',
            '   --fc-ok:#7fc98a; --fc-ok-bg:rgba(127,201,138,0.12); --fc-bad:#e08a90; --fc-bad-bg:rgba(224,138,144,0.12);',
            '   --fc-stripe:hsl(var(--fc-hue) 45% 62%); --fc-shadow:0 10px 30px rgba(0,0,0,0.5); --fc-shadow-lift:0 28px 60px rgba(0,0,0,0.65); }',

            /* the overlay */
            '.fc-root { position:fixed; inset:0; z-index:10050; display:flex; flex-direction:column;',
            '   font-family:var(--body-font, system-ui, sans-serif); color:var(--fc-ink); line-height:1.5;',
            '   background:linear-gradient(180deg, hsl(var(--fc-hue) 45% 50% / 0.07), transparent 45%), var(--fc-ground);',
            '   overscroll-behavior:contain; -webkit-text-size-adjust:100%;',
            '   padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }',
            '.fc-root *, .fc-root *::before, .fc-root *::after { box-sizing:border-box; }',
            '.fc-root[hidden], .fc-root [hidden] { display:none !important; }',
            '.fc-sr { position:absolute !important; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden;',
            '   clip:rect(0 0 0 0); white-space:nowrap; border:0; }',
            '.fc-root :focus-visible { outline:3px solid var(--fc-focus); outline-offset:2px; }',
            '.fc-root button { font:inherit; }',
            // undo the reader's own heading, paragraph and list spacing inside the tool
            ':where(.fc-root) h2, :where(.fc-root) h3, :where(.fc-root) p, :where(.fc-root) ul, :where(.fc-root) li { margin:0; padding:0; border:0; color:inherit; font-family:inherit; }',
            ':where(.fc-root) a { color:var(--fc-link); }',
            // the reader colours headings per theme; inside the tool they use the tool\'s ink
            'html .fc-root h2, html .fc-root h3 { color:var(--fc-ink); }',

            /* header */
            '.fc-top { display:flex; align-items:center; gap:0.6rem; padding:0.55rem 0.9rem; background:var(--fc-panel);',
            '   border-bottom:1px solid var(--fc-line); box-shadow:inset 0 3px 0 var(--fc-stripe); flex:none; }',
            '.fc-title { margin:0; font-size:1rem; font-weight:800; display:flex; align-items:baseline; gap:0.5rem; min-width:0; flex:1; }',
            '.fc-title-unit { font-weight:600; font-size:0.84rem; color:var(--fc-soft); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
            '.fc-status { font-size:0.82rem; color:var(--fc-soft); white-space:nowrap; font-variant-numeric:tabular-nums; }',
            '.fc-status b { color:var(--fc-ink); }',
            '.fc-icon-btn { display:inline-flex; align-items:center; gap:0.35rem; min-height:2.5rem; min-width:2.5rem; justify-content:center;',
            '   padding:0.35rem 0.7rem; border-radius:8px; border:1px solid var(--fc-line); background:transparent; color:var(--fc-ink);',
            '   cursor:pointer; font-size:0.84rem; font-weight:600; }',
            '.fc-icon-btn:hover { border-color:var(--fc-focus); }',
            '.fc-icon-btn svg { width:1.05rem; height:1.05rem; }',
            '.fc-close { font-size:1.35rem; line-height:1; padding:0.2rem 0.6rem; }',
            '.fc-status-row { display:none; }',

            /* body and views */
            '.fc-body { flex:1; min-height:0; display:flex; flex-direction:column; }',
            '.fc-scroll { flex:1; min-height:0; overflow:auto; -webkit-overflow-scrolling:touch; padding:1.25rem 1rem 1.5rem; }',
            '.fc-panel-wrap { max-width:46rem; margin:0 auto; }',
            '.fc-h { font-size:1.35rem; margin:0 0 0.35rem; font-weight:800; line-height:1.25; color:var(--fc-ink); }',
            '.fc-lede { margin:0 0 1.1rem; color:var(--fc-soft); font-size:0.92rem; }',
            '.fc-group { border:1px solid var(--fc-line); border-radius:12px; background:var(--fc-panel); padding:0.85rem 1rem 1rem; margin:0 0 0.9rem; min-width:0; }',
            '.fc-group > legend, .fc-group-h { font-size:0.74rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase;',
            '   color:var(--fc-soft); padding:0 0.35rem; margin-left:-0.35rem; }',
            '.fc-group-h { display:block; margin:0 0 0.5rem; padding:0; margin-left:0; }',
            '.fc-note { font-size:0.8rem; color:var(--fc-soft); margin:0.45rem 0 0; }',
            '.fc-select { font:inherit; font-size:0.95rem; width:100%; padding:0.55rem 0.6rem; border-radius:8px;',
            '   border:1px solid var(--fc-line); background:var(--fc-card); color:var(--fc-ink); }',

            /* the two modes, as big choice tiles */
            '.fc-modes { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-top:0.35rem; }',
            '.fc-tile { position:relative; display:block; border:1.5px solid var(--fc-line); border-radius:10px; padding:0.7rem 0.8rem 0.75rem 2.3rem;',
            '   cursor:pointer; background:var(--fc-card); }',
            '.fc-tile input { position:absolute; left:0.8rem; top:0.95rem; margin:0; width:1rem; height:1rem; accent-color:var(--fc-accent); }',
            '.fc-tile b { display:block; font-size:0.95rem; }',
            '.fc-tile span { display:block; font-size:0.8rem; color:var(--fc-soft); line-height:1.45; margin-top:0.1rem; }',
            '.fc-tile:has(input:checked) { border-color:var(--fc-accent); box-shadow:0 0 0 1px var(--fc-accent); }',
            '.fc-tile:has(input:focus-visible) { outline:3px solid var(--fc-focus); outline-offset:2px; }',

            '.fc-checks { display:flex; flex-wrap:wrap; gap:0.35rem 1.25rem; margin-top:0.35rem; }',
            '.fc-check { display:flex; align-items:flex-start; gap:0.55rem; font-size:0.9rem; cursor:pointer; padding:0.3rem 0; min-height:2.2rem; }',
            '.fc-check input { margin:0.2rem 0 0; width:1.05rem; height:1.05rem; flex:none; accent-color:var(--fc-accent); }',
            '.fc-check.is-disabled { cursor:default; color:var(--fc-soft); }',
            '.fc-check.is-disabled input { opacity:0.5; }',
            '.fc-na { font-style:italic; color:var(--fc-bad); }',
            '.fc-tile-count { font-size:0.78rem; font-weight:700; color:var(--fc-soft); margin-left:0.25rem; }',
            '.fc-check small { color:var(--fc-soft); font-size:0.8rem; }',
            '.fc-sub { margin:0.4rem 0 0 1.6rem; padding-left:0.8rem; border-left:2px solid var(--fc-line); }',
            '.fc-chapters { display:grid; gap:0; margin-top:0.25rem; }',
            '.fc-chapters .fc-check { border-top:1px solid var(--fc-line); padding:0.45rem 0; }',
            '.fc-chapters .fc-check:first-child { border-top:0; }',
            '.fc-ch-name { flex:1; }',
            '.fc-ch-count { font-size:0.78rem; color:var(--fc-soft); white-space:nowrap; font-variant-numeric:tabular-nums; padding-top:0.1rem; }',
            '.fc-group-head { display:flex; align-items:center; justify-content:space-between; gap:0.5rem; }',
            '.fc-mini { display:flex; gap:0.35rem; }',
            '.fc-link-btn { background:none; border:0; padding:0.3rem 0.35rem; color:var(--fc-link); cursor:pointer; font-size:0.82rem;',
            '   text-decoration:underline; text-underline-offset:2px; border-radius:4px; }',

            '.fc-notice { border:1px solid var(--fc-bad); background:var(--fc-bad-bg); border-radius:10px; padding:0.75rem 0.9rem;',
            '   font-size:0.86rem; margin:0 0 0.9rem; color:var(--fc-ink); }',
            '.fc-notice b { display:block; margin-bottom:0.2rem; }',
            '.fc-notice p { margin:0.25rem 0 0; }',
            '.fc-notice ul { margin:0.3rem 0 0 1.1rem; padding:0; }',

            '.fc-loading { padding:2rem 0; text-align:center; color:var(--fc-soft); }',
            '.fc-bar { height:6px; border-radius:3px; background:var(--fc-line); overflow:hidden; max-width:18rem; margin:0.8rem auto 0; }',
            '.fc-bar > span { display:block; height:100%; width:0; background:var(--fc-stripe); transition:width 0.2s; }',

            '.fc-units { display:grid; gap:0.5rem; grid-template-columns:repeat(auto-fill, minmax(15rem, 1fr)); }',
            '.fc-unit-btn { text-align:left; padding:0.85rem 1rem; border-radius:10px; border:1px solid var(--fc-line);',
            '   border-left:5px solid hsl(var(--u-hue) 45% 50%); background:var(--fc-panel); color:var(--fc-ink); cursor:pointer; font-size:0.95rem; font-weight:700; }',
            '.fc-unit-btn:hover { border-color:var(--fc-focus); border-left-color:hsl(var(--u-hue) 45% 50%); }',

            '.fc-reset { margin-top:1.4rem; padding-top:0.9rem; border-top:1px solid var(--fc-line); font-size:0.85rem; color:var(--fc-soft); }',
            '.fc-confirm { display:flex; flex-wrap:wrap; align-items:center; gap:0.5rem; margin-top:0.35rem; color:var(--fc-ink); }',
            '.fc-confirm p { margin:0; flex-basis:100%; }',

            /* footer bar with the counts and the start button */
            '.fc-foot { flex:none; display:flex; align-items:center; justify-content:space-between; gap:0.75rem; flex-wrap:wrap;',
            '   padding:0.65rem 1rem; background:var(--fc-panel); border-top:1px solid var(--fc-line); }',
            '.fc-foot-inner { max-width:46rem; margin:0 auto; width:100%; display:flex; align-items:center; justify-content:space-between; gap:0.75rem; flex-wrap:wrap; }',
            '.fc-count { font-size:0.9rem; color:var(--fc-soft); font-variant-numeric:tabular-nums; }',
            '.fc-count b { color:var(--fc-ink); }',
            '.fc-count .fc-warn { display:block; font-size:0.8rem; color:var(--fc-bad); }',

            /* buttons */
            '.fc-btn { display:inline-flex; align-items:center; justify-content:center; gap:0.5rem; min-height:2.75rem; padding:0.5rem 1.1rem;',
            '   border-radius:10px; border:1.5px solid var(--fc-line); background:var(--fc-card); color:var(--fc-ink);',
            '   font-size:0.95rem; font-weight:700; cursor:pointer; text-decoration:none; transition:transform 0.1s, border-color 0.15s; }',
            '.fc-btn:hover { border-color:var(--fc-focus); }',
            '.fc-btn:active { transform:translateY(1px); }',
            '.fc-btn[disabled] { opacity:0.5; cursor:not-allowed; transform:none; }',
            '.fc-btn-primary { background:var(--fc-accent); border-color:var(--fc-accent); color:var(--fc-accent-ink); }',
            '.fc-btn-primary:hover { border-color:var(--fc-accent); filter:brightness(1.12); }',
            '.fc-btn-again { border-color:var(--fc-bad); color:var(--fc-bad); }',
            '.fc-btn-again:hover { border-color:var(--fc-bad); background:var(--fc-bad-bg); }',
            '.fc-btn-danger { background:var(--fc-bad); border-color:var(--fc-bad); color:#fff; }',
            '[data-theme="dark"] .fc-btn-danger { color:#1a0b0c; }',
            '.fc-kbd { font-size:0.72rem; font-weight:700; padding:0.05rem 0.35rem; border-radius:4px; border:1px solid currentColor;',
            '   opacity:0.75; font-family:inherit; line-height:1.3; white-space:nowrap; }',
            '.fc-touch-only { display:none; }',
            '@media (hover: none) and (pointer: coarse) { .fc-kbd, .fc-kbd-hint { display:none !important; } .fc-touch-only { display:block; } }',

            /* study and quiz layout */
            '.fc-play { flex:1; min-height:0; display:flex; flex-direction:column; align-items:stretch; padding:0.9rem 1rem 0.75rem; gap:0.7rem; }',
            '.fc-stage { position:relative; flex:1; min-height:12rem; outline:none; border-radius:18px; }',
            '.fc-stage:focus-visible { outline:none; }',
            '.fc-stage:focus-visible .fc-card:not(.is-leaving) .fc-face { outline:3px solid var(--fc-focus); outline-offset:3px; }',
            '.fc-controls { flex:none; display:flex; justify-content:center; align-items:center; gap:0.7rem; flex-wrap:wrap; min-height:2.9rem; }',
            '.fc-controls .fc-btn { min-width:9rem; }',
            '.fc-hint { flex:none; text-align:center; font-size:0.78rem; color:var(--fc-soft); margin:0; min-height:1.2em; }',
            '.fc-play-top { flex:none; display:flex; align-items:center; justify-content:space-between; gap:0.5rem; max-width:64rem; width:100%; margin:0 auto; }',

            /* the deck: two plain cards peeking out behind the one in play */
            '.fc-deck { position:absolute; inset:0; pointer-events:none; }',
            '.fc-deck span { position:absolute; left:0; right:0; top:0; bottom:1.5rem; margin:auto; width:var(--fc-w); height:var(--fc-h);',
            '   border-radius:16px; background:var(--fc-card); border:1px solid var(--fc-line); box-shadow:var(--fc-shadow);',
            '   transition:opacity 0.3s, transform 0.3s; transform-origin:50% 100%; }',
            '.fc-deck span:nth-child(1) { transform:translateY(22px) scale(0.93); opacity:0.7; }',
            '.fc-deck span:nth-child(2) { transform:translateY(11px) scale(0.965); opacity:0.9; }',
            '.fc-deck[data-depth="1"] span:nth-child(1), .fc-deck[data-depth="0"] span { opacity:0; }',

            /* a card: an outer box that moves, an inner box that turns */
            '.fc-stage { --fc-w:min(100%, 44rem); --fc-h:min(calc(100% - 1.5rem), 30rem); }',
            '.fc-stage.is-figure { --fc-w:min(100%, 68rem); --fc-h:calc(100% - 1.5rem); }',
            '.fc-stage.is-quiz { --fc-h:min(calc(100% - 1.5rem), 24rem); }',
            '.fc-card { position:absolute; left:0; right:0; top:0; bottom:1.5rem; margin:auto; width:var(--fc-w); height:var(--fc-h);',
            '   perspective:1800px; touch-action:pan-y; -webkit-tap-highlight-color:transparent; }',
            '.fc-card-inner { position:relative; width:100%; height:100%; transform-style:preserve-3d;',
            '   transition:transform 0.62s cubic-bezier(0.3, 1.25, 0.45, 1); }',
            '.fc-card.is-flipped .fc-card-inner { transform:rotateY(180deg); }',
            '.fc-face { position:absolute; inset:0; border-radius:16px; background:var(--fc-card); border:1px solid var(--fc-line);',
            '   box-shadow:var(--fc-shadow); -webkit-backface-visibility:hidden; backface-visibility:hidden;',
            '   display:flex; flex-direction:column; overflow:auto; overscroll-behavior:contain; cursor:pointer;',
            // the face that has turned away is hidden from the halfway point, so it
            // cannot be scrolled, tabbed into, or read out while it faces backwards
            '   transition:visibility 0s linear 0.28s, box-shadow 0.3s; }',
            '.fc-face::before { content:""; position:sticky; top:0; display:block; flex:none; height:5px; margin:-1px -1px 0;',
            '   background:var(--fc-stripe); border-radius:16px 16px 0 0; z-index:1; }',
            '.fc-back { transform:rotateY(180deg); visibility:hidden; }',
            '.fc-card.is-flipped .fc-front { visibility:hidden; }',
            '.fc-card.is-flipped .fc-back { visibility:visible; }',
            '.fc-card.is-lifting { animation:fc-lift 0.62s cubic-bezier(0.3, 0.7, 0.4, 1); }',
            '.fc-card.is-lifting .fc-face { box-shadow:var(--fc-shadow-lift); }',
            '@keyframes fc-lift { 0% { transform:none; } 40% { transform:translateY(-16px) scale(1.035); } 100% { transform:none; } }',
            '.fc-card.is-entering { animation:fc-in 0.42s cubic-bezier(0.2, 0.8, 0.3, 1) both; }',
            '@keyframes fc-in { from { transform:translateY(16px) scale(0.95); opacity:0.4; } to { transform:none; opacity:1; } }',
            '.fc-card.is-leaving { pointer-events:none; z-index:2; }',
            '.fc-card.out-right { animation:fc-out-right 0.42s cubic-bezier(0.5, 0, 0.75, 0.3) forwards; }',
            '.fc-card.out-left { animation:fc-out-left 0.42s cubic-bezier(0.5, 0, 0.75, 0.3) forwards; }',
            '.fc-card.out-down { animation:fc-out-down 0.36s ease-in forwards; }',
            '@keyframes fc-out-right { to { transform:translateX(70%) rotate(7deg); opacity:0; } }',
            '@keyframes fc-out-left { to { transform:translateX(-70%) rotate(-7deg); opacity:0; } }',
            '@keyframes fc-out-down { to { transform:translateY(24px) scale(0.94); opacity:0; } }',
            '.fc-card.is-dragging { transition:none; }',
            '.fc-card.is-snapping { transition:transform 0.25s ease-out; }',
            '.fc-swipe-tag { position:absolute; top:1rem; z-index:3; font-weight:800; font-size:0.9rem; padding:0.2rem 0.6rem; border-radius:6px;',
            '   border:2px solid currentColor; opacity:0; pointer-events:none; background:var(--fc-card); }',
            '.fc-swipe-tag.know { right:1rem; color:var(--fc-ok); }',
            '.fc-swipe-tag.again { left:1rem; color:var(--fc-bad); }',

            /* what goes on a face */
            '.fc-face-body { margin:auto 0; padding:1.1rem 1.5rem 1.4rem; width:100%; }',
            '.fc-meta { display:flex; flex-wrap:wrap; gap:0.3rem 0.6rem; align-items:center; margin:0 0 0.9rem; font-size:0.76rem; color:var(--fc-soft); }',
            '.fc-kind { font-weight:800; letter-spacing:0.06em; text-transform:uppercase; font-size:0.7rem; color:var(--fc-ink);',
            '   border:1px solid var(--fc-line); border-radius:999px; padding:0.1rem 0.5rem; }',
            '.fc-term { font-size:clamp(1.7rem, 4.6vw, 3rem); font-weight:800; line-height:1.15; margin:0; text-align:center; overflow-wrap:anywhere; }',
            '.fc-def { font-size:clamp(1.05rem, 2.4vw, 1.4rem); line-height:1.55; margin:0; overflow-wrap:break-word; }',
            '.fc-def.is-front { text-align:center; }',
            '.fc-prompt { margin:1.1rem 0 0; font-size:0.84rem; color:var(--fc-soft); text-align:center; }',
            '.fc-back-term { font-size:clamp(1.2rem, 3vw, 1.7rem); font-weight:800; margin:0 0 0.5rem; line-height:1.2; }',
            '.fc-src { display:inline-flex; align-items:center; gap:0.3rem; margin-top:1rem; font-size:0.85rem; font-weight:600; color:var(--fc-link);',
            '   text-decoration:underline; text-underline-offset:3px; padding:0.25rem 0; border-radius:4px; }',
            '.fc-blank { display:inline-block; width:4.5em; border-bottom:2px solid currentColor; vertical-align:baseline; height:0.9em; }',

            /* figures */
            '.fc-face-fig { flex:1; min-height:0; display:flex; flex-direction:column; padding:0.8rem 1rem 0.9rem; }',
            '.fc-face-fig .fc-meta { margin-bottom:0.5rem; }',
            '.fc-media { position:relative; flex:1; min-height:8rem; display:grid; grid-template-rows:minmax(0, 1fr); gap:0.6rem; }',
            '.fc-media.is-pair { grid-template-columns:1fr 1fr; }',
            '@media (orientation: portrait) { .fc-media.is-pair { grid-template-columns:1fr; grid-template-rows:minmax(0, 1fr) minmax(0, 1fr); } }',
            '.fc-cell { position:relative; min-width:0; min-height:0; }',
            '.fc-fit { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }',
            '.fc-fit img { display:block; max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain;',
            '   background:#fff; border-radius:8px; border:1px solid var(--fc-line); }',
            '[data-theme="dark"] .fc-fit img { opacity:0.94; }',
            '.fc-fit.is-svg { background:var(--bg-surface, #f8f8f8); border-radius:10px; border:1px solid var(--fc-line); padding:0.6rem; }',
            '.fc-fit svg { display:block; width:100%; height:100%; max-width:100%; max-height:100%; }',
            // the same theme tokens the reader gives inline diagrams in .diagram
            '.fc-fit svg { --dg-line:var(--text-secondary); --dg-fill:var(--bg); --dg-ink:var(--text); }',
            '.fc-fit svg text { fill:var(--dg-ink); font-family:var(--body-font); }',
            '.fc-fig-back { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1.15fr); gap:1.25rem; align-items:start; }',
            '.fc-fig-back .fc-media { min-height:14rem; height:100%; }',
            '.fc-fig-back .fc-media .fc-fit { position:relative; inset:auto; }',
            '.fc-fig-back .fc-media { display:flex; flex-direction:column; gap:0.5rem; }',
            '.fc-fig-back .fc-cell { position:static; }',
            '.fc-fig-back .fc-fit img, .fc-fig-back .fc-fit svg { max-height:min(52vh, 26rem); }',
            '.fc-fig-back .fc-fit.is-svg svg { height:auto; }',
            '.fc-fig-label { font-size:0.74rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:var(--fc-soft); margin:0 0 0.2rem; }',
            '.fc-fig-short { font-size:clamp(1.1rem, 2.4vw, 1.45rem); font-weight:800; line-height:1.3; margin:0 0 0.5rem; }',
            '.fc-fig-rest { font-size:0.95rem; line-height:1.6; margin:0; }',
            '@media (max-width: 760px), (orientation: portrait) { .fc-fig-back { grid-template-columns:1fr; } .fc-fig-back .fc-media { min-height:0; } .fc-fig-back .fc-fit img, .fc-fig-back .fc-fit svg { max-height:30vh; } }',

            /* quiz */
            '.fc-quiz-form { flex:none; width:100%; max-width:44rem; margin:0 auto; display:flex; flex-direction:column; gap:0.55rem; }',
            '.fc-quiz-row { display:flex; gap:0.5rem; flex-wrap:wrap; }',
            '.fc-input { font:inherit; font-size:1.1rem; flex:1 1 14rem; min-width:0; min-height:2.9rem; padding:0.5rem 0.8rem; border-radius:10px;',
            '   border:1.5px solid var(--fc-line); background:var(--fc-card); color:var(--fc-ink); }',
            '.fc-input:focus { border-color:var(--fc-focus); outline:none; box-shadow:0 0 0 3px color-mix(in srgb, var(--fc-focus) 35%, transparent); }',
            '.fc-input[readonly] { color:var(--fc-soft); }',
            '.fc-quiz-label { font-size:0.84rem; font-weight:700; }',
            '.fc-result { border-radius:10px; padding:0.55rem 0.8rem; margin:0 0 0.8rem; font-size:0.95rem; font-weight:700; border:1.5px solid; }',
            '.fc-result.ok { color:var(--fc-ok); border-color:var(--fc-ok); background:var(--fc-ok-bg); }',
            '.fc-result.bad { color:var(--fc-bad); border-color:var(--fc-bad); background:var(--fc-bad-bg); }',
            '.fc-result span { display:block; font-weight:500; color:var(--fc-ink); font-size:0.88rem; margin-top:0.1rem; }',
            '.fc-q-label { font-size:0.74rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:var(--fc-soft); text-align:center; margin:0 0 0.7rem; }',

            /* finish screens */
            '.fc-finish { text-align:center; padding-top:1.5rem; }',
            '.fc-big { font-size:clamp(2.2rem, 7vw, 3.4rem); font-weight:800; line-height:1.1; margin:0.3rem 0; font-variant-numeric:tabular-nums; }',
            '.fc-finish-actions { display:flex; gap:0.6rem; justify-content:center; flex-wrap:wrap; margin:1.2rem 0 0.5rem; }',
            '.fc-stats { display:flex; justify-content:center; gap:0.6rem; flex-wrap:wrap; margin:1rem 0 0; }',
            '.fc-stat { border:1px solid var(--fc-line); background:var(--fc-panel); border-radius:10px; padding:0.55rem 0.9rem; min-width:7.5rem; }',
            '.fc-stat b { display:block; font-size:1.4rem; }',
            '.fc-stat span { font-size:0.78rem; color:var(--fc-soft); }',
            '.fc-missed { text-align:left; margin:1.5rem auto 0; max-width:36rem; border:1px solid var(--fc-line); border-radius:12px; background:var(--fc-panel); padding:0.8rem 1rem; }',
            '.fc-missed h3 { font-size:0.95rem; margin:0 0 0.4rem; }',
            '.fc-missed ul { list-style:none; margin:0; padding:0; }',
            '.fc-missed li { padding:0.5rem 0; border-top:1px solid var(--fc-line); font-size:0.88rem; }',
            '.fc-missed li:first-child { border-top:0; }',
            '.fc-missed li b { display:block; font-size:0.95rem; }',
            '.fc-missed .fc-src { margin-top:0.15rem; font-size:0.8rem; }',

            /* narrow screens: phones */
            '@media (max-width: 640px) {',
            '  .fc-top { padding:0.45rem 0.6rem; gap:0.4rem; }',
            '  .fc-title-unit { display:none; }',
            '  .fc-top .fc-status { display:none; }',
            '  .fc-status-row { display:block; flex:none; text-align:center; padding:0.35rem 0.6rem 0; font-size:0.8rem; }',
            '  .fc-status-row:empty { display:none; }',
            '  .fc-fs-label { display:none; }',
            '  .fc-modes { grid-template-columns:1fr; }',
            '  .fc-play { padding:0.55rem 0.6rem 0.6rem; gap:0.55rem; }',
            '  .fc-face-body { padding:0.9rem 1rem 1.1rem; }',
            '  .fc-face-fig { padding:0.6rem 0.7rem 0.7rem; }',
            '  .fc-controls { gap:0.5rem; }',
            '  .fc-controls .fc-btn { flex:1; min-width:0; }',
            '  .fc-scroll { padding:0.9rem 0.75rem 1.2rem; }',
            '  .fc-foot { padding:0.55rem 0.75rem; }',
            '  .fc-foot .fc-btn { flex:1; }',
            '}',
            '@media (max-height: 520px) { .fc-stage.is-quiz { --fc-h:100%; } .fc-hint { display:none; } }',

            /* reduced motion: crossfade instead of turning or sliding */
            '@media (prefers-reduced-motion: reduce) {',
            '  .fc-card-inner, .fc-card.is-flipped .fc-card-inner { transition:none; transform:none; }',
            '  .fc-back { transform:none; }',
            '  .fc-face { transition:opacity 0.22s ease, visibility 0.22s; }',
            '  .fc-back { opacity:0; }',
            '  .fc-card.is-flipped .fc-front { opacity:0; }',
            '  .fc-card.is-flipped .fc-back { opacity:1; }',
            '  .fc-card.is-lifting { animation:none; }',
            '  .fc-card.is-entering { animation:fc-fade-in 0.22s ease both; }',
            '  .fc-card.out-right, .fc-card.out-left, .fc-card.out-down { animation:fc-fade-out 0.2s ease forwards; }',
            '  @keyframes fc-fade-in { from { opacity:0; } to { opacity:1; } }',
            '  @keyframes fc-fade-out { to { opacity:0; } }',
            '  .fc-bar > span, .fc-deck span { transition:none; }',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    /* ---- the tool ----------------------------------------------------- */
    let app = null;

    function open(opts) {
        opts = opts || {};
        if (!window.UnitContent) throw new Error('assets/unit-content.js must be loaded before the flash cards.');
        injectStyle();
        if (app) { app.focusFirst(); return app; }
        app = createApp(opts);
        return app;
    }

    function createApp(opts) {
        const UC = window.UnitContent;
        const units = UC.units();
        const opener = document.activeElement && document.activeElement !== document.body
            ? document.activeElement : document.getElementById('btn-cards');

        const saved = store.get(PREFS_KEY) || {};
        const S = {
            unitId: null, unit: null, cards: [], known: {},
            loading: false, loadDone: 0, loadTotal: 0, loadError: null, loadToken: 0,
            settings: {
                mode: saved.mode === 'quiz' ? 'quiz' : 'study',
                vocab: saved.vocab !== false,
                figures: saved.figures !== false,
                direction: saved.direction === 'def' ? 'def' : 'term',
                shuffle: saved.shuffle !== false,
                includeKnown: false,           // off every time: the default is to study what you do not know yet
                chapters: null                 // Set of chapter ids; null until a unit is loaded
            },
            view: 'setup',
            confirmingReset: false,
            session: null
        };
        const savePrefs = () => {
            const st = S.settings;
            store.set(PREFS_KEY, { mode: st.mode, vocab: st.vocab, figures: st.figures, direction: st.direction, shuffle: st.shuffle });
        };

        /* ---- shell ---- */
        const root = document.createElement('div');
        root.className = 'fc-root';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-labelledby', 'bio-fc-title');
        const canFullscreen = !!((root.requestFullscreen || root.webkitRequestFullscreen) &&
            (document.fullscreenEnabled || document.webkitFullscreenEnabled));
        root.innerHTML =
            '<header class="fc-top">' +
                '<h2 class="fc-title" id="bio-fc-title">Flash cards <span class="fc-title-unit"></span></h2>' +
                '<span class="fc-status" aria-hidden="true"></span>' +
                (canFullscreen
                    ? '<button type="button" class="fc-icon-btn fc-fs" aria-pressed="false">' +
                      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5"/></svg>' +
                      '<span class="fc-fs-label">Full screen</span></button>'
                    : '') +
                '<button type="button" class="fc-icon-btn fc-close" aria-label="Close flash cards">&times;</button>' +
            '</header>' +
            '<div class="fc-status-row fc-status" aria-hidden="true"></div>' +
            '<div class="fc-body"></div>' +
            '<div class="fc-sr" aria-live="polite" aria-atomic="true"></div>';
        const body = root.querySelector('.fc-body');
        const live = root.querySelector('[aria-live]');
        const unitLabel = root.querySelector('.fc-title-unit');
        const fsBtn = root.querySelector('.fc-fs');

        function setStatus(html) { root.querySelectorAll('.fc-status').forEach(n => { n.innerHTML = html || ''; }); }
        let liveTimer = 0;
        function announce(text) {
            // cleared first so the same words twice in a row are still read
            live.textContent = '';
            clearTimeout(liveTimer);
            liveTimer = setTimeout(() => { live.textContent = text; }, 60);
        }

        /* ---- open: lock the page behind ---- */
        const prevOverflow = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.appendChild(root);

        function onFocusIn(e) {
            if (!root.contains(e.target)) focusFirst();
        }
        document.addEventListener('focusin', onFocusIn);

        function onFsChange() {
            if (!fsBtn) return;
            const on = (document.fullscreenElement || document.webkitFullscreenElement) === root;
            fsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
            fsBtn.querySelector('.fc-fs-label').textContent = on ? 'Exit full screen' : 'Full screen';
            fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
        }
        if (fsBtn) {
            fsBtn.setAttribute('aria-label', 'Full screen');
            fsBtn.addEventListener('click', () => {
                const on = (document.fullscreenElement || document.webkitFullscreenElement) === root;
                try {
                    if (on) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                    else {
                        const p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
                        if (p && p.catch) p.catch(() => announce('Full screen is not available here.'));
                    }
                } catch (e) { announce('Full screen is not available here.'); }
            });
            document.addEventListener('fullscreenchange', onFsChange);
            document.addEventListener('webkitfullscreenchange', onFsChange);
        }
        root.querySelector('.fc-close').addEventListener('click', close);

        function close() {
            if (!app) return;
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            if (fsEl === root) {
                try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { }
            }
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange);
            clearTimeout(liveTimer);
            root.remove();
            document.documentElement.style.overflow = prevOverflow.html;
            document.body.style.overflow = prevOverflow.body;
            app = null;
            const back = (opener && document.contains(opener)) ? opener : document.getElementById('btn-cards');
            if (back && back.focus) back.focus({ preventScroll: true });
        }

        /* ---- focus ---- */
        function focusables() {
            return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]')].filter(n => {
                if (n.disabled || n.getAttribute('tabindex') === '-1') return false;
                if (!n.getClientRects().length) return false;
                return getComputedStyle(n).visibility !== 'hidden';
            });
        }
        function focusFirst() {
            const target = root.querySelector('[data-autofocus]') || focusables()[0] || root.querySelector('.fc-close');
            if (target) target.focus({ preventScroll: true });
        }

        /* ---- keyboard ---- */
        root.addEventListener('keydown', e => {
            // a modal: the page's own shortcuts (search, lightbox) must not fire behind it
            e.stopPropagation();
            if (e.key === 'Tab') {
                const list = focusables();
                if (!list.length) return;
                const first = list[0], last = list[list.length - 1];
                if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); first.focus();
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                if (S.confirmingReset) { S.confirmingReset = false; renderSetup('.fc-reset-open'); return; }
                close();
                return;
            }
            if (S.view === 'study' && S.session) studyKey(e);
        });

        /* ---- links on card backs ---- */
        root.addEventListener('click', e => {
            const a = e.target.closest && e.target.closest('a.fc-src');
            if (!a || !root.contains(a)) return;
            if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            let url;
            try { url = new URL(a.href); } catch (err) { return; }
            if (url.origin !== location.origin || url.pathname !== location.pathname) return;   // another page: navigate
            // this page: close and take the reader to the section
            e.preventDefault();
            close();
            const id = decodeURIComponent(url.hash.slice(1));
            if (!id) return;
            if (location.hash === url.hash) {
                const t = document.getElementById(id);
                if (t) t.scrollIntoView({ block: 'start' });
            } else {
                location.hash = url.hash;      // the reader's own hash handler scrolls with the toolbar offset
            }
        });

        /* ---- unit loading ---- */
        function chooseUnit(unitId) {
            const meta = units.find(u => u.id === unitId);
            if (!meta) { S.unitId = null; renderPicker(); return; }
            S.unitId = unitId;
            S.unit = null; S.cards = []; S.loadError = null;
            S.known = loadKnown(unitId);
            S.settings.chapters = null;
            S.confirmingReset = false;
            root.style.setProperty('--fc-hue', meta.hue != null ? meta.hue : 210);
            unitLabel.textContent = meta.label;
            S.loading = true; S.loadDone = 0; S.loadTotal = 0;
            const token = ++S.loadToken;
            S.view = 'setup';
            renderSetup();
            let promise;
            try {
                promise = UC.load(unitId, {
                    onProgress(done, total) {
                        if (token !== S.loadToken) return;
                        S.loadDone = done; S.loadTotal = total;
                        const bar = body.querySelector('.fc-bar > span');
                        const txt = body.querySelector('.fc-load-text');
                        if (bar) bar.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
                        if (txt) txt.textContent = 'Reading chapters… ' + done + ' of ' + total;
                    }
                });
            } catch (err) { promise = Promise.reject(err); }
            Promise.resolve(promise).then(unit => {
                if (token !== S.loadToken) return;
                S.loading = false;
                S.unit = unit;
                S.cards = buildCards(unit);
                S.settings.chapters = new Set(unit.chapters.map(c => c.id));
                renderSetup();
                announce(meta.label + ' is ready: ' + S.cards.length + ' cards.');
            }, err => {
                if (token !== S.loadToken) return;
                S.loading = false;
                S.loadError = err;
                renderSetup();
            });
        }

        /* ---- translating the cards ----------------------------------------
           Only the DEFINITION side moves. mark() scores what the student types
           against term.term and term.key, so translating the term would break the
           marking and invert the point of the exercise: they are assessed on the
           English word. Glossary words inside the definition are shielded too, so
           "translation" keeps meaning mRNA to protein. */
        const FC_LANGS = [
            ['zh-Hant', '繁體中文 — Traditional Chinese'], ['zh', '简体中文 — Simplified Chinese'],
            ['ko', '한국어 — Korean'], ['ja', '日本語 — Japanese'], ['es', 'Español — Spanish'],
            ['fr', 'Français — French'], ['pt', 'Português — Portuguese'], ['de', 'Deutsch — German'],
            ['hi', 'हिन्दी — Hindi'], ['vi', 'Tiếng Việt — Vietnamese'], ['th', 'ไทย — Thai'],
            ['id', 'Bahasa Indonesia'], ['ar', 'العربية — Arabic'], ['ru', 'Русский — Russian']
        ];
        let fcTrP = null;
        function loadTranslator() {
            if (window.TranslateCore) return Promise.resolve();
            if (fcTrP) return fcTrP;
            fcTrP = new Promise((ok, no) => {
                const el = document.createElement('script');
                el.src = new URL((opts.root || './') + 'assets/translate-core.js', location.href).href +
                    (opts.assetV ? '?v=' + opts.assetV : '');
                el.async = false;
                el.onload = () => (window.TranslateCore ? ok() : no(new Error('the translator did not register')));
                el.onerror = () => no(new Error('could not load the translator'));
                document.head.appendChild(el);
            });
            return fcTrP;
        }

        function restoreEnglish() {
            if (!S.defsEn) return;
            S.cards.forEach(c => {
                const keep = S.defsEn[c.id];
                if (!keep) return;
                if (c.type === 'term') c.term = Object.assign({}, c.term, { definition: keep.definition });
                else c.figure = Object.assign({}, c.figure, { captionShort: keep.captionShort, captionBody: keep.captionBody });
            });
            S.defsEn = null; S.lang = null;
            setStatus('Back to English.');
        }

        let fcTranslating = false;
        async function runCardTranslate(btn) {
            if (fcTranslating) return;
            const sel = body.querySelector('#fc-lang');
            if (!sel || !S.cards || !S.cards.length) return;
            const lang = sel.value;
            fcTranslating = true;
            btn.disabled = true;
            const label = btn.textContent;
            try {
                await loadTranslator();
                const TC = window.TranslateCore;
                if (!TC.supported()) {
                    setStatus('This browser has no on-device translator. Chrome or Edge 138 and later have one.');
                } else {
                    setStatus('Preparing ' + TC.labelFor(lang) + '…');
                    const translator = await TC.create(lang, m => setStatus(m));
                    // originals are kept once, so switching language never translates a translation
                    if (!S.defsEn) {
                        S.defsEn = {};
                        S.cards.forEach(c => {
                            S.defsEn[c.id] = c.type === 'term'
                                ? { definition: c.term.definition }
                                : { captionShort: c.figure.captionShort, captionBody: c.figure.captionBody };
                        });
                    }
                    const jobs = [];
                    S.cards.forEach(c => {
                        const keep = S.defsEn[c.id];
                        if (c.type === 'term') jobs.push({ c, k: 'definition', src: keep.definition || '' });
                        else {
                            jobs.push({ c, k: 'captionShort', src: keep.captionShort || '' });
                            jobs.push({ c, k: 'captionBody', src: keep.captionBody || '' });
                        }
                    });
                    const r = await TC.translateAll(translator, jobs.map(j => j.src), {
                        onProgress: (n, t, kept) => {
                            btn.textContent = n + '/' + t + '…';
                            setStatus('Translating… ' + n + ' of ' + t + (kept ? ' (' + kept + ' kept in English)' : ''));
                        }
                    });
                    jobs.forEach((j, i) => {
                        const patch = {}; patch[j.k] = r.texts[i];
                        if (j.c.type === 'term') j.c.term = Object.assign({}, j.c.term, patch);
                        else j.c.figure = Object.assign({}, j.c.figure, patch);
                    });
                    S.lang = lang;
                    renderSetup();
                    setStatus('Definitions in ' + TC.labelFor(lang) +
                        (r.keptEnglish ? ' — ' + r.keptEnglish + ' kept in English' : '') +
                        '. Terms stay in English.');
                }
            } catch (e) {
                setStatus((e && e.message) ? e.message : 'Translation failed.');
            }
            fcTranslating = false;
            const b2 = body.querySelector('[data-f="fc-tr"]');
            if (b2) { b2.disabled = false; b2.textContent = label; }
        }

        /* ---- counting ---- */
        function selection(mode) {
            const st = S.settings;
            const m = mode || st.mode;
            return S.cards.filter(c => {
                if (st.chapters && !st.chapters.has(c.chapterId)) return false;
                if (m === 'quiz') return c.type === 'term';
                return c.type === 'term' ? st.vocab : st.figures;
            });
        }
        const isKnown = c => !!S.known[c.id];

        /* ---- views: unit picker ---- */
        function renderPicker() {
            S.view = 'picker';
            unitLabel.textContent = '';
            setStatus('');
            body.innerHTML =
                '<div class="fc-scroll"><div class="fc-panel-wrap">' +
                    '<h3 class="fc-h">Which unit would you like cards for?</h3>' +
                    '<p class="fc-lede">Cards are made from the unit’s vocabulary and diagrams. Pick a unit to choose chapters and start.</p>' +
                    '<div class="fc-units">' +
                    units.map(u => '<button type="button" class="fc-unit-btn" data-unit="' + esc(u.id) + '" style="--u-hue:' + (+u.hue || 210) + '">' +
                        esc(u.label) + '</button>').join('') +
                    '</div>' +
                '</div></div>';
            body.querySelectorAll('.fc-unit-btn').forEach(b => b.addEventListener('click', () => chooseUnit(b.dataset.unit)));
            const first = body.querySelector('.fc-unit-btn');
            if (first) first.focus({ preventScroll: true });
        }

        /* ---- views: setup ---- */
        function renderSetup(focusSel) {
            S.view = 'setup';
            S.session = null;
            const st = S.settings;
            const meta = units.find(u => u.id === S.unitId);
            const unit = S.unit;
            const focusedName = document.activeElement && root.contains(document.activeElement) && document.activeElement.getAttribute('data-f');

            let main = '';
            main += '<h3 class="fc-h">Revision cards</h3>' +
                '<p class="fc-lede">Words to define and diagrams to identify, one card at a time. Say the answer out loud before you flip — it is the trying to remember that makes it stick.</p>';
            if (unit && !S.loading) main += unavailableNotice(unit);

            main += '<div class="fc-group"><label class="fc-group-h" for="bio-fc-unit">Unit</label>' +
                '<select class="fc-select" id="bio-fc-unit" data-f="unit">' +
                units.map(u => '<option value="' + esc(u.id) + '"' + (u.id === S.unitId ? ' selected' : '') + '>' + esc(u.label) + '</option>').join('') +
                '</select></div>';

            if (S.loading) {
                const pct = S.loadTotal ? Math.round(S.loadDone / S.loadTotal * 100) : 0;
                main += '<div class="fc-loading" role="status"><span class="fc-load-text">Reading chapters… ' +
                    (S.loadTotal ? S.loadDone + ' of ' + S.loadTotal : '') + '</span>' +
                    '<div class="fc-bar"><span style="width:' + pct + '%"></span></div></div>';
            } else if (S.loadError) {
                main += '<div class="fc-notice" role="alert"><b>This unit could not be read.</b>' +
                    '<p>' + esc(S.loadError.message || S.loadError) + '</p>' +
                    '<p><button type="button" class="fc-btn fc-retry" data-f="retry">Try again</button></p></div>';
            } else if (unit) {
                const all = S.cards;
                const nVocab = all.filter(c => c.type === 'term').length;
                const nFig = all.filter(c => c.type === 'figure').length;
                const quiz = st.mode === 'quiz';

                main += '<fieldset class="fc-group"><legend>How to study</legend><div class="fc-modes">' +
                    '<label class="fc-tile"><input type="radio" name="bio-fc-mode" value="study" data-f="mode-study"' + (quiz ? '' : ' checked') + '>' +
                        '<b>Study</b><span>Flip each card, then sort it: <em>Know it</em> or <em>Again</em>.</span></label>' +
                    '<label class="fc-tile"><input type="radio" name="bio-fc-mode" value="quiz" data-f="mode-quiz"' + (quiz ? ' checked' : '') + '>' +
                        '<b>Quiz</b><span>Read a definition and type the term. Vocabulary only.</span></label>' +
                    '</div></fieldset>';

                main += '<fieldset class="fc-group"><legend>Cards</legend>';
                if (quiz) {
                    main += '<p class="fc-note" style="margin-top:0.2rem">The quiz uses the ' + nVocab + ' vocabulary cards. Diagrams are for study mode, where you can look before you answer.</p>';
                } else {
                    main += '<div class="fc-modes">' +
                        '<label class="fc-tile"><input type="checkbox" data-opt="vocab" data-f="opt:vocab"' + (st.vocab ? ' checked' : '') + '>' +
                            '<b>Vocabulary <small class="fc-tile-count">' + nVocab + '</small></b><span>Key terms and what they mean.</span></label>' +
                        '<label class="fc-tile"><input type="checkbox" data-opt="figures" data-f="opt:figures"' + (st.figures ? ' checked' : '') + '>' +
                            '<b>Diagrams <small class="fc-tile-count">' + nFig + '</small></b><span>Figures from the chapters. Identify what each one shows.</span></label>' +
                        '</div>';
                    if (st.vocab) {
                        main += '<div class="fc-sub" role="radiogroup" aria-label="Vocabulary direction" style="margin-top:0.7rem">' +
                            '<div class="fc-checks">' +
                            radio('direction', 'term', 'Show the term first', st.direction === 'term') +
                            radio('direction', 'def', 'Show the definition first', st.direction === 'def') +
                            '</div></div>';
                    }
                }
                main += '</fieldset>';

                main += '<fieldset class="fc-group"><legend class="fc-sr">Chapters</legend>' +
                    '<div class="fc-group-head"><span class="fc-group-h" aria-hidden="true" style="margin:0">Chapters</span>' +
                    '<span class="fc-mini"><button type="button" class="fc-link-btn" data-f="ch-all" data-all="1">Select all</button>' +
                    '<button type="button" class="fc-link-btn" data-f="ch-none" data-all="0">Clear</button></span></div>' +
                    '<div class="fc-chapters">' +
                    unitChapterList(unit).map(c => {
                        if (!c.available) {
                            return '<label class="fc-check is-disabled"><input type="checkbox" disabled data-ch-na="' + esc(c.id) + '">' +
                                '<span class="fc-ch-name">' + esc(c.title) + '</span>' +
                                '<span class="fc-ch-count fc-na">not available</span></label>';
                        }
                        const cs = all.filter(x => x.chapterId === c.id);
                        const v = cs.filter(x => x.type === 'term').length, f = cs.filter(x => x.type === 'figure').length;
                        const parts = quiz ? [v + (v === 1 ? ' word' : ' words')]
                            : [st.vocab ? v + (v === 1 ? ' word' : ' words') : null, st.figures ? f + (f === 1 ? ' diagram' : ' diagrams') : null].filter(Boolean);
                        return '<label class="fc-check"><input type="checkbox" data-ch="' + esc(c.id) + '" data-f="ch:' + esc(c.id) + '"' +
                            (st.chapters.has(c.id) ? ' checked' : '') + '>' +
                            '<span class="fc-ch-name">' + esc(c.title) + '</span>' +
                            '<span class="fc-ch-count">' + esc(parts.join(' · ')) + '</span></label>';
                    }).join('') +
                    '</div></fieldset>';

                main += '<fieldset class="fc-group"><legend>Options</legend><div class="fc-checks">' +
                    check('shuffle', 'Shuffle the cards', st.shuffle) +
                    check('includeKnown', 'Include cards I already know', st.includeKnown) +
                    '</div></fieldset>';

                main += '<fieldset class="fc-group"><legend>Language</legend>' +
                    '<p class="fc-note" style="margin-top:0.2rem">Definitions and diagram captions can be shown in ' +
                    'another language. The <b>term itself always stays in English</b> — it is what the quiz marks ' +
                    'you on — and so do the glossary words inside each definition, so a card reads bilingually.</p>' +
                    '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;margin-top:0.6rem">' +
                    '<select id="fc-lang" data-f="fc-lang" aria-label="Language for definitions" ' +
                    'style="font:inherit;font-size:0.9rem;padding:0.35rem 0.5rem;border-radius:7px;' +
                    'border:1px solid var(--fc-line);background:var(--fc-card);color:var(--fc-ink);max-width:16rem"></select>' +
                    '<button type="button" class="fc-btn" data-f="fc-tr">Translate definitions</button>' +
                    (S.defsEn ? '<button type="button" class="fc-btn" data-f="fc-tr-off">Back to English</button>' : '') +
                    '</div></fieldset>';

                const knownCount = Object.keys(S.known).filter(id => S.cards.some(c => c.id === id)).length;
                main += '<div class="fc-reset">';
                if (S.confirmingReset) {
                    main += '<div class="fc-confirm" role="group" aria-label="Confirm reset">' +
                        '<p>Forget the ' + knownCount + ' card' + (knownCount === 1 ? '' : 's') + ' you have marked as known in ' + esc(meta ? meta.label : 'this unit') + '? This cannot be undone.</p>' +
                        '<button type="button" class="fc-btn fc-btn-danger" data-f="reset-yes" data-autofocus>Reset progress</button>' +
                        '<button type="button" class="fc-btn" data-f="reset-no">Cancel</button></div>';
                } else {
                    main += knownCount
                        ? '<button type="button" class="fc-link-btn fc-reset-open" data-f="reset" style="padding-left:0">Reset progress for this unit</button> ' +
                          '<span>— ' + knownCount + ' card' + (knownCount === 1 ? '' : 's') + ' marked as known.</span>'
                        : '<span>No cards marked as known in this unit yet.</span>';
                }
                main += '</div>';
            }

            // footer
            let foot = '';
            if (unit && !S.loading) {
                const sel = selection();
                const known = sel.filter(isKnown).length;
                const toStudy = st.includeKnown ? sel.length : sel.length - known;
                const noun = st.mode === 'quiz' ? (sel.length === 1 ? 'term' : 'terms') : (sel.length === 1 ? 'card' : 'cards');
                let warn = '';
                if (!sel.length) warn = st.mode === 'study' && !st.vocab && !st.figures ? 'Choose vocabulary, diagrams or both.' : 'Choose at least one chapter with cards in it.';
                else if (!toStudy) warn = 'You know every card here. Tick “Include cards I already know” to go through them again.';
                foot = '<div class="fc-foot"><div class="fc-foot-inner">' +
                    '<p class="fc-count" aria-live="polite" style="margin:0"><b>' + sel.length + '</b> ' + noun + ' · <b>' + known + '</b> known' +
                    (warn ? '<span class="fc-warn">' + esc(warn) + '</span>' : '') + '</p>' +
                    '<button type="button" class="fc-btn fc-btn-primary fc-start" data-f="start"' + (toStudy ? '' : ' disabled') + '>' +
                    (st.mode === 'quiz' ? 'Start quiz' : 'Start studying') + (toStudy ? ' · ' + toStudy : '') + '</button>' +
                    '</div></div>';
            }

            body.innerHTML = '<div class="fc-scroll"><div class="fc-panel-wrap">' + main + '</div></div>' + foot;
            setStatus('');
            wireSetup();

            const again = focusSel ? body.querySelector(focusSel)
                : focusedName ? body.querySelector('[data-f="' + CSS.escape(focusedName) + '"]') : null;
            if (again) again.focus({ preventScroll: true });
            else if (S.confirmingReset) { const y = body.querySelector('[data-autofocus]'); if (y) y.focus(); }
            else if (!root.contains(document.activeElement) || document.activeElement === document.body) {
                const u = body.querySelector('#bio-fc-unit');
                if (u) u.focus({ preventScroll: true });
            }
        }

        // Every chapter the unit lists, in order, marked with whether it could be read.
        function unitChapterList(unit) {
            const loaded = {};
            unit.chapters.forEach(c => { loaded[c.id] = c; });
            const metas = ((window.COURSE && window.COURSE.chapters) || [])
                .filter(c => c.unit === unit.id && c.status !== 'planned');
            const list = metas.map(m => ({ id: m.id, title: loaded[m.id] ? loaded[m.id].title : m.title, available: !!loaded[m.id] }));
            // anything loaded that the table of contents does not list still counts
            unit.chapters.forEach(c => { if (!metas.some(m => m.id === c.id)) list.push({ id: c.id, title: c.title, available: true }); });
            return list;
        }

        function unavailableNotice(unit) {
            const errs = unit.errors || [];
            if (!errs.length) return '';
            const file = errs.some(er => er.fileProtocol) || location.protocol === 'file:';
            const n = errs.length;
            if (file) {
                const head = unit.chapters.length === 1 && document.body.dataset.chapter === unit.chapters[0].id
                    ? 'Only this chapter could be loaded, because the course was opened as a file.'
                    : unit.chapters.length
                        ? 'Only ' + unit.chapters.length + ' of this unit’s ' + (unit.chapters.length + n) + ' chapters could be loaded, because the course was opened as a file.'
                        : 'This unit’s chapters could not be loaded, because the course was opened as a file.';
                return '<div class="fc-notice" role="alert"><b>' + esc(head) + '</b>' +
                    '<p>Open the course from its web address (for example http://localhost:4321) to revise the whole unit. ' +
                    'The chapters marked “not available” below are the ones missing.</p></div>';
            }
            return '<div class="fc-notice" role="alert"><b>' + n + ' chapter' + (n === 1 ? '' : 's') + ' could not be loaded, so ' + (n === 1 ? 'its' : 'their') + ' cards are missing.</b>' +
                '<p>Check your connection, then reload the page and open the flash cards again. The missing chapters are marked “not available” below.</p></div>';
        }

        function check(name, label, on, small) {
            return '<label class="fc-check"><input type="checkbox" data-opt="' + name + '" data-f="opt:' + name + '"' + (on ? ' checked' : '') + '>' +
                '<span>' + esc(label) + (small ? ' <small>(' + esc(small) + ')</small>' : '') + '</span></label>';
        }
        function radio(name, value, label, on) {
            return '<label class="fc-check"><input type="radio" name="bio-fc-' + name + '" value="' + value + '" data-radio="' + name + '" data-f="' + name + ':' + value + '"' +
                (on ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
        }

        function wireSetup() {
            const st = S.settings;
            const sel = body.querySelector('#bio-fc-unit');
            if (sel) sel.addEventListener('change', () => chooseUnit(sel.value));
            const retry = body.querySelector('.fc-retry');
            if (retry) retry.addEventListener('click', () => chooseUnit(S.unitId));
            body.querySelectorAll('input[name="bio-fc-mode"]').forEach(r => r.addEventListener('change', () => {
                st.mode = r.value; savePrefs(); renderSetup();
            }));
            const langSel = body.querySelector('#fc-lang');
            if (langSel) {
                const list = (window.TranslateCore && window.TranslateCore.LANGS) || FC_LANGS;
                langSel.innerHTML = list.map(l => '<option value="' + esc(l[0]) + '">' + esc(l[1]) + '</option>').join('');
                if (S.lang) langSel.value = S.lang;
            }
            const trBtn = body.querySelector('[data-f="fc-tr"]');
            if (trBtn) trBtn.addEventListener('click', () => runCardTranslate(trBtn));
            const trOff = body.querySelector('[data-f="fc-tr-off"]');
            if (trOff) trOff.addEventListener('click', () => { restoreEnglish(); renderSetup(); });

            body.querySelectorAll('input[data-opt]').forEach(c => c.addEventListener('change', () => {
                st[c.dataset.opt] = c.checked;
                if (c.dataset.opt !== 'includeKnown') savePrefs();
                renderSetup();
            }));
            body.querySelectorAll('input[data-radio]').forEach(r => r.addEventListener('change', () => {
                st[r.dataset.radio] = r.value; savePrefs(); renderSetup();
            }));
            body.querySelectorAll('input[data-ch]').forEach(c => c.addEventListener('change', () => {
                if (c.checked) st.chapters.add(c.dataset.ch); else st.chapters.delete(c.dataset.ch);
                renderSetup();
            }));
            body.querySelectorAll('button[data-all]').forEach(b => b.addEventListener('click', () => {
                st.chapters = b.dataset.all === '1' ? new Set(S.unit.chapters.map(c => c.id)) : new Set();   // only chapters that loaded
                renderSetup();
            }));
            const resetOpen = body.querySelector('[data-f="reset"]');
            if (resetOpen) resetOpen.addEventListener('click', () => { S.confirmingReset = true; renderSetup('[data-f="reset-yes"]'); });
            const resetNo = body.querySelector('[data-f="reset-no"]');
            if (resetNo) resetNo.addEventListener('click', () => { S.confirmingReset = false; renderSetup('[data-f="reset"]'); });
            const resetYes = body.querySelector('[data-f="reset-yes"]');
            if (resetYes) resetYes.addEventListener('click', () => {
                S.known = {};
                store.remove(progressKey(S.unitId));
                S.confirmingReset = false;
                renderSetup('#bio-fc-unit');
                announce('Progress reset. No cards are marked as known in this unit.');
            });
            const start = body.querySelector('.fc-start');
            if (start) start.addEventListener('click', () => { if (S.settings.mode === 'quiz') startQuiz(); else startStudy(); });
        }

        /* ---- building a card element ---- */
        const srcLink = (url, text) => '<a class="fc-src" href="' + esc(url) + '">' + esc(text) +
            ' <span aria-hidden="true">→</span></a>';

        function mediaEl(fig, decorative) {
            const media = document.createElement('div');
            const imgs = fig.images || [];
            media.className = 'fc-media' + (imgs.length === 2 ? ' is-pair' : '');
            if (imgs.length) {
                imgs.forEach(im => {
                    const cell = document.createElement('div');
                    cell.className = 'fc-cell';
                    const fit = document.createElement('div');
                    fit.className = 'fc-fit';
                    const img = document.createElement('img');
                    img.src = im.src;
                    img.alt = decorative ? '' : (im.alt || '');
                    img.decoding = 'async';
                    img.draggable = false;
                    fit.appendChild(img);
                    cell.appendChild(fit);
                    media.appendChild(cell);
                });
            } else if (fig.svg) {
                const cell = document.createElement('div');
                cell.className = 'fc-cell';
                const fit = document.createElement('div');
                fit.className = 'fc-fit is-svg';
                const svg = cloneSvg(fig.svg, decorative);
                if (svg) fit.appendChild(svg);
                cell.appendChild(fit);
                media.appendChild(cell);
            }
            if (decorative) media.setAttribute('aria-hidden', 'true');
            return media;
        }

        function chapterName(id) {
            const c = S.unit && S.unit.chapters.find(x => x.id === id);
            return c ? c.title : '';
        }

        function cardEl(card, kind) {
            const el = document.createElement('div');
            el.className = 'fc-card';
            el.dataset.cardId = card.id;
            const inner = document.createElement('div');
            inner.className = 'fc-card-inner';
            const front = document.createElement('section');
            front.className = 'fc-face fc-front';
            front.setAttribute('aria-label', 'Front of card');
            const back = document.createElement('section');
            back.className = 'fc-face fc-back';
            back.setAttribute('aria-label', 'Back of card');
            inner.appendChild(front);
            inner.appendChild(back);
            el.appendChild(inner);

            if (card.type === 'term') {
                const t = card.term;
                const meta = '<p class="fc-meta"><span class="fc-kind">Vocabulary</span><span>' + esc(chapterName(card.chapterId)) + '</span></p>';
                if (kind === 'quiz') {
                    front.innerHTML = '<div class="fc-face-body"><p class="fc-q-label">Which term matches this definition?</p>' +
                        '<p class="fc-def is-front">' + maskedHtml(t.definition, t.term) + '</p></div>';
                    back.innerHTML = '<div class="fc-face-body"><div class="fc-result"></div>' +
                        '<p class="fc-back-term">' + esc(t.term) + '</p><p class="fc-def">' + esc(t.definition) + '</p>' +
                        srcLink(t.url, 'From ' + chapterName(card.chapterId)) + '</div>';
                } else if (S.session && S.session.direction === 'def') {
                    front.innerHTML = '<div class="fc-face-body">' + meta +
                        '<p class="fc-def is-front">' + maskedHtml(t.definition, t.term) + '</p>' +
                        '<p class="fc-prompt">Which term is this? Say it out loud, then flip.</p></div>';
                    back.innerHTML = '<div class="fc-face-body">' + meta +
                        '<p class="fc-term">' + esc(t.term) + '</p>' +
                        '<p class="fc-def" style="margin-top:1rem;font-size:1rem">' + esc(t.definition) + '</p>' +
                        srcLink(t.url, 'From ' + chapterName(card.chapterId)) + '</div>';
                } else {
                    front.innerHTML = '<div class="fc-face-body">' + meta +
                        '<p class="fc-term">' + esc(t.term) + '</p>' +
                        '<p class="fc-prompt">What does it mean? Say it out loud, then flip.</p></div>';
                    back.innerHTML = '<div class="fc-face-body">' + meta +
                        '<p class="fc-back-term">' + esc(t.term) + '</p>' +
                        '<p class="fc-def">' + esc(t.definition) + '</p>' +
                        srcLink(t.url, 'From ' + chapterName(card.chapterId)) + '</div>';
                }
            } else {
                const f = card.figure;
                const meta = '<p class="fc-meta"><span class="fc-kind">Diagram</span><span>' + esc(chapterName(card.chapterId)) + '</span></p>';
                const fbody = document.createElement('div');
                fbody.className = 'fc-face-fig';
                // No chapter, figure number or caption on the front: any of them
                // would hint at the answer the student is meant to produce.
                fbody.innerHTML = '<p class="fc-meta"><span class="fc-kind">Diagram</span></p>';
                fbody.appendChild(mediaEl(f, false));
                const prompt = document.createElement('p');
                prompt.className = 'fc-prompt';
                prompt.style.marginTop = '0.6rem';
                prompt.textContent = 'What does this diagram show? Name what you can see before you flip.';
                fbody.appendChild(prompt);
                front.appendChild(fbody);

                const rest = (f.captionBody || '').slice((f.captionShort || '').length).trim();
                const bbody = document.createElement('div');
                bbody.className = 'fc-face-body';
                bbody.innerHTML = meta;
                const grid = document.createElement('div');
                grid.className = 'fc-fig-back';
                grid.appendChild(mediaEl(f, true));
                const text = document.createElement('div');
                text.innerHTML = '<p class="fc-fig-label">' + esc(f.label) + '</p>' +
                    '<p class="fc-fig-short">' + esc(f.captionShort || f.captionBody || '') + '</p>' +
                    (rest ? '<p class="fc-fig-rest">' + esc(rest) + '</p>' : '') +
                    srcLink(f.url, 'See it in ' + chapterName(card.chapterId));
                grid.appendChild(text);
                bbody.appendChild(grid);
                back.appendChild(bbody);
            }
            return el;
        }

        // Put a new card on the stage; the old one leaves in `exit` direction.
        function showCard(stage, el, exit) {
            const old = [...stage.querySelectorAll('.fc-card:not(.is-leaving)')];
            old.forEach(o => {
                o.classList.remove('is-entering', 'is-lifting');
                o.classList.add('is-leaving', 'out-' + (exit || 'down'));
                o.setAttribute('aria-hidden', 'true');
                const done = () => o.remove();
                o.addEventListener('animationend', done, { once: true });
                setTimeout(done, 600);     // in case animations are off entirely
            });
            if (!el) return;
            el.classList.add('is-entering');
            el.addEventListener('animationend', ev => { if (ev.animationName === 'fc-in' || ev.animationName === 'fc-fade-in') el.classList.remove('is-entering'); });
            setTimeout(() => el.classList.remove('is-entering'), 700);
            stage.appendChild(el);
            stage.classList.toggle('is-figure', el.dataset.cardId.indexOf('fig:') === 0);
        }

        function flipEl(el, flipped) {
            el.classList.toggle('is-flipped', flipped);
            el.classList.remove('is-lifting');
            void el.offsetWidth;          // restart the lift even on a quick second flip
            el.classList.add('is-lifting');
            setTimeout(() => el.classList.remove('is-lifting'), 700);
        }

        /* ---- study session ---- */
        function deckFor(mode, only) {
            let cards = only ? only.slice() : selection(mode);
            if (!only && !S.settings.includeKnown) cards = cards.filter(c => !isKnown(c));
            return S.settings.shuffle ? shuffle(cards) : cards;
        }

        function startStudy(only) {
            const queue = deckFor('study', only);
            if (!queue.length) return;
            S.session = {
                mode: 'study', queue, current: null, flipped: false,
                direction: S.settings.direction,
                selectionIds: selection('study').map(c => c.id),
                knownNow: 0, againCount: 0, seen: new Set()
            };
            S.view = 'study';
            body.innerHTML =
                '<div class="fc-play">' +
                    '<div class="fc-stage" tabindex="0" role="group" aria-roledescription="flash card" aria-label="Flash card. Press Space to flip.">' +
                        '<div class="fc-deck" aria-hidden="true" data-depth="2"><span></span><span></span></div>' +
                    '</div>' +
                    '<div class="fc-controls"></div>' +
                    '<p class="fc-hint"><span class="fc-kbd-hint">Space or Enter flips · ← or 1 for Again · → or 2 for Know it · Esc closes</span>' +
                    '<span class="fc-touch-only">Tap the card to flip. Then swipe left for Again, right for Know it.</span></p>' +
                    '<div style="text-align:center;flex:none"><button type="button" class="fc-link-btn fc-end">End session and go back to setup</button></div>' +
                '</div>';
            const stage = body.querySelector('.fc-stage');
            body.querySelector('.fc-end').addEventListener('click', () => renderSetup());
            nextStudyCard(null);
            stage.focus({ preventScroll: true });
        }

        function studyStatus() {
            const s = S.session;
            const total = s.selectionIds.length;
            const known = s.selectionIds.filter(id => S.known[id]).length;
            const left = s.queue.length + (s.current ? 1 : 0);
            setStatus('<b>' + known + '</b> of ' + total + ' known · <b>' + left + '</b> left this session');
        }

        function nextStudyCard(exit) {
            const s = S.session;
            const stage = body.querySelector('.fc-stage');
            s.current = s.queue.shift() || null;
            s.flipped = false;
            if (!s.current) { showCard(stage, null, exit); finishStudy(); return; }
            s.seen.add(s.current.id);
            const el = cardEl(s.current, 'study');
            wireCard(el);
            showCard(stage, el, exit);
            const deck = stage.querySelector('.fc-deck');
            deck.setAttribute('data-depth', String(Math.min(2, s.queue.length)));
            renderStudyControls();
            studyStatus();
            const c = s.current;
            const left = s.queue.length + 1;
            announce((left === 1 ? 'Last card. ' : left + ' cards left. ') + (c.type === 'term'
                ? (s.direction === 'def' ? 'Definition: ' + c.term.definition.replace(new RegExp(reRaw(c.term.term), 'gi'), 'blank') + ' Which term is this?' : 'Term: ' + c.term.term + '. What does it mean?')
                : 'Diagram. ' + (c.figure.images || []).map(i => i.alt).join(' ') + ' What does this diagram show? Name what you can see before you flip.'));
        }

        function renderStudyControls() {
            const s = S.session;
            const ctr = body.querySelector('.fc-controls');
            const hadFocus = ctr.contains(document.activeElement);
            ctr.innerHTML = s.flipped
                ? '<button type="button" class="fc-btn fc-btn-again" data-act="again" aria-keyshortcuts="ArrowLeft 1">' +
                      '<span class="fc-kbd" aria-hidden="true">← 1</span> Again</button>' +
                  '<button type="button" class="fc-btn fc-btn-primary" data-act="know" aria-keyshortcuts="ArrowRight 2">' +
                      'Know it <span class="fc-kbd" aria-hidden="true">2 →</span></button>'
                : '<button type="button" class="fc-btn fc-btn-primary" data-act="flip" aria-keyshortcuts="Space Enter">' +
                      'Flip card <span class="fc-kbd" aria-hidden="true">Space</span></button>';
            ctr.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
                const act = b.dataset.act;
                if (act === 'flip') flipStudy();
                else if (act === 'again') studyAgain();
                else studyKnow();
            }));
            if (hadFocus) body.querySelector('.fc-stage').focus({ preventScroll: true });
        }

        function flipStudy() {
            const s = S.session;
            if (!s || !s.current) return;
            const el = body.querySelector('.fc-stage .fc-card:not(.is-leaving)');
            if (!el) return;
            s.flipped = !s.flipped;
            flipEl(el, s.flipped);
            const face = el.querySelector(s.flipped ? '.fc-back' : '.fc-front');
            face.scrollTop = 0;
            renderStudyControls();
            const c = s.current;
            if (s.flipped) {
                announce('Answer. ' + (c.type === 'term'
                    ? c.term.term + ': ' + c.term.definition
                    : c.figure.label + '. ' + c.figure.captionBody) + ' Did you know it? Again, or Know it.');
            } else {
                announce('Front of the card again.');
            }
        }

        function studyAgain() {
            const s = S.session;
            if (!s || !s.current || !s.flipped) return;
            s.againCount++;
            const c = s.current;
            // back a few cards later, so it returns while it is still fresh but not immediately
            if (s.queue.length < 3) s.queue.push(c);
            else s.queue.splice(3 + Math.floor(Math.random() * (Math.min(5, s.queue.length) - 2)), 0, c);
            nextStudyCard('left');
            focusStageIfNeeded();
        }

        function studyKnow() {
            const s = S.session;
            if (!s || !s.current || !s.flipped) return;
            S.known[s.current.id] = Date.now();
            saveKnown(S.unitId, S.known);
            s.knownNow++;
            nextStudyCard('right');
            focusStageIfNeeded();
        }

        function focusStageIfNeeded() {
            if (!S.session || S.view !== 'study') return;
            const a = document.activeElement;
            if (!a || !root.contains(a) || a === document.body) {
                const stage = body.querySelector('.fc-stage');
                if (stage) stage.focus({ preventScroll: true });
            }
        }

        function studyKey(e) {
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const onControl = tag === 'button' || tag === 'a';
            if ((e.key === ' ' || e.key === 'Enter') && !onControl) { e.preventDefault(); flipStudy(); return; }
            if (!S.session.flipped) return;
            if (e.key === 'ArrowLeft' || e.key === '1') { e.preventDefault(); studyAgain(); }
            else if (e.key === 'ArrowRight' || e.key === '2') { e.preventDefault(); studyKnow(); }
        }

        // tap to flip; once flipped, swipe sideways to sort
        function wireCard(el) {
            let start = null, dx = 0, swiped = false;
            const tags = () => el.querySelectorAll('.fc-swipe-tag');
            el.addEventListener('pointerdown', e => {
                if (e.button > 0 || e.target.closest('a')) return;
                start = { x: e.clientX, y: e.clientY, id: e.pointerId, t: e.pointerType, dragging: false };
                dx = 0;
            });
            el.addEventListener('pointermove', e => {
                if (!start || e.pointerId !== start.id || !S.session || !S.session.flipped) return;
                if (start.t === 'mouse') return;            // mouse users have the buttons and keys
                const mx = e.clientX - start.x, my = e.clientY - start.y;
                if (!start.dragging) {
                    if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(my) * 1.2) return;
                    start.dragging = true;
                    try { el.setPointerCapture(e.pointerId); } catch (err) { }
                    el.classList.add('is-dragging');
                    if (!el.querySelector('.fc-swipe-tag')) {
                        el.insertAdjacentHTML('beforeend', '<span class="fc-swipe-tag again" aria-hidden="true">Again</span><span class="fc-swipe-tag know" aria-hidden="true">Know it</span>');
                    }
                }
                dx = mx;
                el.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 40) + 'deg)';
                const [ag, kn] = tags();
                const k = Math.min(1, Math.abs(dx) / 90);
                if (ag) ag.style.opacity = dx < 0 ? k : 0;
                if (kn) kn.style.opacity = dx > 0 ? k : 0;
            });
            const end = e => {
                if (!start || (e && e.pointerId !== start.id)) return;
                const was = start.dragging;
                start = null;
                if (!was) return;
                swiped = true;
                el.classList.remove('is-dragging');
                if (Math.abs(dx) > 80 && e.type === 'pointerup') {
                    // the card flies off from where the finger let go of it
                    if (dx > 0) studyKnow(); else studyAgain();
                } else {
                    el.classList.add('is-snapping');
                    el.style.transform = '';
                    tags().forEach(t => { t.style.opacity = 0; });
                    setTimeout(() => el.classList.remove('is-snapping'), 260);
                }
            };
            el.addEventListener('pointerup', end);
            el.addEventListener('pointercancel', end);
            el.addEventListener('click', e => {
                if (swiped) { swiped = false; return; }
                if (e.target.closest('a')) return;
                // selecting text on the back should not flip the card over
                const sel = window.getSelection && window.getSelection();
                if (sel && String(sel).length > 1 && el.contains(sel.anchorNode)) return;
                if (S.view === 'study') flipStudy();
            });
        }

        function finishStudy() {
            const s = S.session;
            const total = s.selectionIds.length;
            const known = s.selectionIds.filter(id => S.known[id]).length;
            S.view = 'finish';
            setStatus('<b>' + known + '</b> of ' + total + ' known');
            body.innerHTML = '<div class="fc-scroll"><div class="fc-panel-wrap fc-finish">' +
                '<h3 class="fc-h">Session complete</h3>' +
                '<p class="fc-lede">Every card in this session ended in <em>Know it</em>. Coming back to them tomorrow will do more than going round again now.</p>' +
                '<div class="fc-stats">' +
                    '<div class="fc-stat"><b>' + s.seen.size + '</b><span>cards studied</span></div>' +
                    '<div class="fc-stat"><b>' + s.againCount + '</b><span>' + (s.againCount === 1 ? 'time' : 'times') + ' you chose Again</span></div>' +
                    '<div class="fc-stat"><b>' + known + ' / ' + total + '</b><span>known in this selection</span></div>' +
                '</div>' +
                '<div class="fc-finish-actions">' +
                    '<button type="button" class="fc-btn fc-btn-primary" data-f="again" data-autofocus>Study again</button>' +
                    '<button type="button" class="fc-btn" data-f="setup">Back to setup</button>' +
                '</div>' +
                '<p class="fc-note fc-again-note" hidden></p>' +
                '</div></div>';
            const againBtn = body.querySelector('[data-f="again"]');
            againBtn.addEventListener('click', () => {
                // Usually every card is known by now, which would leave an empty
                // session: go round the whole selection instead of doing nothing.
                startStudy(deckFor('study').length ? null : selection('study'));
            });
            body.querySelector('[data-f="setup"]').addEventListener('click', () => renderSetup());
            againBtn.focus({ preventScroll: true });
            announce('Session complete. ' + s.seen.size + ' cards studied. ' + known + ' of ' + total + ' known.');
        }

        /* ---- quiz ---- */
        function startQuiz(only) {
            const queue = deckFor('quiz', only);
            if (!queue.length) return;
            S.session = {
                mode: 'quiz', queue, current: null, answered: null,
                total: queue.length, firstRight: 0, retryRight: 0,
                wrongOnce: new Set(), missed: [], asked: 0
            };
            S.view = 'quiz';
            body.innerHTML =
                '<div class="fc-play">' +
                    '<div class="fc-stage is-quiz" aria-hidden="false"></div>' +
                    '<form class="fc-quiz-form" autocomplete="off" novalidate>' +
                        '<label class="fc-quiz-label" for="bio-fc-answer">Your answer</label>' +
                        '<div class="fc-quiz-row">' +
                            '<input class="fc-input" id="bio-fc-answer" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go">' +
                            '<button type="submit" class="fc-btn fc-btn-primary fc-submit">Check <span class="fc-kbd" aria-hidden="true">Enter</span></button>' +
                            '<button type="button" class="fc-btn fc-skip">I don’t know</button>' +
                        '</div>' +
                    '</form>' +
                    '<p class="fc-hint"><span class="fc-kbd-hint">Type the term and press Enter · Enter again for the next question · Esc closes</span></p>' +
                    '<div style="text-align:center;flex:none"><button type="button" class="fc-link-btn fc-end">End quiz and go back to setup</button></div>' +
                '</div>';
            const form = body.querySelector('form');
            const input = body.querySelector('.fc-input');
            form.addEventListener('submit', e => {
                e.preventDefault();
                if (S.session.answered) { nextQuestion(); return; }
                const res = mark(input.value, S.session.current.term.term, S.session.current.term.key);
                if (res.kind === 'empty') {
                    announce('Type the term first, or choose I don’t know.');
                    input.focus();
                    return;
                }
                quizResult(res, input.value);
            });
            body.querySelector('.fc-skip').addEventListener('click', () => {
                if (S.session.answered) { nextQuestion(); return; }
                quizResult({ ok: false, kind: 'skip' }, '');
            });
            body.querySelector('.fc-end').addEventListener('click', () => renderSetup());
            nextQuestion();
        }

        function quizStatus() {
            const s = S.session;
            const left = s.queue.length + (s.current && !s.answered ? 1 : 0);
            setStatus('<b>' + s.firstRight + '</b> right first time · <b>' + left + '</b> left');
        }

        function nextQuestion() {
            const s = S.session;
            const stage = body.querySelector('.fc-stage');
            const input = body.querySelector('.fc-input');
            s.current = s.queue.shift() || null;
            s.answered = null;
            if (!s.current) { finishQuiz(); return; }
            s.asked++;
            const el = cardEl(s.current, 'quiz');
            showCard(stage, el, s.asked > 1 ? 'down' : null);
            input.readOnly = false;
            input.value = '';
            input.setAttribute('aria-describedby', '');
            body.querySelector('.fc-submit').innerHTML = 'Check <span class="fc-kbd" aria-hidden="true">Enter</span>';
            body.querySelector('.fc-skip').hidden = false;
            input.focus({ preventScroll: true });
            quizStatus();
            announce('Which term matches this definition? ' + s.current.term.definition.replace(new RegExp(reRaw(s.current.term.term), 'gi'), 'blank'));
        }

        function quizResult(res, typed) {
            const s = S.session;
            const c = s.current;
            const input = body.querySelector('.fc-input');
            s.answered = res;
            let cls, head, sub = '';
            if (res.ok) {
                cls = 'ok';
                if (!s.wrongOnce.has(c.id)) {
                    s.firstRight++;
                    S.known[c.id] = Date.now();
                    saveKnown(S.unitId, S.known);
                } else s.retryRight++;
                if (res.kind === 'typo') { head = 'Accepted — check the spelling: '; sub = c.term.term; }
                else head = 'Correct.';
            } else {
                cls = 'bad';
                if (!s.wrongOnce.has(c.id)) { s.wrongOnce.add(c.id); s.missed.push(c); }
                // comes back later in the round, like Again
                if (s.queue.length < 3) s.queue.push(c);
                else s.queue.splice(3 + Math.floor(Math.random() * (Math.min(5, s.queue.length) - 2)), 0, c);
                if (res.kind === 'skip') head = 'Here is the answer. It will come back later in the quiz.';
                else if (res.kind === 'other') head = 'Not quite — ' + res.other.toLowerCase() + ' is a different term. It will come back later.';
                else head = 'Not quite — you wrote “' + typed.trim() + '”. It will come back later.';
            }
            const el = body.querySelector('.fc-stage .fc-card:not(.is-leaving)');
            const box = el.querySelector('.fc-result');
            box.className = 'fc-result ' + cls;
            box.innerHTML = (res.ok ? '✓ ' : '✗ ') + esc(head) + (sub ? '<em>' + esc(sub) + '</em>' : '');
            flipEl(el, true);
            input.readOnly = true;
            body.querySelector('.fc-submit').innerHTML = 'Next <span class="fc-kbd" aria-hidden="true">Enter</span>';
            body.querySelector('.fc-skip').hidden = true;
            input.focus({ preventScroll: true });
            quizStatus();
            announce(head + (sub ? ' ' + sub + '.' : '') + ' The answer is ' + c.term.term + ': ' + c.term.definition + ' Press Enter for the next question.');
        }

        function finishQuiz() {
            const s = S.session;
            S.view = 'quizEnd';
            setStatus('<b>' + s.firstRight + '</b> of ' + s.total + ' right first time');
            const pct = s.total ? Math.round(s.firstRight / s.total * 100) : 0;
            const verdict = pct === 100 ? 'Every one first time.' : pct >= 80 ? 'Strong — a few to tidy up.' : pct >= 50 ? 'Good progress. The missed ones are worth another look.' : 'A start. Study the missed terms, then try again.';
            body.innerHTML = '<div class="fc-scroll"><div class="fc-panel-wrap fc-finish">' +
                '<h3 class="fc-h">Quiz complete</h3>' +
                '<p class="fc-big">' + s.firstRight + ' / ' + s.total + '</p>' +
                '<p class="fc-lede" style="margin-bottom:0">right first time. ' + esc(verdict) + '</p>' +
                (s.missed.length
                    ? '<div class="fc-missed"><h3>Terms you missed (' + s.missed.length + ')</h3><ul>' +
                        s.missed.map(c => '<li><b>' + esc(c.term.term) + '</b>' + esc(c.term.definition) + '<br>' +
                            srcLink(c.term.url, 'From ' + chapterName(c.chapterId)) + '</li>').join('') +
                      '</ul></div>'
                    : '') +
                '<div class="fc-finish-actions">' +
                    (s.missed.length ? '<button type="button" class="fc-btn fc-btn-primary" data-f="missed">Quiz the missed terms</button>' : '') +
                    '<button type="button" class="fc-btn' + (s.missed.length ? '' : ' fc-btn-primary') + '" data-f="again">Quiz again</button>' +
                    '<button type="button" class="fc-btn" data-f="setup">Back to setup</button>' +
                '</div></div></div>';
            const missed = s.missed.slice();
            const mBtn = body.querySelector('[data-f="missed"]');
            if (mBtn) mBtn.addEventListener('click', () => startQuiz(missed));
            body.querySelector('[data-f="again"]').addEventListener('click', () => {
                if (deckFor('quiz').length) startQuiz();
                else startQuiz(selection('quiz'));
            });
            body.querySelector('[data-f="setup"]').addEventListener('click', () => renderSetup());
            (mBtn || body.querySelector('[data-f="again"]')).focus({ preventScroll: true });
            announce('Quiz complete. ' + s.firstRight + ' of ' + s.total + ' right first time.' + (s.missed.length ? ' ' + s.missed.length + ' missed.' : ''));
        }

        /* ---- start ---- */
        const startUnit = opts.unitId && units.some(u => u.id === opts.unitId) ? opts.unitId : null;
        if (startUnit) chooseUnit(startUnit);
        else renderPicker();

        return {
            close, focusFirst,
            get state() { return S; }
        };
    }

    window.Flashcards = {
        open,
        close() { if (app) app.close(); },
        // exposed for testing the marker and the SVG cloning in isolation
        _internals: { mark, normalise, levenshtein, cloneSvg, maskedHtml, buildCards, get app() { return app; } }
    };
})();
