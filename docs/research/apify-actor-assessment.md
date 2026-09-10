# Apify Instagram actors — source-verified cost/value assessment

> **BLUF.** No single actor returns following rows **with follower counts** at
> anything near the basic-row price — the two cost classes are disjoint in this
> market, and the cheapest "single-actor enriched" option is *more expensive*
> than the two-actor pipeline it would replace. The recommended shape is
> **two actors: `scraping_solutions/instagram-scraper-followers-following-no-cookies`
> for edges at $0.0007/row + `figue/instagram-profile-scraper` for follower
> counts at $0.0011/profile, projected \$1.34 for our corpus** — about 36% below
> the current `datadoping` + `coderx` pairing (\$2.09).

Assessment date: **2026-09-10**. Tier: **STARTER plan → `BRONZE`**
(verified live: `GET /v2/users/me` → `plan.tier = "BRONZE"`).

Every price below is read from
`GET /v2/acts/<owner~actor>` → `pricingInfos[last].pricingPerEvent.actorChargeEvents.*`,
selecting the `BRONZE` key of `eventTieredPricingUsd`, or `eventPriceUsd` where
the event is flat. Every field list is read from the actor's own store page
(`https://apify.com/<owner>/<actor>.md`). **No actor was run.** Where the
README does not show a field in a concrete example output, it is marked
**UNVERIFIED**.

---

## 1. The single highest-value question, answered

**"Is there one actor that returns following rows WITH follower counts at a
price close to the basic row price?"**

### Answer: **No — not at a price near the basic row, and not verified from any actor's own example output.**

Three independent lines of evidence:

1. **First-party statement of the whole actor class.** `apify/instagram-followers-following-scraper`
   (1,341 users) says in its README, verbatim:

   > "Note: this Actor returns the **list of accounts**, not their full profiles.
   > It doesn't include bios, **follower counts**, or post data for each account
   > in the list. To enrich the usernames you get here with profile-level data,
   > feed them into 🔗 Instagram Profile Scraper."

   Apify's own first-party followers/following actor confirms the upstream list
   payload does not carry follower counts. This is a property of the data
   source, not of one vendor's implementation.

2. **Every following-list actor's documented example output lacks the field.**
   `datadoping`, `scraping_solutions`, `datavoyantlab`, `memo23`, `thenetaji`
   (base), `coderx`, and `apify` all publish an example record containing
   `username`, `full_name`, `is_private`, `is_verified`, `profile_pic_url` —
   and **no follower count**. `datavoyantlab`'s output is the richest basic row
   found (18 nested fields, including `fbid_v2`, `latest_reel_media`,
   `account_badges`) and still has **no** `follower_count`.

3. **Where a following actor does offer counts, it is a separate, additive
   billed event — and it lands well above the basic price.**

   | Actor | Base row | Count add-on | Effective price/row with count |
   |---|---|---|---|
   | `thenetaji/instagram-following-scraper` | `result` $0.0015 | `enriched-profile` $0.00175 | **$0.00325** (2.2× base) |
   | `memo23/instagram-following-scraper` | $0.00199 | `$0.0036` | **$0.00559** (2.8× base) |
   | `data-slayer/instagram-following` | `result-basic` $0.00217 | `result-enriched` $0.0108 | **$0.0108** (5.0× basic) |

   `thenetaji`'s README is explicit that enrichment is charged *in addition*:
   *"One additional request and one additional billed event per account
   returned."* So the single-actor rich row costs **$0.00325**, which is
   **more** than the two-actor approach ($0.0007 + $0.0011 = $0.0018 for the
   same information). The single-actor shortcut does not exist at a discount.

### The nearest thing to a "yes", and why it still fails

`thenetaji/instagram-following-scraper` is the closest: one actor, one run, one
event stream, and its input schema says enrichment at the default
`fullProfileDetails: false`

> "returns follower/following counts, biography, bio links and core identity —
> the fields most runs need, at a fraction of the cost."

That is a documented claim that `enrichProfile: true` yields follower counts.
**But the same actor's own field table and example output do not list
`followers`, and its `actorDefinition.output` declares only a dataset link with
no per-record schema.** The claim is therefore **UNVERIFIED** — see §3.1. Even
accepting it at face value, $0.00325/row is 1.8× the recommended two-actor pair.

