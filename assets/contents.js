/* =============================================================
   CONTENTS PAGE — the course map
   -------------------------------------------------------------
   A Gantt chart of the course whose axis is WORK, not calendar time:
   a unit's bar is as long as the estimated time of its chapters, and
   it starts where the last of its prerequisites (COURSE.units[].needs)
   finishes. So the picture answers three questions at once — how long
   each unit is, what has to come first, and how much of it the reader
   has done.

   Clicking a bar opens that unit's chapter list in place, under the
   bar. That list is deliberately thin — number, title, time, progress.
   Summaries, standards and simulations live on the unit's own pages,
   which is where somebody who has chosen a unit is going anyway.

   The dependency links are positioned from the MEASURED position of each
   bar, because an open chapter list moves every row beneath it and a
   phone stacks the label above the bar. Anything that changes the
   layout has to call layoutLinks() afterwards.
   ============================================================= */
(function () {
    const shell = window.COURSE_SHELL;
    if (!shell) return;
    const { chapterCount, units, unitCount, chaptersInUnit, prefs } = shell;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const map = document.getElementById('course-map');
    if (!map) return;

    // ---------- time ----------
    // toc.js writes times as '45 min'; accept hours too so '1 h 30 min' works
    // if anyone ever writes one.
    function mins(t) {
        if (!t) return 0;
        const h = /(\d+)\s*h/i.exec(t);
        const m = /(\d+)\s*m/i.exec(t);
        return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
    }
    function hhmm(n) {
        n = Math.round(n);
        const h = Math.floor(n / 60), m = n % 60;
        if (!h) return m + ' min';
        return h + 'h' + (m ? ' ' + String(m).padStart(2, '0') + 'm' : '');
    }
    // "Unit 4 — Reproduction" -> "4";  "3.2 Carrying Capacity" -> "3.2"
    const unitNum = u => (/(\d+)/.exec(u.label) || [])[1] || '';
    const splitNum = t => {
        const m = /^([\d.]+)\s+(.*)$/.exec(t);
        return m ? { num: m[1], name: m[2] } : { num: '', name: t };
    };

    // ---------- the plan ----------
    function plan() {
        const rows = units.map(u => {
            const chaps = chaptersInUnit(u);
            const minutes = chaps.reduce((a, c) => a + mins(c.time), 0);
            const { done, total } = unitCount(u);
            // Time counts as done in the proportion of each chapter's sections
            // that are ticked, so the "you are here" mark moves with real work
            // rather than jumping a whole chapter at a time.
            const doneMins = chaps.reduce((a, c) => {
                const n = chapterCount(c);
                return a + mins(c.time) * (n.total ? n.done / n.total : 0);
            }, 0);
            return {
                u, chaps, minutes, doneMins, done, total,
                pct: total ? Math.round(done / total * 100) : 0
            };
        }).filter(r => r.chaps.length);

        const by = {};
        rows.forEach(r => { by[r.u.id] = r; });
        // Longest-path start times. Units are listed in order and a
        // prerequisite always appears before its dependent, so one pass is
        // enough; a cycle or a forward reference simply resolves to 0.
        rows.forEach(r => {
            const needs = (r.u.needs || []).map(id => by[id]).filter(Boolean);
            r.start = needs.length ? Math.max(...needs.map(n => n.start + n.minutes)) : 0;
            r.end = r.start + r.minutes;
            r.from = needs;
        });
        return rows;
    }

    // Which unit is open is remembered, so coming back does not fold up the
    // unit you were working through.
    let openId = prefs.get('contents_open', '');

    // ---------- the chapter list ----------
    function chapterList(r) {
        const items = r.chaps.map(c => {
            const { done, total } = chapterCount(c);
            const pct = total ? Math.round(done / total * 100) : 0;
            const { num, name } = splitNum(c.title);
            const finished = total > 0 && done >= total;
            const meta = total
                ? `<span class="cmap-chap-bar"><i style="width:${pct}%"></i></span>` +
                  `<span class="cmap-chap-count">${done}/${total}</span>`
                : '<span class="cmap-chap-bar cmap-chap-bar-none"></span><span class="cmap-chap-count"></span>';
            const inner =
                `<span class="cmap-chap-num">${esc(num)}</span>` +
                `<span class="cmap-chap-title">${esc(name)}</span>` +
                `<span class="cmap-chap-time">${esc(c.time || '')}</span>` + meta;
            const cls = 'cmap-chap' + (finished ? ' done' : '') + (c.status === 'planned' ? ' soon' : '');
            return c.status === 'planned'
                ? `<li><span class="${cls}">${inner}</span></li>`
                : `<li><a class="${cls}" href="${esc(c.file)}">${inner}</a></li>`;
        }).join('');
        return `<div class="cmap-panel" id="cmap-panel-${esc(r.u.id)}" role="region"
                     aria-label="${esc(r.u.label)} chapters"${openId === r.u.id ? '' : ' hidden'}>
                    <ul class="cmap-chaps">${items}</ul>
                </div>`;
    }

    // ---------- the map ----------
    function renderMap() {
        const rows = plan();
        if (!rows.length) { map.innerHTML = ''; return; }

        const span = Math.max(...rows.map(r => r.end)) || 1;
        const totalMins = rows.reduce((a, r) => a + r.minutes, 0);
        const doneMins = rows.reduce((a, r) => a + r.doneMins, 0);
        const totalSecs = rows.reduce((a, r) => a + r.total, 0);
        const doneSecs = rows.reduce((a, r) => a + r.done, 0);
        const pct = totalSecs ? Math.round(doneSecs / totalSecs * 100) : 0;
        const x = m => (m / span) * 100;

        // Axis: a tick every two hours while that stays readable, every four
        // when the course is long.
        const step = span > 900 ? 240 : 120;
        let ticks = '';
        for (let t = 0; t <= span; t += step) {
            ticks += `<span class="cmap-tick" style="left:${x(t).toFixed(3)}%">` +
                     `<i></i><b>${t ? Math.round(t / 60) + 'h' : '0'}</b></span>`;
        }

        // Link elements are emitted with their horizontal geometry, which is a
        // percentage and so survives any resize; the vertical is filled in by
        // layoutLinks() once the rows have been laid out.
        let links = '';
        rows.forEach((r, i) => {
            (r.from || []).forEach(p => {
                const j = rows.indexOf(p);
                if (j < 0 || j >= i) return;
                const at = x(p.end), to = x(r.start);
                links += `<span class="cmap-link" data-from="${j}" data-to="${i}" style="left:${at.toFixed(3)}%"></span>`;
                if (to - at > 0.05) {
                    links += `<span class="cmap-link-h" data-to="${i}" style="left:${at.toFixed(3)}%;width:${(to - at).toFixed(3)}%"></span>`;
                }
                links += `<span class="cmap-arrow" data-to="${i}" style="left:${to.toFixed(3)}%"></span>`;
            });
        });

        const body = rows.map(r => {
            const w = Math.max(x(r.minutes), 1.2);
            const n = unitNum(r.u);
            const label = (n ? 'Unit ' + n + ' · ' : '') + (r.u.short || r.u.label);
            const open = openId === r.u.id;
            return `<div class="cmap-unit${open ? ' open' : ''}" style="--unit-h:${r.u.hue}">
                <button type="button" class="cmap-row${r.total && r.done >= r.total ? ' done' : ''}"
                        data-unit="${esc(r.u.id)}" aria-expanded="${open}"
                        aria-controls="cmap-panel-${esc(r.u.id)}">
                    <span class="cmap-name">
                        <span class="cmap-name-main">${esc(label)}</span>
                        <span class="cmap-name-sub">${r.chaps.length} chapters · ${hhmm(r.minutes)}${r.total ? ' · ' + r.pct + '%' : ''}</span>
                    </span>
                    <span class="cmap-track">
                        <span class="cmap-bar" style="left:${x(r.start).toFixed(3)}%;width:${w.toFixed(3)}%">
                            <span class="cmap-fill" style="width:${r.pct}%"></span>
                        </span>
                    </span>
                </button>
                ${chapterList(r)}
            </div>`;
        }).join('');

        map.innerHTML = `
            <div class="cmap-head">
                <h3>Course map</h3>
                <p class="cmap-sub">Each bar is as long as the work in that unit, and starts where the unit before it ends. Click one to see its chapters.</p>
                <div class="cmap-stats">
                    <span><b>${hhmm(totalMins)}</b> of material</span>
                    <span><b>${rows.reduce((a, r) => a + r.chaps.length, 0)}</b> chapters</span>
                    <span class="cmap-stat-done"><b>${pct}%</b> done${doneMins > 0 ? ' · ' + hhmm(doneMins) : ''}</span>
                </div>
            </div>
            <div class="cmap-scroll">
                <div class="cmap-body">
                    <div class="cmap-axis">${ticks}</div>
                    <div class="cmap-links">${links}</div>
                    ${body}
                </div>
            </div>`;

        layoutLinks();
    }

    // Measure, then place. Called after every render, after a panel opens or
    // closes, and on resize — an open chapter list pushes the rows below it
    // down, and the links have to follow.
    function layoutLinks() {
        const body = map.querySelector('.cmap-body');
        if (!body) return;
        const base = body.getBoundingClientRect().top;
        const bars = [...body.querySelectorAll('.cmap-bar')].map(el => {
            const r = el.getBoundingClientRect();
            return { top: r.top - base, bottom: r.bottom - base, mid: r.top + r.height / 2 - base };
        });
        if (!bars.length) return;
        body.querySelectorAll('.cmap-link').forEach(el => {
            const from = bars[+el.dataset.from], to = bars[+el.dataset.to];
            if (!from || !to) return;
            el.style.top = from.bottom + 'px';
            el.style.height = Math.max(0, to.mid - from.bottom) + 'px';
        });
        body.querySelectorAll('.cmap-link-h, .cmap-arrow').forEach(el => {
            const to = bars[+el.dataset.to];
            if (!to) return;
            el.style.top = to.mid + 'px';
        });
    }

    // ---------- opening a unit ----------
    // One at a time: the whole point of the page is that it stays short.
    function toggle(id, force) {
        const want = typeof force === 'boolean' ? force : openId !== id;
        map.querySelectorAll('.cmap-unit').forEach(u => {
            const btn = u.querySelector('.cmap-row');
            const panel = u.querySelector('.cmap-panel');
            const on = want && btn.dataset.unit === id;
            u.classList.toggle('open', on);
            btn.setAttribute('aria-expanded', String(on));
            if (panel) panel.hidden = !on;
        });
        openId = want ? id : '';
        prefs.set('contents_open', openId);
        layoutLinks();
    }

    map.addEventListener('click', e => {
        const btn = e.target.closest('.cmap-row');
        if (!btn) return;
        toggle(btn.dataset.unit);
    });
    map.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !openId) return;
        const btn = map.querySelector('.cmap-row[data-unit="' + openId + '"]');
        toggle(openId, false);
        if (btn) btn.focus();
    });
    addEventListener('resize', () => {
        clearTimeout(layoutLinks.t);
        layoutLinks.t = setTimeout(layoutLinks, 120);
    });

    renderMap();
    document.addEventListener('progresschange', renderMap);
})();
