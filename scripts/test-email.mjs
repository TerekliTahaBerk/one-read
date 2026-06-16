// OneRead — send a test email to a single address.
//
// Hits POST /api/admin/test-email. Useful for verifying templates,
// translations, and Resend deliverability without disturbing the
// real DailySend rows.
//
// Usage:
//   ADMIN_TOKEN=... npm run test:email -- you@example.com
//   npm run test:email -- you@example.com Turkish
//   npm run test:email -- you@example.com English artificial-intelligence
//
// Optional env: PIPELINE_BASE_URL (defaults to http://localhost:3000).

const baseUrl = process.env.PIPELINE_BASE_URL ?? "http://localhost:3000";
const token = process.env.ADMIN_TOKEN;
if (!token) {
  console.error("[test-email] ADMIN_TOKEN is not set. Add it to .env and re-run.");
  process.exit(2);
}

const [to, summaryLanguage, topic, difficulty] = process.argv.slice(2);
if (!to) {
  console.error("[test-email] usage: npm run test:email -- <to> [English|Turkish] [topic-slug] [difficulty]");
  process.exit(2);
}

const payload = {
  to,
  ...(summaryLanguage ? { summaryLanguage } : {}),
  ...(topic ? { topic } : {}),
  ...(difficulty ? { difficulty } : {}),
};

console.log(`[test-email] POST ${baseUrl}/api/admin/test-email`, payload);

try {
  const res = await fetch(`${baseUrl}/api/admin/test-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  console.log(`[test-email] ${res.status}`);
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
  if (!res.ok) process.exit(1);
} catch (err) {
  console.error(
    "[test-email] request failed:",
    err instanceof Error ? err.message : err,
  );
  console.error("  Hint: is the Next dev server running on " + baseUrl + " ?");
  process.exit(1);
}
