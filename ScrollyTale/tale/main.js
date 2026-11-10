import { READER, SEED, STEPS } from "./story.js";

const COUNT = 42000;
const root = document.documentElement;
const canvas = document.getElementById("field");
const form = document.getElementById("ask");
const promptEl = document.getElementById("prompt");
const hint = document.getElementById("hint");
const answer = document.getElementById("answer");
const journey = document.getElementById("journey");
const motionBtn = document.getElementById("motion");

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let paused = REDUCED;
let started = false;
let step = 0;
let shownShape = 0;
let reveal = 0;

motionBtn.setAttribute("aria-pressed", String(paused));
motionBtn.textContent = paused ? "Play motion" : "Pause motion";

function applyTheme(name) {
  const theme = ["light", "sepia", "dark"].includes(name) ? name : "dark";
  root.dataset.theme = theme;
  try { localStorage.setItem("bio_tale", theme); } catch { /* private mode */ }
  document.querySelectorAll(".themes [data-theme]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.theme === theme));
  });
}

let stored = null;
try { stored = localStorage.getItem("bio_tale") || localStorage.getItem("bio_theme"); }
catch { stored = null; }
applyTheme(stored || "dark");

document.querySelectorAll(".themes [data-theme]").forEach((button) => {
  button.addEventListener("click", () => applyTheme(button.dataset.theme));
});

motionBtn.addEventListener("click", () => {
  paused = !paused;
  motionBtn.setAttribute("aria-pressed", String(paused));
  motionBtn.textContent = paused ? "Play motion" : "Pause motion";
});

function hrefFor(id) {
  return `${READER}chapters/${id}.html`;
}

function renderStep() {
  const item = STEPS[step];
  document.getElementById("title").textContent = item.title;
  document.getElementById("lead").textContent = item.lead;
  document.getElementById("count").textContent = `${step + 1} of ${STEPS.length}`;
  const source = document.getElementById("source");
  source.textContent = item.sourceTitle;
  source.href = hrefFor(item.sourceId);
  journey.textContent = item.title;
  promptEl.value = item.prompt;
  document.getElementById("prev").disabled = step === 0;
  document.getElementById("next").textContent = step === STEPS.length - 1 ? "Start again" : "Next idea";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const typed = promptEl.value.trim();
  if (!started) {
    started = true;
    step = 0;
    if (typed && typed.toLowerCase() !== SEED.toLowerCase()) STEPS[0].prompt = typed;
    hint.hidden = true;
    answer.hidden = false;
    renderStep();
    return;
  }
  const match = STEPS.findIndex((item) => item.prompt.toLowerCase() === typed.toLowerCase());
  if (match >= 0) step = match;
  renderStep();
});

document.getElementById("next").addEventListener("click", () => {
  step = (step + 1) % STEPS.length;
  renderStep();
});

document.getElementById("prev").addEventListener("click", () => {
  step = Math.max(0, step - 1);
  renderStep();
});

document.addEventListener("keydown", (event) => {
  if (!started || event.target === promptEl) return;
  if (event.key === "ArrowRight") {
    step = Math.min(STEPS.length - 1, step + 1);
    renderStep();
  } else if (event.key === "ArrowLeft") {
    step = Math.max(0, step - 1);
    renderStep();
  }
});

const gl = canvas.getContext("webgl", {
  alpha: false,
  antialias: false,
  premultipliedAlpha: false,
});
if (!gl) document.getElementById("fallback").hidden = false;

const program = gl ? createProgram(gl, VERT, FRAG) : null;
const seeds = gl ? buildSeeds(COUNT) : null;
const buffer = gl ? makeBuffer(gl, seeds) : null;
const seedLoc = program ? gl.getAttribLocation(program, "aSeed") : -1;

function frame(now) {
  requestAnimationFrame(frame);
  if (!gl) return;
  const targetShape = started ? STEPS[step].shape : 0;
  if (targetShape !== shownShape) {
    reveal = 0;
    shownShape = targetShape;
  }
  const goal = started ? 1 : 0;
  reveal += (goal - reveal) * (paused ? 1 : 0.04);
  if (Math.abs(goal - reveal) < 0.001) reveal = goal;
  draw(now * 0.001, targetShape);
}

