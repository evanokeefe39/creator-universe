# US-CU-1 — Following-list collection feasibility

- **Epic:** E-UNIVERSE
- **Spike:** Spike 1 — Data Collection Feasibility
- **Owner:** dlc-worker
- **Status:** Open

## Story

**As a** researcher building the niche map
**I want** to extract a seed account's following list with follower counts
**So that** I can prove the graph can be built before investing in the renderer.

## Acceptance criteria

- **AC1** — `bun run collect -- --plan` prints the projected node/row count and
  projected USD for the configured seed and second-degree targets, and makes
  **no** Apify API call.
- **AC2** — `bun run collect -- --run` produces `data/raw/apify/<actor>/<run_id>.json`
  with the raw, unmodified Apify dataset, plus a `data/cost_ledger.json` entry
  recording actor, run id, item count and cost.
- **AC3** — The full `nick_saraev` following list (expected ~174 accounts) is
  captured with no run failure and no actor-reported block.
- **AC4** — At least three second-degree expansions complete from accounts found
  in the seed list, proving expansion is not blocked.
- **AC5** — `data/universe.json` is produced with ≥300 unique nodes and ≥400
  edges, and every edge endpoint exists in `nodes`.
- **AC6** — Every node records `followers: number | null`; `null` is used when
  the enrichment did not cover that node. No count is estimated or defaulted.
- **AC7** — `bun run validate:universe` fails loudly on a dangling edge,
  duplicate node id, or a node count below the configured floor.

## Edge cases

- Seed account's following list is shorter or longer than expected.
- A second-degree target is private → actor returns zero rows; recorded, not
  crashed on.
- Apify run returns fewer rows than the requested cap (paging exhaustion).
- Duplicate handles across following lists with differing case
  (`Foo.Bar` vs `foo.bar`) → normalised to lowercase, deduped.
- Budget insufficient to enrich every unique node → enrichment covers a
  deterministic subset (by in-network degree, descending) and the remainder
  stay `null`.

## Definition of Done

- [ ] AC1–AC7 each demonstrated, with the command output or artefact linked
- [ ] `data/universe.json` regenerated from raw, and reproducible
- [ ] Cost ledger total recorded and under the declared budget
- [ ] Validation script rejects each of the three failure modes (tested by
      deliberately corrupting a scratch copy)
- [ ] `LEARNINGS.md` updated with any cost/model discovery

## Tests

`scripts/validate_universe.ts` — referential integrity + floor checks.
Integration: run the collector against already-downloaded raw artefacts
(replay mode) and assert identical output.
