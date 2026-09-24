/* =============================================================
   INTERACTIVE — The succession timeline
   -------------------------------------------------------------
   Registers window.SIMS['u3-succession'].  Serves HS-LS2-6:
   "I can explain the process of ecological succession and analyse
   the factors that cause succession."

   This is the one target in Unit 3 with no source material behind
   it at all, so the sim has to carry a share of the teaching.

   The reader chooses a real disturbance and then walks the
   recovery one stage at a time, committing to a prediction before
   each stage is revealed. Two panels track alongside: soil depth
   and species richness. Running a primary track and then a
   secondary track makes the whole idea visible without it having
   to be asserted — the two lines start in completely different
   places, climb at completely different speeds, and end up at the
   same community.
   ============================================================= */
(function () {
    'use strict';
    window.SIMS = window.SIMS || {};
    const U = window.SIM_UI;
    const STYLE_ID = 'sim-u3sn-style';

    const W = 660, H = 250;
    const PAD = { l: 62, r: 60, t: 18, b: 40 };

    /* Each stage: label, what is living there, years since the disturbance,
       soil depth in cm, and the number of plant species you would find.
       Values are order-of-magnitude teaching figures, chosen to match the
       real chronosequences the chapter cites rather than any single site. */
    const TRACKS = {
        surtsey: {
            name: 'A brand-new volcanic island',
            kind: 'primary',
            blurb: 'Surtsey rose out of the sea off Iceland in 1963. Sterile ash and lava, ' +
                   'no soil, no seeds, no life of any kind.',
            stages: [
                { yr: 0,   soil: 0,   sp: 0,  name: 'Bare volcanic rock', who: 'Nothing. Sterile ash and cooled lava.' },
                { yr: 2,   soil: 0.1, sp: 1,  name: 'First arrivals', who: 'Sea rocket, washed ashore as a seed. Mosses on the damp rock.',
                  q: 'What can live on bare rock with no soil at all?',
                  opts: ['Grasses — their roots are shallow', 'Lichens and mosses, plus a few salt-tolerant seeds off the tide', 'Pine seedlings — they are famously tough'],
                  a: 1,
                  why: 'Lichens and mosses. A lichen is a fungus and an alga living as one organism: the ' +
                       'alga photosynthesises, the fungus grips the rock and pulls minerals out of it with ' +
                       'weak acids. It needs no soil because it makes its own foothold. Anything with ' +
                       'roots needs soil, and soil does not exist yet.' },
                { yr: 20,  soil: 1,   sp: 13, name: 'Mosses and the first soil', who: 'Moss carpets; grasses taking hold in the cracks.',
                  q: 'Where does the first soil come from?',
                  opts: ['It blows in from the mainland', 'From rock broken down by lichen acids and frost, mixed with dead lichen and moss', 'It is carried in by birds'],
                  a: 1,
                  why: 'Soil is rock plus dead things. Lichen acids and freeze-thaw crack the rock into ' +
                       'grains; every lichen and moss that dies adds organic matter that holds water and ' +
                       'nutrients. This is the slow step of primary succession, and it is why building an ' +
                       'ecosystem from bare rock takes centuries rather than decades.' },
                { yr: 40,  soil: 3,   sp: 31, name: 'Grassland', who: 'Grasses and low herbs; gulls begin nesting.',
                  q: 'Gulls start nesting on the island. What does that do?',
                  opts: ['Slows things down — they trample the plants', 'Speeds things up sharply — droppings fertilise the ground and they carry seeds in', 'Makes no difference to the plants'],
                  a: 1,
                  why: 'It transforms the place. Seabird droppings are concentrated nitrogen and ' +
                       'phosphorus, exactly what thin new soil lacks, and gulls carry seeds in on their ' +
                       'feet and in their guts. On Surtsey the plant species count climbed far faster ' +
                       'after gulls colonised in 1985 than before it. Succession is not just plants ' +
                       'arriving in order — each stage changes the conditions for the next.' },
                { yr: 120, soil: 8,   sp: 60, name: 'Shrubs and dense herbs', who: 'Willow scrub, thick herb layer, insects, nesting birds.',
                  q: 'The grasses that dominated at year 40 are being crowded out. Why?',
                  opts: ['The soil has become poisonous to them', 'The shrubs they made possible now shade them out', 'They have used up all the water'],
                  a: 1,
                  why: 'They are shaded out by the very plants their soil made possible. This is the ' +
                       'engine of succession: each community changes the site — deeper soil, more shade, ' +
                       'more moisture — until the site suits somebody else better than it suits them.' },
                { yr: 400, soil: 20,  sp: 75, name: 'Climax community', who: 'A stable community matched to the local climate: in Iceland, low birch woodland and heath.',
                  q: 'What does it mean to call this the climax community?',
                  opts: ['Nothing will ever change here again', 'The composition stays roughly steady until the next disturbance', 'It holds the greatest number of individual organisms possible'],
                  a: 1,
                  why: 'It means the community stops <em>directionally</em> changing — species keep ' +
                       'replacing one another individually, but the overall mix stays much the same ' +
                       'until something disturbs it. It is a moving equilibrium, not a museum. ' +
                       'Ecologists now treat "climax" as a useful description rather than a destiny: ' +
                       'the same starting point can end in different communities depending on climate, ' +
                       'soil and luck.' }
            ]
        },
        glacier: {
            name: 'Ground uncovered by a retreating glacier',
            kind: 'primary',
            blurb: 'At Glacier Bay in Alaska the ice has pulled back about 100 km since 1750, ' +
                   'exposing bare, ground-up rock a strip at a time.',
            stages: [
                { yr: 0,   soil: 0,   sp: 0,  name: 'Bare glacial till', who: 'Crushed rock flour. No nitrogen, no organic matter.' },
                { yr: 10,  soil: 0.3, sp: 4,  name: 'Mosses and mountain avens', who: 'Mosses, then Dryas — a low plant that fixes nitrogen.',
                  q: 'The rock has minerals but almost no nitrogen. Which plant can start here?',
                  opts: ['Any plant — nitrogen is not important', 'One that partners with bacteria able to pull nitrogen out of the air', 'A plant with very deep roots'],
                  a: 1,
                  why: 'A nitrogen fixer. Mountain avens and, later, alder host bacteria in their roots ' +
                       'that convert nitrogen gas into a usable form. They are not just surviving the ' +
                       'poor soil — they are manufacturing the fertility that everything after them ' +
                       'depends on.' },
                { yr: 35,  soil: 2,   sp: 12, name: 'Alder thicket', who: 'Dense alder, fixing nitrogen fast; soil darkening.',
                  q: 'Under the alders the soil nitrogen rises sharply. Who benefits most?',
                  opts: ['The alders themselves — they grow even better', 'Spruce seedlings, which need that nitrogen and eventually overtop the alder', 'Nobody; the nitrogen washes away'],
                  a: 1,
                  why: 'Spruce. The alders build the soil and are then shaded out by the trees that soil ' +
                       'allowed. It is a striking case of a species engineering its own replacement — ' +
                       'and it happens on a timescale short enough that you can walk from one stage to ' +
                       'the next along the shore of Glacier Bay.' },
                { yr: 80,  soil: 6,   sp: 20, name: 'Spruce forest', who: 'Sitka spruce closing over; the alder gone from the understorey.',
                  q: 'Why does species richness stop rising once the spruce canopy closes?',
                  opts: ['The soil runs out', 'Deep shade excludes the light-demanding plants that came before', 'The climate changes'],
                  a: 1,
                  why: 'Shade. A closed conifer canopy takes most of the light before it reaches the ' +
                       'ground, so the sun-loving pioneers cannot persist. Mid-succession is often the ' +
                       'richest moment — a mixture of old and new — and the climax community can be ' +
                       'less diverse than the stage before it.' },
                { yr: 200, soil: 15,  sp: 24, name: 'Spruce–hemlock climax', who: 'Western hemlock replacing spruce; a stable, shaded forest.',
                  q: 'Hemlock replaces spruce even though spruce grows faster. How?',
                  opts: ['Hemlock seedlings tolerate deep shade and spruce seedlings do not', 'Hemlock poisons the spruce', 'Spruce trees only live 200 years'],
                  a: 0,
                  why: 'Shade tolerance. Under a closed canopy the winner is not the fastest grower but ' +
                       'the one whose seedlings can survive in near-darkness until a gap opens. That is ' +
                       'why late-succession forests are made of shade-tolerant species almost everywhere ' +
                       'in the world.' }
            ]
        },
        fire: {
            name: 'A forest after a wildfire',
            kind: 'secondary',
            blurb: 'The trees are dead and the canopy is gone — but the soil is still there, ' +
                   'and so are the seeds and roots inside it.',
            stages: [
                { yr: 0,  soil: 22, sp: 3,  name: 'Burnt ground', who: 'Ash, charred trunks, and an intact soil full of surviving seeds and roots.' },
                { yr: 1,  soil: 22, sp: 25, name: 'Fireweed and grasses', who: 'Fireweed, grasses and herbs, straight up out of the seed bank.',
                  q: 'One year after the fire there are more plant species here than at year 20 of the ' +
                     'volcanic island. Why so fast?',
                  opts: ['Fire fertilises the ground with ash', 'The soil survived, and with it a bank of living seeds and roots', 'Wildfires are less destructive than people think'],
                  a: 1,
                  why: 'Because the slow step never had to happen. Making soil from rock takes centuries; ' +
                       'this soil was already there, complete with a seed bank and root systems that ' +
                       'survived below ground. <strong>That single difference is what separates ' +
                       'secondary succession from primary succession</strong> — not how violent the ' +
                       'disturbance looked.' },
                { yr: 8,  soil: 22, sp: 40, name: 'Shrubs and saplings', who: 'Shrubs, birch and aspen suckers, fast-growing pioneers.',
                  q: 'Why do birch and aspen dominate this stage rather than oak or spruce?',
                  opts: ['They grow fast in full sun and disperse seed widely', 'They are the only trees that survive fire', 'Their seeds need heat to germinate'],
                  a: 0,
                  why: 'They are pioneers: fast-growing, light-demanding, and prolific seed producers ' +
                       'that get everywhere. In open ground, speed wins. Their weakness is that their ' +
                       'own seedlings cannot grow in their own shade.' },
                { yr: 40, soil: 24, sp: 45, name: 'Young mixed woodland', who: 'A closing canopy of pioneer trees; shade-tolerant seedlings underneath.',
                  q: 'Underneath the birch, which seedlings are waiting?',
                  opts: ['More birch', 'Shade-tolerant species like oak, beech or hemlock', 'None — nothing grows in shade'],
                  a: 1,
                  why: 'The shade-tolerant ones. The pioneers created the shade that stops their own ' +
                       'offspring and suits their replacements. Every stage of succession contains the ' +
                       'seeds of the stage that removes it.' },
                { yr: 130, soil: 28, sp: 42, name: 'Mature forest', who: 'A closed, shade-tolerant canopy — the climax community, restored.',
                  q: 'The forest is back after about 130 years. What would have to be true for it ' +
                     'NOT to come back?',
                  opts: ['Nothing — forests always return', 'The soil is stripped away, the seed source is too far off, or the conditions themselves have changed', 'Only if it burns again'],
                  a: 1,
                  why: 'Recovery is not guaranteed. Burn the soil away or wash it off a slope and you ' +
                       'are back to primary succession. Cut the site off from any seed source and the ' +
                       'species may never arrive. And if the conditions have permanently changed — a ' +
                       'drier climate, a new grazing animal, an invasive grass that burns every three ' +
                       'years — the site can settle into a different, stable community altogether. ' +
                       'That is HS-LS2-6 in one sentence: changing conditions may result in a new ' +
                       'ecosystem, not a recovered one.' }
            ]
        },
        farm: {
            name: 'Abandoned farmland',
            kind: 'secondary',
            blurb: 'A ploughed field in the Piedmont of the south-eastern United States, walked ' +
                   'away from and left alone. Ecologists have tracked this recovery for a century.',
            stages: [
                { yr: 0,  soil: 20, sp: 2,  name: 'Bare ploughed field', who: 'Ploughed, weeded soil. Ploughing has depleted it, but it is still soil.' },
                { yr: 1,  soil: 20, sp: 15, name: 'Annual weeds', who: 'Crabgrass, horseweed, ragweed — annuals, seeding within months.',
                  q: 'What takes a field over in the first summer after it is abandoned?',
                  opts: ['Tree seedlings', 'Fast-seeding annual weeds', 'Grasses that take several years to establish'],
                  a: 1,
                  why: 'Annual weeds. They live one season, put everything into seed, and disperse ' +
                       'enormous numbers of it. On any bare ground the first winners are always the ' +
                       'fastest reproducers, not the strongest competitors.' },
                { yr: 4,  soil: 21, sp: 28, name: 'Perennial grasses', who: 'Broomsedge and other perennials, holding ground year to year.',
                  q: 'By year four, perennial grasses have replaced the annual weeds. Why?',
                  opts: ['The weeds exhausted the soil', 'Perennials keep their roots through the winter and start growing before the annuals germinate', 'Farmers reseeded the field'],
                  a: 1,
                  why: 'A perennial does not have to start from a seed every spring. It holds the ground ' +
                       'it has and starts growing the moment conditions allow, so it beats an annual to ' +
                       'the light. Once ground is occupied, staying power beats speed.' },
                { yr: 20, soil: 23, sp: 35, name: 'Pine woodland', who: 'Loblolly and shortleaf pine, seeded in among the grass, now overhead.',
                  q: 'Pines have taken over. What did they need that the bare field could not offer?',
                  opts: ['Shade from the grasses while they were seedlings, plus soil to root in', 'Colder winters', 'Nothing — they could have grown on day one'],
                  a: 0,
                  why: 'Pine seedlings need shelter and a rooting medium; the grass stage provided both. ' +
                       'This is <span>facilitation</span> — one stage making the next possible — and it ' +
                       'is the reason succession runs in a recognisable order rather than at random.' },
                { yr: 100, soil: 30, sp: 40, name: 'Oak–hickory forest', who: 'Hardwoods that grew up in the pine shade and outlived it. The climax community.',
                  q: 'The pines are dying out and no young pines are replacing them. Why not?',
                  opts: ['Disease', 'Pine seedlings cannot grow in the shade the pines themselves cast; oak and hickory seedlings can', 'The soil has become too rich'],
                  a: 1,
                  why: 'The same story again, in a fourth setting. Pines are light-demanding, so a pine ' +
                       'forest cannot regenerate under itself, while oak and hickory seedlings wait in ' +
                       'the shade for a gap. Notice how little the mechanism has changed across ash, ' +
                       'glacial rubble, burnt ground and a ploughed field — that repeatability is why ' +
                       'succession counts as a general process rather than a set of stories.' }
            ]
        }
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.u3sn { --u3-ok:#2e7d32; }',
            '[data-theme="dark"] .u3sn { --u3-ok:#7fc98a; }',
            '[data-theme="sepia"] .u3sn { --u3-ok:#4a6b3d; }',
            '.u3sn-picks { display:flex; gap:0.4rem; flex-wrap:wrap; padding:1rem 1.25rem 0.2rem; }',
            '.u3sn-pick { font:inherit; font-size:0.75rem; cursor:pointer; padding:0.42rem 0.75rem;',
            '   border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text); }',
            '.u3sn-pick:hover { border-color:var(--light-teal); }',
            '.u3sn-pick[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal);',
            '   font-weight:700; background:var(--bg-surface); }',
            '.u3sn-tag { font-size:0.62rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;',
            '   border:1px solid currentColor; border-radius:999px; padding:0.02rem 0.4rem; margin-left:0.4rem; }',
            '.u3sn-tag.primary { color:var(--red); } .u3sn-tag.secondary { color:var(--u3-ok); }',
            '.u3sn-body { padding:0.5rem 1.25rem 0; font-size:0.88rem; line-height:1.65; }',
            '.u3sn-body p { margin:0 0 0.7rem; }',
            '.u3sn-stage { font-weight:800; font-size:1rem; margin-bottom:0.15rem !important; }',
            '.u3sn-who { color:var(--text-secondary); }',
            '.u3sn-q { font-weight:700; }',
            '.u3sn-opts { display:flex; flex-direction:column; gap:0.4rem; margin:0 0 0.9rem; }',
            '.u3sn-opt { font:inherit; font-size:0.83rem; text-align:left; cursor:pointer;',
            '   padding:0.5rem 0.8rem; border:1px solid var(--border); border-radius:8px;',
            '   background:var(--bg); color:var(--text); transition:all 0.12s; }',
            '.u3sn-opt:hover { border-color:var(--light-teal); }',
            '.u3sn-opt:focus-visible { outline:2px solid var(--light-teal); outline-offset:2px; }',
            '.u3sn-opt[aria-pressed="true"] { border-color:var(--light-teal); box-shadow:0 0 0 2px var(--light-teal); }',
            '.u3sn-opt.right { border-color:var(--u3-ok); box-shadow:0 0 0 2px var(--u3-ok); font-weight:600; }',
            '.u3sn-opt.wrong { border-color:var(--red); box-shadow:0 0 0 2px var(--red); opacity:0.78; }',
            '.u3sn-why { border-left:3px solid var(--light-teal); padding:0.1rem 0 0.1rem 0.85rem;',
            '   margin:0 0 0.9rem; font-size:0.85rem; line-height:1.6; }',
            '.u3sn-why.hit { border-left-color:var(--u3-ok); }',
            '.u3sn-blurb { color:var(--text-secondary); font-size:0.83rem; padding:0 1.25rem 0.2rem; }',
            '.u3sn .sim-btn:disabled { opacity:0.45; cursor:not-allowed; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    window.SIMS['u3-succession'] = function (root) {
        injectStyle();
        const wrap = U.el('div', 'u3sn');
        root.appendChild(wrap);

        let key = 'surtsey';
        let idx = 0;             // stage reached
        let picked = null, locked = false;
        const seen = {};         // track -> furthest stage reached

        const picks = U.el('div', 'u3sn-picks');
        const blurb = U.el('div', 'u3sn-blurb');
        wrap.appendChild(picks); wrap.appendChild(blurb);

        const st = U.stage(wrap, W, H,
            'Two lines against years since the disturbance: soil depth in centimetres and the number ' +
            'of plant species present. Both are drawn only as far as the stage reached.');
        const canvas = st.canvas, ctx = st.ctx;

        const body = U.el('div', 'u3sn-body');
        wrap.appendChild(body);

        const btns = U.el('div', 'sim-buttons');
        wrap.appendChild(btns);
        const bLock = U.button(btns, 'Lock in my answer', 'primary');
        const bNext = U.button(btns, 'Advance the clock');
        const bReset = U.button(btns, 'Restart this track');

        const readout = U.el('div', 'sim-readout');
        wrap.appendChild(readout);

        bLock.addEventListener('click', () => { if (picked !== null && !locked) { locked = true; render(); } });
        bNext.addEventListener('click', () => {
            const T = TRACKS[key];
            if (idx >= T.stages.length - 1) return;
            if (T.stages[idx + 1].q && !locked) return;     // must answer first
            idx++; picked = null; locked = false;
            seen[key] = Math.max(seen[key] || 0, idx);
            render();
        });
        bReset.addEventListener('click', () => { idx = 0; picked = null; locked = false; render(); });

        Object.keys(TRACKS).forEach(k => {
            const b = U.el('button', 'u3sn-pick');
            b.type = 'button';
            b.innerHTML = TRACKS[k].name + '<span class="u3sn-tag ' + TRACKS[k].kind + '">' +
                TRACKS[k].kind + '</span>';
            b.addEventListener('click', () => { key = k; idx = 0; picked = null; locked = false; render(); });
            picks.appendChild(b);
        });

        /* ---------- drawing ----------------------------------------- */
        const theme = U.theme(() => draw());

        function draw() {
            const T = TRACKS[key], t = theme.current;
            const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
            const maxYr = T.stages[T.stages.length - 1].yr;
            const maxSoil = 32, maxSp = 80;
            // square-root year axis: the early years are where everything happens
            const sx = y => PAD.l + Math.sqrt(y / maxYr) * pw;
            const sySoil = v => PAD.t + ph - v / maxSoil * ph;
            const sySp = v => PAD.t + ph - v / maxSp * ph;

            ctx.clearRect(0, 0, W, H); ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
            ctx.font = '10px system-ui, sans-serif';
            [0, 8, 16, 24, 32].forEach(v => {
                const y = sySoil(v);
                ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + pw, y); ctx.stroke();
                ctx.fillStyle = t.red; ctx.textAlign = 'right'; ctx.fillText(v + ' cm', PAD.l - 7, y + 3.5);
            });
            [0, 20, 40, 60, 80].forEach(v => {
                ctx.fillStyle = t.blue; ctx.textAlign = 'left';
                ctx.fillText(String(v), PAD.l + pw + 7, sySp(v) + 3.5);
            });
            ctx.strokeStyle = t.axis; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, PAD.t + ph);
            ctx.lineTo(PAD.l + pw, PAD.t + ph); ctx.stroke();
            ctx.moveTo(PAD.l + pw, PAD.t); ctx.lineTo(PAD.l + pw, PAD.t + ph); ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.fillStyle = t.axis; ctx.textAlign = 'center';
            T.stages.forEach((s, i) => {
                if (i === 0 || i === T.stages.length - 1 || i % 2 === 0)
                    ctx.fillText(s.yr + (i === T.stages.length - 1 ? ' yr' : ''), sx(s.yr), PAD.t + ph + 15);
            });
            ctx.fillText('Years since the disturbance', PAD.l + pw / 2, H - 5);
            ctx.save(); ctx.translate(13, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = t.red; ctx.fillText('Soil depth', 0, 0); ctx.restore();
            ctx.save(); ctx.translate(W - 6, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = t.blue; ctx.fillText('Plant species', 0, 0); ctx.restore();

            const upto = T.stages.slice(0, idx + 1);
            // ghost of the rest
            ctx.setLineDash([4, 4]); ctx.globalAlpha = 0.28; ctx.lineWidth = 1.6;
            [['soil', sySoil, t.red], ['sp', sySp, t.blue]].forEach(([f, sy, col]) => {
                ctx.strokeStyle = col; ctx.beginPath();
                T.stages.slice(idx).forEach((s, i) => {
                    const x = sx(s.yr), y = sy(s[f]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                });
                ctx.stroke();
            });
            ctx.setLineDash([]); ctx.globalAlpha = 1;

            [['soil', sySoil, t.red], ['sp', sySp, t.blue]].forEach(([f, sy, col]) => {
                ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
                ctx.beginPath();
                upto.forEach((s, i) => { const x = sx(s.yr), y = sy(s[f]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
                ctx.stroke();
                ctx.fillStyle = col;
                upto.forEach(s => { ctx.beginPath(); ctx.arc(sx(s.yr), sy(s[f]), 3.6, 0, Math.PI * 2); ctx.fill(); });
            });

            // where we are
            const here = T.stages[idx];
            ctx.strokeStyle = t.axis; ctx.setLineDash([3, 3]); ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx(here.yr), PAD.t); ctx.lineTo(sx(here.yr), PAD.t + ph); ctx.stroke();
            ctx.setLineDash([]); ctx.globalAlpha = 1;
            ctx.fillStyle = t.ink; ctx.font = '600 11px system-ui, sans-serif';
            ctx.textAlign = sx(here.yr) > PAD.l + pw * 0.6 ? 'right' : 'left';
            ctx.fillText(here.name, sx(here.yr) + (sx(here.yr) > PAD.l + pw * 0.6 ? -7 : 7), PAD.t + 12);
        }

        function render() {
            const T = TRACKS[key], S = T.stages[idx];
            Array.from(picks.children).forEach((b, i) =>
                b.setAttribute('aria-pressed', Object.keys(TRACKS)[i] === key ? 'true' : 'false'));
            blurb.textContent = T.blurb;

            let html = '<p class="u3sn-stage">Year ' + S.yr + ' &middot; ' + S.name + '</p>' +
                       '<p class="u3sn-who">' + S.who + '</p>';
            const nxt = T.stages[idx + 1];
            if (nxt && nxt.q) {
                html += '<p class="u3sn-q">' + nxt.q + '</p><div class="u3sn-opts">' +
                    nxt.opts.map((o, i) => {
                        let cls = 'u3sn-opt';
                        if (locked) {
                            if (i === nxt.a) cls += ' right';
                            else if (i === picked) cls += ' wrong';
                        }
                        return '<button type="button" class="' + cls + '" data-i="' + i + '" aria-pressed="' +
                            (picked === i ? 'true' : 'false') + '">' + o + '</button>';
                    }).join('') + '</div>' +
                    (locked ? '<div class="u3sn-why' + (picked === nxt.a ? ' hit' : '') + '">' +
                        (picked === nxt.a ? '<strong>Right. </strong>' : '') + nxt.why + '</div>' : '');
            } else if (!nxt) {
                const first = T.stages[0], last = T.stages[T.stages.length - 1];
                html += '<p><strong>This track is complete.</strong> It took <strong>' + last.yr +
                    ' years</strong> to get from ' + first.name.toLowerCase() + ' to a climax community, ' +
                    'and the soil went from <strong>' + first.soil + ' cm</strong> to <strong>' +
                    last.soil + ' cm</strong>.</p>' +
                    '<p>Now run a ' + (T.kind === 'primary' ? 'secondary' : 'primary') +
                    ' track and compare the two red lines. The difference in <em>starting soil depth</em> ' +
                    'is the whole reason the timescales differ by a factor of ten.</p>';
            }
            body.innerHTML = html;
            body.querySelectorAll('.u3sn-opt').forEach(b =>
                b.addEventListener('click', () => { if (!locked) { picked = +b.dataset.i; render(); } }));

            bLock.disabled = !nxt || !nxt.q || locked || picked === null;
            bNext.disabled = !nxt || (nxt.q && !locked);
            bNext.textContent = nxt ? 'Advance to year ' + nxt.yr : 'Climax reached';

            const done = Object.keys(TRACKS).filter(k => (seen[k] || 0) >= TRACKS[k].stages.length - 1);
            readout.innerHTML =
                '<strong>' + T.name + '</strong> &middot; ' +
                (T.kind === 'primary'
                    ? '<strong>Primary succession</strong> — it began with no soil, so soil has to be ' +
                      'manufactured before anything with roots can live here.'
                    : '<strong>Secondary succession</strong> — the soil survived the disturbance, so the ' +
                      'slowest step is already done.') +
                ' Soil now <strong>' + S.soil + ' cm</strong>, plant species <strong>' + S.sp + '</strong>.' +
                (done.length >= 2 ? '<br>You have completed ' + done.length + ' tracks. Compare the ' +
                    'years on the bottom axis: that gap is what "the soil survived" is worth.' :
                    '<br>Complete a primary and a secondary track to see the comparison the chapter is built on.');
            draw();
        }

        render();

        /* ---------- verification hooks ------------------------------- */
        root._simState = () => {
            const T = TRACKS[key], S = T.stages[idx];
            return {
                track: key, kind: T.kind,
                stageIndex: idx, stageName: S.name,
                years: S.yr, soilCm: S.soil, plantSpecies: S.sp,
                atClimax: idx === T.stages.length - 1,
                picked, locked,
                tracksCompleted: Object.keys(TRACKS).filter(k => (seen[k] || 0) >= TRACKS[k].stages.length - 1)
            };
        };
        root._simSolve = () => {
            const T = TRACKS[key];
            while (idx < T.stages.length - 1) {
                const nxt = T.stages[idx + 1];
                if (nxt.q) { picked = nxt.a; locked = true; }
                idx++; picked = null; locked = false;
                seen[key] = Math.max(seen[key] || 0, idx);
            }
            render();
            return root._simState();
        };
    };
})();
