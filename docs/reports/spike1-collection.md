# Spike 1 — Data Collection Feasibility: Report

Workstream A · 2026-09-10 · Repo: creator-universe

## BLUF

**FINAL COVERAGE (2026-09-10, budget raised to $45):** follower enrichment is
complete across ALL mapped nodes: **1050/1052 = 99.8%**. Private accounts are
enriched like any other — Instagram publishes the follower count for private
accounts (13 of our own paid rows carry private:true AND a numeric count), so
the earlier "skip private" instruction was reversed and 66 private accounts
were covered. Only 2 public handles returned no row (`filatovdl`,
`leevi.builds` — deleted, renamed, or now-nonexistent; recorded, not retried).
Seed: nick_saraev = **669,462 followers, tier 5 (Gas giant)**. Final
enrichment runs: inner-shell 127 ($0.1363), outer-shell 596 across 3 chunks
($0.6531), last 68 ($0.0681). Ledger total: **$2.0492 across 17 runs** — inside
the original $2.50 spike cap. Graph rebuilt, validator green,
`public/universe.json` byte-identical. The graph contract gained
`directed_degree` and `meta.nodes_unreachable_from_seed` from a parallel task;
regeneration preserves both.

**Conditionally GO.** The pipeline works end-to-end and the graph artefact is real:
1,052 nodes, 1,154 edges, 1 connected component, all contract invariants green.
Second-degree expansion succeeded without a block, and follower counts are
obtainable — proven on 261 nodes before the Apify billing cycle ran dry. The
one unmet criterion is follower coverage: **24.8%** of nodes have a follower
count, not the near-100% the method promises. The blocker is budget (cycle
exhausted, resets 2026-09-11), not the mechanism: the enrichment actor
delivered a usable numeric `followersCount` on **263/263 rows ever returned**
(5/5 probe, 258/258 recovered) before being cut off.

## Spike 1 criteria, quoted from `docs/SPIKES.md`

> **Go criteria**
> - Full seed list captured with no run failure and no block.
> - Second-degree expansion completes without a block.
> - Follower counts obtainable for the mapped node set within budget.
>
> **No-go signals**
> - Instagram blocks or rate-limits before the seed list completes.
> - Engagement/follower data is not visible without authentication.
> - Private-account share is so high (>40%) that the map has too many holes.

> **Output:** `data/universe.json` with ≥300 nodes and ≥400 edges, plus a cost
> ledger entry.

Verdict against each:

| Criterion | Verdict | Evidence |
|---|---|---|
| Full seed list captured | **GO** | nick_saraev's full list: **143 distinct handles** across 172 raw rows (the actor emitted 29 duplicate rows; distinct-handle count is the completeness measure, not row count). No run failure, no block. Note: the earlier assumption of ~174 follows was wrong — the real number is 143. |
| Second-degree expansion | **GO** | 7 lists scraped: 4 from the seed's own list (filatov.design, justyn.ai ×2, chase.h.ai, angus.sewell) + 3 external hubs added deliberately (marc.kaz, kerem.tech, steven.builds — none appear in the seed's list). All SUCCEEDED, no block, `max_count` cap held (200/200/200/200/198; steven.builds 84 = complete list). |
| Follower counts within budget | **PARTIAL** | 261 of 1,052 nodes (24.8%) have real `followersCount` values. The mechanism works (every profile row returned came back with a numeric count); the spend was cut by the billing-cycle limit mid-batch. |
| No-go: blocking | **Not applicable** | Per orchestrator steer: collection runs through Apify actors with their own unblocking; blocking is a non-issue. No block occurred anyway. |
| No-go: no data without auth | **GO** (cleared) | Profile details (bio, followers, posts) all visible without authentication via both probe actors. |
| No-go: private share >40% | **GO** (cleared) | Private-account share: **43 / 975 following rows = 4.4%**; 12 / 258 enriched profile rows = 4.7%. Far below the 40% hole threshold. |
| Output: ≥300 nodes, ≥400 edges | **GO** | 1,052 nodes, 1,154 edges, `data/universe.json` + identical `public/universe.json`, validated. |

## First-round actor choice superseded — why

Round 1 used `datadoping/instagram-following-scraper` ($0.0014/row) + planned
`coderx/instagram-profile-scraper-bio-posts` for counts. The orchestrator's
store assessment then found the same two-actor shape is correct (no actor
returns following rows WITH follower counts at base price — enriched modes all
cost more) but that a cheaper edge actor exists:

