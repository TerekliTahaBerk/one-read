// One Read — local pipeline runner.
//
// Wraps the cron HTTP endpoint so the CLI exercises the *exact* same code
// path as the Vercel cron job (and so we don't have to compile TypeScript
// in a Node script). The Next dev server must be running on PORT first.
//
// Usage:
//   1. Start the dev server in another shell:    npm run dev
//   2. Run a dry-run pipeline:                   npm run pipeline:dry
//   3. Run a real send pipeline:                 npm run pipeline:run
//
// Required env: CRON_SECRET (must match the dev server's env).
// Optional env: PIPELINE_BASE_URL (defaults to http://localhost:3000).

const baseUrl = process.env.PIPELINE_BASE_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("[pipeline-cli] CRON_SECRET is not set. Add it to .env and re-run.");
  process.exit(2);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("-n");

const url = new URL(`${baseUrl}/api/cron/daily`);
if (dryRun) url.searchParams.set("dryRun", "1");

console.log(`[pipeline-cli] POST ${url.toString()}  dryRun=${dryRun}`);

const t0 = Date.now();

try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });
  const body = await res.text();
  const elapsedMs = Date.now() - t0;
  console.log(`[pipeline-cli] ${res.status} in ${elapsedMs}ms`);
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
  if (!res.ok) process.exit(1);
} catch (err) {
  console.error(
    "[pipeline-cli] request failed:",
    err instanceof Error ? err.message : err,
  );
  console.error("  Hint: is the Next dev server running on " + baseUrl + " ?");
  process.exit(1);
}
