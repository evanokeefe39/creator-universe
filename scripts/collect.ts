/**
 * Spike 1 collector. Modes (mutually exclusive):
 *   --plan    — no actor runs. Prints seed, second-degree targets (from raw
 *               data when present), projected rows and projected USD.
 *   --run     — executes: seed following list, second-degree expansions,
 *               dedupe, one batched profile-details run within budget.
 *               Appends one ledger row per paid run; raw per run under
 *               data/raw/apify/<actor-slug>/<run_id>.json.
 *   --replay  — rebuilds nothing here (graph rebuild is scripts/build_graph.ts);
 *               verifies raw files exist and prints coverage from disk with
 *               zero network calls.
 *
 * Cost model (verified 2026-09-10, Bronze plan):
 *   datadoping/instagram-following-scraper  $0.0014 / row
 *   coderx/instagram-profile-scraper-bio-posts  $0.0011 / profile + $0.001 start
 */
import type { LedgerEntry, RawFollowingRow, RawProfileRow } from "../lib/types";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const SEED = "nick_saraev";
const SECOND_DEGREE_MAX_COUNT = 200;
/** Datalake-research preference order (cross-workstream input, 2026-09-10). */
const PREFERRED_TARGETS = ["chase.h.ai", "angus.sewell", "marc.kaz", "aitickerdaily", "kerem.tech", "steven.builds"];
/** Round-2 external hubs (orchestrator steer 2026-09-10): NONE appear in the seed's own
 *  following list; added deliberately to test whether the niche is one cluster or several. */
const EXTERNAL_TARGETS = ["marc.kaz", "kerem.tech", "steven.builds"];
const FOLLOWING_ACTOR = "datadoping/instagram-following-scraper"; // round 1 (superseded, $0.0014/row)
const EDGE_ACTOR = "scraping_solutions/instagram-scraper-followers-following-no-cookies"; // round 2, $0.0007/row
const EDGE_ROW_USD = 0.0007;
const PROFILE_ACTOR = "coderx/instagram-profile-scraper-bio-posts"; // held per orchestrator steer
const FIGUE_ACTOR = "figue/instagram-profile-scraper"; // probe candidate
const PROBE_HANDLES = ["evolving.ai", "sabrina_ramonov", "chase.h.ai", "angus.sewell", "aitickerdaily"];
const FOLLOWING_ROW_USD = 0.0014;
const PROFILE_ROW_USD = 0.0011;
const PROFILE_RUN_START_USD = 0.001;
const SEED_MAX_COUNT = 500; // seed follows ~174; actor enforces max_count >= 50
const HARD_CAP_USD = 2.5;
const SAFETY_MARGIN = 0.15;

const REPO = import.meta.dir + "/..";
const RAW_DIR = `${REPO}/data/raw/apify`;
const LEDGER_PATH = `${REPO}/data/cost_ledger.json`;

type FollowingRunFile = {
  actor: string; run_id: string; status: string; usageTotalUsd: number;
  started_at: string; following_of: string; items: RawFollowingRow[];
};
type ProfileRunFile = {
  actor: string; run_id: string; status: string; usageTotalUsd: number;
  started_at: string; items: RawProfileRow[];
};

const token = process.env.APIFY_API_TOKEN;
if (!token) {
  console.error("APIFY_API_TOKEN missing (expected in repo-root .env)");
  process.exit(1);
}
const mode = process.argv[2];
if (mode !== "--plan" && mode !== "--run" && mode !== "--replay" && mode !== "--probe") {
  console.error("Usage: bun run collect -- [--plan | --run | --probe | --replay]");
  process.exit(1);
}

const norm = (h: string) => h.trim().replace(/^@/, "").toLowerCase();

/** Deterministic niche plausibility score for a second-degree candidate. */
function nicheScore(row: RawFollowingRow): number {
  const h = (row.username ?? "").toLowerCase();
  const n = (row.full_name ?? "").toLowerCase();
  const kw = [
    "ai", "dev", "code", "tech", "design", "build", "startup", "saas",
    "eng", "ml", "prompt", "data", "indie", "hack", "founder",
  ];
  let s = 0;
  for (const k of kw) {
    if (h.includes(k)) s += 2;
    if (n.includes(k)) s += 1;
  }
  if (row.is_verified) s += 3;
  if (row.is_private) s -= 5; // private accounts yield no public profile data
  if (h.includes("official") || h.length > 25) s -= 2;
  return s;
}


