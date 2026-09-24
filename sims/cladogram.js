/* =============================================================
   INTERACTIVE — Build a cladogram from a character table
   -------------------------------------------------------------
   Registers window.SIMS.cladogram.  Supports HS-LS4-1:
   "I can create and interpret a cladogram showing how a group of
   organisms most likely diverged from a common ancestor."

   The reader is given a table of shared characteristics and has to
   place them in the order they appeared. The rule being practised is
   the one that does all the work: the characteristic shared by the
   MOST species appeared earliest, so it marks the earliest branch.
   Each correct placement resolves one branch of the tree.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    // Species ordered by how many of the characteristics they have.
    // The first is the outgroup — it has none, so it branches off first.
    const SPECIES = ['Sponge', 'Jellyfish', 'Flatworm', 'Snail', 'Mouse'];
    const CHARS = [
        { name: 'True tissues',        has: [0, 1, 1, 1, 1] },
        { name: 'Bilateral symmetry',  has: [0, 0, 1, 1, 1] },
        { name: 'Body cavity',         has: [0, 0, 0, 1, 1] },
        { name: 'Backbone',            has: [0, 0, 0, 0, 1] }
    ];
    const count = c => c.has.reduce((a, b) => a + b, 0);
    const ORDER = CHARS.map((c, i) => i).sort((a, b) => count(CHARS[b]) - count(CHARS[a]));

    const W = 660, H = 300;
    const YS = [40, 88, 136, 184, 232];
    const NODES = [110, 195, 280, 365];
    const MIDS = [84, 132, 180, 208];

    window.SIMS.cladogram = function (root) {
        // ---- the character table ------------------------------------
        const tableWrap = U.el('div', 'clado-table');
        tableWrap.innerHTML =
            '<table><thead><tr><th>Species</th>' +
            CHARS.map(c => `<th>${c.name}</th>`).join('') +
            '</tr></thead><tbody>' +
            SPECIES.map((s, si) =>
                `<tr><td><strong>${s}</strong></td>` +
                CHARS.map(c => `<td>${c.has[si] ? '&#10003;' : '&mdash;'}</td>`).join('') +
                '</tr>').join('') +
            '</tbody></table>';
        root.appendChild(tableWrap);

        const { ctx } = U.stage(root, W, H,
            'A cladogram of sponge, jellyfish, flatworm, snail and mouse, which resolves branch ' +
            'by branch as each shared characteristic is placed in the order it appeared.');

        const picker = U.el('div', 'clado-picker');
        root.appendChild(picker);
        const readout = U.el('div', 'sim-readout');
        root.appendChild(readout);
        const buttons = U.el('div', 'sim-buttons');
        const btnReset = U.button(buttons, 'Start again');
        const btnHint = U.button(buttons, 'Hint');
        root.appendChild(buttons);

        const theme = U.theme(() => draw());
        let placed = [];          // character indices, in the order chosen
        let wrong = null;         // index of the last wrong pick, for feedback

        function reset() { placed = []; wrong = null; renderPicker(); draw(); describe(); }

        function renderPicker() {
            const remaining = CHARS.map((c, i) => i).filter(i => !placed.includes(i));
            picker.innerHTML = '';
            if (!remaining.length) return;
            const label = U.el('div', 'clado-prompt');
            label.textContent = placed.length === 0
                ? 'Which characteristic appeared first?'
                : 'Which appeared next?';
            picker.appendChild(label);
            remaining.forEach(i => {
                const b = U.el('button', 'clado-opt');
                b.type = 'button';
                b.textContent = CHARS[i].name;
                b.onclick = () => pick(i);
                picker.appendChild(b);
            });
        }

        function pick(i) {
            const expected = ORDER[placed.length];
            if (i === expected) { placed.push(i); wrong = null; }
            else { wrong = i; }
            renderPicker(); draw(); describe();
        }

        function draw() {
            const t = theme.current;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);

            const done = placed.length;
            // branches: branch k is resolved once k characters are placed
            for (let i = 0; i < NODES.length; i++) {
                const resolved = i < done;
                ctx.strokeStyle = resolved ? t.axis : t.grid;
                ctx.lineWidth = resolved ? 2 : 1.4;
                ctx.setLineDash(resolved ? [] : [3, 3]);
                const x = NODES[i], top = YS[i];
                const bot = (i + 1 < MIDS.length) ? MIDS[i + 1] : YS[YS.length - 1];
                ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bot); ctx.stroke();
                if (i + 1 < NODES.length) {
                    ctx.beginPath(); ctx.moveTo(x, MIDS[i + 1]); ctx.lineTo(NODES[i + 1], MIDS[i + 1]); ctx.stroke();
                }
            }
            ctx.setLineDash([]);
            // root stub
            ctx.strokeStyle = done > 0 ? t.axis : t.grid;
            ctx.lineWidth = done > 0 ? 2 : 1.4;
            ctx.beginPath(); ctx.moveTo(40, MIDS[0]); ctx.lineTo(NODES[0], MIDS[0]); ctx.stroke();

            // species lines and names
            SPECIES.forEach((s, i) => {
                const x = NODES[Math.min(i, NODES.length - 1)];
                const resolved = i <= placed.length;
                ctx.strokeStyle = resolved ? t.axis : t.grid;
                ctx.lineWidth = resolved ? 2 : 1.4;
                ctx.setLineDash(resolved ? [] : [3, 3]);
                ctx.beginPath(); ctx.moveTo(x, YS[i]); ctx.lineTo(W - 130, YS[i]); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = resolved ? t.ink : t.axis;
                ctx.globalAlpha = resolved ? 1 : 0.45;
                ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'left';
                ctx.fillText(s, W - 122, YS[i] + 4);
                ctx.globalAlpha = 1;
            });

            // the marks for characters already placed
            placed.forEach((ci, k) => {
                const x = (NODES[k] + (k ? NODES[k - 1] : 40)) / 2;
                const y = MIDS[k];
                ctx.fillStyle = t.red;
                ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = t.ink; ctx.font = '11px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(CHARS[ci].name, x, y - 11);
            });
        }

        function describe() {
            const done = placed.length;
            if (wrong !== null) {
                const n = count(CHARS[wrong]);
                const expected = ORDER[done];
                readout.innerHTML =
                    `<strong>Not that one.</strong> ${CHARS[wrong].name} is shared by only ` +
                    `<strong>${n}</strong> of the five species, so it cannot have appeared this early — ` +
                    `everything after a branch point inherits the characteristic marked there. ` +
                    `Look for the one still shared by <strong>${count(CHARS[expected])}</strong> species.`;
                return;
            }
            if (done === 0) {
                readout.innerHTML =
                    '<strong>Count the ticks in each column.</strong> The characteristic shared by the ' +
                    'most species appeared earliest, because every species descended from that branch ' +
                    'point inherited it. Start there.';
            } else if (done < CHARS.length) {
                readout.innerHTML =
                    `<strong>${done} of ${CHARS.length} placed.</strong> ${CHARS[placed[done - 1]].name} ` +
                    `sits on the branch before <strong>${SPECIES[done]}</strong> splits off — so ` +
                    `${SPECIES.slice(done).join(', ')} all have it, and ` +
                    `${SPECIES.slice(0, done).join(', ')} ${done === 1 ? 'does' : 'do'} not.`;
            } else {
                readout.innerHTML =
                    '<strong>Tree complete.</strong> Read it back to check: each species should have ' +
                    'exactly the characteristics marked on the branches leading to it. Notice that the ' +
                    'sponge branched off first because it shares none of them — that makes it the ' +
                    '<em>outgroup</em>, and choosing one is always the first step.';
            }
        }

        btnReset.onclick = reset;
        btnHint.onclick = () => {
            const expected = ORDER[placed.length];
            if (expected === undefined) return;
            readout.innerHTML =
                `<strong>Hint.</strong> Count the ticks. The one you want is shared by ` +
                `<strong>${count(CHARS[expected])}</strong> of the five species — more than any other ` +
                `you have left.`;
        };

        root._simState = () => ({ placed: placed.slice(), correctOrder: ORDER.slice(), wrong });
        reset();
    };
})();
