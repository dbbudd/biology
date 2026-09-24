/* =============================================================
   LISTEN — natural voice, background worker
   -------------------------------------------------------------
   Turns one sentence of text into audio with a Piper neural voice,
   entirely inside the reader's browser. Everything it loads comes
   from this site (vendor/piper/), so there is no account, key or
   outside service involved and nothing that can be switched off.

   It runs in a worker because the network takes several seconds per
   paragraph of CPU time, and on the main thread that froze scrolling.

   Pipeline per sentence:
     text -> phonemes (espeak-ng, compiled to WebAssembly)
          -> phoneme ids (the voice's own table)
          -> audio samples (the voice network, via ONNX Runtime)

   The network and the phonemiser's files are loaded ONCE and kept.
   The library this grew out of rebuilt both for every call, which is
   why the first prototype spent ten seconds "loading" each paragraph.
   ============================================================= */
'use strict';

const CACHE = 'bio-voice-v1';       // bump only when a voice file itself changes
let base = '';
// not called "ort": the runtime script declares a global of that name itself
let ORT = null;
let session = null;
let config = null;
let phonWasm = null;                 // piper_phonemize.wasm, fetched once
let phonData = null;                 // piper_phonemize.data (English only), fetched once

// The voice file is ~63MB. The browser's ordinary cache may drop something
// that size under pressure, so it is kept in Cache Storage, which only goes
// when the site's data is cleared.
async function cachedBuffer(url, onProgress) {
    let cache = null;
    try { cache = await caches.open(CACHE); } catch (e) { /* no Cache Storage: fetch every time */ }
    if (cache) {
        const hit = await cache.match(url);
        if (hit) { onProgress(1, 1); return await hit.arrayBuffer(); }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('could not download ' + url.split('/').pop() + ' (' + res.status + ')');
    const total = +(res.headers.get('Content-Length') || 0);
    const reader = res.body && res.body.getReader();
    let got = 0, chunks = [];
    if (reader) {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            got += value.length;
            onProgress(got, total);
        }
    } else {
        chunks = [new Uint8Array(await res.arrayBuffer())];
    }
    const blob = new Blob(chunks);
    if (cache) { try { await cache.put(url, new Response(blob)); } catch (e) { /* quota: fine, just not kept */ } }
    return await blob.arrayBuffer();
}

async function init(msg) {
    base = msg.base;
    importScripts(base + 'ort.wasm.min.js', base + 'piper_phonemize.js');
    ORT = self.ort;
    ORT.env.wasm.wasmPaths = base;
    // GitHub Pages cannot send the cross-origin-isolation headers that
    // multi-threaded WebAssembly needs, so this is single-threaded everywhere.
    ORT.env.wasm.numThreads = 1;
    ORT.env.wasm.proxy = false;          // already off the main thread

    const voiceUrl = base + 'voices/' + msg.voice + '.onnx';
    config = await (await fetch(voiceUrl + '.json')).json();
    const model = await cachedBuffer(voiceUrl, (got, total) => {
        self.postMessage({ type: 'progress', got, total });
    });
    const [w, d] = await Promise.all([
        fetch(base + 'piper_phonemize.wasm').then(r => r.arrayBuffer()),
        fetch(base + 'piper_phonemize.data').then(r => r.arrayBuffer())
    ]);
    phonWasm = w; phonData = d;
    session = await ORT.InferenceSession.create(model, { executionProviders: ['wasm'] });
}

// espeak's command-line entry point runs once per instance, so each sentence
// gets a fresh instance. That is cheap (tens of milliseconds) because the
// WebAssembly and the data package are handed over rather than re-fetched.
async function phonemeIds(text) {
    const lines = [];
    const mod = await createPiperPhonemize({
        print: l => lines.push(l),
        printErr: () => {},
        wasmBinary: phonWasm,
        getPreloadedPackage: () => phonData,
        locateFile: f => base + f
    });
    mod.callMain(['-l', config.espeak.voice, '--input', JSON.stringify([{ text }]),
        '--espeak_data', '/espeak-ng-data']);
    if (!lines.length) throw new Error('phonemiser returned nothing');
    return JSON.parse(lines[0]).phoneme_ids;
}

async function synth(text, lengthScale) {
    const t0 = performance.now();
    const ids = await phonemeIds(text);
    const inf = config.inference;
    const feeds = {
        input: new ORT.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
        input_lengths: new ORT.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
        // length_scale is how the network speaks faster or slower without the
        // pitch shift that simply playing the audio faster would give
        scales: new ORT.Tensor('float32', Float32Array.from([
            inf.noise_scale, inf.length_scale * lengthScale, inf.noise_w]), [3])
    };
    if (config.num_speakers > 1) feeds.sid = new ORT.Tensor('int64', BigInt64Array.from([0n]), [1]);
    const out = await session.run(feeds);
    const audio = out.output.data;
    return { audio, sampleRate: config.audio.sample_rate, synthMs: performance.now() - t0 };
}

// One job at a time: the network cannot run two passes at once, and an async
// handler would otherwise interleave them at every await. A jump or a speed
// change sends 'flush', which drops everything not yet started.
let queue = [];
let busy = false;
async function pump() {
    if (busy) return;
    busy = true;
    while (queue.length) {
        const job = queue.shift();
        try {
            const r = await synth(job.text, job.lengthScale);
            self.postMessage({ type: 'audio', id: job.id, audio: r.audio, sampleRate: r.sampleRate,
                synthMs: r.synthMs }, [r.audio.buffer]);
        } catch (e) {
            self.postMessage({ type: 'failed', id: job.id, message: String(e && e.message || e) });
        }
    }
    busy = false;
}

self.onmessage = async e => {
    const m = e.data;
    if (m.type === 'init') {
        try { await init(m); self.postMessage({ type: 'ready' }); }
        catch (err) { self.postMessage({ type: 'error', message: String(err && err.message || err) }); }
    } else if (m.type === 'speak') {
        queue.push(m);
        pump();
    } else if (m.type === 'flush') {
        queue.forEach(j => self.postMessage({ type: 'failed', id: j.id, message: 'flushed' }));
        queue = [];
    }
};