function readLedger(): LedgerEntry[] {
  if (!existsSync(LEDGER_PATH)) return [];
  return JSON.parse(readFileSync(LEDGER_PATH, "utf8")) as LedgerEntry[];
}

function appendLedger(entry: LedgerEntry): void {
  const rows = readLedger();
  rows.push(entry);
  writeFileSync(LEDGER_PATH, JSON.stringify(rows, null, 2) + "\n");
}

/** Following-list raw files from every edge actor's dir, keyed by owner handle. */
function loadFollowingRuns(): FollowingRunFile[] {
  const dirs = [
    `${RAW_DIR}/datadoping_instagram-following-scraper`,
    `${RAW_DIR}/scraping_solutions_instagram-scraper-followers-following-no-cookies`,
  ];
  const out: FollowingRunFile[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const n of readdirSync(dir).sort()) {
      out.push(JSON.parse(readFileSync(`${dir}/${n}`, "utf8")) as FollowingRunFile);
    }
  }
  return out;
}
function loadProfileRuns(): ProfileRunFile[] {
  const dir = `${RAW_DIR}/coderx_instagram-profile-scraper-bio-posts`;
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().map((n: string) => JSON.parse(readFileSync(`${dir}/${n}`, "utf8")) as ProfileRunFile);
}

function dedupeHandles(handles: string[]): string[] {
  return [...new Set(handles.map(norm))].filter((h) => h.length > 0).sort();
}

/** Second-degree targets picked deterministically from the seed's raw rows. */
function pickTargets(seedRows: RawFollowingRow[]): RawFollowingRow[] {
  const byHandle = new Map<string, RawFollowingRow>();
  for (const r of seedRows) {
    if (!r.username || norm(r.username) === SEED) continue;
    const h = norm(r.username);
    if (!byHandle.has(h)) byHandle.set(h, r);
  }
  const seen = new Set<string>();
  const out: RawFollowingRow[] = [];
  for (const pref of PREFERRED_TARGETS) {
    const r = byHandle.get(pref);
    if (r && !seen.has(pref)) {
      seen.add(pref);
      out.push(r);
    }
  }
  for (const r of [...byHandle.values()].sort((a, b) => nicheScore(b) - nicheScore(a) || (a.username! < b.username! ? -1 : 1))) {
    const h = norm(r.username!);
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(r);
    if (out.length === 4) break;
  }
  return out;
}

async function runActor(actor: string, input: unknown, purpose: string): Promise<{
  runId: string; datasetId: string; status: string; usageTotalUsd: number;
}> {
  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${actor.replace("/", "~")}/runs?token=${token}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) },
  );
  if (!startRes.ok) throw new Error(`run start failed for ${actor}: HTTP ${startRes.status} ${await startRes.text()}`);
  const started = await startRes.json() as { data: { id: string } };
  const runId = started.data.id;
  let run: { data: { status: string; defaultDatasetId: string; usageTotalUsd: number } };
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    if (!res.ok) throw new Error(`run poll failed for ${runId}: HTTP ${res.status}`);
    run = await res.json() as typeof run;
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.data.status)) break;
  }
  const usage = run.data.usageTotalUsd ?? 0;
  const startedAt = new Date().toISOString();

  if (run.data.status !== "SUCCEEDED") {
    appendLedger({ run_id: runId, actor, purpose, items: 0, cost_usd: usage, started_at: startedAt, status: run.data.status as LedgerEntry["status"] });
    throw new Error(`run ${runId} terminal status ${run.data.status} (usage $${usage.toFixed(4)})`);
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${run.data.defaultDatasetId}/items?token=${token}&clean=true&limit=100000`,
  );
  if (!itemsRes.ok) throw new Error(`dataset fetch failed for ${runId}: HTTP ${itemsRes.status}`);
  const items = await itemsRes.json() as unknown[];
  const isEdge = actor === FOLLOWING_ACTOR || actor === EDGE_ACTOR;
  const file: FollowingRunFile | ProfileRunFile = isEdge
    ? { actor, run_id: runId, status: run.data.status, usageTotalUsd: usage, started_at: new Date().toISOString(),
        following_of: actor === EDGE_ACTOR
          ? ((items[0] as { username_scrape?: string }).username_scrape ?? (input as { Account: string[] }).Account[0])
          : (input as { usernames: string[] }).usernames[0],
        items: items as RawFollowingRow[] }
    : { actor, run_id: runId, status: run.data.status, usageTotalUsd: usage, started_at: new Date().toISOString(), items: items as RawProfileRow[] };
  const slug = actor.replace("/", "_");
  mkdirSync(`${RAW_DIR}/${slug}`, { recursive: true });
  writeFileSync(`${RAW_DIR}/${slug}/${runId}.json`, JSON.stringify(file, null, 2));
  console.log(`  run ${runId} (${actor}): ${items.length} items, $${usage.toFixed(4)}, status ${run.data.status}`);

  appendLedger({
    run_id: runId,
    actor,
    purpose,
    items: items.length,
    cost_usd: usage,
    started_at: file.started_at,
    status: run.data.status as LedgerEntry["status"],
  });
  return { runId, datasetId: run.data.defaultDatasetId, status: run.data.status, usageTotalUsd: usage };
}

async function remainingUsd(): Promise<number> {
  const res = await fetch(`https://api.apify.com/v2/users/me/limits?token=${token}`);
  if (!res.ok) throw new Error(`limits request failed: HTTP ${res.status}`);
  const body = await res.json() as { data: { limits: { maxMonthlyUsageUsd: number }; current: { monthlyUsageUsd: number } } };
  return body.data.limits.maxMonthlyUsageUsd - body.data.current.monthlyUsageUsd;
}


