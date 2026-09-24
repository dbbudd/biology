/* =============================================================
   PRESENT — CORE
   -------------------------------------------------------------
   Shared by the picker in the reader (assets/present.js) and the
   slide windows (present.html). Turns a unit read by
   assets/unit-content.js into a list of slides, draws one slide,
   and holds the small helpers both sides need: storage, the sync
   channel between windows, and screen detection.

   window.PresentCore
     build(unit, selectedKeys:Set, options) -> slides[]
     render(slide, ctx)  -> .pr-slide element
     fit(slideEl)        shrink type until the slide's content fits
     sectionKey(chapter, section), defaultOn(section)
     DEFAULT_OPTIONS, sentences(), leadSentence(), trimWords()
     session: newSession(), readSession(), updateSession()
     channel(session, role, onMessage)
     screens(), rememberScreens(mode), openAudienceWindow(url, name)
     loadScript(src), loadCss(href), mountSim(el, name, root, v)

   The rule that shapes build(): every word on a slide is the
   chapter's own. Bullets are whole sentences picked from the
   section, and a sentence is only ever shortened by cutting it,
   never reworded — an ellipsis marks the cut. Speaker notes are
   the section's full text, so the teacher can talk to it.
   ============================================================= */
(function () {
    'use strict';
    if (window.PresentCore) return;

    const STORE = 'bio_present_';
    const SCREENS_KEY = 'bio_present_screens';
    const MAX_BULLETS = 7;
    const MAX_WORDS = 25;
    // A slide holds roughly this many words of body comfortably. The budget is shared
    // out between however many bullets a part yields, so a part with two bullets gets
    // whole paragraphs while a part with seven gets a sentence each. Over-filling is
    // safe because fit() steps the type down; under-filling is not, and the old fixed
    // caps (first sentence only, then 25 words, then 5 bullets) discarded about two
    // thirds of the prose in this course — 87% of its paragraphs run past one sentence.
    const BODY_WORDS = 120;
    const MIN_BULLET_WORDS = 14;
    const MAX_BULLET_WORDS = 72;
    // At or below this many bullets, a part's text rides on its figure's slide.
    const MERGE_BULLETS = 2;
    const DEFAULT_OPTIONS = { figures: true, sims: true, questions: false };

    const CALLOUT_LABEL = {
        key: 'Key idea', note: 'Note', example: 'Example', misconception: 'Common misconception',
        try: 'Try this', recall: 'Looking back', ahead: 'Where this goes next'
    };

    // These four used to reach the speaker notes and nothing else, so 107 blocks of
    // teaching never reached the room — including every "Looking back" and "Where this
    // goes next", which are what carry a unit's thread from one chapter to the next.
    // They are too long to fold into a bullet: only 5 of the 71 notes run under 35
    // words, and the median is 60, so folding would have halved the typical one.
    const ASIDE_VARIANTS = ['note', 'example', 'recall', 'ahead'];

    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

    // A <template> parses HTML without fetching its images, so reading the
    // text out of a fragment never starts a download.
    function fragment(html) {
        const t = document.createElement('template');
        t.innerHTML = html || '';
        return t.content;
    }
    const htmlText = html => clean(fragment(html).textContent);

    /* ---- storage ------------------------------------------------------ */
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
        remove(k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } },
        json(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    };

    /* ---- sentences ---------------------------------------------------- */
    // Abbreviations whose full stop does not end a sentence.
    const ABBR = /\b(?:e\.g|i\.e|vs|cf|approx|Dr|Mr|Mrs|Ms|St|Fig)\.$/;

    // [start, end] offsets of each sentence in already-cleaned text, so a
    // run of sentences can be sliced back out of the original exactly.
    function sentenceSpans(text) {
        const spans = [];
        const re = /[.!?…]+["'”’)\]]*(?=\s|$)/g;
        let start = 0, m;
        while ((m = re.exec(text))) {
            const end = m.index + m[0].length;
            const rest = text.slice(end);
            const gap = rest.length - rest.replace(/^\s+/, '').length;
            const next = rest.charAt(gap);
            // "about 4 p.m. and…" — a lower-case word cannot start a sentence
            if (next && /[a-z]/.test(next)) continue;
            if (ABBR.test(text.slice(start, end))) continue;
            spans.push([start, end]);
            start = end + gap;
        }
        if (start < text.length) spans.push([start, text.length]);
        return spans.filter(s => s[1] > s[0]);
    }
    const sentences = text => sentenceSpans(clean(text)).map(s => clean(text).slice(s[0], s[1]));
    const wordCount = s => (s ? s.split(' ').length : 0);

    // The first sentence — or the first few, when the first is a stub like
    // "Growth." that means nothing on its own.
    function leadSentence(text, minWords) {
        text = clean(text);
        const spans = sentenceSpans(text);
        if (!spans.length) return '';
        let a = spans[0][0], b = spans[0][1], i = 1;
        while (i < spans.length && wordCount(text.slice(a, b)) < (minWords || 5)) { b = spans[i][1]; i++; }
        return text.slice(a, b);
    }

    // As many whole sentences from the start as fit in max words — for prompts,
    // where the question is often the second sentence of an item.
    function sentencesUpTo(text, max) {
        text = clean(text);
        const spans = sentenceSpans(text);
        if (!spans.length) return '';
        let b = spans[0][1];
        for (let i = 1; i < spans.length && wordCount(text.slice(spans[0][0], spans[i][1])) <= max; i++) b = spans[i][1];
        return trimWords(text.slice(spans[0][0], b), max);
    }

    // Shorten by cutting only. A little over the limit is left whole, because
    // an ellipsis costs more in meaning than three extra words do.
    function trimWords(s, max) {
        max = max || MAX_WORDS;
        s = clean(s);
        const words = s.split(' ');
        if (words.length <= max + 3) return s;
        for (let i = max; i >= 10; i--) {                     // prefer a clause break
            if (/[,;:]$/.test(words[i - 1])) return words.slice(0, i).join(' ').replace(/[,;:]$/, '') + '…';
            if (/^[—–]$/.test(words[i])) return words.slice(0, i).join(' ') + '…';
        }
        return words.slice(0, max).join(' ').replace(/[,;:—–]$/, '') + '…';
    }

    /* ---- building the deck ------------------------------------------- */
    const sectionKey = (chapter, section) => chapter.id + '#' + section.id;

    // Practice (quizzes, labs, checks) and Reference start unticked; every
    // teaching kind — Core, Case study, Worked example, Orientation or none — is on.
    const defaultOn = section => !/^(practice|reference)$/i.test(section.kind || '');

    function splitParts(section) {
        const parts = [{ heading: null, blocks: [], n: 0 }];
        section.blocks.forEach(b => {
            if (b.type === 'heading' && b.level <= 3) parts.push({ heading: b.text, blocks: [], n: parts.length });
            else parts[parts.length - 1].blocks.push(b);
        });
        return parts.filter(p => p.blocks.length);
    }

    // Text that belongs in the notes of the part's text slide. Misconceptions
    // and "try this" prompts get slides of their own, with their own notes.
    const isNoteBlock = b => b.type === 'p' || b.type === 'list' || b.type === 'heading' ||
        (b.type === 'callout' && b.variant !== 'misconception' && b.variant !== 'try');

    function notesFor(b) {
        if (b.type === 'p') return [{ html: b.html, text: b.text }];
        if (b.type === 'heading') return [{ heading: b.text }];
        if (b.type === 'list') return [{ list: b.ordered ? 'ol' : 'ul', items: b.items.map(i => i.html) }];
        if (b.type === 'callout') return [{ label: CALLOUT_LABEL[b.variant] || 'Note', html: b.html }];
        return [];
    }

    // The callout's paragraphs and list items as text, in order. A <p> inside
    // an <li> is part of that item, not a paragraph of its own.
    function calloutPieces(b) {
        const frag = fragment(b.html);
        return [...frag.querySelectorAll('p, li')]
            .filter(n => !(n.tagName === 'P' && n.closest('li')))
            .map(n => ({ tag: n.tagName.toLowerCase(), text: clean(n.textContent) }))
            .filter(p => p.text);
    }

    // Bullets for one part, by priority: key-idea sentences, then list items,
    // then the first sentence of each paragraph. Picked by priority, shown in
    // the order they appear in the chapter.
    function bulletsFor(blocks) {
        const cands = [];
        const seen = new Set();
        let order = 0;
        const add = (text, priority, kind) => {
            text = clean(text);                       // trimmed later, once the share is known
            if (!text || seen.has(text)) return;
            seen.add(text);
            cands.push({ text, priority, order: order++, kind });
        };
        blocks.forEach((b, idx) => {
            if (b.type === 'callout' && b.variant === 'key') {
                const pieces = calloutPieces(b);
                pieces.slice(0, 2).forEach(p => add(p.text, 0, 'key'));
            } else if (b.type === 'list') {
                // A list just before an interactive is usually how-to-use steps, which
                // belong on the interactive's slide notes more than on the summary.
                const steps = blocks[idx + 1] && blocks[idx + 1].type === 'sim';
                b.items.forEach(it => add(it.text, steps ? 3 : 1, 'li'));
            } else if (b.type === 'p' && !b.lead) {
                add(b.text, 2, 'p');
            } else {
                order++;
            }
        });
        const picked = cands.sort((x, y) => x.priority - y.priority || x.order - y.order)
            .slice(0, MAX_BULLETS)
            .sort((x, y) => x.order - y.order);
        // Share the slide's word budget between the bullets that survived, then take
        // whole sentences up to each bullet's share.
        const per = Math.max(MIN_BULLET_WORDS,
            Math.min(MAX_BULLET_WORDS, Math.floor(BODY_WORDS / Math.max(1, picked.length))));
        return picked.map(c => ({ text: sentencesUpTo(c.text, per), key: c.kind === 'key' }));
    }

    // A figure's caption without its leading "Figure 4.6 —", which the slide already
    // shows in the eyebrow.
    const figureCaption = f => f.caption.html.replace(/^\s*<b>\s*Figure[^<]*<\/b>\s*[—–-]?\s*/i, '');

    // The paragraphs just before a figure, table or interactive, so its notes
    // carry the text that introduces it.
    function contextNotes(blocks, i) {
        const got = [];
        for (let j = i - 1; j >= 0 && got.length < 2; j--) {
            const b = blocks[j];
            if (b.type === 'p' && !b.lead) got.unshift({ html: b.html, text: b.text });
            else if (b.type === 'list') got.unshift({ list: b.ordered ? 'ol' : 'ul', items: b.items.map(x => x.html) });
            else break;
        }
        if (got.length) got.unshift({ heading: 'From the text' });
        return got;
    }

    function splitUnitLabel(label) {
        const m = String(label || '').match(/^(.*?)\s+[—–-]\s+(.*)$/);
        return m ? { eyebrow: m[1], title: m[2] } : { eyebrow: '', title: label };
    }

    function build(unit, selected, options) {
        options = Object.assign({}, DEFAULT_OPTIONS, options || {});
        const slides = [];
        const chosen = unit.chapters
            .map(ch => ({ ch, secs: ch.sections.filter(s => selected.has(sectionKey(ch, s))) }))
            .filter(x => x.secs.length);
        if (!chosen.length) return slides;

        const u = splitUnitLabel(unit.label);
        slides.push({
            id: 'unit:' + unit.id, type: 'unit', eyebrow: u.eyebrow, title: u.title, unitLabel: unit.label,
            chapters: chosen.map(x => x.ch.title), url: chosen[0].ch.url.split('#')[0],
            chapterNumber: '', sectionTitle: u.eyebrow || unit.label,
            notes: chosen.flatMap(x => [{ heading: x.ch.title }].concat(x.ch.summary ? [{ text: x.ch.summary }] : []))
        });

        chosen.forEach(({ ch, secs }) => {
            const base = { chapterId: ch.id, chapterNumber: ch.number || '', chapterTitle: ch.title };
            const bare = ch.number ? ch.title.replace(/^\d+\.\d+\s*/, '') : ch.title;
            const chapterSlide = Object.assign({
                id: 'chapter:' + ch.id, type: 'chapter', eyebrow: ch.number ? 'Chapter ' + ch.number : u.eyebrow, title: bare,
                question: ch.question || '', lead: ch.lead ? trimWords(leadSentence(ch.lead), 30) : '',
                sectionTitle: 'Introduction', sectionId: 'overview', url: ch.url.split('#')[0],
                notes: (ch.lead ? [{ text: ch.lead }] : [])
            }, base);
            slides.push(chapterSlide);
            secs.forEach(sec => sectionSlides(sec, base, options, slides, chapterSlide));
        });

        // Ids never depend on position, so a teacher's skipped slides stay skipped
        // when other topics are ticked or unticked around them.
        const seen = {};
        slides.forEach((s, i) => {
            s.index = i;
            if (seen[s.id]) s.id += '~' + (++seen[s.id]); else seen[s.id] = 1;
        });
        return slides;
    }

    // The slides that will actually be shown, numbered 1..N among themselves.
    // Copies, so the full deck keeps its own numbering for the preview grid.
    function playable(slides, skipped) {
        const skip = skipped instanceof Set ? skipped : new Set(skipped || []);
        return slides.filter(s => !skip.has(s.id))
            .map((s, i) => Object.assign({}, s, { index: i, fullIndex: s.index }));
    }

    function sectionSlides(sec, base, options, out, chapterSlide) {
        const isOverview = sec.id === 'overview';
        const secBase = Object.assign({}, base, {
            sectionId: sec.id, sectionTitle: isOverview ? 'Introduction' : sec.title, url: sec.url, kind: sec.kind
        });
        splitParts(sec).forEach(part => {
            // chapter + section + part + type + ordinal: stable while the content is
            const count = {};
            const make = o => {
                count[o.type] = (count[o.type] || 0) + 1;
                out.push(Object.assign({}, secBase, o, {
                    id: o.id || (base.chapterId + '#' + sec.id + '/' + part.n + '/' + o.type + '/' + count[o.type])
                }));
            };
            // The part's own h3 is the title and the section name goes in the eyebrow,
            // rather than being glued on with an em dash. Many h3s already contain one
            // ("Metaphase — line everything up on one plane"), so the joined string read
            // as three clauses and pushed the real heading down the slide.
            const title = part.heading || (isOverview ? chapterSlide.title : sec.title);
            const eyebrow = (part.heading && !isOverview) ? sec.title : '';
            const notes = part.blocks.filter(isNoteBlock).filter(b => !b.lead).flatMap(notesFor);
            let mergedFig = null;                     // set when a figure absorbs the part's text

            const makeAside = b => {
                const label = CALLOUT_LABEL[b.variant] || 'Note';
                const pieces = calloutPieces(b).slice(0, 4);
                const per = Math.max(MIN_BULLET_WORDS,
                    Math.min(MAX_BULLET_WORDS, Math.floor(BODY_WORDS / Math.max(1, pieces.length))));
                make({
                    type: 'aside', variant: b.variant, eyebrow: label, title,
                    bullets: pieces.map(p => ({ text: sentencesUpTo(p.text, per) })),
                    notes: [{ label, html: b.html }]
                });
            };
            // "Looking back" primes the content it sits above, so when it opens a part it
            // is shown before that part's text instead of trailing after it.
            const firstProse = part.blocks.findIndex(b => b.type === 'p' && !b.lead);
            const leading = part.blocks.filter((b, i) => b.type === 'callout' &&
                b.variant === 'recall' && (firstProse < 0 || i < firstProse));
            leading.forEach(makeAside);

            if (isOverview && !part.heading) {
                // the chapter title slide already shows the opening; its text is spoken to there
                chapterSlide.notes = chapterSlide.notes.concat(notes.filter(n => n.text !== chapterSlide.notes[0]?.text));
            } else {
                const bullets = bulletsFor(part.blocks);
                // A part with only a bullet or two beside a single figure used to make a
                // nearly empty slide followed by a picture. Show them together: the claim
                // and the evidence belong in front of the class at the same time.
                const figs = part.blocks.filter(b => b.type === 'figure');
                if (bullets.length && bullets.length <= MERGE_BULLETS && figs.length === 1 && options.figures) {
                    mergedFig = figs[0];
                    const f = mergedFig.figure;
                    make({
                        type: 'textfigure', title, eyebrow, bullets, figure: f, partTitle: title,
                        notes: notes.concat([{ label: f.label, html: figureCaption(f) }])
                    });
                } else if (bullets.length) {
                    make({ type: 'text', title, eyebrow, bullets, notes });
                }
            }

            part.blocks.forEach((b, i) => {
                if (b === mergedFig) return;          // already drawn beside its text
                if (leading.indexOf(b) >= 0) return;  // hoisted above the text slide
                if (b.type === 'figure' && options.figures) {
                    const f = b.figure;
                    make({
                        id: 'fig:' + f.id, type: 'figure', eyebrow: f.label, title: trimWords(f.captionShort || title, 20),
                        figure: f, partTitle: title,
                        notes: [{ label: f.label, html: figureCaption(f) }]
                    });
                } else if (b.type === 'table') {
                    make({ type: 'table', eyebrow: 'Table', title, html: b.html, notes: contextNotes(part.blocks, i) });
                } else if (b.type === 'callout' && b.variant === 'misconception') {
                    const bullets = calloutPieces(b).flatMap(p => sentences(p.text)).slice(0, 4)
                        .map(t => ({ text: trimWords(t) }));
                    make({ type: 'misconception', eyebrow: 'Common misconception', title, bullets,
                        notes: [{ label: 'Common misconception', html: b.html }] });
                } else if (b.type === 'callout' && b.variant === 'try') {
                    const pieces = calloutPieces(b);
                    const intro = pieces.filter(p => p.tag === 'p').slice(0, 1).map(p => trimWords(leadSentence(p.text), 30));
                    const items = pieces.filter(p => p.tag === 'li').slice(0, 6).map(p => sentencesUpTo(p.text, 30));
                    // a prompt with no list is usually a paragraph or two of instructions
                    const paras = items.length ? intro
                        : pieces.slice(0, 3).map(p => trimWords(leadSentence(p.text), 30));
                    make({ type: 'prompt', eyebrow: 'Try this', title, intro: paras, items,
                        notes: [{ label: 'Try this', html: b.html }] });
                } else if (b.type === 'callout' && ASIDE_VARIANTS.indexOf(b.variant) >= 0) {
                    makeAside(b);
                } else if (b.type === 'sim' && options.sims) {
                    make({ type: 'sim', eyebrow: 'Interactive', title: b.title, sim: b.name, partTitle: title,
                        notes: contextNotes(part.blocks, i) });
                } else if (b.type === 'video') {
                    make({ type: 'video', eyebrow: 'Video', title: b.title || title, video: b, partTitle: title,
                        notes: contextNotes(part.blocks, i) });
                } else if (b.type === 'quiz' && options.questions) {
                    // one version on the board; the other exists for a second paper
                    const picked = b.questions.filter(q => !q.variant);
                    picked.forEach((q, qi) => make({
                        type: 'quiz', eyebrow: 'Question ' + (qi + 1) + ' of ' + picked.length, title, question: q,
                        notes: [{ label: 'Answer', text: q.answer ? String.fromCharCode(64 + q.answer) + '. ' + (q.options[q.answer - 1] || '') : '' }]
                            .concat(q.why ? [{ label: 'Why', text: q.why }] : [])
                    }));
                } else if (b.type === 'check' && options.questions) {
                    b.questions.forEach((q, qi) => make({
                        type: 'check', eyebrow: 'Check your understanding · ' + (qi + 1) + ' of ' + b.questions.length, title, question: q,
                        notes: [{ label: 'Answer', html: q.answerHtml }]
                    }));
                }
            });
        });
    }

    /* ---- drawing a slide ---------------------------------------------- */
    let idSeq = 0;

    // The same inline SVG is drawn several times at once — in the grid, on the
    // stage and as the next-slide preview. Its ids (gradients, markers, the
    // <title> an aria-labelledby points at) would collide, and a url(#id) would
    // resolve to whichever copy came first, so each copy gets its own prefix.
    function uniquifyIds(root) {
        const nodes = root.querySelectorAll('[id]');
        if (!nodes.length) return root;
        const prefix = 'pr' + (++idSeq) + '-';
        const map = {};
        nodes.forEach(n => { map[n.id] = prefix + n.id; n.id = map[n.id]; });
        const urlRef = /url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g;
        const swapUrls = v => v.replace(urlRef, (m, q, id) => map[id] ? 'url(' + q + '#' + map[id] + q + ')' : m);
        root.querySelectorAll('*').forEach(n => {
            [...n.attributes].forEach(a => {
                const v = a.value;
                let nv = v;
                if (/^(xlink:)?href$/.test(a.name)) {
                    if (v.charAt(0) === '#' && map[v.slice(1)]) nv = '#' + map[v.slice(1)];
                } else if (/^(aria-(labelledby|describedby|controls|owns|details|activedescendant)|for)$/.test(a.name)) {
                    nv = v.split(/\s+/).map(t => map[t] || t).join(' ');
                } else if (v.indexOf('url(') > -1) {
                    nv = swapUrls(v);
                }
                if (nv !== v) a.value = nv;
            });
            if (n.tagName.toLowerCase() === 'style') {
                n.textContent = swapUrls(n.textContent).replace(/#([A-Za-z_][\w-]*)/g, (m, id) => map[id] ? '#' + map[id] : m);
            }
        });
        return root;
    }

    function notesHtml(notes) {
        if (!notes || !notes.length) return '<p class="pr-note-empty">No speaker notes for this slide.</p>';
        return notes.map(n => {
            if (n.heading) return '<h3 class="pr-note-h">' + esc(n.heading) + '</h3>';
            if (n.list) return '<' + n.list + '>' + n.items.map(i => '<li>' + i + '</li>').join('') + '</' + n.list + '>';
            const body = n.html != null ? n.html : '<p>' + esc(n.text) + '</p>';
            const wrapped = /^\s*<(p|ul|ol|div|table)/i.test(body) ? body : '<p>' + body + '</p>';
            return n.label
                ? '<div class="pr-note-block"><span class="pr-note-label">' + esc(n.label) + '</span>' + wrapped + '</div>'
                : wrapped;
        }).join('');
    }

    function footerHtml(slide, ctx) {
        const bits = [slide.chapterNumber, slide.sectionTitle].filter(Boolean).map(esc).join(' · ');
        const n = ctx.total ? '<span class="pr-foot-n">' + (slide.index + 1) + ' / ' + ctx.total + '</span>' : '';
        return '<footer class="pr-foot">' +
            '<span class="pr-foot-meta">' + bits + '</span>' + n +
            (slide.url ? '<a class="pr-foot-link" href="' + esc(slide.url) + '" target="_blank" rel="noopener"' +
                (ctx.live ? '' : ' tabindex="-1"') + '>Open in reader<span aria-hidden="true"> ↗</span></a>' : '') +
            '</footer>';
    }

    const bulletsHtml = bullets => '<ul class="pr-bullets">' + bullets.map(b =>
        '<li' + (b.key ? ' class="pr-key"' : '') + '>' +
        (b.key ? '<span class="pr-key-tag">Key idea</span> ' : '') + esc(b.text) + '</li>').join('') + '</ul>';

    // Drawn by the figure slide and by the split text+figure slide.
    function figureBody(f, ctx) {
        // "diagram" is carried so a figure's own ".diagram svg" rules still match; without
        // it 14 of the course's figures render as solid black boxes on a slide, and in the
        // PowerPoint export, which rasterises what the slide shows.
        const inner = f.kind === 'svg' && f.svg
            ? '<div class="pr-svg diagram">' + f.svg + '</div>'
            : f.images.map(im => '<div class="pr-img"><img src="' + esc(im.src) + '" alt="' + esc(im.alt) + '"' +
                (ctx.live ? '' : ' loading="lazy"') + ' decoding="async"></div>').join('');
        return '<div class="pr-figure pr-n' + Math.max(1, f.images.length) + '">' + inner + '</div>';
    }

    function bodyHtml(slide, ctx) {
        const answerBtn = ctx.live && !ctx.revealed
            ? '<button type="button" class="pr-reveal-btn" data-reveal>Show answer</button>' : '';
        switch (slide.type) {
            case 'unit':
                return '<ol class="pr-chapter-list' + (slide.chapters.length > 5 ? ' pr-two-col" style="grid-template-rows:repeat(' + Math.ceil(slide.chapters.length / 2) + ',auto)' : '') + '">' +
                    slide.chapters.map(t => '<li>' + esc(t) + '</li>').join('') + '</ol>';
            case 'chapter':
                return (slide.question ? '<p class="pr-question-label">The big question</p><p class="pr-question">' + esc(slide.question) + '</p>' : '') +
                    (slide.lead ? '<p class="pr-lead">' + esc(slide.lead) + '</p>' : '');
            case 'text':
                return bulletsHtml(slide.bullets);
            case 'textfigure':
                return '<div class="pr-split">' + bulletsHtml(slide.bullets) + figureBody(slide.figure, ctx) + '</div>';
            case 'aside':
                return '<div class="pr-callout pr-callout-' + esc(slide.variant) + '">' +
                    bulletsHtml(slide.bullets) + '</div>';
            case 'misconception':
                return '<div class="pr-callout pr-callout-mis"><ul class="pr-bullets">' +
                    slide.bullets.map(b => '<li>' + esc(b.text) + '</li>').join('') + '</ul></div>';
            case 'prompt':
                return '<div class="pr-callout pr-callout-try">' +
                    slide.intro.map(t => '<p class="pr-prompt-intro">' + esc(t) + '</p>').join('') +
                    (slide.items.length ? '<ol class="pr-prompt-items">' + slide.items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ol>' : '') +
                    '</div>';
            case 'figure':
                return figureBody(slide.figure, ctx);
            case 'table':
                return '<div class="pr-table-wrap">' + slide.html + '</div>';
            case 'sim':
                return ctx.live
                    ? '<div class="pr-live"><div class="sim" data-sim="' + esc(slide.sim) + '"><div class="sim-header"><h4>' +
                        esc(slide.title) + '</h4><span class="sim-kind">Interactive</span></div></div>' +
                        '<p class="pr-sim-fallback" hidden>This interactive could not start here. <a href="' + esc(slide.url) +
                        '" target="_blank" rel="noopener">Open it in the reader</a>.</p></div>'
                    : '<div class="pr-placeholder"><span class="pr-ph-icon" aria-hidden="true">&#9881;</span>' +
                        '<span class="pr-ph-title">' + esc(slide.title) + '</span>' +
                        '<span class="pr-ph-hint">' + esc(ctx.simHint || 'The live interactive starts when this slide is shown.') + '</span></div>';
            case 'video': {
                const v = slide.video;
                return '<div class="pr-video">' +
                    '<button type="button" class="pr-video-play"' + (ctx.live ? ' data-video="' + esc(v.id) + '"' : ' tabindex="-1"') +
                    ' aria-label="Play video: ' + esc(v.title || slide.title) + '">' +
                    // the video's own poster, as YouTube shows it, so the room recognises it;
                    // alt is empty because the button already names the video
                    '<img class="pr-video-thumb" src="https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/hqdefault.jpg" alt="" loading="lazy" decoding="async">' +
                    '<span class="pr-video-shade" aria-hidden="true"></span>' +
                    '<span class="pr-video-icon" aria-hidden="true">&#9654;</span>' +
                    '<span class="pr-video-label">' + esc(v.title || slide.title) + '</span>' +
                    '<span class="pr-video-hint">' + (ctx.live ? 'Click to play' : 'Plays when clicked') + (v.source ? ' · ' + esc(v.source) : '') + '</span>' +
                    '</button></div>';
            }
            case 'quiz': {
                const q = slide.question;
                return '<p class="pr-stem">' + esc(q.stem) + '</p><ol class="pr-options">' +
                    q.options.map((o, i) => '<li class="' + (ctx.revealed && q.answer === i + 1 ? 'pr-correct' : '') + '">' +
                        '<span class="pr-opt-letter">' + String.fromCharCode(65 + i) + '</span><span>' + esc(o) + '</span>' +
                        (ctx.revealed && q.answer === i + 1 ? '<span class="pr-sr"> (correct answer)</span>' : '') + '</li>').join('') + '</ol>' +
                    (ctx.revealed && q.why ? '<p class="pr-why">' + esc(q.why) + '</p>' : '') + answerBtn;
            }
            case 'check': {
                const q = slide.question;
                return '<p class="pr-stem">' + esc(q.question) + '</p>' +
                    (ctx.revealed ? '<div class="pr-answer">' + q.answerHtml + '</div>' : '') + answerBtn;
            }
        }
        return '';
    }

    // On the big screen, swap in the sharper poster when the video has one.
    // YouTube answers a missing sddefault with a 120 × 90 grey placeholder
    // rather than an error, so the size is what says whether it is real.
    function sharperPoster(img) {
        if (!img) return;
        const hi = new Image();
        hi.onload = () => { if (hi.naturalWidth > 120 && img.isConnected) img.src = hi.src; };
        hi.src = img.src.replace('/hqdefault.jpg', '/sddefault.jpg');
    }

    // ctx: { total, hue, live, revealed, simHint }
    function render(slide, ctx) {
        ctx = ctx || {};
        const el = document.createElement('div');
        el.className = 'pr-slide pr-t-' + slide.type + (slide.variant ? ' pr-v-' + slide.variant : '') +
            (ctx.live ? ' pr-is-live' : '');
        if (slide.lang) {
            el.setAttribute('lang', slide.lang);
            // without this Arabic lays out left-to-right and reads as nonsense
            if (isRtl(slide.lang)) el.setAttribute('dir', 'rtl');
        }
        el.style.setProperty('--unit-h', ctx.hue == null ? 210 : ctx.hue);
        el.dataset.index = slide.index;
        const head = '<header class="pr-head">' +
            (slide.eyebrow ? '<p class="pr-eyebrow">' + esc(slide.eyebrow) + '</p>' : '') +
            '<h2 class="pr-title">' + esc(slide.title) + '</h2></header>';
        el.innerHTML = '<div class="pr-inner">' + head + '<div class="pr-body">' + bodyHtml(slide, ctx) + '</div>' +
            footerHtml(slide, ctx) + '</div>';
        el.querySelectorAll('.pr-body a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
        if (ctx.live) sharperPoster(el.querySelector('.pr-video-thumb'));
        return uniquifyIds(el);
    }

    function renderNotes(slide) {
        const div = document.createElement('div');
        div.className = 'pr-notes-content';
        div.innerHTML = notesHtml(slide.notes);
        div.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
        return uniquifyIds(div);
    }

    // Long sections make long bullets. Rather than let text run off the
    // slide, step the type down (it is all sized from --fit) until it fits.
    function fit(el) {
        if (!el || !el.isConnected) return;
        const body = el.querySelector('.pr-body');
        if (!body || el.classList.contains('pr-t-sim') || el.classList.contains('pr-t-figure')) return;
        const min = el.classList.contains('pr-t-table') ? 0.4 : 0.55;
        let f = 1;
        el.style.setProperty('--fit', f);
        const over = () => body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1;
        while (f > min && over()) {
            f = Math.round((f - 0.05) * 100) / 100;
            el.style.setProperty('--fit', f);
        }
        el.classList.toggle('pr-overflow', over());
    }

    /* ---- translation ---------------------------------------------------
       A deck is translated as DATA, before anything is drawn. Everything
       downstream then follows for free — the player, the presenter view, the
       thumbnails, and, the reason it has to be done this way round, the
       PowerPoint and PDF exports, which read this same model and would
       otherwise still come out in English.
       Speaker notes stay in English unless asked for: the room reads the
       slides, the teacher reads the notes. */
    const RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'sd'];
    const isRtl = lang => RTL.indexOf(String(lang || '').split('-')[0]) >= 0;

    function translatableFields(slides, opts) {
        const F = [];
        const str = (o, k) => {
            if (o && typeof o[k] === 'string' && o[k].trim()) F.push({ get: () => o[k], set: v => { o[k] = v; } });
        };
        const arr = a => {
            if (Array.isArray(a)) a.forEach((v, i) => {
                if (typeof v === 'string' && v.trim()) F.push({ get: () => a[i], set: t => { a[i] = t; } });
            });
        };
        slides.forEach(sl => {
            str(sl, 'title'); str(sl, 'eyebrow'); str(sl, 'lead');
            if (typeof sl.question === 'string') str(sl, 'question');
            (sl.bullets || []).forEach(b => str(b, 'text'));
            arr(sl.intro); arr(sl.items); arr(sl.chapters);
            if (sl.question && typeof sl.question === 'object') {
                str(sl.question, 'text'); str(sl.question, 'stem'); str(sl.question, 'why');
                arr(sl.question.options);
            }
            if (opts && opts.notes) (sl.notes || []).forEach(n => { str(n, 'text'); str(n, 'heading'); });
        });
        return F;
    }

    async function translateDeck(slides, lang, opts) {
        opts = opts || {};
        const TC = window.TranslateCore;
        if (!TC || !TC.supported()) throw new Error('This browser has no on-device translator.');
        const out = JSON.parse(JSON.stringify(slides));     // the English deck is never touched
        const translator = opts.translator || await TC.create(lang, opts.onStatus);
        const fields = translatableFields(out, opts);
        const htmlJobs = [];
        out.forEach(sl => {
            if (sl.type === 'table' && sl.html) htmlJobs.push({ get: () => sl.html, set: v => { sl.html = v; } });
            if (opts.notes) (sl.notes || []).forEach(n => {
                if (n.html) htmlJobs.push({ get: () => n.html, set: v => { n.html = v; } });
            });
        });
        const total = fields.length + htmlJobs.length;
        let kept = 0;
        const res = await TC.translateAll(translator, fields.map(f => f.get()), {
            onProgress: (n, t, k) => { if (opts.onProgress) opts.onProgress(n, total, k); }
        });
        res.texts.forEach((t, i) => fields[i].set(t));
        kept += res.keptEnglish;
        for (let i = 0; i < htmlJobs.length; i++) {
            const r = await TC.translateHtml(translator, htmlJobs[i].get(), {});
            htmlJobs[i].set(r.html);
            kept += r.keptEnglish;
            if (opts.onProgress) opts.onProgress(fields.length + i + 1, total, kept);
        }
        out.forEach(sl => { sl.lang = lang; });
        return { slides: out, strings: total, keptEnglish: kept };
    }

    /* ---- sessions ----------------------------------------------------- */
    function newSession(data) {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        store.set(STORE + id, JSON.stringify(Object.assign({ created: Date.now(), at: 0 }, data)));
        prune(id);
        return id;
    }
    const readSession = id => (/^[a-z0-9]{6,24}$/.test(id || '') ? store.json(STORE + id) : null);
    function updateSession(id, patch) {
        const cur = readSession(id);
        if (cur) store.set(STORE + id, JSON.stringify(Object.assign(cur, patch)));
    }
    // Sessions are only needed while a presentation is open; drop old ones.
    function prune(keep) {
        try {
            const old = Date.now() - 14 * 864e5;
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (!k || k.indexOf(STORE) !== 0 || k === STORE + keep) continue;
                const v = store.json(k);
                if (v && v.unitId && v.created && v.created < old) store.remove(k);
            }
        } catch (e) { /* storage unavailable */ }
    }

    /* ---- sync between windows ----------------------------------------- */
    // Both windows post the whole state on every change, so a late joiner or a
    // dropped message can never leave them showing different slides for long.
    function channel(session, role, onMessage) {
        const me = role + '-' + Math.random().toString(36).slice(2, 8);
        let bc = null;
        try { bc = new BroadcastChannel('bio_present_' + session); } catch (e) { bc = null; }
        if (bc) {
            bc.onmessage = e => {
                const m = e.data;
                if (m && m.from !== me) onMessage(m);
            };
        }
        return {
            id: me,
            supported: !!bc,
            send(msg) { if (bc) { try { bc.postMessage(Object.assign({ from: me, role }, msg)); } catch (e) { /* closed */ } } },
            close() { if (bc) { bc.close(); bc = null; } }
        };
    }

    /* ---- screens ------------------------------------------------------ */
    // Chromium says whether there is a second screen without asking permission.
    // Mirrored displays count as one screen, which is exactly the case where a
    // presenter view would show the notes to the room.
    function screens() {
        const ext = window.screen ? window.screen.isExtended : undefined;
        if (ext === true) return { mode: 'extended', source: 'detected' };
        if (ext === false) return { mode: 'single', source: 'detected' };
        const saved = store.get(SCREENS_KEY);
        if (saved === 'extended' || saved === 'single') return { mode: saved, source: 'remembered' };
        return { mode: null, source: 'unknown' };
    }
    const rememberScreens = mode => { if (mode) store.set(SCREENS_KEY, mode); else store.remove(SCREENS_KEY); };

    // Opens the audience window, on the other screen when the browser can say
    // where that is. window.open has to run while the click that asked for it
    // still counts as a user gesture, so nothing slow happens before it except
    // getScreenDetails(), which resolves at once once permission is granted.
    async function openAudienceWindow(url, name) {
        const result = { win: null, blocked: false, placed: false, denied: false, api: false };
        let features = 'popup=yes,width=1280,height=720';
        if (window.screen && window.screen.isExtended === true && typeof window.getScreenDetails === 'function') {
            result.api = true;
            try {
                const d = await window.getScreenDetails();
                const here = d.currentScreen;
                const other = (d.screens || []).find(s => s !== here &&
                    !(here && s.left === here.left && s.top === here.top && s.width === here.width));
                if (other) {
                    features = 'popup=yes,left=' + other.availLeft + ',top=' + other.availTop +
                        ',width=' + other.availWidth + ',height=' + other.availHeight;
                    result.placed = true;
                }
            } catch (err) {
                result.denied = true;
            }
        }
        try { result.win = window.open(url, name, features); } catch (e) { result.win = null; }
        result.blocked = !result.win;
        return result;
    }

    /* ---- loading ------------------------------------------------------ */
    const scripts = {};
    function loadScript(src) {
        if (scripts[src]) return scripts[src];
        scripts[src] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => { delete scripts[src]; reject(new Error('could not load ' + src)); };
            document.head.appendChild(s);
        });
        return scripts[src];
    }
    function loadCss(href) {
        const abs = new URL(href, location.href).href;
        const have = [...document.querySelectorAll('link[rel="stylesheet"]')].find(l => l.href === abs);
        if (have) return Promise.resolve();
        return new Promise(resolve => {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = href;
            l.onload = l.onerror = () => resolve();
            document.head.appendChild(l);
        });
    }

    // The same two steps the reader uses: shared controls, then the sim itself.
    function mountSim(el, name, root, v) {
        const base = new URL(root || './', location.href).href;
        const q = '?v=' + encodeURIComponent(v || '1');
        const ready = (window.SIMS && typeof window.SIMS[name] === 'function')
            ? Promise.resolve()
            : (window.SIM_UI ? Promise.resolve() : loadScript(base + 'sims/_ui.js' + q))
                .then(() => loadScript(base + 'sims/' + name + '.js' + q));
        return ready.then(() => {
            const fn = (window.SIMS || {})[name];
            if (typeof fn !== 'function') throw new Error('sims/' + name + '.js did not register window.SIMS.' + name);
            fn(el);
        });
    }

    window.PresentCore = {
        DEFAULT_OPTIONS, CALLOUT_LABEL,
        build, playable, render, renderNotes, fit, uniquifyIds,
        translateDeck, isRtl,
        sectionKey, defaultOn, splitParts, bulletsFor,
        sentences, leadSentence, sentencesUpTo, trimWords, clean, esc, htmlText,
        store, newSession, readSession, updateSession,
        channel, screens, rememberScreens, openAudienceWindow,
        loadScript, loadCss, mountSim
    };
})();
