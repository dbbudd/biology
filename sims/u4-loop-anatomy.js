/* =============================================================
   FIGURE 4.30 — The shape of a negative feedback loop
   -------------------------------------------------------------
   Registers window.SIMS['u4-loop-anatomy'].
   Supports HS-LS1-3, HS-LS1-2.

   This is a figure that can be interrogated rather than a picture
   to look at. The five parts run across the top as illustrated
   tiles; selecting one explains what that part does, what it is in
   whichever worked example is chosen, and what fails if it breaks.

   Two deliberate choices:

     - The icons illustrate the ROLE, not the example. The stimulus
       icon leaves the set-point line and the response icon returns
       to it, so the two are mirror images — which is the whole
       meaning of the word "negative".
     - Switching the example changes only the wording in the tiles.
       The shape never moves. That is the point the chapter makes
       right underneath: two completely different systems, one shape.

   The graph below is the same loop plotted over time, and selecting
   a part highlights the stretch of the curve where it is acting.
   Receptor, control centre and effector all share one narrow band,
   which is honest and is itself worth noticing: the correction
   happens far faster than the drift that provoked it.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    const STYLE_ID = 'sim-u4lp-style';

    const W = 720, H = 334;
    const TILE_W = 122, TILE_Y = 22, TILE_H = 96;
    const CX = [72, 216, 360, 504, 648];        // tile centres
    const GY = 48;                               // graph group offset

    /* ---- the five parts, in order ---------------------------------- */
    const PARTS = [
        {
            k: 'stimulus', name: 'Stimulus', icon: 'away',
            does: 'Something pushes the level away from where the body holds it. Until this ' +
                  'happens the loop sits idle — a feedback loop is not a thing that runs, it is ' +
                  'a thing that answers.',
            fails: null,
            band: [96, 168],
            bandNote: 'The level is drifting away from the set point.'
        },
        {
            k: 'receptor', name: 'Receptor', icon: 'dish',
            does: 'A cell or structure that responds to the particular thing being regulated. ' +
                  'It does not decide anything; it only reports.',
            fails: 'the change is never noticed, and the level keeps drifting as though nothing ' +
                   'were wrong.',
            band: [160, 200],
            bandNote: 'Detection, decision and action all happen in this narrow band — far ' +
                      'faster than the drift that provoked them.'
        },
        {
            k: 'control', name: 'Control centre', icon: 'dial',
            does: 'The only part that holds a target value. It compares the reported level with ' +
                  'the set point and works out both how far off it is and in which direction.',
            fails: 'the level is still measured, but it is compared against the wrong target — so ' +
                   'the body defends the wrong value, steadily and confidently.',
            band: [160, 200],
            bandNote: 'Detection, decision and action all happen in this narrow band — far ' +
                      'faster than the drift that provoked them.'
        },
        {
            k: 'effector', name: 'Effector', icon: 'gear',
            does: 'The part that can physically do something — a muscle or a gland. The control ' +
                  'centre can only send instructions; the effector is what carries them out.',
            fails: 'the instruction is sent and nothing happens. The loop is intact right up to ' +
                   'the last step and still fails.',
            band: [160, 200],
            bandNote: 'Detection, decision and action all happen in this narrow band — far ' +
                      'faster than the drift that provoked them.'
        },
        {
            k: 'response', name: 'Response', icon: 'back',
            does: 'The effect that pushes the level back towards the set point. It must point the ' +
                  'opposite way to the stimulus — and that single fact is what the word ' +
                  '"negative" means.',
            fails: 'if the response pointed the same way as the stimulus, the loop would amplify ' +
                   'the change instead of cancelling it. That is positive feedback, and you meet ' +
                   'two examples of it later in this chapter.',
            band: [168, 300],
            bandNote: 'The response is winning: the level is being driven back down.'
        }
    ];

    /* ---- the same shape, three times over -------------------------- */
    const EXAMPLES = [
        {
            k: 'general', tab: 'The general shape',
            intro: 'Every negative feedback loop has these five parts. Select one to see what it does.',
            sub: {
                stimulus: 'pushes the level away',
                receptor: 'notices the change',
                control:  'holds the set point',
                effector: 'the part that can act',
                response: 'opposes the change'
            }
        },
        {
            k: 'temp', tab: 'Getting too hot',
            intro: 'The loop that holds your core temperature near 37 °C, on a day when you have ' +
                   'been running.',
            sub: {
                stimulus: 'core temperature rises',
                receptor: 'thermoreceptors',
                control:  'the hypothalamus',
                effector: ['sweat glands,', 'skin arterioles'],
                response: 'sweating, vasodilation'
            },
            is: {
                stimulus: 'Core temperature climbs above about 37 °C, because working muscle ' +
                          'releases heat faster than the body is losing it.',
                receptor: 'Thermoreceptors in the skin report the outside temperature; ' +
                          'thermoreceptors in the hypothalamus itself report the temperature of ' +
                          'the blood.',
                control:  'The hypothalamus, which holds the set point of roughly 37 °C.',
                effector: 'Sweat glands in the skin, and the smooth muscle in the walls of the ' +
                          'skin arterioles.',
                response: 'Sweat evaporates and takes heat with it; the arterioles widen so more ' +
                          'warm blood reaches the surface and loses heat. Temperature falls.'
            }
        },
        {
            k: 'hpg', tab: 'Testosterone drifts low',
            intro: 'The HPG axis — the loop this chapter is really about. Compare it, part for ' +
                   'part, with the temperature loop.',
            sub: {
                stimulus: 'testosterone drifts low',
                receptor: 'hypothalamic cells',
                control:  ['hypothalamus', 'and pituitary'],
                effector: 'the testis',
                response: 'more testosterone'
            },
            is: {
                stimulus: 'Blood testosterone drifts below the level the body holds it at.',
                receptor: 'Cells in the hypothalamus that detect how much testosterone is in the ' +
                          'blood going past them.',
                control:  'The hypothalamus and the pituitary. The hypothalamus releases GnRH, ' +
                          'which makes the pituitary release LH into the blood.',
                effector: 'The testis — specifically the cells between the seminiferous tubules, ' +
                          'which respond to LH.',
                response: 'More testosterone is released, the blood level rises, and the ' +
                          'hypothalamus detects that and turns GnRH back down.'
            }
        }
    ];

    /* ---- the closing transfer check -------------------------------- */
    /* A central heating system, on purpose: if the five parts only ever
       appear in biology the reader learns the examples, not the shape. */
    const CHECK = {
        intro: 'One last thing, and it is the reason for learning the shape rather than the ' +
               'examples. Here is a house with central heating. Name the part each piece plays.',
        items: [
            ['The room cools to 18 °C on a winter evening', 'stimulus'],
            ['The small temperature sensor inside the thermostat', 'receptor'],
            ['The thermostat, comparing that reading with the 20 °C you dialled in', 'control'],
            ['The boiler', 'effector'],
            ['Warm air raises the room back towards 20 °C', 'response']
        ],
        done: 'Not one part of that is biological, and the shape fits exactly. That is what makes ' +
              'it a model: it transfers. Every loop in the rest of this chapter — puberty, the ' +
              'menstrual cycle, growth hormone — is this same diagram with different labels.'
    };

    /* ---- the trace, computed once ---------------------------------- */
    /* A level at the set point, displaced, then corrected with a decaying
       overshoot: y = A·e^(-t/decay)·cos(2πt/period) after the push. */
    const SET_Y = 232, X0 = 52, X1 = 648;
    const PUSH0 = 96, PUSH1 = 168, AMP = 40, PERIOD = 132, DECAY = 118;
    function level(x) {
        if (x <= PUSH0) return 0;
        if (x <= PUSH1) return AMP * (0.5 - 0.5 * Math.cos(Math.PI * (x - PUSH0) / (PUSH1 - PUSH0)));
        const t = x - PUSH1;
        return AMP * Math.exp(-t / DECAY) * Math.cos(2 * Math.PI * t / PERIOD);
    }
    const TRACE = (function () {
        const p = [];
        for (let x = X0; x <= X1; x += 8) p.push([x, +(SET_Y - level(x)).toFixed(1)]);
        if (p[p.length - 1][0] !== X1) p.push([X1, +(SET_Y - level(X1)).toFixed(1)]);
        return p.map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + q[1]).join(' ');
    })();

    /* ---- icons, each drawn in its own 44 x 44 box ------------------- */
    /* The stimulus and response icons are mirror images on purpose. */
    function icon(kind, cx, cy) {
        const x = cx - 22, y = cy - 22;
        const g = s => '<g transform="translate(' + x + ',' + y + ')">' + s + '</g>';
        if (kind === 'away') return g(
            '<path class="lp-ibase" d="M0 32 H44"/>' +
            '<path class="lp-istroke" d="M4 32 C 15 32 21 25 27 11"/>' +
            '<path class="lp-ifill" d="M29 3 L24 14 L34 14 Z"/>');
        if (kind === 'back') return g(
            '<path class="lp-ibase" d="M0 32 H44"/>' +
            '<path class="lp-istroke" d="M11 6 C 17 20 23 29 33 31"/>' +
            '<path class="lp-ifill" d="M42 33 L32 28 L31 38 Z"/>');
        if (kind === 'dish') return g(
            '<path class="lp-istroke" d="M5 30 A 17 17 0 0 1 39 30"/>' +
            '<path class="lp-istroke" d="M22 30 V40"/>' +
            '<path class="lp-istroke" d="M13 40 H31"/>' +
            '<path class="lp-iwave" d="M27 12 A 9 9 0 0 1 35 4"/>' +
            '<path class="lp-iwave" d="M30 17 A 15 15 0 0 1 43 2"/>');
        if (kind === 'dial') return g(
            '<path class="lp-istroke" d="M5 32 A 17 17 0 0 1 39 32"/>' +
            '<path class="lp-iwave" d="M9 21 L12 23"/>' +
            '<path class="lp-iwave" d="M35 21 L32 23"/>' +
            '<path class="lp-imark" d="M22 12 V19"/>' +      // the set point itself
            '<path class="lp-istroke" d="M22 32 L13 22"/>' +  // needle, off target
            '<circle class="lp-ifill" cx="22" cy="32" r="3"/>');
        if (kind === 'gear') {
            let teeth = '';
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                teeth += '<path class="lp-istroke" d="M' + (22 + 11 * Math.cos(a)).toFixed(1) + ' ' +
                    (22 + 11 * Math.sin(a)).toFixed(1) + ' L' + (22 + 16 * Math.cos(a)).toFixed(1) +
                    ' ' + (22 + 16 * Math.sin(a)).toFixed(1) + '"/>';
            }
            return g('<circle class="lp-icirc" cx="22" cy="22" r="11"/>' +
                     '<circle class="lp-icirc" cx="22" cy="22" r="4"/>' + teeth);
        }
        return '';
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.lp { padding: 0.25rem 0 0; }',
            // .sim-buttons carries padding meant for a .sim box; this one lives in a figure
            '.lp .sim-buttons { padding:0; margin-top:0.7rem; }',
            '.lp { --lp-ok:#2e7d32; --lp-bad:#aa272f; --lp-red:#aa272f; --lp-blue:#14509e; }',
            '[data-theme="dark"] .lp { --lp-ok:#7fc98a; --lp-bad:#e08a90; --lp-red:#e8878f; --lp-blue:#7fb0e8; }',
            '[data-theme="sepia"] .lp { --lp-ok:#4a6b3d; }',
            '.lp-tabs { display:flex; gap:0.35rem; flex-wrap:wrap; margin:0 0 0.7rem; }',
            '.lp-tab { font:inherit; font-size:0.78rem; font-weight:600; cursor:pointer;',
            '   padding:0.34rem 0.7rem; border:1px solid var(--border); border-radius:999px;',
            '   background:var(--bg); color:var(--text-secondary); touch-action:manipulation; }',
            '.lp-tab:hover { border-color:var(--light-teal); }',
            '.lp-tab[aria-pressed="true"] { background:var(--light-teal); border-color:var(--light-teal);',
            '   color:#fff; }',
            '.lp-intro { font-size:0.8rem; color:var(--text-secondary); line-height:1.55;',
            '   margin:0 0 0.7rem; }',
            '.lp-stage { overflow-x:auto; -webkit-overflow-scrolling:touch; }',
            '.lp-stage svg { display:block; width:100%; min-width:600px; height:auto; }',
            /* tiles */
            '.lp-tile { cursor:pointer; }',
            '.lp-box { fill:var(--bg); stroke:var(--text-secondary); stroke-width:1.5; }',
            '.lp-tile:hover .lp-box { stroke:var(--light-teal); stroke-width:2.4; }',
            '.lp-tile:focus { outline:none; }',
            '.lp-tile:focus .lp-box { stroke:var(--light-teal); stroke-width:3; }',
            '.lp-tile.on .lp-box { fill:var(--light-teal); stroke:var(--light-teal); }',
            '.lp-t { font-size:12px; font-weight:700; fill:var(--text); text-anchor:middle; }',
            '.lp-s { font-size:9.5px; fill:var(--text-secondary); text-anchor:middle; }',
            '.lp-tile.on .lp-t, .lp-tile.on .lp-s { fill:#fff; }',
            '.lp-num { font-size:9px; font-weight:800; fill:var(--text-secondary); text-anchor:middle; }',
            '.lp-tile.on .lp-num { fill:#fff; }',
            /* icons */
            '.lp-istroke, .lp-iwave, .lp-ibase, .lp-imark { fill:none; stroke:var(--text-secondary);',
            '   stroke-width:2; stroke-linecap:round; }',
            '.lp-ibase { stroke-dasharray:4 3; stroke-width:1.4; opacity:0.75; }',
            '.lp-iwave { stroke-width:1.6; opacity:0.8; }',
            '.lp-imark { stroke:var(--lp-red); stroke-width:2.6; }',
            '.lp-ifill { fill:var(--text-secondary); stroke:none; }',
            '.lp-icirc { fill:none; stroke:var(--text-secondary); stroke-width:2; }',
            '.lp-tile.on .lp-istroke, .lp-tile.on .lp-iwave, .lp-tile.on .lp-ibase,',
            '.lp-tile.on .lp-icirc, .lp-tile.on .lp-imark { stroke:#fff; }',
            '.lp-tile.on .lp-ifill { fill:#fff; }',
            /* the loop and the graph */
            '.lp-arrow { fill:none; stroke:var(--text-secondary); stroke-width:1.6; }',
            '.lp-lane { fill:none; stroke:var(--lp-red); stroke-width:2; stroke-dasharray:7 4; }',
            '.lp-laneh { fill:var(--lp-red); }',
            '.lp-lanet { font-size:11px; font-weight:800; fill:var(--lp-red); text-anchor:middle; }',
            '.lp-rule { stroke:var(--border); stroke-width:1; }',
            '.lp-h { font-size:11px; font-weight:700; fill:var(--text); }',
            '.lp-set { fill:none; stroke:var(--text-secondary); stroke-width:1.2;',
            '   stroke-dasharray:5 4; opacity:0.8; }',
            '.lp-trace { fill:none; stroke:var(--lp-blue); stroke-width:2.4;',
            '   stroke-linejoin:round; stroke-linecap:round; }',
            '.lp-dot { fill:var(--lp-blue); }',
            '.lp-ann { font-size:10.5px; fill:var(--text-secondary); }',
            '.lp-lead { fill:none; stroke:var(--text-secondary); stroke-width:1; opacity:0.55; }',
            '.lp-band { fill:var(--light-teal); opacity:0.16; }',
            '.lp-bandline { stroke:var(--light-teal); stroke-width:1.4; fill:none; opacity:0.75; }',
            /* the detail panel */
            '.lp-detail { margin-top:0.85rem; border:1px solid var(--border);',
            '   border-left:4px solid var(--light-teal); border-radius:8px;',
            '   background:var(--bg-surface); padding:0.8rem 0.95rem; }',
            '.lp-detail h5 { margin:0 0 0.15rem; font-size:0.95rem; }',
            '.lp-role { font-size:0.66rem; font-weight:800; letter-spacing:0.07em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.45rem; }',
            '.lp-detail p { margin:0 0 0.55rem; font-size:0.85rem; line-height:1.65; }',
            '.lp-detail p:last-child { margin-bottom:0; }',
            '.lp-is { border-top:1px solid var(--border); padding-top:0.55rem; margin-top:0.6rem; }',
            '.lp-is b, .lp-fail b { color:var(--text); }',
            '.lp-fail { color:var(--lp-bad); }',
            '.lp-hint { font-size:0.8rem; color:var(--text-secondary); line-height:1.6;',
            '   margin:0.85rem 0 0; font-style:italic; }',
            /* the check */
            '.lp-check { margin-top:1rem; border-top:1px solid var(--border); padding-top:0.9rem; }',
            '.lp-q { font-size:0.85rem; font-weight:600; margin:0.7rem 0 0.45rem; }',
            '.lp-opts { display:flex; gap:0.35rem; flex-wrap:wrap; }',
            '.lp-opt { font:inherit; font-size:0.78rem; cursor:pointer; padding:0.35rem 0.65rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; }',
            '.lp-opt:hover { border-color:var(--light-teal); }',
            '.lp-opt.wrong { border-color:var(--lp-bad); color:var(--lp-bad); opacity:0.6; }',
            '.lp-msg { font-size:0.83rem; line-height:1.6; margin:0.5rem 0 0; min-height:2.2em; }',
            '.lp-msg.ok { color:var(--lp-ok); } .lp-msg.bad { color:var(--lp-bad); }',
            '.lp-msg b { color:var(--text); }',
            '.lp-scored { display:flex; gap:0.3rem; flex-wrap:wrap; margin:0.5rem 0 0; }',
            '.lp-chip { font-size:0.7rem; font-weight:700; padding:0.16rem 0.5rem; border-radius:999px;',
            '   border:1px solid var(--lp-ok); color:var(--lp-ok); background:rgba(46,125,50,0.08); }',
            '.lp-done { margin-top:0.7rem; border:1px solid var(--lp-ok); border-radius:9px;',
            '   background:rgba(46,125,50,0.08); padding:0.75rem 0.9rem; font-size:0.84rem;',
            '   line-height:1.6; }',
            '[data-theme="dark"] .lp-done { background:rgba(127,201,138,0.12); }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-loop-anatomy'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'lp');
        root.appendChild(wrap);

        let ex = EXAMPLES[0];
        let sel = null;                  // selected part key
        let seen = {};                   // part key -> true
        let checkOn = false;             // the transfer check has been opened
        let ci = 0, cTried = [], cMsg = null, cDone = false;

        const partOf = k => PARTS.filter(p => p.k === k)[0];
        const allSeen = () => PARTS.every(p => seen[p.k]);

        /* ---------------- the drawing ------------------------------- */
        function svg() {
            let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
                'role="img" aria-label="Five parts of a negative feedback loop in a row — ' +
                'stimulus, receptor, control centre, effector, response — with a dashed return ' +
                'arrow marked minus running from the response back to the stimulus, and below ' +
                'them a graph of the level over time returning to the set point.">';

            // tiles
            PARTS.forEach((p, i) => {
                const cx = CX[i], on = sel === p.k;
                s += '<g class="lp-tile' + (on ? ' on' : '') + '" data-k="' + p.k + '" ' +
                     'role="button" tabindex="0" aria-pressed="' + on + '" ' +
                     'aria-label="' + p.name + '">';
                s += '<rect class="lp-box" x="' + (cx - TILE_W / 2) + '" y="' + TILE_Y +
                     '" width="' + TILE_W + '" height="' + TILE_H + '" rx="11"/>';
                s += '<text class="lp-num" x="' + (cx - TILE_W / 2 + 11) + '" y="' + (TILE_Y + 15) +
                     '" style="text-anchor:start">' + (i + 1) + '</text>';
                s += icon(p.icon, cx, TILE_Y + 30);
                s += '<text class="lp-t" x="' + cx + '" y="' + (TILE_Y + 66) + '">' + p.name + '</text>';
                // a sub-label may be given as two lines where one would overrun the tile
                const sub = ex.sub[p.k];
                const lines = Array.isArray(sub) ? sub : [sub];
                const top = lines.length > 1 ? 76 : 82;
                lines.forEach((ln, n) => {
                    s += '<text class="lp-s" x="' + cx + '" y="' + (TILE_Y + top + n * 11) +
                         '">' + ln + '</text>';
                });
                s += '</g>';
                if (i < PARTS.length - 1) {
                    const a = cx + TILE_W / 2 + 4, b = CX[i + 1] - TILE_W / 2 - 4;
                    s += '<path class="lp-arrow" d="M' + a + ' ' + (TILE_Y + TILE_H / 2) + ' L' +
                         (b - 5) + ' ' + (TILE_Y + TILE_H / 2) + '"/>' +
                         '<path class="lp-arrow" style="stroke:none;fill:var(--text-secondary)" d="M' +
                         b + ' ' + (TILE_Y + TILE_H / 2) + ' L' + (b - 7) + ' ' +
                         (TILE_Y + TILE_H / 2 - 4) + ' L' + (b - 7) + ' ' +
                         (TILE_Y + TILE_H / 2 + 4) + ' Z"/>';
                }
            });

            // the return leg, in a lane of its own
            const laneY = 152, tileBot = TILE_Y + TILE_H;
            s += '<path class="lp-lane" d="M648 ' + tileBot + ' L648 ' + (laneY - 8) +
                 ' Q648 ' + laneY + ' 640 ' + laneY + ' L80 ' + laneY +
                 ' Q72 ' + laneY + ' 72 ' + (laneY - 8) + ' L72 ' + (tileBot + 8) + '"/>';
            s += '<path class="lp-laneh" d="M72 ' + tileBot + ' L67 ' + (tileBot + 10) +
                 ' L77 ' + (tileBot + 10) + ' Z"/>';
            s += '<circle cx="360" cy="' + laneY + '" r="10" fill="var(--bg)" ' +
                 'stroke="var(--lp-red)" stroke-width="2"/>';
            s += '<text class="lp-lanet" x="360" y="' + (laneY + 5) +
                 '" style="font-size:15px">&#8722;</text>';
            s += '<text class="lp-lanet" x="360" y="' + (laneY + 22) +
                 '">negative feedback — the response opposes the stimulus</text>';

            // the graph
            s += '<line class="lp-rule" x1="11" y1="192" x2="709" y2="192"/>';
            s += '<text class="lp-h" x="11" y="212">The same loop, plotted over time</text>';
            s += '<g transform="translate(0,' + GY + ')">';

            const p = sel ? partOf(sel) : null;
            if (p) {
                s += '<rect class="lp-band" x="' + p.band[0] + '" y="186" width="' +
                     (p.band[1] - p.band[0]) + '" height="82" rx="5"/>';
                s += '<path class="lp-bandline" d="M' + p.band[0] + ' 186 V268 M' +
                     p.band[1] + ' 186 V268"/>';
            }
            s += '<path class="lp-set" d="M40 ' + SET_Y + ' L650 ' + SET_Y + '"/>';
            s += '<text class="lp-ann" x="656" y="' + (SET_Y + 4) + '">set point</text>';
            s += '<path class="lp-trace" d="' + TRACE + '"/>';
            s += '<circle class="lp-dot" cx="168" cy="192" r="3.2"/>';
            s += '<text class="lp-ann" x="52" y="190">a stimulus pushes</text>';
            s += '<text class="lp-ann" x="52" y="201">the level away</text>';
            s += '<path class="lp-lead" d="M140 197 L161 193"/>';
            s += '<text class="lp-ann" x="244" y="196">the response opposes it,</text>';
            s += '<text class="lp-ann" x="244" y="207">so the level comes back</text>';
            s += '<path class="lp-lead" d="M241 203 L205 224"/>';
            s += '</g>';

            s += '<text class="lp-ann" x="360" y="323" style="text-anchor:middle">' +
                 'Nothing sits perfectly still: the level overshoots, is corrected again, and ' +
                 'settles close to the set point.</text>';
            s += '</svg>';
            return s;
        }

        /* ---------------- the page ---------------------------------- */
        function render() {
            wrap.innerHTML = '';

            const tabs = U.el('div', 'lp-tabs');
            EXAMPLES.forEach(e => {
                const b = U.el('button', 'lp-tab');
                b.type = 'button';
                b.textContent = e.tab;
                b.setAttribute('aria-pressed', e.k === ex.k ? 'true' : 'false');
                b.addEventListener('click', () => { ex = e; render(); });
                tabs.appendChild(b);
            });
            wrap.appendChild(tabs);

            const intro = U.el('p', 'lp-intro');
            intro.textContent = ex.intro;
            wrap.appendChild(intro);

            const stage = U.el('div', 'lp-stage');
            stage.innerHTML = svg();
            wrap.appendChild(stage);
            stage.querySelectorAll('.lp-tile').forEach(g => {
                const act = () => {
                    const k = g.dataset.k;
                    sel = sel === k ? null : k;
                    if (sel) seen[sel] = true;
                    render();
                };
                g.addEventListener('click', act);
                g.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                });
            });

            if (sel) wrap.appendChild(detail(partOf(sel)));
            else {
                const h = U.el('p', 'lp-hint');
                h.textContent = allSeen()
                    ? 'Switch example above and watch what changes: only the wording. The shape, '
                      + 'the order and the minus sign stay exactly where they are.'
                    : 'Select any part of the loop to see what it does — and what goes wrong '
                      + 'without it.';
                wrap.appendChild(h);
            }

            if (allSeen()) wrap.appendChild(checkBox());
        }

        function detail(p) {
            const d = U.el('div', 'lp-detail');
            const r = U.el('p', 'lp-role');
            r.textContent = 'Part ' + (PARTS.indexOf(p) + 1) + ' of 5';
            d.appendChild(r);
            const h = document.createElement('h5');
            h.textContent = p.name;
            d.appendChild(h);

            const does = U.el('p');
            does.innerHTML = p.does;
            d.appendChild(does);

            if (ex.is && ex.is[p.k]) {
                const is = U.el('p', 'lp-is');
                is.innerHTML = '<b>Here:</b> ' + ex.is[p.k];
                d.appendChild(is);
            }
            if (p.fails) {
                const f = U.el('p', 'lp-fail');
                f.innerHTML = '<b>Break it and</b> ' + p.fails;
                d.appendChild(f);
            }
            const b = U.el('p', 'lp-is');
            b.innerHTML = '<b>On the graph:</b> ' + p.bandNote;
            d.appendChild(b);
            return d;
        }

        /* ---------------- the transfer check ------------------------ */
        function checkBox() {
            const box = U.el('div', 'lp-check');
            if (!checkOn) {
                const p = U.el('p', 'lp-intro');
                p.textContent = 'You have been through all five. Ready to use them on something ' +
                                'that is not biology at all?';
                box.appendChild(p);
                const btns = U.el('div', 'sim-buttons');
                U.button(btns, 'Try it on a house').addEventListener('click', () => {
                    checkOn = true; render();
                });
                box.appendChild(btns);
                return box;
            }

            const intro = U.el('p', 'lp-intro');
            intro.textContent = CHECK.intro;
            box.appendChild(intro);

            if (cDone) {
                const d = U.el('div', 'lp-done');
                d.textContent = CHECK.done;
                box.appendChild(d);
                const btns = U.el('div', 'sim-buttons');
                U.button(btns, 'Start the check again').addEventListener('click', () => {
                    ci = 0; cTried = []; cMsg = null; cDone = false; render();
                });
                box.appendChild(btns);
                return box;
            }

            if (ci > 0) {
                const chips = U.el('div', 'lp-scored');
                CHECK.items.slice(0, ci).forEach(it => {
                    const c = U.el('span', 'lp-chip');
                    c.textContent = partOf(it[1]).name;
                    chips.appendChild(c);
                });
                box.appendChild(chips);
            }

            const q = U.el('p', 'lp-q');
            q.innerHTML = '<span style="color:var(--text-secondary);font-weight:400">' +
                (ci + 1) + ' of ' + CHECK.items.length + '</span> &nbsp; ' + CHECK.items[ci][0];
            box.appendChild(q);

            const opts = U.el('div', 'lp-opts');
            PARTS.forEach(p => {
                const b = U.el('button', 'lp-opt' + (cTried.indexOf(p.k) > -1 ? ' wrong' : ''));
                b.type = 'button';
                b.textContent = p.name;
                b.addEventListener('click', () => {
                    if (p.k === CHECK.items[ci][1]) {
                        cTried = [];
                        if (ci === CHECK.items.length - 1) { cDone = true; cMsg = null; }
                        else { ci++; cMsg = { cls: 'ok', html: 'Yes.' }; }
                    } else {
                        cTried.push(p.k);
                        cMsg = { cls: 'bad', html: 'No. Ask what that piece <em>does</em>: does it ' +
                            'sense, decide, act, or is it the change itself?' };
                    }
                    render();
                });
                opts.appendChild(b);
            });
            box.appendChild(opts);

            const m = U.el('p', 'lp-msg' + (cMsg ? ' ' + cMsg.cls : ''));
            m.setAttribute('role', 'status');
            m.setAttribute('aria-live', 'polite');
            if (cMsg) m.innerHTML = cMsg.html;
            box.appendChild(m);
            return box;
        }

        render();

        root._simState = () => ({
            example: ex.k, selected: sel,
            seen: PARTS.filter(p => seen[p.k]).map(p => p.k),
            allSeen: allSeen(), checkOpen: checkOn, checkItem: ci, checkDone: cDone
        });
        root._simSolve = () => {
            PARTS.forEach(p => { seen[p.k] = true; });
            checkOn = true; cDone = true; ci = CHECK.items.length - 1;
            sel = null; cMsg = null; render();
        };
    };
})();
