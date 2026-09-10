/**
 * The single colour system for the whole app. One module, named constants,
 * no second palette anywhere in components. Desaturated tones per SPEC.md;
 * scene background is near-black but never pure #000.
 */

/**
 * Cluster colours (muted, desaturated per SPEC.md). The collection has ~10
 * distinct clusters once hub grouping is applied, so the cycle is longer than
 * the original five — five colours would repeat within a single view and make
 * locality unreadable.
 */
export const NICHE_COLORS = {
  slateBlue: "#5b7185",
  dustyTerracotta: "#b07a5e",
  sageGreen: "#7d9070",
  warmGrey: "#8a8580",
  mutedAmber: "#b99a5b",
  deepTeal: "#4e7d78",
  plum: "#7b6b86",
  olive: "#7f8259",
  rust: "#96604e",
  steel: "#6b7a8c",
  clay: "#a08a74",
} as const;

export type NicheColorName = keyof typeof NICHE_COLORS;

/** The ONE accent colour for interactive/selection state (muted cyan). */
export const ACCENT = "#4fb3c9";

/** Greys and whites — everything that is not a sub-niche or the accent. */
export const GREYS = {
  bg: "#0a0b0e",
  panel: "rgba(13, 15, 19, 0.82)",
  hairline: "rgba(255, 255, 255, 0.14)",
  hairlineStrong: "rgba(255, 255, 255, 0.28)",
  textPrimary: "#e8eaed",
  textSecondary: "#9aa0a8",
  textMuted: "#5f656d",
  edge: "rgba(255, 255, 255, 0.10)",
  dot: "#6b7078",
} as const;

/** Deterministic mapping from a cluster key to a palette colour. */
const NICHE_CYCLE: NicheColorName[] = [
  "slateBlue",
  "dustyTerracotta",
  "sageGreen",
  "warmGrey",
  "mutedAmber",
  "deepTeal",
  "plum",
  "olive",
  "rust",
  "steel",
  "clay",
];

/**
 * Colour for a cluster key. Hashing the key (rather than indexing a list) keeps
 * a cluster's colour stable as membership changes, so a cluster never changes
 * hue because another cluster appeared. `null` is the unclustered colour.
 */
export function colorForCluster(cluster: string | null): string {
  if (!cluster) return NICHE_COLORS.warmGrey;
  let h = 0;
  for (let i = 0; i < cluster.length; i++) h = (h * 31 + cluster.charCodeAt(i)) >>> 0;
  return NICHE_COLORS[NICHE_CYCLE[h % NICHE_CYCLE.length]];
}