---

## 2. Comparison table

Prices are **Bronze tier**, per row, as returned by the API. "30-day success"
is `publicActorRunStats30Days.SUCCEEDED / TOTAL`. Rating is
`actorReviewRating` (review count in parentheses). "Last run" is
`lastRunStartedAt`. All values read live on 2026-09-10.

### 2a. Following-list (edge) actors

| Actor id | Pricing model | Bronze $/row | What one row buys | Documented output fields | Follower count in base row? | Users | Rating (n) | 30-day success | Last run |
|---|---|---|---|---|---|---|---|---|---|
| `scraping_solutions/instagram-scraper-followers-following-no-cookies` | PPE, `apify-default-dataset-item` | **$0.0007** | one follower/following account of a seed | `username_scrape, type, id, username, full_name, is_private, is_verified, profile_pic_url` | **No** | 14,037 | 4.77 (15) | 127,039/127,563 = **99.6%** | 2026-09-10T10:06Z |
| `datavoyantlab/instagram-following-scraper` | PPE, `following-item-fetched` | **$0.00069** (+$0.05 start, flat) | one followed account | `username` + nested `following_user{pk, pk_id, id, full_name, is_private, fbid_v2, third_party_downloads_enabled, strong_id__, profile_pic_id, profile_pic_url, is_verified, username, has_anonymous_profile_picture, account_badges, latest_reel_media, is_favorite}` | **No** | 1,501 | 5.00 (3) | 1,753/1,887 = **92.9%** | 2026-09-10T07:41Z |
| `datadoping/instagram-following-scraper` | PPE, `apify-default-dataset-item` | $0.0014 (realized ≈$0.00092, §4) | one followed account | `username, full_name, profile_pic_url, is_private, is_verified, following_of` (+ `id, fbid_v2, latest_reel_media, profile_pic_id, account_badges, has_anonymous_profile_picture, third_party_downloads_enabled, is_favorite` in observed rows) | **No** | 2,965 | 5.00 (4) | 5,801/5,902 = **98.3%** | 2026-09-10T10:02Z |
| `coderx/instagram-followers-following-scraper-no-cookies-login` | PPE, `item-saved` | $0.0013 (+$0.002 start) | one follower/following account | not shown in README example output — **UNVERIFIED** | **No** (advertised as list-only) | 2,115 | 5.00 (8) | 5,137/5,170 = **99.4%** | 2026-09-10T10:01Z |
| `thenetaji/instagram-following-scraper` | PPE, `result` | $0.0015 (+$0.00005 start) | one followed account | `username, full_name, id, is_private, is_verified, profile_pic_url, source_username, enriched` | **No** (enriched add-on only, §3.1) | 206 | 5.00 (1) | 1,918/1,941 = **98.8%** | 2026-09-10T10:02Z |
| `thenetaji/instagram-following-scraper` **+enrich** | PPE, `result`+`enriched-profile` | **$0.00325** | one followed account **with profile** | base fields **+ followers (claimed, UNVERIFIED)**, bio, bio links, core identity | claimed yes / **UNVERIFIED** | 206 | 5.00 (1) | 1,918/1,941 | 2026-09-10T10:02Z |
| `memo23/instagram-following-scraper` | PPE, `apify-default-dataset-item` | $0.00199 (+$0.005 start) | one account in list | `sourceUsername, type, userId, username, fullName, isPrivate, isVerified, profilePicUrl, profileUrl` | **No** (add-on only) | 31 | 5.00 (2) | 47/51 = 92.2% | 2026-09-10T08:59Z |
| `memo23/…` **+enrichWithCounts** | PPE, +`enriched-profile` | **$0.00559** | one account **+ counts/contacts** | + `followersCount, followsCount, postsCount, isBusiness, biography, externalUrl, publicEmail, publicPhone, category, fbId` | yes, add-on $0.0036 | 31 | 5.00 (2) | 47/51 | 2026-09-10T08:59Z |
| `futurizerush/instagram-following-scraper` | PPE, `apify-default-dataset-item` | $0.002 (+$0.01 start) | one followed account | not shown — **UNVERIFIED** | **No** | 113 | 5.00 (1) | 290/292 = 99.3% | 2026-09-10T06:30Z |
| `data-slayer/instagram-following` | PPE, tiered | $0.00217 basic (+$0.0005 start) | one followed account (thin) | `username, full_name, is_verified, profile_pic_url` | **No** | 304 | 5.00 (1) | 145/146 = 99.3% | 2026-09-10T02:47Z |
| `data-slayer/instagram-following` **enriched** | PPE, `result-enriched` | **$0.0108** | one followed account + 31 fields | + `follower_count, public_email, contact_phone_number, external_url, bio_links, biography, category, is_business, date_joined, country, enrichment_status` | **Yes** (example shows `"follower_count": 120000`) | 304 | 5.00 (1) | 145/146 | 2026-09-10T02:47Z |
| `louisdeconinck/instagram-following-scraper` | PPE, `api-result`/`cookie-result` | $0.003 api + $0.0009 init | one followed account | not shown — **UNVERIFIED** | **No** | 5,563 | **3.56 (12)** | 2,102/2,271 = **92.6%** | 2026-09-10T09:50Z |
| `datadoping/instagram-following-scraper-pro` | PPE, `apify-default-dataset-item` | $0.0023 | one account (richer mode) | not shown — **UNVERIFIED** | not documented | 148 | **2.74 (2)** | 86/92 = 93.5% | 2026-09-10T01:44Z |
| `apify/instagram-followers-following-scraper` | PPE, `profile` | $0.00175 | one follower/following account | `username, user_id, full_name, type (FOLLOWER/FOLLOWING), source_username, is_verified, is_private, profile_pic_url` | **No — explicitly disclaimed by Apify** | 1,341 | 4.68 (9) | 15,607/15,641 = **99.8%** | 2026-09-10T10:05Z |
| `patient_discovery/instagram-following` | PPE, `apify-default-dataset-item` | $0.00217 (+$0.002 start) | one followed account | not shown — **UNVERIFIED** | not documented | 477 | 5.00 (1) | 3,177/3,177 = **100%** | 2026-09-10T10:03Z |
| `instaprism/instagram-following-scraper` | PPE, `apify-default-dataset-item` | $0.0038 (+$0.1 start) | one followed account | not shown — **UNVERIFIED** | No | 289 | 4.91 (12) | 52/69 = 75.4% | 2026-09-10T10:02Z |
| `devil_port369-owner/instagram-following` | PPE, `apify-default-dataset-item` | $0.0035 (+$0.009 start) | one followed account | not shown — **UNVERIFIED** | No | 289 | 5.00 (3) | 5,868/5,914 = 99.2% | 2026-09-10T10:02Z |
| `crawlerbros/instagram-follower-scraper` | PPE, `apify-default-dataset-item` | $0.00833 (+$0.005 start) | one account | not shown — **UNVERIFIED** | No | 682 | 4.24 (4) | 694/764 = 90.8% | 2026-09-10T09:31Z |
| `datadoping/instagram-followers-scraper` | PPE | see store | one follower | — | No | 5,394 | 4.90 | — | — |
| `toolzerhub/instagram-profile-follower-followee-scraper` | PPE | — | — | — | No | 60 | **0.00** | — | — |
| `datascrape/…`, `scrapebase/instagram-following-scraper` | PPE | — | — | — | No | 19 | **0.00** | — | — |

