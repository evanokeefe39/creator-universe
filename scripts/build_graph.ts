/**
 * Transform data/raw/apify/** into data/universe.json and copy it to
 * public/universe.json. Zero network calls — reads raw run files and the cost
 * ledger only. Re-runnable (replay-safe): output is fully derived.
 *
 * Usage: bun run graph
 */
import * as fs from "node:fs";
import { tierForFollowers, type Universe, type Node, type Edge, type LedgerEntry, type RawFollowingRow, type RawProfileRow } from "../lib/types";

const REPO = import.meta.dir + "/..";
const RAW_DIR = `${REPO}/data/raw/apify`;
const LEDGER_PATH = `${REPO}/data/cost_ledger.json`;
const OUT = `${REPO}/data/universe.json`;
const PUB = `${REPO}/public/universe.json`;
const SEED = "nick_saraev";

const norm = (h: string) => h.trim().replace(/^@/, "").toLowerCase();

type DatalakeCreator = { handle: string; followers: number; avg_likes: number; posts_observed: number };

type FollowingRunFile = { actor: string; run_id: string; status: string; usageTotalUsd: number; following_of: string; items: RawFollowingRow[] };
type ProfileRunFile = { actor: string; run_id: string; status: string; usageTotalUsd: number; items: RawProfileRow[] };

function loadRuns<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort().map((n) => JSON.parse(fs.readFileSync(`${dir}/${n}`, "utf8")) as T);
}

const profileRuns = loadRuns<ProfileRunFile>(`${RAW_DIR}/coderx_instagram-profile-scraper-bio-posts`);
const EDGE_DIRS = [
  `${RAW_DIR}/datadoping_instagram-following-scraper`,
  `${RAW_DIR}/scraping_solutions_instagram-scraper-followers-following-no-cookies`,
];
const followingRuns = EDGE_DIRS.flatMap((d) => loadRuns<FollowingRunFile>(d));

// Edges: source (the account whose list was scraped) follows each row handle.
const edgeSet = new Set<string>();
const edges: Edge[] = [];
const reachedFrom = new Map<string, Set<string>>();
const adj = new Map<string, string[]>(); // follower -> followees
const observed = new Map<string, { is_verified: boolean; is_private: boolean }>();

function observe(handle: string, row: RawFollowingRow) {
  const cur = observed.get(handle);
  observed.set(handle, {
    is_verified: (cur?.is_verified ?? false) || (row.is_verified ?? false),
    is_private: (cur?.is_private ?? false) || (row.is_private ?? false),
  });
}

