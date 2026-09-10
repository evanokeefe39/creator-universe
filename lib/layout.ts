import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force-3d";
import type { Edge, Node } from "./types";
import { hashString, mulberry32 } from "./synthetic";

export const LAYOUT_RADIUS = 110;

export type LayoutParams = {
  chargeStrength: number;
  linkDistance: number;
  centerStrength: number;
};

export const DEFAULT_PARAMS: LayoutParams = {
  chargeStrength: -60,
  linkDistance: 24,
  centerStrength: 0.06,
};

export type LayoutResult = {
  /** id -> [x, y, z] settled position, normalized so the graph fits LAYOUT_RADIUS. */
  positions: Map<string, [number, number, number]>;
  convergenceMs: number;
  ticks: number;
  params: LayoutParams;
  converged: boolean;
};

type SimNode = SimulationNodeDatum & {
  id: string;
  mass: number;
  degree: number;
  /** Grouping key for locality; null means the node forms its own cluster. */
  clusterKey: string | null;
  /** Not reachable from the seed over directed follow edges -> outer shell. */
  satellite: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

/**
 * Mass, on the SAME power law as `bodyRadius` in lib/gravity, so the physics
 * agrees with the pixels. Strictly increasing in `followers`.
 *
 * The previous version gated on `engagement_rate`, which exists for only 8 of
 * 1052 nodes — so 1044 fell to the fallback branch and the ordering inverted (an
 * 89M-follower account took the floor value while a 157k account took the top).
 */
export const MASS_FLOOR = 1.0;
/** Strictly below MASS_FLOOR: an unknown count must never outweigh a known one. */
export const MASS_UNKNOWN = 0.5;

export function massOf(n: Node): number {
  if (n.followers === null) return MASS_UNKNOWN;
  return MASS_FLOOR + Math.pow(n.followers / 10_000, 0.3);
}

const HARD_RADIUS = 600;
const MAX_TICKS = 600;

/** Orbital radius of a cluster's heaviest (dominant) member. */
const ORBIT_BASE = 9;
const ORBIT_MIN = 4;
const ORBIT_MAX = 150;
/** Radial spring gain pulling a node toward its own target orbit. */
const ORBIT_STRENGTH = 0.22;
/** Minimum separation enforced between cluster centres before simulating. */
const CLUSTER_SEPARATION = 150;
const ANCHOR_RELAX_ITERATIONS = 240;

/**
 * Deterministic d3-force-3d layout. Initial positions come from a seeded PRNG
 * (never Math.random), so the same graph settles to the same arrangement.
 *
 * Locality comes from `clusterOrbit`, not from a global pull. Each cluster owns
 * a centre seeded at its heaviest member, and every node is sprung toward ITS
 * OWN centre at a target radius that shrinks as mass grows — so the dominant
 * body of a cluster sits inside its own system and lighter bodies orbit wide.
 *
 * Edge-case guards baked into the force set:
 *  - `clusterOrbit` is the only positional force; nothing is dragged toward the
 *    global origin, because a single shared centre is exactly the failure mode
 *    (heavy bodies clustering at one point) this layout replaces.
 *  - `radialClamp` hard-caps the radius each tick, so nothing escapes and a
 *    coincident pair cannot oscillate beyond a bounded region; alpha decay
 *    plus velocity damping settle any residual jitter.
 *  - `collide` keeps a very high-degree hub from collapsing its neighbours
 *    onto the same point.
 *  - A node with `cluster === null` is its own singleton and is never pulled
 *    anywhere; `center` keeps it from drifting out of frame.
 */
export function simulate(
  nodes: Node[],
  edges: Edge[],
  params: LayoutParams = DEFAULT_PARAMS,
): LayoutResult {
  const seed = hashString(nodes.map((n) => n.id).sort().join(",")) ^ ((params.chargeStrength * 7919) >>> 0);
  const rng = mulberry32(seed);
  const simNodes: SimNode[] = nodes.map((n) => ({
    id: n.id,
    degree: n.degree,
    mass: massOf(n),
    clusterKey: n.cluster,
    satellite: n.directed_degree === null,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
  }));
  const byId = new Map(simNodes.map((n) => [n.id, n]));

  // ---- Cluster centres -------------------------------------------------
  // One centre per distinct cluster, seeded at its HEAVIEST member — the
  // dominant body. Iterated in sorted key order so the result is independent
  // of Map insertion order and the layout stays deterministic.
  const grouped = new Map<string, SimNode[]>();
  for (const n of simNodes) {
    if (n.clusterKey === null) continue;
    const bucket = grouped.get(n.clusterKey);
    if (bucket) bucket.push(n);
    else grouped.set(n.clusterKey, [n]);
  }
  const anchors: { key: string; maxMass: number; x: number; y: number; z: number }[] = [];
  for (const [key, group] of [...grouped.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    let heaviest = group[0];
    for (const n of group) if (n.mass > heaviest.mass) heaviest = n;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const r = 60 + rng() * 120;
    anchors.push({
      key,
      maxMass: heaviest.mass,
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
    });
  }

  // Push the centres apart so distinct clusters occupy distinct regions of
  // space. Pure repulsion over a fixed iteration count — no RNG, no clock.
  for (let it = 0; it < ANCHOR_RELAX_ITERATIONS; it++) {
    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        const a = anchors[i];
        const b = anchors[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        let d = Math.hypot(dx, dy, dz);
        // Edge case: two centres relaxed onto the exact same point have no
        // separation direction; push along +x so they still separate.
        if (d < 1e-6) { dx = 1; dy = 0; dz = 0; d = 1; }
        if (d >= CLUSTER_SEPARATION) continue;
        const push = (CLUSTER_SEPARATION - d) * 0.5;
        const ux = dx / d;
        const uy = dy / d;
        const uz = dz / d;
        a.x -= ux * push; a.y -= uy * push; a.z -= uz * push;
        b.x += ux * push; b.y += uy * push; b.z += uz * push;
      }
    }
  }
  const anchorByKey = new Map(anchors.map((a) => [a.key, a]));

  /**
   * Target orbital radius: the heavier a body relative to its cluster's
   * dominant member, the closer in it sits. Keplerian flavour (inverse square
   * root) rather than linear, so the dominant body owns a clear inner region
   * instead of sharing a ring with everything else.
   */
  const orbitTarget = (mass: number, maxMass: number): number =>
    Math.min(Math.max(ORBIT_BASE * Math.sqrt(maxMass / Math.max(mass, 1e-6)), ORBIT_MIN), ORBIT_MAX);

  // Start every clustered node already ON its orbit around its own centre, so
  // the system begins near its settled arrangement and converges quickly.
  for (const n of simNodes) {
    const anchor = n.clusterKey === null ? undefined : anchorByKey.get(n.clusterKey);
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    if (!anchor) {
      // No cluster: its own singleton, parked outside every system.
      const r = 260 + rng() * 60;
      n.x = r * Math.sin(phi) * Math.cos(theta);
      n.y = r * Math.sin(phi) * Math.sin(theta);
      n.z = r * Math.cos(phi);
      continue;
    }
    // Directed-unreachable nodes still belong to their cluster, but start
    // further out so they settle as an outer shell rather than a core member.
    const r = orbitTarget(n.mass, anchor.maxMass) * (n.satellite ? 1.35 : 1);
    n.x = anchor.x + r * Math.sin(phi) * Math.cos(theta);
    n.y = anchor.y + r * Math.sin(phi) * Math.sin(theta);
    n.z = anchor.z + r * Math.cos(phi);
  }

  const links: SimulationLinkDatum<SimNode>[] = [];
  for (const e of edges) {
    if (byId.has(e.source) && byId.has(e.target)) links.push({ source: e.source, target: e.target });
  }

  const sim = forceSimulation<SimNode, undefined>(simNodes, 3)
    .force("link", forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
      .id((n) => n.id)
      .distance(params.linkDistance)
      .strength(0.25))
    .force("charge", forceManyBody<SimNode>().strength(params.chargeStrength).distanceMax(400))
    .force("center", forceCenter<SimNode>(0, 0, 0).strength(params.centerStrength))
    .force("collide", forceCollide<SimNode>((n) => 3 + n.mass * 2).iterations(2))
    // THE positional force. Each node is sprung toward ITS OWN cluster centre:
    // outward if it sits inside its target orbit, inward if beyond it. Nothing
    // is pulled toward the global origin — a single shared centre is precisely
    // the old failure mode, where raising mass dragged every heavy body to one
    // point instead of forming local systems.
    .force("clusterOrbit", (alpha: number) => {
      for (const n of simNodes) {
        if (n.clusterKey === null) continue;
        const anchor = anchorByKey.get(n.clusterKey);
        if (!anchor) continue;
        const dx = anchor.x - (n.x ?? 0);
        const dy = anchor.y - (n.y ?? 0);
        const dz = anchor.z - (n.z ?? 0);
        const r = Math.hypot(dx, dy, dz);
        // Edge case: a node sitting exactly on its centre has no radial
        // direction; skip it this tick rather than dividing by zero. Collision
        // and charge push it off the centre on a later tick.
        if (r < 1e-6) continue;
        const err = (r - orbitTarget(n.mass, anchor.maxMass)) * ORBIT_STRENGTH * alpha;
        n.vx = (n.vx ?? 0) + (dx / r) * err;
        n.vy = (n.vy ?? 0) + (dy / r) * err;
        n.vz = (n.vz ?? 0) + (dz / r) * err;
      }
    })
    .force("radialClamp", () => {
      for (const n of simNodes) {
        const x = n.x ?? 0, y = n.y ?? 0, z = n.z ?? 0;
        const r = Math.hypot(x, y, z);
        if (r > HARD_RADIUS) {
          const k = HARD_RADIUS / r;
          n.x = x * k; n.y = y * k; n.z = z * k;
          n.vx = (n.vx ?? 0) * 0.5; n.vy = (n.vy ?? 0) * 0.5; n.vz = (n.vz ?? 0) * 0.5;
        }
      }
    })
    .alphaMin(0.001)
    .alphaDecay(0.0227)
    .velocityDecay(0.4)
    .stop();

  const t0 = performance.now();
  let ticks = 0;
  while (sim.alpha() > sim.alphaMin() && ticks < MAX_TICKS) {
    sim.tick();
    ticks++;
  }
  const convergenceMs = performance.now() - t0;

  let maxR = 1;
  for (const n of simNodes) maxR = Math.max(maxR, Math.hypot(n.x ?? 0, n.y ?? 0, n.z ?? 0));
  const scale = LAYOUT_RADIUS / maxR;
  const positions = new Map<string, [number, number, number]>();
  for (const n of simNodes) {
    positions.set(n.id, [(n.x ?? 0) * scale, (n.y ?? 0) * scale, (n.z ?? 0) * scale]);
  }

  return { positions, convergenceMs, ticks, params, converged: sim.alpha() <= sim.alphaMin() };
}

/**
 * Cached layout: settle once, persist to localStorage keyed by a graph hash,
 * so a reload reproduces the identical arrangement without re-running.
 */
const CACHE_PREFIX = "cu-layout-v2-";

export function graphHash(nodes: Node[], edges: Edge[]): string {
  const nodePart = nodes.map((n) => `${n.id}:${n.followers ?? "u"}:${n.cluster ?? ""}`).sort().join("|");
  const edgePart = edges.map((e) => `${e.source}>${e.target}`).sort().join("|");
  return hashString(nodePart + "#" + edgePart).toString(16);
}

export function loadCachedLayout(hash: string): LayoutResult | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + hash);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      positions: [string, [number, number, number]][];
      convergenceMs: number;
      ticks: number;
      params: LayoutParams;
    };
    return {
      positions: new Map(parsed.positions),
      convergenceMs: parsed.convergenceMs,
      ticks: parsed.ticks,
      params: parsed.params,
      converged: true,
    };
  } catch {
    return null;
  }
}

export function saveCachedLayout(hash: string, result: LayoutResult): void {
  try {
    localStorage.setItem(CACHE_PREFIX + hash, JSON.stringify({
      positions: [...result.positions],
      convergenceMs: result.convergenceMs,
      ticks: result.ticks,
      params: result.params,
    }));
  } catch {
    // Storage unavailable — layout still works, it just recomputes each load.
  }
}