// One Read — manual ingestion runner.
//
// Runs the RSS ingest stage by hitting the admin dry-run endpoint with
// `?stage=ingest`. The pipeline route already supports `dryRun=1`, so we
// just call the cron endpoint with that flag and report the ingest counts.
//
// Usage:  npm run pipeline:ingest
//
// Required env: CRON_SECRET (must match the dev server's env).
// Optional env: PIPELINE_BASE_URL (defaults to http://localhost:3000).

const baseUrl = process.env.PIPELINE_BASE_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("[pipeline-ingest] CRON_SECRET is not set. Add it to .env and re-run.");
  process.exit(2);
}

const url = new URL(`${baseUrl}/api/cron/daily`);
url.searchParams.set("dryRun", "1");

console.log(`[pipeline-ingest] POST ${url.toString()}`);
console.log("[pipeline-ingest] Note: this runs the full dry pipeline (ingest + extract + score + pick) but does not send emails.");

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
  console.log(`[pipeline-ingest] ${res.status} in ${elapsedMs}ms`);
  try {
    const parsed = JSON.parse(body);
    console.log(JSON.stringify(parsed, null, 2));
  } catch {
    console.log(body);
  }
  if (!res.ok) process.exit(1);
} catch (err) {
  console.error(
    "[pipeline-ingest] request failed:",
    err instanceof Error ? err.message : err,
  );
  console.error("  Hint: is the Next dev server running on " + baseUrl + " ?");
  process.exit(1);
}