*(Rows marked "—" were surfaced by store search but not individually swept;
they are listed for completeness and are not viable on rating/user count.)*

### 2b. Profile-detail (follower-count) actors

| Actor id | Pricing model | Bronze $/row | What one row buys | Documented output fields | Follower count present? | Users | Rating (n) | 30-day success | Last run |
|---|---|---|---|---|---|---|---|---|---|
| `figue/instagram-profile-scraper` | PPE, `apify-default-dataset-item` | **$0.0011** (+$0.0025 start) | one full profile | `username, full_name, biography, biography_with_entities, bio_links, external_url, profile_pic_url_hd, followersCount, followsCount, postsCount, is_verified, is_private, is_business_account, is_professional_account, category_name, business_email, business_phone_number, business_address_json, pronouns, highlight_reel_count, fbid, relatedProfiles, scrapedAt` | **Yes** — example: `"followersCount": 284000000`; README reports coverage "`followersCount` 100%" over a real 875-profile run | 1,274 | 5.00 (3) | 9,879/9,999 = **98.8%** | 2026-09-10T10:01Z |
| `coderx/instagram-profile-scraper-bio-posts` | PPE, `apify-default-dataset-item` | **$0.0011** (+$0.001 start) | one profile + posts | not shown in README example output — **UNVERIFIED** | claimed in title; **UNVERIFIED** | 6,220 | 5.00 (9) | 147,086/147,416 = **99.8%** | 2026-09-10T10:06Z |
| `coderx/instagram-profile-scraper-api` | PPE, `profile` | $0.0012 (+$0.003 start) | one profile | `id, username, fullName, profilePicUrl, hdProfilePicUrl, biography, biography_with_entities, external_url, externalUrls, fbid, followersCount, followsCount, postsCount, verified, private, isBusinessAccount, businessCategoryName, business_address_json, has_channel, highlight_reel_count, is_joined_recently, latestPosts[]` | **Yes** — example: `"followersCount": 2453778` | 3,301 | 4.96 (12) | 38,214/38,239 = **99.9%** | 2026-09-10T10:03Z |
| `datadoping/instagram-profile-scraper` | PPE, `apify-default-dataset-item` | $0.0014 | one profile | prose only ("Follower and following count"); **no example output → field name UNVERIFIED** | claimed in prose; **UNVERIFIED** | 861 | 5.00 (3) | 415/430 = 96.5% | 2026-09-10T04:35Z |
| `apify/instagram-followers-count-scraper` | PPE, `profile` + `actor-start` | $0.0023 (+$0.001 non-one-time start) | one profile's counts | not shown in README example output — **UNVERIFIED** | Yes by definition (counts are the product) | 15,568 | 4.83 (22) | 97,486/97,519 = **99.97%** | 2026-09-10T10:06Z |
| `apify/instagram-profile-scraper` | PPE, `profile` + `about-account` | $0.0023 (+$0.006 add-on) | one full profile | not shown in README example output — **UNVERIFIED** | Yes by definition | 214,354 | 4.75 (174) | 8,982,820/9,013,444 = **99.7%** | 2026-09-10T10:06Z |
| `apify/instagram-scraper` | PPE, `result` | $0.0023 | one result (flexible mode) | — | depends on mode | 389,498 | 4.70 (593) | 16,792,566/16,845,966 = **99.7%** | 2026-09-10T10:06Z |
| `danek/instagram-profiles-scraper-ppr` | PPE, `apify-default-dataset-item` | $0.00367 (+$0.00005 start) | one profile | not shown — **UNVERIFIED** | claimed; **UNVERIFIED** | 3,044 | 4.38 (3) | 67,646/72,686 = 93.1% | 2026-09-10T09:56Z |
| `unseenuser/igscraping` | PPE, `apify-default-dataset-item` | $0.0035 | one profile | not shown — **UNVERIFIED** | claimed in title | 1,313 | 5.00 (5) | 13,401/13,424 = 99.8% | 2026-09-10T10:07Z |
| `devil_port369-owner/instagram-complete-profile-scraper-ppr` | PPE, `apify-default-dataset-item` | $0.003 (+$0.009 start) | one profile | not shown — **UNVERIFIED** | claimed in title | 641 | 4.97 (7) | 33/33 = 100% | 2026-09-10T06:56Z |

