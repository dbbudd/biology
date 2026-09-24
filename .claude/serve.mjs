// Local test server for the course reader — no dependencies, Node 18+.
//
//   node .claude/serve.mjs            serves this folder at http://localhost:4321
//   node .claude/serve.mjs 8080       on another port
//
// The reader must be served over http(s), not opened as a file: the Flash cards
// and Present tools read every chapter in a unit with fetch(), which browsers
// block on file:// pages. GitHub Pages serves it the same way this does.
// Responses are sent with no-store so an edited file shows on the next reload.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 4321;
const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
    // GitHub Pages sends application/wasm; without it here the browser falls back
    // to slower WebAssembly loading and local testing understates the natural voice
    '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.data': 'application/octet-stream'
};

createServer(async (req, res) => {
    try {
        let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        path = normalize(path).replace(/^(\.\.[/\\])+/, '');
        let file = join(root, path);
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(body);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
    }
}).listen(port, () => console.log('Course reader at http://localhost:' + port + '/'));
