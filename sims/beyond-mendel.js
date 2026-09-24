/* =============================================================
   INTERACTIVE — Cross anything: the non-Mendelian patterns
   -------------------------------------------------------------
   Registers window.SIMS['beyond-mendel'].  Supports HS-LS3-3.

   Four inheritance patterns behind one Punnett engine, which is the
   point rather than a shortcut: the mechanics never change. Alleles
   still segregate, gametes still combine at random, the square is
   still four equally likely boxes. What changes is only how the
   genotype is READ into a phenotype.

   Incomplete dominance and codominance are deliberately adjacent,
   because their squares are identical and students routinely believe
   the difference is mathematical. It is not — it is what the
   heterozygote looks like.

   Sex linkage is the one pattern whose gametes genuinely differ, and
   the engine handles that rather than pretending otherwise.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-bm-style';

    const MODES = {
        incomplete: {
            name: 'Incomplete dominance — snapdragons',
            blurb: 'Neither allele is dominant. The heterozygote is a <em>blend</em> of the two.',
            p1label: 'Parent 1', p2label: 'Parent 2',
            g1: ['RR', 'RW', 'WW'], g2: ['RR', 'RW', 'WW'],
            gametes: g => [g[0], g[1]],
            combine: (a, b) => [a, b].sort().join(''),
            pheno: g => ({ RR: 'red', RW: 'pink', WW: 'white' })[g],
            show: g => g, gshow: a => a,
            note: 'Notice there is no 3 : 1 anywhere. With a blended heterozygote the phenotype ratio always equals the genotype ratio, because every genotype looks different. A cross of two pinks gives 1 red : 2 pink : 1 white.'
        },
        codominant: {
            name: 'Codominance — cattle coat colour',
            blurb: 'Both alleles are fully expressed. The heterozygote shows <em>both</em> colours, not a mixture.',
            p1label: 'Parent 1', p2label: 'Parent 2',
            g1: ['RR', 'RW', 'WW'], g2: ['RR', 'RW', 'WW'],
            gametes: g => [g[0], g[1]],
            combine: (a, b) => [a, b].sort().join(''),
            pheno: g => ({ RR: 'red', RW: 'roan (red and white hairs)', WW: 'white' })[g],
            show: g => g, gshow: a => a,
            note: 'Compare this square with the snapdragons — they are identical. The difference is not in the maths, it is in the animal. A roan cow has red hairs AND white hairs side by side; you can see both alleles at work. A pink snapdragon has no red patches at all.'
        },
        multiple: {
            name: 'Multiple alleles — ABO blood groups',
            blurb: 'Three alleles in the population, but still only <em>two</em> in any one person. I<sup>A</sup> and I<sup>B</sup> are codominant with each other; i is recessive to both.',
            p1label: 'Parent 1', p2label: 'Parent 2',
            g1: ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'], g2: ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'],
            gametes: g => [g[0], g[1]],
            combine: (a, b) => [a, b].sort().join(''),
            pheno: g => {
                const has = c => g.indexOf(c) > -1;
                if (has('A') && has('B')) return 'type AB';
                if (has('A')) return 'type A';
                if (has('B')) return 'type B';
                return 'type O';
            },
            show: g => g.split('').map(c => c === 'O' ? 'i' : 'I' + c).join(''),
            gshow: a => a === 'O' ? 'i' : 'I' + a,
            note: 'Two parents with type AB can never have a type O child — neither of them carries an i allele to pass on. That is why blood groups can rule a parent out, though they can rarely prove one in.'
        },
        sexlinked: {
            name: 'Sex linkage — red-green colour blindness',
            blurb: 'The gene sits on the X chromosome. A male has only one X, so he has only one copy — there is no second allele to mask it.',
            p1label: 'Mother', p2label: 'Father',
            g1: ['NN', 'Nn', 'nn'], g2: ['NY', 'nY'],
            gametes: g => [g[0], g[1]],
            combine: (a, b) => (a === 'Y' || b === 'Y')
                ? (a === 'Y' ? b + 'Y' : a + 'Y')
                : [a, b].sort().join(''),
            pheno: g => {
                if (g.indexOf('Y') > -1) {
                    return g[0] === 'n' ? 'male, colour blind' : 'male, normal vision';
                }
                if (g === 'nn') return 'female, colour blind';
                if (g === 'Nn') return 'female, carrier';
                return 'female, normal vision';
            },
            show: g => g.indexOf('Y') > -1
                ? 'X' + g[0] + 'Y'
                : 'X' + g[0] + 'X' + g[1],
            gshow: a => a === 'Y' ? 'Y' : 'X' + a,
            note: 'A carrier mother and a father with normal vision produce no colour-blind daughters at all, but half the sons are colour blind. That asymmetry — sons affected, daughters not — is the fingerprint of an X-linked recessive trait, and it is what you look for in a pedigree.'
        }
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.bm { padding:1rem 1.25rem 0.25rem; }',
            '.bm { --bm-ok:#2e7d32; }',
            '[data-theme="dark"] .bm { --bm-ok:#7fc98a; }',
            '[data-theme="sepia"] .bm { --bm-ok:#4a6b3d; }',
            '.bm-modes { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.9rem; }',
            '.bm-mode { font:inherit; font-size:0.75rem; cursor:pointer; padding:0.42rem 0.75rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; transition:all 0.12s; }',
            '.bm-mode:hover { border-color:var(--light-teal); }',
            '.bm-mode:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.bm-mode[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); background:var(--bg-surface); font-weight:600; }',
            '.bm-blurb { font-size:0.82rem; line-height:1.55; margin:0 0 0.9rem;',
            '   color:var(--text-secondary); }',
            '.bm-setup { display:flex; gap:0.8rem; flex-wrap:wrap; align-items:flex-end; margin-bottom:1rem; }',
            '.bm-field { display:flex; flex-direction:column; gap:0.2rem; }',
            '.bm-field label { font-size:0.64rem; font-weight:700; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); }',
            '.bm-field select { font:inherit; font-size:0.82rem; padding:0.32rem 0.5rem;',
            '   border:1px solid var(--border); border-radius:7px; background:var(--bg); color:var(--text); }',
            '.bm-grid { border-collapse:collapse; }',
            '.bm-grid th, .bm-grid td { border:1px solid var(--border); text-align:center; }',
            '.bm-grid th { background:var(--bg-nav-active); color:var(--text); font-weight:800;',
            '   min-width:96px; height:40px; font-size:0.9rem; padding:0 0.4rem; }',
            '.bm-grid th.corner { background:none; border:0; }',
            '.bm-grid td { min-width:96px; height:56px; padding:0.3rem 0.4rem; }',
            '.bm-g { font-weight:800; font-size:0.92rem; display:block; }',
            '.bm-p { font-size:0.66rem; color:var(--text-secondary); margin-top:0.12rem; display:block; }',
            '.bm-wrap { overflow-x:auto; }',
            '.bm-out { margin-top:1rem; border:1px solid var(--border); border-radius:10px;',
            '   padding:0.8rem 0.9rem; }',
            '.bm-out h5 { margin:0 0 0.45rem; font-size:0.82rem; letter-spacing:0.05em;',
            '   text-transform:uppercase; color:var(--text-secondary); }',
            '.bm-out dl { margin:0; font-size:0.84rem; }',
            '.bm-out dt { font-weight:700; margin-top:0.4rem; }',
            '.bm-out dd { margin:0.1rem 0 0; }',
            '.bm-note { margin-top:0.9rem; border-left:3px solid var(--bm-ok);',
            '   padding:0.1rem 0 0.1rem 0.8rem; }',
            '.bm-note p { margin:0; font-size:0.84rem; line-height:1.55; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['beyond-mendel'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'bm');
        const modeBar = U.el('div', 'bm-modes');
        const blurb = U.el('p', 'bm-blurb');
        const setup = U.el('div', 'bm-setup');
        const gridHost = U.el('div', 'bm-wrap');
        const outHost = U.el('div');
        [modeBar, blurb, setup, gridHost, outHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        let key = 'incomplete';
        let p1 = MODES.incomplete.g1[1];
        let p2 = MODES.incomplete.g2[1];

        function offspring() {
            const m = MODES[key], out = [];
            m.gametes(p1).forEach(a => m.gametes(p2).forEach(b => out.push(m.combine(a, b))));
            return out;
        }
        function tally(list, fn) {
            const t = {};
            list.forEach(x => { const k = fn(x); t[k] = (t[k] || 0) + 1; });
            return t;
        }
        const asText = t => Object.keys(t).map(k => t[k] + ' ' + k).join('  :  ');

        function field(labelText, opts, value, onChange) {
            const m = MODES[key];
            const f = U.el('div', 'bm-field');
            const l = document.createElement('label'); l.textContent = labelText;
            const sel = document.createElement('select');
            opts.forEach(g => {
                const op = document.createElement('option');
                op.value = g;
                op.textContent = m.show(g).replace(/<[^>]+>/g, '') + ' — ' + m.pheno(g);
                if (g === value) op.selected = true;
                sel.appendChild(op);
            });
            sel.addEventListener('change', () => onChange(sel.value));
            f.appendChild(l); f.appendChild(sel);
            return f;
        }

        function render() {
            const m = MODES[key];

            modeBar.innerHTML = '';
            Object.keys(MODES).forEach(k => {
                const b = U.el('button', 'bm-mode');
                b.type = 'button';
                b.textContent = MODES[k].name.split(' — ')[0];
                b.title = MODES[k].name;
                b.setAttribute('aria-pressed', k === key ? 'true' : 'false');
                b.addEventListener('click', () => {
                    key = k; p1 = MODES[k].g1[1]; p2 = MODES[k].g2[Math.min(1, MODES[k].g2.length - 1)];
                    render();
                });
                modeBar.appendChild(b);
            });

            blurb.innerHTML = '<strong>' + m.name + '.</strong> ' + m.blurb;

            setup.innerHTML = '';
            setup.appendChild(field(m.p1label, m.g1, p1, v => { p1 = v; render(); }));
            setup.appendChild(field(m.p2label, m.g2, p2, v => { p2 = v; render(); }));

            const ga = m.gametes(p1), gb = m.gametes(p2);
            const tbl = document.createElement('table');
            tbl.className = 'bm-grid';
            let html = '<tr><th class="corner"></th>' +
                ga.map(g => '<th>' + m.gshow(g) + '</th>').join('') + '</tr>';
            for (let r = 0; r < gb.length; r++) {
                html += '<tr><th>' + m.gshow(gb[r]) + '</th>';
                for (let c = 0; c < ga.length; c++) {
                    const g = m.combine(ga[c], gb[r]);
                    html += '<td><span class="bm-g">' + m.show(g) + '</span>' +
                            '<span class="bm-p">' + m.pheno(g) + '</span></td>';
                }
                html += '</tr>';
            }
            tbl.innerHTML = html;
            gridHost.innerHTML = ''; gridHost.appendChild(tbl);

            const kids = offspring();
            const gt = tally(kids, g => m.show(g));
            const pt = tally(kids, g => m.pheno(g));
            outHost.innerHTML = '';
            const box = U.el('div', 'bm-out');
            box.innerHTML = '<h5>Reading the square</h5><dl>' +
                '<dt>Genotype ratio</dt><dd>' + asText(gt) + '</dd>' +
                '<dt>Phenotype ratio</dt><dd>' + asText(pt) + '</dd></dl>';
            outHost.appendChild(box);
            const note = U.el('div', 'bm-note');
            const p = document.createElement('p'); p.innerHTML = m.note;
            note.appendChild(p); outHost.appendChild(note);
        }

        render();

        root._simState = () => {
            const m = MODES[key], kids = offspring();
            return {
                mode: key, p1, p2,
                offspring: kids.map(g => ({ genotype: m.show(g), phenotype: m.pheno(g) })),
                genotypeRatio: asText(tally(kids, g => m.show(g))),
                phenotypeRatio: asText(tally(kids, g => m.pheno(g)))
            };
        };
        root._simSet = (k, a, b) => { key = k; p1 = a; p2 = b; render(); };
    };
})();
