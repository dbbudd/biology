/* =============================================================
   INTERACTIVE — Meiosis walkthrough
   -------------------------------------------------------------
   Registers window.SIMS['u4-meiosis-walkthrough'].
   Supports HS-LS1-4, HS-LS3-2.

   One cell with 2n = 4 is driven through interphase, meiosis I and
   meiosis II. The chromosomes are drawn from a model — position,
   colour and chromatid count all come from the state object — so
   the picture cannot drift away from the numbers underneath it.

   At every stage the reader must commit to TWO counts before the
   stage will advance: how many chromosomes are in this cell, and
   how many chromatids. Those two numbers are where meiosis is
   actually understood or not, because the hard step (after meiosis
   I: 2 chromosomes, 4 chromatids, already haploid) is invisible if
   you only ever count one of them.

   The mitosis comparison runs in a second mode on the same engine,
   so "what is different about meiosis" is a thing the reader can
   see rather than a table they memorise.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4mw-style';

    /* 2n = 4: two homologous pairs. Pair 0 is long, pair 1 is short.
       Within a pair, one chromosome came from each parent. */
    const MEIOSIS = [
        { id: 'g1', name: 'G1 — before anything happens',
          chroms: 4, chromatids: 4, cells: 1, ploidy: '2n',
          say: 'Four chromosomes: two long, two short. Each pair is a <b>homologous pair</b> — ' +
               'same genes, same order, one copy inherited from each parent. Each chromosome is ' +
               'a single DNA molecule, so four chromosomes means four chromatids.' },
        { id: 's', name: 'After S phase — DNA copied',
          chroms: 4, chromatids: 8, cells: 1, ploidy: '2n',
          say: 'Every chromosome has been copied. Here is the trap that costs the most marks in ' +
               'this unit: the chromosome <em>number has not changed</em>. It is still 4. Each ' +
               'chromosome is now two identical <b>sister chromatids</b> joined at the centromere, ' +
               'so there are 8 chromatids but still 4 chromosomes. You count chromosomes by ' +
               'counting centromeres.' },
        { id: 'p1', name: 'Prophase I — pairing and crossing over',
          chroms: 4, chromatids: 8, cells: 1, ploidy: '2n', cross: true,
          say: 'This is the step mitosis never takes. Homologous chromosomes find each other and ' +
               'pair up along their whole length — four chromatids lying together, a <b>tetrad</b>. ' +
               'Where they touch, they break and swap matching segments: <b>crossing over</b>. ' +
               'Look at the chromatids now. Each one carries a mixture of both grandparents’ DNA, ' +
               'a combination that has never existed before.' },
        { id: 'm1', name: 'Metaphase I — pairs on the plate',
          chroms: 4, chromatids: 8, cells: 1, ploidy: '2n', cross: true, plate: 'pairs',
          say: 'The <em>pairs</em> line up on the equator — two chromosomes deep, not one. And ' +
               'which member of each pair faces which pole is decided <b>at random, ' +
               'independently for every pair</b>. That is <b>independent assortment</b>, and it is ' +
               'the single largest source of the differences between you and your siblings. ' +
               'Chapter 4.6 counts exactly how large.' },
        { id: 'a1', name: 'Anaphase I — homologues separate',
          chroms: 4, chromatids: 8, cells: 1, ploidy: '2n', cross: true, split: 'homo',
          say: 'The homologous pairs are pulled apart. Notice what is <em>not</em> happening: the ' +
               'sister chromatids stay joined. Each chromosome travelling to a pole is still two ' +
               'chromatids. In mitosis, anaphase splits sisters; in anaphase I, it splits pairs. ' +
               'That one difference is what makes meiosis a reduction division.' },
        { id: 't1', name: 'After meiosis I — two cells',
          chroms: 2, chromatids: 4, cells: 2, ploidy: 'n', cross: true, per: true,
          say: 'Two cells, and each one has <b>2 chromosomes made of 4 chromatids</b>. Read that ' +
               'again, because it is the hardest count in the unit. The cell is already ' +
               '<b>haploid</b> — it has one chromosome from each pair, one full set — even though ' +
               'it still holds twice as much DNA as a finished gamete. Ploidy counts <em>sets of ' +
               'chromosomes</em>, not amount of DNA.' },
        { id: 'm2', name: 'Metaphase II — chromosomes on the plate',
          chroms: 2, chromatids: 4, cells: 2, ploidy: 'n', cross: true, per: true, plate: 'single',
          say: 'There is no S phase between the two divisions — nothing is copied again. Each ' +
               'haploid cell lines its chromosomes up singly on the equator, exactly as in mitosis.' },
        { id: 'a2', name: 'Anaphase II — sisters separate',
          chroms: 4, chromatids: 4, cells: 2, ploidy: 'n', cross: true, per: true, split: 'sister',
          say: 'Now the sister chromatids finally come apart, and each becomes a chromosome in its ' +
               'own right. For this instant the cell contains 4 separate chromosomes again — but it ' +
               'is about to divide, and each daughter will get one full set. A cell is counted as ' +
               'haploid or diploid by what its daughters receive, not by this momentary state.' },
        { id: 'end', name: 'Four gametes',
          chroms: 2, chromatids: 2, cells: 4, ploidy: 'n', cross: true, per: true, final: true,
          say: 'Four cells, each with <b>2 chromosomes and 2 chromatids</b> — half the chromosome ' +
               'number of the cell we started with, and all four genetically different from each ' +
               'other. One diploid cell, two divisions, four haploid gametes. That is meiosis.' }
    ];

    const MITOSIS = [
        { id: 'g1', name: 'G1 — before anything happens',
          chroms: 4, chromatids: 4, cells: 1, ploidy: '2n',
          say: 'Identical starting point: 4 chromosomes, 4 chromatids, diploid.' },
        { id: 's', name: 'After S phase — DNA copied',
          chroms: 4, chromatids: 8, cells: 1, ploidy: '2n',
          say: 'Identical to meiosis so far. 4 chromosomes, 8 chromatids.' },
        { id: 'p', name: 'Prophase',
          chroms: 4, chromatids: 8, cells: 1, ploidy: '2n',
          say: 'And here the two processes part company. The chromosomes condense, but homologous ' +
               'chromosomes <b>do not pair up</b>. No tetrads, no synapsis, and so no crossing ' +
               'over. Nothing is shuffled.' },
        { id: 'm', name: 'Metaphase',
          chroms: 4, chromatids: 8, cells: 1, ploidy: '2n', plate: 'single',
          say: 'All four chromosomes line up <b>singly</b> on the equator — one chromosome deep, ' +
               'not two. Compare this with metaphase I and the whole difference is visible in one ' +
               'picture.' },
        { id: 'a', name: 'Anaphase',
          chroms: 8, chromatids: 8, cells: 1, ploidy: '2n', split: 'sister',
          say: 'Sister chromatids separate. Each pole receives a complete set of 4 chromosomes — ' +
               'and for this moment the cell contains 8.' },
        { id: 'end', name: 'Two daughter cells',
          chroms: 4, chromatids: 4, cells: 2, ploidy: '2n', per: true, final: true,
          say: 'Two cells, each with <b>4 chromosomes</b> — the same number the parent had, and ' +
               'genetically identical to it and to each other. One division, two diploid cells. ' +
               'That is mitosis.' }
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.mw { padding:1rem 1.25rem 1.25rem; }',
            '.mw { --mw-ok:#2e7d32; --mw-bad:#aa272f; }',
            '[data-theme="dark"] .mw { --mw-ok:#7fc98a; --mw-bad:#e08a90; }',
            '[data-theme="sepia"] .mw { --mw-ok:#4a6b3d; --mw-bad:#a04040; }',
            '.mw-tabs { display:flex; gap:0.4rem; margin-bottom:0.9rem; flex-wrap:wrap; }',
            '.mw-tab { font:inherit; font-size:0.78rem; font-weight:600; cursor:pointer;',
            '   padding:0.4rem 0.8rem; border:1px solid var(--border); border-radius:999px;',
            '   background:var(--bg); color:var(--text-secondary); touch-action:manipulation; }',
            '.mw-tab[aria-pressed="true"] { border-color:var(--light-teal); color:var(--text);',
            '   box-shadow:0 0 0 1px var(--light-teal); }',
            '.mw-step { font-size:0.66rem; font-weight:800; letter-spacing:0.07em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.2rem; }',
            '.mw-name { font-size:1rem; font-weight:700; margin:0 0 0.7rem; }',
            '.mw-stage { border:1px solid var(--border); border-radius:11px; background:var(--bg);',
            '   padding:0.5rem; overflow-x:auto; }',
            '.mw-stage svg { display:block; width:100%; min-width:360px; height:auto; }',
            '.mw-counts { display:flex; gap:0.8rem; flex-wrap:wrap; margin:0.75rem 0 0; }',
            '.mw-c { border:1px solid var(--border); border-radius:9px; padding:0.45rem 0.65rem;',
            '   min-width:110px; }',
            '.mw-c small { display:block; color:var(--text-secondary); font-size:0.64rem;',
            '   text-transform:uppercase; letter-spacing:0.05em; font-weight:700; }',
            '.mw-c b { font-size:1.2rem; }',
            '.mw-q { font-size:0.85rem; font-weight:600; margin:1rem 0 0.45rem; }',
            '.mw-opts { display:flex; gap:0.35rem; flex-wrap:wrap; margin-bottom:0.55rem; }',
            '.mw-opt { font:inherit; font-size:0.85rem; font-weight:700; cursor:pointer;',
            '   min-width:2.4rem; padding:0.35rem 0.6rem; border:1px solid var(--border);',
            '   border-radius:8px; background:var(--bg); color:var(--text); touch-action:manipulation; }',
            '.mw-opt:hover { border-color:var(--light-teal); }',
            '.mw-opt.right { border-color:var(--mw-ok); color:var(--mw-ok); }',
            '.mw-opt.wrong { border-color:var(--mw-bad); color:var(--mw-bad); opacity:0.55; }',
            '.mw-msg { font-size:0.82rem; line-height:1.6; margin:0.5rem 0 0; min-height:2.4em; }',
            '.mw-msg.ok { color:var(--mw-ok); } .mw-msg.bad { color:var(--mw-bad); }',
            '.mw-say { margin-top:0.9rem; border:1px solid var(--border); border-left:4px solid var(--light-teal);',
            '   border-radius:8px; background:var(--bg-surface); padding:0.75rem 0.9rem;',
            '   font-size:0.85rem; line-height:1.65; }',
            '.mw-say b { color:var(--text); }',
            '.mw-track { display:flex; gap:3px; margin:0.8rem 0 0; flex-wrap:wrap; }',
            '.mw-dot { flex:1 1 0; min-width:12px; height:5px; border-radius:3px; background:var(--border); }',
            '.mw-dot.done { background:var(--light-teal); }',
            '.mw-dot.here { background:var(--text); }'
        ].join('\n');
        document.head.appendChild(s);
    }

    /* ---------- drawing --------------------------------------------- */
    const COL = { mum: 'hsl(340 62% 48%)', dad: 'hsl(205 62% 45%)' };

    function chromatid(x, y, len, w, col, swapAt) {
        // one chromatid drawn as a rounded bar; swapAt !== null paints the
        // distal part in the other parent's colour to show crossing over
        const other = col === COL.mum ? COL.dad : COL.mum;
        let s = '<rect x="' + (x - w / 2) + '" y="' + (y - len / 2) + '" width="' + w +
            '" height="' + len + '" rx="' + (w / 2) + '" fill="' + col + '"/>';
        if (swapAt) {
            const seg = len * 0.34;
            s += '<rect x="' + (x - w / 2) + '" y="' + (y - len / 2) + '" width="' + w +
                '" height="' + seg + '" rx="' + (w / 2) + '" fill="' + other + '"/>';
        }
        return s;
    }

    function drawChromosome(cx, cy, long, col, sisters, crossed, crossOne) {
        // sisters: 1 or 2 chromatids; crossOne: only the second chromatid swapped
        const len = long ? 54 : 34, w = 9;
        let s = '';
        if (sisters === 2) {
            s += chromatid(cx - 6, cy, len, w, col, crossed && !crossOne);
            s += chromatid(cx + 6, cy, len, w, col, crossed);
            s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="var(--bg)" ' +
                 'stroke="' + col + '" stroke-width="2"/>';
        } else {
            s += chromatid(cx, cy, len, w, col, crossed);
            s += '<circle cx="' + cx + '" cy="' + cy + '" r="3.4" fill="var(--bg)" ' +
                 'stroke="' + col + '" stroke-width="1.8"/>';
        }
        return s;
    }

    function cellBox(x, y, w, h, label) {
        return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
            '" rx="' + Math.min(w, h) / 2.2 + '" fill="var(--bg-surface)" ' +
            'stroke="var(--text-secondary)" stroke-width="1.5" opacity="0.95"/>' +
            (label ? '<text x="' + (x + w / 2) + '" y="' + (y + h + 15) +
                '" text-anchor="middle" font-size="11" fill="var(--text-secondary)">' + label + '</text>' : '');
    }

    function render(stage, isMeiosis) {
        const W = 640, H = 240;
        let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" ' +
            'aria-label="' + stage.name + ': ' + stage.cells + ' cell' + (stage.cells === 1 ? '' : 's') +
            ' containing ' + stage.chroms + ' chromosomes and ' + stage.chromatids +
            ' chromatids in total.">';
        const cross = !!stage.cross;

        if (stage.cells === 1) {
            const cw = 260, ch = 190, cx = W / 2 - cw / 2, cy = 22;
            s += cellBox(cx, cy, cw, ch, '');
            const mid = cx + cw / 2, midY = cy + ch / 2;
            const sisters = stage.chromatids / stage.chroms >= 2 ? 2 : 1;

            if (stage.split === 'homo') {
                // homologues pulled to opposite poles, sisters still together
                s += drawChromosome(mid - 62, midY - 34, true, COL.mum, 2, cross, false);
                s += drawChromosome(mid - 62, midY + 34, false, COL.mum, 2, cross, false);
                s += drawChromosome(mid + 62, midY - 34, true, COL.dad, 2, cross, true);
                s += drawChromosome(mid + 62, midY + 34, false, COL.dad, 2, cross, true);
                s += poleFibres(mid, midY);
            } else if (stage.split === 'sister') {
                s += drawChromosome(mid - 62, midY - 34, true, COL.mum, 1, cross, false);
                s += drawChromosome(mid - 62, midY + 34, false, COL.dad, 1, cross, false);
                s += drawChromosome(mid + 62, midY - 34, true, COL.mum, 1, cross, true);
                s += drawChromosome(mid + 62, midY + 34, false, COL.dad, 1, cross, true);
                s += poleFibres(mid, midY);
            } else if (stage.plate === 'pairs') {
                s += drawChromosome(mid - 34, midY - 40, true, COL.mum, 2, cross, false);
                s += drawChromosome(mid + 34, midY - 40, true, COL.dad, 2, cross, true);
                s += drawChromosome(mid - 34, midY + 40, false, COL.dad, 2, cross, true);
                s += drawChromosome(mid + 34, midY + 40, false, COL.mum, 2, cross, false);
                s += plateLine(mid, cy, ch, true);
            } else if (stage.plate === 'single') {
                const xs = [-63, -21, 21, 63];
                const cols = [COL.mum, COL.dad, COL.mum, COL.dad];
                xs.forEach((dx, i) => {
                    s += drawChromosome(mid + dx, midY, i < 2, cols[i], sisters, cross, i % 2 === 1);
                });
                s += plateLine(mid, cy, ch, false);
            } else if (stage.id === 'p1') {
                // tetrads, paired and crossing over
                s += drawChromosome(mid - 46, midY - 42, true, COL.mum, 2, false, false);
                s += drawChromosome(mid - 14, midY - 42, true, COL.dad, 2, false, false);
                s += crossMark(mid - 30, midY - 42);
                s += drawChromosome(mid + 20, midY + 40, false, COL.mum, 2, false, false);
                s += drawChromosome(mid + 52, midY + 40, false, COL.dad, 2, false, false);
                s += crossMark(mid + 36, midY + 40);
                s += '<text x="' + mid + '" y="' + (cy + ch - 10) + '" text-anchor="middle" ' +
                     'font-size="10.5" fill="var(--text-secondary)">two tetrads · four chromatids each</text>';
            } else {
                const xs = [-58, -20, 22, 58];
                const cols = [COL.mum, COL.dad, COL.mum, COL.dad];
                const ys = [-30, 26, -22, 34];
                xs.forEach((dx, i) => {
                    s += drawChromosome(mid + dx, midY + ys[i], i < 2, cols[i], sisters, cross, i % 2 === 1);
                });
            }
        } else {
            const n = stage.cells;
            const cw = n === 2 ? 200 : 128, ch = n === 2 ? 170 : 130;
            const gap = n === 2 ? 40 : 18;
            const totalW = n * cw + (n - 1) * gap;
            const x0 = (W - totalW) / 2, cy = 30;
            for (let i = 0; i < n; i++) {
                const cx = x0 + i * (cw + gap);
                s += cellBox(cx, cy, cw, ch, stage.final && isMeiosis ? 'gamete ' + (i + 1) :
                    stage.final ? 'daughter ' + (i + 1) : 'cell ' + (i + 1));
                const mid = cx + cw / 2, midY = cy + ch / 2;
                const sisters = stage.chromatids / stage.chroms >= 2 ? 2 : 1;
                if (isMeiosis) {
                    if (stage.plate === 'single') {
                        s += drawChromosome(mid - 22, midY, true, i === 0 ? COL.mum : COL.dad, sisters, cross, i === 1);
                        s += drawChromosome(mid + 22, midY, false, i === 0 ? COL.dad : COL.mum, sisters, cross, i === 1);
                        s += plateLine(mid, cy, ch, false);
                    } else {
                        const pal = [[COL.mum, COL.dad], [COL.dad, COL.mum],
                                     [COL.mum, COL.dad], [COL.dad, COL.mum]][i];
                        s += drawChromosome(mid - 22, midY - 8, true, pal[0], sisters, cross, i % 2 === 1);
                        s += drawChromosome(mid + 22, midY + 12, false, pal[1], sisters, cross, i % 2 === 0);
                    }
                } else {
                    const xs = [-48, -16, 16, 48];
                    const cols = [COL.mum, COL.dad, COL.mum, COL.dad];
                    xs.forEach((dx, j) => {
                        s += drawChromosome(mid + dx, midY + (j % 2 ? 18 : -14), j < 2, cols[j], sisters, false, false);
                    });
                }
            }
        }
        s += '</svg>';
        return s;
    }
    function poleFibres(mid, midY) {
        return '<line x1="' + (mid - 30) + '" y1="' + midY + '" x2="' + (mid + 30) + '" y2="' + midY +
            '" stroke="var(--text-secondary)" stroke-width="1" opacity="0.4"/>';
    }
    function plateLine(mid, cy, ch, wide) {
        return '<line x1="' + mid + '" y1="' + (cy + 12) + '" x2="' + mid + '" y2="' + (cy + ch - 12) +
            '" stroke="var(--text-secondary)" stroke-width="1" stroke-dasharray="4 4" opacity="' +
            (wide ? 0.55 : 0.45) + '"/>';
    }
    function crossMark(x, y) {
        return '<circle cx="' + x + '" cy="' + (y - 12) + '" r="7" fill="none" ' +
            'stroke="var(--text)" stroke-width="1.4" opacity="0.75"/>' +
            '<text x="' + (x + 13) + '" y="' + (y - 8) + '" font-size="9.5" ' +
            'fill="var(--text-secondary)">crossover</text>';
    }

    window.SIMS['u4-meiosis-walkthrough'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'mw');
        root.appendChild(wrap);

        let mode = 'meiosis';
        let i = 0;
        let answered = {};           // stageId -> {chroms:bool, chromatids:bool}
        let tried = { chroms: [], chromatids: [] };
        let msgText = null;

        const steps = () => mode === 'meiosis' ? MEIOSIS : MITOSIS;
        const stage = () => steps()[i];
        const done = () => {
            const a = answered[mode + ':' + stage().id];
            return a && a.chroms && a.chromatids;
        };

        function draw() {
            wrap.innerHTML = '';

            const tabs = U.el('div', 'mw-tabs');
            [['meiosis', 'Meiosis — two divisions'], ['mitosis', 'Mitosis — for comparison']]
                .forEach(([k, label]) => {
                    const b = U.el('button', 'mw-tab');
                    b.type = 'button'; b.textContent = label;
                    b.setAttribute('aria-pressed', mode === k ? 'true' : 'false');
                    b.addEventListener('click', () => {
                        mode = k; i = 0; tried = { chroms: [], chromatids: [] }; msgText = null; draw();
                    });
                    tabs.appendChild(b);
                });
            wrap.appendChild(tabs);

            const st = stage();
            const sn = U.el('p', 'mw-step');
            sn.textContent = 'Step ' + (i + 1) + ' of ' + steps().length +
                (mode === 'meiosis' ? (i >= 6 ? ' · meiosis II' : i >= 2 ? ' · meiosis I' : ' · interphase') : '');
            wrap.appendChild(sn);
            const nm = U.el('p', 'mw-name'); nm.textContent = st.name; wrap.appendChild(nm);

            const stageBox = U.el('div', 'mw-stage');
            stageBox.innerHTML = render(st, mode === 'meiosis');
            wrap.appendChild(stageBox);

            if (done()) {
                const counts = U.el('div', 'mw-counts');
                counts.innerHTML =
                    '<div class="mw-c"><small>Cells</small><b>' + st.cells + '</b></div>' +
                    '<div class="mw-c"><small>Chromosomes' + (st.per ? ' per cell' : '') +
                        '</small><b>' + st.chroms + '</b></div>' +
                    '<div class="mw-c"><small>Chromatids' + (st.per ? ' per cell' : '') +
                        '</small><b>' + st.chromatids + '</b></div>' +
                    '<div class="mw-c"><small>Ploidy</small><b>' + st.ploidy + '</b></div>';
                wrap.appendChild(counts);

                const say = U.el('div', 'mw-say');
                say.innerHTML = st.say;
                wrap.appendChild(say);
            } else {
                askCounts();
            }

            const msg = U.el('p', 'mw-msg' + (msgText ? ' ' + msgText.cls : ''));
            msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
            if (msgText) msg.innerHTML = msgText.html;
            wrap.appendChild(msg);

            const track = U.el('div', 'mw-track');
            steps().forEach((s, k) => {
                const d = U.el('i', 'mw-dot' + (k === i ? ' here' : k < i ? ' done' : ''));
                track.appendChild(d);
            });
            wrap.appendChild(track);

            const btns = U.el('div', 'sim-buttons');
            const back = U.button(btns, '‹ Back');
            back.disabled = i === 0;
            back.addEventListener('click', () => {
                i = Math.max(0, i - 1); tried = { chroms: [], chromatids: [] }; msgText = null; draw();
            });
            const next = U.button(btns, i === steps().length - 1 ? 'Start again' : 'Next stage ›');
            next.disabled = !done();
            next.addEventListener('click', () => {
                i = i === steps().length - 1 ? 0 : i + 1;
                tried = { chroms: [], chromatids: [] }; msgText = null; draw();
            });
            wrap.appendChild(btns);
        }

        function askCounts() {
            const st = stage();
            const key = mode + ':' + st.id;
            answered[key] = answered[key] || { chroms: false, chromatids: false };
            const a = answered[key];

            [['chroms', 'chromosomes'], ['chromatids', 'chromatids']].forEach(([field, word]) => {
                if (a[field]) return;
                if (field === 'chromatids' && !a.chroms) return;   // one at a time
                const q = U.el('p', 'mw-q');
                q.innerHTML = 'How many <b>' + word + '</b> are ' +
                    (st.per ? 'in <em>each</em> cell' : 'in this cell') + ' at this stage?';
                wrap.appendChild(q);
                const opts = U.el('div', 'mw-opts');
                [1, 2, 3, 4, 6, 8, 16].forEach(n => {
                    const b = U.el('button', 'mw-opt' + (tried[field].indexOf(n) > -1 ? ' wrong' : ''));
                    b.type = 'button'; b.textContent = n;
                    b.addEventListener('click', () => {
                        if (n === st[field]) {
                            a[field] = true;
                            msgText = { cls: 'ok', html: 'Correct — ' + n + ' ' + word + '.' };
                        } else {
                            tried[field].push(n);
                            msgText = { cls: 'bad', html: hint(field, st, n) };
                        }
                        draw();
                    });
                    opts.appendChild(b);
                });
                wrap.appendChild(opts);
            });
        }

        function hint(field, st, guess) {
            if (field === 'chroms') {
                if (st.id === 's')
                    return 'No. Copying the DNA does <em>not</em> change the chromosome number. ' +
                        'Count the <b>centromeres</b> in the picture — each one is one chromosome, ' +
                        'however many chromatids hang off it.';
                if (st.id === 't1')
                    return 'No. Each cell got one chromosome from each homologous pair, and there ' +
                        'were two pairs. Count the centromeres in one cell.';
                if (st.split === 'sister')
                    return 'Look carefully: the sister chromatids have just come apart, and each one ' +
                        'now has its own centromere. Separating sisters <em>doubles</em> the ' +
                        'chromosome count for as long as the cell stays undivided.';
                return 'Not quite. One centromere = one chromosome. Count them in the picture.';
            }
            if (st.chromatids === st.chroms)
                return 'No. Each chromosome here is a <em>single</em> chromatid — nothing has been ' +
                    'copied, or the copies have already been pulled apart. So the chromatid count ' +
                    'equals the chromosome count.';
            return 'No. Each chromosome here is <b>two</b> sister chromatids joined at the ' +
                'centromere, so the chromatid count is double the chromosome count. You said ' +
                guess + '; you have ' + st.chroms + ' chromosomes.';
        }

        draw();

        root._simState = () => {
            const st = stage();
            return {
                mode, step: i, of: steps().length, stage: st.id, stageName: st.name,
                cells: st.cells, chromosomes: st.chroms, chromatids: st.chromatids,
                ploidy: st.ploidy, answered: !!done(),
                allStages: steps().map(s => ({ id: s.id, cells: s.cells,
                    chromosomes: s.chroms, chromatids: s.chromatids, ploidy: s.ploidy }))
            };
        };
        root._simSolve = () => {
            steps().forEach(s => { answered[mode + ':' + s.id] = { chroms: true, chromatids: true }; });
            i = steps().length - 1; msgText = null; draw();
        };
    };
})();
