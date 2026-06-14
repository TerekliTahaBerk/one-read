import { Resend } from "resend";

/**
 * Lazy Resend client. Only constructed if RESEND_API_KEY is present so the
 * app can still build & run in environments where the key isn't configured.
 */
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * The "from" address. Configure RESEND_FROM in production with a verified
 * sender on a verified domain. Falls back to Resend's onboarding sender,
 * which is fine for development but only delivers to the account owner.
 */
const FROM = process.env.RESEND_FROM ?? "One Read <onboarding@resend.dev>";

const WELCOME_SUBJECT = "Welcome to One Read";
const WELCOME_TEXT = `Hi,

You're in.

Your first One Read arrives tomorrow at 7 AM.

One article. Every morning. Curated for you.

— One Read
`;

const WELCOME_HTML = `
  <div style="font-family: ui-serif, Georgia, Cambria, serif; color: #1B1612; line-height: 1.6; font-size: 16px; max-width: 480px; margin: 0 auto; padding: 24px;">
    <p style="margin: 0 0 16px 0;">Hi,</p>
    <p style="margin: 0 0 16px 0;"><strong>You're in.</strong></p>
    <p style="margin: 0 0 24px 0;">Your first One Read arrives tomorrow at <strong>7&nbsp;AM</strong>.</p>
    <p style="margin: 0 0 24px 0; font-style: italic; color: #6B5F50;">One article. Every morning. Curated for you.</p>
    <p style="margin: 0; color: #9C8F7E; font-size: 14px;">— One Read</p>
  </div>
`.trim();

/**
 * Send the post-signup welcome email. Never throws — failures are logged
 * but must not block the user-facing success state.
 */
export async function sendWelcomeEmail(to: string): Promise<void> {
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
