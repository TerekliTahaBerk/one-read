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

const WELCOME_SUBJECT = "Finish setting up OneArticle";
const WELCOME_TEXT = `Hi,

You're almost there.

Your preferences are saved. Start your 7-day free trial with Polar to receive OneArticle every morning.

Trial and billing are handled securely by Polar.

— OneRead
`;

const WELCOME_HTML = `
  <div style="font-family: ui-serif, Georgia, Cambria, serif; color: #1B1612; line-height: 1.6; font-size: 16px; max-width: 480px; margin: 0 auto; padding: 24px;">
    <p style="margin: 0 0 16px 0;">Hi,</p>
    <p style="margin: 0 0 16px 0;"><strong>You're almost there.</strong></p>
    <p style="margin: 0 0 24px 0;">Your preferences are saved. Start your 7-day free trial with Polar to receive OneArticle every morning.</p>
    <p style="margin: 0 0 24px 0; font-style: italic; color: #6B5F50;">Trial and billing are handled securely by Polar.</p>
    <p style="margin: 0; color: #9C8F7E; font-size: 14px;">— OneRead</p>
  </div>
`.trim();

/**
 * Send the post-signup welcome email. Never throws — failures are logged
 * but must not block the user-facing success state.
 */
export async function sendWelcomeEmail(to: string): Promise<void> {
  warnIfMisconfigured();
  if (!resend) {
    console.warn(
      "[resend] RESEND_API_KEY is not set; skipping welcome email for",
      to,
    );
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: WELCOME_SUBJECT,
      text: WELCOME_TEXT,
      html: WELCOME_HTML,
    });
    if (error) {
      // Log but don't throw — signup should still succeed.
      console.error("[resend] send error:", error.name, error.message);
    }
  } catch (err) {
    console.error("[resend] unexpected send failure:", err);
  }
}

/**
 * Send a daily article email. Used by the editorial pipeline. Returns the
 * Resend message id on success, or undefined if no key is configured.
 *
 * Unlike `sendWelcomeEmail`, errors here propagate to the caller so the
 * pipeline can mark the DailySend row as FAILED and retry later.
 */
export async function sendDailyEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ messageId?: string }> {
  warnIfMisconfigured();
  if (!resend) {
    console.warn(
      "[resend] RESEND_API_KEY is not set; skipping daily email for",
      args.to,
    );
    return {};
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
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
