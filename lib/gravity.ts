import type { Node } from "./types";

/**
 * Gravity score = followers × engagement_rate. Unknown inputs mean UNKNOWN
 * gravity — the renderer falls back to in-network degree rather than
 * substituting zero (SPEC.md).
 */
export function gravityScore(node: Node): number | null {
  if (node.followers === null || node.engagement_rate === null) return null;
  return node.followers * node.engagement_rate;
}

/**
 * Render size for a body. Known gravity → sqrt-scaled mass. Unknown → sized
 * from in-network degree so an unknown node never renders at zero and never
 * displays as 0 anywhere in the HUD.
 */
export function bodyRadius(node: Node): number {
  const g = gravityScore(node);
  if (g !== null && g > 0) return 0.6 + Math.log10(g + 1) * 0.55;
  return 0.7 + node.in_network_followers * 0.06 + node.in_network_following * 0.02;
}

/**
 * Label/sort priority. Gravity first, then degree (closer to seed wins).
 * Unknown gravity falls back to in-network linkage so it still competes for
 * the label budget rather than silently vanishing.
 */
export function labelPriority(node: Node): number {
  const g = gravityScore(node);
  const gravityTerm = g !== null ? Math.log10(g + 1) : node.in_network_followers * 0.8 + 1;
  return gravityTerm * 10 - node.degree;
}