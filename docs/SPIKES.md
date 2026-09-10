# Spikes — plan, criteria and outcomes

Six time-boxed spikes, ordered by dependency and risk. Kill the idea early if a
foundational assumption is wrong; do not polish the HUD before the data can be
collected or the scene can render the node count.

Each spike gets a **go / no-go** with linked evidence. An outcome without an
artefact is not an outcome.

---

## Spike 1 — Data Collection Feasibility

**Question:** Can we reliably extract a seed account's following list with
follower counts at the scale needed?

**Time box:** 2–3 hours

**Method:** Scrape the seed (`nick_saraev`, ~174 follows) with a following-list
actor. Expand to 3–4 mid-tier accounts found in that list. Enrich the
deduplicated node set with profile details for follower counts.

**Go criteria**

- Full seed list captured with no run failure and no block.
- Second-degree expansion completes without a block.
- Follower counts obtainable for the mapped node set within budget.

**No-go signals**

- Instagram blocks or rate-limits before the seed list completes.
- Engagement/follower data is not visible without authentication.
- Private-account share is so high (>40%) that the map has too many holes.

**Output:** `data/universe.json` with ≥300 nodes and ≥400 edges, plus a cost
ledger entry.

**Outcome:** _pending_

---

## Spike 2 — Force-Directed Layout at Target Scale

**Question:** Does `d3-force-3d` produce a readable, stable layout at the
expected node count with meaningful clustering?

**Time box:** 2–3 hours

**Method:** Synthesise 200–500 nodes across all tiers with 3–5 sub-niche
categories and realistic edge density (3–15 per node). Run `d3-force-3d` with
gravity as node mass and follows as links. Evaluate convergence, cluster
formation without colour, and spatial tier separation.

**Go criteria**

- Converges within 5 seconds on the dev machine.
- Clusters visually distinguishable without colour.
- Tier hierarchy spatially readable.
- Layout responds to its force parameters (sensitivity demonstrated).

**No-go signals:** hairball layout; oscillation; layout insensitive to
parameters.

**Output:** `docs/evidence/spike2-layout.png` + convergence timing + a
parameter-sweep comparison.

**Outcome:** _pending_

---

## Spike 3 — Low-Poly Aesthetic Validation

**Question:** Do procedural icosahedra with flat shading read as intentional
design rather than placeholder geometry, especially at the moon/asteroid tier?

**Time box:** 2–3 hours

**Method:** Minimal Three.js scene, one object per tier
(~320 / ~160 / ~80 / ~20 / ~8 / ~4 faces), flat shading, muted palette, tested
at close/mid/far zoom under two lighting setups.

**Go criteria**

- All tiers distinguishable by silhouette at mid zoom.
- Moon and asteroid tiers look stylistically consistent, not broken.
- At a glance: "intentional art direction", not "unfinished 3D demo".
- Flat shading provides enough face-to-face contrast for dimensionality.

**No-go signals:** sub-20-face objects look like errors; the aesthetic only
holds with glow/bloom/rim light.

**Pivot if no-go:** 2D circle rendering with radius + opacity encoding.

**Output:** `docs/evidence/spike3-tier-grid.png` + lighting decision.

**Outcome:** _pending_

---

## Spike 4 — Zoom Transition and Label Density

**Question:** Can we transition smoothly between the three zoom levels without
visual breakage or label collision chaos?

**Time box:** 3–4 hours

**Method:** Combine the layout and the tiered geometry into one scene. Camera
zoom on scroll, labels fading by zoom, cluster labels appearing at far zoom.
Worst case: 15+ nodes in one tight group.

**Go criteria**

- Close → far zoom feels continuous, not jarring.
- Never more than ~30 labels visible at once.
- Cluster structure readable at mid zoom without labels.
- No frame below 30 fps during the transition.

**No-go signals:** labels overlap at every level with no fix; an uncanny valley
band between "readable object" and "abstract dot"; performance degrades during
zoom animation.

**Pivot if no-go:** discrete zoom levels with animated transitions.

**Output:** screen recording or frame sequence + measured max label count +
fps.

**Outcome:** _pending_

---

## Spike 5 — HUD Overlay Integration

**Question:** Can an HTML/CSS overlay sit cleanly over the canvas with
click-through interaction — selecting a node updates the panel, and HUD
controls affect the scene?

**Time box:** 2–3 hours

**Method:** Layer a HUD over the Spike 4 scene: detail panel, tier filter,
search. Raycast selection populates the panel. Verify pointer pass-through
semantics and that camera controls still work.

**Go criteria**

- Click targeting accurate: node selects, empty space and HUD elements do not
  misfire.
- HUD does not interfere with orbit/zoom/pan.
- Layering looks intentional.
- Scene state and HUD state are not duplicated — one source of truth.

**No-go signals:** unreliable pointer pass-through; readability collapse over
bright objects; an integration architecture that would be painful to maintain.

**Output:** screenshot of a selected node with the panel populated + a filter
applied, plus integration notes.

**Outcome:** _pending_

---

## Spike 6 — Real Data Smoke Test

**Question:** With actual collected data in the full prototype, does the result
reveal something about the niche — or is it just a scatter of dots?

**Time box:** 3–4 hours

**Method:** Feed the real `data/universe.json` through the assembled
prototype. Look for sub-niche clusters, and for neutron stars standing out.
State the fraction of nodes with unknown follower counts.

**Go criteria**

- At least two sub-niche clusters identifiable without labels.
- Gravity produces a visible difference between high- and low-engagement
  accounts of similar size.
- The render surfaces at least one connection or account that the flat list
  did not — cited by name.

**No-go signals:** everything looks the same; interesting accounts are visually
lost; feedback is "cool graphic" with no insight.

**Pivot if no-go:** revisit the gravity formula and visual encoding —
engagement alone may be insufficient; consider interconnectedness weighting or
a different spatial mapping.

**Output:** `docs/evidence/spike6-real-network.png` + a named-example go/no-go.

**Outcome:** _pending_

---

## Decision gate

1. **Does the data pipeline work?** Can the network be collected and scored
   without being blocked or over-spending? (Spikes 1, 6)
2. **Does the visualisation reveal structure?** Does real data teach something
   a sorted spreadsheet would not? (Spikes 2–6)

Both yes → build it. Data yes / visualisation no → consider a 2D network graph
or a designed static report. Visualisation yes / data fragile → decide whether
the scraping infrastructure is worth maintaining, or whether this is a
one-time analysis.
