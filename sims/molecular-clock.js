/* =============================================================
   INTERACTIVE — Molecular clocks
   -------------------------------------------------------------
   Registers window.SIMS['molecular-clock'].  Supports HS-LS4-1.

   Two lineages diverge from a common ancestor. Mutations build up
   along BOTH branches, so the differences you measure between the
   two living species are the sum of two branches, not one. The
   reader sets the age of the split and the mutation rate, reads the
   number of differences off the model, and then has to work the age
   back out — which is where the divide-by-two error shows up.

   Model
     Each branch accumulates r * t changes. Some fall on sites that
     already changed, so the number you can actually count saturates:
       observed = L * (1 - exp(-2 r t / L))
     For a young split that is near 2 r t and the clock works. For an
     old split it flattens towards L and the clock stops telling you
     anything, which is the second caution in the chapter.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    const W = 680, H = 280, L = 300;            // L = comparable sites
    const PAD = { l: 56, r: 24, t: 30, b: 46 };

    window.SIMS['molecular-clock'] = function (root) {
        injectCss();

        const { ctx } = U.stage(root, W, H,
            'A common ancestor splitting into two lineages. Tick marks along each branch show ' +
            'mutations building up separately on both sides since the split.');

        const controls = U.el('div', 'sim-controls');
        const age  = U.slider(controls, 'age',  'Time since the split', 1, 100, 30, v => v + ' million years');
        const rate = U.slider(controls, 'rate', 'Mutation rate', 1, 20, 10,
            v => (v / 10).toFixed(1) + ' changes per million years, per branch');

        const readout = U.el('div', 'sim-readout');

        // --- the task ------------------------------------------------
        const task = U.el('div', 'mc-task');
        task.innerHTML =
            '<p class="mc-q">Now work backwards. You measure the differences above but you do ' +
            '<em>not</em> know the age. Using the mutation rate, how long ago did these two ' +
            'species share a common ancestor?</p>' +
            '<div class="mc-row">' +
              '<label for="mc-guess">My estimate</label>' +
              '<input id="mc-guess" type="number" min="0" step="0.5" inputmode="decimal">' +
              '<span class="mc-unit">million years</span>' +
              '<button type="button" class="sim-btn primary mc-check">Check</button>' +
              '<button type="button" class="sim-btn mc-new">New split</button>' +
            '</div>' +
            '<div class="mc-feedback" role="status" aria-live="polite"></div>';

        root.appendChild(controls);
        root.appendChild(readout);
        root.appendChild(task);

        const input = task.querySelector('#mc-guess');
        const feedback = task.querySelector('.mc-feedback');
        const theme = U.theme(() => draw());

        // --- model ----------------------------------------------------
        const t = () => age.value;                   // million years
        const r = () => rate.value / 10;             // changes per My per branch
        const perBranch = () => r() * t();
        const observed = () => Math.round(L * (1 - Math.exp(-2 * r() * t() / L)));
        const saturation = () => observed() / L;

        function draw() {
            const th = theme.current;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
            const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
            const xSplit = PAD.l + 40, xEnd = PAD.l + pw;
            const yMid = PAD.t + ph / 2, yA = PAD.t + 26, yB = PAD.t + ph - 26;

            // ancestor stem and the split
            ctx.strokeStyle = th.axis; ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(PAD.l - 24, yMid); ctx.lineTo(xSplit, yMid);
            ctx.moveTo(xSplit, yA); ctx.lineTo(xSplit, yB);
            ctx.moveTo(xSplit, yA); ctx.lineTo(xEnd, yA);
            ctx.moveTo(xSplit, yB); ctx.lineTo(xEnd, yB);
            ctx.stroke();

            // mutations as ticks along each branch — same count per branch
            const n = Math.round(perBranch());
            const shown = Math.min(n, 34);
            const span = xEnd - xSplit;
            [[yA, th.red], [yB, th.blue]].forEach(([y, colour]) => {
                ctx.strokeStyle = colour; ctx.lineWidth = 2;
                for (let i = 0; i < shown; i++) {
                    const x = xSplit + span * ((i + 0.5) / shown);
                    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
                }
            });

            ctx.font = '12px system-ui, sans-serif';
            ctx.fillStyle = th.ink; ctx.textAlign = 'right';
            ctx.fillText('Common', PAD.l - 30, yMid - 4);
            ctx.fillText('ancestor', PAD.l - 30, yMid + 12);
            ctx.textAlign = 'left';
            ctx.fillStyle = th.red;  ctx.fillText('Species A', xEnd + 4, yA + 4);
            ctx.fillStyle = th.blue; ctx.fillText('Species B', xEnd + 4, yB + 4);

            // per-branch counts
            ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
            ctx.fillStyle = th.axis;
            const label = n === shown ? `${n} changes` : `${n} changes (${shown} drawn)`;
            ctx.fillText(label, (xSplit + xEnd) / 2, yA - 16);
            ctx.fillText(label, (xSplit + xEnd) / 2, yB + 26);

            // time axis
            ctx.strokeStyle = th.grid; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(xSplit, H - PAD.b + 12); ctx.lineTo(xEnd, H - PAD.b + 12); ctx.stroke();
            ctx.fillStyle = th.axis; ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'left';  ctx.fillText('the split', xSplit, H - PAD.b + 28);
            ctx.textAlign = 'right'; ctx.fillText('today', xEnd, H - PAD.b + 28);
            ctx.textAlign = 'center';
            ctx.fillText(t() + ' million years', (xSplit + xEnd) / 2, H - PAD.b + 28);
        }

        function describe() {
            const n = Math.round(perBranch()), d = observed();
            const sat = saturation();
            let note = '';
            if (sat > 0.7) {
                note = '<br><strong>Careful.</strong> So many sites have changed that new mutations ' +
                       'keep landing on sites that already changed. The count you can measure has ' +
                       'flattened off, and this clock can no longer date a split this old — you would ' +
                       'need a slower-ticking gene.';
            } else if (sat > 0.4) {
                note = '<br>Notice the measured total is now a little below A + B. Some changes are ' +
                       'landing on sites that already changed, so you cannot count them twice.';
            }
            readout.innerHTML =
                `<strong>${n} changes on branch A · ${n} on branch B.</strong> ` +
                `Differences you could actually measure between the two species: ` +
                `<strong>${d}</strong> out of ${L} sites.` + note;
        }

        function check() {
            const guess = parseFloat(input.value);
            const real = t(), d = observed(), rr = r();
            if (!isFinite(guess)) {
                feedback.className = 'mc-feedback show warn';
                feedback.textContent = 'Enter a number first.';
                return;
            }
            const right = d / (2 * rr);          // the correct working
            const halved = d / rr;               // the classic error
            const near = (a, b) => Math.abs(a - b) <= Math.max(1.5, b * 0.12);
            feedback.className = 'mc-feedback show';
            // Too few differences to date anything. Marking an answer right or
            // wrong here would teach the wrong lesson: the honest answer is
            // that this gene cannot date a split this recent.
            if (d < 5) {
                feedback.classList.add('warn');
                feedback.innerHTML =
                    `<strong>There is almost nothing to count.</strong> Only ${d} ` +
                    `difference${d === 1 ? '' : 's'} have built up, so any date you calculate ` +
                    `rests on a handful of changes and one chance mutation either way would ` +
                    `swing it wildly. A slow-ticking gene cannot date a split this recent — ` +
                    `you need a gene that changes faster.`;
                return;
            }
            if (near(guess, right)) {
                feedback.classList.add('good');
                feedback.innerHTML =
                    `<strong>That's it.</strong> ${d} differences ÷ (2 × ${rr.toFixed(1)}) = ` +
                    `${right.toFixed(1)} million years. You divided by two because the changes ` +
                    `built up along <em>both</em> branches since the split — ${Math.round(perBranch())} ` +
                    `down each side, not ${d} down one.` +
                    (saturation() > 0.4 ? ' Your answer is a slight underestimate, because some ' +
                    'changes are hidden on sites that changed more than once.' : '');
            } else if (near(guess, halved)) {
                feedback.classList.add('bad');
                feedback.innerHTML =
                    `<strong>Exactly double.</strong> This is the most common mistake with a ` +
                    `molecular clock. You divided ${d} by ${rr.toFixed(1)} and got the age of ` +
                    `<em>one branch's worth</em> of change. But both species have been changing ` +
                    `since the split — look at the diagram: there are ticks on the top branch ` +
                    `<em>and</em> the bottom one. Divide by 2 × the rate.`;
            } else {
                feedback.classList.add('warn');
                feedback.innerHTML =
                    `Not yet. You have <strong>${d}</strong> measurable differences and a rate of ` +
                    `<strong>${rr.toFixed(1)}</strong> changes per million years <em>per branch</em>. ` +
                    `How many branches have been accumulating changes since the split?`;
            }
        }

        function refresh() { draw(); describe(); feedback.className = 'mc-feedback'; }

        task.querySelector('.mc-check').onclick = check;
        task.querySelector('.mc-new').onclick = () => {
            age.input.value = 5 + Math.floor(Math.random() * 80);
            rate.input.value = 2 + Math.floor(Math.random() * 16);
            age.sync(); rate.sync();
            input.value = ''; refresh();
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
        [age, rate].forEach(c => c.input.addEventListener('input', refresh));

        root._simState = () => ({
            years: t(), rate: r(), perBranch: Math.round(perBranch()),
            observed: observed(), saturation: +saturation().toFixed(2),
            correctAnswer: +(observed() / (2 * r())).toFixed(2),
            doubledAnswer: +(observed() / r()).toFixed(2)
        });
        root._simCheck = v => { input.value = v; check(); return feedback.className; };

        refresh();
    };

    function injectCss() {
        if (document.getElementById('sim-molecular-clock-css')) return;
        const s = document.createElement('style');
        s.id = 'sim-molecular-clock-css';
        s.textContent = `
        .mc-task { padding: 0 1.25rem 1.25rem; }
        .mc-q { font-size: 0.9rem; margin: 0 0 0.7rem; }
        .mc-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
        .mc-row label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
        .mc-row input {
            width: 6.5rem; font: inherit; font-size: 0.9rem; padding: 0.35rem 0.5rem;
            border: 1.5px solid var(--border); border-radius: 6px;
            background: var(--bg); color: var(--text);
        }
        .mc-unit { font-size: 0.8rem; color: var(--text-secondary); }
        .mc-feedback {
            display: none; margin-top: 0.8rem; padding: 0.75rem 0.9rem;
            border-radius: 8px; font-size: 0.87rem; line-height: 1.5;
            border-left: 4px solid var(--border); background: var(--bg);
        }
        .mc-feedback.show { display: block; }
        .mc-feedback.good { border-left-color: #2e7d32; background: var(--ok-bg); }
        .mc-feedback.bad  { border-left-color: var(--red); background: rgba(170,39,47,0.06); }
        .mc-feedback.warn { border-left-color: var(--yellow); background: var(--bg-example); }
        `;
        document.head.appendChild(s);
    }
})();
