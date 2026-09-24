/* =============================================================
   INTERACTIVE — Nondisjunction builder
   -------------------------------------------------------------
   Registers window.SIMS['u4-nondisjunction'].  Supports HS-LS3-2.

   The reader chooses which chromosome fails to separate and at
   which division, PREDICTS the four gametes, then fertilises one
   of them with a normal gamete and reads the resulting karyotype.

   Every count is derived, not looked up. The gamete chromosome
   totals come from 22 unaffected autosome pairs plus whatever the
   chosen pair does, and the zygote total is that gamete plus a
   normal 23. So the two signatures the reader has to be able to
   tell apart fall out of the model:

     failure at meiosis I   -> 24, 24, 22, 22
     failure at meiosis II  -> 24, 22, 23, 23

   Conditions are named from the resulting karyotype, not stored
   against the choice, so the naming cannot drift from the biology.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u4nd-style';

    const COL = { mum: 'hsl(340 62% 48%)', dad: 'hsl(205 62% 45%)' };

    const PAIRS = [
        { k: '21', label: 'Chromosome 21', kind: 'autosome',
          note: 'The smallest human autosome, and the one carrying the fewest genes — which is ' +
                'why an extra copy of it is survivable when an extra copy of most chromosomes is not.' },
        { k: '18', label: 'Chromosome 18', kind: 'autosome',
          note: 'A larger autosome carrying many more genes, so an extra copy disrupts far more.' },
        { k: '13', label: 'Chromosome 13', kind: 'autosome',
          note: 'Larger again. The pattern across 21, 18 and 13 is not a coincidence.' },
        { k: 'X',  label: 'The sex chromosomes', kind: 'sex',
          note: 'The sex chromosomes behave differently from autosomes, because a cell can ' +
                'switch off spare X chromosomes and because the Y carries very few genes.' }
    ];

    /* Gamete composition for the chosen pair, per division that fails.

       At meiosis II only ONE of the two cells goes wrong, and which one it is
       matters for the sex chromosomes: if the Y-bearing cell is the one that
       fails, the outcomes are XYY and X0 rather than XXX and X0. `which` says
       which of the two cells fails, so the copy counts and the chromosome
       labels can never disagree. */
    function gametes(fail, which) {
        if (fail === 'none') return [1, 1, 1, 1];
        if (fail === 'I')    return [2, 2, 0, 0];
        return which === 1 ? [1, 1, 2, 0] : [2, 0, 1, 1];
    }
    const sameShape = (a, b) =>
        a.slice().sort().join(',') === b.slice().sort().join(',');
    const totalFor = copies => 22 + copies;        // 22 unaffected pairs contribute 22

    /* Name a zygote from its karyotype rather than from the choice made. */
    function nameZygote(pair, copies) {
        const total = 46 + (copies - 1);
        if (pair.kind === 'autosome') {
            if (copies === 1) return { n: total, title: 'Typical karyotype', sub: '46 chromosomes',
                text: 'Two copies of chromosome ' + pair.k + ', like every other pair.',
                ok: true };
            if (copies === 2) return {
                n: total, title: 'Trisomy ' + pair.k, sub: '47 chromosomes',
                text: pair.k === '21' ? 'Three copies of chromosome 21. This is <b>Down syndrome</b>, ' +
                        'the most common chromosomal condition compatible with life, occurring in ' +
                        'roughly 1 in 700 births.'
                    : pair.k === '18' ? 'Three copies of chromosome 18 — <b>Edwards syndrome</b>. ' +
                        'Far more genes are disrupted than in trisomy 21, and most affected ' +
                        'pregnancies do not reach term.'
                    : 'Three copies of chromosome 13 — <b>Patau syndrome</b>, with severe effects ' +
                        'for the same reason: chromosome 13 carries many more genes than 21.',
                ok: false };
            return { n: total, title: 'Monosomy ' + pair.k, sub: '45 chromosomes',
                text: 'Only one copy of chromosome ' + pair.k + '. Autosomal monosomy means a whole ' +
                    'set of genes is present in half the normal dose, and no autosomal monosomy is ' +
                    'survivable in humans — these pregnancies end very early, usually before anyone ' +
                    'knows about them.',
                ok: false };
        }
        return null;   // sex chromosomes are handled separately, because identity matters
    }

    /* Sex-chromosome outcomes depend on WHICH chromosomes, not just how many. */
    function sexOutcome(gam, other) {
        const combined = (gam + other).split('').sort().join('');
        const map = {
            'XX': { title: 'XX', sub: '46 chromosomes', ok: true,
                text: 'A typical female karyotype: 46,XX.' },
            'XY': { title: 'XY', sub: '46 chromosomes', ok: true,
                text: 'A typical male karyotype: 46,XY.' },
            'XXY': { title: 'XXY — Klinefelter syndrome', sub: '47 chromosomes', ok: false,
                text: 'An extra X alongside a Y. Development is male, because the Y carries the ' +
                    'SRY gene that starts it. Effects are usually mild and often only noticed ' +
                    'during fertility investigations.' },
            'X': { title: 'X0 — Turner syndrome', sub: '45 chromosomes', ok: false,
                text: 'A single X and no second sex chromosome. Development is female. This is the ' +
                    'only monosomy in humans that is survivable at all, and it is survivable ' +
                    'because a cell normally switches off its spare X anyway.' },
            'XXX': { title: 'XXX — Triple X', sub: '47 chromosomes', ok: false,
                text: 'Three X chromosomes. Spare X chromosomes are largely switched off, so many ' +
                    'people with this karyotype never find out they have it.' },
            'XYY': { title: 'XYY', sub: '47 chromosomes', ok: false,
                text: 'An extra Y, which can only come from a failure at meiosis II in sperm ' +
                    'formation — meiosis I separates X from Y, so two Y chromosomes can only end ' +
                    'up together after the sisters fail to part.' },
            'YY': { title: 'YY', sub: 'not viable', ok: false,
                text: 'No X chromosome at all. The X carries around 800 genes that a cell cannot do ' +
                    'without, so this combination never develops.' },
            'Y': { title: 'Y0', sub: 'not viable', ok: false,
                text: 'A Y with no X. Not survivable, for the same reason as YY.' },
            '': { title: 'No sex chromosome', sub: 'not viable', ok: false,
                text: 'A zygote with no sex chromosome at all cannot develop.' }
        };
        return map[combined] || { title: combined, sub: combined.length + ' sex chromosomes', ok: false,
            text: 'An unusual combination of sex chromosomes.' };
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.nd { padding:1rem 1.25rem 1.25rem; }',
            '.nd { --nd-ok:#2e7d32; --nd-bad:#aa272f; }',
            '[data-theme="dark"] .nd { --nd-ok:#7fc98a; --nd-bad:#e08a90; }',
            '[data-theme="sepia"] .nd { --nd-ok:#4a6b3d; --nd-bad:#a04040; }',
            '.nd-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.9rem; line-height:1.55; }',
            '.nd-setup { display:flex; gap:0.9rem; flex-wrap:wrap; margin-bottom:0.9rem; }',
            '.nd-field { display:flex; flex-direction:column; gap:0.25rem; }',
            '.nd-field label { font-size:0.62rem; font-weight:800; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); }',
            '.nd-field select { font:inherit; font-size:0.82rem; padding:0.32rem 0.5rem;',
            '   border:1px solid var(--border); border-radius:7px; background:var(--bg); color:var(--text); }',
            '.nd-note { font-size:0.78rem; color:var(--text-secondary); line-height:1.55;',
            '   margin:0 0 0.9rem; }',
            '.nd-stage { border:1px solid var(--border); border-radius:11px; background:var(--bg);',
            '   padding:0.5rem; overflow-x:auto; }',
            '.nd-stage svg { display:block; width:100%; min-width:420px; height:auto; }',
            '.nd-q { font-size:0.85rem; font-weight:600; margin:1rem 0 0.45rem; }',
            '.nd-opts { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.5rem; }',
            '.nd-opt { font:inherit; font-size:0.82rem; font-weight:700; cursor:pointer;',
            '   padding:0.42rem 0.7rem; border:1px solid var(--border); border-radius:8px;',
            '   background:var(--bg); color:var(--text); touch-action:manipulation;',
            '   font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }',
            '.nd-opt:hover { border-color:var(--light-teal); }',
            '.nd-opt.right { border-color:var(--nd-ok); color:var(--nd-ok); }',
            '.nd-opt.wrong { border-color:var(--nd-bad); color:var(--nd-bad); opacity:0.55; }',
            '.nd-gams { display:grid; gap:0.5rem; margin:0.85rem 0 0;',
            '   grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); }',
            '.nd-gam { border:1px solid var(--border); border-radius:9px; padding:0.55rem 0.6rem;',
            '   background:var(--bg); cursor:pointer; font:inherit; color:var(--text); text-align:center;',
            '   touch-action:manipulation; }',
            '.nd-gam:hover { border-color:var(--light-teal); }',
            '.nd-gam[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); }',
            '.nd-gam b { display:block; font-size:1.3rem; line-height:1.2; }',
            '.nd-gam small { display:block; font-size:0.64rem; color:var(--text-secondary);',
            '   letter-spacing:0.04em; text-transform:uppercase; font-weight:700; margin-top:0.15rem; }',
            '.nd-gam.abn b { color:var(--nd-bad); }',
            '.nd-msg { font-size:0.83rem; line-height:1.6; margin:0.6rem 0 0; min-height:2.4em; }',
            '.nd-msg.ok { color:var(--nd-ok); } .nd-msg.bad { color:var(--nd-bad); }',
            '.nd-msg b { color:var(--text); }',
            '.nd-out { margin-top:0.95rem; border:1px solid var(--border); border-left:4px solid var(--light-teal);',
            '   border-radius:9px; background:var(--bg-surface); padding:0.8rem 0.95rem; }',
            '.nd-out.bad { border-left-color:var(--nd-bad); }',
            '.nd-out h5 { margin:0 0 0.1rem; font-size:0.95rem; }',
            '.nd-out .nd-sub { font-size:0.7rem; font-weight:800; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.5rem; }',
            '.nd-out p { margin:0 0 0.55rem; font-size:0.84rem; line-height:1.6; }',
            '.nd-out p:last-child { margin-bottom:0; }',
            '.nd-sig { width:100%; border-collapse:collapse; margin-top:0.9rem; font-size:0.8rem; }',
            '.nd-sig th, .nd-sig td { border-bottom:1px solid var(--border); padding:0.32rem 0.45rem;',
            '   text-align:center; }',
            '.nd-sig th:first-child, .nd-sig td:first-child { text-align:left; }',
            '.nd-sig thead th { font-size:0.64rem; text-transform:uppercase; letter-spacing:0.05em;',
            '   color:var(--text-secondary); }',
            '.nd-sig tr.now { background:var(--bg-nav-active); }',
            '.nd-sig code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u4-nondisjunction'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'nd');
        root.appendChild(wrap);

        let pair = PAIRS[0];
        let parent = 'sperm';
        let fail = 'I';
        let predicted = false, tried = [];
        let chosen = null;
        let msgText = null;

        const patternKey = () => gam().join(',');

        /* Sex-chromosome identity per gamete. Sperm formation starts XY,
           egg formation starts XX — which is why the two do not produce the
           same set of outcomes. At anaphase II only ONE of the two cells
           fails, so for sperm we follow the case where the Y-bearing cell
           is the one that goes wrong. */
        /* Which of the two cells fails at meiosis II. For sperm we follow the
           Y-bearing cell, because that is the only route to an XYY gamete and
           it is the case worth showing. */
        const failingCell = () => (pair.kind === 'sex' && parent === 'sperm') ? 1 : 0;
        const gam = () => gametes(fail, failingCell());

        function sexLabels() {
            if (pair.kind !== 'sex') return null;
            if (parent === 'sperm') {
                if (fail === 'none') return ['X', 'X', 'Y', 'Y'];
                if (fail === 'I')    return ['XY', 'XY', '', ''];
                return ['X', 'X', 'YY', ''];
            }
            if (fail === 'none') return ['X', 'X', 'X', 'X'];
            if (fail === 'I')    return ['XX', 'XX', '', ''];
            return ['XX', '', 'X', 'X'];
        }
        const partners = () => parent === 'sperm' ? ['X'] : ['X', 'Y'];

        function stageSVG() {
            const W = 660, H = 250;
            const g = gam();
            let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" ' +
                'aria-label="Meiosis of one cell, following ' + pair.label.toLowerCase() +
                '. Failure at ' + (fail === 'none' ? 'no division' : 'meiosis ' + fail) +
                '. The four gametes end up with ' + g.join(', ') + ' copies of that chromosome.">';

            // parent cell
            s += cell(W / 2, 34, 30, '');
            s += chrom(W / 2 - 10, 34, COL.mum, 2);
            s += chrom(W / 2 + 10, 34, COL.dad, 2);
            s += label(W / 2, 8, 'one cell, 2n');

            // after meiosis I
            const iX = [W / 2 - 150, W / 2 + 150];
            iX.forEach((x, k) => {
                s += arrow(W / 2, 64, x, 96);
                s += cell(x, 118, 28, '');
                if (fail === 'I') {
                    if (k === 0) { s += chrom(x - 10, 118, COL.mum, 2); s += chrom(x + 10, 118, COL.dad, 2); }
                } else {
                    s += chrom(x, 118, k === 0 ? COL.mum : COL.dad, 2);
                }
                s += label(x, 92, k === 0 ? 'after meiosis I' : '');
            });

            // gametes
            const gx = [W / 2 - 225, W / 2 - 75, W / 2 + 75, W / 2 + 225];
            g.forEach((copies, k) => {
                const src = k < 2 ? iX[0] : iX[1];
                s += arrow(src, 146, gx[k], 178);
                const abn = copies !== 1;
                s += cell(gx[k], 200, 24, abn ? 'bad' : '');
                const col = k < 2 ? COL.mum : COL.dad;
                if (copies === 2) {
                    if (fail === 'I') { s += chrom(gx[k] - 8, 200, COL.mum, 1); s += chrom(gx[k] + 8, 200, COL.dad, 1); }
                    else { s += chrom(gx[k] - 8, 200, col, 1); s += chrom(gx[k] + 8, 200, col, 1); }
                } else if (copies === 1) {
                    s += chrom(gx[k], 200, col, 1);
                }
                s += '<text x="' + gx[k] + '" y="' + 238 + '" text-anchor="middle" font-size="11" ' +
                     'fill="' + (abn ? 'var(--nd-bad-svg, #aa272f)' : 'var(--text-secondary)') + '">' +
                     totalFor(copies) + ' chromosomes</text>';
            });
            s += '</svg>';
            return s;
        }
        function cell(cx, cy, r, cls) {
            return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="var(--bg-surface)" ' +
                'stroke="' + (cls === 'bad' ? '#aa272f' : 'var(--text-secondary)') + '" stroke-width="' +
                (cls === 'bad' ? 2 : 1.4) + '"/>';
        }
        function chrom(cx, cy, col, sisters) {
            const len = 20, w = 5;
            let s = '';
            if (sisters === 2) {
                s += '<rect x="' + (cx - 4.5) + '" y="' + (cy - len / 2) + '" width="' + w +
                     '" height="' + len + '" rx="2.5" fill="' + col + '"/>';
                s += '<rect x="' + (cx - 0.5) + '" y="' + (cy - len / 2) + '" width="' + w +
                     '" height="' + len + '" rx="2.5" fill="' + col + '"/>';
                s += '<circle cx="' + cx + '" cy="' + cy + '" r="2.4" fill="var(--bg-surface)" ' +
                     'stroke="' + col + '" stroke-width="1.2"/>';
            } else {
                s += '<rect x="' + (cx - w / 2) + '" y="' + (cy - len / 2) + '" width="' + w +
                     '" height="' + len + '" rx="2.5" fill="' + col + '"/>';
            }
            return s;
        }
        function arrow(x1, y1, x2, y2) {
            return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
                '" stroke="var(--text-secondary)" stroke-width="1.1" opacity="0.6"/>';
        }
        function label(x, y, t) {
            return t ? '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="10.5" ' +
                'fill="var(--text-secondary)">' + t + '</text>' : '';
        }

        function render() {
            wrap.innerHTML = '';

            const how = U.el('p', 'nd-how');
            how.innerHTML = 'Meiosis normally separates chromosomes cleanly. <b>Nondisjunction</b> is ' +
                'the failure to separate — a pair that stays together at anaphase I, or a pair of ' +
                'sister chromatids that stays together at anaphase II. Choose what fails, work out ' +
                'the four gametes, then fertilise one.';
            wrap.appendChild(how);

            const setup = U.el('div', 'nd-setup');
            setup.appendChild(field('Chromosome involved', PAIRS.map(p => ({ v: p.k, t: p.label })),
                pair.k, v => {
                    pair = PAIRS.filter(p => p.k === v)[0];
                    predicted = false; tried = []; chosen = null; msgText = null; render();
                }));
            if (pair.kind === 'sex') {
                setup.appendChild(field('Whose meiosis fails',
                    [{ v: 'sperm', t: 'Sperm formation (starts XY)' },
                     { v: 'egg', t: 'Egg formation (starts XX)' }],
                    parent, v => {
                        parent = v; predicted = false; tried = []; chosen = null; msgText = null; render();
                    }));
            }
            setup.appendChild(field('Where it fails',
                [{ v: 'none', t: 'Nothing fails — normal meiosis' },
                 { v: 'I', t: 'Anaphase I — the pair fails to separate' },
                 { v: 'II', t: 'Anaphase II — the sisters fail to separate' }],
                fail, v => { fail = v; predicted = false; tried = []; chosen = null; msgText = null; render(); }));
            wrap.appendChild(setup);

            const note = U.el('p', 'nd-note');
            note.textContent = pair.note;
            wrap.appendChild(note);

            if (!predicted && fail !== 'none') { askPattern(); }
            else {
                const stage = U.el('div', 'nd-stage');
                stage.innerHTML = stageSVG();
                wrap.appendChild(stage);
                showGametes();
            }

            const msg = U.el('p', 'nd-msg' + (msgText ? ' ' + msgText.cls : ''));
            msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
            if (msgText) msg.innerHTML = msgText.html;
            wrap.appendChild(msg);

            if (chosen !== null) wrap.appendChild(zygoteBox());
            if (predicted || fail === 'none') wrap.appendChild(signatureTable());
        }

        function field(labelText, opts, value, onChange) {
            const f = U.el('div', 'nd-field');
            const l = document.createElement('label'); l.textContent = labelText;
            const sel = document.createElement('select');
            opts.forEach(o => {
                const op = document.createElement('option');
                op.value = o.v; op.textContent = o.t;
                if (o.v === value) op.selected = true;
                sel.appendChild(op);
            });
            sel.addEventListener('change', () => onChange(sel.value));
            f.appendChild(l); f.appendChild(sel);
            return f;
        }

        function askPattern() {
            const q = U.el('p', 'nd-q');
            q.innerHTML = 'Predict first. If ' + (fail === 'I'
                ? 'the homologous pair fails to separate at <b>anaphase I</b>'
                : 'the sister chromatids fail to separate at <b>anaphase II</b>') +
                ', how many copies of that chromosome do the four gametes end up with?';
            wrap.appendChild(q);
            const opts = U.el('div', 'nd-opts');
            [[2, 2, 0, 0], [2, 0, 1, 1], [1, 1, 1, 1], [2, 2, 2, 2], [0, 0, 2, 2]].forEach(p => {
                const key = p.join(',');
                const b = U.el('button', 'nd-opt' + (tried.indexOf(key) > -1 ? ' wrong' : ''));
                b.type = 'button'; b.textContent = p.join(' · ');
                b.addEventListener('click', () => {
                    if (sameShape(p, gam())) {
                        predicted = true;
                        msgText = { cls: 'ok', html: 'Correct. Now look at the diagram and see why.' };
                    } else {
                        tried.push(key);
                        msgText = { cls: 'bad', html: fail === 'I'
                            ? 'Not that one. At anaphase I, <em>both</em> daughter cells are affected: ' +
                              'one gets the whole pair, the other gets neither. Then meiosis II divides ' +
                              'each of them normally, so <em>all four</em> gametes are abnormal.'
                            : 'Not that one. At anaphase II only <em>one</em> of the two cells is ' +
                              'affected — the other completes meiosis II normally. So two gametes are ' +
                              'normal and two are not.' };
                    }
                    render();
                });
                opts.appendChild(b);
            });
            wrap.appendChild(opts);
        }

        function showGametes() {
            const g = gam();
            const sx = sexLabels();
            const q = U.el('p', 'nd-q');
            q.innerHTML = 'Now fertilise. Pick one gamete and combine it with a normal gamete ' +
                'from the other parent.';
            wrap.appendChild(q);
            const grid = U.el('div', 'nd-gams');
            g.forEach((copies, k) => {
                const b = U.el('button', 'nd-gam' + (copies !== 1 ? ' abn' : ''));
                b.type = 'button';
                b.setAttribute('aria-pressed', chosen === k ? 'true' : 'false');
                const sexTxt = sx ? (sx[k] === '' ? 'none' : sx[k]) : '';
                b.innerHTML = '<b>' + totalFor(copies) + '</b><small>gamete ' + (k + 1) +
                    (sexTxt ? ' · ' + sexTxt : '') + '</small>';
                b.addEventListener('click', () => { chosen = k; msgText = null; render(); });
                grid.appendChild(b);
            });
            wrap.appendChild(grid);
        }

        function zygoteBox() {
            const g = gam();
            const copies = g[chosen];
            const sx = sexLabels();
            const box = U.el('div');

            if (pair.kind !== 'sex') {
                const res = nameZygote(pair, copies);
                box.appendChild(outCard(res,
                    'Your gamete carried <b>' + copies + '</b> cop' + (copies === 1 ? 'y' : 'ies') +
                    ' of chromosome ' + pair.k + ' plus 22 other chromosomes, so it had <b>' +
                    totalFor(copies) + '</b>. The normal gamete brought <b>23</b>. Total: <b>' +
                    (totalFor(copies) + 23) + '</b>.',
                    copies !== 1));
                return box;
            }

            const mine = sx[chosen];
            partners().forEach(other => {
                const res = sexOutcome(mine, other);
                const total = 44 + mine.length + 1;
                box.appendChild(outCard(res,
                    'Your ' + parent + ' carried <b>' + (mine || 'no sex chromosome') +
                    '</b> plus 22 autosomes, so it had <b>' + (22 + mine.length) + '</b> chromosomes. ' +
                    'It met ' + (parent === 'sperm' ? 'an egg' : 'a sperm') + ' carrying <b>' + other +
                    '</b>. Total: <b>' + total + '</b>.',
                    !res.ok, partners().length > 1
                        ? 'If it meets ' + (parent === 'sperm' ? 'an egg' : 'a ' + other + '-bearing sperm')
                        : ''));
            });
            if (partners().length > 1) {
                const p = U.el('p', 'nd-how');
                p.style.marginTop = '0.6rem';
                p.innerHTML = 'The same faulty egg gives two different outcomes depending on which ' +
                    'sperm reaches it. That is worth noticing: the nondisjunction fixed <em>how ' +
                    'many</em> sex chromosomes the zygote would get, but not <em>which</em>.';
                box.appendChild(p);
            }
            return box;
        }

        function outCard(res, arithmetic, bad, heading) {
            const d = U.el('div', 'nd-out' + (bad ? ' bad' : ''));
            let html = '';
            if (heading) html += '<p class="nd-sub">' + heading + '</p>';
            html += '<h5>' + res.title + '</h5><p class="nd-sub">' + res.sub + '</p>' +
                '<p>' + res.text + '</p><p>' + arithmetic + '</p>';
            if (bad) {
                html += '<p>Nothing was mutated here. Not one base of DNA was changed. The whole ' +
                    'condition comes from <em>how many copies</em> of a chromosome are present — ' +
                    'which is why this sits under the same standard as mutation, but is a completely ' +
                    'different kind of event.</p>';
            }
            d.innerHTML = html;
            return d;
        }

        function signatureTable() {
            const t = document.createElement('table');
            t.className = 'nd-sig';
            const rows = [
                ['Normal meiosis', 'none', gametes('none', failingCell())],
                ['Fails at anaphase I', 'I', gametes('I', failingCell())],
                ['Fails at anaphase II', 'II', gametes('II', failingCell())]
            ].map(([name, k, g]) =>
                '<tr class="' + (k === fail ? 'now' : '') + '"><td>' + name + '</td>' +
                g.map(c => '<td><code>' + totalFor(c) + '</code></td>').join('') +
                '<td>' + g.filter(c => c !== 1).length + ' of 4</td></tr>').join('');
            t.innerHTML = '<thead><tr><th>What happened</th><th>Gamete 1</th><th>Gamete 2</th>' +
                '<th>Gamete 3</th><th>Gamete 4</th><th>Abnormal</th></tr></thead><tbody>' +
                rows + '</tbody>';
            const box = U.el('div');
            box.appendChild(t);
            const p = U.el('p', 'nd-how');
            p.style.marginTop = '0.6rem';
            p.innerHTML = '<b>This table is how you tell the two apart in an exam.</b> A failure at ' +
                'anaphase I ruins <em>all four</em> gametes, because it happens before the cell has ' +
                'split in two. A failure at anaphase II ruins only <em>two</em>, because by then ' +
                'there are already two separate cells and only one of them goes wrong.';
            box.appendChild(p);
            return box;
        }

        render();

        root._simState = () => {
            const g = gam();
            const sx = sexLabels();
            return {
                pair: pair.k, kind: pair.kind, fail, predicted, chosen,
                gameteCopies: g,
                gameteTotals: g.map(totalFor),
                abnormalGametes: g.filter(c => c !== 1).length,
                parent,
                sexChromosomes: sx ? sx.slice() : null,
                zygoteTotal: chosen === null ? null
                    : (pair.kind === 'sex' ? 22 + sx[chosen].length + 23 : totalFor(g[chosen]) + 23)
            };
        };
        root._simSolve = () => {
            predicted = true; chosen = 0; msgText = null; render();
        };
    };
})();
