/* =============================================================
   INTERACTIVE — Dihybrid cross builder
   -------------------------------------------------------------
   Registers window.SIMS['dihybrid'].  Supports HS-LS3-3.

   Replaces an empty 4x4 grid screenshot and the copyrighted FOIL
   table. Two genes at once, tracked through one square.

   The reader derives the four gametes by FOIL themselves before any
   grid appears, because that is the step everyone gets wrong — a
   16-box grid is only arithmetic once the axes are right.

   Everything is computed from the parent genotypes, so the famous
   9:3:3:1 emerges from the cross rather than being asserted.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-dh-style';

    const TRAITS = {
        pea:    { A:{ letter:'T', dom:'tall',   rec:'dwarf'  }, B:{ letter:'G', dom:'green',  rec:'yellow' },
                  name:'Pea plant — height and pod colour' },
        rabbit: { A:{ letter:'W', dom:'white',  rec:'black'  }, B:{ letter:'E', dom:'long ears', rec:'short ears' },
                  name:'Rabbit — fur colour and ear length' },
        lab:    { A:{ letter:'B', dom:'black',  rec:'brown'  }, B:{ letter:'E', dom:'pigment', rec:'yellow (no pigment)' },
                  name:'Labrador — coat colour' }
    };

    const genotypesFor = t => {
        const out = [];
        [t.A.letter + t.A.letter, t.A.letter + t.A.letter.toLowerCase(),
         t.A.letter.toLowerCase() + t.A.letter.toLowerCase()].forEach(a => {
            [t.B.letter + t.B.letter, t.B.letter + t.B.letter.toLowerCase(),
             t.B.letter.toLowerCase() + t.B.letter.toLowerCase()].forEach(b => out.push(a + b));
        });
        return out;
    };
    // FOIL: first, outside, inside, last
    const gametesOf = g => {
        const a1 = g[0], a2 = g[1], b1 = g[2], b2 = g[3];
        return [a1 + b1, a1 + b2, a2 + b1, a2 + b2];
    };
    const FOIL_LABELS = ['First', 'Outside', 'Inside', 'Last'];

    const sortPair = (dom, x, y) => (x === dom ? -1 : 1) - (y === dom ? -1 : 1) <= 0 ? x + y : y + x;
    function combine(t, ga, gb) {
        const a = sortPair(t.A.letter, ga[0], gb[0]);
        const b = sortPair(t.B.letter, ga[1], gb[1]);
        return a + b;
    }
    function pheno(t, g) {
        const aDom = g.slice(0, 2).indexOf(t.A.letter) > -1;
        const bDom = g.slice(2, 4).indexOf(t.B.letter) > -1;
        return (aDom ? t.A.dom : t.A.rec) + ', ' + (bDom ? t.B.dom : t.B.rec);
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.dh { padding:1rem 1.25rem 0.25rem; }',
            '.dh { --dh-ok:#2e7d32; --dh-bad:#aa272f; }',
            '[data-theme="dark"] .dh { --dh-ok:#7fc98a; --dh-bad:#e08a90; }',
            '[data-theme="sepia"] .dh { --dh-ok:#4a6b3d; --dh-bad:#a04040; }',
            '.dh-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; }',
            '.dh-step { font-size:0.62rem; font-weight:700; letter-spacing:0.09em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0.2rem 0 0.4rem; }',
            '.dh-setup { display:flex; gap:0.8rem; flex-wrap:wrap; align-items:flex-end; margin-bottom:1rem; }',
            '.dh-field { display:flex; flex-direction:column; gap:0.2rem; }',
            '.dh-field label { font-size:0.64rem; font-weight:700; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); }',
            '.dh-field select { font:inherit; font-size:0.82rem; padding:0.32rem 0.5rem;',
            '   border:1px solid var(--border); border-radius:7px; background:var(--bg); color:var(--text); }',
            '.dh-foil { border:1px solid var(--border); border-radius:10px; padding:0.7rem 0.85rem;',
            '   margin-bottom:1rem; }',
            '.dh-foil p { font-size:0.82rem; margin:0 0 0.55rem; }',
            '.dh-foilrow { display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center; margin-bottom:0.4rem; }',
            '.dh-foilrow b { font-size:0.7rem; letter-spacing:0.05em; text-transform:uppercase;',
            '   color:var(--text-secondary); min-width:62px; }',
            '.dh-slot { min-width:56px; height:34px; font:inherit; font-weight:800; font-size:0.88rem;',
            '   border:1.5px dashed var(--border); border-radius:7px; background:transparent;',
            '   color:var(--text-secondary); cursor:pointer; touch-action:manipulation; }',
            '.dh-slot.right { border-style:solid; border-color:var(--dh-ok); color:var(--dh-ok); }',
            '.dh-slot.wrong { border-style:solid; border-color:var(--dh-bad); color:var(--dh-bad); }',
            '.dh-pick { display:flex; gap:0.35rem; flex-wrap:wrap; margin-top:0.5rem; }',
            '.dh-tile { font:inherit; cursor:pointer; padding:0.34rem 0.6rem; border-radius:7px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text);',
            '   font-weight:800; font-size:0.85rem; touch-action:manipulation; }',
            '.dh-tile:hover { border-color:var(--light-teal); }',
            '.dh-tile[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.dh-wrap { overflow-x:auto; }',
            '.dh-grid { border-collapse:collapse; font-size:0.72rem; }',
            '.dh-grid th, .dh-grid td { border:1px solid var(--border); text-align:center; }',
            '.dh-grid th { background:var(--bg-nav-active); color:var(--text); font-weight:800;',
            '   min-width:62px; height:34px; font-size:0.8rem; }',
            '.dh-grid th.corner { background:none; border:0; }',
            '.dh-grid td { min-width:62px; height:44px; padding:0.2rem; }',
            '.dh-g { font-weight:800; font-size:0.78rem; display:block; letter-spacing:0.03em; }',
            '.dh-p { font-size:0.56rem; color:var(--text-secondary); display:block; margin-top:0.1rem; }',
            '.dh-out { margin-top:1rem; border:1px solid var(--dh-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .dh-out { background:rgba(127,201,138,0.12); }',
            '.dh-out h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.dh-out p { margin:0 0 0.55rem; font-size:0.84rem; line-height:1.55; }',
            '.dh-out table { width:100%; border-collapse:collapse; font-size:0.78rem; margin-top:0.4rem; }',
            '.dh-out th, .dh-out td { border:1px solid var(--border); padding:0.28rem 0.45rem; text-align:left; }',
            '.dh-msg { margin:0.8rem 0 0; font-size:0.82rem; line-height:1.5; min-height:2.4em; }',
            '.dh-msg.ok { color:var(--dh-ok); } .dh-msg.bad { color:var(--dh-bad); }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['dihybrid'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'dh');
        const how = U.el('p', 'dh-how');
        how.textContent = 'Two genes, tracked at once. First work out which four gametes each parent ' +
            'can make — that is the step the grid depends on — then the square builds itself.';
        const setup = U.el('div', 'dh-setup');
        const foilHost = U.el('div');
        const gridHost = U.el('div', 'dh-wrap');
        const msg = U.el('p', 'dh-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const outHost = U.el('div');
        [how, setup, foilHost, gridHost, msg, outHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        let key = 'pea';
        let p1 = 'TtGg', p2 = 'TtGg';
        let foil = [null, null, null, null];
        let sel = null;

        const T = () => TRAITS[key];
        const wantFoil = () => gametesOf(p1);
        const foilDone = () => foil.every((f, i) => f === wantFoil()[i]);

        function resetFoil() { foil = [null, null, null, null]; sel = null; msg.textContent = ''; msg.className = 'dh-msg'; }

        function field(labelText, opts, value, onChange, render) {
            const f = U.el('div', 'dh-field');
            const l = document.createElement('label'); l.textContent = labelText;
            const s = document.createElement('select');
            opts.forEach(o => {
                const op = document.createElement('option');
                op.value = o; op.textContent = o;
                if (o === value) op.selected = true;
                s.appendChild(op);
            });
            s.addEventListener('change', () => onChange(s.value));
            f.appendChild(l); f.appendChild(s);
            return f;
        }

        function render() {
            const t = T();
            setup.innerHTML = '';
            const tf = U.el('div', 'dh-field');
            const tl = document.createElement('label'); tl.textContent = 'Organism';
            const ts = document.createElement('select');
            Object.keys(TRAITS).forEach(k => {
                const op = document.createElement('option');
                op.value = k; op.textContent = TRAITS[k].name;
                if (k === key) op.selected = true;
                ts.appendChild(op);
            });
            ts.addEventListener('change', () => {
                key = ts.value;
                const gs = genotypesFor(T());
                p1 = gs[4]; p2 = gs[4];          // the heterozygote for both genes
                resetFoil(); render();
            });
            tf.appendChild(tl); tf.appendChild(ts); setup.appendChild(tf);
            const gs = genotypesFor(t);
            setup.appendChild(field('Parent 1', gs, p1, v => { p1 = v; resetFoil(); render(); }));
            setup.appendChild(field('Parent 2', gs, p2, v => { p2 = v; resetFoil(); render(); }));

            // ---- FOIL step ----
            foilHost.innerHTML = '';
            if (!foilDone()) {
                const box = U.el('div', 'dh-foil');
                const st = U.el('p', 'dh-step'); st.textContent = 'Step 1 of 2 — the gametes of parent 1';
                const p = document.createElement('p');
                p.innerHTML = 'Parent 1 is <strong>' + p1 + '</strong>. Each gamete gets one allele of ' +
                    'each gene. Use <strong>FOIL</strong> — first, outside, inside, last — to find all four.';
                box.appendChild(st); box.appendChild(p);
                FOIL_LABELS.forEach((lab, i) => {
                    const row = U.el('div', 'dh-foilrow');
                    const b = document.createElement('b'); b.textContent = lab;
                    const s = U.el('button', 'dh-slot' +
                        (foil[i] ? (foil[i] === wantFoil()[i] ? ' right' : ' wrong') : ''));
                    s.type = 'button';
                    s.textContent = foil[i] || '?';
                    s.setAttribute('aria-label', lab + ' gamete' + (foil[i] ? ', ' + foil[i] : ', empty'));
                    s.addEventListener('click', () => {
                        if (foil[i]) { foil[i] = null; render(); return; }
                        if (!sel) { msg.textContent = 'Choose a gamete from the row below first.';
                                    msg.className = 'dh-msg'; render(); return; }
                        foil[i] = sel;
                        if (sel === wantFoil()[i]) {
                            msg.textContent = lab.toLowerCase() + ': take the ' +
                                (i === 0 ? 'first letter of each pair' :
                                 i === 1 ? 'first letter of the first pair and the last of the second' :
                                 i === 2 ? 'second letter of the first pair and the first of the second' :
                                           'last letter of each pair') + ' — ' + sel + '.';
                            msg.className = 'dh-msg ok';
                        } else {
                            msg.textContent = 'Not that one. Every gamete must carry exactly one allele ' +
                                'of the height gene and one of the colour gene — never two of either.';
                            msg.className = 'dh-msg bad';
                        }
                        sel = null; render();
                    });
                    row.appendChild(b); row.appendChild(s);
                    box.appendChild(row);
                });
                const pick = U.el('div', 'dh-pick');
                const uniq = [];
                [p1[0], p1[1]].forEach(a => [p1[2], p1[3]].forEach(b => {
                    if (uniq.indexOf(a + b) < 0) uniq.push(a + b);
                }));
                uniq.forEach(g => {
                    const b = U.el('button', 'dh-tile');
                    b.type = 'button'; b.textContent = g;
                    b.setAttribute('aria-pressed', sel === g ? 'true' : 'false');
                    b.addEventListener('click', () => { sel = sel === g ? null : g; render(); });
                    pick.appendChild(b);
                });
                box.appendChild(pick);
                foilHost.appendChild(box);
                gridHost.innerHTML = ''; outHost.innerHTML = '';
                return;
            }

            // ---- the square ----
            const st2 = U.el('p', 'dh-step'); st2.textContent = 'Step 2 of 2 — the cross';
            foilHost.appendChild(st2);
            const ga = gametesOf(p1), gb = gametesOf(p2);
            const tbl = document.createElement('table');
            tbl.className = 'dh-grid';
            let html = '<tr><th class="corner"></th>' + ga.map(g => '<th>' + g + '</th>').join('') + '</tr>';
            const kids = [];
            gb.forEach(rb => {
                html += '<tr><th>' + rb + '</th>';
                ga.forEach(ca => {
                    const g = combine(t, ca, rb);
                    kids.push(g);
                    html += '<td><span class="dh-g">' + g + '</span><span class="dh-p">' +
                            pheno(t, g) + '</span></td>';
                });
                html += '</tr>';
            });
            tbl.innerHTML = html;
            gridHost.innerHTML = ''; gridHost.appendChild(tbl);

            // ---- ratios ----
            const pt = {};
            kids.forEach(g => { const p = pheno(t, g); pt[p] = (pt[p] || 0) + 1; });
            const entries = Object.keys(pt).sort((a, b) => pt[b] - pt[a]);
            let rows = entries.map(k => '<tr><td>' + k + '</td><td>' + pt[k] + ' / 16</td><td>' +
                Math.round(pt[k] / 16 * 100) + '%</td></tr>').join('');
            const is9331 = entries.map(k => pt[k]).join(':') === '9:3:3:1';
            outHost.innerHTML = '';
            const box = U.el('div', 'dh-out');
            box.innerHTML = '<h5>Sixteen boxes, four phenotypes</h5>' +
                '<table><thead><tr><th>Phenotype</th><th>Count</th><th>Probability</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table>' +
                (is9331
                    ? '<p style="margin-top:0.7rem">There it is: <strong>9 : 3 : 3 : 1</strong>. This ratio ' +
                      'appears whenever you cross two individuals heterozygous for both genes, and it is ' +
                      'the signature of <strong>independent assortment</strong> — the two genes are being ' +
                      'inherited without reference to one another.</p>' +
                      '<p>Check it against the single-gene result you already know. Nine plus three is ' +
                      'twelve of sixteen showing the first dominant trait — which is ¾, exactly the 3 : 1 ' +
                      'you would get from that gene alone. The dihybrid ratio is just two 3 : 1 crosses ' +
                      'multiplied together.</p>'
                    : '<p style="margin-top:0.7rem">Not a 9 : 3 : 3 : 1 — that ratio only appears when ' +
                      '<em>both</em> parents are heterozygous for <em>both</em> genes. Try setting both ' +
                      'parents to the double heterozygote and compare.</p>');
            outHost.appendChild(box);
        }

        const buttons = U.el('div', 'sim-buttons');
        U.button(buttons, 'Start again').addEventListener('click', () => { resetFoil(); render(); });
        wrap.appendChild(buttons);

        render();

        root._simState = () => {
            const t = T(), ga = gametesOf(p1), gb = gametesOf(p2), kids = [];
            gb.forEach(rb => ga.forEach(ca => kids.push(combine(t, ca, rb))));
            const pt = {};
            kids.forEach(g => { const p = pheno(t, g); pt[p] = (pt[p] || 0) + 1; });
            return {
                trait: key, p1, p2, gametesP1: ga, gametesP2: gb,
                foil: foil.slice(), foilComplete: foilDone(),
                offspring: kids, phenotypeCounts: pt,
                ratio: Object.keys(pt).sort((a, b) => pt[b] - pt[a]).map(k => pt[k]).join(':')
            };
        };
        root._simSolve = () => { foil = wantFoil().slice(); render(); };
    };
})();
