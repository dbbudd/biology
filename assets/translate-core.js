/* =============================================================
   TRANSLATE — the shared on-device translator
   -------------------------------------------------------------
   course.js translates the live chapter DOM. Slides and flash
   cards cannot: a deck is DATA before it is pixels, and the
   PowerPoint exporter reads that same data, so translating the
   model is what makes a translated export possible at all.
   The plumbing is identical either way — availability, the
   one-off language download, the deadlines that stop a browser
   with the flag off from hanging forever — so it lives here once.

   Chromium 138+ only. Nothing leaves the machine.

   GLOSSARY SHIELDING. This is a biology course, and "translation"
   here means mRNA to protein. A general translator renders it as
   linguistic translation, and does the same disservice to
   expression, dominant, character, spindle and metaphase plate.
   So every term in COURSE.glossary is swapped for an opaque token
   before translating and put back afterwards: the sentence around
   it is translated, the term stays the English one students are
   assessed on, and the result reads bilingually, which is what
   language scaffolding wants anyway.
   ============================================================= */
(function () {
    'use strict';
    if (window.TranslateCore) return;

    const LANGS = [
        ['zh-Hant', '繁體中文 — Traditional Chinese'], ['zh', '简体中文 — Simplified Chinese'],
        ['ko', '한국어 — Korean'], ['ja', '日本語 — Japanese'],
        ['es', 'Español — Spanish'], ['fr', 'Français — French'],
        ['pt', 'Português — Portuguese'], ['de', 'Deutsch — German'],
        ['hi', 'हिन्दी — Hindi'], ['vi', 'Tiếng Việt — Vietnamese'],
        ['th', 'ไทย — Thai'], ['id', 'Bahasa Indonesia'],
        ['ar', 'العربية — Arabic'], ['ru', 'Русский — Russian']
    ];

    const supported = () => typeof Translator !== 'undefined';
    const labelFor = code => (LANGS.find(l => l[0] === code) || [code, code])[1];

    function deadline(promise, ms, what) {
        let timer;
        const bell = new Promise((_, rej) => {
            timer = setTimeout(() => rej(new Error(what + ' timed out after ' + Math.round(ms / 1000) + 's')), ms);
        });
        return Promise.race([promise, bell]).finally(() => clearTimeout(timer));
    }

    async function availability(lang) {
        if (!supported()) return 'unsupported';
        return await deadline(
            Translator.availability({ sourceLanguage: 'en', targetLanguage: lang }),
            15000, 'Checking the language');
    }

    // A first download may legitimately be slow, so progress renews the clock;
    // total silence for 45s is a stall, not patience.
    async function create(lang, onStatus) {
        if (!supported()) throw new Error('This browser has no on-device translator.');
        const avail = await availability(lang);
        if (avail === 'unavailable') throw new Error('This browser cannot translate into ' + labelFor(lang) + ' yet.');
        let alive = Date.now();
        const made = Translator.create({
            sourceLanguage: 'en', targetLanguage: lang,
            monitor(m) {
                m.addEventListener('downloadprogress', e => {
                    alive = Date.now();
                    if (onStatus) onStatus('Downloading the language pack once… ' + Math.round((e.loaded || 0) * 100) + '%');
                });
            }
        });
        const stall = new Promise((_, rej) => {
            const iv = setInterval(() => {
                if (Date.now() - alive > 45000) { clearInterval(iv); rej(new Error('Preparing the language stalled')); }
            }, 2000);
            made.finally(() => clearInterval(iv));
        });
        return await Promise.race([made, stall]);
    }

    /* ---- shielding ----------------------------------------------------- */
    let RE = null;
    function matcher() {
        if (RE) return RE;
        const g = (window.COURSE && window.COURSE.glossary) || {};
        // longest first, so "Asexual reproduction" wins over "reproduction"
        const terms = Object.keys(g).sort((a, b) => b.length - a.length);
        if (!terms.length) { RE = null; return null; }
        const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        RE = new RegExp('\\b(' + terms.map(esc).join('|') + ')\\b', 'gi');
        return RE;
    }
    const token = n => 'ZQ' + n + 'ZQ';

    function shield(text) {
        const re = matcher();
        if (!re) return { text, keep: [] };
        re.lastIndex = 0;
        const keep = [];
        const out = text.replace(re, m => { keep.push(m); return token(keep.length - 1); });
        return { text: out, keep };
    }

    // Translators sometimes space or case a token differently, so the pattern is
    // forgiving. If any token did not survive at all the term has been dropped from
    // the sentence, and a biology sentence missing its noun is worse than an English
    // one, so the caller is told to keep the original.
    function unshield(text, keep) {
        if (!keep.length) return text;
        let lost = false;
        const out = String(text).replace(/Z\s*Q\s*(\d+)\s*Z\s*Q/gi, (m, n) => {
            const v = keep[+n];
            if (v == null) { lost = true; return m; }
            return v;
        });
        if (lost) return null;
        for (let i = 0; i < keep.length; i++) if (out.indexOf(keep[i]) < 0) return null;
        return out;
    }

    /* ---- bulk ----------------------------------------------------------- */
    async function translateAll(translator, strings, opts) {
        opts = opts || {};
        const useShield = opts.shield !== false;
        const out = new Array(strings.length);
        let done = 0, kept = 0;
        const queue = strings.map((s, i) => i);
        const tick = () => {
            done++;
            if (opts.onProgress && (done % 5 === 0 || done === strings.length)) opts.onProgress(done, strings.length, kept);
        };
        async function worker() {
            while (queue.length) {
                const i = queue.shift();
                const src = String(strings[i] == null ? '' : strings[i]);
                if (!src.trim()) { out[i] = src; tick(); continue; }
                try {
                    if (!useShield) { out[i] = await translator.translate(src); }
                    else {
                        const sh = shield(src);
                        const got = await translator.translate(sh.text);
                        const back = unshield(got, sh.keep);
                        if (back == null) { out[i] = src; kept++; } else out[i] = back;
                    }
                } catch (e) { out[i] = src; kept++; }      // this one stays English
                tick();
            }
        }
        const n = Math.max(1, Math.min(3, strings.length));
        await Promise.all(Array.from({ length: n }, worker));
        if (opts.onProgress) opts.onProgress(done, strings.length, kept);
        return { texts: out, keptEnglish: kept };
    }

    // Text nodes only, so tags, ids and any markup inside a table survive intact.
    async function translateHtml(translator, html, opts) {
        const d = document.createElement('div');
        d.innerHTML = html || '';
        const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let n;
        while ((n = w.nextNode())) if (n.nodeValue && n.nodeValue.trim()) nodes.push(n);
        if (!nodes.length) return { html: html, keptEnglish: 0 };
        const res = await translateAll(translator, nodes.map(x => x.nodeValue), opts);
        nodes.forEach((x, i) => { x.nodeValue = res.texts[i]; });
        return { html: d.innerHTML, keptEnglish: res.keptEnglish };
    }

    window.TranslateCore = {
        LANGS, supported, labelFor, availability, create,
        translateAll, translateHtml, shield, unshield, deadline
    };
})();
