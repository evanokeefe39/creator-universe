/**
 * Contract guard for data/universe.json. Fails loudly (non-zero exit, specific
 * message) on any violation. Zero network calls.
 *
 * Usage: bun run validate:universe [-- --file data/universe.json]
 */
import { tierForFollowers, type Universe } from "../lib/types";
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

// Missing meta fields
const requiredMeta = ["seed", "collected_at", "cost_usd", "actors", "run_ids", "unknown_followers", "notes"] as const;
for (const k of requiredMeta) {
  if (u.meta?.[k] === undefined) fail(`missing meta field: ${k}`);
}

const ids = new Set<string>();
for (const n of u.nodes) {
  if (n.id !== n.id.toLowerCase()) fail(`node id is not lowercase: "${n.id}"`);
  if (n.id !== n.id.trim().replace(/^@/, "")) fail(`node id is not normalized: "${n.id}"`);
  if (ids.has(n.id)) fail(`duplicate node id: "${n.id}"`);
  ids.add(n.id);
  if (n.tier !== tierForFollowers(n.followers)) fail(`node "${n.id}" tier ${n.tier} disagrees with tierForFollowers(${n.followers})`);
}

for (const e of u.edges) {
  if (!ids.has(e.source)) fail(`dangling edge endpoint: source "${e.source}" not in nodes`);
  if (!ids.has(e.target)) fail(`dangling edge endpoint: target "${e.target}" not in nodes`);
}

if (u.nodes.length < 100) fail(`nodes.length ${u.nodes.length} below minimum 100`);
if (u.edges.length < 100) fail(`edges.length ${u.edges.length} below minimum 100`);

// Connected components (undirected) via union-find.
const parent = new Map<string, string>();
for (const id of ids) parent.set(id, id);
function find(x: string): string {
  const p = parent.get(x)!;
  if (p !== x) {
    const root = find(p);
    parent.set(x, root);
    return root;
  }
  return x;
}
for (const e of u.edges) {
  const a = find(e.source);
  const b = find(e.target);
  if (a !== b) parent.set(a, b);
}
const components = new Set<string>();
for (const id of ids) components.add(find(id));

const unknown = u.nodes.filter((n) => n.followers === null).length;
const frac = u.nodes.length ? unknown / u.nodes.length : 0;
console.log(`OK: ${repoFile}`);
console.log(`nodes:               ${u.nodes.length}`);
console.log(`edges:               ${u.edges.length}`);
console.log(`unknown followers:   ${unknown} (${(frac * 100).toFixed(1)}%)`);
console.log(`connected components: ${components.size}`);
console.log(`cost_usd:            $${u.meta.cost_usd.toFixed(4)} across ${u.meta.run_ids.length} runs`);
process.exit(0);