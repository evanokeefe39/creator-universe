import * as THREE from "three";
import { TIER_FACES, type Tier } from "./types";

export type GeometrySpec = {
  /** How the requested TIER_FACES count was realised. */
  method: "icosahedron-detail" | "platonic" | `decimated-detail-${number}`;
  detail: number | null;
  /** Exact triangle count of the produced geometry. */
  achievedFaces: number;
  requestedFaces: number;
};

const cache = new Map<Tier, THREE.BufferGeometry>();
const specs = new Map<Tier, GeometrySpec>();

export function geometrySpecFor(tier: Tier): GeometrySpec {
  return specs.get(tier)!;
}

export function geometryFor(tier: Tier): THREE.BufferGeometry {
  const cached = cache.get(tier);
  if (cached) return cached;
  const requested = TIER_FACES[tier];
  let geo: THREE.BufferGeometry;
  let spec: GeometrySpec;

  if (requested <= 20) {
    // Below / at detail 0, exact subdivision is impossible; use the platonic
    // solid whose face count matches the request exactly.
    if (requested <= 4) {
      geo = new THREE.TetrahedronGeometry(1, 0);
      spec = { method: "platonic", detail: null, achievedFaces: 4, requestedFaces: requested };
    } else if (requested <= 8) {
      geo = new THREE.OctahedronGeometry(1, 0);
      spec = { method: "platonic", detail: null, achievedFaces: 8, requestedFaces: requested };
    } else {
      geo = new THREE.IcosahedronGeometry(1, 0);
      spec = { method: "icosahedron-detail", detail: 0, achievedFaces: 20, requestedFaces: requested };
    }
  } else {
    // Nearest icosahedron subdivision. PolyhedronGeometry splits each of the
    // 20 base triangles into (d+1)^2, so detail d gives 20·(d+1)^2 triangles:
    // 20 at d0, 80 at d1, 180 at d2, 320 at d3. NOTE: 20·4^d is WRONG from d2
    // onward — it overstates the count (320 at d2) and makes decimateTo a no-op
    // that silently returns the smaller base geometry.
    // For counts between achievable levels, build the next subdivision up and
    // decimate (drop whole triangles) until the count matches the request.
    let detail = 0;
    while (20 * (detail + 1) ** 2 < requested) detail++;
    const base = new THREE.IcosahedronGeometry(1, detail);
    geo = decimateTo(base, requested);
    spec = {
      method: geo === base ? "icosahedron-detail" : `decimated-detail-${detail}`,
      detail,
      achievedFaces: countFaces(geo),
      requestedFaces: requested,
    };
  }

  specs.set(tier, spec);
  cache.set(tier, geo);
  return geo;
}

/** Non-indexed triangle count. */
function countFaces(geo: THREE.BufferGeometry): number {
  const pos = geo.getAttribute("position");
  return pos ? pos.count / 3 : 0;
}

/**
 * Remove whole triangles from a non-indexed geometry until exactly `target`
 * remain. Triangles are dropped evenly around the sphere (every other facet
 * in the buffer's fan order) so the silhouette stays roughly convex and
 * chunky — the intended low-poly look, not a punched-out shell.
 */
function decimateTo(base: THREE.BufferGeometry, target: number): THREE.BufferGeometry {
  const nonIndexed = base.index ? base.toNonIndexed() : base;
  const pos = nonIndexed.getAttribute("position") as THREE.BufferAttribute;
  const total = pos.count / 3;
  if (total <= target) return nonIndexed;

  const keepStride = total / target;
  const kept: number[] = [];
  for (let f = 0; f < total; f++) {
    // Deterministic jitter-free sampling: keep the triangle nearest each slot.
    const src = Math.min(total - 1, Math.floor(f * keepStride));
    for (let v = 0; v < 3; v++) {
      const i = src * 3 + v;
      kept.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    if (kept.length / 9 >= target) break;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
  out.computeVertexNormals();
  return out;
}

/** The two lighting setups behind the Spike 3 toggle. */
export type LightingSetup = "directional-only" | "ambient-plus-directional";

export const LIGHTING_LABELS: Record<LightingSetup, string> = {
  "directional-only": "Single directional",
  "ambient-plus-directional": "Ambient + directional",
};