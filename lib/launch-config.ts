import { validateResendProductionConfiguration } from "@/lib/resend-config";
import {
  checkoutEnvVarNames,
  validatePolarConfiguration,
} from "@/lib/products/polar-config";

export interface LaunchConfigResult { ready: boolean; problems: string[] }

export function validatePublicLaunchConfiguration(env: Record<string, string | undefined> = process.env): LaunchConfigResult {
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
  // Public launch and delivery activation are deliberately separate. The flag
  // may stay off, but its intended state must be explicit for operators.
  if (!(["true", "false"] as const).includes(env.ONENEWS_DELIVERY_ENABLED as "true" | "false")) {
    problems.push("ONENEWS_DELIVERY_ENABLED must be explicitly true or false.");
  }
  return { ready: problems.length === 0, problems };
}
