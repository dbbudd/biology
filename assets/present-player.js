/* =============================================================
   PRESENT — PLAYER AND PRESENTER VIEW
   -------------------------------------------------------------
   window.PresentPlayer
     controller(deck, { session, role, start })  slide state + sync
     player(host, deck, opts)      full-window slides (single or audience)
     presenter(host, deck, opts)   current / next slide, notes, timer
     grid(container, deck, opts)   thumbnails of every slide

   deck = { slides, hue, unitLabel, root, assetV, session }

   Used in two places: inside the reader page (the picker plays and
   presents from an overlay, because the click that starts it is a
   user gesture there and full screen can begin at once) and in
   present.html, the separate slides and presenter windows.

   Windows of one session share a BroadcastChannel. Every change is
   sent as the whole state (slide, black screen, revealed answers),
   so whichever window a key is pressed in, both end up the same,
   and either can close without stopping the other.
   ============================================================= */
(function () {
    'use strict';
    if (window.PresentPlayer) return;
    const PC = window.PresentCore;
    const esc = PC.esc;
    const QUESTION = { quiz: true, check: true };

    /* ---- state and sync ---------------------------------------------- */
    function controller(deck, opts) {
        opts = opts || {};
        const n = deck.slides.length;
        const clamp = i => Math.max(0, Math.min(n - 1, i | 0));
        const st = { at: clamp(opts.start || 0), black: false, revealed: new Set() };
        const subs = [];
        const peers = {};
        const emit = info => subs.forEach(f => f(info || {}));
        let link = null;

        // Slides travel by id as well as position: an id means the same slide in
        // every window, whatever was skipped.
        const idOf = i => (deck.slides[i] || {}).id;
        const indexOf = id => deck.slides.findIndex(s => s.id === id);
        const snapshot = () => ({ t: 'state', at: st.at, atId: idOf(st.at), black: st.black, revealed: [...st.revealed].map(idOf) });
        function changed(fromRemote) {
            emit({ fromRemote });
            if (link && !fromRemote) link.send(snapshot());
            if (opts.session && !fromRemote) PC.updateSession(opts.session, { at: st.at });
        }

        const api = {
            get at() { return st.at; },
            get black() { return st.black; },
            get total() { return n; },
            role: opts.role || 'single',
            isRevealed: i => st.revealed.has(i),
            subscribe(f) { subs.push(f); },
            go(i) {
                i = clamp(i);
                if (i === st.at && !st.black) return;
                st.at = i; st.black = false;
                changed(false);
            },
            next() {
                const s = deck.slides[st.at];
                if (st.black) { st.black = false; changed(false); return; }
                // a question slide shows its answer before moving on, like a build in PowerPoint
                if (s && QUESTION[s.type] && !st.revealed.has(st.at)) { api.reveal(st.at); return; }
                api.go(st.at + 1);
            },
            prev() {
                if (st.black) { st.black = false; changed(false); return; }
                api.go(st.at - 1);
            },
            reveal(i) {
                if (st.revealed.has(i)) return;
                st.revealed.add(i);
                changed(false);
            },
            setBlack(on) {
                if (st.black === !!on) return;
                st.black = !!on;
                changed(false);
            },
            peerSeen: role => peers[role] || 0,
            send: m => { if (link) link.send(m); },
            close() {
                if (link) { link.send({ t: 'bye' }); link.close(); link = null; }
            }
        };

        if (opts.session) {
            link = PC.channel(opts.session, api.role, m => {
                if (m.t === 'bye') delete peers[m.role];
                else peers[m.role] = Date.now();
                if (m.t === 'state') {
                    const byId = m.atId != null ? indexOf(m.atId) : -1;
                    st.at = byId >= 0 ? byId : clamp(m.at);
                    st.black = !!m.black;
                    st.revealed = new Set((m.revealed || []).map(r => (typeof r === 'number' ? r : indexOf(r))).filter(i => i >= 0));
                    changed(true);
                    return;
                }
                if (m.t === 'hello') link.send(snapshot());
                else if (m.t === 'ping') link.send({ t: 'pong' });
                emit({ peer: true });
            });
            link.send({ t: 'hello' });
            window.addEventListener('pagehide', () => api.close());
        }
        return api;
    }

    /* ---- shared bits -------------------------------------------------- */
    const typeLabel = s => ({
        unit: 'Title', chapter: 'Chapter', text: s.title, figure: s.eyebrow + ' · ' + s.title, table: 'Table · ' + s.title,
        misconception: 'Misconception', prompt: 'Try this', sim: 'Interactive · ' + s.title, video: 'Video · ' + s.title,
        quiz: 'Question', check: 'Question'
    }[s.type] || s.title);

    function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
    function toggleFullscreen(target, onFail) {
        if (isFullscreen()) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            return;
        }
        const el = target || document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!req) { if (onFail) onFail(); return; }
        try {
            const p = req.call(el);
            if (p && p.catch) p.catch(() => { if (onFail) onFail(); });
        } catch (e) { if (onFail) onFail(); }
    }

    // Keys that type into something, or that a focused control inside a live
    // interactive needs for itself, are left alone.
    function keyContext(e) {
        const t = e.target && e.target.closest ? e.target : document.body;
        return {
            typing: !!t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="slider"], [role="spinbutton"]'),
            control: !!t.closest('button, a[href], summary, iframe'),
            inLive: !!t.closest('.pr-live') && t.closest('.pr-live') !== t
        };
    }

    // Number + Enter jumps to a slide; the digits typed so far are shown.
    function gotoBuffer(hud, go) {
        let buf = '', timer = null;
        const clear = () => { buf = ''; hud.hidden = true; clearTimeout(timer); };
        return {
            get active() { return !!buf; },
            digit(d) {
                buf = (buf + d).slice(0, 4);
                hud.textContent = 'Go to slide ' + buf;
                hud.hidden = false;
                clearTimeout(timer);
                timer = setTimeout(clear, 4000);
            },
            enter() { const i = parseInt(buf, 10); clear(); if (i) go(i - 1); },
            clear
        };
    }

    /* ---- thumbnails --------------------------------------------------- */
    // Thumbnails are drawn when they come near the viewport, so a 300-slide
    // unit opens at once, but each one is the real slide, not a stand-in.
    // opts: { scrollRoot, onPick(index), pickLabel, simHint, dividers,
    //         toggles: { isSkipped(slide), onToggle(slide, include, event), numberOf(slide) },
    //         onChapter(chapterId, include) }
    // With toggles, each thumbnail sits in a cell with its own include checkbox,
    // which is separate from the thumbnail button (that one still means "play
    // from here"). Skipped slides stay in place, dimmed, so they can come back.
    function grid(container, deck, opts) {
        opts = opts || {};
        const T = opts.toggles || null;
        const wrap = document.createElement('div');
        wrap.className = 'pr-grid' + (T ? ' pr-grid-select' : '');
        container.appendChild(wrap);
        const scaleOf = thumb => {
            const sc = thumb.firstChild;
            const w = thumb.clientWidth;
            if (w) sc.style.transform = 'scale(' + (w / 1280) + ')';
        };
        const ro = new ResizeObserver(es => es.forEach(e => scaleOf(e.target)));
        const draw = btn => {
            if (btn.dataset.drawn) return;
            btn.dataset.drawn = '1';
            const s = deck.slides[+btn.dataset.index];
            const sc = btn.querySelector('.pr-scale');
            // in the selecting grid the play numbers change as slides are skipped,
            // so the drawn slide leaves its number out and the label carries it
            const el = PC.render(s, { total: T ? 0 : deck.slides.length, hue: deck.hue, live: false, simHint: opts.simHint });
            sc.appendChild(el);
            PC.fit(el);
        };
        const io = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting) { draw(e.target); io.unobserve(e.target); }
        }), { root: opts.scrollRoot || null, rootMargin: '800px 0px' });

        let lastChapter = null;
        const cells = [];
        const buttons = deck.slides.map(s => {
            if (opts.dividers !== false && s.type === 'chapter' && s.chapterId !== lastChapter) {
                lastChapter = s.chapterId;
                const d = document.createElement('div');
                d.className = 'pr-grid-divider';
                d.innerHTML = '<h3>' + esc(s.chapterTitle) + '</h3>' + (opts.onChapter
                    ? '<span class="pr-divider-tools"><button type="button" class="prm-btn small" data-chapter-skip="' + esc(s.chapterId) + '">Skip all<span class="pr-sr"> in ' + esc(s.chapterTitle) + '</span></button>' +
                      '<button type="button" class="prm-btn small" data-chapter-include="' + esc(s.chapterId) + '">Include all<span class="pr-sr"> in ' + esc(s.chapterTitle) + '</span></button></span>'
                    : '');
                wrap.appendChild(d);
            }
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pr-thumb-btn';
            b.dataset.index = s.index;
            b.innerHTML = '<span class="pr-thumb"><span class="pr-scale" inert></span>' +
                (T ? '<span class="pr-skipped-tag" aria-hidden="true">Skipped</span>' : '') + '</span>' +
                '<span class="pr-thumb-num" aria-hidden="true"><b>' + (s.index + 1) + '</b><span>' + esc(typeLabel(s)) + '</span></span>';
            b.addEventListener('click', () => { if (opts.onPick) opts.onPick(s.index); });
            let parent = wrap;
            if (T) {
                const cell = document.createElement('div');
                cell.className = 'pr-cell';
                cell.dataset.index = s.index;
                const lab = document.createElement('label');
                lab.className = 'pr-include';
                lab.title = 'Include this slide';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.setAttribute('aria-label', 'Include slide ' + (s.index + 1) + ': ' + typeLabel(s));
                // shift is read from the click; Space on a focused checkbox also clicks
                cb.addEventListener('click', e => { T.onToggle(s, cb.checked, e); });
                lab.appendChild(cb);
                cell.appendChild(b);
                cell.appendChild(lab);
                wrap.appendChild(cell);
                cells.push({ s, cell, cb, b });
                parent = null;
            }
            if (parent) parent.appendChild(b);
            ro.observe(b.firstChild);
            io.observe(b);
            return b;
        });
        if (opts.onChapter) {
            wrap.addEventListener('click', e => {
                const skip = e.target.closest('[data-chapter-skip]');
                const inc = e.target.closest('[data-chapter-include]');
                if (skip) opts.onChapter(skip.dataset.chapterSkip, false);
                if (inc) opts.onChapter(inc.dataset.chapterInclude, true);
            });
        }
        const api = {
            el: wrap, buttons, cells, draw,
            // bring the checkboxes, dimming and play numbers up to date
            refresh() {
                if (!T) return;
                cells.forEach(c => {
                    const skipped = T.isSkipped(c.s);
                    c.cb.checked = !skipped;
                    c.cell.classList.toggle('is-skipped', skipped);
                    const n = T.numberOf ? T.numberOf(c.s) : null;
                    c.b.querySelector('.pr-thumb-num b').textContent = skipped ? '–' : (n || c.s.index + 1);
                    c.b.setAttribute('aria-label', (skipped ? 'Skipped slide: ' : 'Slide ' + (n || c.s.index + 1) + ': ') + typeLabel(c.s) +
                        (opts.pickLabel ? '. ' + (skipped ? 'Play from the next included slide' : opts.pickLabel) : ''));
                });
            },
            mark(i) {
                buttons.forEach(b => {
                    const on = +b.dataset.index === i;
                    b.classList.toggle('is-current', on);
                    if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
                });
            },
            destroy() { ro.disconnect(); io.disconnect(); wrap.remove(); }
        };
        if (!T) buttons.forEach(b => b.setAttribute('aria-label', 'Slide ' + (+b.dataset.index + 1) + ': ' +
            typeLabel(deck.slides[+b.dataset.index]) + (opts.pickLabel ? '. ' + opts.pickLabel : '')));
        api.refresh();
        return api;
    }

    // One scaled slide that fills a box, for the presenter's current and next.
    function frame(box, deck) {
        const thumb = document.createElement('div');
        thumb.className = 'pr-thumb';
        thumb.innerHTML = '<div class="pr-scale" inert></div>';
        box.appendChild(thumb);
        const sc = thumb.firstChild;
        let el = null;
        const size = () => {
            const W = box.clientWidth, H = box.clientHeight;
            if (!W || !H) return;
            const w = Math.min(W, H * 16 / 9);
            thumb.style.width = Math.floor(w) + 'px';
            sc.style.transform = 'scale(' + (Math.floor(w) / 1280) + ')';
        };
        const ro = new ResizeObserver(size);
        ro.observe(box);
        return {
            show(slide, ctx) {
                sc.innerHTML = '';
                el = null;
                if (!slide) { thumb.hidden = true; return; }
                thumb.hidden = false;
                el = PC.render(slide, Object.assign({ total: deck.slides.length, hue: deck.hue, live: false }, ctx));
                sc.appendChild(el);
                size();
                PC.fit(el);
            },
            destroy() { ro.disconnect(); thumb.remove(); }
        };
    }

    /* ---- the player --------------------------------------------------- */
    // opts: { controller, role: 'single'|'audience', inPage, onExit, askFullscreen, notice }
    function player(host, deck, opts) {
        const ctl = opts.controller;
        const single = opts.role !== 'audience';
        const root = document.createElement('div');
        root.className = 'pp';
        root.tabIndex = -1;
        root.setAttribute('role', 'region');
        root.setAttribute('aria-roledescription', 'slide show');
        root.setAttribute('aria-label', deck.unitLabel || 'Slides');
        root.innerHTML =
            '<div class="pp-stage"><div class="pp-slot"></div></div>' +
            '<div class="pp-black" hidden><span class="pr-sr">Screen blacked out. Press B to show the slide.</span></div>' +
            (single ? '<section class="pp-notes" hidden aria-label="Speaker notes"><div class="pp-notes-warn">The room can see these notes. Press N to hide them.</div><div class="pp-notes-body pr-notes-host" tabindex="0"></div></section>' : '') +
            '<div class="pp-hud" hidden aria-live="polite"></div>' +
            '<div class="pp-toast" hidden role="status"></div>' +
            '<div class="pp-controls" role="toolbar" aria-label="Slide controls">' +
                '<button type="button" class="pp-btn" data-act="prev" aria-label="Previous slide" title="Previous (←)">&#8592;</button>' +
                '<span class="pp-count" aria-hidden="true"></span>' +
                '<button type="button" class="pp-btn" data-act="next" aria-label="Next slide" title="Next (→)">&#8594;</button>' +
                '<button type="button" class="pp-btn" data-act="grid" title="All slides (G)">Slides</button>' +
                (single ? '<button type="button" class="pp-btn" data-act="notes" aria-pressed="false" title="Speaker notes (N)">Notes</button>' : '') +
                '<button type="button" class="pp-btn" data-act="black" aria-pressed="false" title="Black screen (B)">Black</button>' +
                '<button type="button" class="pp-btn" data-act="fullscreen" title="Full screen (F)">Full screen</button>' +
                '<button type="button" class="pp-btn" data-act="exit" title="Close (Esc)">Close</button>' +
            '</div>' +
            '<div class="pr-sr pp-live" aria-live="polite" aria-atomic="true"></div>';
        host.appendChild(root);

        const $ = s => root.querySelector(s);
        const stage = $('.pp-stage'), slot = $('.pp-slot'), black = $('.pp-black'), hud = $('.pp-hud');
        const toastEl = $('.pp-toast'), live = $('.pp-live'), notes = $('.pp-notes'), count = $('.pp-count');
        let current = null, shownAt = -1, shownRevealed = false, gridView = null, destroyed = false;
        let toastTimer = null;

        function toast(msg, ms) {
            toastEl.textContent = msg;
            toastEl.hidden = false;
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms || 4000);
        }

        function layout() {
            const W = stage.clientWidth, H = stage.clientHeight;
            if (!W || !H) return;
            let w = W, h = W * 9 / 16;
            if (h > H) { h = H; w = H * 16 / 9; }
            slot.style.width = Math.floor(w) + 'px';
            slot.style.height = Math.floor(h) + 'px';
            if (current) PC.fit(current);
        }
        const ro = new ResizeObserver(layout);
        ro.observe(stage);

        function wire(el, slide) {
            const rb = el.querySelector('[data-reveal]');
            if (rb) rb.addEventListener('click', e => { e.stopPropagation(); ctl.reveal(slide.index); });
            const vb = el.querySelector('[data-video]');
            if (vb) vb.addEventListener('click', e => {
                e.stopPropagation();
                const f = document.createElement('div');
                f.className = 'pr-video-frame';
                const ifr = document.createElement('iframe');
                // loaded only now, because the teacher asked for it. Same code as
                // YouTube's Share > Embed (and the reader's own videos): the standard
                // youtube.com player, with the referrer policy YouTube requires —
                // without it the player shows "Error 153".
                ifr.src = 'https://www.youtube.com/embed/' + encodeURIComponent(vb.dataset.video) + '?rel=0&autoplay=1';
                ifr.title = slide.video.title || slide.title;
                ifr.setAttribute('frameborder', '0');
                ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
                ifr.referrerPolicy = 'strict-origin-when-cross-origin';
                ifr.allowFullscreen = true;
                f.appendChild(ifr);
                vb.replaceWith(f);
            });
            if (slide.type === 'sim') {
                const simEl = el.querySelector('.sim');
                PC.mountSim(simEl, slide.sim, deck.root, deck.assetV).catch(err => {
                    console.error('[present:sim ' + slide.sim + ']', err);
                    const fb = el.querySelector('.pr-sim-fallback');
                    if (fb) fb.hidden = false;
                });
            }
        }

        function show(i, dir) {
            const slide = deck.slides[i];
            if (!slide) return;
            const el = PC.render(slide, { total: deck.slides.length, hue: deck.hue, live: true, revealed: ctl.isRevealed(i) });
            el.setAttribute('role', 'group');
            el.setAttribute('aria-roledescription', 'slide');
            el.setAttribute('aria-label', (i + 1) + ' of ' + deck.slides.length);
            const old = current;
            if (old) {
                if (dir) {
                    old.classList.add('pr-leave');
                    if (dir < 0) old.classList.add('pr-back');
                    old.inert = true;
                    old.setAttribute('aria-hidden', 'true');
                    setTimeout(() => old.remove(), 520);
                } else {
                    old.remove();
                }
            }
            if (dir) {
                el.classList.add('pr-enter');
                if (dir < 0) el.classList.add('pr-back');
            }
            slot.appendChild(el);
            current = el;
            PC.fit(el);
            wire(el, slide);
            if (dir) {
                void el.offsetWidth;                 // commit the start position before animating
                el.classList.remove('pr-enter', 'pr-back');
            }
            shownAt = i;
            shownRevealed = ctl.isRevealed(i);
            count.textContent = (i + 1) + ' / ' + deck.slides.length;
            if (notes) {
                const body = notes.querySelector('.pp-notes-body');
                body.innerHTML = '';
                body.appendChild(PC.renderNotes(slide));
                body.scrollTop = 0;
            }
            if (gridView) gridView.mark(i);
            live.textContent = 'Slide ' + (i + 1) + ' of ' + deck.slides.length + ': ' + slide.title;
        }

        function update() {
            if (destroyed) return;
            const i = ctl.at;
            if (i !== shownAt) show(i, shownAt < 0 ? 0 : (i > shownAt ? 1 : -1));
            else if (ctl.isRevealed(i) !== shownRevealed) show(i, 0);
            black.hidden = !ctl.black;
            const bb = root.querySelector('[data-act="black"]');
            if (bb) bb.setAttribute('aria-pressed', String(ctl.black));
        }
        ctl.subscribe(update);

        /* grid overlay */
        function openGrid() {
            if (gridView) return;
            const pg = document.createElement('div');
            pg.className = 'pg';
            pg.setAttribute('role', 'dialog');
            pg.setAttribute('aria-label', 'All slides');
            pg.innerHTML = '<div class="pg-head"><h2>All slides · ' + deck.slides.length + '</h2>' +
                '<button type="button" class="pp-btn" data-act="grid-close">Close (G)</button></div>';
            root.appendChild(pg);
            gridView = grid(pg, deck, { scrollRoot: pg, onPick: i => { closeGrid(); ctl.go(i); } });
            gridView.pg = pg;
            gridView.mark(ctl.at);
            const cur = gridView.buttons[ctl.at];
            if (cur) { cur.scrollIntoView({ block: 'center' }); cur.focus({ preventScroll: true }); }
        }
        function closeGrid() {
            if (!gridView) return;
            gridView.destroy();
            gridView.pg.remove();
            gridView = null;
            root.focus({ preventScroll: true });
        }
        function toggleNotes(force) {
            if (!notes) {
                toast('Speaker notes are on the presenter screen.');
                return;
            }
            notes.hidden = force != null ? !force : !notes.hidden;
            const nb = root.querySelector('[data-act="notes"]');
            if (nb) nb.setAttribute('aria-pressed', String(!notes.hidden));
        }
        function exit() {
            if (opts.onExit) opts.onExit();
        }

        root.addEventListener('click', e => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            e.stopPropagation();
            const act = b.dataset.act;
            if (act === 'prev') ctl.prev();
            else if (act === 'next') ctl.next();
            else if (act === 'grid') openGrid();
            else if (act === 'grid-close') closeGrid();
            else if (act === 'notes') toggleNotes();
            else if (act === 'black') ctl.setBlack(!ctl.black);
            else if (act === 'fullscreen') toggleFullscreen(opts.fullscreenTarget || (opts.inPage ? root : null), () => toast('Full screen is not available here.'));
            else if (act === 'exit') exit();
        });

        /* keys */
        const goto = gotoBuffer(hud, i => ctl.go(i));
        function onKey(e) {
            if (destroyed || !root.isConnected) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const k = e.key;
            const cx = keyContext(e);
            let handled = true;
            if (k === 'Escape') {
                if (goto.active) goto.clear();
                else if (gridView) closeGrid();
                else if (notes && !notes.hidden) toggleNotes(false);
                else if (isFullscreen()) toggleFullscreen();
                else exit();
            } else if (cx.typing) {
                return;
            } else if (/^[0-9]$/.test(k) && !gridView) {
                goto.digit(k);
            } else if (k === 'Enter' && goto.active) {
                goto.enter();
            } else if ((k === ' ' || k === 'Enter') && (cx.control || cx.inLive)) {
                return;                                      // let the focused button click
            } else if ((k === 'ArrowRight' || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'ArrowDown') && (cx.inLive || gridView)) {
                return;
            } else if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown' || k === 'Enter') {
                ctl.next();
            } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') {
                ctl.prev();
            } else if (k === 'Home') {
                ctl.go(0);
            } else if (k === 'End') {
                ctl.go(deck.slides.length - 1);
            } else if (k === 'g' || k === 'G') {
                if (gridView) closeGrid(); else openGrid();
            } else if (k === 'b' || k === 'B' || k === '.') {
                ctl.setBlack(!ctl.black);                    // clickers send "." or B for a black screen
            } else if (k === 'f' || k === 'F') {
                toggleFullscreen(opts.fullscreenTarget || (opts.inPage ? root : null), () => toast('Full screen is not available here.'));
            } else if (k === 'n' || k === 'N') {
                toggleNotes();
            } else {
                handled = false;
            }
            if (handled) { e.preventDefault(); e.stopPropagation(); }
        }
        window.addEventListener('keydown', onKey, true);

        /* mouse and touch: right half forward, left half back, or swipe */
        let swallowClick = false, down = null;
        const ignoreTarget = t => t.closest('a, button, input, select, textarea, label, summary, iframe, .pr-live, .pr-video, .pp-controls');
        stage.addEventListener('click', e => {
            if (swallowClick) { swallowClick = false; return; }
            if (ignoreTarget(e.target)) return;
            if (window.getSelection && String(window.getSelection())) return;
            const r = stage.getBoundingClientRect();
            if (e.clientX - r.left < r.width / 2) ctl.prev(); else ctl.next();
        });
        stage.addEventListener('pointerdown', e => {
            down = (e.pointerType !== 'mouse' && !ignoreTarget(e.target)) ? { x: e.clientX, y: e.clientY } : null;
        });
        stage.addEventListener('pointerup', e => {
            if (!down) return;
            const dx = e.clientX - down.x, dy = e.clientY - down.y;
            down = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                swallowClick = true;
                setTimeout(() => { swallowClick = false; }, 400);
                if (dx < 0) ctl.next(); else ctl.prev();
            }
        });

        /* controls hide while presenting and come back on mouse movement */
        let idleTimer = null;
        const wake = () => {
            root.classList.remove('pp-idle');
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => root.classList.add('pp-idle'), 2500);
        };
        root.addEventListener('mousemove', wake);
        wake();

        /* audience windows need one click before they may go full screen */
        if (opts.askFullscreen && !isFullscreen() && document.documentElement.requestFullscreen) {
            const fs = document.createElement('div');
            fs.className = 'pp-fs';
            fs.innerHTML = '<button type="button" class="pp-fs-go">Click to start full screen</button>' +
                '<p>' + esc(opts.fullscreenHint || 'Browsers only allow full screen after a click in this window. Keys pressed here or in the presenter view move both.') + '</p>' +
                '<button type="button" class="pp-fs-stay">Stay in a window</button>';
            root.appendChild(fs);
            const done = () => { fs.remove(); root.focus({ preventScroll: true }); };
            fs.querySelector('.pp-fs-go').addEventListener('click', e => {
                e.stopPropagation();
                toggleFullscreen(document.documentElement, () => toast('Full screen was refused. Press F to try again.'));
                done();
                // hand the keyboard back to the presenter window, where the teacher is
                try { if (window.opener && !window.opener.closed) window.opener.focus(); } catch (err) { /* cross-window focus refused */ }
            });
            fs.querySelector('.pp-fs-stay').addEventListener('click', e => { e.stopPropagation(); done(); });
            setTimeout(() => fs.querySelector('.pp-fs-go').focus(), 50);
        }

        if (opts.notice) toast(opts.notice, 7000);
        layout();
        update();
        root.focus({ preventScroll: true });

        return {
            root, toast,
            toggleNotes, openGrid, closeGrid,
            destroy() {
                destroyed = true;
                window.removeEventListener('keydown', onKey, true);
                ro.disconnect();
                if (gridView) closeGrid();
                root.remove();
            }
        };
    }

    /* ---- the presenter view ------------------------------------------- */
    // opts: { controller, inPage, onExit, openAudience() -> Promise<result>,
    //         audience: first open result, onSlidesOnly() }
    function presenter(host, deck, opts) {
        const ctl = opts.controller;
        const root = document.createElement('div');
        root.className = 'pv';
        root.tabIndex = -1;
        root.setAttribute('role', 'region');
        root.setAttribute('aria-label', 'Presenter view');
        root.innerHTML =
            '<div class="pv-bar">' +
                '<div class="pv-title">' + esc(deck.unitLabel || '') + '</div>' +
                '<div class="pv-count" aria-live="polite" aria-atomic="true">Slide <strong class="pv-n">1</strong> / ' + deck.slides.length + '</div>' +
                '<div class="pv-timer" role="group" aria-label="Elapsed time">' +
                    '<span class="pv-elapsed" aria-label="Elapsed">0:00</span>' +
                    '<button type="button" class="pv-btn" data-act="timer" aria-label="Start timer">Start</button>' +
                    '<button type="button" class="pv-btn" data-act="reset" aria-label="Reset timer">Reset</button>' +
                '</div>' +
                '<div class="pv-clock" aria-label="Clock"></div>' +
                '<div class="pv-actions">' +
                    '<button type="button" class="pv-btn" data-act="black" aria-pressed="false" title="Black screen (B)">Black screen</button>' +
                    '<button type="button" class="pv-btn" data-act="grid" title="All slides (G)">All slides</button>' +
                    '<button type="button" class="pv-btn" data-act="audience">Open slides window</button>' +
                    '<button type="button" class="pv-btn" data-act="fullscreen" title="Full screen (F)">Full screen</button>' +
                    '<button type="button" class="pv-btn" data-act="exit">End</button>' +
                '</div>' +
                '<span class="pv-link-status" role="status"></span>' +
            '</div>' +
            '<div class="pv-notice" hidden role="status"></div>' +
            '<div class="pv-main">' +
                '<section class="pv-col" aria-label="Current slide">' +
                    '<h2 class="pv-label">Current slide</h2>' +
                    '<div class="pv-frame pv-current-frame"></div>' +
                    '<div class="pv-nav">' +
                        '<button type="button" class="pv-btn" data-act="prev">&#8592; Previous</button>' +
                        '<button type="button" class="pv-btn" data-act="reveal" hidden>Show answer</button>' +
                        '<button type="button" class="pv-btn primary" data-act="next">Next &#8594;</button>' +
                    '</div>' +
                '</section>' +
                '<section class="pv-col" aria-label="Next slide and notes">' +
                    '<h2 class="pv-label">Next</h2>' +
                    '<div class="pv-frame pv-next-frame"></div>' +
                    '<div class="pv-notes">' +
                        '<div class="pv-notes-head"><h2 class="pv-label">Speaker notes</h2>' +
                            '<button type="button" class="pv-btn" data-act="smaller" aria-label="Smaller notes text">A&minus;</button>' +
                            '<button type="button" class="pv-btn" data-act="larger" aria-label="Larger notes text">A+</button></div>' +
                        '<div class="pv-notes-body pr-notes-host" tabindex="0" aria-label="Speaker notes"></div>' +
                    '</div>' +
                '</section>' +
            '</div>' +
            '<nav class="pv-strip" aria-label="All slides"></nav>' +
            '<div class="pp-hud" hidden aria-live="polite" style="position:fixed"></div>';
        host.appendChild(root);

        const $ = s => root.querySelector(s);
        const cur = frame($('.pv-current-frame'), deck);
        const nxt = frame($('.pv-next-frame'), deck);
        const notesBody = $('.pv-notes-body');
        const notice = $('.pv-notice');
        const status = $('.pv-link-status');
        const strip = grid($('.pv-strip'), deck, { dividers: false, scrollRoot: $('.pv-strip'), onPick: i => ctl.go(i),
            simHint: 'Live on the slides screen.' });
        let shownAt = -1, shownRevealed = null, destroyed = false, audienceWin = null, gridView = null;

        // notes size is a per-teacher preference
        let notesSize = parseFloat(PC.store.get('bio_present_notes_size')) || 1.25;
        const applyNotesSize = () => { notesBody.style.setProperty('--pv-notes-size', notesSize + 'rem'); };
        applyNotesSize();

        function setNotice(html, kind) {
            if (!html) { notice.hidden = true; notice.innerHTML = ''; return; }
            notice.className = 'pv-notice' + (kind ? ' ' + kind : '');
            notice.innerHTML = html;
            notice.hidden = false;
        }

        function update() {
            if (destroyed) return;
            const i = ctl.at;
            const s = deck.slides[i];
            const rev = ctl.isRevealed(i);
            if (i !== shownAt || rev !== shownRevealed) {
                cur.show(s, { revealed: rev, simHint: 'Live on the slides screen.' });
                nxt.show(deck.slides[i + 1] || null, { simHint: 'Live on the slides screen.' });
                if (i !== shownAt) {
                    notesBody.innerHTML = '';
                    notesBody.appendChild(PC.renderNotes(s));
                    notesBody.scrollTop = 0;
                    strip.mark(i);
                    const b = strip.buttons[i];
                    if (b) b.scrollIntoView({ inline: 'center', block: 'nearest' });
                }
                shownAt = i;
                shownRevealed = rev;
                $('.pv-n').textContent = i + 1;
                $('[data-act="reveal"]').hidden = !(QUESTION[s.type] && !rev);
                $('[data-act="prev"]').disabled = i === 0;
                $('[data-act="next"]').disabled = i === deck.slides.length - 1 && !(QUESTION[s.type] && !rev);
                $('.pv-next-frame').setAttribute('aria-label', deck.slides[i + 1] ? 'Next: ' + deck.slides[i + 1].title : 'End of slides');
            }
            const bb = $('[data-act="black"]');
            bb.classList.toggle('is-on', ctl.black);
            bb.setAttribute('aria-pressed', String(ctl.black));
            bb.textContent = ctl.black ? 'Screen is black' : 'Black screen';
            if (timer.startedBy === null && i > 0) timer.start();
            updateLink();
        }

        /* timer and clock */
        const timer = {
            startedBy: null, run: false, base: 0, since: 0,
            elapsed() { return this.base + (this.run ? Date.now() - this.since : 0); },
            start() { if (!this.run) { this.run = true; this.since = Date.now(); this.startedBy = this.startedBy || 'auto'; } paint(); },
            pause() { if (this.run) { this.base += Date.now() - this.since; this.run = false; } paint(); },
            reset() { this.base = 0; this.since = Date.now(); paint(); }
        };
        const two = n => (n < 10 ? '0' : '') + n;
        function paint() {
            const t = Math.floor(timer.elapsed() / 1000);
            const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
            $('.pv-elapsed').textContent = (h ? h + ':' + two(m) : m) + ':' + two(s);
            const tb = $('[data-act="timer"]');
            tb.textContent = timer.run ? 'Pause' : (timer.elapsed() ? 'Resume' : 'Start');
            tb.setAttribute('aria-label', timer.run ? 'Pause timer' : 'Start timer');
            const d = new Date();
            $('.pv-clock').textContent = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        const tick = setInterval(() => { paint(); updateLink(); if (deck.session) ctl.send({ t: 'ping' }); }, 1000);

        /* the audience window */
        function updateLink() {
            if (!deck.session) { status.textContent = ''; return; }
            const seen = Date.now() - ctl.peerSeen('audience') < 4000;
            const open = audienceWin && !audienceWin.closed;
            status.textContent = seen ? 'Slides window connected' : (open ? 'Slides window opening…' : 'Slides window not open');
            status.classList.toggle('ok', seen);
            $('[data-act="audience"]').textContent = seen || open ? 'Show slides window' : 'Open slides window';
        }
        function reportOpen(res) {
            if (!res) return;
            if (res.win) audienceWin = res.win;
            if (res.blocked) {
                setNotice('<span>Your browser blocked the slides window. Allow pop-ups for this site — look for the blocked pop-up icon at the right of the address bar — then choose <b>Open slides window</b> again.</span>', 'warn');
            } else if (res.placed) {
                setNotice('<span>The slides are on your other screen. Click the big button there once to go full screen; after that, use the keys or buttons here.</span>', 'ok');
            } else if (res.denied) {
                setNotice('<span>The browser was not allowed to place the slides window. Drag it to the projector screen, click it, and press <b>F</b> for full screen.</span>');
            } else if (!opts.warnSingle) {
                setNotice('<span>The slides window has opened. Drag it to the projector screen, click it, and press <b>F</b> for full screen.</span>');
            }
            updateLink();
        }
        async function openAudience() {
            if (audienceWin && !audienceWin.closed) {
                try { audienceWin.focus(); } catch (e) { /* ignore */ }
                return;
            }
            if (opts.openAudience) reportOpen(await opts.openAudience());
        }

        /* grid overlay */
        function openGrid() {
            if (gridView) return;
            const pg = document.createElement('div');
            pg.className = 'pg';
            pg.setAttribute('role', 'dialog');
            pg.setAttribute('aria-label', 'All slides');
            pg.innerHTML = '<div class="pg-head"><h2>All slides · ' + deck.slides.length + '</h2>' +
                '<button type="button" class="pv-btn" data-act="grid-close">Close (G)</button></div>';
            root.appendChild(pg);
            gridView = grid(pg, deck, { scrollRoot: pg, onPick: i => { closeGrid(); ctl.go(i); }, simHint: 'Live on the slides screen.' });
            gridView.pg = pg;
            gridView.mark(ctl.at);
            const b = gridView.buttons[ctl.at];
            if (b) { b.scrollIntoView({ block: 'center' }); b.focus({ preventScroll: true }); }
        }
        function closeGrid() {
            if (!gridView) return;
            gridView.destroy();
            gridView.pg.remove();
            gridView = null;
            root.focus({ preventScroll: true });
        }

        root.addEventListener('click', e => {
            const b = e.target.closest('[data-act]');
            if (!b || b.disabled) return;
            const act = b.dataset.act;
            if (act === 'prev') ctl.prev();
            else if (act === 'next') ctl.next();
            else if (act === 'reveal') ctl.reveal(ctl.at);
            else if (act === 'black') ctl.setBlack(!ctl.black);
            else if (act === 'grid') openGrid();
            else if (act === 'grid-close') closeGrid();
            else if (act === 'audience') openAudience();
            else if (act === 'fullscreen') toggleFullscreen(opts.inPage ? root : null);
            else if (act === 'exit') { if (opts.onExit) opts.onExit(); }
            else if (act === 'slides-only') { if (opts.onSlidesOnly) opts.onSlidesOnly(); }
            else if (act === 'timer') { if (timer.run) timer.pause(); else { timer.startedBy = 'user'; timer.start(); } }
            else if (act === 'reset') timer.reset();
            else if (act === 'smaller' || act === 'larger') {
                notesSize = Math.max(0.8, Math.min(2.6, notesSize + (act === 'larger' ? 0.15 : -0.15)));
                PC.store.set('bio_present_notes_size', notesSize.toFixed(2));
                applyNotesSize();
            }
        });

        const goto = gotoBuffer($('.pp-hud'), i => ctl.go(i));
        function onKey(e) {
            if (destroyed || !root.isConnected) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const k = e.key;
            const cx = keyContext(e);
            let handled = true;
            if (k === 'Escape') {
                if (goto.active) goto.clear();
                else if (gridView) closeGrid();
                else if (isFullscreen()) toggleFullscreen();
                else handled = false;                    // ending is the End button, not a stray Esc
            } else if (cx.typing) {
                return;
            } else if (/^[0-9]$/.test(k) && !gridView) {
                goto.digit(k);
            } else if (k === 'Enter' && goto.active) {
                goto.enter();
            } else if ((k === ' ' || k === 'Enter') && cx.control) {
                return;
            } else if ((k === 'ArrowRight' || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'ArrowDown') && gridView) {
                return;
            } else if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown' || k === 'Enter') {
                ctl.next();
            } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') {
                ctl.prev();
            } else if (k === 'Home') {
                ctl.go(0);
            } else if (k === 'End') {
                ctl.go(deck.slides.length - 1);
            } else if (k === 'g' || k === 'G') {
                if (gridView) closeGrid(); else openGrid();
            } else if (k === 'b' || k === 'B' || k === '.') {
                ctl.setBlack(!ctl.black);
            } else if (k === 'f' || k === 'F') {
                toggleFullscreen(opts.inPage ? root : null);
            } else {
                handled = false;
            }
            if (handled) { e.preventDefault(); e.stopPropagation(); }
        }
        window.addEventListener('keydown', onKey, true);

        ctl.subscribe(update);

        if (opts.warnSingle) {
            setNotice('<span>Your screens are mirrored or you have one screen, so the room can see this presenter view and its notes.</span>' +
                (opts.onSlidesOnly ? '<button type="button" class="pv-btn" data-act="slides-only">Show slides only</button>' : ''), 'warn');
        }
        if (opts.audience) reportOpen(opts.audience);
        paint();
        update();
        root.focus({ preventScroll: true });

        return {
            root, setNotice, openAudience,
            destroy() {
                destroyed = true;
                clearInterval(tick);
                window.removeEventListener('keydown', onKey, true);
                if (gridView) closeGrid();
                strip.destroy(); cur.destroy(); nxt.destroy();
                root.remove();
            }
        };
    }

    window.PresentPlayer = { controller, player, presenter, grid, frame, typeLabel };
})();
