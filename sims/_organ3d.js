/* =============================================================
   SHARED — the anatomy viewer behind the 3D organ simulations
   -------------------------------------------------------------
   Registers window.ORGAN3D. One of these drives every sim built on
   the BodyParts3D geometry, so a sim file carries only its own
   organs, copy and controls.

       ORGAN3D.create({ stage, rootPath, assetV, model, parts, onPick })
           -> Promise<view>

   `model` names a pair in models/ (e.g. 'systems' reads
   models/systems.json and models/systems.bin). `parts` maps an id
   from the manifest to { hex } and anything else the caller wants
   back. The promise rejects if WebGL, three.js or the geometry is
   unavailable — callers are expected to carry on without the view,
   because nothing in a chapter may live only inside one of these.

   view.select(id | null)        highlight one organ, dim the rest
   view.show(pred)               pred(id, part) -> visible
   view.resetView()              back to the framing it opened with
   view.frameVisible()           re-fit the camera to what is on screen

   opts.aspect                   stage height as a fraction of its width
                                 (default 0.58; a standing body wants more)
   view.frameOn(id | null)       pull the camera in on one organ
   view.dispose()

   The geometry is quantised Int16 inside ONE shared bounding box
   per model file, so organs from different systems stay in
   anatomical register. Normals are computed here rather than
   shipped. Positions are centred and scaled into the geometry
   itself: the group carries only the Z-up to Y-up rotation, which
   is what BodyParts3D's own axes require.
   ============================================================= */
