"use client";

import type { Node, Tier } from "@/lib/types";
import { TIER_LABELS } from "@/lib/types";
import { ACCENT, GREYS } from "@/lib/palette";
import { gravityScore } from "@/lib/gravity";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function field(label: string, value: string, accent = false): React.ReactNode {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1" style={{ borderBottom: `1px solid ${GREYS.hairline}` }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: GREYS.textMuted }}>
        {label}
      </span>
      <span className="font-mono text-[12px]" style={{ color: accent ? ACCENT : GREYS.textPrimary }}>
        {value}
      </span>
    </div>
  );
}

export type DetailPanelProps = {
  node: Node | null;
  onClose: () => void;
};

/**
 * Selected-body detail. Unknown values render the literal word "unknown" —
 * a missing follower count is never displayed as 0.
 */
export function DetailPanel({ node, onClose }: DetailPanelProps) {
  if (!node) {
    return (
      <aside
        className="pointer-events-auto w-72 rounded-sm border p-4 text-[12px]"
        style={{ borderColor: GREYS.hairline, background: GREYS.panel, color: GREYS.textSecondary }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: GREYS.textMuted }}>
          Body detail
        </div>
        <p className="mt-3 leading-relaxed">
          Click a body in the scene to inspect it. Click empty space to clear the selection.
        </p>
      </aside>
    );
  }

  const g = gravityScore(node);
  const tierText: string = node.tier !== null ? `T${node.tier} ${TIER_LABELS[node.tier as Tier]}` : "unknown";

  return (
    <aside
      className="pointer-events-auto w-72 rounded-sm border p-4"
      style={{ borderColor: GREYS.hairline, background: GREYS.panel }}
      aria-label={`Details for ${node.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-mono text-[14px] break-all" style={{ color: ACCENT }}>
          @{node.id}
        </h2>
        <button
          onClick={onClose}
          aria-label="Deselect"
          className="rounded-sm border px-1.5 py-0.5 font-mono text-[11px] hover:bg-white/10"
          style={{ borderColor: GREYS.hairline, color: GREYS.textSecondary }}
        >
          ✕
        </button>
      </div>
      <div className="mt-3">
        {field("Followers", node.followers === null ? "unknown" : fmt(node.followers))}
        {field("Engagement", node.engagement_rate === null ? "unknown" : `${(node.engagement_rate * 100).toFixed(2)}%`)}
        {field("Gravity", g === null ? "unknown" : fmt(Math.round(g)))}
        {field("Class", tierText)}
        {field("Degree", String(node.degree))}
        {field("Directed", node.directed_degree === null ? "unreachable (satellite)" : String(node.directed_degree))}
        {field("In-net followers", fmt(node.in_network_followers))}
        {field("In-net following", fmt(node.in_network_following))}
        {field("Cluster", node.cluster ?? "unclustered")}
        {field("Sub-niche", node.sub_niche ?? "unknown")}
        {field(
          "Flags",
          [node.is_verified ? "verified" : null, node.is_private ? "private" : null].filter(Boolean).join(", ") || "—",
        )}
      </div>
      {node.followers === null && (
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: GREYS.textMuted }}>
          Follower count not collected — body sized from in-network links.
        </p>
      )}
    </aside>
  );
}