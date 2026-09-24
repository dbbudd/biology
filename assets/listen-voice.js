/* =============================================================
   LISTEN — natural voice, page side
   -------------------------------------------------------------
   Loaded only when someone chooses a natural voice. Hands sentences
   to listen-voice-worker.js and plays what comes back through the
   Web Audio API. It knows nothing about the page: the Listen code in
   course.js decides what to read, when, and what to highlight.

     NaturalVoice.unlock()                    call inside the click
     NaturalVoice.prepare(voice, root, onP)   load once per voice
     NaturalVoice.synth(text, rate)           -> { audio, sampleRate, synthMs, seconds }
     NaturalVoice.play(result, onEnd)         one sentence; replaces any playing
     NaturalVoice.stop() / pause() / resume() / paused()
     NaturalVoice.flush()                     drop sentences not yet made
   ============================================================= */
(function () {
    'use strict';
    if (window.NaturalVoice) return;

    let worker = null, voice = null, ready = null;
    let ctx = null, current = null, pausedFlag = false;
    let seq = 0;
    const waiting = new Map();

    function supported() {
        return typeof WebAssembly === 'object' && typeof Worker === 'function' &&
            !!(window.AudioContext || window.webkitAudioContext);
    }

    // Browsers only let audio start from inside a click, and iPad Safari will not
    // even let the context be created later. This script is loaded AFTER the
    // first click, so course.js makes the context during the click itself and
    // leaves it on window.LISTEN_CTX; it is only created here as a last resort.
    function unlock() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            ctx = window.LISTEN_CTX || (AC ? new AC() : null);
        }
        if (ctx && ctx.state === 'suspended' && !pausedFlag) ctx.resume();
    }

    function prepare(voiceId, root, onProgress) {
        if (voice === voiceId && ready) return ready;
        if (worker) { worker.terminate(); worker = null; }
        waiting.forEach(w => w.reject(new Error('voice changed')));
        waiting.clear();
        voice = voiceId;
        const base = new URL((root || './') + 'vendor/piper/', location.href).href;
        const workerUrl = new URL((root || './') + 'assets/listen-voice-worker.js', location.href).href +
            '?v=' + (window.LISTEN_V || '1');
        ready = new Promise((resolve, reject) => {
            try { worker = new Worker(workerUrl); }
            catch (e) { reject(e); return; }
            worker.onmessage = e => {
                const m = e.data;
                if (m.type === 'progress') { if (onProgress) onProgress(m.got, m.total); }
                else if (m.type === 'ready') resolve();
                else if (m.type === 'error') reject(new Error(m.message));
                else if (m.type === 'audio' || m.type === 'failed') {
                    const w = waiting.get(m.id);
                    if (!w) return;
                    waiting.delete(m.id);
                    if (m.type === 'failed') w.reject(new Error(m.message));
                    else w.resolve({ audio: m.audio, sampleRate: m.sampleRate, synthMs: m.synthMs,
                        seconds: m.audio.length / m.sampleRate });
                }
            };
            worker.onerror = e => reject(new Error(e.message || 'voice worker failed to start'));
            worker.postMessage({ type: 'init', base, voice: voiceId });
        });
        // a failed load must be retryable, not remembered forever
        ready.catch(() => { if (voice === voiceId) { ready = null; voice = null; } });
        return ready;
    }

    // rate is the reader's speed (0.8 – 1.5); the network takes its inverse,
    // so faster speech keeps its natural pitch
    function synth(text, rate) {
        if (!worker) return Promise.reject(new Error('voice not loaded'));
        const id = ++seq;
        const p = new Promise((resolve, reject) => waiting.set(id, { resolve, reject }));
        worker.postMessage({ type: 'speak', id, text, lengthScale: 1 / (rate || 1) });
        return p;
    }

    function flush() { if (worker) worker.postMessage({ type: 'flush' }); }

    function stop() {
        if (current) { current.onended = null; try { current.stop(); } catch (e) { } current = null; }
    }

    function play(result, onEnd) {
        unlock();
        stop();
        const buf = ctx.createBuffer(1, result.audio.length, result.sampleRate);
        buf.copyToChannel(result.audio, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.onended = () => { if (current === src) { current = null; if (onEnd) onEnd(); } };
        current = src;
        src.start();
    }

    function pause() { pausedFlag = true; if (ctx) ctx.suspend(); }
    function resume() { pausedFlag = false; if (ctx) ctx.resume(); }
    function paused() { return pausedFlag; }

    window.NaturalVoice = { supported, unlock, prepare, synth, flush, play, stop, pause, resume, paused,
        get voice() { return voice; } };
})();
