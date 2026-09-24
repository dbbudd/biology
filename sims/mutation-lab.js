/* =============================================================
   INTERACTIVE — Break a gene: the mutation lab
   -------------------------------------------------------------
   Registers window.SIMS['mutation-lab'].  Supports HS-LS3-2.

   Replaces six screenshots of anchor-guide text (Tasks 1-6) with the
   thing those tasks were trying to get at. The sequence is the anchor
   guide's own:

     AUG GUU CAU CUG GAG GAA GAG CAC GUA GAA CAC UAG
     Met Val His Leu Glu Glu Glu His Val Glu His Stop

   The reader applies a mutation, sees the protein recomputed from the
   real genetic code, and then has to CLASSIFY it before any
   explanation appears. Classifying is the assessed skill; watching an
   animation is not.

   Every outcome below is computed at runtime from the codon table, so
   the sequences and proteins cannot drift away from the biology.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-mut-style';

    const BASE = 'AUGGUUCAUCUGGAGGAAGAGCACGUAGAACACUAG';

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

    // Each task is a pure function on the sequence, so the result is derived,
    // never typed in by hand.
    const sub = (s, i, b) => s.slice(0, i) + b + s.slice(i + 1);
    const TASKS = [
        { id: 1, name: 'Substitute A for U in the 5th codon',
          hint: 'A single base swapped for another.',
          apply: s => sub(s, 13, 'U'), answer: 'missense' },
        { id: 2, name: 'Substitute U for C at position 6',
          hint: 'A single base swapped for another.',
          apply: s => sub(s, 5, 'C'), answer: 'silent' },
        { id: 3, name: 'Substitute the first G of the 7th codon for U',
          hint: 'A single base swapped for another.',
          apply: s => sub(s, 18, 'U'), answer: 'nonsense' },
        { id: 4, name: 'Delete the G from the 9th codon',
          hint: 'A base removed. Count how many bases are left.',
          apply: s => s.slice(0, 24) + s.slice(25), answer: 'frameshift' },
        { id: 5, name: 'Invert bases 9 to 18',
          hint: 'A block reversed. The number of bases does not change.',
          apply: s => s.slice(0, 8) + s.slice(8, 18).split('').reverse().join('') + s.slice(18),
          answer: 'inversion' },
        { id: 6, name: 'Insert a G between positions 27 and 28',
          hint: 'A base added. Count how many bases there are now.',
          apply: s => s.slice(0, 27) + 'G' + s.slice(27), answer: 'frameshift' }
    ];

    const OPTIONS = [
        { key: 'silent',     label: 'Silent substitution' },
        { key: 'missense',   label: 'Missense substitution' },
        { key: 'nonsense',   label: 'Nonsense substitution' },
        { key: 'frameshift', label: 'Frameshift' },
        { key: 'inversion',  label: 'Inversion' }
    ];

    const WHY = {
        1: 'One codon changed, so <strong>one amino acid</strong> changed: glutamic acid became valine. Everything else is untouched. That is a <strong>missense</strong> mutation — and this exact swap, glutamic acid to valine, is the mutation that causes <strong>sickle cell anaemia</strong>. One base out of three billion.',
        2: 'The codon changed from GUU to GUC — but look at the protein. Nothing happened. Both codons mean valine. This is a <strong>silent</strong> substitution, and it is possible only because the genetic code is redundant. Most amino acids have several codons, so a good fraction of single-base changes have no effect at all.',
        3: 'The codon became UAG, which is a <strong>stop</strong> codon. The ribosome stops there, and everything downstream is never built. This is a <strong>nonsense</strong> mutation. A protein cut off two-thirds of the way through has almost no chance of folding into a working shape.',
        4: 'Removing one base pushes every base after it one place to the left. The ribosome still reads in threes, so from that point on it reads a <em>completely different set of codons</em>. This is a <strong>frameshift</strong>, and here the shifted frame runs into a stop codon early. Compare it with a substitution: one change, but every downstream codon wrecked.',
        5: 'Ten bases were reversed in place. The <em>number</em> of bases is unchanged, so the reading frame survives — the ribosome still lands on codon boundaries. But the codons inside the reversed block are scrambled, so several amino acids change at once, and everything after the block is normal again. This is an <strong>inversion</strong>.',
        6: 'Adding one base pushes everything after it one place to the right — a <strong>frameshift</strong> again, in the other direction. Look carefully at the end this time: the original stop codon has been shifted out of frame and destroyed, so the protein runs on past where it should have finished.'
    };

    function translate(seq) {
        const out = [];
        for (let i = 0; i + 3 <= seq.length; i += 3) {
            const aa = AA[seq.substr(i, 3)];
            if (!aa) break;
            out.push(aa);
            if (aa === 'Stop') break;
        }
        return out;
    }
    const codonsOf = s => s.match(/.{1,3}/g) || [];
    const BASE_AA = translate(BASE);

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.mu { padding:1rem 1.25rem 0.25rem; }',
            '.mu { --mu-ok:#2e7d32; --mu-bad:#aa272f; --mu-hi:#b8860b; }',
            '[data-theme="dark"] .mu { --mu-ok:#7fc98a; --mu-bad:#e08a90; --mu-hi:#e0b755; }',
            '[data-theme="sepia"] .mu { --mu-ok:#4a6b3d; --mu-bad:#a04040; --mu-hi:#8a6a24; }',
            '.mu-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.85rem; }',
            '.mu-tasks { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:1rem; }',
            '.mu-task { font:inherit; font-size:0.74rem; cursor:pointer; padding:0.4rem 0.7rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; transition:all 0.12s; }',
            '.mu-task:hover { border-color:var(--light-teal); }',
            '.mu-task:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.mu-task[aria-pressed="true"] { border-color:var(--light-teal);',
            '   box-shadow:0 0 0 2px var(--light-teal); background:var(--bg-surface); }',
            '.mu-task.solved { border-color:var(--mu-ok); color:var(--mu-ok); }',
            '.mu-task.solved::before { content:"\\2713\\00a0"; font-weight:800; }',
            '.mu-lab { font-size:0.62rem; font-weight:700; letter-spacing:0.06em;',
            '   text-transform:uppercase; color:var(--text-secondary); margin:0.6rem 0 0.25rem; }',
            '.mu-seq { overflow-x:auto; padding-bottom:0.25rem; }',
            '.mu-row { display:flex; gap:5px; min-width:min-content; }',
            '.mu-cod { text-align:center; }',
            '.mu-cod .c { font-family:ui-monospace,SFMono-Regular,Menlo,monospace;',
            '   font-size:0.82rem; font-weight:700; letter-spacing:0.04em; padding:0.14rem 0.28rem;',
            '   border-radius:4px; display:block; }',
            '.mu-cod .a { font-size:0.66rem; color:var(--text-secondary); margin-top:0.1rem; }',
            '.mu-cod.changed .c { background:rgba(184,134,11,0.22); color:var(--mu-hi); }',
            '.mu-cod.changed .a { color:var(--mu-hi); font-weight:700; }',
            '.mu-cod.stopnew .c { background:rgba(170,39,47,0.18); color:var(--mu-bad); }',
            '.mu-cod.gone { opacity:0.35; text-decoration:line-through; }',
            '.mu-ask { margin-top:1rem; }',
            '.mu-ask p { font-size:0.84rem; margin:0 0 0.5rem; font-weight:600; }',
            '.mu-opts { display:flex; gap:0.4rem; flex-wrap:wrap; }',
            '.mu-opt { font:inherit; font-size:0.76rem; cursor:pointer; padding:0.42rem 0.75rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg);',
            '   color:var(--text); touch-action:manipulation; transition:all 0.12s; }',
            '.mu-opt:hover { border-color:var(--light-teal); }',
            '.mu-opt:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.mu-opt.right { border-color:var(--mu-ok); color:var(--mu-ok); font-weight:700; }',
            '.mu-opt.wrong { border-color:var(--mu-bad); color:var(--mu-bad); opacity:0.7; }',
            '.mu-why { margin-top:0.85rem; border-left:3px solid var(--mu-ok); padding:0.1rem 0 0.1rem 0.8rem; }',
            '.mu-why p { font-size:0.84rem; line-height:1.55; margin:0; }',
            '.mu-msg { margin:0.8rem 0 0; font-size:0.82rem; min-height:1.4em; }',
            '.mu-msg.bad { color:var(--mu-bad); }',
            '.mu-len { font-size:0.72rem; color:var(--text-secondary); margin:0.45rem 0 0; }',
            '.mu-reveal { margin-top:1rem; border:1px solid var(--mu-ok); border-radius:10px;',
            '   background:rgba(46,125,50,0.08); padding:0.85rem 1rem; }',
            '[data-theme="dark"] .mu-reveal { background:rgba(127,201,138,0.12); }',
            '.mu-reveal h5 { margin:0 0 0.5rem; font-size:0.9rem; }',
            '.mu-reveal p { margin:0 0 0.6rem; font-size:0.84rem; line-height:1.55; }',
            '.mu-tbl { width:100%; border-collapse:collapse; font-size:0.76rem; margin-top:0.5rem; }',
            '.mu-tbl th, .mu-tbl td { border:1px solid var(--border); padding:0.3rem 0.45rem; text-align:left; }',
            '.mu-tbl th { color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase;',
            '   letter-spacing:0.05em; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['mutation-lab'] = function (root) {
        injectStyle();

        const wrap = U.el('div', 'mu');
        const how = U.el('p', 'mu-how');
        how.textContent = 'Pick a mutation. The protein is rebuilt from the real genetic code, and ' +
            'changed codons are highlighted. Then say what kind of mutation it was — the answer ' +
            'is not revealed until you commit to one.';
        const taskBar = U.el('div', 'mu-tasks');
        const stage = U.el('div');
        const askHost = U.el('div');
        const msg = U.el('p', 'mu-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, taskBar, stage, askHost, msg, revealHost].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        U.button(buttons, 'Reset').addEventListener('click', () => { solved = {}; cur = null; render(); });
        wrap.appendChild(buttons);

        let cur = null;            // current task id
        let solved = {};           // id -> true once classified correctly
        let guessed = {};          // id -> the option keys already tried

        function seqFor(id) {
            const t = TASKS.filter(x => x.id === id)[0];
            return t ? t.apply(BASE) : BASE;
        }

        function codonRow(seq, compareTo) {
            const cods = codonsOf(seq);
            const aas = translate(seq);
            const baseCods = compareTo ? codonsOf(compareTo) : null;
            const row = U.el('div', 'mu-row');
            cods.forEach((c, i) => {
                const d = U.el('div', 'mu-cod');
                const aa = aas[i];
                const changed = baseCods && baseCods[i] !== c;
                if (changed) d.classList.add('changed');
                if (aa === 'Stop' && baseCods && baseCods[i] !== c) d.classList.add('stopnew');
                if (i >= aas.length) d.classList.add('gone');
                d.innerHTML = '<span class="c">' + c + '</span><span class="a">' +
                    (aa || '—') + '</span>';
                row.appendChild(d);
            });
            return row;
        }

        function render() {
            // task buttons
            taskBar.innerHTML = '';
            TASKS.forEach(t => {
                const b = U.el('button', 'mu-task' + (solved[t.id] ? ' solved' : ''));
                b.type = 'button';
                b.textContent = 'Task ' + t.id;
                b.title = t.name;
                b.setAttribute('aria-pressed', cur === t.id ? 'true' : 'false');
                b.setAttribute('aria-label', 'Task ' + t.id + ': ' + t.name);
                b.addEventListener('click', () => { cur = t.id; msg.textContent = ''; render(); });
                taskBar.appendChild(b);
            });

            stage.innerHTML = ''; askHost.innerHTML = '';

            const l0 = U.el('p', 'mu-lab'); l0.textContent = 'Original mRNA';
            stage.appendChild(l0);
            const s0 = U.el('div', 'mu-seq'); s0.appendChild(codonRow(BASE, null));
            stage.appendChild(s0);

            if (cur == null) {
                const p = U.el('p', 'mu-len');
                p.textContent = 'The protein is ' + BASE_AA.filter(a => a !== 'Stop').length +
                    ' amino acids long, then a stop. Choose a task above to damage it.';
                stage.appendChild(p);
                return;
            }

            const t = TASKS.filter(x => x.id === cur)[0];
            const mutated = seqFor(cur);
            const mAA = translate(mutated);

            const l1 = U.el('p', 'mu-lab');
            l1.textContent = 'After task ' + t.id + ' — ' + t.name.toLowerCase();
            stage.appendChild(l1);
            const s1 = U.el('div', 'mu-seq'); s1.appendChild(codonRow(mutated, BASE));
            stage.appendChild(s1);

            const len = U.el('p', 'mu-len');
            len.textContent = 'Bases: ' + mutated.length + ' (was ' + BASE.length + ')' +
                ' · amino acids before the stop: ' + mAA.filter(a => a !== 'Stop').length +
                ' (was ' + BASE_AA.filter(a => a !== 'Stop').length + ')';
            stage.appendChild(len);

            if (solved[cur]) {
                const w = U.el('div', 'mu-why');
                const p = document.createElement('p'); p.innerHTML = WHY[cur];
                w.appendChild(p); askHost.appendChild(w);
            } else {
                const ask = U.el('div', 'mu-ask');
                const q = document.createElement('p');
                q.textContent = 'What kind of mutation is this? (' + t.hint + ')';
                ask.appendChild(q);
                const opts = U.el('div', 'mu-opts');
                OPTIONS.forEach(o => {
                    const b = U.el('button', 'mu-opt' +
                        ((guessed[cur] || []).indexOf(o.key) > -1 ? ' wrong' : ''));
                    b.type = 'button'; b.textContent = o.label;
                    b.addEventListener('click', () => {
                        if (o.key === t.answer) {
                            solved[cur] = true;
                            msg.textContent = ''; msg.className = 'mu-msg';
                        } else {
                            guessed[cur] = (guessed[cur] || []).concat(o.key);
                            msg.textContent = 'Not quite. Compare the two rows again — how many ' +
                                'codons changed, and did the number of bases stay the same?';
                            msg.className = 'mu-msg bad';
                        }
                        render();
                    });
                    opts.appendChild(b);
                });
                ask.appendChild(opts);
                askHost.appendChild(ask);
            }

            if (Object.keys(solved).length === TASKS.length) showReveal();
        }

        function showReveal() {
            if (revealHost.firstChild) return;
            let rows = '';
            TASKS.forEach(t => {
                const m = seqFor(t.id), a = translate(m);
                const kept = a.filter(x => x !== 'Stop').length;
                rows += '<tr><td>Task ' + t.id + '</td><td>' +
                    OPTIONS.filter(o => o.key === t.answer)[0].label + '</td><td>' +
                    kept + ' amino acids</td></tr>';
            });
            const d = U.el('div', 'mu-reveal');
            d.innerHTML =
                '<h5>Six changes to one base each — and six completely different outcomes.</h5>' +
                '<table class="mu-tbl"><thead><tr><th>Task</th><th>Type</th>' +
                '<th>Protein produced</th></tr></thead><tbody>' + rows + '</tbody></table>' +
                '<p style="margin-top:0.7rem">Line them up and the pattern is clear. A ' +
                '<strong>substitution</strong> changes at most one amino acid, and sometimes none ' +
                'at all. A <strong>frameshift</strong> wrecks everything downstream of it. That is ' +
                'why inserting or deleting a base is usually far more damaging than swapping one — ' +
                'even though it is the same amount of change to the DNA.</p>' +
                '<p>And notice Task 2. Nothing happened. Most mutations are like this: silent, ' +
                'harmless, invisible. A mutation is not automatically a disease — it is a change, ' +
                'and whether it matters depends entirely on where it lands.</p>';
            revealHost.appendChild(d);
        }

        render();

        root._simState = () => ({
            base: BASE, baseProtein: BASE_AA.slice(),
            current: cur, solved: Object.keys(solved).map(Number).sort(),
            complete: Object.keys(solved).length === TASKS.length,
            results: TASKS.map(t => ({
                task: t.id, type: t.answer,
                seq: seqFor(t.id), protein: translate(seqFor(t.id))
            }))
        });
        root._simSolve = () => { TASKS.forEach(t => { solved[t.id] = true; }); cur = 1; render(); };
    };
})();
