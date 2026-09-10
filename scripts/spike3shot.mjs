/**
 * Captures /tiers in both lighting setups (Spike 3 evidence).
 * Same CDP workaround as scripts/screenshot.ts — see that file's header.
 *
 * Usage: node scripts/spike3shot.mjs (dev server on :3111)
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const SHELL = `${process.env.LOCALAPPDATA}/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe`;
const PORT = 9512;

async function main() {
  const proc = spawn(SHELL, [
    "--headless", "--enable-unsafe-swiftshader", "--use-angle=swiftshader",
    `--remote-debugging-port=${PORT}`, "--no-proxy-server", "--no-first-run", "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) break;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  const b = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const ctx = b.contexts()[0] ?? (await b.newContext());
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("http://127.0.0.1:3111/tiers", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "docs/evidence/spike3-tier-grid.png", fullPage: true });
  // Toggle to single-directional via a real button click.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((x) => x.textContent?.includes("Single directional"));
    btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "docs/evidence/spike3-tier-grid-directional.png", fullPage: true });
  await page.close();
  await b.close();
  proc.kill();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});