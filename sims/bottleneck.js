/* =============================================================
   INTERACTIVE — The bottleneck effect (3D)
   -------------------------------------------------------------
   Registers window.SIMS.bottleneck.  Supports HS-LS4-4.

   A population of individuals, each carrying one of four alleles,
   falls through a funnel. Whether an individual fits through the
   neck depends only on where it happens to be — nothing about its
   allele. That is the whole point: the survivors are a random
   sample, so rare alleles are often lost outright, and the
   population that regrows carries only what got through.

   three.js is loaded on demand (vendor/three.module.min.js, MIT).
   If WebGL is unavailable the simulation still runs and reports the
   numbers; only the 3D view is skipped.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;

    const N = 260;
    const ALLELES = [
        { key: 'A1', label: 'Common',      hex: 0x4d8fd6, css: '#4d8fd6', share: 0.45 },
        { key: 'A2', label: 'Frequent',    hex: 0x5fbf70, css: '#5fbf70', share: 0.30 },
        { key: 'A3', label: 'Uncommon',    hex: 0xe0a33a, css: '#e0a33a', share: 0.19 },
        { key: 'A4', label: 'Rare',        hex: 0xc0504d, css: '#c0504d', share: 0.06 }
    ];
    const R_TOP = 5.2, H_CONE = 4.6, Y_NECK = -1.2, Y_FLOOR = -6.4, G = -9.0;

    window.SIMS.bottleneck = function (root) {
        injectCss();

        const stage = U.el('div', 'sim-stage bn-stage');
        root.appendChild(stage);

        const controls = U.el('div', 'sim-controls');
        const neck = U.slider(controls, 'neck', 'How severe is the catastrophe', 1, 10, 5,
            v => ['almost none survive','very severe','severe','harsh','moderate','moderate',
                  'mild','mild','slight','barely a squeeze'][v - 1]);
        const buttons = U.el('div', 'sim-buttons');
        const btnRun = U.button(buttons, 'Run the catastrophe', 'primary');
        const btnGrow = U.button(buttons, 'Let the survivors breed');
        const btnReset = U.button(buttons, 'New population');
        const readout = U.el('div', 'sim-readout');
        const bars = U.el('div', 'bn-bars');
        root.appendChild(controls); root.appendChild(buttons);
        root.appendChild(readout); root.appendChild(bars);

        // ---- population model, independent of any rendering -------------
        let pop = [], survivors = null, regrown = null, phase = 'ready';
        const neckR = () => 0.55 + (neck.value / 10) * 2.1;

        function makePop() {
            const out = [];
            ALLELES.forEach((a, i) => {
                const n = Math.round(a.share * N);
                for (let k = 0; k < n; k++) out.push(i);
            });
            while (out.length < N) out.push(0);
            return out.slice(0, N);
        }
        const tally = list => {
            const c = ALLELES.map(() => 0);
            list.forEach(i => c[i]++);
            return c;
        };

        function reset() {
            pop = makePop(); survivors = null; regrown = null; phase = 'ready';
            if (view) view.seed(pop);
            describe(); drawBars();
        }

        function runBottleneck() {
            if (phase === 'running') return;
            phase = 'running';
            // Position decides who fits, and position is unrelated to allele.
            const r = neckR();
            const passed = [];
            pop.forEach((allele, i) => {
                if (view ? view.radiusOf(i) <= r : Math.sqrt(Math.random()) * R_TOP <= r) passed.push(allele);
            });
            survivors = passed; regrown = null;
            if (view) view.drop(r, () => { phase = 'done'; describe(); drawBars(); });
            else { phase = 'done'; describe(); drawBars(); }
            describe();
        }

        function regrow() {
            if (!survivors || !survivors.length) return;
            regrown = [];
            for (let i = 0; i < N; i++) regrown.push(survivors[Math.floor(Math.random() * survivors.length)]);
            if (view) view.regrow(regrown);
            phase = 'regrown';
            describe(); drawBars();
        }

        function describe() {
            const before = tally(pop);
            if (phase === 'ready') {
                readout.innerHTML =
                    '<strong>A population of ' + N + '.</strong> Four versions of a gene, one of them rare. ' +
                    'Nothing here is better or worse than anything else — the colours are just labels. ' +
                    'Run the catastrophe and see which survive.';
                return;
            }
            if (phase === 'running') { readout.innerHTML = '<strong>Falling…</strong>'; return; }
            const after = tally(survivors);
            const lost = ALLELES.filter((a, i) => before[i] > 0 && after[i] === 0);
            const pct = (n, tot) => tot ? (n / tot * 100).toFixed(0) + '%' : '—';
            let msg = '<strong>' + survivors.length + ' of ' + N + ' survived.</strong> ';
            if (!survivors.length) {
                msg += 'The whole population is gone. Extinction is the other thing a bottleneck can do.';
            } else if (lost.length) {
                msg += 'Lost completely: <strong>' +
                    lost.map(a => a.label.toLowerCase() + ' (' + a.key + ')').join(', ') +
                    '</strong>. Not because it was harmful — because too few carried it for any to get through.';
            } else {
                msg += 'Every version survived this time, but look at how the proportions shifted.';
            }
            if (phase === 'regrown') {
                msg += '<br><strong>Back to ' + N + ' individuals</strong> — but only from what got through. ' +
                       'Numbers recovered; the lost variation did not come back.';
            }
            readout.innerHTML = msg;
        }

        function drawBars() {
            const rows = [
                ['Before', tally(pop), pop.length],
                survivors ? ['Survivors', tally(survivors), survivors.length] : null,
                regrown ? ['After breeding', tally(regrown), regrown.length] : null
            ].filter(Boolean);
            bars.innerHTML = rows.map(([name, counts, tot]) =>
                '<div class="bn-row"><span class="bn-name">' + name + '</span>' +
                '<span class="bn-bar">' + ALLELES.map((a, i) => {
                    const p = tot ? counts[i] / tot * 100 : 0;
                    return p > 0
                        ? '<i style="width:' + p + '%;background:' + a.css + '" title="' +
                          a.label + ': ' + counts[i] + '"></i>' : '';
                }).join('') + '</span>' +
                '<span class="bn-n">' + tot + '</span></div>'
            ).join('') +
            '<div class="bn-key">' + ALLELES.map(a =>
                '<span><i style="background:' + a.css + '"></i>' + a.label + '</span>').join('') + '</div>';
        }

        // ---- 3D view (optional) -----------------------------------------
        let view = null;
        const rootPath = (window.COURSE_SHELL && window.COURSE_SHELL.root) || '';
        const threeUrl = new URL(rootPath + 'vendor/three.module.min.js', location.href).href;

        import(threeUrl)
            .then(THREE => { view = build3D(THREE, stage, neckR); view.seed(pop); })
            .catch(err => {
                console.warn('[bottleneck] 3D unavailable, running without it:', err);
                stage.innerHTML = '<p class="sim-fallback">The 3D view could not load, but the ' +
                    'simulation still works — run it and read the bars below.</p>';
            })
            .then(() => { describe(); drawBars(); });

        btnRun.onclick = runBottleneck;
        btnGrow.onclick = regrow;
        btnReset.onclick = reset;
        neck.input.addEventListener('input', () => { if (view) view.setNeck(neckR()); });

        root._simState = () => ({
            phase, neckRadius: +neckR().toFixed(2),
            before: tally(pop), survivors: survivors ? tally(survivors) : null,
            survivorCount: survivors ? survivors.length : null,
            regrown: regrown ? tally(regrown) : null,
            allelesLost: survivors ? ALLELES.filter((a, i) => tally(pop)[i] > 0 && tally(survivors)[i] === 0)
                                            .map(a => a.key) : null
        });
        root._simRun = runBottleneck;
        root._simRegrow = regrow;
        root._simReset = reset;

        pop = makePop(); describe(); drawBars();
    };

    // -------------------------------------------------------------------
    function build3D(THREE, stage, neckR) {
        const W = stage.clientWidth || 640, H = 420;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        camera.position.set(0, 1.4, 15.5);
        camera.lookAt(0, -1.4, 0);

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch (e) { throw e; }
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(W, H, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = 'auto';
        stage.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 1.5));
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(4, 9, 7); scene.add(key);

        // funnel
        const coneMat = new THREE.MeshStandardMaterial({
            color: 0x9fb4c6, transparent: true, opacity: 0.28,
            side: THREE.DoubleSide, roughness: 0.7, metalness: 0
        });
        let cone = null;
        function buildCone(rNeck) {
            if (cone) { scene.remove(cone); cone.geometry.dispose(); }
            const g = new THREE.CylinderGeometry(R_TOP, rNeck, H_CONE, 48, 1, true);
            cone = new THREE.Mesh(g, coneMat);
            cone.position.y = Y_NECK + H_CONE / 2;
            scene.add(cone);
        }
        buildCone(neckR());

        // particles
        const geo = new THREE.SphereGeometry(0.20, 12, 10);
        const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
        const mesh = new THREE.InstancedMesh(geo, mat, N);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);

        const dummy = new THREE.Object3D();
        const P = [];                      // {x,y,z,vy,state}
        const colour = new THREE.Color();

        function place(i) {
            dummy.position.set(P[i].x, P[i].y, P[i].z);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        function seed(pop) {
            P.length = 0;
            for (let i = 0; i < N; i++) {
                const rho = Math.sqrt(Math.random()) * (R_TOP - 0.35);
                const th = Math.random() * Math.PI * 2;
                P.push({ x: Math.cos(th) * rho, z: Math.sin(th) * rho,
                         y: Y_NECK + H_CONE + 0.6 + Math.random() * 3.4, vy: 0, state: 'held' });
                place(i);
                mesh.setColorAt(i, colour.setHex(ALLELES[pop[i]].hex));
            }
            mesh.instanceColor.needsUpdate = true;
            mesh.instanceMatrix.needsUpdate = true;
        }
        const radiusOf = i => Math.hypot(P[i].x, P[i].z);

        let onDone = null, falling = false;
        function drop(rNeck, done) {
            buildCone(rNeck);
            onDone = done; falling = true;
            P.forEach(p => { p.state = 'falling'; p.vy = 0; });
        }
        function regrow(list) {
            for (let i = 0; i < N; i++) {
                const rho = Math.sqrt(Math.random()) * 3.2, th = Math.random() * Math.PI * 2;
                P[i] = { x: Math.cos(th) * rho, z: Math.sin(th) * rho,
                         y: Y_FLOOR + 0.25 + Math.random() * 1.6, vy: 0, state: 'rest' };
                place(i);
                mesh.setColorAt(i, colour.setHex(ALLELES[list[i]].hex));
            }
            mesh.instanceColor.needsUpdate = true;
            mesh.instanceMatrix.needsUpdate = true;
        }
        function setNeck(r) { if (!falling) buildCone(r); }

        const surfaceY = rho => Y_NECK + H_CONE * (rho - curNeck()) / (R_TOP - curNeck());
        let _neck = neckR();
        function curNeck() { return _neck; }

        let last = performance.now(), visible = true;
        function step(now) {
            const dt = Math.min(0.05, (now - last) / 1000); last = now;
            if (falling) {
                let moving = 0;
                for (let i = 0; i < N; i++) {
                    const p = P[i];
                    if (p.state !== 'falling') continue;
                    p.vy += G * dt; p.y += p.vy * dt;
                    const rho = Math.hypot(p.x, p.z);
                    if (p.y <= Y_FLOOR + 0.22) { p.y = Y_FLOOR + 0.22; p.state = 'rest'; }
                    else if (p.y > Y_NECK && rho > _neck) {
                        const sy = surfaceY(rho);
                        if (p.y <= sy) { p.y = sy; p.state = 'stuck'; }
                    }
                    if (p.state === 'falling') moving++;
                    place(i);
                }
                mesh.instanceMatrix.needsUpdate = true;
                if (!moving) { falling = false; if (onDone) { onDone(); onDone = null; } }
            }
            if (visible) renderer.render(scene, camera);
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);

        new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }),
                                 { threshold: 0 }).observe(stage);
        addEventListener('resize', () => {
            const w = stage.clientWidth || W;
            renderer.setSize(w, Math.round(w * H / W), false);
            camera.aspect = w / (w * H / W); camera.updateProjectionMatrix();
        });

        return {
            seed, drop, regrow, radiusOf,
            setNeck(r) { _neck = r; setNeck(r); }
        };
    }

    function injectCss() {
        if (document.getElementById('sim-bottleneck-css')) return;
        const s = document.createElement('style');
        s.id = 'sim-bottleneck-css';
        s.textContent = `
        .bn-stage { display:block; padding: 1rem 1.25rem 0; }
        .bn-bars { padding: 0 1.25rem 1.25rem; }
        .bn-row { display:flex; align-items:center; gap:.6rem; margin-bottom:.35rem; }
        .bn-name { flex:0 0 6.5rem; font-size:.78rem; font-weight:600; color:var(--text-secondary); }
        .bn-bar { flex:1; display:flex; height:1.1rem; border-radius:4px; overflow:hidden;
                  background:var(--border); }
        .bn-bar i { display:block; height:100%; }
        .bn-n { flex:0 0 2.5rem; text-align:right; font-size:.78rem;
                font-variant-numeric:tabular-nums; color:var(--text-secondary); }
        .bn-key { display:flex; flex-wrap:wrap; gap:.9rem; margin-top:.6rem; font-size:.75rem;
                  color:var(--text-secondary); }
        .bn-key span { display:flex; align-items:center; gap:.35rem; }
        .bn-key i { width:.8rem; height:.8rem; border-radius:2px; display:block; }
        `;
        document.head.appendChild(s);
    }
})();
