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
  /** Not reachable from the seed over directed follow edges -> outer shell. */
  satellite: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};
/** Mass from gravity when known; in-network linkage otherwise (never 0). */
function massOf(n: Node): number {
  if (n.followers !== null && n.engagement_rate !== null) {
    return 0.4 + Math.log10(n.followers * n.engagement_rate + 1) / 6;
  }
  return 0.3 + Math.min(n.in_network_followers + n.in_network_following, 30) / 40;
}

const HARD_RADIUS = 600;
const MAX_TICKS = 600;

/**
 * Deterministic d3-force-3d layout. Initial positions come from a seeded PRNG
 * (never Math.random), so the same graph settles to the same arrangement.
 *
 * Edge-case guards baked into the force set:
 *  - `gravity` pulls with strength scaled by mass — an isolated (linkless)
 *    node is drawn to the origin instead of flying off under charge repulsion.
 *  - `radialClamp` hard-caps the radius each tick, so nothing escapes and a
 *    coincident pair cannot oscillate beyond a bounded region; alpha decay
 *    plus velocity damping settle any residual jitter.
 *  - `collide` keeps a very high-degree hub from collapsing its neighbours
 *    onto the same point.
 */
export function simulate(
  nodes: Node[],
  edges: Edge[],
  params: LayoutParams = DEFAULT_PARAMS,
): LayoutResult {
  const seed = hashString(nodes.map((n) => n.id).sort().join(",")) ^ ((params.chargeStrength * 7919) >>> 0);
  const rng = mulberry32(seed);
  const simNodes: SimNode[] = nodes.map((n) => {
    const satellite = n.directed_degree === null;
    // Seed-reachable nodes start near their hop ring; directed-unreachable
    // nodes start in an outer satellite shell — the data shows no follow
    // chain from the seed, so they must not be placed as its neighbours.
    const shell = satellite
      ? 210 + rng() * 70
      : 18 + (n.directed_degree ?? 0) * 42 + rng() * 24;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    return {
      id: n.id,
      degree: n.degree,
      mass: massOf(n),
      satellite,
      x: shell * Math.sin(phi) * Math.cos(theta),
      y: shell * Math.sin(phi) * Math.sin(theta),
      z: shell * Math.cos(phi),
      vx: 0, vy: 0, vz: 0,
    };
  });
  const byId = new Map(simNodes.map((n) => [n.id, n]));

  const links: SimulationLinkDatum<SimNode>[] = [];
  for (const e of edges) {
    if (byId.has(e.source) && byId.has(e.target)) links.push({ source: e.source, target: e.target });
  }

  const sim = forceSimulation<SimNode, undefined>(simNodes, 3)
    .force("link", forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
      .id((n) => n.id)
      .distance(params.linkDistance)
      .strength(0.7))
    .force("charge", forceManyBody<SimNode>().strength(params.chargeStrength).distanceMax(400))
    .force("center", forceCenter<SimNode>(0, 0, 0).strength(params.centerStrength))
    .force("collide", forceCollide<SimNode>((n) => 3 + n.mass * 2).iterations(2))
    .force("gravity", (alpha: number) => {
      for (const n of simNodes) {
        const pull = params.centerStrength * (0.5 + n.mass) * alpha * (n.satellite ? 0.12 : 1);
        n.vx -= (n.x ?? 0) * pull;
        n.vy -= (n.y ?? 0) * pull;
        n.vz -= (n.z ?? 0) * pull;
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
const CACHE_PREFIX = "cu-layout-v1-";

export function graphHash(nodes: Node[], edges: Edge[]): string {
  const nodePart = nodes.map((n) => `${n.id}:${n.followers ?? "u"}`).sort().join("|");
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