<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# creator-universe — Agent operating context

Read this file at the start of every session. It is the operating contract for
this repo, not a style guide.

## What this repo is

A niche creator-discovery instrument. It maps an Instagram creator ecosystem as
an interactive 3D "solar system": seed account → its following list → the
following lists of accounts inside that list → a follower-graph whose structure
is rendered as faceted low-poly celestial bodies.

The thesis being tested: **a large creator's following list is a hand-curated
directory of authority in their niche.** Mapping who follows whom reveals
mid-tier and small accounts that a follower-count search would never surface.

Companion repo: `~/repos/datalake` (Python, Instagram analytics lakehouse).
That repo owns post/label/engagement data. This repo owns the *network* —
the follow graph — and its visualization. Do not duplicate datalake's concerns
here; read from it when a join is needed.

## Repository rules

- **Never use `pip`.** This repo is TypeScript/Node. Package manager is **bun**.
- **Never use PowerShell.** No exceptions.
- Branch per change: `feat/*`, `fix/*`, `chore/*`, `spike/*`. Squash-merge to
  `main` via PR. **No direct pushes to `main`.**
- Conventional commits only: `type(scope): summary`.
- `main` history is linear. Rebase before squash-merge; never merge-commit.
- Secrets live in `.env` only. `.env` is gitignored; `.env.example` documents
  the required keys with empty values.

## Commands

| Purpose | Command |
|---|---|
| Dev server | `bun dev` |
| Production build | `bun run build` |
| Lint | `bun run lint` |
| Type check | `bun run typecheck` |
| Full gate | `bun run check` (lint + typecheck + build) |
| Collect data (Apify) | `bun run collect -- --plan` (dry-run) / `--run` |
| Build graph JSON | `bun run graph` |

## Architecture

| Path | Owns |
|---|---|
| `app/` | Next.js App Router routes and pages |
| `components/` | React components (HUD, scene, panels) |
| `lib/` | Pure TypeScript: types, force simulation, geometry, graph math |
| `lib/data/` | Data contract types + loaders (the JSON the app reads) |
| `scripts/` | One-shot Node/bun scripts: Apify collection, graph assembly |
| `data/raw/` | Raw Apify run responses (gitignored; provenance, never hand-edited) |
| `data/universe.json` | The derived graph artifact the app consumes (committed) |
| `public/` | Static assets |
| `tasks/epics/` | Git-tracked epic + user-story governance (see below) |

### The data contract

`data/universe.json` is the single interface between pipeline and app:

```ts
type Universe = {
  meta: { seed: string; collected_at: string; cost_usd: number; actor: string; run_ids: string[] };
  nodes: Node[];
  edges: Edge[];
};
type Node = {
  id: string;            // instagram handle, lowercase
  followers: number | null;   // null = not enriched (unknown, never guessed)
  engagement_rate: number | null;
  tier: 1|2|3|4|5|6;     // log bucket; null follower count → tier from in-network degree
  degree: number;        // shortest hop distance from seed
  in_network_followers: number; // how many mapped nodes follow this one
  sub_niche: string | null;
  is_verified: boolean;
  is_private: boolean;
};
type Edge = { source: string; target: string }; // source follows target
```

**Rules for this contract:**
- `followers: null` means unknown. Never fabricate a count or a tier from a
  guess. The renderer must handle null explicitly (render as "unknown", not 0).
- Raw Apify responses in `data/raw/` are append-only as-observed records. Never
  edit them. The derived `data/universe.json` is regenerated from them.
- Every `data/universe.json` carries `meta.cost_usd` and `meta.run_ids` so a
  number in the UI can always be traced to a paid run.

### Budget discipline

The Apify account is a metered budget, not an unlimited resource. Before any
collection run:
1. Run the collector's `--plan` mode, which prints projected item count and USD.
2. Compare against the remaining monthly Apify balance (`bun run apify:budget`).
3. Only then run with `--run`. Never launch an unbounded scrape.

Cost model (Bronze plan, verified 2026-09-10):

| Need | Actor | Unit price |
|---|---|---|
| Following lists (edges) | `datadoping/instagram-following-scraper` | $0.0014 / row |
| Profile details (follower counts) | `coderx/instagram-profile-scraper-bio-posts` | $0.0011 / profile |

## Table/artefact naming

Domain-scoped Artefacts, not generic names:

- `data/raw/apify/<actor>/<run_id>.json` — raw run output, immutable
- `data/universe.json` — derived graph (the app contract)
- `data/cost_ledger.json` — append-only record of every paid run and its cost

## Epics and user stories

Canonical store: **`tasks/epics/`** — one directory per epic, stories under
`tasks/epics/<epic_slug>/user-stories/`. Registry at `tasks/epics/README.md`.

- **Only `tasks/epics/` is git-tracked** (`.gitignore` ignores the rest of
  `tasks/`). Governance content is versioned; working notes are not.
- One user story → one epic. Cross-epic relevance is a `relates-to` link.
- New stories are authored in the store with As-a/I-want/So-that, binary
  acceptance criteria, a DoD checklist, and named tests.

## Design process

Non-trivial changes go through a **panel review** before planning. For this
repo the standing panel is:

- **Data Engineer** — collection cost, rate limits, provenance, idempotency
- **Frontend/3D Engineer** — scene performance, render loop, state boundaries
- **UX/Design** — information hierarchy under zoom, label density, HUD legibility

## Verification standard

**Run it, don't claim it.** For any UI change, drive the actual page in a real
browser and capture a screenshot — a passing typecheck proves nothing about
what renders. For any data change, query the real artefact and show the numbers.
A green CI badge is not evidence that the output is correct.

## Non-negotiables

- Never fabricate data, metrics, or costs. Unknown is `null`, not a guess.
- Never commit `.env`, raw credentials, or `node_modules`.
- Never commit a red tree. `bun run check` must pass before a PR.
- Never publish a derived artefact that has not been validated against its
  quality contract (node count, edge referential integrity, null-rate).
- Never suppress a failing test to get a green build.

## Two lessons that cost real time

1. **Model against real data, never fixtures.** A pipeline validated only on a
   hand-written 3-node fixture will break on the first real 400-node
   following list. Read one real artefact before writing the transform.
2. **Cost is a correctness property.** A collection script with no plan/dry-run
   mode has no way to fail safely; it just spends money. The `--plan` gate is
   mandatory, not a convenience.

## Deep links

When you deliver an artefact (dataset, screenshot, doc, page), include a
clickable link in the reply — `file:///` for local files, `https://` for web.
A bare path is not enough.