---

## 3. Verified output fields — including what is NOT verified

### 3.1 `thenetaji/instagram-following-scraper` — the one genuine ambiguity

Three artifacts of the *same actor* disagree, and this must not be resolved by
guessing:

| Source | What it says |
|---|---|
| Store/build README response-field table | 8 fields: `username, full_name, id, is_private, is_verified, profile_pic_url, source_username, enriched` — **no `followers`** |
| README example output (`enriched: false`) | 5 fields; **no `followers`** |
| Build `actorDefinition.input.properties.fullProfileDetails.description` | *"Off by default, which **returns follower/following counts**, biography, bio links and core identity"* |
| Build `actorDefinition.output` | `{ dataset: string }` only — **no per-record schema** |

**Verdict: UNVERIFIED.** The input-schema description asserts counts are
returned at the default enrichment level, but no artifact of the actor shows a
`followers` field in an actual record, and the documented field table — which
the same README presents as exhaustive ("One record per followed account") —
omits it. The claim is plausible (the description is explicit and
enrichment-specific) but **unproven**. Confirming it would require a single
paid run of ≤5 accounts, which this assessment is not permitted to do.

**Exact field names are also unverified** for this actor's enriched mode: even
if counts are returned, the key could be `followers`, `follower_count`, or
`followersCount` — three different key styles are used by three different
actors in this comparison (`figue`/`coderx` use `followersCount`,
`data-slayer` uses `follower_count`). The pipeline must not hardcode a key
until a run proves it.

