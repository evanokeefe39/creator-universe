# US-CU-6 — Real-data smoke test and POC

- **Epic:** E-UNIVERSE
- **Spike:** Spike 6 — Real Data Smoke Test
- **Owner:** ux-worker (render) + dlc-worker (data)
- **Status:** Open

## Story

**As a** decision-maker evaluating this idea
**I want** the real collected network rendered in the full prototype
**So that** I can judge whether it reveals structure a spreadsheet would not.

## Acceptance criteria

- **AC1** — The prototype reads `data/universe.json` — the real artefact from
  US-CU-1 — with no mock data present in the served bundle.
- **AC2** — A screenshot of the real network at mid zoom is committed, with at
  least two sub-niche groupings visually separable without labels.
- **AC3** — A screenshot of a selected high-degree node shows the detail panel
  populated from real fields.
- **AC4** — The "unknown followers" path is exercised on real data and is
  visible in the evidence: the fraction of nodes with `followers: null` is
  printed and stated.
- **AC5** — A written go/no-go answers: does the render reveal a connection or
  an account that a sorted follower list would not surface? The answer is
  grounded in at least one named example node from the real data.

## Edge cases

- Nodes with `followers: null` must not be rendered as zero-sized or invisible.
- A tier with zero members in the real data — the filters and legend must
  reflect that honestly.
- Private accounts returned by the following scrape — displayed as private,
  not dropped silently.

## Definition of Done

- [ ] `docs/evidence/spike6-real-network.png` committed
- [ ] Null-follower fraction stated in `docs/SPIKES.md`
- [ ] Named example account(s) cited as evidence for the go/no-go
- [ ] `bun run check` green on the POC branch
- [ ] POC runs locally from a clean checkout with documented commands

## Tests

`lib/data.test.ts` — the loader rejects a `universe.json` that fails the
contract (dangling edge, missing meta, wrong tier range); a smoke test renders
the real artefact and asserts the node count matches the file.
