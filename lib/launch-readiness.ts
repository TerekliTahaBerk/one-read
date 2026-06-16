/**
 * OneRead — launch readiness checks.
 *
 * Pure environment inspection for the admin "Launch readiness" panel.
 * NEVER returns secret values — only whether each var is configured plus a
 * short, human explanation. Non-secret config (provider name, model,
 * numeric thresholds) may be echoed since it's useful and not sensitive.
 */

import {
  MIN_ARTICLE_SCORE,
  MIN_DELIVERY_SCORE,
  MIN_SUMMARY_CONFIDENCE,
} from "./thresholds";

export type ReadinessStatus = "pass" | "warn" | "missing";

export interface ReadinessCheck {
  key: string;
  /** "pass" = good, "warn" = works but degraded/dev-only, "missing" = blocks that capability. */
  status: ReadinessStatus;
  /** Short, secret-free explanation. */
  explanation: string;
}

const has = (v: string | undefined): boolean => !!v && v.trim().length > 0;

export function getLaunchReadiness(): ReadinessCheck[] {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  const hasOpenAi = has(process.env.OPENAI_API_KEY);
  const hasAnthropic = has(process.env.ANTHROPIC_API_KEY);
  const providerKeyOk =
    provider === "openai"
      ? hasOpenAi
      : provider === "anthropic"
        ? hasAnthropic
        : hasOpenAi || hasAnthropic;

  const checks: ReadinessCheck[] = [];

  checks.push({
    key: "PRISMA_DATABASE_URL",
    status: has(process.env.PRISMA_DATABASE_URL) ? "pass" : "missing",
    explanation: has(process.env.PRISMA_DATABASE_URL)
      ? "Database connection configured."
      : "Missing — the app cannot read or write data.",
  });

  checks.push({
    key: "RESEND_API_KEY",
    status: has(process.env.RESEND_API_KEY) ? "pass" : "warn",
    explanation: has(process.env.RESEND_API_KEY)
      ? "Email delivery enabled."
      : "Missing — real email delivery is disabled. Rendering-only mode.",
  });

  const hasFrom =
    has(process.env.FROM_EMAIL) || has(process.env.RESEND_FROM);
  checks.push({
    key: "FROM_EMAIL",
    status: hasFrom ? "pass" : "warn",
    explanation: hasFrom
      ? "Verified sender configured."
      : "Missing — using dev fallback sender (only delivers to the Resend account owner).",
  });

  checks.push({
    key: "PUBLIC_BASE_URL",
    status: has(process.env.PUBLIC_BASE_URL) ? "pass" : "warn",
    explanation: has(process.env.PUBLIC_BASE_URL)
      ? "Email links use your configured origin."
      : "Missing — email links fall back to https://oneread.app.",
  });

  checks.push({
    key: "CRON_SECRET",
    status: has(process.env.CRON_SECRET) ? "pass" : "missing",
    explanation: has(process.env.CRON_SECRET)
      ? "Daily cron endpoint is protected."
      : "Missing — the daily cron endpoint rejects all calls (no automated runs).",
  });

  checks.push({
    key: "ADMIN_TOKEN",
    status: has(process.env.ADMIN_TOKEN) ? "pass" : "missing",
    explanation: has(process.env.ADMIN_TOKEN)
      ? "Admin pages and admin APIs are protected."
      : "Missing — admin tooling is disabled.",
  });

  checks.push({
    key: "AI_PROVIDER",
    status: provider === "openai" || provider === "anthropic" ? "pass" : "warn",
    explanation:
      provider === "openai" || provider === "anthropic"
        ? `Set to "${provider}".`
        : "Missing — real LLM scoring/summaries are disabled. Dev heuristic mode is being used.",
  });

  checks.push({
    key: "OPENAI_API_KEY / ANTHROPIC_API_KEY",
    status: providerKeyOk ? "pass" : provider ? "missing" : "warn",
    explanation: providerKeyOk
      ? `API key present (${hasOpenAi ? "OpenAI" : ""}${hasOpenAi && hasAnthropic ? " + " : ""}${hasAnthropic ? "Anthropic" : ""}).`
      : provider
        ? `Missing — AI_PROVIDER="${provider}" but its API key is not set. LLM calls will fail and fall back/reject.`
        : "Missing — no LLM key. Real summaries disabled until a provider + key are set.",
  });

  const model = process.env.AI_MODEL;
  checks.push({
    key: "AI_MODEL",
    status: "pass",
    explanation: has(model)
      ? `Overridden to "${model}".`
      : "Not set — using the provider's safe default model.",
  });

  checks.push({
    key: "MIN_ARTICLE_SCORE",
    status: "pass",
    explanation: `Effective value ${MIN_ARTICLE_SCORE} (quality bar to become a pick).`,
  });
  checks.push({
    key: "MIN_DELIVERY_SCORE",
    status: "pass",
    explanation: `Effective value ${MIN_DELIVERY_SCORE} (personalized score needed to send).`,
  });
  checks.push({
    key: "MIN_SUMMARY_CONFIDENCE",
    status: "pass",
    explanation: `Effective value ${MIN_SUMMARY_CONFIDENCE} (LLM confidence needed to mark READY).`,
  });

  return checks;
}
