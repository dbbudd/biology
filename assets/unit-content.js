/* =============================================================
   UNIT CONTENT LOADER
   -------------------------------------------------------------
   Shared by the Flash cards and Present tools. Reads every ready
   chapter in a unit — the same HTML files the reader shows — and
   returns it as structured data, so neither tool keeps a second
   copy of the course content that could drift out of date.

   window.UnitContent.units()           ordered [{ id, label, hue }]
   window.UnitContent.currentUnitId()   unit of the page being read, or null
   window.UnitContent.load(unitId, { onProgress(done, total) })
       -> Promise<Unit>, cached per unit for the life of the page

   Unit     { id, label, hue, chapters[], figures[], terms[], errors[] }
   Chapter  { id, title, number, file, url, summary, question, lead, sections[] }
   Section  { id, title, kind, time, standards, url, blocks[] }
   Block    one of
     { type:'heading',  level, text }
     { type:'p',        html, text }
     { type:'list',     ordered, items:[{ html, text }] }
     { type:'callout',  variant, html, text, paragraphs:[html] }
     { type:'figure',   figure }            -> same object as in unit.figures
     { type:'table',    html, text }
     { type:'sim',      name, title }
     { type:'video',    id, title, source }
     { type:'quiz',     questions:[{ stem, options:[text], answer, why }] }
     { type:'check',    questions:[{ question, answerHtml, answerText }] }
   Figure   { id, number, label, kind:'image'|'svg', images:[{ src, alt }],
              svg, caption:{ html, text }, captionBody, captionShort,
              chapterId, chapterTitle, sectionId, sectionTitle, url }
   Term     { term, key, definition, chapterId, chapterTitle, sectionId, url }

   Every src and href is absolute, so the data can be used from any
   page or window. HTML fragments keep the reader's own classes
   (term, callout, …) and are the course's own trusted content.

   Reading other chapters needs fetch(), which browsers refuse on a
   page opened straight from disk (file://). In that case the current
   chapter is read from the live page and every other chapter is
   listed in unit.errors, so a tool can say so instead of failing.
   ============================================================= */
