# LEARNINGS — creator-universe

Session-level patterns and corrections. Append an entry after any correction,
near-miss, or hard-won discovery. Newest first. Keep entries short: what
happened, the root-cause insight, the rule it produces.

Format:

```
## YYYY-MM-DD — <one-line title>
Observed: <what actually happened>
Learned: <the root cause, not the symptom>
Rule: <the standing rule this produces>
```

---

## 2026-09-10 — Apify budget is shared and nearly spent

Observed: The Apify account carries a $39/month STARTER allowance with
$35.85 already consumed by the datalake repo this cycle. Only ~$3.15 remained
for the entire collection phase.

Learned: This repo shares a metered account with a sibling project. A collector
written without a plan/dry-run path has no safe failure mode — it simply spends.
Worse, the two repos could race each other's budget with no visibility.

Rule: Every paid collection path MUST support `--plan` (projected items + USD,
no API call) and check the live remaining balance before `--run`. The collector
writes a `data/cost_ledger.json` entry per run so cost is traceable, not
inferred.

## 2026-09-10 — Cheapest following-scraper does not return follower counts

Observed: Following-list actors at the low price band
(`datadoping/instagram-following-scraper`, $0.0012–0.0014/row;
`coderx/instagram-followers-following-scraper`, $0.0013/row) return only
`username, full_name, profile_pic_url, is_private, is_verified`. The tiering
signal (follower count) is absent.

Learned: Follower counts and edges come from different actors at different
prices. "Enriched" following modes exist but cost $0.0108–0.012/row — roughly
8× the basic row — which is unaffordable at corpus scale.

Rule: Budget a two-actor pipeline: following scrapes for the graph edges,
then ONE batched profile-details scrape over the deduplicated node set for
follower counts. Dedupe before enriching; the overlap between following lists
in a niche is high, so unique-node count is far below total-row count.
