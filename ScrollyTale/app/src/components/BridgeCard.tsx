"use client";

import ReaderSection from "./ReaderSection";
import type { Bridge } from "../lib/types";

interface Props {
  bridge: Bridge;
  /** concepts the student already used, so the response is not a blank reset */
  covered: string[];
}

/**
 * Shown instead of a nudge when an answer is thin. It brings in the part of the
 * reading that closes the gap the answer exposed, and the narrower question then
 * appears in the prompt position.
 */
export default function BridgeCard({ bridge, covered }: Props) {
  return (
    <div className="st-bridge">
      <div className="st-bridge-head">
        <span className="st-bridge-dot" aria-hidden="true" />
        <span>Read this before you answer again</span>
      </div>

      {covered.length > 0 && (
        <p className="st-bridge-covered">
          You already named: <strong>{covered.join(", ")}</strong>. Keep that part.
        </p>
      )}

      <ReaderSection
        chapter={bridge.source.chapter}
        section={bridge.source.section ?? "overview"}
        mode="open"
        omit={bridge.omit}
        label="Pull in the reading"
      />
    </div>
  );
}
