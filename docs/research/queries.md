# Queries — datalake niche extraction (Workstream C)

All queries run from `C:/Users/evano/repos/datalake` against `data/state.duckdb`
(opened with `duckdb.connect(path, read_only=True)`) and `data/ops.sqlite`
(opened with sqlite3 URI `file:data/ops.sqlite?mode=ro`). Every number in
`datalake_creators.json` and `niche-candidates.md` traces to one of these.

Source: `datalake@649eafd9abe3d1ca4c71475cf4491cf6944c6302` (branch `main`).

---

## Q0 — Schema verification

```sql
SELECT table_name, table_type FROM information_schema.tables ORDER BY 1;
DESCRIBE silver_ig_profile_observations;
DESCRIBE v_creator_profile;
DESCRIBE v_creator_topics;
DESCRIBE dim_profile;
```

Result: every object named in the brief exists. `silver_ig_profile_observations`
has columns `(owner_id, owner_username, observed_at, followers_count,
follows_count, posts_count, is_verified, source_dataset)` — exactly as described.
`v_creator_profile` exposes `total_posts, standout_count, hot_count, avg_likes,
max_likes, avg_engagement_score, dominant_domain, dominant_domain_posts,
recent_avg, recent_posts, baseline_avg, baseline_posts, momentum_ratio,
is_rising`. `v_creator_topics` exposes `(creator_id, topic, post_count,
perf_score, perf_rank, count_rank)`. No schema surprises.

## Q1 — Row counts (the real numbers)

```sql
SELECT COUNT(*) AS posts,
       COUNT(DISTINCT owner_username) AS owners
FROM silver_ig_posts;
-- 10038 posts, 692 owners

SELECT COUNT(*) FROM gold_analyses;          -- 9576
SELECT COUNT(*) FROM ig_post_labels;         -- 10038
SELECT COUNT(*) FROM dim_profile WHERE is_current;   -- 624
SELECT COUNT(*) FROM v_creator_profile;      -- 624
SELECT COUNT(*) FROM v_post_metrics;         -- 10038
```

### The observation table is thin — state it plainly

```sql
SELECT COUNT(*) FROM silver_ig_profile_observations;
-- 58 rows

SELECT COUNT(DISTINCT owner_username)
FROM silver_ig_profile_observations;
-- 50 distinct profiles

SELECT MIN(observed_at), MAX(observed_at)
FROM silver_ig_profile_observations;
-- 2026-06-30 .. 2026-09-01 (Europe/Berlin)
```

58 rows across 50 profiles — **not** the ~58 profiles the brief anticipated.
Only 50 distinct accounts in the whole warehouse carry a genuinely observed
follower count, and every one of them was observed between 2026-06-30 and
2026-09-01. The `followers` field in `datalake_creators.json` is populated for
**32** of the 376 classified creators, and is `null` for the other 344.

## Q2 — Per-owner post rollup (feeds `posts_observed`, `avg_likes`, `avg_engagement_score`, `standout_count`)

```sql
SELECT pm.owner_username,
       MAX(pm.creator_id)            AS creator_id,
       COUNT(*)                      AS posts_observed,
       AVG(pm.likes_count)           AS avg_likes,
       AVG(pm.engagement_score)      AS avg_engagement_score,
       SUM(pm.is_standout)           AS standout_count,
       SUM(pm.is_hot)                AS hot_count
FROM v_post_metrics pm
WHERE pm.owner_username IS NOT NULL
GROUP BY 1;
```

Grain: one row per `owner_username` (692 rows). This is the gate-free activity
rollup — every scraped account appears, not just the enriched ones.

## Q3 — Dominant domain (feeds `dominant_domain`)

```sql
SELECT creator_id, creator_name, total_posts, avg_likes,
       avg_engagement_score, dominant_domain, momentum_ratio, is_rising
FROM v_creator_profile;
```

`dominant_domain` is the most frequent `gold_domain` over the creator's
enriched posts (ties broken alphabetically) — defined in
`src/datalake/defs/serving/assets.py` (`v_creator_profile`). It is a model
label from the enrichment pass, not a human taxonomy.

## Q4 — Topics per owner (feeds niche classification and `top_topics`)

```sql
SELECT pm.owner_username, pd.gold_topic, COUNT(*) AS c
FROM v_post_metrics pm
JOIN v_post_detail pd ON pd.post_id = pm.post_id
WHERE pm.owner_username IS NOT NULL
  AND pd.gold_topic IS NOT NULL
GROUP BY 1, 2;
```

677 of 692 owners have at least one gold topic label. `gold_topic` is extracted
from `gold_analyses.result_json ->> '$.topic'` (with a `$[0].topic` array
fallback) in `v_post_detail`.

