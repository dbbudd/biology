/* =============================================================
   PRINTABLE WORKBOOK
   -------------------------------------------------------------
   Builds a paper workbook for one unit out of the parsed chapters:
   ruled space to write in, vocabulary to complete, diagrams to
   label, multiple choice to answer on paper, and an answer key the
   teacher can leave out.

   Two rules run through the whole file.

   1. NOTHING IMPORTANT MAY BE A BACKGROUND. Browsers print with
      background graphics switched off unless the reader goes and
      finds the setting, so every writing line, box and rule here is
      a BORDER. A tinted panel would simply not be there on paper,
      and a ruled line drawn as a repeating-gradient would print as
      blank space.
   2. Nothing is invented. Questions, answers, figures and
      definitions all come from the same parsed unit the reader,
      Present and the flash cards use, so the paper cannot drift
      away from the chapters.
   ============================================================= */
(function () {
    'use strict';

    const bar = document.getElementById('po-controls');
    const doc = document.getElementById('po-doc');
    const lede = document.getElementById('po-lede');
    if (!doc) return;

    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
    const LETTERS = 'ABCDEFGH';

    const PREF = {
        get(k, d) { try { const v = localStorage.getItem('bio_po_' + k); return v == null ? d : v; } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem('bio_po_' + k, v); } catch (e) { } }
    };

    // The URL wins over a saved preference, so a printout can be asked for exactly —
    // printout.html?unit=u1&key=1 is the teacher's copy — and so a batch of PDFs can
    // be produced from the command line without anyone clicking anything.
    const Q = new URLSearchParams(location.search);
    const flag = (k, dflt) => {
        const q = Q.get(k);
        if (q === '1' || q === 'yes' || q === 'true') return true;
        if (q === '0' || q === 'no' || q === 'false') return false;
        return PREF.get(k, dflt ? '1' : '0') === '1';
    };
    const S = {
        unitId: Q.get('unit') || 'u1',
        unit: null,
        chapters: new Set(),
        only: (Q.get('chapters') || '').split(',').map(x => x.trim()).filter(Boolean),
        opts: {
            notes: flag('notes', true), vocab: flag('vocab', true), cloze: flag('cloze', true),
            figures: flag('figures', true), mcq: flag('mcq', true), short: flag('short', true),
            tryit: flag('tryit', true), mis: flag('mis', true), bank: flag('bank', true)
        },
        // Version A or B of every multiple-choice question, so two papers can go round one room.
        version: (Q.get('version') || PREF.get('version', 'A')).toUpperCase() === 'B' ? 1 : 0,
        lines: Math.max(1, Math.min(12, +(Q.get('lines') || PREF.get('lines', '4')) || 4)),
        // Letter, because the school prints on Letter. ?paper=A4 still overrides it.
        paper: (Q.get('paper') === 'A4' || PREF.get('paper', 'Letter') === 'A4') ? 'A4' : 'Letter'
    };
    if (Q.get('paper') === 'Letter') S.paper = 'Letter';

    /* ---- pieces ---------------------------------------------------------- */

    // Writing space. A border-bottom per line, because a background would not print.
    function rules(n, cls) {
        let out = '<div class="po-rules' + (cls ? ' ' + cls : '') + '">';
        for (let i = 0; i < n; i++) out += '<span class="po-rule"></span>';
        return out + '</div>';
    }
    // A gap to write a word into, sized roughly to the answer.
    const gap = (word, extra) => '<span class="po-gap' + (extra ? ' ' + extra : '') +
        '" style="min-width:' + Math.max(5, Math.min(22, String(word || '').length + 3)) + 'ch"></span>';

    const uid = (() => { let n = 0; return () => 'po' + (++n); })();

    // A figure's own ids would collide once several are on one page, and a
    // url(#…) fill would then resolve to whichever came first.
    function uniqueIds(root, tag) {
        const map = {};
        root.querySelectorAll('[id]').forEach(n => { map[n.id] = tag + '-' + n.id; n.id = map[n.id]; });
        if (!Object.keys(map).length) return;
        const attrs = ['fill', 'stroke', 'clip-path', 'mask', 'filter', 'href', 'xlink:href',
            'marker-start', 'marker-mid', 'marker-end'];
        root.querySelectorAll('*').forEach(n => {
            attrs.forEach(a => {
                const val = n.getAttribute && n.getAttribute(a);
                if (!val) return;
                const m = /^url\(#(.+?)\)$/.exec(val) || /^#(.+)$/.exec(val);
                if (m && map[m[1]]) n.setAttribute(a, val.indexOf('url(') === 0 ? 'url(#' + map[m[1]] + ')' : '#' + map[m[1]]);
            });
            const st = n.getAttribute && n.getAttribute('style');
            if (st && st.indexOf('url(#') >= 0) {
                n.setAttribute('style', st.replace(/url\(#(.+?)\)/g, (all, id) => map[id] ? 'url(#' + map[id] + ')' : all));
            }
        });
    }

    function figureHtml(f) {
        const tag = uid();
        let inner = '';
        if (f.kind === 'svg' && f.svg) {
            const holder = document.createElement('div');
            holder.innerHTML = f.svg;
            const svg = holder.querySelector('svg');
            if (svg) {
                svg.removeAttribute('width'); svg.removeAttribute('height');
                const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
                // Same trap as the lightbox: a viewBox-only SVG has no intrinsic size.
                if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) svg.style.aspectRatio = vb[2] + ' / ' + vb[3];
                uniqueIds(svg, tag);
                inner = holder.innerHTML;
            }
        } else if (f.images && f.images.length) {
            inner = f.images.map(im => '<img src="' + esc(im.src) + '" alt="' + esc(im.alt || '') + '">').join('');
        }
        if (!inner) return '';
        return '<figure class="po-fig">' +
            '<figcaption class="po-fig-cap"><b>' + esc(f.label || 'Figure') + '</b> — ' +
            esc(clean(f.captionShort || f.captionBody || '')) + '</figcaption>' +
            '<div class="po-fig-art diagram">' + inner + '</div>' +
            '<p class="po-fig-task">Label or annotate what you can see, then write one sentence saying what it shows.</p>' +
            rules(2) +
            '</figure>';
    }

    /* ---- gathering ------------------------------------------------------- */

    function calloutPieces(b) {
        const d = document.createElement('div');
        d.innerHTML = b.html || '';
        return [...d.querySelectorAll('p, li')]
            .filter(n => !(n.tagName === 'P' && n.closest('li')))   // a <p> inside an <li> is part of that item
            .map(n => ({ tag: n.tagName.toLowerCase(), text: clean(n.textContent) }))
            .filter(p => p.text);
    }
    const firstSentence = t => {
        const m = String(t).match(/^[\s\S]*?[.!?](?=\s|$)/);
        const one = (m ? m[0] : String(t)).trim();
        return one.length < 25 ? clean(t).slice(0, 240) : one;
    };

    const chapterTerms = ch => (S.unit.terms || []).filter(t => t.chapterId === ch.id);

    function chapterBlocks(ch) {
        const out = { heads: [], mcq: [], short: [], figures: [], keyIdeas: [], prose: [], tryit: [], mis: [] };
        ch.sections.forEach(sec => {
            (sec.blocks || []).forEach(b => {
                if (b.type === 'heading' && b.level <= 3) out.heads.push({ text: b.text, section: sec.title });
                else if (b.type === 'quiz') b.questions.forEach(q => out.mcq.push(q));
                else if (b.type === 'check') b.questions.forEach(q => out.short.push(q));
                else if (b.type === 'figure') out.figures.push(b.figure);
                else if (b.type === 'p' && !b.lead) {
                    const t = clean(b.text);
                    if (t.length > 60) out.prose.push(t);
                }
                else if (b.type === 'callout' && b.variant === 'try') out.tryit.push(b);
                else if (b.type === 'callout' && b.variant === 'misconception') out.mis.push(b);
                else if (b.type === 'callout' && b.variant === 'key') {
                    (b.paragraphs || []).forEach(p => {
                        const t = clean(String(p).replace(/<[^>]+>/g, ' '));
                        if (t.length > 40) out.keyIdeas.push(t);
                    });
                }
            });
        });
        return out;
    }

    // Cloze built from the chapter's own sentences, with a glossary word taken out.
    // Driven by the TERM list rather than by the sentences: looping over sentences
    // looking for a term found almost nothing, because a chapter's key ideas are
    // often phrased without the exact glossary word. Key-idea callouts are searched
    // first because they are the sentences worth memorising, then ordinary prose.
    function clozeFrom(keyIdeas, prose, terms, max) {
        const sources = keyIdeas.concat(prose);
        const items = [];
        for (const t of terms) {
            if (items.length >= (max || 8)) break;
            const re = new RegExp('\\b' + t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
            let found = null;
            for (const text of sources) {
                if (!re.test(text)) continue;
                // one sentence is the right size for a gap; a whole paragraph is not
                for (const sen of text.split(/(?<=[.!?])\s+(?=[A-Z"“(])/)) {
                    const m = re.exec(sen);
                    if (!m) continue;
                    if (sen.length < 45 || sen.length > 230) continue;
                    found = { sen, m };
                    break;
                }
                if (found) break;
            }
            if (!found) continue;
            items.push({
                answer: found.m[0],
                html: esc(found.sen.slice(0, found.m.index)) + gap(found.m[0]) +
                      esc(found.sen.slice(found.m.index + found.m[0].length))
            });
        }
        return items;
    }

    /* ---- the document ----------------------------------------------------- */

    function build() {
        const u = S.unit;
        const chs = u.chapters.filter(c => S.chapters.has(c.id));
        if (!chs.length) { doc.innerHTML = '<p class="po-loading">Tick at least one chapter.</p>'; return; }

        let html = '';

        html += '<section class="po-cover">' +
            '<p class="po-eyebrow">' + esc(u.label) + '</p>' +
            '<h2 class="po-cover-h">Workbook</h2>' +
            '<div class="po-namebox">' +
            '<span>Name<span class="po-gap po-gap-long"></span></span>' +
            '<span>Class<span class="po-gap"></span></span>' +
            '<span>Date<span class="po-gap"></span></span>' +
            '</div>' +
            '<p class="po-cover-note">' + chs.length + ' chapter' + (chs.length === 1 ? '' : 's') +
            '. Work in pencil, and leave anything you cannot do — a blank you can explain is worth more ' +
            'than a guess you cannot.</p>' +
            '</section>';

        chs.forEach(ch => {
            const parts = chapterBlocks(ch);
            const terms = chapterTerms(ch);
            html += '<section class="po-chapter">';
            html += '<header class="po-ch-head"><h2>' + esc(ch.title) + '</h2>' +
                (ch.question ? '<p class="po-ch-q">' + esc(ch.question) + '</p>' : '') + '</header>';

            if (S.opts.notes && parts.heads.length) {
                html += '<div class="po-part"><h3 class="po-part-h">Notes</h3>';
                parts.heads.forEach(h => {
                    html += '<div class="po-note"><h4>' + esc(h.text) + '</h4>' + rules(S.lines) + '</div>';
                });
                html += '</div>';
            }

            if (S.opts.vocab && terms.length) {
                html += '<div class="po-part"><h3 class="po-part-h">Vocabulary</h3>' +
                    '<p class="po-task">Write the word each description defines.</p>';
                // A word bank of one or two words hands the answer over, so it only
                // appears when there are enough terms for it to be a real choice.
                if (S.opts.bank && terms.length >= 3) {
                    const bank = terms.map(t => t.term).slice().sort((a, b) => a.localeCompare(b));
                    html += '<p class="po-bank"><b>Word bank:</b> ' + bank.map(esc).join(' · ') + '</p>';
                }
                html += '<ol class="po-vocab">';
                terms.forEach(t => {
                    html += '<li><span class="po-gap po-gap-long"></span><span class="po-def">' +
                        esc(clean(t.definition)) + '</span></li>';
                });
                html += '</ol></div>';
            }

            if (S.opts.cloze) {
                const items = clozeFrom(parts.keyIdeas, parts.prose, terms, 8);
                if (items.length) {
                    html += '<div class="po-part"><h3 class="po-part-h">Complete the idea</h3>' +
                        '<p class="po-task">Fill each gap with one word.</p><ol class="po-cloze">';
                    items.forEach(it => { html += '<li>' + it.html + '</li>'; });
                    html += '</ol></div>';
                }
            }

            if (S.opts.figures && parts.figures.length) {
                html += '<div class="po-part"><h3 class="po-part-h">Diagrams</h3>';
                parts.figures.forEach(f => { html += figureHtml(f); });
                html += '</div>';
            }

            // The chapters already carry written work in the author's own voice: 89 "Try
            // this" blocks course-wide, spread evenly across all six units, where the
            // check questions are not. Printing them beats inventing new ones.
            if (S.opts.tryit && parts.tryit.length) {
                html += '<div class="po-part"><h3 class="po-part-h">Try this</h3>';
                parts.tryit.forEach(b => {
                    const pieces = calloutPieces(b);
                    const intro = pieces.filter(p => p.tag === 'p');
                    const items = pieces.filter(p => p.tag === 'li');
                    html += '<div class="po-try">';
                    intro.forEach(p => { html += '<p class="po-try-intro">' + esc(p.text) + '</p>'; });
                    if (items.length) {
                        html += '<ol class="po-try-list">';
                        items.forEach(it => {
                            html += '<li class="po-q"><p class="po-stem">' + esc(it.text) + '</p>' +
                                rules(Math.max(2, S.lines - 1)) + '</li>';
                        });
                        html += '</ol>';
                    } else {
                        html += rules(S.lines);
                    }
                    html += '</div>';
                });
                html += '</div>';
            }

            // These are not printed as "spot the error": roughly half of them open with the
            // correction rather than the mistake, so calling every one wrong would misread
            // the author. The task works either way round.
            if (S.opts.mis && parts.mis.length) {
                html += '<div class="po-part"><h3 class="po-part-h">Where people go wrong</h3>' +
                    '<p class="po-task">For each statement, explain in your own words what it means ' +
                    'and what mistake it is guarding against.</p><ol class="po-mis">';
                parts.mis.forEach(b => {
                    const pieces = calloutPieces(b);
                    if (!pieces.length) return;
                    html += '<li class="po-q"><p class="po-stem">' + esc(firstSentence(pieces[0].text)) + '</p>' +
                        rules(Math.max(2, S.lines - 1)) + '</li>';
                });
                html += '</ol></div>';
            }

            const mcqList = parts.mcq.filter(q => (q.variant || 0) === S.version);
            if (S.opts.mcq && mcqList.length) {
                html += '<div class="po-part"><h3 class="po-part-h">Multiple choice</h3>' +
                    '<p class="po-task">Shade one box for each question. Version ' +
                    (S.version ? 'B' : 'A') + '.</p><ol class="po-mcq">';
                mcqList.forEach(q => {
                    html += '<li class="po-q"><p class="po-stem">' + esc(clean(q.stem)) + '</p><ul class="po-opts">' +
                        q.options.map((o, i) => '<li><span class="po-box">' + LETTERS[i] + '</span>' +
                            esc(clean(o)) + '</li>').join('') + '</ul></li>';
                });
                html += '</ol></div>';
            }

            if (S.opts.short && parts.short.length) {
                html += '<div class="po-part"><h3 class="po-part-h">Explain your thinking</h3><ol class="po-short">';
                parts.short.forEach(q => {
                    html += '<li class="po-q"><p class="po-stem">' + esc(clean(q.question)) + '</p>' + rules(S.lines) + '</li>';
                });
                html += '</ol></div>';
            }

            html += '</section>';
        });


        doc.innerHTML = html;
        // @page cannot read a custom property, so the size is written as a real rule.
        let ps = document.getElementById('po-paper-rule');
        if (!ps) { ps = document.createElement('style'); ps.id = 'po-paper-rule'; document.head.appendChild(ps); }
        ps.textContent = '@page { size: ' + (S.paper === 'Letter' ? 'Letter' : 'A4') + ' portrait; margin: 16mm 14mm; }';
        doc.setAttribute('data-ready', '1');
    }

    /* ---- controls --------------------------------------------------------- */

    const OPTS = [
        ['notes', 'Notes space'], ['vocab', 'Vocabulary'], ['cloze', 'Complete the idea'],
        ['figures', 'Diagrams'], ['mcq', 'Multiple choice'], ['tryit', 'Try this'],
        ['mis', 'Common misconceptions'], ['short', 'Explain your thinking'], ['bank', 'Word bank']
    ];

    function controls() {
        if (!bar) return;
        const u = S.unit;
        const units = (window.COURSE && window.COURSE.units) || [];
        bar.innerHTML =
            (units.length > 1
                ? '<div class="po-group"><span class="po-group-h">Unit</span><div class="po-checks">' +
                  '<select id="po-unit">' + units.map(x =>
                      '<option value="' + esc(x.id) + '"' + (x.id === S.unitId ? ' selected' : '') + '>' +
                      esc(x.short || x.label) + '</option>').join('') + '</select></div></div>'
                : '') +
            '<div class="po-group"><span class="po-group-h">Chapters</span><div class="po-checks" id="po-chs">' +
            u.chapters.map(c => '<label><input type="checkbox" data-ch="' + esc(c.id) + '"' +
                (S.chapters.has(c.id) ? ' checked' : '') + '> ' + esc(c.title) + '</label>').join('') +
            '<button type="button" class="po-link" data-all="1">All</button>' +
            '<button type="button" class="po-link" data-all="0">None</button>' +
            '</div></div>' +
            '<div class="po-group"><span class="po-group-h">Include</span><div class="po-checks">' +
            OPTS.map(([k, label]) => '<label><input type="checkbox" data-opt="' + k + '"' +
                (S.opts[k] ? ' checked' : '') + '> ' + esc(label) + '</label>').join('') +
            '</div></div>' +
            '<div class="po-group"><span class="po-group-h">Paper</span><div class="po-checks">' +
            '<label>Lines per heading <input type="number" id="po-lines" min="1" max="12" value="' + S.lines + '"></label>' +
            '<label>MCQ version <select id="po-version">' +
            ['A', 'B'].map(x => '<option' + ((x === 'B') === !!S.version ? ' selected' : '') + '>' + x + '</option>').join('') +
            '</select></label>' +
            '<label>Size <select id="po-paper">' +
            ['Letter', 'A4'].map(p => '<option' + (S.paper === p ? ' selected' : '') + '>' + p + '</option>').join('') +
            '</select></label>' +
            '<button type="button" class="po-print" id="po-print">Print / Save as PDF</button>' +
            '</div></div>';

        bar.addEventListener('change', e => {
            const t = e.target;
            if (t.dataset.ch) { t.checked ? S.chapters.add(t.dataset.ch) : S.chapters.delete(t.dataset.ch); build(); }
            else if (t.dataset.opt) { S.opts[t.dataset.opt] = t.checked; PREF.set(t.dataset.opt, t.checked ? '1' : '0'); build(); }
            else if (t.id === 'po-lines') { S.lines = Math.max(1, Math.min(12, +t.value || 4)); PREF.set('lines', S.lines); build(); }
            else if (t.id === 'po-paper') { S.paper = t.value; PREF.set('paper', S.paper); build(); }
            else if (t.id === 'po-version') { S.version = t.value === 'B' ? 1 : 0; PREF.set('version', t.value); build(); }
            // A different unit means reading different chapters, so the page reloads
            // rather than trying to swap the parsed unit underneath everything.
            else if (t.id === 'po-unit') {
                const q = new URLSearchParams(location.search);
                q.set('unit', t.value);
                q.delete('chapters');
                location.search = q.toString();
            }
        });
        bar.addEventListener('click', e => {
            const a = e.target.closest('[data-all]');
            if (a) {
                S.chapters = a.dataset.all === '1' ? new Set(u.chapters.map(c => c.id)) : new Set();
                bar.querySelectorAll('[data-ch]').forEach(c => { c.checked = S.chapters.has(c.dataset.ch); });
                build();
                return;
            }
            if (e.target.id === 'po-print') window.print();
        });
    }

    /* ---- start ------------------------------------------------------------ */
    window.UnitContent.load(S.unitId, {
        onProgress(done, total) {
            doc.innerHTML = '<p class="po-loading">Reading the chapters… ' + done + ' of ' + total + '</p>';
        }
    }).then(u => {
        S.unit = u;
        S.chapters = S.only.length
            ? new Set(u.chapters.filter(c => S.only.some(x => c.id === x || (c.number && c.number === x))).map(c => c.id))
            : new Set(u.chapters.map(c => c.id));
        if (!S.chapters.size) S.chapters = new Set(u.chapters.map(c => c.id));
        if (lede) lede.textContent = u.label + ' — tick what the paper should carry, then print to PDF.';
        document.title = 'Printout — ' + u.label;
        controls();
        build();
    }, err => {
        doc.innerHTML = '<p class="po-loading">Could not read this unit. ' + esc(err && err.message ? err.message : '') + '</p>';
    });
})();
