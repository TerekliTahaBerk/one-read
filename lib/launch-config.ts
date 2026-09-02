export interface LaunchConfigResult { ready: boolean; problems: string[] }

export function validatePublicLaunchConfiguration(env: Record<string, string | undefined> = process.env): LaunchConfigResult {
  const problems: string[] = [];
  const offerNames = [
    "POLAR_ONE_ARTICLE_MONTHLY_PRODUCT_ID", "POLAR_ONE_ARTICLE_ANNUAL_PRODUCT_ID",
    "POLAR_ONE_NEWS_MONTHLY_PRODUCT_ID", "POLAR_ONE_NEWS_ANNUAL_PRODUCT_ID",
    "POLAR_ONE_READ_MONTHLY_PRODUCT_ID", "POLAR_ONE_READ_ANNUAL_PRODUCT_ID",
  ];
  const offerIds = offerNames.map((name) => [name, env[name]?.trim()] as const);
  for (const [name, value] of offerIds) if (!value) problems.push(`${name} is not configured.`);
  const seen = new Map<string, string>();
  for (const [name, value] of offerIds) {
    if (!value) continue;
    const previous = seen.get(value);
    if (previous) problems.push(`${name} duplicates ${previous}.`);
    else seen.set(value, name);
  }
  const legacyIds = [env.POLAR_ONEREAD_PRODUCT_ID, env.POLAR_ONE_ARTICLE_PRODUCT_ID, "44ef8bae-87eb-40eb-9a07-8b4a97e1434e"].filter(Boolean);
  for (const [name, value] of offerIds) if (value && legacyIds.includes(value)) problems.push(`${name} reuses a legacy product ID.`);
  const required = ["POLAR_ACCESS_TOKEN", "POLAR_WEBHOOK_SECRET", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "EMAIL_VERIFICATION_SECRET"];
  for (const name of required) if (!env[name]?.trim()) problems.push(`${name} is not configured.`);
  if (env.POLAR_SERVER !== "production") problems.push("POLAR_SERVER must be explicitly set to production.");
  if (env.PUBLIC_CHECKOUT_ENABLED !== "true") problems.push("PUBLIC_CHECKOUT_ENABLED is not enabled.");
  const base = env.PUBLIC_BASE_URL?.trim();
  if (!base) problems.push("PUBLIC_BASE_URL is not configured.");
  else {
    try { if (new URL(base).protocol !== "https:") problems.push("PUBLIC_BASE_URL must use HTTPS."); }
    catch { problems.push("PUBLIC_BASE_URL is invalid."); }
  }
  // Public launch and delivery activation are deliberately separate. The flag
  // may stay off, but its intended state must be explicit for operators.
  if (!(["true", "false"] as const).includes(env.ONENEWS_DELIVERY_ENABLED as "true" | "false")) {
    problems.push("ONENEWS_DELIVERY_ENABLED must be explicitly true or false.");
  }
  return { ready: problems.length === 0, problems };
}
