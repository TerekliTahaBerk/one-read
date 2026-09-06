const DEVELOPMENT_SENDER = "OneRead <onboarding@resend.dev>";
const PRODUCTION_DOMAIN = "oneread.email";

function address(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:[^<>]+<)?\s*([^\s<>]+@[^\s<>]+)\s*>?$/);
  return match?.[1]?.toLowerCase() ?? null;
}

function domain(value: string): string | null {
  const email = address(value);
  return email?.split("@")[1] ?? null;
}

export function resolveResendConfiguration(
  env: Record<string, string | undefined> = process.env,
) {
  const from = env.FROM_EMAIL?.trim() || env.RESEND_FROM?.trim() || DEVELOPMENT_SENDER;
  const replyTo = env.RESEND_REPLY_TO?.trim() || undefined;
  return {
    apiKey: env.RESEND_API_KEY?.trim() || undefined,
    webhookSecret: env.RESEND_WEBHOOK_SECRET?.trim() || undefined,
    from,
    replyTo,
    usingFallbackSender: from === DEVELOPMENT_SENDER,
  };
}

/** Static production checks. Provider/DNS/mailbox state still needs live evidence. */
export function validateResendProductionConfiguration(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const config = resolveResendConfiguration(env);
  const problems: string[] = [];

  if (!config.apiKey) problems.push("RESEND_API_KEY is not configured.");
  else if (!config.apiKey.startsWith("re_")) problems.push("RESEND_API_KEY does not have the expected Resend key format.");

  if (config.usingFallbackSender) problems.push("A production Resend sender is not configured.");
  else if (domain(config.from) !== PRODUCTION_DOMAIN) {
    problems.push(`Resend sender must use the verified ${PRODUCTION_DOMAIN} domain.`);
  }

  if (!config.replyTo) problems.push("RESEND_REPLY_TO is not configured.");
  else if (address(config.replyTo) !== `hello@${PRODUCTION_DOMAIN}`) {
    problems.push(`RESEND_REPLY_TO must be hello@${PRODUCTION_DOMAIN}.`);
  }

  if (!config.webhookSecret) problems.push("RESEND_WEBHOOK_SECRET is not configured.");
  else if (!config.webhookSecret.startsWith("whsec_")) {
    problems.push("RESEND_WEBHOOK_SECRET does not have the expected signing-secret format.");
  }

  return problems;
}

export { DEVELOPMENT_SENDER };
