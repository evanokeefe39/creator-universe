import {
  type Edge,
  type Node,
  type Universe,
  tierForFollowers,
} from "./types";

/** mulberry32 — small, fast, fully deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash — used for layout cache keys and cluster assignment. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const SUB_NICHES = ["dev-tools", "ai-engineering", "indie-hackers", "data-viz"] as const;

const HANDLE_STEMS = [
  "kite", "orbital", "fern", "cobalt", "quarry", "meadow", "signal", "anchor",
  "plains", "ember", "tundra", "harbor", "cedar", "lamina", "vessel", "onyx",
  "pale", "grove", "sable", "delta", "meridian", "fell", "beacon", "cinder",
  "atlas", " ridge", "hollow", "spire", "cobble", "fjord",
];

function handleFor(i: number, rng: () => number): string {
  const stem = HANDLE_STEMS[Math.floor(rng() * HANDLE_STEMS.length)].trim();
  const suffix = Math.floor(rng() * 9000 + 1000);
  return `${stem}${suffix}_${i.toString(36)}`.toLowerCase();
}

/**
 * Deterministic synthetic universe: 300 nodes across all six tiers, 4
 * sub-niche clusters, 3–15 edges per node, nodes at graph degree 1–2 from the
 * seed (seed itself at 0). Same seed → byte-identical output.
 */
export function generateSyntheticUniverse(seed = 20260910): Universe {
  const rng = mulberry32(seed);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Tier distribution shaped like a real niche: many small bodies, few stars.
  const tierCounts: Record<number, number> = { 6: 2, 5: 8, 4: 30, 3: 70, 2: 110, 1: 80 };
  let idCounter = 0;

  // Seed node: degree 0, the origin of the system.
  nodes.push({
    id: "seed_creator",
    followers: 174_000,
    engagement_rate: 0.021,
    tier: tierForFollowers(174_000),
    degree: 0,
    directed_degree: 0,
    in_network_followers: 0,
    in_network_following: 24,
    sub_niche: null,
    cluster: null,
    is_verified: true,
    is_private: false,
    reached_from: [],
  });
  idCounter = 1;

  for (const tierStr of Object.keys(tierCounts)) {
    const tier = Number(tierStr);
    for (let i = 0; i < tierCounts[tier]; i++) {
      const followers =
        tier === 1 && rng() < 0.12 ? null : Math.floor(TIER_FLOOR[tier] * (1 + rng() * 8));
      const engagement = followers === null && rng() < 0.5 ? null : +(0.008 + rng() * 0.09).toFixed(4);
      const niche = SUB_NICHES[Math.floor(rng() * SUB_NICHES.length)];
      // A slice of second-degree accounts reachable only through another node.
      const degree = rng() < 0.55 ? 1 : 2;
      nodes.push({
        id: handleFor(idCounter++, rng),
        followers,
        engagement_rate: engagement,
        tier: tierForFollowers(followers),
        degree,
        directed_degree: null,
        in_network_followers: 0,
        in_network_following: 0,
        sub_niche: niche,
        cluster: niche,
        is_verified: tier >= 5 ? rng() < 0.6 : rng() < 0.08,
        is_private: rng() < 0.07,
        reached_from: [],
      });
    }
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const degree1 = nodes.filter((n) => n.degree === 1);
  const degree2 = nodes.filter((n) => n.degree === 2);

  // Edges: seed → a spread of degree-1 nodes; degree-1 nodes follow within
  // their sub-niche cluster and across; degree-2 nodes attach to degree-1
  // anchors. Edge counts per node land in 3–15.
  const addEdge = (source: string, target: string) => {
    if (source === target) return;
    const key = source + "\u0000" + target;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target });
    byId.get(source)!.in_network_following++;
    byId.get(target)!.in_network_followers++;
  };
  const edgeKeys = new Set<string>();

  const pick = (arr: Node[]) => arr[Math.floor(rng() * arr.length)];

  // Seed follows ~40 first-degree accounts.
  const seedFollows = new Set<string>();
  while (seedFollows.size < 40) seedFollows.add(pick(degree1).id);
  for (const t of seedFollows) {
    addEdge("seed_creator", t);
    byId.get(t)!.reached_from.push("seed_creator");
  }

  for (const n of degree1) {
    if (!seedFollows.has(n.id)) {
      // Unreached first-degree nodes get reached via a cluster peer.
      const peer = pick(degree1.filter((p) => p.sub_niche === n.sub_niche && p.id !== n.id)) ?? pick(degree1);
      addEdge(peer.id, n.id);
      n.reached_from.push(peer.id);
    }
    // Everyone follows 2–14 accounts, biased within their own sub-niche.
    const outDegree = 3 + Math.floor(rng() * 12);
    for (let k = 0; k < outDegree; k++) {
      const cross = rng() < 0.25;
      const pool = cross ? degree1 : sameNicheOr(degree1, n.sub_niche);
      addEdge(n.id, pick(pool).id);
    }
  }

  for (const n of degree2) {
    // Each second-degree node hangs off 1–3 first-degree anchors.
    const anchors = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < anchors; k++) {
      const anchor = pick(degree1.filter((p) => p.sub_niche === n.sub_niche)) ?? pick(degree1);
      addEdge(anchor.id, n.id);
      n.reached_from.push(anchor.id);
    }
    // And follows a few accounts itself (3–15 total edges per node rule).
    const out = 3 + Math.floor(rng() * 6);
    for (let k = 0; k < out; k++) addEdge(n.id, pick(n.sub_niche ? sameNicheOr(degree2, n.sub_niche) : degree2).id);
  }
  // Guarantee the 3-edge floor for every node that ended up under it.
  for (const n of nodes) {
    while (n.in_network_following + n.in_network_followers < 3) {
      const pool = n.degree === 0 ? degree1 : nodes.filter((p) => p.id !== n.id);
      const other = pick(pool);
      if (rng() < 0.5) addEdge(n.id, other.id);
      else addEdge(other.id, n.id);
    }
  }

  // Directed hop distance from the seed over follow edges (source follows
  // target). Nodes outside the seed's directed orbit keep directed_degree null.
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    if (adjacency.has(e.source)) adjacency.get(e.source)!.push(e.target);
    else adjacency.set(e.source, [e.target]);
  }
  const frontier = ["seed_creator"];
  const dist = new Map([["seed_creator", 0]]);
  while (frontier.length > 0) {
    const cur = frontier.shift()!;
    const d = dist.get(cur)!;
    for (const next of adjacency.get(cur) ?? []) {
      if (!dist.has(next)) {
        dist.set(next, d + 1);
        frontier.push(next);
      }
    }
  }
  let unreachable = 0;
  for (const n of nodes) {
    const dd = dist.get(n.id);
    n.directed_degree = dd ?? null;
    if (dd === undefined) unreachable++;
  }

  return {
    meta: {
      seed: "seed_creator",
      collected_at: new Date(0).toISOString(),
      cost_usd: 0,
      actors: [],
      run_ids: [],
      unknown_followers: nodes.filter((n) => n.followers === null).length,
      nodes_unreachable_from_seed: unreachable,
      notes: ["synthetic placeholder — generated deterministically, not observed data"],
    },
    nodes,
    edges,
  };
}

function sameNicheOr(arr: Node[], niche: string | null): Node[] {
  if (!niche) return arr;
  const filtered = arr.filter((p) => p.sub_niche === niche);
  return filtered.length > 0 ? filtered : arr;
}

const TIER_FLOOR: Record<number, number> = { 6: 1_000_000, 5: 100_000, 4: 10_000, 3: 1_000, 2: 101, 1: 0 };