function draw(time, shape) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.floor(canvas.clientWidth * dpr);
  const ph = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  const ground = cssColor("--ground");
  gl.clearColor(ground[0], ground[1], ground[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  gl.useProgram(program);
  gl.uniform2f(gl.getUniformLocation(program, "uRes"), canvas.width, canvas.height);
  gl.uniform1f(gl.getUniformLocation(program, "uTime"), paused ? 1.2 : time);
  gl.uniform1f(gl.getUniformLocation(program, "uReveal"), started ? reveal : 0);
  gl.uniform1f(gl.getUniformLocation(program, "uShape"), shape);
  gl.uniform1f(gl.getUniformLocation(program, "uFlutter"), paused ? 0 : 1);
  gl.uniform3fv(gl.getUniformLocation(program, "uCore"), cssColor("--core"));
  gl.uniform3fv(gl.getUniformLocation(program, "uInk"), cssColor("--particle"));

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(seedLoc);
  gl.vertexAttribPointer(seedLoc, 4, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.POINTS, 0, COUNT);
}

function cssColor(name) {
  const hex = getComputedStyle(root).getPropertyValue(name).trim().replace("#", "");
  const n = parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

if (gl) requestAnimationFrame(frame);

const VERT = `
attribute vec4 aSeed;
uniform vec2 uRes;
uniform float uTime;
uniform float uReveal;
uniform float uShape;
uniform float uFlutter;
varying float vGlow;
varying float vAlpha;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

vec2 burst(vec4 s) {
  float arm = mod(s.x, 18.0);
  float ang = arm / 18.0 * 6.2831853 + s.z * 0.35;
  float r = pow(s.w, 0.72) * 0.78;
  float flare = 0.03 * sin(uTime * 3.0 + arm);
  return vec2(cos(ang), sin(ang)) * (r + flare);
}

vec2 shapeAt(float shape, vec4 s) {
  float i = s.x;
  float a = s.y * 6.2831853;
  float u = s.z;
  float v = s.w;
  if (shape < 0.5) return burst(s);
  if (shape < 1.5) {
    float turn = i * 0.0031;
    float r = 0.04 + mod(i, 70.0) / 70.0 * 0.62;
    return vec2(cos(turn), sin(turn)) * r;
  }
  if (shape < 2.5) {
    float strand = mod(i, 3.0);
    float x = -0.78 + fract(i / 140.0) * 1.56;
    float y = sin(i * 0.02) * 0.22 + (strand - 1.0) * 0.2;
    return vec2(x, y);
  }
  if (shape < 3.5) {
    float ring = 0.30 + mod(i, 3.0) * 0.055;
    return vec2(cos(a + u) * ring * 1.35, sin(a + u) * ring);
  }
  if (shape < 4.5) {
    float pocket = mod(i, 4.0);
    vec2 c = pocket < 0.5 ? vec2(-0.32, 0.14)
      : pocket < 1.5 ? vec2(0.26, 0.2)
      : pocket < 2.5 ? vec2(0.0, -0.24)
      : vec2(0.38, -0.02);
    float r = 0.05 + v * 0.13;
    return c + vec2(cos(a), sin(a)) * r;
  }
  float nucleus = step(0.84, v);
  float r = nucleus > 0.5 ? u * 0.13 : 0.2 + u * 0.38;
  return vec2(cos(a) * r * 1.25 - nucleus * 0.05, sin(a) * r);
}

void main() {
  vec2 core = vec2(cos(aSeed.y * 6.2831853), sin(aSeed.y * 6.2831853));
  float tight = pow(aSeed.z, 2.4) * 0.055;
  float pulse = 1.0 + uFlutter * 0.22 * sin(uTime * 2.6);
  vec2 born = core * tight * pulse;
  vec2 next = shapeAt(uShape, aSeed);
  float k = smoothstep(0.0, 1.0, uReveal);
  vec2 p = mix(born, next, k);
  vec2 clip = p * vec2(uRes.y / uRes.x, 1.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  float hot = 1.0 - smoothstep(0.0, 0.07, length(p));
  gl_PointSize = mix(1.7, 9.0, hot) * (uRes.y / 800.0);
  vGlow = hot;
  vAlpha = mix(hot, 0.35 + 0.65 * hash(aSeed.x), smoothstep(0.0, 0.4, k));
}
`;

const FRAG = `
precision mediump float;
uniform vec3 uCore;
uniform vec3 uInk;
varying float vGlow;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = dot(c, c);
  if (d > 0.25) discard;
  float fall = exp(-d * 10.0);
  vec3 col = mix(uInk, uCore, clamp(vGlow + (1.0 - d * 3.0) * 0.35, 0.0, 1.0));
  gl_FragColor = vec4(col, fall * vAlpha);
}
`;

function createProgram(context, vert, frag) {
  const shaderProgram = context.createProgram();
  for (const [type, source] of [[context.VERTEX_SHADER, vert], [context.FRAGMENT_SHADER, frag]]) {
    const sh = context.createShader(type);
    context.shaderSource(sh, source);
    context.compileShader(sh);
    if (!context.getShaderParameter(sh, context.COMPILE_STATUS)) {
      throw new Error(context.getShaderInfoLog(sh) || "shader compile failed");
    }
    context.attachShader(shaderProgram, sh);
  }
  context.linkProgram(shaderProgram);
  if (!context.getProgramParameter(shaderProgram, context.LINK_STATUS)) {
    throw new Error(context.getProgramInfoLog(shaderProgram) || "shader link failed");
  }
  return shaderProgram;
}

function makeBuffer(context, data) {
  const buf = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, buf);
  context.bufferData(context.ARRAY_BUFFER, data, context.STATIC_DRAW);
  return buf;
}

function buildSeeds(n) {
  const data = new Float32Array(n * 4);
  let s = 11;
  const rand = () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i += 1) {
    data[i * 4] = i;
    data[i * 4 + 1] = rand();
    data[i * 4 + 2] = rand();
    data[i * 4 + 3] = rand();
  }
  return data;
}
