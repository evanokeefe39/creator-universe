# US-CU-3 — Low-poly celestial aesthetic

- **Epic:** E-UNIVERSE
- **Spike:** Spike 3 — Low-Poly Aesthetic Validation
- **Owner:** ux-worker
- **Status:** Open

## Story

**As a** viewer
**I want** each tier rendered as a distinct faceted solid that reads as
intentional art direction
**So that** I can identify an account's tier from silhouette without reading a
label.

## Acceptance criteria

- **AC1** — Six tiers render as procedural icosahedra with face counts
  ~320 / ~160 / ~80 / ~20 / ~8 / ~4, flat-shaded, in the constrained palette
  (slate blue, dusty terracotta, sage, warm grey, muted amber) with no
  textures, no bloom, no glow, no rim light.
- **AC2** — All six tiers are distinguishable by silhouette at mid zoom in a
  single screenshot.
- **AC3** — The two lowest tiers (moon, asteroid) read as intentional at mid
  and far zoom, not as rendering errors — judged from the screenshot.
- **AC4** — Two lighting setups are compared (single directional vs
  ambient+directional) and the chosen one is recorded with the reason.
- **AC5** — A screenshot grid shows all six tiers at close, mid and far zoom.

## Edge cases

- Object at the smallest face count seen against a dark background — must not
  disappear entirely.
- A tier with no nodes present in the data — the grid must say so, not render
  a blank tile silently.

## Definition of Done

- [ ] `docs/evidence/spike3-tier-grid.png` committed
- [ ] Lighting decision recorded in `docs/SPIKES.md` with reasoning
- [ ] Palette values written as named constants in one module, not inlined
- [ ] Go/no-go recorded; if no-go, the 2D-circle pivot is described

## Tests

`lib/geometry.test.ts` — face count per tier is exactly the specified value;
geometry is deterministic for a given tier (no random jitter by default).
