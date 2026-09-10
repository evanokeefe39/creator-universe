/**
 * The single colour system for the whole app. One module, named constants,
 * no second palette anywhere in components. Desaturated tones per SPEC.md;
 * scene background is near-black but never pure #000.
 */

/** Sub-niche category colours (muted, desaturated). */
export const NICHE_COLORS = {
  slateBlue: "#5b7185",
  dustyTerracotta: "#b07a5e",
  sageGreen: "#7d9070",
  warmGrey: "#8a8580",
  mutedAmber: "#b99a5b",
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

/** Deterministic mapping from a sub-niche label to a palette colour. */
const NICHE_CYCLE: NicheColorName[] = [
  "slateBlue",
  "dustyTerracotta",
  "sageGreen",
  "warmGrey",
  "mutedAmber",
];

export function colorForNiche(niche: string | null): string {
  if (!niche) return NICHE_COLORS.warmGrey;
  let h = 0;
  for (let i = 0; i < niche.length; i++) h = (h * 31 + niche.charCodeAt(i)) >>> 0;
  return NICHE_COLORS[NICHE_CYCLE[h % NICHE_CYCLE.length]];
}