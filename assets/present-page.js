/* =============================================================
   PRESENT — the slides and presenter windows (present.html)
   -------------------------------------------------------------
   present.html?session=<id>&role=audience|presenter|single&v=<assetV>

   The selection travels in localStorage (bio_present_<id>): unit id,
   the ticked section keys and the options. This window reads the
   unit again and builds the same slides, so the audience window,
   the presenter window and a reopened window of either always agree
   on slide numbers. Either window may be opened first.
   ============================================================= */
(function () {
    'use strict';
    const PC = window.PresentCore, PP = window.PresentPlayer;
    const params = new URLSearchParams(location.search);
    const session = params.get('session') || '';
    const role = /^(audience|presenter|single)$/.test(params.get('role')) ? params.get('role') : 'audience';
    const msg = document.getElementById('present-msg');

    function message(title, body) {
        msg.hidden = false;
        msg.innerHTML = '<h1>' + PC.esc(title) + '</h1>' + (body || '');
    }

    if (location.protocol === 'file:') {
        message('The slides need the course’s web address',
            '<p>This window was opened as a file, so the browser will not let it read the chapters. Open the course from its web address — for example http://localhost:4321 — and choose Present again.</p>');
        return;
    }
    const data = PC.readSession(session);
    if (!data || !window.UnitContent) {
        message('This presentation link has expired',
            '<p>Open the course, choose <b>Present</b> in the toolbar and pick your topics again.</p><p><a href="index.html">Go to the course contents</a></p>');
        return;
    }

    const url = r => {
        const u = new URL('present.html', location.href);
        u.search = new URLSearchParams({ session, role: r, v: data.assetV || params.get('v') || '1' }).toString();
        return u.href;
    };
    const audienceName = 'bio-present-audience-' + session;

    const bar = msg.querySelector('.prm-bar i');
    UnitContent.load(data.unitId, {
        onProgress: (done, total) => { if (bar) bar.style.width = Math.round(100 * done / total) + '%'; }
    }).then(unit => {
        // the same deck the picker built, less the slides the teacher skipped
        const slides = PC.playable(PC.build(unit, new Set(data.sections || []), data.options), data.skipped);
        if (!slides.length) {
            message('No slides to show', '<p>Every chosen slide is skipped, or none of the chosen sections could be found. Open <b>Present</b> from the course again.</p>');
            return;
        }
        document.title = (role === 'presenter' ? 'Presenter view' : 'Slides') + ' — ' + unit.label;
        msg.hidden = true;
        const deck = { slides, hue: unit.hue, unitLabel: unit.label, root: document.body.dataset.root || './', assetV: data.assetV, session };
        const ctl = PP.controller(deck, { session, role, start: data.at || 0 });

        const ended = () => {
            ctl.close();
            // a window this page did not open itself cannot close itself
            window.close();
            setTimeout(() => message('Presentation closed', '<p>You can close this window.</p>'), 150);
        };

        if (role === 'presenter') {
            const scr = PC.screens();
            PP.presenter(document.body, deck, {
                controller: ctl,
                onExit: ended,
                warnSingle: scr.mode === 'single' && scr.source === 'detected',
                openAudience: () => PC.openAudienceWindow(url('audience'), audienceName),
                onSlidesOnly: () => { location.replace(url('single')); }
            });
        } else {
            PP.player(document.body, deck, {
                controller: ctl,
                role,
                askFullscreen: true,
                fullscreenHint: role === 'audience'
                    ? 'Browsers only allow full screen after a click in this window. After that, keys pressed here or in the presenter view move both.'
                    : 'Browsers only allow full screen after a click in this window.',
                onExit: ended
            });
        }
    }).catch(err => {
        console.error('[present]', err);
        message('The slides could not be made', '<p>' + PC.esc(err.message || String(err)) + '</p>');
    });
})();
