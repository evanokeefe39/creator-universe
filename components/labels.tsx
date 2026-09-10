"use client";

import { useSceneFrame } from "@/lib/scene-state";
import { ACCENT, GREYS } from "@/lib/palette";

/**
 * HTML label layer over the canvas. The label list is produced by the render
 * loop (≤30 enforced in lib/zoom + components/scene) and sampled here at a
 * human rate; opacity fades are CSS so labels never pop.
 */
export function Labels() {
  const frame = useSceneFrame();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {frame.labels.map((l) => (
        <span
          key={l.id}
          className="label-chip absolute whitespace-nowrap"
          style={{
            left: l.x + 10,
            top: l.y - 8,
            opacity: l.opacity,
            color: l.accent ? ACCENT : l.kind === "cluster" ? GREYS.textSecondary : GREYS.textPrimary,
            borderColor: l.accent ? ACCENT : undefined,
            fontSize: l.kind === "cluster" ? 11 : 12,
            letterSpacing: l.kind === "cluster" ? "0.14em" : undefined,
          }}
        >
          {l.text}
        </span>
      ))}
    </div>
  );
}