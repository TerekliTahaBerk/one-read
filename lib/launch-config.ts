import { validateResendProductionConfiguration } from "@/lib/resend-config";
import {
  checkoutEnvVarNames,
  validatePolarConfiguration,
} from "@/lib/products/polar-config";
import { validateCronHeartbeatUrl } from "@/lib/cron-heartbeat";

export interface LaunchConfigResult { ready: boolean; problems: string[] }

/**
 * Configuration required to start a customer checkout.
 *
 * Delivery cron monitoring is deliberately not part of this narrower gate:
 * a missing operational heartbeat must stay visible in the full launch check,
 * but it cannot make an otherwise valid payment session return 503.
 */
export function validatePublicCheckoutConfiguration(env: Record<string, string | undefined> = process.env): LaunchConfigResult {
  const problems: string[] = [];
  // Offer identity, the env var names and the closed legacy product ids all
  // come from the product registry. Restating them here is exactly the drift
  // this checklist exists to catch, so it asks the registry instead.
  for (const name of checkoutEnvVarNames()) {
    if (!env[name]?.trim()) problems.push(`${name} is not configured.`);
  }
  for (const problem of validatePolarConfiguration(env)) {
    // Missing ids are already reported per variable just above, which reads
    // better on a checklist than one combined line.
    if (problem.code === "offer_config_missing") continue;
    if (problem.severity === "error") problems.push(problem.message);
  }
  const required = ["POLAR_ACCESS_TOKEN", "POLAR_WEBHOOK_SECRET", "EMAIL_VERIFICATION_SECRET"];
  for (const name of required) if (!env[name]?.trim()) problems.push(`${name} is not configured.`);
  problems.push(...validateResendProductionConfiguration(env));
  if (env.POLAR_SERVER !== "production") problems.push("POLAR_SERVER must be explicitly set to production.");
  if (env.PUBLIC_CHECKOUT_ENABLED !== "true") problems.push("PUBLIC_CHECKOUT_ENABLED is not enabled.");
  const base = env.PUBLIC_BASE_URL?.trim();
  if (!base) problems.push("PUBLIC_BASE_URL is not configured.");
  else {
    try { if (new URL(base).protocol !== "https:") problems.push("PUBLIC_BASE_URL must use HTTPS."); }
    catch { problems.push("PUBLIC_BASE_URL is invalid."); }
  }
  return { ready: problems.length === 0, problems };
}

export function validatePublicLaunchConfiguration(env: Record<string, string | undefined> = process.env): LaunchConfigResult {
  const problems = [...validatePublicCheckoutConfiguration(env).problems];
  const dailyHeartbeat = validateCronHeartbeatUrl(env.BETTER_STACK_DAILY_CRON_HEARTBEAT_URL);
  if (dailyHeartbeat === "missing") problems.push("BETTER_STACK_DAILY_CRON_HEARTBEAT_URL is not configured.");
  if (dailyHeartbeat === "invalid_url") problems.push("BETTER_STACK_DAILY_CRON_HEARTBEAT_URL must be a valid credential-free HTTPS URL.");
  if (env.ONENEWS_DELIVERY_ENABLED === "true") {
    const newsHeartbeat = validateCronHeartbeatUrl(env.BETTER_STACK_NEWS_CRON_HEARTBEAT_URL);
    if (newsHeartbeat === "missing") problems.push("BETTER_STACK_NEWS_CRON_HEARTBEAT_URL is required while OneNews delivery is enabled.");
    if (newsHeartbeat === "invalid_url") problems.push("BETTER_STACK_NEWS_CRON_HEARTBEAT_URL must be a valid credential-free HTTPS URL.");
  }
  // Public launch and delivery activation are deliberately separate. The flag
  // may stay off, but its intended state must be explicit for operators.
  if (!(["true", "false"] as const).includes(env.ONENEWS_DELIVERY_ENABLED as "true" | "false")) {
    problems.push("ONENEWS_DELIVERY_ENABLED must be explicitly true or false.");
  }
  return { ready: problems.length === 0, problems };
}
