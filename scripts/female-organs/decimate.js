// Vertex clustering: snap to a grid, average each cell, drop degenerate faces.
function cluster(pos, idx, cells) {
    let mnx = 1e9, mny = 1e9, mnz = 1e9, mxx = -1e9, mxy = -1e9, mxz = -1e9;
    for (let i = 0; i < pos.length; i += 3) {
        mnx = Math.min(mnx, pos[i]); mxx = Math.max(mxx, pos[i]);
        mny = Math.min(mny, pos[i+1]); mxy = Math.max(mxy, pos[i+1]);
        mnz = Math.min(mnz, pos[i+2]); mxz = Math.max(mxz, pos[i+2]);
    }
    const span = Math.max(mxx-mnx, mxy-mny, mxz-mnz) || 1;
    const step = span / cells;
    const map = new Map(), sums = [], remap = new Int32Array(pos.length / 3);
    for (let i = 0, v = 0; i < pos.length; i += 3, v++) {
        const k = Math.floor((pos[i]-mnx)/step) + ',' + Math.floor((pos[i+1]-mny)/step) + ',' + Math.floor((pos[i+2]-mnz)/step);
        let c = map.get(k);
        if (c === undefined) { c = sums.length / 4; map.set(k, c); sums.push(0,0,0,0); }
        sums[c*4] += pos[i]; sums[c*4+1] += pos[i+1]; sums[c*4+2] += pos[i+2]; sums[c*4+3]++;
        remap[v] = c;
    }
    const out = new Float64Array(sums.length / 4 * 3);
    for (let c = 0; c < sums.length / 4; c++) {
        const n = sums[c*4+3];
        out[c*3] = sums[c*4]/n; out[c*3+1] = sums[c*4+1]/n; out[c*3+2] = sums[c*4+2]/n;
    }
    const tri = [];
    for (let i = 0; i < idx.length; i += 3) {
        const a = remap[idx[i]], b = remap[idx[i+1]], c = remap[idx[i+2]];
        if (a !== b && b !== c && a !== c) tri.push(a, b, c);
    }
    return { pos: out, idx: tri };
}

// Binary search the grid resolution that lands nearest the triangle budget.
function decimate(mesh, budget) {
    let lo = 8, hi = 260, best = null;
    for (let i = 0; i < 12; i++) {
        const mid = Math.round((lo + hi) / 2);
        const r = cluster(mesh.pos, mesh.idx, mid);
        const tris = r.idx.length / 3;
        if (!best || Math.abs(tris - budget) < Math.abs(best.tris - budget)) best = { ...r, tris, cells: mid };
        if (tris > budget) hi = mid - 1; else lo = mid + 1;
        if (lo > hi) break;
    }
    return best;
}

module.exports = { cluster, decimate };
