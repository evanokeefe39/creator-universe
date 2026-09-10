# Niche candidates — second-degree expansion and neutron-star calls

> BLUF: **376** datalake creators classify into the AI/dev/tech or UI-UX/design
> niche; only **32 of them carry a real observed follower count** (58 observation
> rows across 50 profiles). The overlap file is therefore rich in *engagement*
> and *topic* signal and thin in *size* signal. Use the engagement-ranked list
> below to pick expansion targets; do not build a gravity field from it alone.

Source: `datalake@649eafd9abe3d1ca4c71475cf4491cf6944c6302`. Every figure below
is reproducible from `queries.md`.

## Method and confidence

Niche assignment is a **keyword heuristic**: each owner's `gold_topic` labels
(the enrichment model's topic strings) plus the handle string are matched
against two curated keyword lists. It is not a human taxonomy and it is not the
model's own `gold_domain`.

- **Confidence: medium.** The topic labels themselves are LLM-generated and
  already somewhat noisy (e.g. `aitickerdaily` carries both `Humanoid Robots`
  and `AI-assisted programming`). Overlap is common — 122 accounts match both
  lists — which is honest for this niche but means the lists are not
  mutually exclusive.
- **What is ground truth:** `followers`, `follows`, `is_verified` (real
  observations from `silver_ig_profile_observations`), and `posts_observed` /
  `avg_likes` / `avg_engagement_score` (real aggregates over scraped posts).
- **What is a heuristic:** `niches`, and `dominant_domain` (a model label, not
  a warehouse dimension).

## The overlap, in numbers

| Metric | Count |
|---|---|
| Creators in the lake (post rollup) | 692 |
| Classified into a niche by the heuristic | **376** |
| — AI / dev / tech | 295 |
| — UI-UX / design | 203 |
| — both | 122 |
| With a **real observed** follower count | **32** |
| Tracked in the datalake scrape rotation | 371 |
| Genuinely observed follower rows (whole warehouse) | 58 |
| Distinct profiles those rows cover | 50 |

All 58 observation rows were taken between 2026-06-30 and 2026-09-01. The
warehouse does not hold a follower count for `nick_saraev` itself.

## Second-degree expansion targets

A good expansion target is a **mid-tier account (1k-300k followers or a high
scraped-post volume) whose following list is likely to point at authority
accounts the seed's own list misses**. Ranked by the strength of the signal we
actually hold:

### 1. `chase.h.ai` — 229,261 followers, 152 posts, avg 1,207 likes
Topic fingerprint is dense and singular: `Claude AI` (74), `Claude Code` (27),
`AI Agents` (5), `AI Coding Assistants` (3). This is a *Claude-ecosystem
specialist* with 229k followers — its following list is a near-direct directory
of the AI-coding-agent niche, which is exactly the seed's neighbourhood
(`nick_saraev` posts `Claude Code` and `AI Coding Assistants`). Highest
signal-to-noise of any mid-tier candidate here.

### 2. `angus.sewell` — 144,603 followers, 113 posts, avg 4,274 likes
Topics: `AI Agents` (10), `AI Prompts` (9), `AI Trends`, `AI Coding`. Broader
than `chase.h.ai` and 4x the per-post engagement — a broadcast account whose
follows should cover the AI-agent tier rather than one vendor's orbit.

### 3. `marc.kaz` — 114,556 followers, 151 posts, avg 3,557 likes
Topics: `AI Agents` (12), `Autonomous Agents`, `AI Coding Agents`, plus
`AI Video Generation`. Agent-focused with strong engagement. Sits at the
boundary between the AI-coding and AI-video sub-niches, so expanding it should
bridge two clusters the seed alone would not connect.

### 4. `aitickerdaily` — 32,969 followers, 186 posts, avg 526 likes
The **strongest neutron-star candidate in the warehouse**: smallest follower
count of any high-volume AI account, yet the highest mean engagement score in
the entire lake (26.10 vs 0.22 for the 4.8M-follower `evolving.ai`). 186 scraped
posts. Its in-warehouse authority is far out of proportion to its size — the
exact phenomenon the project exists to find. Expand it, and flag it as a
Spike 6 named example.

### 5. `kerem.tech` — 47,769 followers, 82 posts, avg 1,503 likes
A different axis: `Penetration Testing`, `OSINT`, `Network Ports`, `Weekly
Threat Intelligence`. Security-inflected tech, not AI-circle generalist.
Expanding it reaches a dev/security pocket the seed's AI-video following list
is unlikely to contain — useful for testing whether the niche is one cluster or
several.

**Honourable mentions.** `steven.builds` (48,833 followers, 60 posts, 948
likes; `Lead Generation`, `Mobile App Development`) and `starter_story`
(342,681 followers, 91 posts; `Indie Hacking`, `App Development`, momentum
2.18) both sit squarely in the indie-hacker quarter and have high enough volume
to expand cheaply.

## Neutron stars — small accounts with disproportionate in-warehouse pull

The project thesis is that follower count hides authority. In this warehouse
the strongest counter-example to follower-count ranking is:

| Handle | Followers | Posts | Avg likes | Engagement score | Read |
|---|---|---|---|---|---|
| `aitickerdaily` | 32,969 | 186 | 526.3 | **26.10** | Highest engagement in the lake at 0.7% of `evolving.ai`'s audience |
| `ceozac` | 87,664 | 55 | 344.8 | **3.75** | Instagram-growth operator; punches far above its 87k band |
| `londonthefriend` | 22,528 | 84 | 755.0 | **2.32** | 22k followers, 755 avg likes — a ~3.3% like rate |
| `steven.builds` | 48,833 | 60 | 947.8 | **1.90** | Indie-builder, near-2% like rate at 49k |
| `howtogofreelance` | 19,321 | 96 | 546.9 | **1.06** | Smallest of the strong five; consistent operator |

For contrast, the largest accounts in the overlap are diffuse: `evolving.ai`
(4,758,399 followers) scores **0.22**, and `sabrina_ramonov` (1,053,501) scores
**0.48**. The size-engagement inversion is visible inside this one warehouse,
which is a direct, named argument for the gravity model.

## Caveats the renderer must respect

- **344 of 376 classified creators have `followers: null`.** The HUD must show
  them as unknown and drive their body size from in-network degree, per the
  `lib/types.ts` contract. Do not substitute zero.
- **The observation window is narrow** (June-September 2026) and mostly a single
  snapshot per handle. Treat follower counts as one point in time.
- **`nick_saraev` has no datalake follower count** (verified: 0 rows in
  `silver_ig_profile_observations`). The seed node's size must come from the
  creator-universe scrape.
- **`posts_observed` is scrape coverage, not the account's lifetime output.**
  Two accounts (`techwitharia`, `thehustledaily`) show 1 post each yet carry
  observed follower counts over 100k — their averages are not meaningful.
- **`avg_likes` can be negative on tiny samples** (`arianeanusbigian`: 1 post,
  -1.0) because trailing-baseline z-scores can go below zero. Filter by
  `posts_observed` before quoting an average.