(function () {
    'use strict';
    if (window.UnitContent) return;

    const COURSE = window.COURSE || { chapters: [], glossary: {}, units: [] };
    const ROOT = (document.body && document.body.dataset.root) || '';
    const BASE = new URL(ROOT || './', location.href);          // the site root, absolute
    const cache = {};

    const glossaryByLower = {};
    Object.keys(COURSE.glossary || {}).forEach(k => { glossaryByLower[k.toLowerCase()] = k; });

    const units = () => (COURSE.units && COURSE.units.length)
        ? COURSE.units.slice()
        : [...new Set((COURSE.chapters || []).map(c => c.unit))].map(u => ({ id: u, label: u, hue: 210 }));

    function currentUnitId() {
        const id = document.body && document.body.dataset.chapter;
        const ch = (COURSE.chapters || []).find(c => c.id === id);
        return ch ? ch.unit : null;
    }

    const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

    // Make every relative src/href in a fragment absolute against the chapter's URL.
    function absolutise(el, pageUrl) {
        el.querySelectorAll('[src]').forEach(n => n.setAttribute('src', new URL(n.getAttribute('src'), pageUrl).href));
        el.querySelectorAll('a[href]').forEach(n => {
            const h = n.getAttribute('href');
            if (!/^(mailto:|javascript:)/i.test(h)) n.setAttribute('href', new URL(h, pageUrl).href);
        });
        return el;
    }

    // "Figure 4.14 — The difference is not size…" -> number, body, first sentence
    function splitCaption(figcaption) {
        const text = clean(figcaption ? figcaption.textContent : '');
        const m = text.match(/^Figure\s+([0-9]+\.[0-9]+[a-z]?)\s*[—–-]\s*(.*)$/i);
        const number = m ? m[1] : null;
        const body = m ? m[2] : text;
        const first = (body.match(/^.*?[.!?](?=\s|$)/) || [body])[0];
        return { number, body, short: first };
    }

    function parseFigure(fig, ctx, pageUrl) {
        const cap = fig.querySelector('figcaption');
        const { number, body, short } = splitCaption(cap);
        const imgs = [...fig.querySelectorAll(':scope > img, :scope > picture img')];
        const svg = fig.querySelector(':scope > svg');
        // A figure may keep its CSS in a <style> beside the svg instead of inside it.
        // Slides and flash cards lift the svg out of the page on its own, so that CSS has
        // to travel with it or the figure arrives unpainted -- which is exactly what
        // happened to Figure 1.14, whose eight data lines rendered with stroke:none.
        const svgHtml = (() => {
            if (!svg) return null;
            if (svg.querySelector('style')) return svg.outerHTML;
            const own = [...fig.querySelectorAll(':scope > style')].map(n => n.textContent).join('\n');
            if (!own.trim()) return svg.outerHTML;
            const c = svg.cloneNode(true);
            const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            st.textContent = own;
            c.insertBefore(st, c.firstChild);
            return c.outerHTML;
        })();
        const capClone = cap ? absolutise(cap.cloneNode(true), pageUrl) : null;
        const idx = ++ctx.figureCount;
        return {
            id: ctx.chapter.id + ':fig' + (number || idx),
            number,
            label: number ? 'Figure ' + number : 'Figure',
            kind: imgs.length ? 'image' : (svg ? 'svg' : 'image'),
            images: imgs.map(i => ({ src: new URL(i.getAttribute('src'), pageUrl).href, alt: i.getAttribute('alt') || '' })),
            svg: svgHtml,
            caption: { html: capClone ? capClone.innerHTML : '', text: clean(cap ? cap.textContent : '') },
            captionBody: body,
            captionShort: short,
            chapterId: ctx.chapter.id,
            chapterTitle: ctx.chapter.title,
            sectionId: ctx.section.id,
            sectionTitle: ctx.section.title,
            url: ctx.section.url
        };
    }

    // Every question is authored in TWO versions, as .quiz-variant blocks inside one
    // .quiz-q, so a class can sit two papers. Reading the .quiz-q instead of the variant
    // merged both versions into a single eight-option question with two right answers,
    // and looked for data-answer on an element that never carries it — so every question
    // in the course came back with answer:null. One entry per variant, tagged so a
    // consumer can pick version A or B.
    function parseQuiz(div) {
        const out = [];
        [...div.querySelectorAll('.quiz-q')].forEach((q, group) => {
            const found = [...q.querySelectorAll('.quiz-variant')];
            (found.length ? found : [q]).forEach((v, variant) => {
                const answer = parseInt(v.getAttribute('data-answer'), 10);
                out.push({
                    stem: clean((v.querySelector('.quiz-stem') || {}).textContent),
                    options: [...v.querySelectorAll('.quiz-options > li')].map(li => clean(li.textContent)),
                    answer: isNaN(answer) ? null : answer,      // 1-based, as in the markup
                    why: clean((v.querySelector('.quiz-why') || {}).textContent),
                    variant, group
                });
            });
        });
        return out;
    }

    function parseCheckItem(d, pageUrl) {
        const a = d.querySelector('.check-a');
        return {
            question: clean((d.querySelector('summary') || {}).textContent),
            answerHtml: a ? absolutise(a.cloneNode(true), pageUrl).innerHTML : '',
            answerText: clean(a ? a.textContent : '')
        };
    }
    function parseCheck(div, pageUrl) {
        return [...div.querySelectorAll('details.check-q')].map(d => parseCheckItem(d, pageUrl));
    }

    // Walk one node that sits directly (or inside a plain wrapper) in a section.
    function blocksFrom(node, ctx, pageUrl, out) {
        if (node.nodeType !== 1) return;
        const tag = node.tagName.toLowerCase();
        const cls = node.classList;

        if (/^h[2-6]$/.test(tag)) { out.push({ type: 'heading', level: +tag[1], text: clean(node.textContent) }); return; }
        if (tag === 'p') {
            if (cls.contains('video-credit')) return;
            const c = absolutise(node.cloneNode(true), pageUrl);
            const text = clean(c.textContent);
            if (text) out.push({ type: 'p', html: c.innerHTML, text, lead: cls.contains('lead') || undefined });
            return;
        }
        if (tag === 'ul' || tag === 'ol') {
            const items = [...node.children].filter(li => li.tagName === 'LI').map(li => {
                const c = absolutise(li.cloneNode(true), pageUrl);
                return { html: c.innerHTML, text: clean(c.textContent) };
            });
            if (items.length) out.push({ type: 'list', ordered: tag === 'ol', items });
            return;
        }
        if (tag === 'figure') {
            const figure = parseFigure(node, ctx, pageUrl);
            ctx.unitFigures.push(figure);
            out.push({ type: 'figure', figure });
            return;
        }
        // Nearly every check question sits inside a <div class="check">, but three in
        // u4-feedback.html sit loose in the section. The quiz/check/video branches all live
        // inside the div-or-aside test below, which a <details> never reaches, so those three
        // questions were missing from the printout and from Present entirely.
        if (tag === 'details' && cls.contains('check-q')) {
            out.push({ type: 'check', questions: [parseCheckItem(node, pageUrl)] });
            return;
        }
        if (tag === 'table') {
            const c = absolutise(node.cloneNode(true), pageUrl);
            out.push({ type: 'table', html: c.outerHTML, text: clean(c.textContent) });
            return;
        }
        if (tag === 'div' || tag === 'aside') {
            if (cls.contains('callout')) {
                const variant = ([...cls].find(x => x.startsWith('callout-')) || 'callout-note').replace('callout-', '');
                const c = absolutise(node.cloneNode(true), pageUrl);
                out.push({
                    type: 'callout', variant, html: c.innerHTML, text: clean(c.textContent),
                    paragraphs: [...c.querySelectorAll('p, li')].map(p => p.innerHTML)
                });
                return;
            }
            if (cls.contains('sim') && node.dataset.sim) {
                out.push({ type: 'sim', name: node.dataset.sim, title: clean((node.querySelector('h4') || {}).textContent) || node.dataset.sim });
                return;
            }
            if (cls.contains('video') && node.dataset.video) {
                out.push({ type: 'video', id: node.dataset.video, title: node.dataset.title || '', source: node.dataset.source || '' });
                return;
            }
            if (cls.contains('quiz')) { out.push({ type: 'quiz', questions: parseQuiz(node) }); return; }
            if (cls.contains('check')) { out.push({ type: 'check', questions: parseCheck(node, pageUrl) }); return; }
            // chapter furniture that the shell fills in at runtime
            if (cls.contains('chapter-meta') || cls.contains('chapter-eyebrow') || node.hasAttribute('data-progression')) return;
            // plain wrappers (tbl-scroll, objectives, resource-list, unnamed divs): look inside
            [...node.children].forEach(ch => blocksFrom(ch, ctx, pageUrl, out));
        }
    }

    function parseChapter(doc, meta, pageUrl, unitFigures, unitTerms) {
        const main = doc.querySelector('main') || doc.body;
        const chapter = {
            id: meta.id, title: meta.title,
            number: (meta.title.match(/^(\d+\.\d+)/) || [])[1] || null,
            file: meta.file, url: pageUrl,
            summary: meta.summary || '', question: meta.question || '',
            lead: clean((main.querySelector('p.lead') || {}).textContent),
            sections: []
        };
        const ctx = { chapter, unitFigures, figureCount: 0, section: null };
        const seenTerms = new Set(unitTerms.map(t => t.key));

        main.querySelectorAll(':scope > section').forEach(sec => {
            const h = sec.querySelector(':scope > h2, :scope > h1');
            const section = {
                id: sec.id || '',
                title: clean(h ? h.textContent : ''),
                kind: sec.dataset.kind || '',
                time: sec.dataset.time || '',
                standards: sec.dataset.standards || '',
                url: pageUrl.split('#')[0] + (sec.id ? '#' + sec.id : ''),
                blocks: []
            };
            ctx.section = section;
            [...sec.children].forEach(ch => {
                if (ch === h) return;
                blocksFrom(ch, ctx, pageUrl, section.blocks);
            });
            // vocabulary: first time each glossary term is marked in this unit
            sec.querySelectorAll('.term').forEach(t => {
                const key = glossaryByLower[clean(t.textContent).toLowerCase()];
                if (!key || seenTerms.has(key)) return;
                seenTerms.add(key);
                unitTerms.push({
                    term: key.charAt(0).toUpperCase() + key.slice(1),
                    key, definition: COURSE.glossary[key],
                    chapterId: chapter.id, chapterTitle: chapter.title,
                    sectionId: section.id, url: section.url
                });
            });
            chapter.sections.push(section);
        });
        return chapter;
    }

    function load(unitId, opts) {
        opts = opts || {};
        if (cache[unitId]) return cache[unitId];
        const unitMeta = units().find(u => u.id === unitId);
        if (!unitMeta) return Promise.reject(new Error('Unknown unit: ' + unitId));
        const metas = (COURSE.chapters || []).filter(c => c.unit === unitId && c.status !== 'planned');
        const liveId = document.body && document.body.dataset.chapter;
        let done = 0;

        const readOne = meta => {
            const pageUrl = new URL(meta.file, BASE).href;
            // Opened from disk, fetch is refused — but the chapter being read is
            // already in the page, so that one can still be read from the DOM.
            if (location.protocol === 'file:') {
                done++; if (opts.onProgress) opts.onProgress(done, metas.length);
                // every other chapter would only fail with a CORS error in the console
                return Promise.resolve(meta.id === liveId
                    ? { meta, pageUrl, doc: liveDocument() }
                    : { meta, pageUrl, error: new Error('the course was opened as a file, so other chapters cannot be read') });
            }
            return fetch(pageUrl, { cache: 'no-cache' })
                .then(r => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.text(); })
                .then(html => ({ meta, pageUrl, doc: new DOMParser().parseFromString(html, 'text/html') }))
                .catch(err => ({ meta, pageUrl, error: err }))
                .finally(() => { done++; if (opts.onProgress) opts.onProgress(done, metas.length); });
        };

        cache[unitId] = Promise.all(metas.map(readOne)).then(results => {
            const unit = { id: unitMeta.id, label: unitMeta.label, hue: unitMeta.hue, chapters: [], figures: [], terms: [], errors: [] };
            results.forEach(r => {
                if (r.error) {
                    unit.errors.push({ chapterId: r.meta.id, title: r.meta.title, message: String(r.error.message || r.error),
                        fileProtocol: location.protocol === 'file:' });
                    return;
                }
                unit.chapters.push(parseChapter(r.doc, r.meta, r.pageUrl, unit.figures, unit.terms));
            });
            return unit;
        });
        // a failed load should be retryable, not cached forever
        cache[unitId].catch(() => { delete cache[unitId]; });
        return cache[unitId];
    }

    // The live page has had the shell's chrome injected into it; read a
    // pristine copy of <main> so the parse matches a fetched chapter.
    let liveDoc = null;
    function liveDocument() {
        if (liveDoc) return liveDoc;
        const doc = document.implementation.createHTMLDocument('');
        const main = document.querySelector('main');
        if (main) {
            const copy = main.cloneNode(true);
            // strip what course.js adds at runtime
            copy.querySelectorAll('.chapter-nav, .section-tags, .section-pills, .head-actions, .sim > :not(.sim-header), .lightbox')
                .forEach(n => n.remove());
            copy.querySelectorAll('.section-head > h2').forEach(h2 => {
                const head = h2.parentNode; head.parentNode.insertBefore(h2, head); head.remove();
            });
            doc.body.appendChild(copy);
        }
        liveDoc = doc;
        return doc;
    }

    window.UnitContent = { units, currentUnitId, load };
})();