### 3.2 Fields that ARE verified from the actor's own example output

These are copied verbatim from a concrete `Example Output` JSON block on the
actor's own store page:

- **`scraping_solutions/instagram-scraper-followers-following-no-cookies`** —
  8 fields, example for `mrbeast`: `username_scrape, type, id, username,
  full_name, is_private, is_verified, profile_pic_url`. **No follower count.**
- **`datavoyantlab/instagram-following-scraper`** — example for `natgeo`:
  `username` + `following_user{ pk, pk_id, id, full_name, is_private, fbid_v2,
  third_party_downloads_enabled, strong_id__, profile_pic_id, profile_pic_url,
  is_verified, username, has_anonymous_profile_picture, account_badges,
  latest_reel_media, is_favorite }`. **No follower count.**
- **`datadoping/instagram-following-scraper`** — example: `username, full_name,
  profile_pic_url, is_private, is_verified, following_of`. **No follower count.**
  Independently corroborated by the user's own six raw runs (§4).
- **`memo23/instagram-following-scraper`** — example for `zuck`:
  `sourceUsername, type, userId, username, fullName, isPrivate, isVerified,
  profilePicUrl, profileUrl`. **No follower count.**
- **`data-slayer/instagram-following`** — enriched example:
  `username, full_name, is_verified, enrichment_status, public_email,
  external_url, bio_links, biography, category, is_business, follower_count
  (120000), account_type, country, date_joined, email_found, email_source,
  email_verified`. **Follower count present in enriched mode only.**
- **`figue/instagram-profile-scraper`** — example for `natgeo`: includes
  `followersCount: 284000000`, `followsCount`, `postsCount`, `bio_links`,
  `business_email`. **Follower count verified.**
- **`coderx/instagram-profile-scraper-api`** — example: includes
  `followersCount: 2453778`. **Follower count verified.**
- **`apify/instagram-followers-following-scraper`** — first-party text:
  *"It doesn't include bios, follower counts, or post data."* **No follower count.**
- **`apify/instagram-followers-count-scraper`** — prose describes scraping
  "the number of Followers and Followings"; **no example output block**, so the
  field name is UNVERIFIED.

### 3.3 Actors with prose claims but no example output (field-level: UNVERIFIED)

`coderx/instagram-followers-following-scraper-no-cookies-login`,
`futurizerush/instagram-following-scraper`, `louisdeconinck/instagram-following-scraper`,
`datadoping/instagram-following-scraper-pro`, `patient_discovery/instagram-following`,
`instaprism/instagram-following-scraper`, `devil_port369-owner/instagram-following`,
`crawlerbros/instagram-follower-scraper`, `datadoping/instagram-profile-scraper`,
`apify/instagram-followers-count-scraper`, `apify/instagram-profile-scraper`,
`apify/instagram-scraper`, `danek/instagram-profiles-scraper-ppr`,
`unseenuser/igscraping`, `devil_port369-owner/instagram-complete-profile-scraper-ppr`,
`coderx/instagram-profile-scraper-bio-posts`.

For each of these the README describes the actor in prose but publishes no
example JSON record. Their field *names* are therefore unknown and must be
confirmed by a cheap probe run before any pipeline depends on them.

---

## 4. Realized cost from the user's own runs (ground truth)

The repo already holds six runs of `datadoping/instagram-following-scraper`
under `data/raw/apify/datadoping_instagram-following-scraper/`, with the ledger
at `data/cost_ledger.json`:

