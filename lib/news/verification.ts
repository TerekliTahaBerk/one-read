import { createVerification, type VerificationDescriptor } from "@/lib/verification/core";

/**
 * Email verification for the public OneNews signup / preferences flow. A thin
 * product binding over the shared verification core. Proves email ownership
 * only — it never grants access. Polar remains the source of truth.
 */

export const NEWS_VERIFICATION_PURPOSES = {
  signup: "one-news-signup",
  preferences: "one-news-preferences",
} as const;
export type NewsVerificationPurpose =
  (typeof NEWS_VERIFICATION_PURPOSES)[keyof typeof NEWS_VERIFICATION_PURPOSES];

export const NEWS_VERIFIED_EMAIL_COOKIE = "one_news_verified_email";

const descriptor: VerificationDescriptor = {
  key: "one-news",
  purposes: NEWS_VERIFICATION_PURPOSES,
  cookieName: NEWS_VERIFIED_EMAIL_COOKIE,
  email: {
    subject: "Your OneNews code",
    brandLine: "OneRead · OneNews",
    productName: "OneNews",
    intro: "Your OneNews verification code is:",
    textIntro: "Your OneNews code is:",
    support:
      "Use this code to set up your morning briefing preferences. Checkout is separate and happens only after preferences are saved.",
    theme: {
      background: "#F5F7FA",
      surface: "#FFFFFF",
      accent: "#53647A",
      border: "#DCE3EA",
    },
  },
};

const instance = createVerification(descriptor);

export {
  emailVerificationSecretConfigured,
  verificationEmailConfigured,
  hashMeta,
} from "@/lib/verification/core";

export const requestNewsVerificationCode = instance.requestVerificationCode;
export const confirmNewsVerificationCode = instance.confirmVerificationCode;
export const setNewsVerifiedEmailCookie = instance.setVerifiedEmailCookie;
export const clearNewsVerifiedEmailCookie = instance.clearVerifiedEmailCookie;
export const getNewsVerifiedEmailSession = instance.getVerifiedEmailSession;
export const hasVerifiedNewsEmail = instance.hasVerifiedEmail;
