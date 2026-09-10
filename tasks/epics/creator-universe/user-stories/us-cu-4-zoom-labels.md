# US-CU-4 — Zoom transition and label density

- **Epic:** E-UNIVERSE
- **Spike:** Spike 4 — Zoom Transition and Label Density
- **Owner:** ux-worker
- **Status:** Open

## Story

**As a** viewer
**I want** to move continuously between system, cluster and map views
**So that** I can read both an individual creator and the niche's topology
without a jarring mode switch.

## Acceptance criteria

- **AC1** — Three semantic zoom levels are implemented over one continuous
  scale: **system** (individual geometry, handles visible), **cluster**
  (objects collapse toward dots, sub-niche groupings visible), **map** (named
  regions, density).
- **AC2** — A full zoom from closest to furthest and back is recorded; the
  motion has no visible pop, no frame where the scene is empty, and no
  uncanny middle band where objects are too small to read but too large to
  abstract.
- **AC3** — At no zoom level are more than ~30 labels rendered simultaneously;
  the label budget is enforced in code, not by hand-tuning.
- **AC4** — Cluster structure remains readable at mid zoom with labels off.
- **AC5** — Frame rate stays at or above 30 fps during the zoom transition,
  measured over the recorded run on the dev machine.

## Edge cases

- Worst-case cluster: 15+ nodes in a tight group — labels must degrade
  gracefully (priority, not overlap).
- Zooming while a node is selected — selection must persist and the camera
  must not fight the user.
- Only one node in a "cluster" — no phantom cluster label.
- Extremely long handles — truncation rule rather than layout breakage.

## Definition of Done

- [ ] Screen recording or frame-sequence committed under `docs/evidence/`
- [ ] Max simultaneous label count measured and printed in dev overlay
- [ ] Frame-rate measurement recorded with machine spec
- [ ] Go/no-go recorded; continuous vs discrete-zoom decision justified

## Tests

`lib/zoom.test.ts` — label budget function never exceeds the cap for any zoom
value; zoom→level mapping is monotonic; cluster label suppression below the
minimum member count.