## Q5 — Real observed follower counts (feeds `followers`, `follows`, `is_verified`, `follower_observed_at`)

```sql
SELECT owner_username,
       MAX(followers_count) AS followers,
       MAX(follows_count)   AS follows,
       MAX(posts_count)     AS observed_post_count,
       MAX(is_verified)     AS is_verified,
       MIN(observed_at)     AS first_observed,
       MAX(observed_at)     AS last_observed
FROM silver_ig_profile_observations
GROUP BY 1
ORDER BY followers DESC;
```

50 rows. `followers` is the max observed count for that handle — a **real
number**, never estimated. Where a profile has multiple observations the max is
taken (a single snapshot per handle is typical; only `vinny_creative`(5),
`bywaviboy`(3), `advanceddesign`(2) and `aiconsumer`(2) have more than one).

## Q6 — Tracked profiles (feeds `tracked`)

```sql
-- sqlite3, read-only URI
SELECT handle, enabled, tier, creator_id
FROM profiles;
-- 675 rows, all enabled=1, all tier='tier1'
```

675 tracked IG profiles in `ops.sqlite`. `tracked: true` means the handle is in
the datalake's scrape rotation (`profiles.enabled = 1`). This does **not** mean
follower data exists for it — see Q1.

## Q7 — The seed account

```sql
SELECT * FROM v_creator_profile
WHERE creator_name ILIKE '%saraev%';
-- creator_id=104, nick_saraev, 101 posts, 16 standouts, 14 hot,
-- avg_likes=7657.80, avg_engagement_score=0.1983, dominant_domain='Tech',
-- momentum_ratio=0.312, is_rising=False

SELECT * FROM silver_ig_profile_observations
WHERE owner_username ILIKE '%saraev%';
-- 0 rows. No follower observation exists for the seed.
```

`nick_saraev` **is** in the warehouse (101 posts, avg 7,658 likes, dominant
domain `Tech`) and **is** tracked (`profiles.enabled=1`). It has **no observed
follower count** — the seed's own follower number must come from the creator-
universe scrape, not from the datalake.

## Q8 — Niche classification (the method, in Python)

Classification is a keyword heuristic over each owner's `gold_topic` labels
plus the handle string, against two curated lists (`AI_KW`, `UI_KW` in the
generator). It is **not** ground truth — see `niche-candidates.md` for the
confidence statement.

```python
AI_KW = [" ai ","ai agent","artificial","gpt","llm","prompt","machine learning",
         "neural","robot","automation","claude","openai","anthropic","gemini",
         "midjourney","copilot","cursor","hugging","diffusion"," rag","langchain",
         "n8n","zapier","saas","developer","coding","programmer","software",
         "engineer","python","javascript","typescript","react","frontend",
         "backend","fullstack","docker","kubernetes","cloud","sql","data science",
         "analytics","indie","hacker","founder","startup","buildinpublic","nocode",
         "no-code","vibe cod","tech","gadget","ios","android","linux","open source",
         "opensource","github","cli"," notio","api","app develop","app build",
         "web develop","web design"]
UI_KW = ["ui","ux","design","figma","typography","visual","graphic","illustrat",
         "motion","animation","layout","prototyp","css","tailwind","framer",
         "webflow","poster","icon","logo","art direction","creative director",
         "visual design","interaction design","product designer","design system",
         "svg","print"]

def classify(handle):
    blob = " " + " ".join(topic_labels_for(handle)).lower() + " " + handle.lower() + " "
    return ([k for k in AI_KW if k in blob], [k for k in UI_KW if k in blob])
```

Yields **376** creators: 173 AI-only, 81 UI-only, 122 in both.

## Q9 — Neutron-star ranking (low followers, high engagement)

```sql
-- illustrated; full table is in datalake_creators.json
SELECT owner_username, COUNT(*) posts, AVG(likes_count) avg_likes,
       AVG(engagement_score) avg_es
FROM v_post_metrics
WHERE owner_username IS NOT NULL
GROUP BY 1
ORDER BY avg_es DESC;
```

Join the result against Q5's observed follower counts. Only accounts with a
real `followers` value qualify for a gravity statement; the rest are ranked by
in-warehouse engagement alone.

---

## Reproduction

The generator that wrote `datalake_creators.json` is a single throwaway Python
script (`cu_extract.py`, staged in the OS temp dir at run time, not committed
to either repo). It opens both databases read-only, performs Q1/Q2/Q4/Q5/Q6
above, applies the Q8 classifier, and writes the JSON. No datalake file is
created or modified.