| Run | Purpose | Items | Cost USD | Implied $/row |
|---|---|---|---|---|
| `rZO3DFebSwRKaUkQc` | seed following list | 172 | 0.1652 | $0.00096 |
| `Llt7sRY3FfBCfF8f7` | second-degree (`filatov.design`) | 5 | 0.0000 | $0.00000 |
| `cgF6xXzjedbOtUbVc` | second-degree (`justyn.ai`) | 200 | 0.1400 | $0.00070 |
| `rRwNgefMLEeeVAPmV` | second-degree (`justyn.ai`) | 200 | 0.1708 | $0.00085 |
| `eY6n2K1ZGsCmeCBvL` | second-degree (`chase.h.ai`) | 200 | 0.2100 | $0.00105 |
| `rXQQzx4MivM2GGhP0` | second-degree (`angus.sewell`) | 198 | 0.2086 | $0.00105 |
| **Total** | | **975** | **0.8946** | **$0.000918 blended** |

Two facts fall straight out of this:

1. **The list price ($0.0014) overstates the realized cost.** Blended
   realized was $0.000918/row — 34% below list — because small runs and
   partially-billed pages cost less. The list price is still the correct basis
   for a worst-case projection, but a real run came in cheaper.
2. **Every one of the 975 rows lacked a follower count.** The raw records carry
   14 keys and none is a follower count. This is the empirical confirmation of
   §1: the current actor cannot tier the 584-node universe on its own, and
   `data/universe.json` today has **0 of 584 nodes with a follower count**.

---

## 5. Cost projection — 174 seed + ~800 second-degree + ~600 profile rows

Working corpus: **974 list rows** (174 seed + 800 second-degree) + **600 profile
rows** = 1,574 billed rows. Actor-start fees are included where the API
declares them. Some actors declare a start fee as `isOneTimeEvent: true`
(charged once per run, not per row) — those are counted **once per pipeline
run**, which is how Apify bills them.

| # | Pipeline shape | List rows | List cost | Profile rows | Profile cost | Start fees | **Total USD** |
|---|---|---|---|---|---|---|---|
| **B** | **`scraping_solutions` $0.0007 + `figue` $0.0011** ⭐ | 974 | $0.6818 | 600 | $0.6600 | $0.0025 | **$1.3443** |
| C | `datavoyantlab` $0.00069 + `figue` $0.0011 | 974 | $0.6721 | 600 | $0.6600 | $0.0525 | **$1.3846** |
| H | `datavoyantlab` $0.00069 + `coderx-profile-api` $0.0012 | 974 | $0.6721 | 600 | $0.7200 | $0.0530 | **$1.4451** |
| — | *realized-rate variant: $0.000918 + `figue`* | 974 | $0.8941 | 600 | $0.6600 | $0.0025 | **$1.5566** |
| E | `datadoping-following` $0.0014 + `figue` $0.0011 | 974 | $1.3636 | 600 | $0.6600 | $0.0025 | **$2.0261** |
| F | `scraping_solutions` $0.0007 + `apify-profile` $0.0023 | 974 | $0.6818 | 600 | $1.3800 | $0.0010 | **$2.0628** |
| A | **current: `datadoping-following` $0.0014 + `coderx-profile-api` $0.0012** | 974 | $1.3636 | 600 | $0.7200 | $0.0030 | **$2.0866** |
| G | `memo23` single-actor enriched $0.00559 | 974 | $5.4447 | 0 | $0 | $0.0050 | **$5.4497** |
| D | `thenetaji` single-actor enriched $0.00325 | 974 | $3.1655 | 0 | $0 | $0.00005 | **$3.1655** |

**Reading of the table**

- The recommended **shape B is $1.3443** — a **35.6% saving** against the
  current shape A ($2.0866), and it *adds* the follower-count coverage the
  corpus is currently missing entirely.
- The **cheapest list actor overall is `datavoyantlab`** at $0.00069, but its
  **$0.05 flat start fee** consumes the 1-cent-per-974-row advantage and then
  some: shape C ($1.3846) is *more expensive* than shape B ($1.3443). Start
  fees are decisive at this corpus size, exactly as the brief warned.
