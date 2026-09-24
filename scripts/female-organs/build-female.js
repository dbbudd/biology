/* Human Reference Atlas female organs -> parts appended to models/systems.bin.
   HRA GLBs are metres, Y-up, +Z anterior, +X the body's left. BodyParts3D is
   millimetres, Z-up, -Y anterior, +X the body's left. Same handedness, same
   real-world scale, so the map is a rotation and a translation only, with
   the translation chosen so the two bladders share a centre. The existing
   bytes of systems.bin are left untouched; new parts are appended and
   quantised into the model's existing shared box. */
const fs = require('fs');
const { read, bbox } = require('./glb.js');
const { decimate } = require('./decimate.js');
const { load } = require('./sysread.js');
const H = process.env.HRA_DIR || (__dirname + '/hra/');   // the six downloaded GLBs
const OUTDIR = process.argv[2];

const { man, bin, parts } = load();
if (man.parts.some(p => p.id === 'uterus')) throw new Error('already built');

// bladder centres
const mb = bbox(parts.bladder.pos);
const mc = [0,1,2].map(k => (mb.mn[k] + mb.mx[k]) / 2);
const fbl = read(H + '3d-vh-f-urinary-bladder.glb').meshes.flatMap(m => m.pos);
const fb = bbox(fbl);
const toBP = (x, y, z) => [1000 * x, -1000 * z, 1000 * y];
const fcRaw = toBP((fb.mn[0]+fb.mx[0])/2, (fb.mn[1]+fb.mx[1])/2, (fb.mn[2]+fb.mx[2])/2);
const T = [0,1,2].map(k => mc[k] - fcRaw[k]);
console.log('male bladder centre', mc.map(n=>n.toFixed(1)), '| female', fcRaw.map(n=>n.toFixed(1)), '| shift', T.map(n=>n.toFixed(1)));

function gather(files, keep) {
    const pos = [], idx = [];
    files.forEach(f => read(H + f).meshes.forEach(m => {
        if (keep && !keep(m.name)) return;
        const base = pos.length / 3;
        for (let i = 0; i < m.pos.length; i += 3) {
            const p = toBP(m.pos[i], m.pos[i+1], m.pos[i+2]);
            pos.push(p[0] + T[0], p[1] + T[1], p[2] + T[2]);
        }
        m.idx.forEach(v => idx.push(base + v));
    }));
    return { pos, idx };
}

// Each file is simplified on its own: a thin tube simplified together with
// the other side gets a grid too coarse for its width and breaks into beads.
const NEW = [
    { id: 'uterus', label: 'Uterus', system: 'reproductive', budget: 4000,
      files: ['3d-vh-f-uterus.glb'] },
    { id: 'oviduct', label: 'Oviducts', system: 'reproductive', budget: 2200,
      files: ['3d-vh-f-fallopian-tube-l.glb', '3d-vh-f-fallopian-tube-r.glb'] },
    { id: 'ovary', label: 'Ovaries', system: 'reproductive', budget: 900,
      files: ['3d-vh-f-ovary-l.glb', '3d-vh-f-ovary-r.glb'] }
];

const chunks = [bin];
let off = bin.length;
const span = man.span, mn = man.min;
NEW.forEach(o => {
    const d = { pos: [], idx: [] }; let rawTris = 0;
    o.files.forEach(f => {
        const raw = gather([f]); rawTris += raw.idx.length / 3;
        const r = raw.idx.length / 3 > o.budget ? decimate(raw, o.budget) : raw;
        const base = d.pos.length / 3;
        d.pos.push(...r.pos); r.idx.forEach(v => d.idx.push(base + v));
    });
    const raw = { idx: { length: rawTris * 3 } };
    const n = d.pos.length / 3;
    const b = bbox(d.pos);
    let clamped = 0;
    const p = Buffer.alloc(n * 6);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
        const q = Math.round((d.pos[i*3+k] - mn[k]) / span * 65535 - 32768);
        if (q < -32768 || q > 32767) clamped++;
        p.writeInt16LE(Math.max(-32768, Math.min(32767, q)), (i*3+k)*2);
    }
    const ib = Buffer.alloc(d.idx.length * 2);
    d.idx.forEach((v, i) => ib.writeUInt16LE(v, i*2));
    man.parts.push({ id: o.id, label: o.label, source: 'hra', system: o.system, verts: n, tris: d.idx.length / 3,
                     posOffset: off, idxOffset: off + p.length, idxBytes: 2 });
    chunks.push(p, ib); off += p.length + ib.length;
    console.log(o.id.padEnd(10), 'raw tris', raw.idx.length/3, '->', d.idx.length/3, '| verts', n, '| clamped', clamped,
        '| min', b.mn.map(v=>v.toFixed(0)).join(','), 'max', b.mx.map(v=>v.toFixed(0)).join(','));
});
man.attribution = 'BodyParts3D, © The Database Center for Life Science, CC BY 4.0';
man.attributionFemale = 'Human Reference Atlas 3D Reference Organs (HuBMAP), from the Visible Human Project of the U.S. National Library of Medicine, CC BY 4.0';
man.femaleSource = 'cdn.humanatlas.io ref-organ uterus-female v1.2, fallopian-tube-female-left/right v1.2, ovary-female-left/right v1.3; placed by bladder centre';
fs.writeFileSync(OUTDIR + '/systems.bin', Buffer.concat(chunks));
fs.writeFileSync(OUTDIR + '/systems.json', JSON.stringify(man));
console.log('systems.bin', bin.length, '->', off, 'bytes');
