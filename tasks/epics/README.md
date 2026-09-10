# Epics & User Stories registry

Canonical store for Epics and User Stories in `creator-universe`. One
directory per epic, stories under `tasks/epics/<epic_slug>/user-stories/`.

## Conventions

- **Canonical ownership: one User Story → one Epic (many-to-one).** Cross-epic
  relevance is a `relates-to` link, never a second copy.
- **Git tracking:** only `tasks/epics/` is committed (`.gitignore` ignores the
  rest of `tasks/`). Epics/stories are review-and-change governance content;
  `tasks/plans/` and scratch notes stay untracked.
- Every story carries: As-a/I-want/So-that, binary acceptance criteria, a DoD
  checklist, and the named test or measurement that proves it.

## Registry

| Epic (dir) | ID | Theme | Status | Owner | Depends on | Source of truth |
|---|---|---|---|---|---|---|
| [`creator-universe`](creator-universe/epic.md) | E-UNIVERSE | Apify follow-graph collection → 3D niche network renderer → POC | Active (spike) | dlc-worker / sdlc-worker / ux-worker | — | `docs/SPEC.md`, `docs/SPIKES.md` |

## Story index

| Story | Title | Spike | Status |
|---|---|---|---|
| [US-CU-1](creator-universe/user-stories/us-cu-1-collection-feasibility.md) | Following-list collection feasibility | Spike 1 | Open |
| [US-CU-2](creator-universe/user-stories/us-cu-2-force-layout.md) | Force-directed layout at target scale | Spike 2 | Open |
| [US-CU-3](creator-universe/user-stories/us-cu-3-low-poly-aesthetic.md) | Low-poly celestial aesthetic | Spike 3 | Open |
| [US-CU-4](creator-universe/user-stories/us-cu-4-zoom-labels.md) | Zoom transition and label density | Spike 4 | Open |
| [US-CU-5](creator-universe/user-stories/us-cu-5-hud-overlay.md) | HUD overlay and raycast selection | Spike 5 | Open |
| [US-CU-6](creator-universe/user-stories/us-cu-6-real-data-smoke.md) | Real-data smoke test and POC | Spike 6 | Open |
