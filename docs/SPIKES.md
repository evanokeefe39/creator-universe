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

> **Note on the blocking assumption (2026-09-10).** Instagram blocking is *not*
> a live risk for this pipeline: collection runs through Apify's actors, which
> carry their own proxy and unblocking infrastructure rather than issuing our
> requests directly. The original "Instagram blocks or rate-limits" no-go
> signal is therefore retired. It is replaced by the signals below, which are
> what actually decide whether the map is usable — completeness of the
> returned list, and the share of private accounts that leaves holes.

**Go criteria**

- Following rows returned match the seed's real following count — the actor
  returns the complete list, not a truncated page.
- Second-degree expansion returns usable rows for the chosen mid-tier targets.
- Follower counts obtainable for the mapped node set within budget.
- Private-account share recorded and low enough that the map is informative.

**No-go signals**

- The following actor truncates the seed list without a way to page further.
- Second-degree targets return empty results.
- Follower coverage so low that tiering is meaningless.
- Private-account share so high (>40%) that the map has too many holes.

**Output:** `data/universe.json` with ≥300 nodes and ≥400 edges, plus a cost
ledger entry.

**Outcome: GO.** The pipeline works end to end. 143 distinct handles recovered
from the seed's 172 paid rows; seven second-degree expansions completed; the
artefact carries 1052 nodes and 1154 edges and passes every contract invariant.
Private-account share 4.4%, so the retired blocking signal is replaced by list
completeness, which holds. Total cost $2.05 across 17 runs.

Follower coverage is **1050/1052 (99.8%)**. The only two unknowns are
`filatovdl` and `leevi.builds`, both deleted accounts — an honest hole, not a
collection failure. Coverage was reached in three passes, and two of them were
defective before they were corrected: the first was cut off by the Apify cycle
limit mid-run, and its priority order had collapsed to alphabetical because
every node tied at in-network degree 1, which left the seed itself without a
follower count and its own follows at 3% covered. A second pass covered the
seed and its first-degree orbit; the third covered every remaining node.

Two corrections worth recording, both caught by checking claims against the raw
data rather than trusting them. Private accounts were skipped as
"unscrapeable" — false: Instagram publishes follower counts for private
accounts, and our own paid rows prove it (13 rows carry both `private: true`
and a numeric `followersCount`). Enriching them took coverage from 93.7% to
99.8% for $0.07.

Structural note: the graph is connected only undirected. BFS over directed
follow edges from the seed reaches 584 of 1052 nodes, because three expansion
hubs sit outside the seed's own following list.
`meta.nodes_unreachable_from_seed` records the 468 satellites.

Evidence: `docs/reports/spike1-collection.md`, `data/universe.json`,
`data/cost_ledger.json`.

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

**Outcome: GO.** Synthetic 301-node layout converges in 1.42–1.56 s (301 ticks,
charge −30 vs −140), inside the 5 s criterion, with the two parameter settings
producing visibly different arrangements. A deterministic seed plus a
localStorage position cache makes the universe stable across reloads. The real
1052-node graph converges in 6.7 s synchronously — over the criterion, but the
cost is paid once because positions are cached, and a worker thread would clear
it. No hairball and no oscillation at either scale.

Evidence: `docs/evidence/spike2-layout.png`,
`docs/evidence/spike2-params.png`.

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

**Outcome: GO.** All six tiers render at their exact requested triangle counts
— 320 / 160 / 80 / 20 / 8 / 4 — flat-shaded in the muted palette on a dark
ground, and read apart by silhouette at mid zoom without colour. Lighting
choice: ambient + directional. A single directional light left the 4- and
8-face tiers fully black on their unlit faces, so the ambient term is what
keeps the lowest tiers legible — exactly the failure mode this spike existed to
catch.

Correction found during orchestrator verification: the first submitted
implementation computed icosahedron faces as `20·4^d`, wrong from detail 2
onward (three.js subdivides each triangle into `(d+1)²`, giving 20/80/180/320).
Stars therefore rendered at 180 faces and the decimation step was a silent
no-op. Fixed to `20·(d+1)²`; T6 now reaches 320 at detail 3. The report's
"achieved 320" claim was false when written — the live page said 180.

Evidence: `docs/evidence/spike3-tier-grid.png`,
`docs/evidence/spike3-tier-grid-directional.png`.

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

**Outcome: GO, with one open gap.** A single continuous zoom scalar drives three
semantic levels; labels, body scale and edge opacity all lerp off it. Measured
label counts 30 / 30 / 1 at close / mid / far with the cap enforced in code and
never exceeded. 35 fps during the transition under software GL in a headless
browser, so the 30 fps criterion passes conservatively — a GPU machine will be
materially higher.

Open gap: the cap bounds label COUNT, not collisions. Labels still overlap
inside the dense core at close zoom, which needs a priority/offset pass before
this is presentable to someone who does not already know the niche.

Evidence: `docs/evidence/spike4-zoom-close.png`,
`docs/evidence/spike4-zoom-mid.png`, `docs/evidence/spike4-zoom-far.png`.

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

**Outcome: GO.** Verified by driving the live page, not by assertion. Searching
`chase.h.ai` selects exactly it and populates the panel with real values —
232,975 followers, 0.53% engagement, gravity 1,227, T5 gas giant, degree 1,
in-network following 161, verified. Tier filters are arithmetically correct
against the final tier counts: T5 off gives 755 = 1052 − 297 and T6 off gives
980 = 1052 − 72, and both restore to 1052. (The 980 figure is the one the
screenshot run asserts.) A node with no follower count renders every derived
field as "unknown" with the note "Follower count not collected — body sized
from in-network links", rather than substituting zero.

Integration is clean — one authoritative selection state, no console errors on
load.

Evidence: `docs/evidence/spike5-selected.png`,
`docs/evidence/spike5-filtered.png`.

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

**Outcome: PENDING — technical criteria met; the discovery judgement is the
user's.** The prototype reads the real `data/universe.json` and renders 1052
real bodies with no mock data in the served path; real handles appear in the
scene and the detail panel returns real measured values.

What the spike actually asks — does this reveal a connection or an account a
sorted follower list would not — needs a human who knows the niche to look at
it. That call is the user's, not the pipeline's.

The limitation that blocks a clean verdict is NOT coverage — every node carries
a follower count except two deleted accounts, so tiering applies across the
whole map. It is **size encoding**. Body radius is driven by gravity
(followers × engagement), and engagement exists for only 8 of 1052 nodes, so
1044 nodes fall back to a near-constant radius derived from in-network links.
The result inverts the picture: `mrbeast` (89.4M followers) renders at radius
0.76 while `angus.sewell` (159k) renders at 2.62, and the largest bodies on
screen are the eight accounts whose following lists were scraped, because the
fallback rewards in-network following. Nothing currently encodes audience.

That must be fixed before the visualisation can be judged as a discovery tool:
size from `log10(followers)` (available for 99.8% of nodes) with engagement
modulating within that band, rather than engagement gating size entirely.

Evidence: the live page at `http://127.0.0.1:3111/` and
`docs/reports/spike2-5-visual.md`.

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
