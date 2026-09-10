# Epic E-UNIVERSE — Creator Universe niche network discovery

- **Theme:** Niche creator discovery & network visualization
- **Owner:** dlc-worker (collection) / sdlc-worker (app) / ux-worker (renderer)
- **Status:** Active (spike phase)
- **Depends on:** external — Apify account (shared with `~/repos/datalake`)
- **Feeds:** nothing yet; this is the origin epic

## Outcome

A runnable instrument that answers: *who are the high-authority accounts in a
niche that a follower-count search would not surface?*

The mechanism: take a large creator as seed, pull their following list (a
hand-curated directory of their niche), expand one degree into a handful of
mid-tier accounts in that list, and assemble a follow graph. Render the graph
as an interactive 3D field where follower count drives body size and in-network
connections drive position, so structure and authority become legible at a
glance instead of requiring a spreadsheet.

## Hypothesis under test

A creator with 100k+ followers typically follows a small number of accounts
(0–1000). That list is therefore *curated*, not incidental. Expanding it one
degree yields a broad mix of 100k+, 10k–100k, 1k–10k and sub-1k accounts that
are demonstrably connected inside the niche — which is exactly the set that
plain follower-count ranking cannot find.

## Scope highlights

- Cost-capped Apify collection (following lists as edges; profile details for
  follower counts), with a `--plan` gate and a written cost ledger.
- Deterministic graph artefact `data/universe.json` — the app's only data
  contract, validated before publish (node count, edge referential integrity,
  null-rate).
- Force-directed 3D layout (`d3-force-3d`) with cached settled positions so the
  universe is stable between sessions.
- Low-poly faceted celestial rendering in Three.js — no glow, no bloom, no
  textures; hierarchy read from silhouette alone.
- Continuous zoom across three semantic levels (system → cluster → map) with
  label density control.
- HTML/CSS HUD over the canvas with raycast selection, tier filters, search.

## Out of scope (explicitly deferred)

- Temporal tracking / replay of universe growth.
- Automated sub-niche classification from bio or content.
- Multi-platform sources (TikTok, YouTube, LinkedIn).
- Mobile/touch-first layout design.
- Posting to a public host; the POC runs locally.

## Source of truth

- Product spec: `docs/SPEC.md`
- Spike plan and go/no-go criteria: `docs/SPIKES.md`

## Epic DoD

- [ ] All six spikes have a recorded go/no-go outcome with evidence
- [ ] `data/universe.json` published and passing its validation script
- [ ] The POC renders the real collected network in a browser, verified by
      screenshot, not by assertion
- [ ] Cost ledger total is within the declared Apify budget
- [ ] No spike claim in `docs/SPIKES.md` lacks a linked artefact
