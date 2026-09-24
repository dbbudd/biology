/* =============================================================
   INTERACTIVE — From blue to purple: run a gene yourself
   -------------------------------------------------------------
   Registers window.SIMS['u5-follow-the-colours'].  Supports HS-LS1-1.

   The companion to Figure 5.6, drawn in the figure's own colours —
   DNA blue, RNA coral, amino acids purple — so that the picture and
   the practice read as one thing. Every round is a fresh, random gene,
   so it can be repeated until the reasoning is automatic.

   It deliberately practises what 'transcribe-translate' does not:
   STEP 1 "template" — given both strands and the direction RNA
     polymerase travels, commit to which strand is the template. This is
     the antiparallel argument from the chapter, made into a decision.
   STEP 2 "bubble" — add each RNA nucleotide as the polymerase moves,
     then label the 5′ end and say which DNA strand the mRNA matches.
   STEP 3 "ribosome" — find the start codon among leader bases, then
     translate from a codon card salted with the codons a student gets
     by counting threes from the wrong letter, or by reading the
     template instead of the mRNA. Wrong answers are diagnosed by which
     of those mistakes produced them.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-fc-style';

    // ---------------- model ----------------
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
    const FULL = {
        Phe:'phenylalanine', Leu:'leucine', Ile:'isoleucine', Met:'methionine',
        Val:'valine', Ser:'serine', Pro:'proline', Thr:'threonine', Ala:'alanine',
        Tyr:'tyrosine', His:'histidine', Gln:'glutamine', Asn:'asparagine',
        Lys:'lysine', Asp:'aspartic acid', Glu:'glutamic acid', Cys:'cysteine',
        Trp:'tryptophan', Arg:'arginine', Gly:'glycine'
    };
    const DNA_PAIR = { A:'T', T:'A', G:'C', C:'G' };
    const RNA_FOR_TEMPLATE = { A:'U', T:'A', G:'C', C:'G' };
    const RNA_PAIR = { A:'U', U:'A', G:'C', C:'G' };
    const STOPS = ['UAA', 'UAG', 'UGA'];
    const SENSE = Object.keys(AA).filter(c => AA[c] !== 'Stop' && c !== 'AUG');

    const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
    function shuffle(a, r) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // One gene: leader bases, AUG, two sense codons, a stop, one trailing base.
    function makeGene(r) {
        r = r || Math.random;
        const leadLen = 1 + Math.floor(r() * 3);        // 1–3 bases before the start codon
        let leader;
        do {   // the leader must not hide an earlier AUG, or the start codon moves
            leader = '';
            for (let i = 0; i < leadLen; i++) leader += pick(['A', 'U', 'G', 'C'], r);
        } while ((leader + 'AUG').indexOf('AUG') !== leader.length);
        const mids = [pick(SENSE, r), pick(SENSE, r)];
        const stop = pick(STOPS, r);
        const trailer = pick(['A', 'U', 'G', 'C'], r);
        const mrna = leader + 'AUG' + mids.join('') + stop + trailer;
        const coding = mrna.replace(/U/g, 'T');                       // 5′→3′
        const template = coding.split('').map(b => DNA_PAIR[b]).join(''); // aligned, 3′→5′
        const direction = r() < 0.5 ? 'right' : 'left';
        // Step 1 shows the molecule as it lies. Top strand always runs 5′→3′ left to right.
        const top = direction === 'right'
            ? coding
            : coding.split('').reverse().map(b => DNA_PAIR[b]).join('');
        const bottom = top.split('').map(b => DNA_PAIR[b]).join('');
        const start = mrna.indexOf('AUG');
        const codons = ['AUG', mids[0], mids[1], stop];
        return {
            leader, mids, stop, trailer, mrna, coding, template, direction,
            top, bottom, templateStrand: direction === 'right' ? 'bottom' : 'top',
            start, codons, protein: codons.map(c => AA[c])
        };
    }

    // The codons a student produces by mistake at codon k.
    function mistakes(g, k) {
        const i = g.start + 3 * k;
        const shifted = [g.mrna.substr(i + 1, 3), g.mrna.substr(i - 1, 3)].filter(c => c.length === 3);
        const flipped = g.codons[k].split('').map(b => RNA_PAIR[b]).join('');
        return { shifted, flipped };
    }

    // The codon card: the four real codons plus up to four decoys drawn from those mistakes.
    function codonCard(g, r) {
        r = r || Math.random;
        const real = g.codons.slice();
        let decoys = [];
        g.codons.forEach((c, k) => {
            const m = mistakes(g, k);
            decoys = decoys.concat(m.shifted, [m.flipped]);
        });
        decoys = shuffle([...new Set(decoys)].filter(c => real.indexOf(c) < 0 && AA[c]), r).slice(0, 4);
        return [...new Set(real.concat(decoys))].sort();
    }

    // ---------------- styles ----------------
    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.fc { padding: 1rem 1.25rem 0.25rem;',
            '  --fc-dna:#2f7fb7; --fc-dna-fill:#73abd1; --fc-rna:#ef7a68; --fc-rna-fill:#f69282;',
            '  --fc-aa:#6a4577; --fc-aa-fill:#ab80b8; --fc-pol:rgba(150,150,150,0.28);',
            '  --fc-ink:#15151a; --fc-ok:#2e7d32; --fc-bad:#aa272f; }',
            '[data-theme="dark"] .fc { --fc-dna:#4f9bd1; --fc-rna:#f4907f; --fc-aa:#c39bd0;',
            '  --fc-pol:rgba(200,200,200,0.16); --fc-ok:#7fc98a; --fc-bad:#e08a90; }',
            '[data-theme="sepia"] .fc { --fc-ok:#4a6b3d; --fc-bad:#a04040; }',

            '.fc-phase { font-size:0.62rem; font-weight:700; letter-spacing:0.09em; text-transform:uppercase;',
            '  color:var(--text-secondary); margin:0 0 0.35rem; }',
            '.fc-q { font-size:0.9rem; font-weight:600; margin:0 0 0.35rem; line-height:1.45; }',
            '.fc-how { font-size:0.78rem; color:var(--text-secondary); margin:0 0 0.8rem; line-height:1.5; }',
            '.fc-key { display:flex; gap:0.9rem; flex-wrap:wrap; font-size:0.72rem; color:var(--text-secondary);',
            '  margin:0 0 0.8rem; }',
            '.fc-key span::before { content:""; display:inline-block; width:0.8em; height:0.8em; border-radius:2px;',
            '  margin-right:0.35em; vertical-align:-0.1em; border:1px solid var(--fc-ink); }',
            '.fc-key .k-dna::before{background:var(--fc-dna-fill)} .fc-key .k-rna::before{background:var(--fc-rna-fill)}',
            '.fc-key .k-aa::before{background:var(--fc-aa-fill)}',

            '.fc-scroll { overflow-x:auto; padding:0.2rem 0 0.4rem; }',
            '.fc-scroll.roomy { padding-bottom:1.5rem; }',
            '.fc-mol { display:inline-grid; grid-auto-flow:column; column-gap:3px; align-items:center; position:relative; }',
            '.fc-end { font-weight:700; font-size:0.85rem; width:26px; text-align:center; color:var(--text); }',
            '.fc-bb { height:9px; border-radius:5px; background:var(--fc-dna); border:1.5px solid var(--fc-ink); }',
            '.fc-bb.rna { background:var(--fc-rna); }',
            '.fc-base { width:32px; height:30px; display:flex; align-items:center; justify-content:center;',
            '  font-weight:700; font-size:0.9rem; color:#111; border:1.5px solid var(--fc-ink); box-sizing:border-box; }',
            '.fc-base.dna { background:var(--fc-dna-fill); }',
            '.fc-base.rna { background:var(--fc-rna-fill); }',
            '.fc-base.up { border-radius:0 0 6px 6px; } .fc-base.down { border-radius:6px 6px 0 0; }',
            '.fc-base.slot { background:transparent; border:1.5px dashed var(--border); color:var(--text-secondary); }',
            '.fc-base.slot.now { border:2px solid var(--fc-rna); box-shadow:0 0 0 3px rgba(239,122,104,0.25); }',
            '.fc-base.faded { opacity:0.38; }',
            '.fc-base.hit { box-shadow:0 0 0 3px var(--fc-ok); }',
            'button.fc-base { font:inherit; font-weight:700; cursor:pointer; padding:0; }',
            'button.fc-base:hover { filter:brightness(1.07); box-shadow:0 0 0 3px var(--light-teal); }',
            'button.fc-base:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.fc-lab { font-size:0.68rem; color:var(--text-secondary); white-space:nowrap; padding-left:0.5rem; }',
            '.fc-pol { position:absolute; border-radius:22px; background:var(--fc-pol);',
            '  border:1.5px solid rgba(120,120,120,0.55); pointer-events:none; transition:left 0.25s ease; }',
            '.fc-pol b { position:absolute; bottom:-2.1rem; left:50%; transform:translateX(-50%); white-space:nowrap;',
            '  font-size:0.62rem; font-weight:600; color:var(--text-secondary); }',

            '.fc-arrow { font-size:0.8rem; font-weight:600; margin:0.1rem 0 0.4rem; color:var(--text); }',
            '.fc-arrow i { font-style:normal; font-size:1.2rem; vertical-align:-0.1em; color:var(--fc-ink); }',
            '[data-theme="dark"] .fc-arrow i { color:var(--text); }',

            '.fc-choices { display:flex; gap:0.5rem; flex-wrap:wrap; margin:0.8rem 0 0.2rem; }',
            '.fc-choice { font:inherit; font-size:0.85rem; padding:0.45rem 0.9rem; border-radius:8px; cursor:pointer;',
            '  background:var(--bg); color:var(--text); border:1.5px solid var(--border); }',
            '.fc-choice:hover { border-color:var(--light-teal); }',
            '.fc-choice:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.fc-choice.wrong { border-color:var(--fc-bad); color:var(--fc-bad); }',
            '.fc-choice.right { border-color:var(--fc-ok); color:var(--fc-ok); font-weight:700; }',

            '.fc-pal { display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center; margin:0.9rem 0 0.2rem; }',
            '.fc-tile { font:inherit; width:44px; height:42px; border-radius:8px; cursor:pointer; font-weight:800; font-size:1rem;',
            '  background:var(--bg); color:var(--text); border:2px solid var(--fc-rna); }',
            '.fc-tile:hover { background:var(--fc-rna-fill); color:#111; }',
            '.fc-tile:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.fc-hint { font-size:0.72rem; color:var(--text-secondary); margin-left:0.3rem; }',

            '.fc-codons { display:inline-grid; grid-auto-flow:column; column-gap:3px; margin-top:2px; }',
            '.fc-br { height:9px; border:2px solid var(--fc-ink); border-top:0; margin:0 3px; }',
            '[data-theme="dark"] .fc-br { border-color:var(--text-secondary); }',
            '.fc-br.now { border-color:var(--fc-aa); box-shadow:0 3px 0 -1px var(--fc-aa); }',
            '.fc-chain { display:flex; align-items:center; gap:0; flex-wrap:wrap; min-height:44px; margin:0.7rem 0 0.2rem; }',
            '.fc-bead { min-width:58px; height:38px; padding:0 0.6rem; border-radius:19px; display:flex; align-items:center;',
            '  justify-content:center; background:var(--fc-aa-fill); border:2px solid var(--fc-aa); color:#111;',
            '  font-weight:600; font-size:0.85rem; margin-right:-6px; box-sizing:border-box; }',
            '.fc-bead.empty { background:transparent; border-style:dashed; border-color:var(--border); color:var(--text-secondary); margin-right:6px; }',
            '.fc-card { display:grid; grid-template-columns:repeat(auto-fill, minmax(118px, 1fr)); gap:0.35rem;',
            '  margin:0.6rem 0 0; }',
            '.fc-card div { display:flex; align-items:center; gap:0.35rem; font-size:0.78rem; border:1px solid var(--border);',
            '  border-radius:7px; padding:0.25rem 0.4rem; }',
            '.fc-card b { background:var(--fc-rna-fill); color:#111; border-radius:4px; padding:0.05rem 0.3rem;',
            '  letter-spacing:0.05em; font-size:0.74rem; }',
            '.fc-card-title { font-size:0.62rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;',
            '  color:var(--text-secondary); margin:0.9rem 0 0; }',
            '.fc-beads { display:flex; gap:0.4rem; flex-wrap:wrap; margin:0.8rem 0 0.2rem; }',
            '.fc-pick { font:inherit; font-size:0.82rem; font-weight:600; height:38px; min-width:64px; padding:0 0.7rem;',
            '  border-radius:19px; cursor:pointer; background:var(--fc-aa-fill); color:#111; border:2px solid var(--fc-aa); }',
            '.fc-pick.stop { background:var(--bg); color:var(--text); border-style:dashed; }',
            '.fc-pick:hover { filter:brightness(1.08); box-shadow:0 0 0 3px var(--light-teal); }',
            '.fc-pick:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',

            '.fc-msg { margin:0.85rem 0 0; font-size:0.84rem; line-height:1.55; min-height:2.6em; }',
            '.fc-msg.ok { color:var(--fc-ok); } .fc-msg.bad { color:var(--fc-bad); }',
            '.fc-reveal { margin-top:1rem; border:1px solid var(--fc-ok); border-radius:10px; padding:0.85rem 1rem;',
            '  background:rgba(46,125,50,0.07); }',
            '[data-theme="dark"] .fc-reveal { background:rgba(127,201,138,0.1); }',
            '.fc-reveal h5 { margin:0 0 0.5rem; font-size:0.92rem; }',
            '.fc-reveal p { margin:0 0 0.55rem; font-size:0.84rem; line-height:1.55; }',
            '.fc-strip { display:flex; flex-wrap:wrap; gap:0.3rem; align-items:center; margin:0.2rem 0 0.5rem; }',
            '.fc-strip .fc-base { width:26px; height:26px; font-size:0.78rem; border-radius:5px; }',
            '.fc-strip .fc-lab { padding:0 0.4rem 0 0; min-width:9rem; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    // ---------------- the sim ----------------
    window.SIMS['u5-follow-the-colours'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'fc');
        wrap.tabIndex = -1;
        const phase = U.el('p', 'fc-phase');
        const q = U.el('p', 'fc-q');
        const how = U.el('p', 'fc-how');
        const key = U.el('div', 'fc-key');
        key.innerHTML = '<span class="k-dna">DNA</span><span class="k-rna">RNA</span><span class="k-aa">Amino acids</span>';
        const stage = U.el('div');
        const msg = U.el('p', 'fc-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const reveal = U.el('div');
        [phase, q, how, key, stage, msg, reveal].forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const nextBtn = U.button(buttons, 'Next');
        const newBtn = U.button(buttons, 'Try a new gene');
        wrap.appendChild(buttons);

        let g, card, st;

        function newGene() {
            g = makeGene();
            card = codonCard(g);
            st = {
                step: 'template',          // template → bubble → ends → match → start → translate → done
                templatePick: null, templateTries: 0,
                rna: [], endPick: null, endPickWrong: null, matchPick: null,
                startPick: null, cur: 0, chain: [], wrongOnCodon: 0
            };
            say('', '');
            reveal.innerHTML = '';
            render();
        }
        function say(text, cls) { msg.textContent = text; msg.className = 'fc-msg' + (cls ? ' ' + cls : ''); }

        const N = () => g.mrna.length;
        const baseEl = (ch, cls) => { const e = U.el('div', 'fc-base ' + cls); e.textContent = ch; return e; };
        function end(t) { const e = U.el('div', 'fc-end'); e.textContent = t; return e; }
        function bar(cls, span) { const e = U.el('div', 'fc-bb' + (cls ? ' ' + cls : '')); e.style.gridColumn = span; return e; }

        // Grid helper: columns = [end label] + N bases + [end label] + [strand label]
        function molecule(rows) {
            const m = U.el('div', 'fc-mol');
            m.style.gridTemplateColumns = '26px repeat(' + N() + ', 32px) 26px auto';
            m.style.gridTemplateRows = 'repeat(' + rows + ', auto)';
            m.style.gridAutoFlow = 'row';
            return m;
        }
        function put(m, el, row, col) { el.style.gridRow = row; if (col !== undefined) el.style.gridColumn = col; m.appendChild(el); }
        function label(t) { const e = U.el('div', 'fc-lab'); e.textContent = t; return e; }

        // ---------- STEP 1: which strand is the template? ----------
        function drawTemplate() {
            phase.textContent = 'Step 1 of 3 — find the template strand';
            q.textContent = 'RNA polymerase is about to transcribe this gene, travelling in the direction of the arrow. Which strand will it read?';
            how.textContent = 'Remember two rules: RNA is always built 5′ → 3′, and paired strands always run in opposite directions.';

            const arrow = U.el('p', 'fc-arrow');
            arrow.innerHTML = g.direction === 'right'
                ? 'RNA polymerase travels this way &nbsp;<i>&#10230;</i>'
                : '<i>&#10229;</i>&nbsp; RNA polymerase travels this way';
            stage.appendChild(arrow);

            const sc = U.el('div', 'fc-scroll');
            const m = molecule(4);
            const last = N() + 2;
            put(m, end('5′'), 1, 1); put(m, bar('', '2 / ' + last), 1); put(m, end('3′'), 1, last);
            put(m, end('3′'), 4, 1); put(m, bar('', '2 / ' + last), 4); put(m, end('5′'), 4, last);
            for (let i = 0; i < N(); i++) {
                put(m, baseEl(g.top[i], 'dna up'), 2, i + 2);
                put(m, baseEl(g.bottom[i], 'dna down'), 3, i + 2);
            }
            put(m, label(st.step !== 'template' ? (g.templateStrand === 'top' ? 'template strand' : 'coding strand') : 'top strand'), 1, last + 1);
            put(m, label(st.step !== 'template' ? (g.templateStrand === 'bottom' ? 'template strand' : 'coding strand') : 'bottom strand'), 4, last + 1);
            sc.appendChild(m); stage.appendChild(sc);

            const ch = U.el('div', 'fc-choices');
            ['top', 'bottom'].forEach(which => {
                const b = U.el('button', 'fc-choice');
                b.type = 'button';
                b.textContent = 'The ' + which + ' strand is the template';
                if (st.templatePick === which) b.classList.add(which === g.templateStrand ? 'right' : 'wrong');
                b.disabled = st.step !== 'template';
                b.addEventListener('click', () => chooseTemplate(which));
                ch.appendChild(b);
            });
            stage.appendChild(ch);
            nextBtn.textContent = 'Unzip the gene';
            nextBtn.hidden = st.step !== 'template-done';
        }
        function chooseTemplate(which) {
            st.templatePick = which; st.templateTries++;
            const along = g.direction === 'right' ? 'left to right' : 'right to left';
            if (which === g.templateStrand) {
                st.step = 'template-done';
                const coding = g.templateStrand === 'bottom' ? 'top' : 'bottom';
                say('Yes. Follow the ' + which + ' strand ' + along + ': it runs 3′ → 5′. The new RNA grows 5′ → 3′ in that same direction, so the two run opposite ways — antiparallel — and they can pair. ' +
                    'Check it another way: read the ' + coding + ' strand 5′ → 3′ and you will find ATG, the start of the gene.', 'ok');
            } else {
                say('Follow the ' + which + ' strand ' + along + ': it runs 5′ → 3′ — the same way the RNA will grow. Two strands that pair must run in opposite directions, so the RNA cannot be built against this one. Try the other strand.', 'bad');
            }
            render();
        }

        // ---------- STEP 2: the transcription bubble ----------
        function drawBubble() {
            const building = st.step === 'bubble';
            phase.textContent = 'Step 2 of 3 — transcription, in the nucleus';
            if (building) {
                q.textContent = 'Add each RNA nucleotide as RNA polymerase moves along the template.';
                how.textContent = (g.direction === 'left'
                    ? 'We have turned the molecule round so the template is at the bottom, as in Figure 5.6. Turning a molecule over does not change it — its 5′ and 3′ ends turn with it. '
                    : 'The template is at the bottom, as in Figure 5.6. ') +
                    'Click a letter or type it on your keyboard.';
            } else if (st.step === 'ends') {
                q.textContent = 'The finished RNA peels away. Which end is its 5′ end?';
                how.textContent = 'Think about which nucleotide was added first, and which end the polymerase keeps adding to.';
            } else {
                q.textContent = 'Your mRNA matches one of the two DNA strands letter for letter (with U in place of T). Which one?';
                how.textContent = 'This is the free check from the chapter — compare the coral row with each blue row.';
            }

            const sc = U.el('div', 'fc-scroll' + (building ? ' roomy' : ''));
            const m = molecule(6);
            const last = N() + 2;
            const pos = st.rna.length;
            put(m, end('5′'), 1, 1); put(m, bar('', '2 / ' + last), 1); put(m, end('3′'), 1, last);
            put(m, label('coding strand'), 1, last + 1);
            put(m, end('3′'), 5, 1); put(m, bar('', '2 / ' + last), 5); put(m, end('5′'), 5, last);
            put(m, label('template strand'), 5, last + 1);
            for (let i = 0; i < N(); i++) {
                put(m, baseEl(g.coding[i], 'dna up'), 2, i + 2);
                let r;
                if (i < pos) r = baseEl(st.rna[i], 'rna' + (st.step === 'match' && st.matchPick === 'coding' ? ' hit' : ''));
                else r = baseEl(i === pos ? '?' : '', 'slot' + (i === pos && building ? ' now' : ''));
                put(m, r, 3, i + 2);
                put(m, baseEl(g.template[i], 'dna down'), 4, i + 2);
            }
            if (building) {
                put(m, end(pos ? '5′' : ''), 3, 1);
                const pol = U.el('div', 'fc-pol');
                pol.innerHTML = '<b>RNA polymerase</b>';
                m.appendChild(pol);
                requestAnimationFrame(() => placePolymerase(m, pol, pos));
            } else {
                // the RNA row gets its own end buttons in the "ends" step
                ['left', 'right'].forEach(side => {
                    const b = U.el('button', 'fc-choice');
                    b.type = 'button';
                    b.style.padding = '0.1rem 0.3rem'; b.style.fontSize = '0.72rem';
                    const shown = st.endPick ? (side === 'left' ? '5′' : '3′') : '?';
                    b.textContent = st.step === 'ends' && !st.endPick ? '?' : shown;
                    if (st.step === 'ends' && st.endPickWrong === side) { b.classList.add('wrong'); }
                    b.setAttribute('aria-label', 'The ' + side + ' end of the RNA is the 5′ end');
                    b.disabled = st.step !== 'ends';
                    b.addEventListener('click', () => chooseEnd(side));
                    put(m, b, 3, side === 'left' ? 1 : last);
                });
                put(m, label('mRNA'), 3, last + 1);
            }
            sc.appendChild(m); stage.appendChild(sc);

            if (building) {
                const pal = U.el('div', 'fc-pal');
                ['A', 'U', 'G', 'C', 'T'].forEach(b => {
                    const t = U.el('button', 'fc-tile');
                    t.type = 'button'; t.textContent = b;
                    t.setAttribute('aria-label', 'Add ' + b);
                    t.addEventListener('click', () => addBase(b));
                    pal.appendChild(t);
                });
                const h = U.el('span', 'fc-hint');
                h.textContent = (pos) + ' of ' + N() + ' added. One of these five letters never appears in RNA.';
                pal.appendChild(h);
                stage.appendChild(pal);
            }
            if (st.step === 'match') {
                const ch = U.el('div', 'fc-choices');
                [['coding', 'The coding strand'], ['template', 'The template strand']].forEach(([k, t]) => {
                    const b = U.el('button', 'fc-choice');
                    b.type = 'button'; b.textContent = t;
                    if (st.matchPick === k) b.classList.add(k === 'coding' ? 'right' : 'wrong');
                    b.disabled = st.matchPick === 'coding';
                    b.addEventListener('click', () => chooseMatch(k));
                    ch.appendChild(b);
                });
                stage.appendChild(ch);
            }
            nextBtn.textContent = 'Send the mRNA to a ribosome';
            nextBtn.hidden = !(st.step === 'match' && st.matchPick === 'coding');
        }
        function placePolymerase(m, pol, pos) {
            const cells = m.querySelectorAll('.fc-base');
            // cells are appended 3 per column: coding, rna, template
            const i = Math.min(pos, N() - 1);
            const a = cells[Math.max(0, i - 1) * 3], b = cells[Math.min(N() - 1, i + 1) * 3 + 2];
            if (!a || !b) return;
            const mr = m.getBoundingClientRect(), ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
            pol.style.left = (ar.left - mr.left - 8) + 'px';
            pol.style.top = (ar.top - mr.top - 6) + 'px';
            pol.style.width = (br.right - ar.left + 16) + 'px';
            pol.style.height = (br.bottom - ar.top + 12) + 'px';
        }
        function addBase(b) {
            if (st.step !== 'bubble') return;
            const i = st.rna.length;
            const t = g.template[i];
            const want = RNA_FOR_TEMPLATE[t];
            if (b === want) {
                st.rna.push(b);
                say(t + ' on the template pairs with ' + b + '.' + (want === 'U' ? ' RNA uses U wherever DNA would use T.' : ''), 'ok');
                if (st.rna.length === N()) {
                    st.step = 'ends';
                    say('Transcription is finished. The polymerase lets go, and the DNA zips shut again — unchanged.', 'ok');
                }
            } else if (b === 'T') {
                say('RNA never contains T. Opposite an A on the template, RNA puts U (uracil).', 'bad');
            } else if (b === t) {
                say('That copies the template letter. RNA pairs with the template instead: A with U, T with A, G with C, C with G. This one is ' + t + '.', 'bad');
            } else {
                say('The template letter here is ' + t + '. Which RNA base pairs with ' + t + '?', 'bad');
            }
            render();
        }
        function chooseEnd(side) {
            if (side === 'left') {
                st.endPick = 'left'; st.endPickWrong = null; st.step = 'match';
                say('Right. The left end was built first, so it is the 5′ end — and it was the first part to leave the polymerase. Every new nucleotide is added to the 3′ end, which is why RNA grows 5′ → 3′.', 'ok');
            } else {
                st.endPickWrong = 'right';
                say('The right end was the last one added. Nucleotides are always added to the 3′ end, so the end that was added last is the 3′ end. Try the other end.', 'bad');
            }
            render();
        }
        function chooseMatch(k) {
            st.matchPick = k;
            if (k === 'coding') {
                say('Yes — read the top blue row against the coral row. They are the same message, except that DNA uses T where RNA uses U. That is how the coding strand earns its name, and why you can always check your mRNA against it.', 'ok');
            } else {
                say('The template is the strand the RNA paired with, so every letter is its partner, not its copy — A opposite U, G opposite C. Compare the coral row with the other blue row.', 'bad');
            }
            render();
        }

        // ---------- STEP 3: at the ribosome ----------
        function drawRibosome() {
            phase.textContent = 'Step 3 of 3 — translation, at a ribosome';
            if (st.step === 'start') {
                q.textContent = 'The ribosome slides along the mRNA from its 5′ end. Click the base where it starts reading.';
                how.textContent = 'It does not start at the very first letter. It starts at the start codon.';
            } else if (st.step === 'translate') {
                q.textContent = 'Translate codon ' + (st.cur + 1) + ': ' + g.codons[st.cur] + '. Find it on the codon card, then pick its amino acid.';
                how.textContent = 'Careful — the card also lists codons you would get by counting threes from the wrong letter.';
            } else {
                q.textContent = 'Translation is complete.';
                how.textContent = '';
            }

            const sc = U.el('div', 'fc-scroll');
            const m = U.el('div', 'fc-mol');
            m.style.gridTemplateColumns = '26px repeat(' + N() + ', 32px) 26px auto';
            const last = N() + 2;
            put(m, end('5′'), 1, 1); put(m, bar('rna', '2 / ' + last), 1); put(m, end('3′'), 1, last);
            put(m, label('mRNA'), 2, last + 1);
            const beyond = g.start + 12;
            for (let i = 0; i < N(); i++) {
                let e;
                if (st.step === 'start') {
                    e = U.el('button', 'fc-base rna up');
                    e.type = 'button'; e.textContent = g.mrna[i];
                    e.setAttribute('aria-label', 'Base ' + (i + 1) + ', ' + g.mrna[i]);
                    e.addEventListener('click', () => chooseStart(i));
                } else {
                    e = baseEl(g.mrna[i], 'rna up' + (i < g.start || i >= beyond ? ' faded' : ''));
                }
                put(m, e, 2, i + 2);
            }
            if (st.step !== 'start') {
                for (let k = 0; k < 4; k++) {
                    const br = U.el('div', 'fc-br' + (st.step === 'translate' && k === st.cur ? ' now' : ''));
                    put(m, br, 3, (g.start + 2 + 3 * k) + ' / span 3');
                }
            }
            sc.appendChild(m); stage.appendChild(sc);

            if (st.step === 'start') { nextBtn.hidden = true; return; }

            const chain = U.el('div', 'fc-chain');
            chain.setAttribute('aria-label', 'Polypeptide chain');
            st.chain.forEach(a => { const b = U.el('div', 'fc-bead'); b.textContent = a; chain.appendChild(b); });
            if (st.step === 'translate') { const e = U.el('div', 'fc-bead empty'); e.textContent = '?'; chain.appendChild(e); }
            stage.appendChild(chain);

            if (st.step === 'translate') {
                const t = U.el('p', 'fc-card-title'); t.textContent = 'Codon card';
                stage.appendChild(t);
                const c = U.el('div', 'fc-card');
                card.forEach(cod => {
                    const d = U.el('div');
                    d.innerHTML = '<b>' + cod + '</b>' + (AA[cod] === 'Stop' ? 'stop' : AA[cod]);
                    c.appendChild(d);
                });
                stage.appendChild(c);

                const beads = U.el('div', 'fc-beads');
                const names = [...new Set(card.map(cod => AA[cod]).filter(a => a !== 'Stop'))].sort();
                names.concat(['Stop']).forEach(a => {
                    const b = U.el('button', 'fc-pick' + (a === 'Stop' ? ' stop' : ''));
                    b.type = 'button'; b.textContent = a === 'Stop' ? 'Stop — release the chain' : a;
                    b.addEventListener('click', () => chooseAA(a));
                    beads.appendChild(b);
                });
                stage.appendChild(beads);
            }
            nextBtn.hidden = true;
        }
        function chooseStart(i) {
            if (i === g.start) {
                st.step = 'translate'; st.startPick = i;
                say('Found it: A-U-G. From here the message is read in threes, and each three is a codon.', 'ok');
            } else if (i === 0) {
                say('Not the very first letter — the ribosome slides along from the 5′ end until it meets a start codon. Look for A, U, G in a row.', 'bad');
            } else {
                say('The letters starting there are ' + g.mrna.substr(i, 3) + ', not AUG. Look for A, U, G in a row.', 'bad');
            }
            render();
        }
        function chooseAA(a) {
            const k = st.cur, cod = g.codons[k], want = AA[cod];
            if (a === want) {
                st.wrongOnCodon = 0;
                if (want === 'Stop') {
                    st.step = 'done';
                    say(cod + ' is a stop codon. No amino acid is added — the ribosome lets go of the chain. Anything after it is never read.', 'ok');
                    showReveal();
                } else {
                    st.chain.push(want); st.cur++;
                    say(cod + ' codes for ' + FULL[want] + (k === 0 ? ' — AUG is the start codon, so almost every protein begins with methionine.' : '.'), 'ok');
                }
            } else {
                st.wrongOnCodon++;
                const mk = mistakes(g, k);
                const shiftHit = mk.shifted.some(c => AA[c] === a);
                const flipHit = AA[mk.flipped] === a;
                if (st.wrongOnCodon >= 2) {
                    say('Look for ' + cod + ' exactly, letter by letter, on the card: it codes for ' + (want === 'Stop' ? 'stop' : want) + '.', 'bad');
                } else if (shiftHit) {
                    say('That is what you get by starting the three one letter too early or too late. Codons are counted in threes from the A of AUG — use the brackets under the mRNA.', 'bad');
                } else if (flipHit) {
                    say('That comes from ' + mk.flipped + ', the partner letters of ' + cod + '. The ribosome reads the mRNA itself, not the strand it was copied from.', 'bad');
                } else {
                    say('Not that one. Find ' + cod + ' on the codon card.', 'bad');
                }
            }
            render();
        }

        function showReveal() {
            const d = U.el('div', 'fc-reveal');
            const row = (lab, seq, cls) => {
                const r = U.el('div', 'fc-strip');
                const l = U.el('span', 'fc-lab'); l.textContent = lab; r.appendChild(l);
                seq.split('').forEach(ch => r.appendChild(baseEl(ch, cls)));
                return r;
            };
            d.innerHTML = '<h5>Blue, then coral, then purple — you ran the whole of Figure 5.6.</h5>';
            d.appendChild(row('template DNA, 3′ → 5′', g.template, 'dna'));
            d.appendChild(row('mRNA, 5′ → 3′', g.mrna, 'rna'));
            const pr = U.el('div', 'fc-strip');
            const pl = U.el('span', 'fc-lab'); pl.textContent = 'polypeptide'; pr.appendChild(pl);
            st.chain.forEach(a => { const b = U.el('div', 'fc-bead'); b.textContent = a; b.style.marginRight = '0'; pr.appendChild(b); });
            d.appendChild(pr);
            const p = U.el('p');
            p.innerHTML = 'Notice that <strong>blue never touches purple</strong>. The DNA stays in the nucleus; only the coral copy travels to the ribosome. ' +
                'That is why the same gene can be read thousands of times without being used up — and why changing a single blue letter can change a purple one, which is exactly where the next chapter begins.';
            d.appendChild(p);
            reveal.appendChild(d);
        }

        function render() {
            stage.innerHTML = '';
            if (st.step === 'template' || st.step === 'template-done') drawTemplate();
            else if (st.step === 'bubble' || st.step === 'ends' || st.step === 'match') drawBubble();
            else drawRibosome();
        }

        nextBtn.addEventListener('click', () => {
            if (st.step === 'template-done') { st.step = 'bubble'; say('', ''); }
            else if (st.step === 'match' && st.matchPick === 'coding') {
                st.step = 'start';
                say('The mRNA leaves the nucleus through a pore and meets a ribosome in the cytoplasm.', '');
            }
            render();
        });
        newBtn.addEventListener('click', newGene);
        wrap.addEventListener('keydown', e => {
            if (st.step !== 'bubble' || e.ctrlKey || e.metaKey || e.altKey) return;
            const k = e.key.toUpperCase();
            if (['A', 'U', 'G', 'C', 'T'].indexOf(k) >= 0) { e.preventDefault(); addBase(k); }
        });

        newGene();

        root._simState = () => ({
            step: st.step, direction: g.direction, templateStrand: g.templateStrand,
            top: g.top, bottom: g.bottom, coding: g.coding, template: g.template,
            mrna: g.mrna, start: g.start, codons: g.codons.slice(), protein: g.protein.slice(),
            card: card.slice(), rnaBuilt: st.rna.join(''), templateTries: st.templateTries,
            endPick: st.endPick, matchPick: st.matchPick, chain: st.chain.slice(),
            complete: st.step === 'done'
        });
        root._simSolve = () => {
            if (st.step === 'template') chooseTemplate(g.templateStrand);
            else if (st.step === 'template-done') nextBtn.click();
            else if (st.step === 'bubble') { while (st.step === 'bubble') addBase(RNA_FOR_TEMPLATE[g.template[st.rna.length]]); }
            else if (st.step === 'ends') chooseEnd('left');
            else if (st.step === 'match') { if (st.matchPick !== 'coding') chooseMatch('coding'); else nextBtn.click(); }
            else if (st.step === 'start') chooseStart(g.start);
            else if (st.step === 'translate') { while (st.step === 'translate') chooseAA(AA[g.codons[st.cur]]); }
        };
    };
    window.SIMS['u5-follow-the-colours'].model = { makeGene, codonCard, mistakes, AA };
})();
