"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Bridge, Commit, Move, Tale, TaleState } from "../lib/types";
import { bandFor, budgetFor, evaluate, pickBridge, pickMove } from "../lib/pacing";
import { loadState, latestCommit, saveState } from "../lib/notebook";
import {
  FONTS,
  markSectionRead,
  readPrefs,
  readProgressStore,
  unitProgress,
  wasTracked,
  writeFocus,
  writeFont,
  writeScale,
  writeTheme,
  type Prefs,
  type ReaderFont,
  type ReaderTheme,
} from "../lib/prefs";
import { speak, speakSupported, stopSpeaking } from "../lib/speak";
import Toolbar, { type Mode } from "./Toolbar";
import Explore from "./Explore";
import BridgeCard from "./BridgeCard";
import { Guide } from "./Guide";
import { Notebook } from "./Notebook";
import { ReaderTrail } from "./ReaderTrail";
import ReaderSection from "./ReaderSection";
import SimFrame from "./SimFrame";
import type { TocChapter } from "../data/toc.generated";

interface Props {
  tale: Tale;
  chapters: TocChapter[];
}

export default function TaleWorkspace({ tale, chapters }: Props) {
  const [state, setState] = useState<TaleState | null>(null);
  const [draft, setDraft] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({ theme: "light", font: "sans", scale: 1, focus: false });
  const [listening, setListening] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const [bridgeCovered, setBridgeCovered] = useState<string[]>([]);
  const [tutorMove, setTutorMove] = useState<Move | null>(null);
  // Explore first: a student should meet ideas before a structure. The guided
  // path stays one click away, and a shared #mode=guided or #beat= link still
  // lands on the assessed steps.
  const [mode, setMode] = useState<Mode>("explore");
  const [tutor, setTutor] = useState<{
    provider: string;
    label: string;
    available: boolean;
  } | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, chaptersStarted: 0, chapters: 0 });
  const [done, setDone] = useState<Record<string, Record<string, boolean>>>({});

  const refreshProgress = useCallback(() => {
    setProgress(unitProgress(chapters));
    setDone(readProgressStore());
  }, [chapters]);

  useEffect(() => {
    const loaded = loadState(tale.id);
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get("mode") === "guided" || params.has("beat")) setMode("guided");
    if (params.get("mode") === "explore") setMode("explore");
    if (params.has("beat")) {
      const jump = Number(params.get("beat"));
      if (Number.isInteger(jump) && jump >= 0 && jump < tale.beats.length) {
        loaded.currentBeat = jump;
      }
    }
    setState(loaded);
    setPrefs(readPrefs());
    refreshProgress();

    fetch("/api/tutor")
      .then((r) => r.json())
      .then((d) =>
        setTutor({ provider: d.provider, label: d.label, available: Boolean(d.available) }),
      )
      .catch(() => setTutor(null));
  }, [tale.id, tale.beats.length, refreshProgress]);

  const beat = state
    ? tale.beats[Math.min(state.currentBeat, tale.beats.length - 1)]
    : tale.beats[0];
  const finished = !!state && state.currentBeat >= tale.beats.length;
  const nudges = state?.nudges[beat.id] ?? 0;
  const prior = state ? latestCommit(state, beat.id) : undefined;
  const firstModel = state?.commits.find((c) => c.kind === "model");

  const concepts = bridge?.concepts ?? beat.concepts;
  const ev = useMemo(
    () => (state ? evaluate(draft, concepts, prior) : null),
    [draft, concepts, prior, state],
  );
  const localMove = useMemo(
    () => (ev ? pickMove(beat, ev, nudges) : beat.moves[0]),
    [beat, ev, nudges],
  );
  const move = tutorMove ?? localMove;
  const budget = state ? budgetFor(tale, state, beat) : null;

  useEffect(() => {
    stopSpeaking();
    setListening(false);
  }, [beat.id]);

  function update(next: TaleState) {
    setState(next);
    saveState(next);
  }

  function draftFor(snapshot: TaleState, index: number): string {
    const target = tale.beats[Math.min(index, tale.beats.length - 1)];
    return snapshot.commits.filter((c) => c.beatId === target.id).at(-1)?.text ?? "";
  }

  /* ---------------- reader preferences ---------------- */

  function chooseTheme(theme: ReaderTheme) {
    setPrefs((p) => ({ ...p, theme }));
    writeTheme(theme);
  }

  function chooseFont(font: ReaderFont) {
    setPrefs((p) => ({ ...p, font }));
    writeFont(font);
  }

  function chooseScale(scale: number) {
    const next = Math.min(1.5, Math.max(0.75, Number(scale.toFixed(2))));
    setPrefs((p) => ({ ...p, scale: next }));
    writeScale(next);
  }

  function toggleFocus() {
    setPrefs((p) => ({ ...p, focus: !p.focus }));
    writeFocus(!prefs.focus);
  }

  function toggleListen() {
    if (listening) {
      stopSpeaking();
      setListening(false);
      return;
    }
    const parts = [beat.eyebrow, beat.title, beat.prompt, beat.helper ?? ""];
    setListening(true);
    speak(parts.join(". "), () => setListening(false));
  }

  /* ---------------- beats ---------------- */

  function record(beatId: string, text: string, strength: Commit["strength"], matched: string[], usedNudges: number) {
    if (!state) return;
    const now = new Date().toISOString();
    const commit: Commit = {
      id: `${beatId}-${Date.now()}`,
      beatId,
      kind: tale.beats.find((b) => b.id === beatId)?.commit ?? "observation",
      text: text.trim(),
      at: now,
      strength,
      matched,
      nudges: usedNudges,
    };

    const source = tale.beats.find((b) => b.id === beatId)?.source;
    if (source?.section && wasTracked(source.chapter, source.section)) {
      markSectionRead(source.chapter, source.section);
    }

    const evidence = [
      ...state.evidence,
      ...(tale.beats.find((b) => b.id === beatId)?.standards ?? []).map((standard) => ({
        standard,
        band: bandFor(strength, usedNudges),
        beatId,
        at: now,
      })),
    ];

    return { commit, evidence };
  }

  /** Ask the configured provider. Any failure keeps the local decision. */
  async function askTutor(beatId: string, text: string) {
    // No model, or a model that is not running, means no wait and no failure.
    if (!tutor || tutor.provider === "bank" || !tutor.available) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ beatId, text }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      return (await res.json()) as {
        decision: { moveId: string; bridgeId: string | null; strength: string };
        fellBack: boolean;
      };
    } catch {
      return null;
    }
  }

  async function submit() {
    if (!state || !ev) return;
    const strongEnough = ev.strength === "strong" || ev.strength === "emerging";

    if (!strongEnough && nudges < 2) {
      update({ ...state, nudges: { ...state.nudges, [beat.id]: nudges + 1 } });
      setNudged(true);
      setBridgeCovered(ev.matched);

      const fromTutor = await askTutor(beat.id, draft);
      const chosenMove = fromTutor?.decision.moveId
        ? (beat.moves.find((m) => m.id === fromTutor.decision.moveId) ?? null)
        : null;
      setTutorMove(chosenMove);

      const chosenBridge = fromTutor?.decision.bridgeId
        ? ((beat.bridges ?? []).find((b) => b.id === fromTutor.decision.bridgeId) ?? null)
        : fromTutor
          ? null
          : (pickBridge(beat, ev) ?? null);

      setBridge(chosenBridge);
      return;
    }

    const recorded = record(beat.id, draft, ev.strength, ev.matched, nudges);
    if (!recorded) return;

    const next = Math.min(state.currentBeat + 1, tale.beats.length);
    update({
      ...state,
      commits: [...state.commits, recorded.commit],
      evidence: recorded.evidence,
      currentBeat: next,
      beatStartedAt: {
        ...state.beatStartedAt,
        [tale.beats[Math.min(next, tale.beats.length - 1)].id]: recorded.commit.at,
      },
    });
    setDraft(draftFor({ ...state, commits: [...state.commits, recorded.commit] }, next));
    setNudged(false);
    setBridge(null);
    setTutorMove(null);
    setBridgeCovered([]);
    setShowEarlier(false);
    refreshProgress();
  }

  function moveOn() {
    if (!state) return;
    const next = Math.min(state.currentBeat + 1, tale.beats.length);
    update({
      ...state,
      currentBeat: next,
      beatStartedAt: {
        ...state.beatStartedAt,
        [tale.beats[Math.min(next, tale.beats.length - 1)].id]: new Date().toISOString(),
      },
    });
    setDraft(draftFor(state, next));
    setNudged(false);
    setBridge(null);
    setTutorMove(null);
    setBridgeCovered([]);
    setShowEarlier(false);
  }

  function goBack() {
    if (!state || state.currentBeat === 0) return;
    const next = state.currentBeat - 1;
    update({ ...state, currentBeat: next });
    setDraft(draftFor(state, next));
    setNudged(false);
    setBridge(null);
    setTutorMove(null);
    setBridgeCovered([]);
    setShowEarlier(false);
  }

  function park(text: string) {
    if (!state || !text.trim()) return;
    update({
      ...state,
      parked: [
        ...state.parked,
        { id: `q-${Date.now()}`, beatId: beat.id, text: text.trim(), at: new Date().toISOString() },
      ],
    });
  }

  function unpark(id: string) {
    if (!state) return;
    update({ ...state, parked: state.parked.filter((q) => q.id !== id) });
  }

  function reset() {
    stopSpeaking();
    window.localStorage.removeItem("bio_tale");
    const fresh = loadState(tale.id);
    setState(fresh);
    setDraft("");
    setNudged(false);
    setBridge(null);
    setTutorMove(null);
    setBridgeCovered([]);
    setShowEarlier(false);
    setListening(false);
  }

  if (!state) {
    return (
      <div className="st-root" data-theme="light">
        <p className="st-loading">Loading the tale</p>
      </div>
    );
  }

  const style = {
    "--font-scale": String(prefs.scale),
    "--body-font": FONTS[prefs.font],
    "--heading-font": FONTS[prefs.font],
  } as React.CSSProperties;

  return (
    <div
      className={`st-root${prefs.focus ? " is-focus" : ""}`}
      data-theme={prefs.theme}
      data-font={prefs.font}
      style={style}
    >
      <a className="st-skip" href="#st-stage">
        Skip to the step
      </a>

      <Toolbar
        mode={mode}
        onMode={setMode}
        theme={prefs.theme}
        font={prefs.font}
        scale={prefs.scale}
        focus={prefs.focus}
        listening={listening}
        listenAvailable={speakSupported()}
        progress={progress}
        onTheme={chooseTheme}
        onFont={chooseFont}
        onScale={chooseScale}
        onFocus={toggleFocus}
        onListen={toggleListen}
      />

      <div className="st-progress" aria-hidden="true">
        {mode === "guided" && tale.beats.map((b, i) => (
          <span
            key={b.id}
            className={
              i < state.currentBeat ? "is-done" : i === state.currentBeat ? "is-now" : undefined
            }
          />
        ))}
      </div>

      <main className={`st-main${mode === "explore" ? " is-explore" : ""}`}>
        {mode === "explore" ? (
          <section className="st-stage" id="st-stage">
            <Explore />
          </section>
        ) : (
        <section className="st-stage" id="st-stage">
          {finished ? (
            <div className="st-finish">
              <h1>{tale.title}</h1>
              <p>
                Seven steps are recorded. Your first model and your final snapshot are in the
                notebook. Unit 3 recalls this snapshot before it explains anything new.
              </p>
              <button type="button" onClick={reset}>
                Start again
              </button>
            </div>
          ) : (
            <>
              <div className="st-eyebrow">{beat.eyebrow}</div>
              <h1 className="st-title">{beat.title}</h1>

              {beat.kind === "phenomenon" && (
                <div className="st-card st-phenomenon">
                  <p>{tale.phenomenon}</p>
                  <p className="st-question">{tale.drivingQuestion}</p>
                </div>
              )}

              {beat.readInline && beat.source && (
                <ReaderSection
                  chapter={beat.source.chapter}
                  section={beat.source.section ?? "overview"}
                  mode={beat.readInline}
                  omit={beat.omit}
                  label="Pull in the reading for this step"
                />
              )}

              {beat.sim && (
                <SimFrame
                  sim={beat.sim.key}
                  title={beat.sim.title}
                  task={beat.sim.task}
                  theme={prefs.theme}
                />
              )}

              {beat.kind === "revision" && firstModel && (
                <div className="st-card st-earlier">
                  <div className="st-earlier-head">Your first explanation</div>
                  <p>{firstModel.text}</p>
                </div>
              )}

              {beat.kind === "recall" && (
                <div className="st-card st-hidden">
                  <div className="st-earlier-head">Earlier model</div>
                  {showEarlier && firstModel ? (
                    <p>{firstModel.text}</p>
                  ) : (
                    <>
                      <p className="st-note">Hidden until you write your answer from memory.</p>
                      <button type="button" onClick={() => setShowEarlier(true)}>
                        Show it anyway
                      </button>
                    </>
                  )}
                </div>
              )}

              {bridge && <BridgeCard bridge={bridge} covered={bridgeCovered} />}

              <div className="st-prompt">{bridge ? bridge.ask : beat.prompt}</div>
              {(bridge || beat.helper) && (
                <p className="st-helper">{bridge ? bridge.frame : beat.helper}</p>
              )}

              <textarea
                className="st-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write your answer here."
                rows={7}
              />

              {nudged && !bridge && (
                <Guide
                  move={move}
                  nudges={nudges}
                  onPark={park}
                  parked={false}
                  provider={tutor && tutor.provider !== "bank" ? tutor.label : undefined}
                />
              )}

              <div className="st-actions">
                <button type="button" className="st-primary" onClick={submit}>
                  {nudges >= 2 ? "Record and continue" : "Save and continue"}
                </button>
                {nudges >= 2 && (
                  <button type="button" className="st-secondary" onClick={moveOn}>
                    Move on without writing
                  </button>
                )}
                {state.currentBeat > 0 && (
                  <button type="button" className="st-ghost" onClick={goBack}>
                    Back
                  </button>
                )}
                <span className="st-criterion">{beat.closeEnough}</span>
              </div>

              {budget && (budget.overBudget || budget.beatOverBudget) && (
                <p className="st-warn">
                  This step is over its time. The idea returns in Unit 3. Move on when the two
                  ideas are written, not when the writing is perfect.
                </p>
              )}
            </>
          )}

          <ReaderTrail chapters={chapters} activeId={beat.source?.chapter} done={done} />
        </section>
        )}

        {mode === "guided" && <Notebook state={state} onUnpark={unpark} onReset={reset} />}
      </main>
    </div>
  );
}
