import { Resend } from "resend";

/**
 * Lazy Resend client. Only constructed if RESEND_API_KEY is present so the
 * app can still build & run in environments where the key isn't configured.
 */
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * The "from" address.
 *
 * In production set either `FROM_EMAIL` (preferred, generic name) or
 * `RESEND_FROM` (legacy alias). Both are accepted so existing deployments
 * keep working.
 *
 * Falls back to Resend's onboarding sender, which is fine for development
 * but only delivers to the Resend account owner's email — never use it in
 * production.
 */
const FROM_FALLBACK = "OneRead <onboarding@resend.dev>";
const FROM =
  process.env.FROM_EMAIL?.trim() ||
  process.env.RESEND_FROM?.trim() ||
  FROM_FALLBACK;

/**
 * One-shot production warnings. We log on the first call rather than at
 * module-import time so the warning surfaces in cron / pipeline logs (where
 * it's actually useful) instead of disappearing during cold-start.
 */
let warnedNoKey = false;
let warnedNoFrom = false;

function warnIfMisconfigured(): void {
  const isProd = process.env.NODE_ENV === "production";
  if (!apiKey && !warnedNoKey) {
    warnedNoKey = true;
    if (isProd) {
      console.error(
        "[resend] RESEND_API_KEY is not set in production — daily emails will be skipped.",
      );
    } else {
      console.warn(
        "[resend] RESEND_API_KEY is not set — emails will be skipped (dev mode).",
      );
    }
  }
  if (
    !process.env.FROM_EMAIL &&
    !process.env.RESEND_FROM &&
    !warnedNoFrom
  ) {
    warnedNoFrom = true;
    if (isProd) {
      console.error(
        "[resend] Neither FROM_EMAIL nor RESEND_FROM is set in production — using onboarding@resend.dev which only delivers to the account owner. Configure a verified sender.",
      );
    } else {
      console.warn(
        `[resend] Using fallback sender "${FROM_FALLBACK}" — set FROM_EMAIL for production.`,
      );
    }
  }
}

/**
 * Send a daily article email. Used by the editorial pipeline. Returns the
 * Resend message id on success, or undefined if no key is configured.
 *
 * Errors here propagate to the caller so the pipeline can mark the DailySend
 * row as FAILED and retry later.
 */
export async function sendDailyEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Stable key used by Resend to prevent duplicate delivery across retries. */
  idempotencyKey?: string;
}): Promise<{ messageId?: string }> {
  warnIfMisconfigured();
  if (!resend) {
    console.warn(
      "[resend] RESEND_API_KEY is not set; skipping daily email for",
      args.to,
    );
    return {};
  }

  const { data, error } = await resend.emails.send(
    {
      from: FROM,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    },
    args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
  );
  if (error) {
    throw new Error(`[resend] ${error.name}: ${error.message}`);
  }
  return { messageId: data?.id };
}

/**
 * Returns the resolved sender + whether Resend is configured. Used by the
 * admin page to surface configuration without leaking secrets.
 */
export function getResendStatus(): {
  hasApiKey: boolean;
  from: string;
  usingFallbackSender: boolean;
} {
  return {
    hasApiKey: !!apiKey,
    from: FROM,
    usingFallbackSender: FROM === FROM_FALLBACK,
  };
}