// ---------------------------------------------------------------------------
// --plan
// ---------------------------------------------------------------------------
async function plan(): Promise<void> {
  const followingRuns = await loadFollowingRuns();
  const seedRun = followingRuns.find((r) => r.following_of === SEED);
  const targets = pickTargets(seedRun?.items ?? []);
  const covered = dedupeHandles(followingRuns.flatMap((r) => r.items.map((i) => i.username ?? "").concat(r.following_of)));
  const secondRows = followingRuns
    .filter((r) => r.following_of !== SEED)
    .reduce((s, r) => s + r.items.length, 0);

  console.log(`mode:            --plan (NO network calls, no actor runs)`);
  console.log(`seed:            ${SEED}`);
  console.log(`second-degree targets (cap ${SECOND_DEGREE_MAX_COUNT} each):`);
  if (targets.length === 0) {
    console.log(`  (seed raw file not yet on disk — targets are discovered during --run)`);
  } else {
    for (const t of targets) {
      console.log(`  - ${t.username}  verified=${t.is_verified ?? false} private=${t.is_private ?? false}  name="${t.full_name ?? ""}"`);
    }
  }
  const seedRows = seedRun?.items.length ?? 174; // observed estimate pre-collection
  const projectedSecondRows = followingRuns.length ? secondRows : 4 * SECOND_DEGREE_MAX_COUNT;
  const uniqueNow = covered.length;
  const projectedUnique = followingRuns.length
    ? Math.max(uniqueNow, dedupeHandles([...covered, ...targets.map((t) => norm(t.username!))]).length)
    : seedRows + 1;
  const projectedProfileRows = followingRuns.length
    ? Math.min(projectedUnique, 600)
    : 600;
  const followingUsd = (seedRows + projectedSecondRows) * FOLLOWING_ROW_USD;
  const profileUsd = projectedProfileRows * PROFILE_ROW_USD + PROFILE_RUN_START_USD;
  console.log(`projected following rows: ${seedRows} (seed) + ${projectedSecondRows} (2nd degree) = ${seedRows + projectedSecondRows}`);
  console.log(`projected profile rows:   ${projectedProfileRows} of ~${projectedUnique} unique nodes (rest stay followers: null)`);
  console.log(`projected USD:            $${(followingUsd + profileUsd).toFixed(2)} (following $${followingUsd.toFixed(2)} + profiles $${profileUsd.toFixed(2)})`);
  console.log(`hard cap:                 $${HARD_CAP_USD.toFixed(2)} (+${Math.round(SAFETY_MARGIN * 100)}% safety margin enforced by --run)`);
  if (followingRuns.length) {
    console.log(`rows observed so far:     ${followingRuns.reduce((s, r) => s + r.items.length, 0)} following, unique nodes ${uniqueNow}`);
  }
}

