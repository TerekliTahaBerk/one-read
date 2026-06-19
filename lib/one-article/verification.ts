import { createVerification, type VerificationDescriptor } from "@/lib/verification/core";

/**
 * Email verification for the public OneArticle signup / preferences flow.
 *
 * This is now a thin product binding over the shared verification core
 * (`lib/verification/core.ts`). Behavior, purposes, cookie name, and email copy
 * are identical to before — only the implementation moved. Verification proves
 * email ownership only; Polar remains the sole source of truth for trial/paid
 * access.
 */

export const VERIFICATION_PURPOSES = {
  signup: "one-article-signup",
  preferences: "one-article-preferences",
} as const;
export type VerificationPurpose =
  (typeof VERIFICATION_PURPOSES)[keyof typeof VERIFICATION_PURPOSES];

export const VERIFIED_EMAIL_COOKIE = "one_article_verified_email";

const descriptor: VerificationDescriptor = {
  key: "one-article",
  purposes: VERIFICATION_PURPOSES,
  cookieName: VERIFIED_EMAIL_COOKIE,
  email: {
    subject: "Your OneArticle verification code",
    brandLine: "OneRead · OneArticle",
    productName: "OneArticle",
    intro: "Your OneArticle verification code is:",
    textIntro: "Your OneArticle code is:",
    support:
      "Use this code to finish setting up your morning article brief. Preferences are saved only after this email is verified.",
    theme: {
      background: "#F3F8FF",
      surface: "#FFFFFF",
      accent: "#3F6FA8",
      border: "#D8E7F8",
    },
  },
};

const instance = createVerification(descriptor);

// Re-export config helpers (product-agnostic) so existing imports keep working.
export {
  verificationConfig,
  emailVerificationSecretConfigured,
  verificationEmailConfigured,
  hashMeta,
  type RequestCodeResult,
  type ConfirmCodeResult,
  type VerifiedEmailSession,
} from "@/lib/verification/core";

export const requestVerificationCode = instance.requestVerificationCode;
export const confirmVerificationCode = instance.confirmVerificationCode;
export const setVerifiedEmailCookie = instance.setVerifiedEmailCookie;
export const clearVerifiedEmailCookie = instance.clearVerifiedEmailCookie;
export const getVerifiedEmailSession = instance.getVerifiedEmailSession;
export const hasVerifiedEmail = instance.hasVerifiedEmail;
