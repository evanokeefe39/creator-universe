/**
 * The data contract between the collection pipeline and the application.
 *
 * `data/universe.json` is the ONLY interface between the two halves of this
 * repo. Both halves code against these types and neither may change them
 * unilaterally.
 *
 * Invariants the producer guarantees and the consumer may rely on:
 *   - `id` is a lowercase Instagram handle, unique across `nodes`.
 *   - Every `Edge.source` and `Edge.target` exists in `nodes` (referential
 *     integrity; enforced by `scripts/validate_universe.ts`).
 *   - A numeric `followers` is a real observed count. `null` means NOT
 *     COLLECTED — never a placeholder for zero, and never estimated.
 *   - `tier` is derived from `followers` when known. When `followers` is
 *     `null`, `tier` is `null` and the node is rendered from in-network
 *     signals only.
 */

/** Celestial tier. 6 = star (1M+), 1 = asteroid (0–100). */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

export const TIER_LABELS: Record<Tier, string> = {
  6: "Star",
  5: "Gas giant",
  4: "Planet",
  3: "Dwarf planet",
  2: "Moon",
  1: "Asteroid",
};

/** Inclusive lower bound of each tier's follower range, in followers. */
export const TIER_FLOORS: Record<Tier, number> = {
  6: 1_000_000,
  5: 100_000,
  4: 10_000,
  3: 1_000,
  2: 101,
  1: 0,
};

/**
 * Face count per tier — how many polygons the procedural body is built from.
 * Hierarchy must be readable from silhouette alone, so these are far apart.
 */
export const TIER_FACES: Record<Tier, number> = {
  6: 320,
  5: 160,
  4: 80,
  3: 20,
  2: 8,
  1: 4,
};

/**
 * Map a follower count to its tier. Returns `null` when the count is unknown —
 * an unknown count is not tier 1.
 */
export function tierForFollowers(followers: number | null): Tier | null {
  if (followers === null) return null;
  // Edge case: negative or NaN counts are producer bugs, not small accounts.
  if (!Number.isFinite(followers) || followers < 0) return null;
  for (const t of [6, 5, 4, 3, 2] as Tier[]) {
    if (followers >= TIER_FLOORS[t]) return t;
  }
  return 1;
}

export type Node = {
  /** Lowercase Instagram handle. Unique. */
  id: string;
  /** Observed follower count, or null when not collected. */
  followers: number | null;
  /** Sampled engagement rate (0–1), or null when not collected. */
  engagement_rate: number | null;
  /** Derived from `followers`; null when `followers` is null. */
  tier: Tier | null;
  /** Shortest hop distance from the seed account. Seed itself is 0. */
  degree: number;
  /**
   * Hop distance from the seed following ONLY directed follow edges, or null
   * when the node cannot be reached at all by chaining follows from the seed.
   *
   * This is the load-bearing distinction for the map: a node with a finite
   * `degree` but a null `directed_degree` sits in the same network (it shares
   * followees with the seed's neighbourhood) yet is not in the seed's own
   * following orbit. It was found by expanding an account outside the seed's
   * following list, so "degrees of separation from the seed" does not apply
   * to it. Render it as a satellite, not as an inner-system member.
   */
  directed_degree: number | null;
  /** How many mapped nodes follow this one. */
  in_network_followers: number;
  /** How many mapped nodes this one follows. */
  in_network_following: number;
  /** Sub-niche label, or null when unclassified. */
  sub_niche: string | null;
  is_verified: boolean;
  is_private: boolean;
  /** In-network linkage to the seed(s) this node was reached from. */
  reached_from: string[];
};

export type Edge = {
  /** Follower — the account doing the following. */
  source: string;
  /** Followee — the account being followed. */
  target: string;
};

export type UniverseMeta = {
  /** Seed account handle the collection started from. */
  seed: string;
  /** ISO-8601 timestamp of artefact generation. */
  collected_at: string;
  /** Total USD spent across the Apify runs that produced this artefact. */
  cost_usd: number;
  /** Actor identifiers used, in the order they were run. */
  actors: string[];
  /** Apify run ids, so any number in the UI traces to a paid run. */
  run_ids: string[];
  /** Nodes whose follower count could not be collected. */
  unknown_followers: number;
  /** Nodes not reachable from the seed by chaining directed follow edges. */
  nodes_unreachable_from_seed: number;
  /** Free-form provenance notes (rate limits hit, dropped targets, …). */
  notes: string[];
};

export type Universe = {
  meta: UniverseMeta;
  nodes: Node[];
  edges: Edge[];
};

/** One row in `data/cost_ledger.json` — append-only, never edited in place. */
export type LedgerEntry = {
  run_id: string;
  actor: string;
  purpose: string;
  items: number;
  cost_usd: number;
  started_at: string;
  status: "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
};

/**
 * A raw Apify dataset row from a following-list actor. Field presence varies
 * by actor, so everything past the handle is optional.
 */
export type RawFollowingRow = {
  username?: string;
  full_name?: string;
  is_private?: boolean;
  is_verified?: boolean;
  profile_pic_url?: string;
  following_of?: string;
};

/** A raw Apify dataset row from a profile-details actor. */
export type RawProfileRow = {
  username?: string;
  fullName?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  verified?: boolean;
  private?: boolean;
  biography?: string;
  businessCategoryName?: string;
};