for (const run of followingRuns) {
  const src = norm(run.following_of);
  for (const row of run.items) {
    const t = norm(row.username ?? "");
    if (!t || t === src) continue;
    const key = `${src}->${t}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ source: src, target: t });
    }
    if (!adj.has(src)) adj.set(src, []);
    adj.get(src)!.push(t);
    if (!reachedFrom.has(t)) reachedFrom.set(t, new Set());
    reachedFrom.get(t)!.add(src);
    observe(t, row);
  }
}

// Nodes: every handle observed in any raw following row or run owner.
const nodeIds = new Set<string>([SEED]);
for (const e of edges) {
  nodeIds.add(e.source);
  nodeIds.add(e.target);
}

// Profile details override/complete follower counts, verification, privacy.
const profiles = new Map<string, RawProfileRow>();
for (const run of profileRuns) {
  for (const row of run.items) {
    const h = norm(row.username ?? "");
    if (h) profiles.set(h, row);
  }
}

// Hop distance from the seed. `degree` treats every follow edge as an
// UNDIRECTED link (a follow relationship connects two accounts in one network
// regardless of who follows whom) — the right semantics for a map of a
// network. `directed_degree` uses ONLY directed follow edges (source ->
// target), and is null when the node cannot be reached by chaining follows
// from the seed at all (e.g. neighbours of deliberately-added external hubs).
const undirected = new Map<string, string[]>();
for (const e of edges) {
  const a = undirected.get(e.source);
  if (a) a.push(e.target); else undirected.set(e.source, [e.target]);
  const b = undirected.get(e.target);
  if (b) b.push(e.source); else undirected.set(e.target, [e.source]);
}

function bfs(start: string, neighbors: (id: string) => string[]): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const t of neighbors(cur)) {
      if (nodeIds.has(t) && !dist.has(t)) {
        dist.set(t, dist.get(cur)! + 1);
        queue.push(t);
      }
    }
  }
  return dist;
}

const degree = bfs(SEED, (id) => undirected.get(id) ?? []);
const directedDegree = bfs(SEED, (id) => adj.get(id) ?? []);

const ledger = fs.existsSync(LEDGER_PATH) ? JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8")) as LedgerEntry[] : [];

// Free enrichment: observed follower counts from docs/research/datalake_creators.json.
// Used ONLY when the paid profile scrape left the count null — a paid
// observation always wins. This is also the free tier of the enrichment
// priority order below.
const freeFollowers = new Map<string, number>();
let freeFollowerFills = 0;
const DATALAKE_PATH = `${REPO}/docs/research/datalake_creators.json`;
const costUsd = ledger.reduce((s, e) => s + e.cost_usd, 0);
const actors = [...new Set(ledger.map((e) => e.actor))];
const runIds = ledger.map((e) => e.run_id);

const notes: string[] = [];

// Engagement join from the sibling datalake warehouse (read-only). Its
// avg_engagement_score is a trailing-baseline z-score, NOT a 0-1 rate — it is
// deliberately NOT used as engagement_rate. Only a real ratio avg_likes/followers
// is used, and only with a meaningful sample (posts_observed >= 5).
const engagement = new Map<string, number>();
let engagementOverflow = 0;
if (fs.existsSync(`${REPO}/docs/research/datalake_creators.json`)) {
  const datalake = (JSON.parse(fs.readFileSync(DATALAKE_PATH, "utf8")) as { creators: DatalakeCreator[] }).creators;
  for (const c of datalake) {
    if (typeof c.followers === "number" && Number.isFinite(c.followers) && c.followers >= 0) {
      freeFollowers.set(norm(c.handle), c.followers);
    }
    if (typeof c.avg_likes !== "number" || typeof c.followers !== "number") continue;
    if (typeof c.posts_observed !== "number" || c.posts_observed < 5) continue;
    const ratio = c.avg_likes / c.followers;
    if (!Number.isFinite(ratio) || ratio < 0) continue;
    if (ratio > 1) {
      engagementOverflow += 1;
      notes.push(`engagement join skipped handle ${c.handle}: avg_likes/followers ratio ${ratio.toFixed(3)} > 1 (data inconsistency, left null)`);
      continue;
    }
    engagement.set(norm(c.handle), ratio);
  }
}
// Report the number of NODES that actually received a ratio, not the size of
// the intermediate map: `engagement` is keyed over the whole datalake file, so
// it counts handles that are not in this graph too. Quoting engagement.size
// here overstated the real coverage.
const engagementApplied = [...nodeIds].filter((id) => engagement.has(id)).length;
notes.push(`engagement_rate computed as avg_likes/followers for ${engagementApplied} of ${nodeIds.size} nodes from docs/research/datalake_creators.json (a usable ratio exists for ${engagement.size} datalake handles; the rest are not in this graph. Datalake z-score deliberately NOT used)`);
if (engagementOverflow > 0) notes.push(`${engagementOverflow} handle(s) had an avg_likes/followers ratio > 1 and were left null (see per-handle notes above)`);

// NOTE: private status does NOT block a public follower count. Instagram shows
// the count for private accounts, and our own paid rows prove it (13 rows carry
// both private:true and a numeric followersCount). Private accounts are
// therefore enriched like any other; do not "skip as unscrapeable".
notes.push(`follower counts from paid profile scrapes (coderx) over every node in the graph, including private accounts — private status does not block a public follower count; any still-uncovered count may be filled from docs/research/datalake_creators.json (a paid observation always wins over the free join)`);
notes.push(`BFS semantics: degree = shortest hop distance from ${SEED} over UNDIRECTED follow edges (seed = 0); directed_degree = same over DIRECTED follow edges only, null when the node is unreachable by chaining follows from the seed`);
notes.push(`${nodeIds.size - directedDegree.size} of ${nodeIds.size} nodes are unreachable from the seed via directed follow edges (external hubs marc.kaz, kerem.tech, steven.builds sit outside the seed's following list, so their discovered neighbours have no follow-path from the seed)`);

// deterministic, prioritising the map's core — seed first, then true
// undirected degree ascending (inner system before satellites), then
// in-network followers descending (more connected = more valuable), then
// handle ascending as the final tiebreak. Not executed here — selection
// order only.
const enrichmentPriority = [...nodeIds].sort((a, b) => {
  if (a === SEED) return -1;
  if (b === SEED) return 1;
  const d = (degree.get(a) ?? Infinity) - (degree.get(b) ?? Infinity);
  if (d !== 0) return d;
  const inf = (edges.filter((e) => e.target === b).length) - (edges.filter((e) => e.target === a).length);
  if (inf !== 0) return inf;
  return a.localeCompare(b);
});

const nodes: Node[] = [...nodeIds].sort().map((id) => {
  const p = profiles.get(id);
  const obs = observed.get(id);
  const paid = typeof p?.followersCount === "number" && Number.isFinite(p.followersCount) ? p.followersCount : null;
  // Paid scrape wins; the free datalake join only fills nulls.
  const followers = paid ?? freeFollowers.get(id) ?? null;
  if (paid === null && followers !== null) freeFollowerFills += 1;
  return {
    id,
    followers,
    engagement_rate: engagement.get(id) ?? null,
    tier: tierForFollowers(followers),
    degree: degree.get(id) ?? Infinity,
    directed_degree: directedDegree.has(id) ? directedDegree.get(id)! : null,
    in_network_followers: edges.filter((e) => e.target === id).length,
    in_network_following: edges.filter((e) => e.source === id).length,
    sub_niche: null,
    is_verified: p ? (p.verified ?? false) : (obs?.is_verified ?? false),
    is_private: p ? (p.private ?? false) : (obs?.is_private ?? false),
    reached_from: [...(reachedFrom.get(id) ?? new Set<string>())].sort(),
  };
});

notes.push(`followers filled from docs/research/datalake_creators.json (free, no Apify cost) for ${freeFollowerFills} node(s) the paid scrape left null`);
notes.push(`enrichment priority order (seed first, degree asc, in_network_followers desc, handle asc), head: ${enrichmentPriority.slice(0, 10).join(", ")}...`);

const universe: Universe = {
  meta: {
    seed: SEED,
    collected_at: new Date().toISOString(),
    cost_usd: Math.round(costUsd * 10000) / 10000,
    run_ids: runIds,
    actors,
    unknown_followers: nodes.filter((n) => n.followers === null).length,
    nodes_unreachable_from_seed: nodes.filter((n) => n.directed_degree === null).length,
    notes,
  },
  nodes,
  edges,
};

fs.writeFileSync(OUT, JSON.stringify(universe, null, 2) + "\n");
fs.mkdirSync(`${REPO}/public`, { recursive: true });
fs.writeFileSync(`${REPO}/public/universe.json`, JSON.stringify(universe, null, 2) + "\n");

const unknownFrac = nodes.length ? universe.meta.unknown_followers / nodes.length : 0;
console.log(`nodes: ${nodes.length} (unknown followers: ${universe.meta.unknown_followers}, ${(unknownFrac * 100).toFixed(1)}%)`);
console.log(`edges: ${edges.length}`);
console.log(`cost from ledger: $${universe.meta.cost_usd.toFixed(4)} across ${runIds.length} runs`);
console.log(`wrote ${OUT} and copied to ${PUB}`);