- **Edges:** `scraping_solutions/instagram-scraper-followers-following-no-cookies`, **$0.0007/row** Bronze (half of datadoping's $0.0014). Used for round-2 targets (marc.kaz, kerem.tech, steven.builds).
- **Counts:** probe ran BOTH `figue/instagram-profile-scraper` and `coderx/instagram-profile-scraper-bio-posts` on the same 5 handles. Both returned 5/5 rows with numeric `followersCount`. **Winner: coderx** — realized $0.0054 for the 5-profile run ($0.0011/profile, no observable start fee) vs figue's $0.0069 (~$0.0014/profile). Fields observed in coderx rows (real JSON): `id, username, fullName, biography, biography_with_entities, fbid, has_channel, highlight_reel_count, external_url, followersCount, followsCount, isBusinessAccount, is_professional_account, business_address_json, businessCategoryName, private, verified, should_show_public_contacts, is_joined_recently, has_clips, hide_like_and_view_counts, postsCount, latestPosts`.

Confirmed from real raw JSON: **following rows carry NO follower counts** (both
actors). Field list received from datadoping: `username, full_name,
following_of, is_private, is_verified, profile_pic_url, profile_pic_id, id,
fbid_v2, account_badges, is_favorite, has_anonymous_profile_picture,
latest_reel_media, third_party_downloads_enabled`. From scraping_solutions:
`username_scrape, type, id, username, full_name, is_private, is_verified,
profile_pic_url`.

## Real numbers

| Measure | Value |
|---|---|
| Nodes | **1,052** |
| Edges | **1,154** (source=follower, target=followee, mapped nodes only) |
| Connected components | **1** |
| Follower coverage | 261/1,052 known (**24.8%**); 791 null |
| Tiers among known | 6:Star 37 · 5:Gas giant 106 · 4:Planet 60 · 3:Dwarf 18 · 2:Moon 33 · 1:Asteroid 7 · null 791 |
| engagement_rate computed | **8 / 1,052** nodes (avg_likes/followers ratio, posts_observed ≥ 5; datalake's z-score deliberately NOT used; 0 handles had ratio > 1) |
| Private share (following rows) | 43/975 = **4.4%** |
| Private share (enriched profile rows) | 12/258 = 4.7% |
| **Ledger total** | **$1.1917** across 12 ledger rows (11 runs + 1 aborted) — under the $2.50 cap |

### Per-run duplicate rate (raw rows vs distinct handles)

| Owner | Actor | Rows | Distinct | Dup rate | Paid |
|---|---|---|---|---|---|
| nick_saraev (seed) | datadoping | 172 | 143 | **16.9%** | $0.1652 |
| filatov.design | datadoping | 5 | 5 | 0.0% (private account, near-empty) | $0.00 |
| justyn.ai | datadoping | 200 | 184 | 8.0% | $0.14 |
| justyn.ai (dup re-run — collector bug, fixed) | datadoping | 200 | 189 | 5.5% | $0.1708 |
| chase.h.ai | datadoping | 200 | 161 | **19.5%** | $0.2100 |
| angus.sewell | datadoping | 198 | 159 | **19.7%** | $0.2086 |
| marc.kaz | scraping_solutions | 200 | 200 | **0.0%** | $0.00* |
| kerem.tech | scraping_solutions | 200 | 200 | **0.0%** | $0.00* |
| steven.builds | scraping_solutions | 84 | 84 | **0.0%** | $0.00* |

Duplicate rate **varies by actor, not by account**: datadoping consistently
emits ~5–20% duplicate rows (16.9–19.7% on the big lists) — you pay for rows
that dedupe away, so its effective price per DISTINCT handle is closer to
$0.0016–0.0017, not $0.0014. The scraping_solutions actor emitted zero
duplicates across all three runs.

\* **Billing observation:** the three scraping_solutions runs reported
`usageTotalUsd: $0.0000` at poll time despite returning 484 rows. Either their
per-event billing settles outside `usageTotalUsd` or was covered by run budget;
the live balance did not drop further after those runs. Ledger records what the
API reported; treat their realized cost as ≥ $0 but verify on next cycle's
statement before relying on $0.0007/row.

### Cost observations

- ~17% of the seed run's paid rows bought nothing (29 duplicate rows of 172).
  On the two datadoping expansion runs the waste was ~19.5–19.7%.
- The 584-profile enrichment batch (`coderx`) was **ABORTED** by the billing
  cycle limit after 11 minutes, billing $0.2848 — but 258 profiles had already
  completed and the dataset was recovered via a free API read (no new spend).
  The ledger row for that run records `status: ABORTED`, 258 items.
- Unreconciled drift: the account's `monthlyUsageUsd` moved ~$2.47 more than
  the ledger-tracked event costs over the session. Most plausible cause is
  platform compute (memory-seconds) on long-running actor runs, which is
  included in `usageTotalUsd` of SUCCEEDED runs but appears to accrue/bill with
  delay. Check the next cycle statement before trusting per-run $ figures as
  the complete picture.

## Enrichment blocker

The final enrichment batch aborted with
`"Actor aborted. You've reached the maximum usage for your current billing
cycle"` after the account hit its $39 monthly cap (resets 2026-09-11). 258 of
the requested 584 profiles completed before the abort and were recovered via a
free dataset API read. Round-2's 379 new nodes were never enriched. **To finish
coverage after the reset:** `bun run collect -- --run` — the collector is
idempotent (skips owners already on disk, skips already-enriched handles) and
will enrich the remainder in 200-profile chunks sized to the live balance.

## Engagement join note

`docs/research/datalake_creators.json` is a read-only input. Its
`avg_engagement_score` is a trailing-baseline z-score, NOT a 0–1 rate — it was
NOT used as `engagement_rate`. Only a real ratio (`avg_likes / followers`,
both present, `followers > 0`, `posts_observed >= 5`, ratio ≤ 1) populated
`engagement_rate`: 8 nodes. Only 8 qualified because the datalake file
requires `posts_observed >= 5` and most of its 376 creators lack a real
follower count (32/376 observed). If more engagement coverage is wanted, the
field belongs upstream in datalake, not in this repo's contract.

## Commands used

```
bun run apify:budget                     # live balance (multiple times)
bun run collect -- --plan                # dry-run gate (verified: no run ids, no ledger rows)
bun run collect -- --probe               # 5-profile probe through both count actors
bun run collect -- --run                 # seed → expansion → (idempotent resume) → enrichment
bun run graph                            # data/universe.json + public/universe.json
bun run validate:universe                # contract guard
bun run validate:universe -- --file data/tmp/universe_broken.json   # negative test (node deleted from a copy) → FAIL exits 1
bun run collect -- --replay              # rebuild-from-raw verification, zero network
```

## Files

- `scripts/apify_budget.ts` — live balance check
- `scripts/collect.ts` — collector (`--plan` / `--run` / `--probe` / `--replay`)
- `scripts/build_graph.ts` — raw → universe transform + engagement join
- `scripts/validate_universe.ts` — contract guard (`--file` flag for scratch copies)
- `data/cost_ledger.json` — 12 rows, $1.1917 total
- `data/raw/apify/**` — 11 raw run files (as-observed)
- `data/universe.json` + `public/universe.json` — 1,052 nodes / 1,154 edges
## Correction — degree semantics, directed reachability, free enrichment (2026-09-10)

### What was wrong with `degree`

The producer wrote a **collection-round number**, not a hop distance: every
expansion root was set to 1 and anything discovered in the second round to 2.
`lib/types.ts` documents `degree` as "Shortest hop distance from the seed
account. Seed itself is 0." Measured against a real BFS, **467 of 1,052 nodes**
had a `degree` that did not match their true hop distance. Example:
`0xgligits` was stored as degree 1; its true distance from `nick_saraev` is 4.

### Undirected vs directed reachability

Fixing `degree` exposed a fact the artefact hid: BFS over **directed** follow
edges from the seed reaches only **584 of 1,052 nodes**. The "1 connected
component" figure was computed undirected and is misleading on its own. Cause:
`marc.kaz`, `kerem.tech` and `steven.builds` were added as deliberate EXTERNAL
hubs — accounts not in the seed's following list — so their 468 discovered
neighbours are not reachable by chaining follows from the seed at all.

### The fix (`scripts/build_graph.ts`)

- `degree` = true shortest hop distance from the seed, BFS over follow edges
  treated as UNDIRECTED (a follow relationship links two accounts in one
  network regardless of direction — the right semantics for a map). Seed = 0.
- `directed_degree` = new field, hop distance using ONLY directed follow edges
  (source → target), `null` when unreachable that way.
- `meta.nodes_unreachable_from_seed` = new meta field = count of null
  `directed_degree` = **468**.
- `meta.notes` records the BFS semantics and the unreachable count.

### New numbers (independently re-derived)

- Undirected distance histogram: `{0: 1, 1: 144, 2: 507, 3: 2, 4: 398}`
  (all 1,052 nodes reachable undirected — hence 1 component).
- Directed BFS reachable: **584** (unreachable: 468 = 1,052 − 584).
- `0xgligits`: degree 4 (was 1), directed_degree null.

All invariants re-verified after the change: 0 dangling edges, 0 duplicate
ids, all ids lowercase, 0 self-edges, `tier` consistent with `followers` for
every node, `in_network_followers` equal to actual edge in-degree for every
node. `bun run graph` + `bun run validate:universe` green;
`data/universe.json` and `public/universe.json` byte-identical (`cmp`).

### Free follower enrichment

`docs/research/datalake_creators.json` (read-only) holds 32 creators with
observed follower counts. Four graph nodes whose paid scrape left
`followers: null` were filled for free: `bywaviboy` = 195,035, `marc.kaz` =
114,556, `steven.builds` = 48,833, `kerem.tech` = 47,769. A paid observation
always wins — the free join only fills nulls. Count recorded in `meta.notes`.
No Apify actor was run; the ledger is unchanged at 12 rows.

### Enrichment priority order replaced

The old "in-network degree desc, handle asc" tiebreak collapsed to
alphabetical once nearly all nodes tied at in-degree 1 — coverage was an
alphabetical slice and the seed itself had no follower count. Replaced with a
deterministic selection order a future enrichment pass consumes (not
executed here): **seed first, then true `degree` ascending, then
`in_network_followers` descending, then handle ascending**. Head of the
order: `nick_saraev`, `brodyautomates`, `gregisenberg`, `jasoncooperson`, …

### What still needs a paid enrichment pass

787 of 1,052 nodes (74.8%) still have `followers: null`, including the seed
itself, and the seed's own 143 follows are barely covered. The new priority
order targets exactly that gap when budget allows.
