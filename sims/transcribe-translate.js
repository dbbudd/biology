/* =============================================================
   INTERACTIVE — Transcribe a gene, then translate it
   -------------------------------------------------------------
   Registers window.SIMS['transcribe-translate'].  Supports HS-LS1-1.

   Replaces two worksheet screenshots and the external Learn.Genetics
   activity the anchor guide links out to. The DNA template is the one
   from anchor guide 5.1 (TAC CGC TCC GCC GTC GAC AAT ACC ACT), so a
   reader working on paper and a reader working here get the same
   protein: Met-Ala-Arg-Arg-Gln-Leu-Leu-Trp-Stop.

   PHASE 1 "transcribe" — build mRNA against the DNA template. The one
     error worth catching is T instead of U, so that gets its own reply.
   PHASE 2 "translate" — the codon table is not a picture here, it is
     the input device. To assign an amino acid the reader has to find
     the codon in the table and click it, which is the actual skill in
     "I can model the flow of DNA to RNA to protein given a section of
     DNA with an accompanying amino acid chart."

   Works by drag-and-drop, by click-then-click, and from the keyboard.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-tt-style';

    const TEMPLATE = 'TACCGCTCCGCCGTCGACAATACCACT';     // DNA template, 9 codons
    const DNA2RNA  = { T: 'A', A: 'U', C: 'G', G: 'C' };
    const B = ['U', 'C', 'A', 'G'];                      // codon-table order

    // The standard genetic code, written out the way the table reads.
    const AA = {
        UUU:'Phe',UUC:'Phe',UUA:'Leu',UUG:'Leu', CUU:'Leu',CUC:'Leu',CUA:'Leu',CUG:'Leu',
        AUU:'Ile',AUC:'Ile',AUA:'Ile',AUG:'Met', GUU:'Val',GUC:'Val',GUA:'Val',GUG:'Val',
        UCU:'Ser',UCC:'Ser',UCA:'Ser',UCG:'Ser', CCU:'Pro',CCC:'Pro',CCA:'Pro',CCG:'Pro',
        ACU:'Thr',ACC:'Thr',ACA:'Thr',ACG:'Thr', GCU:'Ala',GCC:'Ala',GCA:'Ala',GCG:'Ala',
        UAU:'Tyr',UAC:'Tyr',UAA:'Stop',UAG:'Stop', CAU:'His',CAC:'His',CAA:'Gln',CAG:'Gln',
        AAU:'Asn',AAC:'Asn',AAA:'Lys',AAG:'Lys', GAU:'Asp',GAC:'Asp',GAA:'Glu',GAG:'Glu',
        UGU:'Cys',UGC:'Cys',UGA:'Stop',UGG:'Trp', CGU:'Arg',CGC:'Arg',CGA:'Arg',CGG:'Arg',
        AGU:'Ser',AGC:'Ser',AGA:'Arg',AGG:'Arg', GGU:'Gly',GGC:'Gly',GGA:'Gly',GGG:'Gly'
    };
    const FULLNAME = {
        Phe:'phenylalanine', Leu:'leucine', Ile:'isoleucine', Met:'methionine',
        Val:'valine', Ser:'serine', Pro:'proline', Thr:'threonine', Ala:'alanine',
        Tyr:'tyrosine', His:'histidine', Gln:'glutamine', Asn:'asparagine',
        Lys:'lysine', Asp:'aspartic acid', Glu:'glutamic acid', Cys:'cysteine',
        Trp:'tryptophan', Arg:'arginine', Gly:'glycine', Stop:'a stop signal'
    };

    const rna = TEMPLATE.split('').map(b => DNA2RNA[b]).join('');
    const codons = rna.match(/.{3}/g);
    const protein = codons.map(c => AA[c]);

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.tt { padding: 1rem 1.25rem 0.25rem; }',
            '.tt { --tt-ok:#2e7d32; --tt-bad:#aa272f;',
            '      --b-A:#3f8f4a; --b-U:#c0392b; --b-T:#c0392b; --b-G:#2f6fb5; --b-C:#c78a18; }',
            '[data-theme="dark"] .tt { --tt-ok:#7fc98a; --tt-bad:#e08a90;',
            '      --b-A:#68c47a; --b-U:#e07a80; --b-T:#e07a80; --b-G:#6fa8dc; --b-C:#e0b755; }',
            '[data-theme="sepia"] .tt { --tt-ok:#4a6b3d; --tt-bad:#a04040; }',
            '.tt-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; }',
            '.tt-phase { font-size:0.62rem; font-weight:700; letter-spacing:0.09em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0 0 0.4rem; }',
            '.tt-label { font-size:0.62rem; font-weight:700; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0.55rem 0 0.2rem; }',

            '.tt-scroll { overflow-x:auto; padding-bottom:0.3rem; }',
            '.tt-row { display:flex; gap:2px; min-width:min-content; }',
            '.tt-b { width:30px; height:32px; flex:none; border-radius:5px; display:flex;',
            '   align-items:center; justify-content:center; font-weight:800; font-size:0.85rem;',
            '   color:#fff; }',
            '.tt-b.dA{background:var(--b-A)} .tt-b.dU{background:var(--b-U)}',
            '.tt-b.dT{background:var(--b-T)} .tt-b.dG{background:var(--b-G)} .tt-b.dC{background:var(--b-C)}',
            '.tt-slot { width:30px; height:32px; flex:none; border-radius:5px; font:inherit; padding:0;',
            '   border:1.5px dashed var(--border); background:transparent; cursor:pointer;',
            '   font-weight:800; font-size:0.85rem; color:var(--text-secondary);',
            '   touch-action:manipulation; transition:all 0.12s; }',
            '.tt-slot:hover{border-color:var(--light-teal)}',
            '.tt-slot:focus-visible{outline:2px solid var(--light-teal); outline-offset:2px}',
            '.tt-slot.over{border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal)}',
            '.tt-slot.wrong{border-style:solid; border-color:var(--tt-bad); color:var(--tt-bad)}',
            '.tt-gap { width:6px; flex:none; }',

            '.tt-palette { display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center;',
            '   margin:0.9rem 0 0.2rem; }',
            '.tt-tile { font:inherit; cursor:grab; width:42px; height:42px; border-radius:8px;',
            '   border:1px solid var(--border); background:var(--bg); color:var(--text);',
            '   font-weight:800; font-size:1rem; touch-action:manipulation; transition:all 0.12s; }',
            '.tt-tile:hover{border-color:var(--light-teal)}',
            '.tt-tile:focus-visible{outline:2px solid var(--light-teal); outline-offset:2px}',
            '.tt-tile[aria-pressed="true"]{border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal)}',
            '.tt-tile.tA{color:var(--b-A)} .tt-tile.tU{color:var(--b-U)}',
            '.tt-tile.tG{color:var(--b-G)} .tt-tile.tC{color:var(--b-C)}',
            '.tt-key { font-size:0.72rem; color:var(--text-secondary); margin:0.55rem 0 0; }',

            '.tt-codons { display:flex; gap:0.4rem; flex-wrap:wrap; margin:0.3rem 0 0; }',
            '.tt-cod { border:1.5px solid var(--border); border-radius:8px; padding:0.3rem 0.4rem;',
            '   min-width:64px; text-align:center; }',
            '.tt-cod.current { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.tt-cod.right { border-color:var(--tt-ok); }',
            '.tt-cod .c { font-weight:800; font-size:0.85rem; letter-spacing:0.06em; }',
            '.tt-cod .a { font-size:0.72rem; color:var(--text-secondary); margin-top:0.15rem;',
            '   min-height:1em; }',
            '.tt-cod.right .a { color:var(--tt-ok); font-weight:700; }',

            '.tt-table { overflow-x:auto; margin-top:0.7rem; }',
            '.tt-grid { border-collapse:collapse; font-size:0.7rem; min-width:min-content; }',
            '.tt-grid th { background:var(--bg-nav-active); color:var(--text-secondary);',
            '   font-size:0.66rem; letter-spacing:0.05em; padding:0.25rem 0.4rem; font-weight:700; }',
            '.tt-grid td { border:1px solid var(--border); padding:0; vertical-align:top; }',
            '.tt-cell { display:block; width:100%; font:inherit; font-size:0.68rem; text-align:left;',
            '   background:none; border:0; padding:0.16rem 0.35rem; cursor:pointer; color:var(--text);',
            '   white-space:nowrap; }',
            '.tt-cell:hover { background:var(--bg-nav-hover); }',
            '.tt-cell:focus-visible { outline:2px solid var(--light-teal); outline-offset:-2px; }',
            '.tt-cell b { font-weight:800; letter-spacing:0.04em; }',
            '.tt-cell .aa { color:var(--text-secondary); margin-left:0.25rem; }',
            '.tt-cell.hit { background:rgba(46,125,50,0.16); }',
            '.tt-cell.miss { background:rgba(170,39,47,0.14); }',

            '.tt-msg { margin:0.85rem 0 0; font-size:0.82rem; line-height:1.5; min-height:2.6em; }',
            '.tt-msg.ok{color:var(--tt-ok)} .tt-msg.bad{color:var(--tt-bad)}',
            '.tt-count { font-size:0.72rem; color:var(--text-secondary); margin:0.5rem 0 0; }',
            '.tt-reveal { margin-top:1rem; border:1px solid var(--tt-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .tt-reveal { background:rgba(127,201,138,0.12); }',
            '.tt-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.tt-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.tt-chain { font-weight:700; letter-spacing:0.02em; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['transcribe-translate'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'tt');
        const how = U.el('p', 'tt-how');
        const phaseLab = U.el('p', 'tt-phase');
        const stage = U.el('div');
        const msg = U.el('p', 'tt-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const count = U.el('p', 'tt-count');
        const revealHost = U.el('div');
        [how, phaseLab, stage, msg, count, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const nextBtn = U.button(buttons, 'Send the mRNA to the ribosome');
        const resetBtn = U.button(buttons, 'Start again');
        wrap.appendChild(buttons);

        let phase = 'transcribe';
        let built = [];        // per-base mRNA answers
        let aas = [];          // per-codon amino acid answers
        let selected = null;
        let cur = 0;           // which codon is being translated

        function reset() {
            phase = 'transcribe';
            built = new Array(TEMPLATE.length).fill(null);
            aas = new Array(codons.length).fill(null);
            selected = null; cur = 0;
            msg.textContent = ''; msg.className = 'tt-msg';
            revealHost.innerHTML = '';
            render();
        }
        const doneT = () => built.every((b, i) => b === DNA2RNA[TEMPLATE[i]]);
        const doneA = () => aas.every((a, i) => a === protein[i]);

        function placeBase(b, i) {
            const want = DNA2RNA[TEMPLATE[i]];
            built[i] = b; selected = null;
            if (b === want) {
                msg.textContent = TEMPLATE[i] + ' on the DNA template pairs with ' + b +
                    ' on the mRNA.' + (want === 'U'
                        ? ' RNA uses uracil wherever DNA would have used thymine.' : '');
                msg.className = 'tt-msg ok';
            } else if (b === 'T') {
                msg.textContent = 'RNA never contains thymine. Where DNA would pair an A with T, ' +
                    'RNA uses uracil (U) instead. That single swap is one of the three differences ' +
                    'between DNA and RNA.';
                msg.className = 'tt-msg bad';
            } else {
                msg.textContent = 'The template base here is ' + TEMPLATE[i] + ', so the mRNA base ' +
                    'must be ' + want + '. Pairing is the same as in DNA, with U standing in for T.';
                msg.className = 'tt-msg bad';
            }
            render();
        }

        function pickCodon(clicked) {
            const want = codons[cur];
            if (clicked === want) {
                aas[cur] = AA[want];
                const isStop = AA[want] === 'Stop';
                const isStart = want === 'AUG' && cur === 0;
                msg.textContent = want + ' codes for ' + FULLNAME[AA[want]] +
                    (isStart ? ' — and AUG is also the signal that tells the ribosome where to start.'
                             : isStop ? '. No amino acid is added; the ribosome releases the chain and translation ends.'
                             : '.');
                msg.className = 'tt-msg ok';
                if (cur < codons.length - 1) cur++;
            } else {
                msg.textContent = 'That cell is ' + clicked + ', which codes for ' +
                    FULLNAME[AA[clicked]] + '. The codon you need is ' + want +
                    ' — read down for the first base, across for the second, then down the small ' +
                    'column for the third.';
                msg.className = 'tt-msg bad';
            }
            render();
        }

        function bEl(ch) { const e = U.el('div', 'tt-b d' + ch); e.textContent = ch; return e; }

        function render() {
            how.textContent = phase === 'transcribe'
                ? 'Build the mRNA against the DNA template. Drag a base, or click a base and then click a space. One of the four is different from DNA — find out which.'
                : 'Read each codon and find it in the table below, then click that cell to add its amino acid to the chain. Work left to right.';
            phaseLab.textContent = phase === 'transcribe'
                ? 'Step 1 of 2 — transcription, in the nucleus'
                : 'Step 2 of 2 — translation, at the ribosome';

            stage.innerHTML = '';

            // ---- DNA template (always shown) ----
            const t = U.el('div', 'tt-scroll');
            const lab1 = U.el('p', 'tt-label'); lab1.textContent = 'DNA template strand';
            const r1 = U.el('div', 'tt-row');
            TEMPLATE.split('').forEach((ch, i) => {
                r1.appendChild(bEl(ch));
                if (i % 3 === 2) r1.appendChild(U.el('div', 'tt-gap'));
            });
            t.appendChild(lab1); t.appendChild(r1);

            // ---- mRNA row ----
            const lab2 = U.el('p', 'tt-label'); lab2.textContent = 'mRNA';
            const r2 = U.el('div', 'tt-row');
            for (let i = 0; i < TEMPLATE.length; i++) {
                const want = DNA2RNA[TEMPLATE[i]];
                if (phase === 'translate' || built[i] === want) {
                    r2.appendChild(bEl(built[i] || want));
                } else {
                    const s = U.el('button', 'tt-slot');
                    s.type = 'button';
                    if (built[i]) { s.textContent = built[i]; s.classList.add('wrong'); }
                    s.setAttribute('aria-label', built[i]
                        ? built[i] + ' at position ' + (i + 1) + ', not correct. Activate to clear.'
                        : 'Empty position ' + (i + 1) + ', opposite ' + TEMPLATE[i]);
                    s.addEventListener('click', () => {
                        if (built[i]) { built[i] = null; msg.textContent = ''; msg.className = 'tt-msg'; render(); }
                        else if (selected) placeBase(selected, i);
                    });
                    s.addEventListener('dragover', e => { e.preventDefault(); s.classList.add('over'); });
                    s.addEventListener('dragleave', () => s.classList.remove('over'));
                    s.addEventListener('drop', e => {
                        e.preventDefault(); s.classList.remove('over');
                        const k = e.dataTransfer.getData('text/plain');
                        if (k) placeBase(k, i);
                    });
                    r2.appendChild(s);
                }
                if (i % 3 === 2) r2.appendChild(U.el('div', 'tt-gap'));
            }
            t.appendChild(lab2); t.appendChild(r2);
            stage.appendChild(t);

            if (phase === 'transcribe') {
                const pal = U.el('div', 'tt-palette');
                ['A', 'U', 'G', 'C', 'T'].forEach(b => {
                    const tl = U.el('button', 'tt-tile t' + b);
                    tl.type = 'button'; tl.draggable = true; tl.textContent = b;
                    tl.setAttribute('aria-pressed', selected === b ? 'true' : 'false');
                    tl.addEventListener('click', () => { selected = selected === b ? null : b; render(); });
                    tl.addEventListener('dragstart', e => {
                        e.dataTransfer.setData('text/plain', b); selected = b;
                    });
                    pal.appendChild(tl);
                });
                const k = U.el('p', 'tt-key');
                k.textContent = 'One of these five does not belong in RNA at all.';
                pal.appendChild(k);
                stage.appendChild(pal);
                count.textContent = built.filter((b, i) => b === DNA2RNA[TEMPLATE[i]]).length +
                    ' of ' + TEMPLATE.length + ' bases transcribed.';
            } else {
                // ---- codon strip ----
                const labc = U.el('p', 'tt-label'); labc.textContent = 'Amino acid chain';
                const strip = U.el('div', 'tt-codons');
                codons.forEach((c, i) => {
                    const d = U.el('div', 'tt-cod' + (aas[i] ? ' right' : (i === cur ? ' current' : '')));
                    d.innerHTML = '<div class="c">' + c + '</div><div class="a">' +
                        (aas[i] || (i === cur ? '?' : '')) + '</div>';
                    strip.appendChild(d);
                });
                stage.appendChild(labc); stage.appendChild(strip);

                // ---- the codon table, used as the input device ----
                const box = U.el('div', 'tt-table');
                const tbl = document.createElement('table');
                tbl.className = 'tt-grid';
                let html = '<thead><tr><th></th>' +
                    B.map(b => '<th>' + b + '</th>').join('') + '<th></th></tr></thead><tbody>';
                B.forEach(first => {
                    html += '<tr><th>' + first + '</th>';
                    B.forEach(second => {
                        html += '<td>' + B.map(third => {
                            const c = first + second + third;
                            return '<button type="button" class="tt-cell" data-codon="' + c + '">' +
                                   '<b>' + c + '</b><span class="aa">' + AA[c] + '</span></button>';
                        }).join('') + '</td>';
                    });
                    html += '<th>' + B.join('<br>') + '</th></tr>';
                });
                html += '</tbody>';
                tbl.innerHTML = html;
                tbl.querySelectorAll('.tt-cell').forEach(btn => {
                    btn.addEventListener('click', () => pickCodon(btn.dataset.codon));
                });
                box.appendChild(tbl);
                stage.appendChild(box);
                count.textContent = aas.filter(Boolean).length + ' of ' + codons.length +
                    ' codons translated.';
            }

            nextBtn.hidden = !(phase === 'transcribe' && doneT());
            if (phase === 'translate' && doneA()) showReveal();
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            const chain = protein.filter(a => a !== 'Stop').join(' – ');
            const d = U.el('div', 'tt-reveal');
            d.innerHTML =
                '<h5>You have just run the central dogma end to end.</h5>' +
                '<p class="tt-chain">DNA &rarr; mRNA &rarr; protein</p>' +
                '<p>Your protein is <strong>' + chain + '</strong>, and then a stop. ' +
                'Eight amino acids, from twenty-seven bases of DNA — because it takes ' +
                '<strong>three bases to specify one amino acid</strong>.</p>' +
                '<p>Two things are worth noticing before you move on. The first codon was AUG, ' +
                'which does double duty: it is the start signal <em>and</em> it codes for ' +
                'methionine, which is why almost every protein begins with it. The last codon, ' +
                'UGA, codes for no amino acid at all — it only means stop.</p>' +
                '<p>And look at how much redundancy the table has. Six different codons all mean ' +
                'leucine. Hold onto that: in the next chapter it turns out to be the reason some ' +
                'mutations do absolutely nothing.</p>';
            revealHost.appendChild(d);
            msg.textContent = 'Protein complete.';
            msg.className = 'tt-msg ok';
        }

        nextBtn.addEventListener('click', () => {
            if (!doneT()) return;
            phase = 'translate'; selected = null; cur = 0;
            msg.textContent = 'The mRNA leaves the nucleus through a pore and reaches a ribosome ' +
                'in the cytoplasm. Translation can begin.';
            msg.className = 'tt-msg';
            render();
        });
        resetBtn.addEventListener('click', reset);
        reset();

        root._simState = () => ({
            phase, template: TEMPLATE, mrna: rna, codons: codons.slice(),
            built: built.join(''), aminoAcids: aas.slice(),
            transcribeComplete: doneT(), translateComplete: doneA(),
            expectedProtein: protein.slice()
        });
        root._simSolve = () => {
            if (phase === 'transcribe') {
                for (let i = 0; i < TEMPLATE.length; i++) built[i] = DNA2RNA[TEMPLATE[i]];
            } else {
                for (let i = 0; i < codons.length; i++) aas[i] = protein[i];
                cur = codons.length - 1;
            }
            render();
        };
    };
})();
