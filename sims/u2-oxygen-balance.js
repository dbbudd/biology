/* =============================================================
   INTERACTIVE — The aquarium: find the balance point
   -------------------------------------------------------------
   Registers window.SIMS['u2-oxygen-balance'].  Supports HS-LS1-7,
   HS-LS2-3 and HS-LS2-5.

   This rebuilds "BIO Cellular Resp sim activity" natively. The
   original ran on biologysimulations.com behind a ClassLink login
   (deck slide 220), which a reader outside the school cannot reach —
   so the investigation is reimplemented here from its own rules
   rather than linked out to.

   PART A — the structured investigation. Five fish, no plants, full
     white light, temperature swept 15 to 35 degrees; record the fall
     in dissolved oxygen over sixty minutes.
   PART B — the balanced-system challenge, which is the better of the
     two, because "find the combination that holds oxygen steady"
     forces photosynthesis and respiration to be held in one head at
     the same time. That is exactly what HS-LS2-5 asks for.

   THE MODEL, stated openly so it can be argued with:
     respiration rate  = base x 2^((T-25)/10) x denature(T)
     photosynthesis    = base x (1 - e^(-L/40)) x thermal optimum at 30
   Enzyme denaturation above about 38 degrees is what stops the
   respiration curve rising forever — which is the question the
   original worksheet asks and does not answer.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u2ox-style';

    const DO_START = 8.0;          // mg/L, a well-aerated tank at 25 °C
    const MINUTES = 60;
    const TOLERANCE = 0.2;         // mg/L over 60 min counts as "balanced"

    const RESP_FISH = 0.55;        // mg/L per hour per fish at 25 °C
    const RESP_PLANT = 0.18;       // plants respire too — the point students miss
    const PHOTO_PLANT = 0.60;      // mg/L per hour per plant at full light, 30 °C

    const q10 = T => Math.pow(2, (T - 25) / 10);
    const denature = T => 1 / (1 + Math.exp((T - 38) / 1.6));
    const respF = T => q10(T) * denature(T);
    const photoT = T => Math.exp(-Math.pow((T - 30) / 13, 2)) * denature(T);
    const lightF = L => 1 - Math.exp(-L / 40);

    function rates(fish, plants, light, temp) {
        const resp = (fish * RESP_FISH + plants * RESP_PLANT) * respF(temp);
        const photo = plants * PHOTO_PLANT * lightF(light) * photoT(temp);
        return { resp: +resp.toFixed(3), photo: +photo.toFixed(3), net: +(photo - resp).toFixed(3) };
    }
    function run(fish, plants, light, temp) {
        const r = rates(fish, plants, light, temp);
        const series = [];
        let dox = DO_START;
        for (let m = 0; m <= MINUTES; m++) {
            series.push(+dox.toFixed(3));
            dox = Math.max(0, Math.min(14, dox + r.net / 60));
        }
        const end = series[series.length - 1];
        return { series, start: DO_START, end: +end.toFixed(2),
                 difference: +(end - DO_START).toFixed(2), rates: r };
    }

    const TEMPS = [15, 20, 25, 30, 35];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u2ox{padding:1rem 1.25rem 0.25rem;--ok:#2e7d32;--bad:#aa272f}',
            '[data-theme="dark"] .u2ox{--ok:#7fc98a;--bad:#e08a90}',
            '[data-theme="sepia"] .u2ox{--ok:#4a6b3d;--bad:#a04040}',
            '.u2ox-how{font-size:0.78rem;color:var(--text-secondary);margin:0 0 0.6rem;line-height:1.5}',
            '.u2ox-tabs{display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.6rem}',
            '.u2ox-tab{font:inherit;font-size:0.78rem;padding:0.3rem 0.65rem;border-radius:999px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2ox-tab[aria-pressed="true"]{background:var(--dark-blue);color:#fff;border-color:var(--dark-blue)}',
            '[data-theme="dark"] .u2ox-tab[aria-pressed="true"]{background:var(--light-teal);color:#0d1b26}',
            '.u2ox-tbl{overflow-x:auto;margin-top:0.5rem}',
            '.u2ox-tbl table{border-collapse:collapse;font-size:0.76rem;width:100%;min-width:400px}',
            '.u2ox-tbl th,.u2ox-tbl td{border:1px solid var(--border);padding:0.22rem 0.4rem;text-align:center}',
            '.u2ox-tbl th{color:var(--text-secondary);font-weight:700;font-size:0.7rem}',
            '.u2ox-tbl tr.best td{background:rgba(46,125,50,0.12);font-weight:700}',
            '.u2ox-read{font-size:0.84rem;line-height:1.6;margin-top:0.55rem;padding:0.55rem 0.75rem;',
            '  border-left:3px solid var(--light-teal);background:var(--bg-surface)}',
            '.u2ox-read b{font-variant-numeric:tabular-nums}',
            '.u2ox-pred{display:flex;gap:0.4rem;flex-wrap:wrap;margin:0.4rem 0 0.2rem}',
            '.u2ox-pb{font:inherit;font-size:0.78rem;padding:0.32rem 0.6rem;border-radius:8px;',
            '  border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}',
            '.u2ox-pb:hover{border-color:var(--light-teal)}',
            '.u2ox-pb.good{border-color:var(--ok);background:rgba(46,125,50,0.10)}',
            '.u2ox-pb.bad{border-color:var(--bad);background:rgba(170,39,47,0.10)}',
            '.u2ox-msg{margin:0.75rem 0 0;font-size:0.82rem;line-height:1.55;min-height:2.4em}',
            '.u2ox-msg.ok{color:var(--ok)} .u2ox-msg.bad{color:var(--bad)}',
            '.u2ox-rev{margin-top:0.9rem;border:1px solid var(--ok);border-radius:10px;',
            '  background:rgba(46,125,50,0.08);padding:0.85rem 1rem}',
            '[data-theme="dark"] .u2ox-rev{background:rgba(127,201,138,0.12)}',
            '.u2ox-rev h5{margin:0 0 0.5rem;font-size:0.9rem}',
            '.u2ox-rev p{margin:0 0 0.6rem;font-size:0.84rem;line-height:1.6}'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u2-oxygen-balance'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u2ox');
        const how = U.el('p', 'u2ox-how');
        const tabs = U.el('div', 'u2ox-tabs');
        const predHost = U.el('div');
        const controls = U.el('div', 'sim-controls');
        const chartHost = U.el('div');
        const readout = U.el('div', 'u2ox-read');
        const tblHost = U.el('div');
        const msg = U.el('p', 'u2ox-msg');
        msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
        const revealHost = U.el('div');
        [how, tabs, predHost, controls, chartHost, readout, tblHost, msg, revealHost]
            .forEach(e => wrap.appendChild(e));
        root.appendChild(wrap);

        const buttons = U.el('div', 'sim-buttons');
        const trialBtn = U.button(buttons, 'Log this trial', 'primary');
        const resetBtn = U.button(buttons, 'Clear trials');
        wrap.appendChild(buttons);

        let part = 'A';
        let prediction = null;
        let trials = [];
        let canvas, ctx, theme;

        const sFish = U.slider(controls, 'fish', 'Fish', 0, 10, 5, v => String(v), 1);
        const sPlants = U.slider(controls, 'plants', 'Plants', 0, 10, 0, v => String(v), 1);
        const sLight = U.slider(controls, 'light', 'Light intensity', 0, 100, 100, v => v + '%', 5);
        const sTemp = U.slider(controls, 'temp', 'Temperature', 10, 40, 25, v => v + ' °C', 1);
        [sFish, sPlants, sLight, sTemp].forEach(s =>
            s.input.addEventListener('input', () => { draw(); }));

        function draw() {
            if (!canvas) return;
            const t = theme.current;
            const w = canvas.width, h = canvas.height;
            const pad = { l: 46, r: 12, t: 14, b: 36 };
            const gridY = [];
            for (let v = 0; v <= 12; v += 2) gridY.push({ at: v / 12, label: String(v) });
            const { pw, ph } = U.axes(ctx, t, pad, w, h, { gridY });
            ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';

            if (part === 'A') {
                // one line per temperature, fish = 5, plants = 0, light 100
                TEMPS.forEach((T, i) => {
                    const r = run(5, 0, 100, T);
                    const shade = ['blue', 'teal', 'ok', 'yellow', 'red'][i];
                    ctx.strokeStyle = t[shade] || t.ink; ctx.lineWidth = 2;
                    ctx.beginPath();
                    r.series.forEach((v, m) => {
                        const x = pad.l + (m / MINUTES) * pw, y = pad.t + ph - (v / 12) * ph;
                        m ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                    });
                    ctx.stroke();
                    ctx.fillStyle = t[shade] || t.ink; ctx.textAlign = 'left';
                    ctx.fillText(T + '°C', pad.l + pw + 2 - 26,
                        pad.t + ph - (r.series[MINUTES] / 12) * ph - 4);
                });
            } else {
                const r = run(sFish.value, sPlants.value, sLight.value, sTemp.value);
                // the tolerance band
                ctx.fillStyle = t.ok; ctx.globalAlpha = 0.14;
                const yTop = pad.t + ph - ((DO_START + TOLERANCE) / 12) * ph;
                const yBot = pad.t + ph - ((DO_START - TOLERANCE) / 12) * ph;
                ctx.fillRect(pad.l, yTop, pw, yBot - yTop);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = t.blue; ctx.lineWidth = 2.4;
                ctx.beginPath();
                r.series.forEach((v, m) => {
                    const x = pad.l + (m / MINUTES) * pw, y = pad.t + ph - (v / 12) * ph;
                    m ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                });
                ctx.stroke();
                // previously logged trials, faint
                ctx.globalAlpha = 0.35; ctx.lineWidth = 1.4;
                trials.forEach(tr => {
                    ctx.strokeStyle = t.axis; ctx.beginPath();
                    tr.series.forEach((v, m) => {
                        const x = pad.l + (m / MINUTES) * pw, y = pad.t + ph - (v / 12) * ph;
                        m ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                    });
                    ctx.stroke();
                });
                ctx.globalAlpha = 1;
            }
            ctx.fillStyle = t.axis; ctx.textAlign = 'center';
            for (let m = 0; m <= 60; m += 15)
                ctx.fillText(String(m), pad.l + (m / MINUTES) * pw, pad.t + ph + 15);
            ctx.fillText('time (minutes)', pad.l + pw / 2, pad.t + ph + 30);
            ctx.save(); ctx.translate(11, pad.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillText('dissolved oxygen (mg/L)', 0, 0); ctx.restore();

            updateReadout();
        }

        function updateReadout() {
            if (part === 'A') {
                readout.innerHTML = 'Five fish, no plants, full white light. Each line is one ' +
                    'temperature. The steeper the fall, the faster the fish are respiring.';
                return;
            }
            const r = run(sFish.value, sPlants.value, sLight.value, sTemp.value);
            const bal = Math.abs(r.difference) <= TOLERANCE;
            readout.innerHTML =
                'Photosynthesis is adding <b>' + r.rates.photo.toFixed(2) + '</b> mg/L per hour. ' +
                'Respiration — from the fish <em>and</em> the plants — is removing <b>' +
                r.rates.resp.toFixed(2) + '</b>. Net <b>' +
                (r.rates.net >= 0 ? '+' : '') + r.rates.net.toFixed(2) + '</b> mg/L per hour, so ' +
                'after 60 minutes the tank goes from ' + DO_START.toFixed(1) + ' to <b>' +
                r.end.toFixed(2) + '</b> mg/L — a change of <b>' +
                (r.difference >= 0 ? '+' : '') + r.difference.toFixed(2) + '</b> mg/L. ' +
                (bal ? '<strong style="color:var(--ok)">That counts as balanced.</strong>' : '');
        }

        function render() {
            tabs.innerHTML = '';
            [['A', 'Part A — temperature and respiration'],
             ['B', 'Part B — the balance point']].forEach(([k, lab]) => {
                const b = U.el('button', 'u2ox-tab');
                b.type = 'button'; b.textContent = lab;
                b.setAttribute('aria-pressed', part === k ? 'true' : 'false');
                b.addEventListener('click', () => {
                    part = k; msg.textContent = ''; msg.className = 'u2ox-msg';
                    revealHost.innerHTML = ''; render();
                });
                tabs.appendChild(b);
            });

            how.innerHTML = part === 'A'
                ? 'A sealed tank with five fish and no plants, under full light, for sixty minutes. ' +
                  'Before you run it: <strong>what will rising temperature do to how fast the fish ' +
                  'use oxygen?</strong>'
                : 'Now add plants. Plants make oxygen in the light — but they respire as well, all ' +
                  'the time, like every living thing. Find a combination that leaves the dissolved ' +
                  'oxygen within ' + TOLERANCE + ' mg/L of where it started, and log at least three trials.';

            predHost.innerHTML = '';
            if (part === 'A' && prediction === null) {
                const row = U.el('div', 'u2ox-pred');
                [['up', 'Oxygen use will rise'], ['flat', 'It will not change'],
                 ['down', 'Oxygen use will fall']].forEach(([k, lab]) => {
                    const b = U.el('button', 'u2ox-pb');
                    b.type = 'button'; b.textContent = lab;
                    b.addEventListener('click', () => {
                        prediction = k;
                        msg.textContent = k === 'up'
                            ? 'That is the prediction the data supports. Now look at how far it goes.'
                            : 'Run it and see. Enzyme-controlled reactions speed up as molecules ' +
                              'move faster — up to the point where the enzymes themselves give way.';
                        msg.className = 'u2ox-msg ' + (k === 'up' ? 'ok' : 'bad');
                        render();
                    });
                    row.appendChild(b);
                });
                predHost.appendChild(row);
            }

            controls.hidden = part === 'A';
            trialBtn.hidden = part === 'A';

            if (!canvas) {
                const st = U.stage(chartHost, 620, 300,
                    'Line graph of dissolved oxygen in milligrams per litre against time in minutes.');
                canvas = st.canvas; ctx = st.ctx;
                theme = U.theme(() => draw());
            }
            draw();

            tblHost.innerHTML = '';
            if (part === 'A' && prediction !== null) {
                const box = U.el('div', 'u2ox-tbl');
                let html = '<table><thead><tr><th>Temperature</th><th>DO start</th><th>DO end</th>' +
                    '<th>DO difference</th></tr></thead><tbody>';
                TEMPS.forEach(T => {
                    const r = run(5, 0, 100, T);
                    html += '<tr><td>' + T + ' °C</td><td>' + r.start.toFixed(1) + '</td><td>' +
                        r.end.toFixed(2) + '</td><td>' + r.difference.toFixed(2) + '</td></tr>';
                });
                // the question the worksheet asks and does not answer
                [40].forEach(T => {
                    const r = run(5, 0, 100, T);
                    html += '<tr><td>' + T + ' °C</td><td>' + r.start.toFixed(1) + '</td><td>' +
                        r.end.toFixed(2) + '</td><td>' + r.difference.toFixed(2) + '</td></tr>';
                });
                html += '</tbody></table>';
                box.innerHTML = html;
                tblHost.appendChild(box);
                showPartA();
            }
            if (part === 'B' && trials.length) {
                const box = U.el('div', 'u2ox-tbl');
                const best = trials.reduce((a, b) =>
                    Math.abs(b.difference) < Math.abs(a.difference) ? b : a);
                let html = '<table><thead><tr><th>Trial</th><th>Fish</th><th>Plants</th>' +
                    '<th>Light</th><th>Temp</th><th>DO start</th><th>DO end</th><th>Difference</th>' +
                    '</tr></thead><tbody>';
                trials.forEach((tr, i) => {
                    html += '<tr class="' + (tr === best ? 'best' : '') + '"><td>' + (i + 1) +
                        '</td><td>' + tr.fish + '</td><td>' + tr.plants + '</td><td>' + tr.light +
                        '%</td><td>' + tr.temp + '°C</td><td>' + DO_START.toFixed(1) + '</td><td>' +
                        tr.end.toFixed(2) + '</td><td>' + (tr.difference >= 0 ? '+' : '') +
                        tr.difference.toFixed(2) + '</td></tr>';
                });
                html += '</tbody></table>';
                box.innerHTML = html;
                tblHost.appendChild(box);
            }
        }

        function showPartA() {
            if (revealHost.firstChild) return;
            const rs = TEMPS.map(T => run(5, 0, 100, T));
            const d15 = Math.abs(rs[0].difference), d35 = Math.abs(rs[4].difference);
            const r40 = run(5, 0, 100, 40), r45 = run(5, 0, 100, 45);
            const dv = U.el('div', 'u2ox-rev');
            dv.innerHTML = '<h5>Why oxygen use rises with temperature — and why it stops rising</h5>' +
                '<p>Cellular respiration is a chain of reactions run by enzymes. Warmer molecules ' +
                'move faster, so they collide with those enzymes more often and the whole chain ' +
                'speeds up. Between 15 °C and 35 °C the fish went from using ' + d15.toFixed(2) +
                ' mg/L an hour to ' + d35.toFixed(2) + ' — about <strong>' +
                (d35 / d15).toFixed(1) + ' times</strong> faster.</p>' +
                '<p>The worksheet then asks the good question: would oxygen keep dropping faster ' +
                'forever? Push the model past 35 and it answers itself — at 40 °C the fall is ' +
                Math.abs(r40.difference).toFixed(2) + ' mg/L, and by 45 °C it is ' +
                Math.abs(r45.difference).toFixed(2) + '. Above about 38 °C the enzymes start to ' +
                'lose their shape, and an enzyme with the wrong shape does not work at all. Heat ' +
                'speeds a reaction up right until it destroys the machinery running it.</p>' +
                '<p>There is a second squeeze the graph does not show: warm water holds less ' +
                'dissolved oxygen to begin with. A fish in a heatwave needs more oxygen from water ' +
                'that has less of it. That is why summer fish kills happen.</p>';
            revealHost.appendChild(dv);
        }

        function showPartB() {
            revealHost.innerHTML = '';
            const balanced = trials.filter(t => Math.abs(t.difference) <= TOLERANCE);
            const best = trials.reduce((a, b) =>
                Math.abs(b.difference) < Math.abs(a.difference) ? b : a);
            const dv = U.el('div', 'u2ox-rev');
            dv.innerHTML = '<h5>What a balance point actually is</h5>' +
                '<p>Your closest trial was ' + best.fish + ' fish and ' + best.plants +
                ' plants at ' + best.light + '% light and ' + best.temp + ' °C, ending ' +
                (best.difference >= 0 ? '+' : '') + best.difference.toFixed(2) +
                ' mg/L from where it started. Photosynthesis was making ' +
                best.rates.photo.toFixed(2) + ' mg/L per hour and respiration was consuming ' +
                best.rates.resp.toFixed(2) + '.</p>' +
                '<p>Notice what balanced does <em>not</em> mean. It does not mean nothing is ' +
                'happening. Both processes are running flat out; they simply happen to be running ' +
                'at the same speed, so the two arrows cancel. Switch the light off for one minute ' +
                'and the tank starts losing oxygen immediately, because only one of the two ' +
                'depends on light.</p>' +
                '<p>Notice also where the plant respiration went. Students almost always model ' +
                'plants as oxygen producers only. In this tank the plants were consuming ' +
                (best.plants * RESP_PLANT * respF(best.temp)).toFixed(2) + ' mg/L per hour of the ' +
                'oxygen they made. A plant in the dark is purely a consumer — which is why a sealed ' +
                'jar of pondweed in a cupboard dies.</p>' +
                '<p>' + (balanced.length >= 3
                    ? 'You found ' + balanced.length + ' balanced combinations. There is no single ' +
                      'right answer — it is a ratio between producers and consumers, and many ' +
                      'combinations satisfy it. Real ecosystems sit at that same kind of ' +
                      'moving balance.'
                    : 'Keep going: the challenge asks for at least three balanced trials, because ' +
                      'one could be luck. If you find several, look at what they have in common.') +
                '</p>';
            revealHost.appendChild(dv);
        }

        trialBtn.addEventListener('click', () => {
            const f = sFish.value, p = sPlants.value, l = sLight.value, T = sTemp.value;
            const r = run(f, p, l, T);
            trials.push({ fish: f, plants: p, light: l, temp: T,
                          end: r.end, difference: r.difference, series: r.series, rates: r.rates });
            const bal = Math.abs(r.difference) <= TOLERANCE;
            msg.textContent = 'Trial ' + trials.length + ' logged: change of ' +
                (r.difference >= 0 ? '+' : '') + r.difference.toFixed(2) + ' mg/L. ' +
                (bal ? 'Balanced.' : r.difference < 0
                    ? 'Oxygen fell — respiration is outrunning photosynthesis. Add plants, add ' +
                      'light, or take a fish out.'
                    : 'Oxygen rose — photosynthesis is outrunning respiration. Dim the light, ' +
                      'remove a plant, or add a fish.');
            msg.className = 'u2ox-msg ' + (bal ? 'ok' : 'bad');
            render();
            if (trials.length >= 3) showPartB();
        });

        resetBtn.addEventListener('click', () => {
            trials = []; prediction = null;
            msg.textContent = ''; msg.className = 'u2ox-msg'; revealHost.innerHTML = '';
            render();
        });

        render();

        root._simState = () => ({
            part, prediction,
            settings: { fish: sFish.value, plants: sPlants.value,
                        light: sLight.value, temp: sTemp.value },
            current: run(sFish.value, sPlants.value, sLight.value, sTemp.value).rates,
            currentDifference: run(sFish.value, sPlants.value, sLight.value, sTemp.value).difference,
            partA: TEMPS.map(T => ({ temp: T, difference: run(5, 0, 100, T).difference })),
            trials: trials.map(t => ({ fish: t.fish, plants: t.plants, light: t.light,
                                       temp: t.temp, difference: t.difference })),
            balancedTrials: trials.filter(t => Math.abs(t.difference) <= TOLERANCE).length,
            tolerance: TOLERANCE, doStart: DO_START
        });
        root._simSolve = () => {
            part = 'B'; prediction = 'up'; trials = [];
            // search the model for balanced combinations rather than hard-coding any
            for (let f = 1; f <= 5 && trials.length < 3; f++) {
                for (let p = 1; p <= 10 && trials.length < 3; p++) {
                    for (let l = 0; l <= 100 && trials.length < 3; l += 5) {
                        const T = 25;
                        const r = run(f, p, l, T);
                        if (Math.abs(r.difference) <= TOLERANCE) {
                            trials.push({ fish: f, plants: p, light: l, temp: T, end: r.end,
                                          difference: r.difference, series: r.series, rates: r.rates });
                        }
                    }
                }
            }
            render();
            if (trials.length) showPartB();
        };
    };
})();
