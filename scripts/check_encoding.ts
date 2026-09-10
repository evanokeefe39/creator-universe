/**
 * Encoding guard. Proves the properties the renderer depends on and that a
 * regression would silently break — size inversion, and clusters collapsing
 * onto one centre are both invisible to a type check and to `validate:universe`.
 *
 * Run: bun run check:encoding [-- --file data/universe.json]
 *
 * Exits non-zero with a specific message on any violation.
 */
import { bodyRadius } from "../lib/gravity";
import { DEFAULT_PARAMS, massOf, simulate } from "../lib/layout";
import type { Universe } from "../lib/types";
import * as fs from "node:fs";

const fileArgIdx = process.argv.indexOf("--file");
const file = fileArgIdx >= 0 ? process.argv[fileArgIdx + 1] : "data/universe.json";
if (!file) {
  console.error("--file flag given but no path followed it");
  process.exit(1);
}
const repoFile = file.startsWith("/") || file.includes(":") ? file : `${import.meta.dir}/../${file}`;
if (!fs.existsSync(repoFile)) {
  console.error(`FAIL: file not found: ${repoFile}`);
  process.exit(1);
}
const u = JSON.parse(fs.readFileSync(repoFile, "utf8")) as Universe;

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const known = u.nodes.filter((n) => n.followers !== null);
const unknown = u.nodes.filter((n) => n.followers === null);

// 1. Radius is non-decreasing in followers across every adjacent pair.
const byFollowers = [...known].sort((a, b) => (a.followers! - b.followers!) || a.id.localeCompare(b.id));
let inversions = 0;
for (let i = 1; i < byFollowers.length; i++) {
  if (bodyRadius(byFollowers[i]) < bodyRadius(byFollowers[i - 1]) - 1e-12) inversions++;
}
if (inversions > 0) fail(`bodyRadius is not monotonic in followers: ${inversions} adjacent inversion(s)`);

// 2. Strictly increasing across DISTINCT follower counts. Equal counts may
//    share a radius; a larger count may never render smaller.
let strictViolations = 0;
for (let i = 1; i < byFollowers.length; i++) {
  const prev = byFollowers[i - 1];
  const cur = byFollowers[i];
  if (cur.followers! > prev.followers! && bodyRadius(cur) <= bodyRadius(prev)) strictViolations++;
}
if (strictViolations > 0) fail(`bodyRadius is not strictly increasing across distinct follower counts: ${strictViolations} violation(s)`);

// 3. An uncollected count can never out-rank a collected one.
const maxUnknownRadius = unknown.length ? Math.max(...unknown.map(bodyRadius)) : 0;
const minKnownRadius = known.length ? Math.min(...known.map(bodyRadius)) : 0;
if (unknown.length && known.length && maxUnknownRadius >= minKnownRadius) {
  fail(`an unknown-follower node renders at ${maxUnknownRadius.toFixed(3)}, at or above the smallest known node ${minKnownRadius.toFixed(3)}`);
}

// 4. Mass obeys the same ordering as radius.
for (let i = 1; i < byFollowers.length; i++) {
  const prev = byFollowers[i - 1];
  const cur = byFollowers[i];
  if (cur.followers! > prev.followers! && massOf(cur) <= massOf(prev)) {
    fail(`mass is not strictly increasing across distinct follower counts at "${cur.id}"`);
  }
}
if (unknown.length && known.length && massOf(unknown[0]) >= Math.min(...known.map(massOf))) {
  fail("an unknown-follower node is at least as heavy as the lightest known node");
}

const radii = new Set(u.nodes.map((n) => bodyRadius(n).toFixed(6)));
const mrbeast = u.nodes.find((n) => n.id === "mrbeast");
const justyn = u.nodes.find((n) => n.id === "justyn.ai");
if (mrbeast && justyn && bodyRadius(mrbeast) <= bodyRadius(justyn)) {
  fail(`size inversion persists: mrbeast (${mrbeast.followers} followers) renders ${bodyRadius(mrbeast).toFixed(3)} vs justyn.ai (${justyn.followers}) at ${bodyRadius(justyn).toFixed(3)}`);
}

// 5. Clusters settle on distinct centres — the whole point of the layout.
const { positions } = simulate(u.nodes, u.edges, DEFAULT_PARAMS);
const byCluster = new Map<string, typeof u.nodes>();
for (const n of u.nodes) {
  if (n.cluster === null) continue;
  const bucket = byCluster.get(n.cluster);
  if (bucket) bucket.push(n);
  else byCluster.set(n.cluster, [n]);
}
const centres: { key: string; dominant: string; p: [number, number, number] }[] = [];
for (const [key, group] of [...byCluster.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  let heaviest = group[0];
  for (const n of group) if ((n.followers ?? -1) > (heaviest.followers ?? -1)) heaviest = n;
  centres.push({ key, dominant: heaviest.id, p: positions.get(heaviest.id) ?? [0, 0, 0] });
}
if (centres.length < 2) fail(`only ${centres.length} cluster(s) with members — the layout has nothing to separate`);

let coincident = 0;
let minSeparation = Infinity;
let closest = "";
for (let i = 0; i < centres.length; i++) {
  for (let j = i + 1; j < centres.length; j++) {
    const a = centres[i].p;
    const b = centres[j].p;
    const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (d < 1e-6) coincident++;
    if (d < minSeparation) {
      minSeparation = d;
      closest = `${centres[i].key} <-> ${centres[j].key}`;
    }
  }
}
if (coincident > 0) fail(`${coincident} cluster centre pair(s) coincide — clusters have collapsed onto one point`);

console.log(`OK: ${repoFile}`);
console.log(`nodes with a known follower count: ${known.length} / ${u.nodes.length}`);
console.log(`distinct radii:      ${radii.size} (across ${u.nodes.length} nodes)`);
console.log(`radius range:        ${Math.min(...u.nodes.map(bodyRadius)).toFixed(2)} .. ${Math.max(...u.nodes.map(bodyRadius)).toFixed(2)}`);
if (mrbeast && justyn) {
  console.log(`mrbeast:             ${mrbeast.followers} followers -> r ${bodyRadius(mrbeast).toFixed(2)}`);
  console.log(`justyn.ai:           ${justyn.followers} followers -> r ${bodyRadius(justyn).toFixed(2)}`);
}
console.log(`clusters with members: ${centres.length}`);
console.log(`closest centre pair: ${closest} at ${minSeparation.toFixed(1)} units`);
for (const c of centres) {
  const r = Math.hypot(c.p[0], c.p[1], c.p[2]);
  console.log(`  ${c.key.padEnd(20)} dominant=${c.dominant.padEnd(20)} centre r=${r.toFixed(1)}`);
}
console.log(`mass range:          ${Math.min(...u.nodes.map(massOf)).toFixed(2)} .. ${Math.max(...u.nodes.map(massOf)).toFixed(2)}`);
process.exit(0);
