/* =============================================================
   PRESENT — export a built deck to PowerPoint or PDF
   -------------------------------------------------------------
   The deck is a data model, but its LOOK lives in CSS, so this
   exporter measures rather than guesses: every slide is rendered
   offscreen at exactly 1280x720 and then walked. At that size a
   16:9 PowerPoint slide is 13.333in wide, so 1in = 96px exactly
   and both positions and type sizes convert without rounding:
       inches = px / 96        points = px * 0.75
   Reading the rendered slide also means --fit (the autoscale that
   shrinks a long slide) is already applied, and any change to
   present.css is picked up here for free.

   PptxGenJS (MIT) is vendored and loaded on demand, the same way
   sims/bottleneck.js loads three.js, so nothing is fetched from a
   CDN and export still works offline.
   ============================================================= */
(function () {
    'use strict';
    if (window.PresentExport) return;

    const W = 1280, H = 720;                 // the measuring stage, in px
    const IN = px => +(px / 96).toFixed(4);  // 1280px == 13.333in
    const PT = px => Math.max(1, +(px * 0.75).toFixed(1));
    const INLINE = /^(inline|inline-block|ruby|contents)/;
    const SKIP = new Set(['STYLE', 'SCRIPT', 'TEMPLATE', 'BR']);

    const rgba = s => {
        const n = String(s || '').match(/[\d.]+/g);
        return n ? [+n[0], +n[1], +n[2], n[3] == null ? 1 : +n[3]] : null;
    };
    const hex = s => {
        const c = rgba(s);
        if (!c) return null;
        return [c[0], c[1], c[2]].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    };
    const alphaOf = s => { const c = rgba(s); return c ? c[3] : 0; };
    // PowerPoint takes a family name, not a CSS stack. Segoe UI is the first entry
    // in --body-font and is native on Windows, where most of these decks will open.
    const faceOf = cs => (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim() || 'Segoe UI';
    const txt = s => String(s == null ? '' : s).replace(/\s+/g, ' ');

    function loadScript(src) {
        return new Promise((ok, no) => {
            const s = document.createElement('script');
            s.src = src; s.async = false;
            s.onload = ok; s.onerror = () => no(new Error('could not load ' + src));
            document.head.appendChild(s);
        });
    }
    async function pptxLib(root, v) {
        if (window.PptxGenJS) return window.PptxGenJS;
        const url = new URL((root || './') + 'vendor/pptxgen.bundle.min.js', location.href).href;
        await loadScript(url + (v ? '?v=' + v : ''));
        if (!window.PptxGenJS) throw new Error('PptxGenJS did not register');
        return window.PptxGenJS;
    }

    const loadImg = src => new Promise((ok, no) => {
        const i = new Image();
        i.onload = () => ok(i); i.onerror = () => no(new Error('image failed: ' + src));
        i.src = src;
    });

    // Same-origin, so this only reads what the page already loaded.
    async function dataUrlOf(src) {
        const r = await fetch(src);
        if (!r.ok) throw new Error('fetch ' + r.status + ' for ' + src);
        const b = await r.blob();
        return await new Promise((ok, no) => {
            const fr = new FileReader();
            fr.onload = () => ok(fr.result); fr.onerror = no;
            fr.readAsDataURL(b);
        });
    }

    // The YouTube thumbnail is a JPEG, but PptxGenJS stores a cover as .png and the
    // package then declares image/png for JPEG bytes. Re-encoding through a canvas
    // makes the file honest. i.ytimg.com sends CORS headers, so the canvas is clean.
    async function posterPng(url) {
        const img = await new Promise((ok, no) => {
            const i = new Image();
            i.crossOrigin = 'anonymous';
            i.onload = () => ok(i); i.onerror = () => no(new Error('poster failed'));
            i.src = url;
        });
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth || 480; cv.height = img.naturalHeight || 360;
        cv.getContext('2d').drawImage(img, 0, 0);
        return cv.toDataURL('image/png');
    }

    /* ---- inline SVG -> PNG --------------------------------------------
       A serialised <svg> leaves the document behind, so everything it was
       inheriting has to be written onto it first: the custom properties its
       own <style> reads, the theme attribute its [data-theme="dark"] rules
       match on, and the text fill/family that present.css was supplying from
       outside. Only text nodes are touched directly, and only when the
       computed fill is a real colour -- copying every computed fill would
       overwrite fill="url(#…)" gradient references. */
    const VARS = ['--dg-line', '--dg-fill', '--dg-ink', '--text', '--text-secondary', '--bg',
        '--bg-surface', '--border', '--red', '--blue', '--yellow', '--light-teal',
        '--body-font', '--unit-h', '--u-sat', '--u-light', '--u-soft'];

    async function svgToPng(live, scale) {
        const r = live.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        const clone = live.cloneNode(true);
        clone.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') || 'light');
        const cs = getComputedStyle(live);
        const css = [...clone.querySelectorAll('style')].map(n => n.textContent).join('\n');
        const want = new Set(VARS);
        for (const m of css.matchAll(/var\((--[\w-]+)/g)) want.add(m[1]);
        let decl = '';
        want.forEach(v => { const val = cs.getPropertyValue(v); if (val && val.trim()) decl += v + ':' + val.trim() + ';'; });
        clone.setAttribute('style', (clone.getAttribute('style') || '') + ';' + decl);

        const liveText = live.querySelectorAll('text, tspan');
        const cloneText = clone.querySelectorAll('text, tspan');
        for (let i = 0; i < liveText.length && i < cloneText.length; i++) {
            const t = getComputedStyle(liveText[i]), c = cloneText[i];
            if (/^rgb/.test(t.fill)) c.setAttribute('fill', t.fill);
            c.setAttribute('font-family', t.fontFamily);
            c.setAttribute('font-size', t.fontSize);
            if (t.fontWeight && t.fontWeight !== '400') c.setAttribute('font-weight', t.fontWeight);
        }
        clone.setAttribute('width', r.width);
        clone.setAttribute('height', r.height);
        if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
        const img = await loadImg(url);
        const cv = document.createElement('canvas');
        cv.width = Math.round(r.width * scale);
        cv.height = Math.round(r.height * scale);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        return cv.toDataURL('image/png');
    }

    /* ---- images have to be loaded BEFORE anything is measured -------------
       These slides size a figure with width:auto inside max-width/max-height, so an
       <img> that has not loaded yet has no intrinsic size and measures 0x0 -- and a
       zero-sized picture is exactly what PowerPoint was being handed. Slides are also
       rendered with live:false, which marks every figure loading="lazy"; inside an
       opacity:0 stage that can mean it never loads at all. So force them eager and
       wait for each one, then let layout settle before reading any rectangle. */
    async function settleImages(el) {
        const imgs = [...el.querySelectorAll('img')];
        imgs.forEach(i => { i.loading = 'eager'; i.decoding = 'sync'; });
        await Promise.all(imgs.map(i => (i.complete && i.naturalWidth)
            ? null
            : new Promise(done => {
                let t = 0;
                const fin = () => {
                    clearTimeout(t);
                    i.removeEventListener('load', fin); i.removeEventListener('error', fin);
                    done();
                };
                t = setTimeout(fin, 8000);            // a figure that will not load must not stall the export
                i.addEventListener('load', fin); i.addEventListener('error', fin);
            })));
        await nextFrames();
    }

    // Two frames, so layout reflects the intrinsic sizes that just arrived -- but
    // requestAnimationFrame is paused while a tab is hidden, and an export must not
    // hang because the teacher switched away from it, so a timer races the frames.
    function nextFrames() {
        return new Promise(resolve => {
            let settled = false;
            const fin = () => { if (!settled) { settled = true; resolve(); } };
            requestAnimationFrame(() => requestAnimationFrame(fin));
            setTimeout(fin, 150);
        });
    }

    /* ---- speaker notes ------------------------------------------------- */
    function notesText(notes) {
        if (!notes || !notes.length) return '';
        const out = [];
        notes.forEach(n => {
            if (n.heading) { out.push('— ' + txt(n.heading).trim() + ' —'); return; }
            let t = n.text;
            if (!t && n.html) { const d = document.createElement('div'); d.innerHTML = n.html; t = d.textContent; }
            t = txt(t).trim();
            if (t) out.push((n.label ? txt(n.label).trim() + ': ' : '') + t);
        });
        return out.join('\n\n');
    }

    /* ---- one slide ----------------------------------------------------- */
    async function emitSlide(pptx, el, model, opts) {
        const s = pptx.addSlide();
        const base = el.getBoundingClientRect();
        const at = node => {
            const r = node.getBoundingClientRect();
            return { x: IN(r.left - base.left), y: IN(r.top - base.top), w: IN(r.width), h: IN(r.height) };
        };
        const slideBg = hex(getComputedStyle(el).backgroundColor);
        if (slideBg) s.background = { color: slideBg };

        const jobs = [];
        // A YouTube slide becomes a genuine embedded online video rather than a picture
        // of a play button: PowerPoint 2013+ plays it in place, and the poster frame is
        // the real thumbnail (i.ytimg.com does send CORS headers, so it can be fetched
        // and embedded). The .pr-video subtree is then skipped so the thumbnail and the
        // play button are not also drawn underneath it.
        let skipNode = null;
        if (model.type === 'video' && model.video && model.video.id) {
            const holder = el.querySelector('.pr-video');
            if (holder) {
                skipNode = holder;
                const b = at(holder);
                const id = model.video.id;
                jobs.push((async () => {
                    const o = {
                        type: 'online', link: 'https://www.youtube.com/embed/' + encodeURIComponent(id),
                        x: b.x, y: b.y, w: b.w, h: b.h
                    };
                    try { o.cover = await posterPng('https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg'); }
                    catch (e) { /* PptxGenJS falls back to its own poster */ }
                    s.addMedia(o);
                })());
            }
        }

        const styleOf = node => {
            const c = getComputedStyle(node);
            const o = {
                fontFace: faceOf(c), fontSize: PT(parseFloat(c.fontSize)),
                color: hex(c.color) || '000000',
                bold: parseInt(c.fontWeight, 10) >= 600,
                italic: c.fontStyle === 'italic'
            };
            const ls = parseFloat(c.letterSpacing);
            if (ls) o.charSpacing = +(ls * 0.75).toFixed(2);
            if (c.textTransform === 'uppercase') o.upper = true;
            return o;
        };

        // rich runs, so an inline "Key idea" tag keeps its own size and colour
        const runsOf = node => {
            const out = [];
            node.childNodes.forEach(n => {
                if (n.nodeType === 3) {
                    const t = txt(n.textContent);
                    if (t.trim()) out.push({ text: t, options: styleOf(node) });
                } else if (n.nodeType === 1 && !SKIP.has(n.tagName)) {
                    const c = getComputedStyle(n);
                    if (c.display === 'none') return;
                    const t = txt(n.textContent);
                    if (!t.trim()) return;
                    const o = styleOf(n);
                    out.push({ text: o.upper ? t.toUpperCase() : t, options: o });
                }
            });
            if (!out.length) {
                const t = txt(node.textContent);
                if (t.trim()) { const o = styleOf(node); out.push({ text: o.upper ? t.toUpperCase() : t, options: o }); }
            }
            out.forEach(r => delete r.options.upper);
            return out;
        };

        const addText = node => {
            const runs = runsOf(node);
            if (!runs.length) return;
            const c = getComputedStyle(node);
            const b = at(node);
            const lh = parseFloat(c.lineHeight);
            const padL = parseFloat(c.paddingLeft) || 0;
            const o = {
                x: b.x + IN(padL), y: b.y, w: Math.max(0.2, b.w - IN(padL)), h: Math.max(0.12, b.h),
                margin: 0, valign: 'top', wrap: true,
                align: c.textAlign === 'center' ? 'center' : c.textAlign === 'right' ? 'right' : 'left'
            };
            if (lh && !isNaN(lh)) o.lineSpacing = PT(lh);
            s.addText(runs, o);
        };

        // ::before is not an element, so the bullet square is drawn from its
        // computed geometry rather than measured.
        const addMarker = node => {
            const p = getComputedStyle(node, '::before');
            if (!p || p.content === 'none') return;
            const bg = p.backgroundColor;
            if (alphaOf(bg) < 0.05) return;
            const w = parseFloat(p.width), h = parseFloat(p.height);
            if (!w || !h) return;
            const b = at(node);
            const left = parseFloat(p.left) || 0;
            const top = parseFloat(p.top) || 0;
            s.addShape(pptx.ShapeType.rect, {
                x: b.x + IN(left), y: b.y + IN(top), w: IN(w), h: IN(h),
                fill: { color: hex(bg) }, line: { type: 'none' }
            });
        };

        const paint = (node, c) => {
            const b = at(node);
            if (b.w <= 0 || b.h <= 0) return;
            const bg = c.backgroundColor;
            if (alphaOf(bg) > 0.03) {
                const rad = parseFloat(c.borderTopLeftRadius) || 0;
                const shape = rad > 2 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
                const o = { x: b.x, y: b.y, w: b.w, h: b.h, fill: { color: hex(bg) }, line: { type: 'none' } };
                if (rad > 2) o.rectRadius = Math.min(0.2, IN(rad));
                s.addShape(shape, o);
            }
            [['Left', 'x', 'w'], ['Top', 'y', 'h']].forEach(([side]) => {
                const bw = parseFloat(c['border' + side + 'Width']) || 0;
                const bc = c['border' + side + 'Color'];
                if (bw < 0.5 || alphaOf(bc) < 0.05) return;
                const o = side === 'Left'
                    ? { x: b.x, y: b.y, w: IN(bw), h: b.h }
                    : { x: b.x, y: b.y, w: b.w, h: IN(bw) };
                s.addShape(pptx.ShapeType.rect, Object.assign(o, { fill: { color: hex(bc) }, line: { type: 'none' } }));
            });
        };

        const isTextLeaf = node => {
            if (!txt(node.textContent).trim()) return false;
            return [...node.children].every(ch => INLINE.test(getComputedStyle(ch).display));
        };

        const walk = node => {
            if (node.nodeType !== 1 || SKIP.has(node.tagName)) return;
            if (node === skipNode) return;                 // drawn as embedded media instead
            const c = getComputedStyle(node);
            if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return;
            if (node.classList.contains('pr-foot') && opts.footers === false) return;

            paint(node, c);

            if (node.tagName === 'IMG') {
                const b = at(node);
                if (b.w < 0.02 || b.h < 0.02) return;       // unloaded or collapsed
                jobs.push(dataUrlOf(node.src)
                    .then(d => s.addImage({ data: d, x: b.x, y: b.y, w: b.w, h: b.h }))
                    .catch(() => { /* a figure that will not load is left out rather than breaking the file */ }));
                return;
            }
            if (node.tagName.toLowerCase() === 'svg') {
                const b = at(node);
                if (b.w < 0.02 || b.h < 0.02) return;
                jobs.push(svgToPng(node, opts.scale || 2)
                    .then(d => { if (d) s.addImage({ data: d, x: b.x, y: b.y, w: b.w, h: b.h }); })
                    .catch(() => { }));
                return;
            }
            if (node.tagName === 'TABLE') { addTable(node); return; }

            if (isTextLeaf(node)) {
                if (node.tagName === 'LI') addMarker(node);
                addText(node);
                return;
            }
            [...node.children].forEach(walk);
        };

        const addTable = table => {
            const b = at(table);
            const rows = [...table.rows].map(tr => [...tr.cells].map(td => {
                const c = getComputedStyle(td);
                return {
                    text: txt(td.textContent).trim(),
                    options: {
                        fontFace: faceOf(c), fontSize: PT(parseFloat(c.fontSize)),
                        color: hex(c.color) || '000000',
                        bold: parseInt(c.fontWeight, 10) >= 600 || td.tagName === 'TH',
                        fill: alphaOf(c.backgroundColor) > 0.03 ? { color: hex(c.backgroundColor) } : undefined,
                        align: c.textAlign === 'center' ? 'center' : c.textAlign === 'right' ? 'right' : 'left'
                    }
                };
            }));
            if (!rows.length) return;
            s.addTable(rows, {
                x: b.x, y: b.y, w: b.w, margin: 2,
                border: { type: 'solid', pt: 0.5, color: hex(getComputedStyle(table).borderTopColor) || 'CCCCCC' }
            });
        };

        walk(el);
        const n = notesText(model.notes);
        if (n) s.addNotes(n);
        await Promise.all(jobs);
    }

    /* ---- the stage ------------------------------------------------------ */
    function stage() {
        const host = document.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        // On screen but behind everything and not painted: rendering offscreen with
        // display:none would give every element a zero rect and measure nothing.
        host.style.cssText = 'position:fixed;left:0;top:0;width:' + W + 'px;height:' + H +
            'px;opacity:0;pointer-events:none;z-index:-1;overflow:hidden';
        const inner = document.createElement('div');
        inner.style.cssText = 'position:relative;width:' + W + 'px;height:' + H + 'px';
        host.appendChild(inner);
        document.body.appendChild(host);
        return { host, inner, destroy: () => host.remove() };
    }

    async function pptx(deck, opts) {
        opts = opts || {};
        const PC = window.PresentCore;
        if (!PC) throw new Error('PresentCore is not loaded');
        const slides = deck.slides || [];
        if (!slides.length) throw new Error('there are no slides to export');

        const Lib = await pptxLib(deck.root, deck.assetV);
        const st = stage();
        try {
            const deckOut = new Lib();
            deckOut.layout = 'LAYOUT_16x9';
            deckOut.title = deck.unitLabel || 'Biology';
            const ctx = { total: slides.length, hue: deck.hue, live: false };
            for (let i = 0; i < slides.length; i++) {
                const model = Object.assign({}, slides[i], { index: i });
                st.inner.innerHTML = '';
                const el = PC.render(model, ctx);
                st.inner.appendChild(el);
                await settleImages(el);                     // must precede fit() and every measurement
                PC.fit(el);
                await emitSlide(deckOut, el, model, opts);
                if (opts.onProgress) opts.onProgress(i + 1, slides.length);
            }
            // 'blob' hands the file back instead of downloading it, which is how the
            // export is checked without a save dialog.
            if (opts.output === 'blob') {
                const blob = await deckOut.write({ outputType: 'blob' });
                return { slides: slides.length, blob };
            }
            await deckOut.writeFile({ fileName: fileName(deck) + '.pptx' });
            return { slides: slides.length };
        } finally { st.destroy(); }
    }

    function fileName(deck) {
        const s = (deck.unitLabel || 'Biology slides').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
        return s || 'Biology slides';
    }

    /* ---- PDF, through the browser's own print dialog --------------------- */
    async function pdf(deck, opts) {
        opts = opts || {};
        const PC = window.PresentCore;
        const slides = deck.slides || [];
        if (!slides.length) throw new Error('there are no slides to export');

        const host = document.createElement('div');
        host.className = 'pr-print';
        const ctx = { total: slides.length, hue: deck.hue, live: false };
        slides.forEach((sl, i) => {
            const page = document.createElement('div');
            page.className = 'pr-print-page';
            page.appendChild(PC.render(Object.assign({}, sl, { index: i }), ctx));
            host.appendChild(page);
        });
        document.body.appendChild(host);
        // Scoped to the export: present.css is live on the chapter page too, so a
        // permanent @page there would follow the reader into every ordinary print.
        const pageCss = document.createElement('style');
        pageCss.setAttribute('data-pr-page', '');
        pageCss.textContent = '@page { size: 13.333in 7.5in; margin: 0; }';
        document.head.appendChild(pageCss);
        document.documentElement.classList.add('pr-printing');
        // let layout settle so every slide is measured at its printed size
        await settleImages(host);
        await new Promise(r => setTimeout(r, 60));
        host.querySelectorAll('.pr-slide').forEach(el => PC.fit(el));
        await new Promise(r => setTimeout(r, 40));
        const done = () => {
            window.removeEventListener('afterprint', done);
            document.documentElement.classList.remove('pr-printing');
            pageCss.remove();
            host.remove();
        };
        window.addEventListener('afterprint', done);
        window.print();
        setTimeout(() => { if (document.body.contains(host)) done(); }, 60000);
        return { slides: slides.length };
    }

    window.PresentExport = { pptx, pdf };
})();
