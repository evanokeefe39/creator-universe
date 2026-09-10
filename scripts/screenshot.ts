/**
 * Deterministic screenshot + interaction evidence for Spikes 2–5.
 *
 * Playwright's own browser-launch handshake hangs on this machine, so the
 * script spawns the cached chromium headless shell with --remote-debugging-port
 * and connects over CDP. Expects a dev server at BASE_URL (default :3111).
 *
 * Usage: bun run scripts/screenshot.ts
 */
import { chromium } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3111";
const OUT = join(process.cwd(), "docs", "evidence");
const VIEWPORT = { width: 1280, height: 800 };
const CDP_PORT = 9300 + Math.floor(Math.random() * 400);
const SHELL = join(
  process.env.LOCALAPPDATA ?? "",
  "ms-playwright",
  "chromium_headless_shell-1243",
  "chrome-headless-shell-win64",
  "chrome-headless-shell.exe",
);

mkdirSync(OUT, { recursive: true });

type Hooks = {
  ready: boolean;
  isSynthetic: boolean;
  select: (id: string) => void;
  deselect: () => void;
  setTierVisible: (tier: number, visible: boolean) => void;
  zoomTo: (distance: number) => void;
  camera: () => { position: [number, number, number]; distance: number };
  proj: () => Record<string, { x: number; y: number }>;
  nodeCount: () => { visible: number; total: number };
  search: (q: string) => void;
  selected: () => string | null;
};


let browserProcess: ChildProcess | null = null;

async function waitForCdp(port: number): Promise<void> {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("chromium did not expose its CDP port in time");
}

async function main(): Promise<void> {
  browserProcess = spawn(SHELL, [
    "--headless",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${join(process.env.TEMP ?? ".", "cu-playwright-profile")}`,
    "--no-proxy-server", "--no-first-run",
    "about:blank",
  ], { stdio: "ignore" });
  await waitForCdp(CDP_PORT);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[console.error]", msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => console.log("[pageerror]", String(err).slice(0, 300)));
  const results: string[] = [];

  // ---- Spike 2: layout diagnostics (flat colour, no labels, convergence) ----
  await page.goto(`${BASE}/diagnostics`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, "spike2-layout.png") });
  results.push("spike2-layout.png");
  await page.screenshot({ path: join(OUT, "spike2-params.png") });
  results.push("spike2-params.png (two charge values side by side)");

  // ---- Spike 3: tier grid ----
  await page.goto(`${BASE}/tiers`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, "spike3-tier-grid.png"), fullPage: true });
  results.push("spike3-tier-grid.png");

  // ---- Spike 4: zoom levels ----
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { __cu?: Hooks }).__cu?.ready === true, undefined, { timeout: 90000 });
  await page.waitForTimeout(1200);
  for (const [level, dist] of [["close", 70], ["mid", 300], ["far", 620]] as const) {
    await page.evaluate((d: number) => ((window as unknown as { __cu: Hooks }).__cu!).zoomTo(d), dist);
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, `spike4-zoom-${level}.png`) });
    const labels = await page.evaluate(() => {
      const m = (document.body.innerText.match(/labels\s*(\d+)\/30/) ?? [])[1];
      return m ? Number(m) : -1;
    });
    results.push(`spike4-zoom-${level}.png visible-labels=${labels}`);
  }

  // ---- Spike 5: interactions ----
  await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).zoomTo(120));
  await page.waitForTimeout(600);
  const proj = await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).proj());
  const pick = Object.entries(proj).find(([, p]) => p.x > 80 && p.x < 1100 && p.y > 120 && p.y < 620);
  if (!pick) throw new Error("no projected body available to click");
  const [pickId, pickPos] = pick;

  await page.mouse.click(pickPos.x, pickPos.y);
  await page.waitForTimeout(400);
  const selectedByClick = await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).selected());
  results.push(`canvas click on ${pickId} selected=${selectedByClick} (expected ${pickId})`);
  await page.screenshot({ path: join(OUT, "spike5-selected.png") });

  const panelText = await page.evaluate(() => document.querySelector("aside")?.textContent ?? "");
  results.push(`detail panel shows handle: ${panelText.includes(pickId)}`);

  // Clicking an opaque HUD panel must NOT change selection.
  await page.click("#cu-search");
  await page.waitForTimeout(200);
  const afterHudClick = await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).selected());
  results.push(`HUD panel click changed selection: ${afterHudClick !== selectedByClick} (expected false)`);

  // Filter tier 6 out; visible count must drop.
  const before = await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).nodeCount());
  await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).setTierVisible(6, false));
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).nodeCount());
  results.push(`tier-6 filter: ${before.visible} -> ${after.visible} visible (total ${before.total})`);
  await page.screenshot({ path: join(OUT, "spike5-filtered.png") });

  // Drag on canvas moves the camera (OrbitControls alive under the HUD).
  const beforePos = await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).camera().position);
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(760, 350, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const afterPos = await page.evaluate(() => ((window as unknown as { __cu: Hooks }).__cu!).camera().position);
  const moved = Math.hypot(beforePos[0] - afterPos[0], beforePos[1] - afterPos[1], beforePos[2] - afterPos[2]);
  results.push(`camera moved by drag: ${moved.toFixed(1)} units (expected > 1)`);

  await page.close();
  await browser.close();
  browserProcess?.kill();
  for (const r of results) console.log(r);
  console.log(`evidence files: ${readdirSync(OUT).join(", ")}`);
}

main().catch((e) => {
  console.error("screenshot run failed:", e);
  process.exit(1);
});