# US-CU-5 — HUD overlay and raycast selection

- **Epic:** E-UNIVERSE
- **Spike:** Spike 5 — HUD Overlay Integration
- **Owner:** ux-worker
- **Status:** Open

## Story

**As a** viewer
**I want** a readable instrument panel over the scene that responds to what I
select
**So that** I can interrogate a creator without leaving the map.

## Acceptance criteria

- **AC1** — An HTML/CSS HUD renders over the WebGL canvas with one detail
  panel, one tier filter, and one search input, in the constrained register
  (hairline borders, semi-transparent dark fills, monospace/tight sans, one
  accent colour for interactive state).
- **AC2** — Clicking a rendered node selects it and populates the detail panel
  with handle, followers (or an explicit "unknown"), engagement rate (or
  "unknown"), gravity score, tier, in-network follower count and degree.
- **AC3** — Clicking empty space deselects; clicking an opaque HUD element does
  **not** reach the canvas; clicking through a transparent HUD region **does**.
- **AC4** — Orbiting and zooming the camera still works with the HUD present —
  dragging on the canvas rotates, dragging on a HUD panel does not.
- **AC5** — A tier filter toggle adds/removes that tier from the scene, and the
  node count in the HUD updates to reflect what is rendered.

## Edge cases

- Selected node filtered out of the scene → selection clears, panel does not
  show a phantom.
- Node with `followers: null` → panel states "unknown"; the body renders at the
  size implied by in-network degree, and the two are visually consistent.
- Search with no matches → explicit empty state, not a silent no-op.
- Window resize with the HUD open → panel stays anchored and the canvas
  remeasures.

## Definition of Done

- [ ] Screenshot of a node selected with the detail panel populated
- [ ] Screenshot of the filter applied with the count changed
- [ ] Interaction notes recorded in `docs/SPIKES.md`
- [ ] HUD state kept in one place — scene state and HUD state not duplicated
- [ ] Go/no-go recorded

## Tests

`components/hud.test.tsx` — selection→panel field mapping, including the
`null` cases; filter→visible-count derivation.