// ---------------------------------------------------------------------------
// --run
// ---------------------------------------------------------------------------
async function run(): Promise<void> {
  const remainingBefore = await remainingUsd();
  console.log(`remaining Apify balance: $${remainingBefore.toFixed(2)}`);

  // Projection gate: only the UNPAID remainder of the plan.
  const alreadyOwners = new Set(loadFollowingRuns().map((r) => norm(r.following_of)));
  const unpaidSeedRows = alreadyOwners.has(SEED) ? 0 : 174;
  const unpaidTargetSlots = Math.max(0, 4 - [...alreadyOwners].filter((h) => h !== SEED).length);
  const unpaidTargetRows = unpaidTargetSlots * SECOND_DEGREE_MAX_COUNT;
  const projProfiles = 600; // upper bound; the profile batch is re-sized from live balance mid-run
  const projUsd = unpaidSeedRows * FOLLOWING_ROW_USD + unpaidTargetRows * EDGE_ROW_USD + projProfiles * PROFILE_ROW_USD + PROFILE_RUN_START_USD;
  const withMargin = projUsd * (1 + SAFETY_MARGIN);
  if (withMargin > remainingBefore) {
    console.error(`REFUSING to start: projection $${projUsd.toFixed(2)} (+15% = $${withMargin.toFixed(2)}) exceeds remaining $${remainingBefore.toFixed(2)}.`);
    process.exit(1);
  }
  if (withMargin > HARD_CAP_USD) {
    console.error(`REFUSING to start: projection $${projUsd.toFixed(2)} (+15% = $${withMargin.toFixed(2)}) exceeds hard cap $${HARD_CAP_USD.toFixed(2)}.`);
    process.exit(1);
  }
  console.log(`projection $${projUsd.toFixed(2)} (+15% = $${withMargin.toFixed(2)}) — within remaining balance and $2.50 cap. Proceeding.\n`);

  let spent = 0;

  // Step 1 — seed following list, complete (skip if a paid run already landed on disk).
  const already = new Set(loadFollowingRuns().map((r) => norm(r.following_of)));
  if (!already.has(SEED)) {
    console.log(`[1/3] seed following list: ${SEED}`);
    try {
      const r = await runActor(FOLLOWING_ACTOR, { usernames: [SEED], max_count: SEED_MAX_COUNT }, "seed following list");
      spent += r.usageTotalUsd;
    } catch (e) {
      console.error(`  seed run FAILED (${(e as Error).message}) — continuing.`);
    }
  } else {
    console.log(`[1/3] seed following list already on disk — skipping paid re-run`);
  }

  // Step 2 — second-degree expansion from the raw seed rows.
  const seedRows = ((await loadFollowingRuns()).find((r) => r.following_of === SEED))?.items ?? [];
  if (seedRows.length === 0) {
    console.error("No seed rows on disk — cannot expand. Stopping before second degree.");
    return;
  }
  console.log(`\n[2/3] second-degree expansion (${seedRows.length} seed rows observed)`);
  const targets = [...pickTargets(seedRows), ...EXTERNAL_TARGETS.map((h) => ({ username: h } as RawFollowingRow))];
  for (const t of targets) {
    const h = norm(t.username!);
    if (already.has(h)) {
      console.log(`  -> ${h} already on disk — skipping paid re-run`);
      continue;
    }
    console.log(`  -> ${h} (max_count ${SECOND_DEGREE_MAX_COUNT})`);
    try {
      const r = await runActor(EDGE_ACTOR, { Account: [h], resultsLimit: SECOND_DEGREE_MAX_COUNT, dataToScrape: "Followings" }, `second-degree following of ${h} (round-2 edge actor)`);
      spent += r.usageTotalUsd;
    } catch (e) {
      console.error(`  run for ${h} FAILED (${(e as Error).message}) — continuing.`);
    }
  }

  // Step 3 — profile-details enrichment over the deterministic top slice,
  // chunked at 200 profiles per run (a 584-handle batch ABORTED once).
  // NOTE: degree / directed_degree / nodes_unreachable_from_seed are NOT
  // computed here — scripts/build_graph.ts is their single owner.
  const followingRuns = await loadFollowingRuns();
  const allNodes = dedupeHandles([
    ...followingRuns.flatMap((r) => r.items.map((i) => i.username ?? "")),
    ...followingRuns.map((r) => r.following_of),
  ]);
  const enriched = new Set(loadProfileRuns().flatMap((p) => p.items.map((i) => norm(i.username ?? ""))));
  const profileBudget = Math.min(await remainingUsd(), HARD_CAP_USD) / (1 + SAFETY_MARGIN);
  const nProfiles = Math.floor((profileBudget - PROFILE_RUN_START_USD) / PROFILE_ROW_USD);
  // Private flag per node: from profile rows when present, else the observing
  // following-row flags. Private accounts cannot be scraped — skip them.
  const isPrivate = new Map<string, boolean>();
  for (const h of allNodes) {
    const probe = loadProfileRuns().flatMap((p) => p.items).find((i) => norm(i.username ?? "") === h);
    isPrivate.set(h, probe ? (probe.private ?? false) : (observedPrivate(followingRuns, h) ?? false));
  }
  const unknownPublic = allNodes.filter((h) => !enriched.has(h) && !isPrivate.get(h));
  const batch = unknownPublic.slice(0, Math.min(nProfiles, unknownPublic.length));
  console.log(`\n[3/3] profile details: ${batch.length} to fetch (unknown public nodes; ${enriched.size} already enriched, private accounts skipped; ${allNodes.length} unique nodes total; budget allows $${profileBudget.toFixed(2)})`);
  console.log(`  chunks of 200`);
  for (let i = 0; i < batch.length; i += 200) {
    const chunk = batch.slice(i, i + 200);
    try {
      const r = await runActor(PROFILE_ACTOR, { usernames: chunk }, `profile details for unknown public nodes (${chunk.length} profiles)`);
      console.log(`  chunk spend: $${r.usageTotalUsd.toFixed(4)}`);
      spent += r.usageTotalUsd;
    } catch (e) {
      console.error(`  profile chunk FAILED (${(e as Error).message}) — continuing.`);
    }
  }
  console.log(`ledger is authoritative for totals; session spend this run: $${spent.toFixed(4)}`);
  console.log(`next: bun run graph && bun run validate:universe`);
}

