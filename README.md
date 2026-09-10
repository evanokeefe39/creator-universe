# creator-universe

Map a niche creator ecosystem as an interactive 3D field.

A large Instagram creator follows a surprisingly small number of accounts — and
that list is curated, not incidental. Expanding it one degree (their follows,
then the follows of a few mid-tier accounts inside that list) yields a follow
graph spanning 100k+, 10k–100k, 1k–10k and sub-1k accounts. Rendered as
faceted low-poly celestial bodies — follower count as mass, in-network
connections as gravity — the structure of a niche becomes visible at a glance.

**Question this project answers:** who are the high-authority accounts in a
niche that a follower-count search would never surface?

## Status

Spike phase. Six spikes (`docs/SPIKES.md`) test collection feasibility, force
layout at scale, the low-poly aesthetic, zoom/label behaviour, and HUD
integration — before committing to a full build. See `tasks/epics/` for the
epic and user stories.

## Quick start

```bash
bun install
cp .env.example .env        # then fill APIFY_API_TOKEN
bun run apify:budget        # check remaining Apify balance
bun run collect -- --plan   # project the cost — no API calls
bun run collect -- --run    # collect (spends Apify budget)
bun run graph               # build data/universe.json
bun run validate:universe   # contract checks
bun dev                     # http://localhost:3000
```

## Layout

```
app/                    Next.js App Router routes
components/             React components (scene, HUD, panels)
lib/                    Pure TypeScript: types, force layout, geometry
lib/data/               Data contract + loader for data/universe.json
scripts/                Collection, graph assembly, validation, budget check
data/universe.json      Derived graph artefact — the app's data contract
data/cost_ledger.json   Append-only record of every paid Apify run
data/raw/               Raw Apify responses (gitignored, immutable)
docs/SPEC.md            Product spec
docs/SPIKES.md          Spike plan, outcomes and go/no-go decisions
tasks/epics/            Epic + user-story governance (git-tracked)
```

## Gates

`bun run check` runs lint, typecheck and build. CI runs the same plus the
universe-artefact validation. A PR must not merge red.

## Conventions

Conventional commits, `feat/*`/`fix/*`/`chore/*`/`spike/*` branches,
squash-merge to `main`, linear history. `AGENTS.md` is the operating contract
for agents working in this repo; `LEARNINGS.md` records corrections.
