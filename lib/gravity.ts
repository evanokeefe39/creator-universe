import type { Node } from "./types";

/**
 * Exponent of the size power law over `followers`.
 *
 * 0.30, deliberately not log10. Across a 1000x follower gap (1k -> 1M) the
 * power law yields a ~8x radius ratio where log10 yields only 2x — the
 * difference between a hierarchy that reads at a glance and one that does not.
 */
export const SIZE_EXPONENT = 0.3;

/** Follower count that maps to `RADIUS_SCALE`. */
export const SIZE_REFERENCE = 10_000;

/** Radius of a body with zero followers — the floor of the size law. */
export const RADIUS_FLOOR = 1.0;

/** Radius added at `SIZE_REFERENCE` followers. 1e4 -> 2.2, 1e6 -> 5.8, 1e7 -> 10.5. */
export const RADIUS_SCALE = 1.2;

/**
 * Radius for a node whose follower count was never collected. Strictly below
 * `RADIUS_FLOOR`, so an uncollected count can never out-rank a collected one.
 */
export const RADIUS_UNKNOWN = 0.8;

/**
 * Render radius. STRICTLY INCREASING in `followers`.
 *
 * `engagement_rate` deliberately does NOT scale this. Only 8 of 1052 nodes in
 * the collection carry a sampled rate, so a size multiplier would be a
 * near-constant that silently reorders bodies wherever it did apply — it would
 * reintroduce, in miniature, the exact inversion this function exists to fix.
 * A strictly follower-driven size is the one property the map cannot lose.
 * Engagement is encoded as glow instead; see `engagementGlow`.
 */
export function bodyRadius(node: Node): number {
  if (node.followers === null) return RADIUS_UNKNOWN;
  return RADIUS_FLOOR + RADIUS_SCALE * Math.pow(node.followers / SIZE_REFERENCE, SIZE_EXPONENT);
}

/** Engagement rate treated as neutral, i.e. half of full glow. */
const ENGAGEMENT_NEUTRAL = 0.05;

/**
 * Engagement as a 0..1 glow intensity — the honest home for engagement, since
 * it cannot contest size. Returns exactly 0 when the rate is unknown, so an
 * uncollected engagement value reads as "no signal" rather than as a false low.
 */
export function engagementGlow(node: Node): number {
  if (node.engagement_rate === null) return 0;
  const t = node.engagement_rate / (ENGAGEMENT_NEUTRAL * 2);
  return Math.min(Math.max(t, 0), 1);
}

/**
 * Followers x engagement, or null when either input is uncollected. Reported in
 * the detail panel ONLY — it is neither the size law nor the mass law.
 */
export function gravityScore(node: Node): number | null {
  if (node.followers === null || node.engagement_rate === null) return null;
  return node.followers * node.engagement_rate;
}

/**
 * Label/sort priority: follower count first and dominant, so the largest bodies
 * always win the label budget. Connectivity only ever breaks near-ties — the
 * previous version let a low-follower node outrank a high-follower one.
 */
export function labelPriority(node: Node): number {
  const followerTerm = node.followers === null ? -1 : Math.log10(node.followers + 1);
  const connectivity = Math.min(node.in_network_followers, 20) * 0.01;
  return followerTerm * 10 + connectivity - node.degree * 0.001;
}
