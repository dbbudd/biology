/* =============================================================
   SHARED SIMULATION CONTROLS
   -------------------------------------------------------------
   Loaded once by the shell before any simulation. Gives every sim
   the same controls, the same theme handling and the same loop
   contract, so a sim file only has to contain its model and its
   drawing.
   ============================================================= */
(function () {
    'use strict';
    const U = window.SIM_UI = window.SIM_UI || {};

    U.el = function (tag, cls) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        return e;
    };
    U.button = function (parent, label, cls) {
        const b = U.el('button', 'sim-btn' + (cls ? ' ' + cls : ''));
        b.type = 'button'; b.textContent = label; parent.appendChild(b);
        return b;
    };
    U.slider = function (parent, id, label, min, max, value, fmt, step) {
        const wrap = U.el('div', 'sim-control');
        const lab = document.createElement('label');
        const val = U.el('span', 'val');
        lab.textContent = label + ' '; lab.appendChild(val);
        const input = document.createElement('input');
        input.type = 'range'; input.min = min; input.max = max; input.value = value;
        if (step) input.step = step;
        input.id = 'sim-' + id + '-' + Math.random().toString(36).slice(2, 7);
        lab.htmlFor = input.id;
        wrap.appendChild(lab); wrap.appendChild(input); parent.appendChild(wrap);
        const sync = () => { val.textContent = fmt ? fmt(+input.value) : input.value; };
        input.addEventListener('input', sync); sync();
        return { input, sync, get value() { return +input.value; } };
    };
    U.select = function (parent, label, options, value) {
        const wrap = U.el('div', 'sim-control');
        const lab = document.createElement('label');
        lab.textContent = label;
        const sel = document.createElement('select');
        sel.className = 'sim-select';
        options.forEach(([v, t]) => {
            const o = document.createElement('option');
            o.value = v; o.textContent = t; sel.appendChild(o);
        });
        sel.value = value;
        sel.id = 'sim-sel-' + Math.random().toString(36).slice(2, 7);
        lab.htmlFor = sel.id;
        wrap.appendChild(lab); wrap.appendChild(sel); parent.appendChild(wrap);
        return { el: sel, get value() { return sel.value; } };
    };

    // Canvas sized to the sim column, with a stage wrapper
    U.stage = function (root, w, h, ariaLabel) {
        const stage = U.el('div', 'sim-stage');
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.style.width = '100%';
        canvas.setAttribute('role', 'img');
        if (ariaLabel) canvas.setAttribute('aria-label', ariaLabel);
        stage.appendChild(canvas);
        root.appendChild(stage);
        return { stage, canvas, ctx: canvas.getContext('2d') };
    };

    // Theme tokens, refreshed whenever the reader changes theme
    U.theme = function (onChange) {
        function read() {
            const cs = getComputedStyle(document.documentElement);
            const v = n => cs.getPropertyValue(n).trim();
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            const dark = theme === 'dark';
            // Canvas colours are read from the page's own tokens rather than
            // chosen by a dark/light test. There are THREE themes — a boolean
            // renders sepia with light-theme colours, which was the bug this
            // replaces.
            return {
                theme, dark,
                bg:   v('--bg-surface')    || (dark ? '#16202a' : '#f7f9fb'),
                ink:  v('--text')          || '#111',
                axis: v('--text-secondary')|| '#666',
                grid: v('--border')        || (dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'),
                red:  v('--red')           || '#aa272f',
                blue: v('--blue')          || '#14509e',
                teal: v('--light-teal')    || '#577899',
                yellow: v('--yellow')      || '#ffcd00',
                ok:   v('--ok')            || (dark ? '#7fc98a' : '#2e7d32')
            };
        }
        const state = { current: read() };
        window.addEventListener('themechange', () => {
            state.current = read();
            if (onChange) onChange(state.current);
        });
        return state;
    };

    // A generation loop that stops when the sim scrolls out of view
    U.loop = function (root, tick, ms) {
        let timer = null;
        const api = {
            get running() { return !!timer; },
            start() { if (!timer) timer = setInterval(tick, ms || 300); api.onchange && api.onchange(true); },
            stop() { if (timer) { clearInterval(timer); timer = null; } api.onchange && api.onchange(false); },
            toggle() { api.running ? api.stop() : api.start(); }
        };
        new IntersectionObserver(es => {
            es.forEach(e => { if (!e.isIntersecting) api.stop(); });
        }, { threshold: 0 }).observe(root);
        return api;
    };

    // Box-Muller normal deviate
    U.gauss = function () {
        let u = 0, v = 0;
        while (!u) u = Math.random();
        while (!v) v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    // Simple axes for a line chart
    U.axes = function (ctx, t, pad, w, h, opts) {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = t.bg; ctx.fillRect(0, 0, w, h);
        const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
        if (opts && opts.gridY) {
            ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
            opts.gridY.forEach(g => {
                const y = pad.t + ph - g.at * ph;
                ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
                if (g.label) {
                    ctx.fillStyle = t.axis; ctx.font = '10px system-ui, sans-serif';
                    ctx.textAlign = 'right'; ctx.fillText(g.label, pad.l - 6, y + 3);
                }
            });
        }
        ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph);
        ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke();
        ctx.globalAlpha = 1;
        return { pw, ph };
    };
})();
