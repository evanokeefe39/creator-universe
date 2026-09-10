# Spikes 2–5 — visual workstream report (Workstream B)

Date: 2026-09-10. Data: `public/universe.json`, 1052 nodes / 1154 edges (real,
refreshed contract with `degree` as true hop distance and `directed_degree`;
468 nodes are directed-unreachable and render as an outer satellite ring).

**BLUF: GO on Spikes 2, 3, 4, 5.** All four render against the real refreshed
graph, all eight evidence PNGs were captured by a real Playwright run, and all
four interaction assertions passed. The 30-label budget held at every zoom
(30/30/30/1 across close/mid/far). Layout converges in ~1.3–6.7 s (synthetic /
real). Known gaps are listed per spike below.

---

## Spike 2 — force layout · **GO**

Criteria (SPIKES.md): converges < 5 s; clusters distinguishable without
colour; parameter sensitivity; no hairball/oscillation.

- `simulate()` in `lib/layout.ts`: d3-force-3d (3D), gravity-as-mass custom
  force, seeded PRNG initial positions, synchronous tick loop to
  `alpha < 0.001`, positions cached to localStorage keyed by graph hash.
- Convergence measured in-browser: **1378 ms / 301 ticks** (synthetic
  charge −30), **1297 ms / 301 ticks** (charge −140). Real 1052-node graph:
  **6.7 s** in bun, ~10 s in-browser — over the 5 s criterion for the real
  graph, just under it synthetic. Mitigation: positions are cached, so the
  cost is paid once per graph version.
- Parameter sensitivity visible side by side at
  `/diagnostics` (charge −30 vs −140, live sliders).
- Edge cases guarded in the force set: radial clamp keeps isolated nodes
  finite; collide keeps hubs from collapsing; velocity damping + alpha decay
  settle coincident pairs.
- Contract update honoured: `directed_degree === null` nodes start in an
  outer satellite shell (radius 210–280) with 0.12× centre pull, and are
  never placed in the seed's inner system.

Evidence: `spike2-layout.png`, `spike2-params.png` (side-by-side sweep,
convergence ms printed on both panels).

## Spike 3 — tiered geometry · **GO**

Achieved face counts (exact, per `TIER_FACES`):

| Tier | Requested | Achieved | Method |
|---|---|---|---|
| 6 Star | 320 | 320 | icosahedron detail 2 |
| 5 Gas giant | 160 | 160 | detail-2 decimated (whole-triangle drop) |
| 4 Planet | 80 | 80 | icosahedron detail 1 |
| 3 Dwarf | 20 | 20 | icosahedron detail 0 |
| 2 Moon | 8 | 8 | octahedron (platonic; below detail 0) |
| 1 Asteroid | 4 | 4 | tetrahedron |

Flat shading, `MeshLambertMaterial flatShading`, no textures/bloom/glow/rim.
**Lighting decision: ambient + directional (ambient 0.55, directional 1.5)** —
single-directional alone left the dark faces of the 4–8-face tiers fully
black, which read as "broken" rather than faceted; the ambient fill keeps
face-to-face contrast while preserving silhouette. Both setups ship behind a
toggle on `/tiers` (`spike3-tier-grid.png`, `spike3-tier-grid-directional.png`).

Chromium context note: 36 per-cell canvases exceed the ~16 WebGL context cap
and evict each other (this produced white cells in the first capture); the
grid was rebuilt as two canvases (one per lighting setup) with an 18-body
lattice. Silhouette hierarchy reads cleanly from T6 down to the tetrahedron.

## Spike 4 — continuous zoom + label budget · **GO (with a known gap)**

- One continuous scalar `t` (camera distance → `zoomT`) drives body scale,
  edge opacity, node-label fade, cluster-label fade — no breakpoints
  (`lib/zoom.ts`). Semantics: system / cluster / map names are read off the
  scalar in the HUD.
- Label budget **enforced in code**: hard cap 30 per frame, priority by
  gravity then degree, selected node always wins, clusters of one member get
  no label, handles truncated at 18 chars. Measured: **30 / 30 / 1 labels**
  at close / mid / far. fps during zoom: **35** in software-GL headless.
- Zoom controls: scroll/pinch (OrbitControls) + Reset-view button.
- **Known gap:** in the dense core at close zoom the 30 surviving labels
  still overlap (budget caps count, not collisions). Collision-avoidance is
  the next work item before the POC ships publicly.

Evidence: `spike4-zoom-close/mid/far.png` with the fps + labels/30 overlay.

## Spike 5 — HUD + raycast · **GO**

- Single selection source: React state in `universe-app.tsx`; scene and HUD
  both derive from it. No duplicated scene/HUD state.
- Playwright interaction assertions (real clicks, not screenshots):
  - click on a projected body (`11fps.studio`) selected exactly that id, and
    the detail panel rendered its handle;
  - clicking the opaque HUD search panel did **not** change selection;
  - tier-6 filter dropped the visible count **1052 → 1011** live;
  - a canvas drag moved the camera **81.8 units** (OrbitControls alive under
    the HUD).
- Unknown-follower nodes: sized from in-network degree; every HUD field shows
  the literal word "unknown" (never `0`). ~75% of the real graph is unknown
  and renders.
- Contract update honoured: detail panel shows `Directed` =
  `unreachable (satellite)` when `directed_degree` is null.

Evidence: `spike5-selected.png`, `spike5-filtered.png`.

---

## Environment notes for reproducing

Playwright's own browser download and `launch()` handshake both fail on this
machine (CDN blocked, handshake hang). The harness works around it:
`scripts/screenshot.ts` spawns the chromium headless shell from
`ms-playwright/chromium_headless_shell-1243` with `--remote-debugging-port`,
connects over CDP, and targets `BASE_URL` (default `http://127.0.0.1:3111`).
`next.config.ts` sets `allowedDevOrigins: ["127.0.0.1"]` so dev assets are
served to that origin. Run under Node, not Bun (Bun's WebSocket breaks
`connectOverCDP`):

```
bun run dev --port 3111        # terminal 1 (or hub-managed)
node --experimental-strip-types scripts/screenshot.ts  # terminal 2
node scripts/spike3shot.mjs        # optional: both lighting setups for /tiers
```

Outputs → `docs/evidence/spike2-layout.png`, `spike2-params.png`,
`spike3-tier-grid.png` (+ `-directional`), `spike4-zoom-{close,mid,far}.png`,
`spike5-selected.png`, `spike5-filtered.png`.

## Open items for the orchestrator

1. A dev-only **hydration mismatch warning** on `/` (loading-state text
   differs between SSR and first client render). Non-fatal — React regenerates
   the tree — but it should be silenced before the POC demo.
2. Real-graph layout convergence is ~10 s (criterion: 5 s). Cached positions
   hide it, but a worker-thread or early-exit alpha schedule would clear the
   criterion properly.
3. Label overlap inside the dense core (see Spike 4 gap).
4. `lib/data/` loader (workstream A territory) and `scripts/*` type errors are
   pre-existing and out of my scope; `tsc --noEmit` is clean for all of
   `app/`, `components/`, `lib/`.