(function () {
    'use strict';
    const API = window.ORGAN3D = window.ORGAN3D || {};

    // The canvas fills a stage whose height this module sets. It must never be
    // height:auto — the buffer is sized from the element, and an intrinsic
    // ratio closes that loop and runs the buffer away.
    function css() {
        if (document.getElementById('o3d-css')) return;
        const s = document.createElement('style');
        s.id = 'o3d-css';
        s.textContent = `
.o3d-stage { position: relative; min-height: 240px; }
.o3d-canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
.o3d-canvas:active { cursor: grabbing; }
.o3d-credit { font-size: 0.7rem; color: var(--text-secondary); margin: 0.6rem 0 0; line-height: 1.5; }
.o3d-credit a { color: inherit; }
.o3d-xlinks { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-top: 0.6rem; }
.o3d-xlabel { font-size: 0.64rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-secondary); }
.o3d-xlink {
    display: inline-flex; flex-direction: column; gap: 0.05rem;
    padding: 0.3rem 0.6rem; border-radius: 7px; text-decoration: none;
    border: 1px solid var(--border); background: var(--bg-surface); color: var(--text);
}
.o3d-xlink:hover { border-color: var(--light-teal); text-decoration: none; }
.o3d-xlink b { font-size: 0.78rem; font-weight: 600; }
.o3d-xlink span { font-size: 0.68rem; color: var(--text-secondary); }
.o3d-index { display: block; margin-top: 0.5rem; font-size: 0.78rem; color: var(--text-secondary); }
`;
        document.head.appendChild(s);
    }

    // "Also covered in ..." for one organ, from the shared body map, leaving
    // out the chapter the reader is already in. Returns '' when there is
    // nowhere else to send them, so callers can append it unconditionally.
    API.crossLinks = function (organId, opts) {
        opts = opts || {};
        const map = window.BODY_MAP;
        if (!map || !map.byId[organId]) return '';
        const here = opts.chapterId || (document.body.dataset.chapter || '');
        const root = opts.root || '';
        const course = window.COURSE || { chapters: [] };
        const esc = s => String(s).replace(/[&<>"]/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const rows = (map.byId[organId].where || [])
            .filter(w => w[0] !== here)
            .map(([chapId, sec, label]) => {
                const c = course.chapters.find(x => x.id === chapId);
                if (!c) return '';
                return '<a class="o3d-xlink" href="' + root + esc(c.file) + '#' + esc(sec) + '">' +
                       '<b>' + esc(c.title) + '</b><span>' + esc(label) + '</span></a>';
            }).filter(Boolean);
        if (!rows.length) return '';
        return '<div class="o3d-xlinks"><span class="o3d-xlabel">Also covered in</span>' +
               rows.join('') + '</div>';
    };

    // The way back out to the index of every organ.
    API.indexLink = function (root) {
        return '<span class="o3d-index">Every organ here is listed in the ' +
               '<a href="' + (root || '') + 'reference/body.html">Body Index</a>, ' +
               'with where the course covers it.</span>';
    };

    API.create = function (opts) {
        css();
        const { stage, rootPath = '', assetV = '', model, parts, onPick, aspect = 0.58 } = opts;
        const q = assetV ? ('?v=' + assetV) : '';
        return Promise.all([
            fetch(rootPath + 'models/' + model + '.json' + q).then(r => {
                if (!r.ok) throw new Error('manifest ' + r.status); return r.json();
            }),
            fetch(rootPath + 'models/' + model + '.bin' + q).then(r => {
                if (!r.ok) throw new Error('geometry ' + r.status); return r.arrayBuffer();
            }),
            import(new URL(rootPath + 'vendor/three.module.min.js' + q, location.href).href)
        ]).then(([manifest, buf, THREE]) => build(THREE, stage, manifest, buf, parts, onPick, aspect));
    };

    function build(THREE, stage, manifest, buf, parts, onPick, aspect) {
        const W = Math.max(240, stage.clientWidth || 640), H = Math.round(W * aspect);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 100);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(W, H, false);
        renderer.domElement.className = 'o3d-canvas';
        renderer.domElement.setAttribute('role', 'img');
        stage.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.62));
        const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(2, 3, 4);
        const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-3, -1, -2);
        scene.add(key, fill);

        // BodyParts3D is Z-up. This is the only transform the group carries.
        const body = new THREE.Group();
        scene.add(body);

        const used = [];
        manifest.parts.forEach(p => {
            const spec = parts[p.id];
            if (!spec) return;
            const pos = new Float32Array(p.verts * 3);
            const src = new Int16Array(buf, p.posOffset, p.verts * 3);
            for (let i = 0; i < pos.length; i++) pos[i] = (src[i] + 32768) / 65535 - 0.5;
            const idx = p.idxBytes === 4
                ? new Uint32Array(buf, p.idxOffset, p.tris * 3)
                : new Uint16Array(buf, p.idxOffset, p.tris * 3);
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            g.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
            g.computeVertexNormals();
            const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
                color: spec.hex, roughness: 0.72, metalness: 0.02, transparent: true, opacity: 1
            }));
            mesh.userData.id = p.id;
            mesh.userData.part = p;
            body.add(mesh);
            used.push(p);
        });
        if (!used.length) throw new Error('no parts matched the manifest');

        // Centre and scale baked into the geometry. Doing this with the group's
        // position and scale instead scales the geometry about the group origin
        // while leaving the offset unscaled, which puts the camera inside the model.
        const box = new THREE.Box3().setFromObject(body);
        const size = new THREE.Vector3(), mid = new THREE.Vector3();
        box.getSize(size); box.getCenter(mid);
        const fit = 1.05 / (Math.max(size.x, size.y, size.z) || 1);
        body.children.forEach(m => {
            m.geometry.translate(-mid.x, -mid.y, -mid.z);
            m.geometry.scale(fit, fit, fit);
            m.geometry.computeBoundingSphere();
        });
        body.rotation.x = -Math.PI / 2;      // Z-up -> Y-up

        // Framing measured from the rotated bounds, against BOTH axes of the
        // frame: a body is tall and thin, so which one binds depends on the
        // shape of the canvas.
        const world = new THREE.Box3().setFromObject(body);
        const wsize = new THREE.Vector3(); world.getSize(wsize);
        let dist = 3;
        function fitDistance(sz) {
            sz = sz || wsize;
            const t = Math.tan(camera.fov * Math.PI / 360);
            dist = Math.max((sz.y / 2) / (0.92 * t),
                            (Math.max(sz.x, sz.z) / 2) / (0.92 * t * camera.aspect));
            return dist;
        }
        fitDistance();

        const HOME = { theta: 0.34, phi: 1.5, r: dist };
        let cam = Object.assign({}, HOME);
        let target = new THREE.Vector3(0, 0, 0);
        function place() {
            camera.position.set(
                target.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
                target.y + cam.r * Math.cos(cam.phi),
                target.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta));
            camera.lookAt(target);
        }
        place();

        // ---- interaction --------------------------------------------------
        const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
        let dragging = false, moved = 0, lastX = 0, lastY = 0, idle = true;
        const el = renderer.domElement;

        el.addEventListener('pointerdown', e => {
            dragging = true; moved = 0; idle = false;
            lastX = e.clientX; lastY = e.clientY;
            try { el.setPointerCapture(e.pointerId); } catch (err) {}
        });
        el.addEventListener('pointermove', e => {
            if (!dragging) return;
            const dx = e.clientX - lastX, dy = e.clientY - lastY;
            moved += Math.abs(dx) + Math.abs(dy);
            lastX = e.clientX; lastY = e.clientY;
            cam.theta -= dx * 0.008;
            cam.phi = Math.max(0.25, Math.min(2.9, cam.phi - dy * 0.008));
            place(); draw();
        });
        el.addEventListener('pointerup', e => {
            dragging = false;
            try { el.releasePointerCapture(e.pointerId); } catch (err) {}
            if (moved < 6 && onPick) {          // a click, not the end of a drag
                const r = el.getBoundingClientRect();
                ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
                ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
                ray.setFromCamera(ndc, camera);
                const hit = ray.intersectObjects(body.children.filter(m => m.visible), false)[0];
                onPick(hit ? hit.object.userData.id : null);
            }
        });
        el.addEventListener('wheel', e => {
            e.preventDefault();
            idle = false;
            cam.r = Math.max(dist * 0.35, Math.min(dist * 2.4, cam.r + Math.sign(e.deltaY) * dist * 0.09));
            place(); draw();
        }, { passive: false });

        // ---- the view API -------------------------------------------------
        function select(id) {
            body.children.forEach(m => {
                const on = !id || m.userData.id === id;
                m.material.opacity = on ? 1 : 0.18;
                m.material.emissive.setHex(m.userData.id === id ? 0x2b1d12 : 0x000000);
                m.material.depthWrite = on;
            });
            draw();
        }
        function show(pred) {
            body.children.forEach(m => { m.visible = !pred || !!pred(m.userData.id, m.userData.part); });
            draw();
        }
        function frameOn(id) {
            if (!id) { target.set(0, 0, 0); cam.r = fitDistance(); place(); draw(); return; }
            const m = body.children.find(x => x.userData.id === id);
            if (!m) return;
            const b = new THREE.Box3().setFromObject(m), s = new THREE.Vector3(), c = new THREE.Vector3();
            b.getSize(s); b.getCenter(c);
            target.copy(c);
            cam.r = Math.max(fitDistance(s) * 1.15, 0.35);
            place(); draw();
        }
        // Frame the organs currently VISIBLE rather than the whole model. Adding
        // the brain grew the model's span by 37%, which would otherwise shrink
        // the abdomen for every view that does not include it.
        function frameVisible() {
            const shown = body.children.filter(m => m.visible);
            if (!shown.length) { draw(); return; }
            const b = new THREE.Box3();
            shown.forEach(m => b.expandByObject(m));
            const sz = new THREE.Vector3(), c = new THREE.Vector3();
            b.getSize(sz); b.getCenter(c);
            target.copy(c);
            cam.r = fitDistance(sz);
            HOME.r = cam.r;
            place(); draw();
        }
        function resetView() {
            idle = false;
            cam.theta = HOME.theta; cam.phi = HOME.phi;
            frameVisible();
        }

        let raf = 0;
        function draw() {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => renderer.render(scene, camera));
        }

        // A slow turn until the reader takes hold, so it reads as an object
        // rather than a picture. Stops on first contact and when off screen.
        let spinning = false;
        function spin() {
            if (!spinning || !idle) { spinning = false; return; }
            cam.theta += 0.0035; place();
            renderer.render(scene, camera);
            requestAnimationFrame(spin);
        }
        const io = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting && idle && !spinning) { spinning = true; requestAnimationFrame(spin); }
            else if (!e.isIntersecting) spinning = false;
        }), { threshold: 0.05 });
        io.observe(stage);

        let lastW = 0;
        function resize() {
            const w = Math.max(240, Math.round(stage.clientWidth || W));
            if (w === lastW) return;              // a height change must not re-enter
            lastW = w;
            const h = Math.max(240, Math.min(560, Math.round(w * aspect)));
            stage.style.height = h + 'px';
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            const untouched = Math.abs(cam.r - HOME.r) < 0.001;
            HOME.r = fitDistance();
            if (untouched) cam.r = HOME.r;
            place(); draw();
        }
        const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
        if (ro) ro.observe(stage); else addEventListener('resize', resize);
        resize();
        draw();

        return {
            select, show, frameOn, frameVisible, resetView, canvas: el,
            ids: used.map(p => p.id),
            partOf: id => (used.find(p => p.id === id) || null),
            dispose() {
                spinning = false; io.disconnect(); if (ro) ro.disconnect();
                body.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
                renderer.dispose();
            }
        };
    }
})();
