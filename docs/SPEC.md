# Creator Universe — Product Spec

> Canonical product spec. Source of truth for intent. Spike outcomes live in
> `SPIKES.md`; epic governance lives in `tasks/epics/`.

## Intent

Map a niche creator ecosystem as an interactive 3D solar system, using a seed
account's following list as the origin point. Each creator becomes a celestial
body — star, planet, moon — classified by audience size and weighted by
engagement gravity. The result is an explorable universe where you can fly
through a niche landscape, discover hidden high-influence small accounts, and
see how creators cluster and connect.

The aesthetic is analytical and restrained — closer to Eve Online's HUD-over-
space UI than to a flashy game. No glow, no bloom, no particle effects. Clean
geometry, flat shading, tight typography, muted palettes. **The data is the
spectacle.**

## Core concepts

### Celestial classification (logarithmic buckets)

| Bucket | Followers | Celestial type |
|---|---|---|
| Tier 6 | 1M+ | Star |
| Tier 5 | 100K–1M | Gas giant |
| Tier 4 | 10K–100K | Planet |
| Tier 3 | 1K–10K | Dwarf planet |
| Tier 2 | 101–1K | Moon |
| Tier 1 | 0–100 | Asteroid |

A node whose follower count could not be collected is **unknown**, not tier 1.
Unknown nodes are positioned and sized by in-network degree and are labelled as
unknown in the HUD.

### Gravity score

`gravity = followers × engagement_rate`, optionally weighted by
interconnectedness (how many other mapped creators follow this account).

Two archetypes matter:

- **Red giant** — high followers, low engagement. Large but diffuse. A big,
  muted, low-density body.
- **Neutron star** — low followers, high engagement. Small but dense. A
  compact, bright, high-detail body.

When follower count or engagement rate is unknown, gravity is unknown, and the
renderer must fall back to in-network degree rather than substituting zero.

### Spatial layout

- Distance from centre = degree of separation from the seed account
  (first-degree follows are inner system, second-degree are further out).
- Clustering by sub-niche — accounts covering similar topics orbit near each
  other, forming constellations.
- Driven by force-directed physics so the graph self-organises, with settled
  positions cached for stability between sessions.

### Zoom levels

| Level | View | What's visible |
|---|---|---|
| Close | Solar system | Individual faceted geometry, labels, stats, rings, connections |
| Mid | Star cluster | Objects collapse to dots, cluster structure emerges, sub-niche groupings visible |
| Far | Constellation map | Named regions, density clouds, high-level niche topology |

Transitions between levels are continuous — labels fade, geometry simplifies to
points, cluster labels appear. No hard breakpoints.

## Visual style

### Objects — low-poly faceted geometry

Every celestial body is a procedural icosahedron with flat shading. Polygon
count encodes hierarchy:

- Stars: ~320 faces (nearly smooth)
- Gas giants: ~160 faces
- Planets: ~80 faces
- Dwarf planets: ~20 faces
- Moons: ~8 faces
- Asteroids: ~4 faces

Hierarchy is readable from silhouette alone. No textures, no glow, no bloom.
Rings (flat disc, same aesthetic) denote special status — a connector or bridge
account between sub-niches.

### Colour

Constrained muted palette — 5–6 desaturated tones mapped to sub-niche category.
Slate blue, dusty terracotta, sage green, warm grey, muted amber. Flat-shaded
faces create natural light/dark variation within a single base colour.

### HUD overlay

HTML/CSS layer over the canvas, not rendered in 3D. Hairline borders,
semi-transparent dark fills, monospace or tight sans-serif type. Panels for:

- Selected creator detail (handle, followers, engagement rate, gravity score,
  classification, degree, in-network follower count)
- Bucket filters / sub-niche toggles
- Search
- Minimap of the full universe

One accent colour (muted cyan or amber) for interactive/selection state.
Everything else in greys and whites.

### Overall tone

Analytical instrument, not video game. Precision over spectacle. Intentional
negative space. Information density managed through progressive disclosure on
interaction — hover, select, zoom.

## Data pipeline

### Collection

1. Start with the seed account's following list.
2. For each account: capture username, follower count, engagement rate
   (estimate from recent posts), bio/category.
3. Expand: pick 2–3 accounts per bucket, scrape their following lists for
   second-degree connections.
4. Record edges: who follows whom within the mapped universe.

Cost-bearing. Every run goes through a `--plan` projection and records itself in
`data/cost_ledger.json`.

### Storage

Flat JSON — no database at this scale (hundreds to low thousands of nodes).
See `AGENTS.md` for the exact `Universe` / `Node` / `Edge` contract.

### Gravity computation

Simple arithmetic at data-prep time. Interconnectedness weighting is an
enhancement, not a POC requirement.

## Likely tech stack

**Chosen:** Three.js via `@react-three/fiber` (React 19 renderer, declarative
scene graph, built-in raycasting), `d3-force-3d` for physics, HTML/CSS overlay
for the HUD, Next.js App Router for the shell.

Rejected:

- **react-force-graph-3d** — faster to prototype, but the per-node custom
  geometry and zoom semantics this design needs fight its abstraction.
- **Zep / Graphiti** — temporal knowledge graph for agent memory. Wrong problem.
- **HydraDB / Neo4j** — production graph databases. Unnecessary at a few
  thousand nodes in a JSON file.
- **Gephi** — static analysis only; no interactive 3D fly-through, no bespoke
  aesthetic.

## Gotchas

### Data collection

- Instagram rate-limits and blocks scraping aggressively. Slow pacing, per-item
  retries, and a bounded item cap per run are the defences.
- Engagement rate is an estimate sampled from recent posts — good for relative
  ranking, not absolute truth.
- Private accounts are invisible. The map will have holes, and the HUD must
  state them rather than hide them.

### Visualisation

- Force-directed layouts are non-deterministic. Cache settled positions so the
  universe feels stable between sessions.
- Labels collide at every zoom level. A label budget enforced in code, not
  hand-tuned.
- Performance ceiling: thousands of simple meshes are fine; tens of thousands
  with post-processing need instanced meshes or LOD management.
- Flat shading on very-low-poly bodies can read as placeholder geometry. The
  surrounding palette, lighting and neighbours are what make it read as a style
  choice — which is exactly what Spike 3 tests.

### UX

- Flying through 3D space is disorienting. Click-to-focus, a reset-view button,
  and a breadcrumb of where you have been are required, not optional.
- The constellation map (far zoom) is effectively a second visualisation
  sharing the same data — it needs its own design pass.
- Mobile is hard. Desktop-first is an accepted constraint for the POC.

### Scope creep

Temporal tracking, community detection, automated sub-niche classification and
AI clustering are all viable enhancements and each is a project in itself.
Ship the static universe first.

## Avenues for enhancement (post-POC)

Temporal dimension (snapshot and replay growth) · automated sub-niche
clustering from bio/hashtags/content · interconnectedness-weighted gravity ·
visible orbit paths for collaboration relationships · multi-seed overlap ·
comparison mode across time or niche · static SVG constellation export ·
ambient generative sound design.
