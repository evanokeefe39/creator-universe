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

## 2026-09-10 — Apify following actors emit duplicate rows, and you pay per row

Observed: The seed scrape of `nick_saraev` returned **172 rows** but only **143
distinct usernames** — a 17% duplicate rate in the actor's own output. The
ledger charged for all 172. The build step deduped correctly, so the graph was
right (143 degree-1 nodes, 0 orphans), but the raw row count overstated the
real following list and the spend overstated the useful work.

Learned: "Number of rows returned" is not "size of the following list", and the
ledger total is not "cost of the data acquired". Two independent dedupes are in
play — one inside the actor (absent), one in the transform (present, correct).

Rule: Report **distinct handle count** as the completeness measure for a
following list, never the raw row count. When a spike claims "full list
captured", the number that proves it is the distinct-handle count versus the
account's real following count. Duplicate-rate is a cost metric worth watching
when choosing between actors at different price points.

## 2026-09-10 — Two actors, not one, is structurally required

Observed: A structured sweep of the Apify store priced every plausible actor.
The single-actor shortcut does not exist at a discount. Apify's own
`instagram-followers-following-scraper` states that the upstream list payload
does not carry follower counts at all, and every actor that adds them does so
as a separate additive billing event costing *more* than running two actors
(`thenetaji` $0.00325, `memo23` $0.00559, `data-slayer` $0.0108 per row).

Learned: Follower counts are absent from the following-list payload as a
property of the source, not of any vendor's implementation. Any actor
advertising "following + counts" in one call must be priced carefully — it is
two events wearing one name.

Rule: The pipeline is edges-actor + counts-actor. Choose each independently on
price and reliability; never accept a combined actor without checking whether
the count is a second billed event. Cheapest verified pair as of 2026-09-10:
`scraping_solutions/instagram-scraper-followers-following-no-cookies`
($0.0007/row) + a profile-detail actor at $0.0011/profile.

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
