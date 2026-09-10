# US-CU-2 — Force-directed layout at target scale

- **Epic:** E-UNIVERSE
- **Spike:** Spike 2 — Force-Directed Layout at Target Scale
- **Owner:** ux-worker
- **Status:** Open

## Story

**As a** viewer of the niche map
**I want** the graph to settle into readable, clustered spatial structure
**So that** I can see sub-niches as regions rather than a hairball.

## Acceptance criteria

- **AC1** — With 200–500 synthetic nodes (3–5 clusters, 3–15 edges/node), the
  `d3-force-3d` simulation reaches `alpha < 0.001` (converged) in **under 5
  seconds** of wall-clock simulation time on the dev machine; the measured
  duration is printed.
- **AC2** — Clusters are visually separable in a screenshot rendered with a
  single flat colour and no labels — grouping is legible from position alone.
- **AC3** — Tier hierarchy is spatially readable: the renderer's radial or
  gravitational treatment places higher-gravity nodes nearer the centre, and
  the pattern survives at least one parameter sweep.
- **AC4** — Parameter sensitivity is demonstrated: two runs with materially
  different `chargeStrength` (or link distance) produce visibly different, and
  both-readable, layouts. A layout insensitive to its parameters fails this AC.
- **AC5** — Settled positions are cached to disk; reloading the page reproduces
  the same arrangement (no re-randomisation between sessions).

## Edge cases

- Isolated node (degree 0) — must not be ejected to infinity.
- Two nodes at identical coordinates — jitter must not oscillate forever.
- A single very high-degree hub — must not collapse the entire layout to a point.

## Definition of Done

- [ ] Screenshot of the raw layout committed under `docs/evidence/`
- [ ] Convergence time and node count recorded in `docs/SPIKES.md`
- [ ] Parameter-sweep comparison captured (≥2 layouts side by side)
- [ ] Position cache round-trips (write → reload → identical coordinates)
- [ ] Go/no-go recorded with reasoning

## Tests

`lib/force.test.ts` — convergence bound on a fixed seed; determinism of the
cached layout; isolated-node containment.
