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

  // Billing provider. Polar is the production provider for OneArticle. Mock is
  // retained for local fixtures only.
  const billingProvider = (process.env.BILLING_PROVIDER || "").toLowerCase();
  const isProd = process.env.NODE_ENV === "production";
  const mockPreview = process.env.MOCK_BILLING_PREVIEW === "true";
  const polarServer = (process.env.POLAR_SERVER || "sandbox").toLowerCase();
  const missingPolar = [
    !has(process.env.POLAR_ACCESS_TOKEN) ? "POLAR_ACCESS_TOKEN" : null,
    !has(process.env.POLAR_SUCCESS_URL) && !has(process.env.PUBLIC_BASE_URL)
      ? "POLAR_SUCCESS_URL or PUBLIC_BASE_URL"
      : null,
    !has(process.env.POLAR_WEBHOOK_SECRET) ? "POLAR_WEBHOOK_SECRET" : null,
  ].filter((key): key is string => Boolean(key));
  let billingStatus: ReadinessStatus;
  let billingExplanation: string;
  if (!billingProvider) {
    billingStatus = isProd ? "missing" : "warn";
    billingExplanation = isProd
      ? "Missing — no payment provider configured. Paid subscriptions cannot be charged."
      : "Not set — defaults to the dev mock provider locally.";
  } else if (billingProvider === "mock") {
    billingStatus = isProd && !mockPreview ? "missing" : isProd ? "warn" : "pass";
    billingExplanation =
      isProd && !mockPreview
        ? "Mock billing is enabled in production — fake paid access is blocked. Set BILLING_PROVIDER=polar."
        : isProd
          ? "Mock billing in production via MOCK_BILLING_PREVIEW (staging/preview only)."
          : "Dev mock provider — simulates the paid lifecycle, no real charges.";
  } else if (billingProvider === "polar") {
    const polarReady = missingPolar.length === 0;
    const sandboxInProd = isProd && polarServer === "sandbox";
    billingStatus = polarReady && !sandboxInProd ? "pass" : "missing";
    billingExplanation = !polarReady
      ? `Polar selected but missing: ${missingPolar.join(", ")}.`
      : sandboxInProd
        ? "Polar is configured, but POLAR_SERVER=sandbox in production."
        : `Polar configured (${polarServer}).`;
  } else if (billingProvider === "stripe") {
    const stripeReady =
      has(process.env.STRIPE_SECRET_KEY) &&
      has(process.env.STRIPE_WEBHOOK_SECRET) &&
      has(process.env.STRIPE_ONE_ARTICLE_MONTHLY_PRICE_ID) &&
      has(process.env.STRIPE_ONE_ARTICLE_ANNUAL_PRICE_ID);
    billingStatus = stripeReady ? "pass" : "missing";
    billingExplanation = stripeReady
      ? "Stripe configured."
      : "Stripe selected but one or more Stripe env vars are missing (not yet implemented until Phase 6).";
  } else {
    billingStatus = "warn";
    billingExplanation = `Unknown provider "${billingProvider}" — falling back to mock.`;
  }
  checks.push({ key: "BILLING_PROVIDER", status: billingStatus, explanation: billingExplanation });

  const polarSelected = billingProvider === "polar";
  const polarChecks = [
    {
      key: "POLAR_ACCESS_TOKEN",
      ok: has(process.env.POLAR_ACCESS_TOKEN),
      explanation: "Polar API access token",
    },
    {
      key: "POLAR_SUCCESS_URL / PUBLIC_BASE_URL",
      ok: has(process.env.POLAR_SUCCESS_URL) || has(process.env.PUBLIC_BASE_URL),
      explanation: "checkout success URL source",
    },
    {
      key: "POLAR_WEBHOOK_SECRET",
      ok: has(process.env.POLAR_WEBHOOK_SECRET),
      explanation: "Polar webhook signing secret",
    },
    {
      key: "POLAR_ONE_ARTICLE_PRODUCT_ID",
      ok: has(process.env.POLAR_ONE_ARTICLE_PRODUCT_ID),
      explanation: "explicit Polar product id",
      optional: true,
    },
  ];
  for (const item of polarChecks) {
    const required = polarSelected || isProd;
    checks.push({
      key: item.key,
      status: item.ok ? "pass" : item.optional ? "warn" : required ? "missing" : "warn",
      explanation: item.ok
        ? `${item.explanation} is configured.`
        : item.optional
          ? "Missing — using the built-in OneArticle product id fallback."
          : required
            ? `Missing — Polar payments cannot launch without ${item.key}.`
            : "Missing — only required when Polar billing is selected.",
    });
  }
  checks.push({
    key: "POLAR_SERVER",
    status:
      polarServer === "production"
        ? "pass"
        : polarServer === "sandbox"
          ? isProd
            ? "missing"
            : "warn"
          : "missing",
    explanation:
      polarServer === "production"
        ? "Using Polar production."
        : polarServer === "sandbox"
          ? isProd
            ? "Sandbox is selected in production — switch to POLAR_SERVER=production before launch."
            : "Using Polar sandbox."
          : `Invalid value "${polarServer}" — use "sandbox" or "production".`,
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
