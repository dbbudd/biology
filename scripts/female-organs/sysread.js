const fs = require('fs');
const M = require('path').join(__dirname, '..', '..', 'models') + '/';
function load() {
    const man = JSON.parse(fs.readFileSync(M + 'systems.json')), bin = fs.readFileSync(M + 'systems.bin');
    const parts = {};
    man.parts.forEach(p => {
        const pos = new Float64Array(p.verts * 3);
        for (let i = 0; i < p.verts * 3; i++) pos[i] = man.min[i % 3] + (bin.readInt16LE(p.posOffset + i * 2) + 32768) / 65535 * man.span;
        const idx = [];
        for (let i = 0; i < p.tris * 3; i++) idx.push(p.idxBytes === 4 ? bin.readUInt32LE(p.idxOffset + i * 4) : bin.readUInt16LE(p.idxOffset + i * 2));
        parts[p.id] = { ...p, pos, idx };
    });
    return { man, bin, parts };
}
module.exports = { load };
if (require.main === module) {
    const { parts } = load();
    for (const id of Object.keys(parts)) {
        const pos = parts[id].pos; const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9], c=[0,0,0];
        for (let i=0;i<pos.length;i+=3) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],pos[i+k]); mx[k]=Math.max(mx[k],pos[i+k]); c[k]+=pos[i+k]; }
        console.log(id.padEnd(16), 'min', mn.map(n=>n.toFixed(0).padStart(5)).join(' '), ' max', mx.map(n=>n.toFixed(0).padStart(5)).join(' '), ' size', mx.map((v,k)=>(v-mn[k]).toFixed(0).padStart(4)).join(' '));
    }
}
