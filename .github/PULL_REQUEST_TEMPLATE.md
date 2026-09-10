---
name: Pull Request
about: Standard PR
title: ""
labels: ""
assignees: ""
---

## Summary

<!-- What does this change and why? One paragraph. -->

## Contract impact

<!-- Does this change the data contract (data/universe.json), a public
component API, or a cost-bearing script? If yes, name the contract and every
consumer updated. If no, say "none". -->

## Checklist

- [ ] `bun run check` passes (lint + typecheck + build)
- [ ] Evidence attached — screenshot for UI changes, query output for data
      changes, projected cost for any Apify run
- [ ] New data artefacts validated against their quality contract
      (node count, edge referential integrity, null-rate)
- [ ] No secrets, no `data/raw/`, no `node_modules` in the diff
- [ ] `.env.example` updated if a new env var was introduced
- [ ] `LEARNINGS.md` entry added if this PR corrects a mistaken assumption
