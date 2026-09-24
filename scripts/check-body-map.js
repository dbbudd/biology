/* Verify assets/body-map.js against the real course.
   Run: node scripts/check-body-map.js
   Checks every destination resolves to a real chapter AND a real <section id>,
   that every organ in models/systems.json is in the map, and vice versa. */
const fs = require('fs');
const path = require('path');
process.chdir(path.join(__dirname, '..'));
global.window = {};
eval(fs.readFileSync('assets/toc.js', 'utf8'));
eval(fs.readFileSync('assets/body-map.js', 'utf8'));
const map = window.BODY_MAP;
const model = JSON.parse(fs.readFileSync('models/systems.json', 'utf8'));

const bad = [];
const cache = {};
let links = 0;
map.organs.forEach(o => {
    (o.where || []).forEach(([chapId, sec]) => {
        links++;
        const c = window.COURSE.chapters.find(x => x.id === chapId);
        if (!c) return bad.push(o.id + ' -> ' + chapId + ': no such chapter');
        const html = cache[c.file] || (cache[c.file] = fs.readFileSync(c.file, 'utf8'));
        if (!html.includes('<section id="' + sec + '"')) {
            bad.push(o.id + ' -> ' + chapId + '#' + sec + ': no such section');
        }
    });
    if (!map.systems[o.sys]) bad.push(o.id + ': unknown system "' + o.sys + '"');
});
model.parts.forEach(p => {
    if (!map.byId[p.id]) bad.push('model has "' + p.id + '" but the map does not');
});
map.organs.forEach(o => {
    if (!model.parts.some(p => p.id === o.id)) bad.push('map has "' + o.id + '" but the model does not');
});

if (bad.length) { console.error('FAILED:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('ok — ' + map.organs.length + ' organs, ' + links + ' destinations, all resolve');