- The **single-actor shapes (D, G) are the most expensive options on the
  board** — $3.17 and $5.45. Paying for enrichment per list row, when most
  second-degree rows are duplicates of nodes the profile pass would fetch once,
  is strictly worse than paying for list rows cheaply and enriching the
  deduplicated node set.
- `apify/instagram-followers-count-scraper` ($0.0023 + $0.001 non-one-time
  start) is **not** in the table as a dedicated shape because it returns
  counts only — reproducing the current pipeline with it would cost more than
  shape B while returning less.

---

## 6. Recommendation

### Recommended pipeline: **shape B — two actors**

1. **Edges:** `scraping_solutions/instagram-scraper-followers-following-no-cookies`,
   `dataToScrape: "Following"`, at **$0.0007/row**.
2. **Follower counts:** `figue/instagram-profile-scraper` over the *deduplicated,
   post-collection* node set, at **$0.0011/profile**.

**Projected total: $1.3443 USD** for 974 list rows + 600 profile rows, within
the ~$3 remaining this cycle and leaving more than half the budget as headroom
for retries and the second-degree expansion's unknowns.

### Why this shape

- **It is the cheapest shape that satisfies the actual requirement.** The
  requirement is *not* "one actor"; it is "edges at minimum cost plus follower
  counts at minimum cost". Decoupling the two lets each half be bought from the
  vendor that is cheapest *at that half*. The single-actor shapes that try to
  do both are 2.4–4.1× more expensive because enrichment is billed additively
  per list row rather than once per deduplicated node.
- **Both halves are verified, not inferred.** `figue` publishes a concrete
  example with `"followersCount": 284000000` and reports measured 100%
  coverage of that field over a real 875-profile run. `scraping_solutions`
  publishes a concrete 8-field example and is the highest-adoption list actor
  found.
- **Reliability is top-tier on both halves.** 99.6% (127,039/127,563) and
  98.8% (9,879/9,999) 30-day success rates, both rating 5.00/4.77, both last
  run within the hour. Neither is an unproven long shot.
- **Enriching the deduplicated node set is the structurally correct choice.**
  800 second-degree rows will collapse into far fewer distinct nodes once
  deduplicated against the 174 seeds and each other. Paying per *profile* for
  ~600 unique nodes is cheaper and cleaner than paying per *row* for ~974,
  and it prevents re-billing for the same account collected from two seeds.

### Risks this recommendation carries