/** Best-known private flag from following rows for a handle. */
function observedPrivate(followingRuns: FollowingRunFile[], h: string): boolean | null {
  const rows = followingRuns.flatMap((r) => r.items).filter((i) => norm(i.username ?? "") === h);
  if (rows.length === 0) return null;
  return rows.some((r) => r.is_private === true);
}

// ---------------------------------------------------------------------------
// --replay
// ---------------------------------------------------------------------------
async function replay(): Promise<void> {
  console.log(`mode: --replay (zero network calls; verifying raw files and coverage)`);
  const followingRuns = await loadFollowingRuns();
  const profileRuns = await loadProfileRuns();
  console.log(`following runs on disk: ${followingRuns.length}, profile runs: ${profileRuns.length}`);
  for (const r of followingRuns) {
    console.log(`  ${r.actor} ${r.run_id}: owner=${r.following_of} rows=${r.items.length} usd=$${r.usageTotalUsd.toFixed(4)}`);
  }
  for (const r of profileRuns) {
    console.log(`  ${r.actor} ${r.run_id}: rows=${r.items.length} usd=$${r.usageTotalUsd.toFixed(4)}`);
  }
  const handles = dedupeHandles([
    ...followingRuns.map((r) => r.following_of),
    ...followingRuns.flatMap((r) => r.items.map((i) => i.username ?? "")),
  ]);
  console.log(`unique handles in raw: ${handles.length}`);
  console.log(`next: bun run graph && bun run validate:universe`);
}

/** One 5-profile batch through each count-actor candidate; pick the winner. */
async function probe(): Promise<void> {
  const remainingBefore = await remainingUsd();
  const projUsd = 2 * (5 * PROFILE_ROW_USD + PROFILE_RUN_START_USD);
  if (projUsd * (1 + SAFETY_MARGIN) > remainingBefore) {
    console.error(`REFUSING probe: projection $${projUsd.toFixed(4)} (+15%) exceeds remaining $${remainingBefore.toFixed(2)}.`);
    process.exit(1);
  }
  console.log(`probe: 5 profiles through both count actors (projection $${projUsd.toFixed(4)})`);
  for (const actor of [FIGUE_ACTOR, PROFILE_ACTOR]) {
    const input = actor === FIGUE_ACTOR
      ? { profiles: PROBE_HANDLES, includeRecentPosts: false }
      : { usernames: PROBE_HANDLES };
    try {
      await runActor(actor, input, "probe:count-actor");
    } catch (e) {
      console.error(`  probe run for ${actor} FAILED (${(e as Error).message}) — candidate rejected.`);
      continue;
    }
    const dir = `${RAW_DIR}/${actor.replace("/", "_")}`;
    const files = readdirSync(dir).sort();
    const latest = JSON.parse(readFileSync(`${dir}/${files[files.length - 1]}`, "utf8")) as ProfileRunFile;
    const covered = latest.items.filter((row) => typeof row.followersCount === "number" && Number.isFinite(row.followersCount)).length;
    console.log(`  ${actor}: ${covered}/${latest.items.length} rows with numeric followersCount`);
  }
}

if (mode === "--plan") await plan();
else if (mode === "--run") await run();
else if (mode === "--probe") await probe();
else await replay();
