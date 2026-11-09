/**
 * Scores a tutor provider against the fixtures.
 *
 *   node scripts/run-fixtures.mjs --provider bank
 *   node scripts/run-fixtures.mjs --provider ollama --verbose
 *
 * Requires the player on :3000. Hard checks apply to every provider: the
 * decision must be ids that belong to the beat, missing concepts must be real
 * concepts, and no explanation may come back. Expectations are soft and only
 * compare quality between providers.
 */
const BASE = process.env.PLAYER_BASE ?? "http://localhost:3000";

const args = process.argv.slice(2);
const argOf = (flag, fallback) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;

const provider = argOf("--provider", "bank");
const beatFilter = argOf("--beat", null);
const verbose = args.includes("--verbose");

const { fixtures } = await fetch(`${BASE}/api/tutor/fixtures`).then((r) => r.json());
const selected = beatFilter ? fixtures.filter((f) => f.beatId === beatFilter) : fixtures;

const status = await fetch(`${BASE}/api/tutor`).then((r) => r.json());

console.log(`player   : ${BASE}`);
console.log(`provider : ${provider}`);
console.log(`fixtures : ${selected.length}`);
console.log("");

const rows = [];
let hardFail = 0;
let fellBack = 0;
const latencies = [];

for (const fixture of selected) {
  const started = Date.now();
  let payload;

  try {
    const send = () =>
      fetch(`${BASE}/api/tutor`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          beatId: fixture.beatId,
          text: fixture.text,
          provider,
        }),
      });

    let res = await send();
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 61_000));
      res = await send();
    }
    payload = await res.json();
  } catch (error) {
    hardFail++;
    rows.push({ id: fixture.id, hard: `request failed: ${error.message}` });
    continue;
  }

  const latency = Date.now() - started;
  latencies.push(latency);
  if (payload.fellBack) fellBack++;

  const d = payload.decision ?? {};
  const problems = [];

  if (!["empty", "label", "mechanism", "contradiction", "transfer", "off-topic"].includes(d.depth)) {
    problems.push("bad depth");
  }
  if (!Array.isArray(d.missing)) problems.push("missing is not a list");
  if (typeof d.moveId !== "string" || !d.moveId) problems.push("no move id");
  if (d.bridgeId !== null && typeof d.bridgeId !== "string") problems.push("bad bridge id");
  if (problems.length === 0 && JSON.stringify(d).length > 800) problems.push("prose leaked");

  const strengthOk = !fixture.expect.strength || fixture.expect.strength.includes(d.strength);
  const bridgeOk =
    fixture.expect.bridgeId === undefined || fixture.expect.bridgeId === d.bridgeId;
  const depthOk = !fixture.expect.depth || fixture.expect.depth.includes(d.depth);

  if (problems.length) hardFail++;

  rows.push({
    id: fixture.id,
    beat: fixture.beatId,
    strength: d.strength,
    strengthOk,
    bridge: d.bridgeId,
    bridgeOk,
    depthOk,
    depth: d.depth,
    latency,
    hard: problems.join(", "),
  });
}

const pad = (s, n) => String(s ?? "–").padEnd(n).slice(0, n);
console.log(
  pad("fixture", 9) + pad("beat", 11) + pad("strength", 17) + pad("bridge", 32) + pad("ms", 7) + "hard",
);
console.log("-".repeat(92));

for (const r of rows) {
  const strengthCell = `${r.strength ?? "–"}${r.strengthOk ? "" : " X"}`;
  const bridgeCell = `${r.bridge ?? "null"}${r.bridgeOk ? "" : " X"}`;
  console.log(
    pad(r.id, 9) +
      pad(r.beat, 11) +
      pad(strengthCell, 17) +
      pad(bridgeCell, 32) +
      pad(r.latency, 7) +
      (r.hard || "ok"),
  );
  if (verbose && r.hard) console.log(`         ${r.hard}`);
}

const strengthRate = rows.filter((r) => r.strengthOk).length;
const bridgeRate = rows.filter((r) => r.bridgeOk).length;
const depthRate = rows.filter((r) => r.depthOk).length;
latencies.sort((a, b) => a - b);

console.log("");
console.log(`hard failures  : ${hardFail}`);
console.log(`fell back      : ${fellBack}`);
console.log(`strength match : ${strengthRate}/${rows.length}  (expectation hit)`);
console.log(`bridge match   : ${bridgeRate}/${rows.length}  (expectation hit)`);
console.log(`depth match    : ${depthRate}/${rows.length}  (expectation hit)`);
console.log(`latency median : ${latencies[Math.floor(latencies.length / 2)] ?? "–"} ms`);
console.log(`latency max    : ${latencies.at(-1) ?? "–"} ms`);
console.log(`active provider: ${status.provider} (${status.label})`);

process.exit(hardFail > 0 ? 1 : 0);