| Risk | Severity | Mitigation |
|---|---|---|
| `scraping_solutions` README is thin; no documented behaviour for private/not-found accounts, and its `continuationToken` is single-account-only | Medium | Its 99.6% success rate over 127k runs is strong evidence it does not silently truncate. Budget a small probe run first; the corpus is small enough that one retry cycle is affordable. |
| `figue` has only 1,274 users and 3 reviews | Low–Medium | Rating 5.00 with 98.8% success over ~10k 30-day runs. Trade-off if it fails: `coderx/instagram-profile-scraper-api` at $0.0012 (+$0.003 start) → shape H costs only +$0.101 more ($1.4451) and is fully verified. This is a cheap insurance policy. |
| Follower-count key name may vary (`followersCount` vs `follower_count` vs `followers`) | Medium | `figue`'s key is verified as `followersCount`. The pipeline must read the key from the verified actor, not assume a shared name. |
| `scraping_solutions`'s `following` output has **no** follower count, so a second actor is mandatory | Certain — by design | This is the plan, not a risk. Do not attempt to avoid it with a single enriched actor (§1). |
| Instagram list truncation upstream (Apify's own actors state lists stop "well short of a census") | High, unavoidable | Affects every actor equally. The seed returned 172 rows against a real following count of ~174, i.e. effectively complete; the risk is on very large second-degree targets. `memo23`'s `includeHistorical` idea is not worth paying for at this scale. |
| Start fees on small runs | Low | Quantified above: only `datavoyantlab` ($0.05) and `instaprism` ($0.10) carry punitive starts. Shape B's starts total $0.0025. |

### What would falsify this recommendation

**The recommendation changes if any one of these becomes true:**

1. **A source-verified single actor appears that returns follower counts in the
   base row at ≤$0.002/row.** Then the single-actor shape wins on simplicity for
   ~$1.95 and the two-actor split is unnecessary. Falsifier: a store page whose
   *example output* (not prose) shows a follower-count field on a record billed
   by a single `result`-class event priced ≤$0.002 at Bronze. **As of
   2026-09-10 no such actor exists in any store search performed.**
2. **A probe run shows `thenetaji`'s `enriched-profile` returns counts at the
   claimed $0.00325 all-in** *and* `datavoyantlab`'s 92.9% success rate proves
   unacceptable in practice. Then `thenetaji` becomes the fallback — but note
   it is still $3.17, so only a *reliability* collapse of both cheap actors
   would justify it.
3. **`figue` proves unreliable on a probe** (drops below ~95% success, or
   `followersCount` comes back null on a material fraction of real rows). Then
   swap the profile half to `coderx/instagram-profile-scraper-api` — shape H at
   $1.4451, +$0.10.
4. **The corpus changes materially.** The ranking is sensitive to the
   **profile-row count**, because profile rows cost 1.57× the list rows. If the
   deduplicated node set grows past ~1,300 while list rows stay flat, the
   ordering between shapes narrows and the start-fee penalty on `datavoyantlab`
   becomes relatively less important.
5. **`scraping_solutions`'s price changes.** Its `pricingInfos` carries an
   `isPriceChangeNotificationSuppressed: true` flag and a migration note
   ("Migration from Pay Per Result to Pay Per Event"); if it re-prices above
   ~$0.0011/row, `datadoping` at its *realized* $0.000918 becomes the cheaper
   *and* better-known list actor (shape E-style, ~$1.55 with `figue`).

---

## 7. Search coverage beyond the pre-named actors

Store searches run (`GET /v2/store?search=…&limit=25`): *"instagram following"*
(1,580 total), *"instagram followers"* (2,180), *"instagram profile"* (4,485),
*"instagram profile followers count"* (1,993), *"instagram following enriched
followers"* (298), *"instagram bulk profile enrichment"* (682),
*"instagram following no cookies cheap"* (146).

**Newly surfaced actors not in the brief that materially affected this
assessment:**

- **`figue/instagram-profile-scraper`** — $0.0011/profile, verified
  `followersCount`, 5.00/1,274 users. *Became the recommended profile actor.*
- **`scraping_solutions/instagram-scraper-followers-following-no-cookies`** —
  $0.0007/row, 14,037 users (the highest-adoption list actor found), 4.77.
  *Became the recommended list actor.*
- **`datavoyantlab/instagram-following-scraper`** — $0.00069/row but $0.05
  start. *The cheapest headline row price in the market; rejected on total cost.*
- **`apify/instagram-followers-following-scraper`** — the first-party actor
  whose README supplied the class-level disproof in §1.
- **`apify/instagram-followers-count-scraper`** — 15,568 users, counts-only.
- **`unseenuser/igscraping`**, **`devil_port369-owner/instagram-complete-profile-scraper-ppr`**,
  **`patient_discovery/instagram-following`**, **`instaprism/instagram-following-scraper`**,
  **`devil_port369-owner/instagram-following`**, **`crawlerbros/instagram-follower-scraper`**
  — swept and priced; none beat the recommended pair.

---

## Reproduction

```bash
# Metadata + Bronze pricing for one actor
curl -s "https://api.apify.com/v2/acts/figue~instagram-profile-scraper?token=$APIFY_API_TOKEN" \
  | jq '.data.pricingInfos[-1].pricingPerEvent.actorChargeEvents
        | map_values(.eventTieredPricingUsd.BRONZE.tieredEventPriceUsd // .eventPriceUsd)'

# Store-wide actor discovery
curl -s --get "https://api.apify.com/v2/store" \
  --data-urlencode "search=instagram following" --data-urlencode "limit=25" \
  --data-urlencode "token=$APIFY_API_TOKEN" | jq '.data.items[] | {id: (.username+"/"+.name), users: .stats.totalUsers}'

# Documented example output (field verification)
curl -s "https://apify.com/figue/instagram-profile-scraper.md"
```

Tier validation:

```bash
curl -s "https://api.apify.com/v2/users/me?token=$APIFY_API_TOKEN" | jq '.data.plan | {id, tier}'
# => {"id": "STARTER", "tier": "BRONZE"}
```

No actor was executed for this assessment; no budget was spent.
