"use client";

import type { Tier } from "@/lib/types";
import { TIER_LABELS } from "@/lib/types";
import { ACCENT, GREYS } from "@/lib/palette";
import { useSceneFrame, resetView } from "@/lib/scene-state";
import { zoomLevelName } from "@/lib/zoom";

export type HudProps = {
  isSynthetic: boolean;
  syntheticNotice: string | null;
  totalNodeCount: number;
  visibleNodeCount: number;
  hiddenTiers: Set<number>;
  onToggleTier: (tier: Tier) => void;
  search: string;
  onSearch: (q: string) => void;
  searchInfo: string | null;
};

const ALL_TIERS: Tier[] = [6, 5, 4, 3, 2, 1];

/**
 * HTML/CSS HUD over the canvas. Root is pointer-events-none; only opaque
 * panels re-enable pointer events, so transparent HUD regions pass clicks
 * through to the canvas (Spike 5 click-through semantics).
 */
export function Hud({
  isSynthetic,
  syntheticNotice,
  totalNodeCount,
  visibleNodeCount,
  hiddenTiers,
  onToggleTier,
  search,
  onSearch,
  searchInfo,
}: HudProps) {
  const frame = useSceneFrame();

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
      {/* Top strip: provenance banner + dev overlay + reset */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2">
          {isSynthetic && (
            <div
              className="pointer-events-auto rounded-sm border px-3 py-1.5 text-[11px] tracking-wide"
              style={{ borderColor: "rgba(185,154,91,0.55)", background: "rgba(30,26,18,0.85)", color: "#d9c79a" }}
              role="status"
            >
              SYNTHETIC DATA — universe.json not collected yet. Everything here is generated, not observed.
            </div>
          )}
          {syntheticNotice && !isSynthetic && (
            <div
              className="pointer-events-auto rounded-sm border px-3 py-1.5 text-[11px]"
              style={{ borderColor: GREYS.hairline, background: GREYS.panel, color: GREYS.textSecondary }}
            >
              {syntheticNotice}
            </div>
          )}
          <div
            className="pointer-events-none rounded-sm border px-3 py-1.5 font-mono text-[11px]"
            style={{ borderColor: GREYS.hairline, background: GREYS.panel, color: GREYS.textSecondary }}
          >
            <span style={{ color: GREYS.textPrimary }}>{frame.fps.toFixed(0)} fps</span>
            <span className="mx-2 text-white/20">|</span>
            labels{" "}
            <span style={{ color: frame.labelCount > 30 ? "#c96a4f" : GREYS.textPrimary }}>{frame.labelCount}</span>/30
            <span className="mx-2 text-white/20">|</span>
            zoom {frame.zoomT.toFixed(2)} ({zoomLevelName(frame.zoomT)})
          </div>
        </div>
        <button
          type="button"
          onClick={resetView}
          className="pointer-events-auto rounded-sm border px-3 py-1.5 text-[11px] transition-colors hover:bg-white/10"
          style={{ borderColor: GREYS.hairline, background: GREYS.panel, color: GREYS.textPrimary }}
        >
          Reset view
        </button>
      </div>

      {/* Bottom strip: search + tier filters */}
      <div
        className="pointer-events-auto flex flex-col gap-2 rounded-sm border p-3"
        style={{ borderColor: GREYS.hairline, background: GREYS.panel }}
      >
        <div className="flex items-center gap-2">
          <label htmlFor="cu-search" className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GREYS.textMuted }}>
            Find
          </label>
          <input
            id="cu-search"
            value={search}
            onChange={(e) => {
              onSearch(e.target.value);
            }}
            placeholder="handle…"
            autoComplete="off"
            className="w-48 rounded-sm border bg-transparent px-2 py-1 font-mono text-[12px] outline-none focus:border-current"
            style={{ borderColor: GREYS.hairline, color: GREYS.textPrimary }}
          />
          {searchInfo && (
            <span
              className="font-mono text-[11px]"
              style={{ color: searchInfo.startsWith("No handles") ? ACCENT : GREYS.textMuted }}
              role="alert"
            >
              {searchInfo}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ALL_TIERS.map((t) => {
            const on = !hiddenTiers.has(t);
            return (
              <button
                key={t}
                onClick={() => {
                  onToggleTier(t);
                }}
                aria-pressed={on}
                className="rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors"
                style={{
                  borderColor: on ? ACCENT : GREYS.hairline,
                  color: on ? ACCENT : GREYS.textMuted,
                  background: on ? "rgba(79,179,201,0.08)" : "transparent",
                }}
              >
                T{t} {TIER_LABELS[t]}
              </button>
            );
          })}
          <span className="ml-2 font-mono text-[11px]" style={{ color: GREYS.textSecondary }}>
            {visibleNodeCount}/{totalNodeCount} bodies
          </span>
        </div>
      </div>
    </div>
  );
}