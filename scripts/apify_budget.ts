/**
 * Print the live Apify monthly budget state.
 *
 * Usage: bun run apify:budget
 */
export {};
const token = process.env.APIFY_API_TOKEN;
if (!token) {
  console.error("APIFY_API_TOKEN missing (expected in repo-root .env)");
  process.exit(1);
}
const res = await fetch(`https://api.apify.com/v2/users/me/limits?token=${token}`);
if (!res.ok) {
  console.error(`Apify limits request failed: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const body = await res.json() as {
  data: {
    limits: { maxMonthlyUsageUsd: number };
    current: { monthlyUsageUsd: number };
    monthlyUsageCycle: { startAt: string; endAt: string };
  };
};
const monthlyUsageUsd = body.data.current.monthlyUsageUsd;
const maxMonthlyUsageUsd = body.data.limits.maxMonthlyUsageUsd;
const remaining = maxMonthlyUsageUsd - monthlyUsageUsd;


console.log(`monthlyUsageUsd:     $${monthlyUsageUsd.toFixed(2)}`);
console.log(`maxMonthlyUsageUsd:  $${maxMonthlyUsageUsd.toFixed(2)}`);
console.log(`remaining:           $${remaining.toFixed(2)}`);