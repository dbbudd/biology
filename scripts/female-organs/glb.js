/* Minimal GLB reader: meshes with node transforms applied (world space). */
const fs = require('fs');
function mat4mul(a, b) { const o = new Array(16).fill(0);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c*4+r] += a[k*4+r] * b[c*4+k]; return o; }
function trs(n) {
    if (n.matrix) return n.matrix.slice();
    const [tx,ty,tz] = n.translation || [0,0,0], [qx,qy,qz,qw] = n.rotation || [0,0,0,1], [sx,sy,sz] = n.scale || [1,1,1];
    const x2=qx+qx,y2=qy+qy,z2=qz+qz,xx=qx*x2,xy=qx*y2,xz=qx*z2,yy=qy*y2,yz=qy*z2,zz=qz*z2,wx=qw*x2,wy=qw*y2,wz=qw*z2;
    return [(1-(yy+zz))*sx,(xy+wz)*sx,(xz-wy)*sx,0,(xy-wz)*sy,(1-(xx+zz))*sy,(yz+wx)*sy,0,(xz+wy)*sz,(yz-wx)*sz,(1-(xx+yy))*sz,0,tx,ty,tz,1];
}
function read(file) {
    const buf = fs.readFileSync(file);
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
    const binStart = 20 + jsonLen + 8;
    const bin = buf.slice(binStart);
    const acc = i => {
        const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
        const comps = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4 }[a.type];
        const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
        const stride = bv.byteStride || comps * T.BYTES_PER_ELEMENT;
        const out = new Array(a.count * comps);
        const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
        for (let i2 = 0; i2 < a.count; i2++) for (let c = 0; c < comps; c++) {
            const o = base + i2 * stride + c * T.BYTES_PER_ELEMENT;
            out[i2*comps+c] = T === Float32Array ? bin.readFloatLE(o) : T === Uint32Array ? bin.readUInt32LE(o) : T === Uint16Array ? bin.readUInt16LE(o) : bin.readUInt8(o);
        }
        return out;
    };
    const meshes = [];
    const walk = (ni, parent, path) => {
        const n = json.nodes[ni]; const m = mat4mul(parent, trs(n));
        const name = n.name || ('node' + ni);
        if (n.mesh !== undefined) {
            json.meshes[n.mesh].primitives.forEach(p => {
                if (p.mode !== undefined && p.mode !== 4) return;
                const P = acc(p.attributes.POSITION), I = p.indices !== undefined ? acc(p.indices) : [...Array(P.length/3).keys()];
                const pos = [];
                for (let i = 0; i < P.length; i += 3) { const x=P[i],y=P[i+1],z=P[i+2];
                    pos.push(m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]); }
                meshes.push({ name, path: path.concat(name).join(' / '), pos, idx: I });
            });
        }
        (n.children || []).forEach(c => walk(c, m, path.concat(name)));
    };
    const I4 = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
    json.scenes[json.scene || 0].nodes.forEach(ni => walk(ni, I4, []));
    return { json, meshes };
}
function bbox(pos) { const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
    for (let i=0;i<pos.length;i+=3) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],pos[i+k]); mx[k]=Math.max(mx[k],pos[i+k]); } return {mn,mx}; }
module.exports = { read, bbox };
if (require.main === module) process.argv.slice(2).forEach(f => {
    const { json, meshes } = read(f);
    console.log('==', f.split('/').pop(), '| asset', JSON.stringify(json.asset), '| meshes', meshes.length);
    meshes.forEach(m => { const b = bbox(m.pos); console.log('  ', m.path.padEnd(60).slice(0,60), 'v', m.pos.length/3, 't', m.idx.length/3,
        'min', b.mn.map(n=>n.toFixed(3)).join(','), 'max', b.mx.map(n=>n.toFixed(3)).join(',')); });
});
