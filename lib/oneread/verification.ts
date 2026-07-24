import { createVerification, type VerificationDescriptor } from "@/lib/verification/core";

/**
 * Email verification for the unified OneRead onboarding flow (currently
 * covers OneArticle reading-language setup). Thin
 * product binding over the shared verification core — see
 * lib/one-article/verification.ts for the original pattern this mirrors.
 * Verification proves email ownership only; Polar remains the sole source of
 * truth for trial/paid access.
 */

export const VERIFICATION_PURPOSES = {
  signup: "one-read-signup",
  preferences: "one-read-preferences",
} as const;
export type VerificationPurpose =
  (typeof VERIFICATION_PURPOSES)[keyof typeof VERIFICATION_PURPOSES];

export const VERIFIED_EMAIL_COOKIE = "one_read_verified_email";

const descriptor: VerificationDescriptor = {
  key: "one-read",
  purposes: VERIFICATION_PURPOSES,
  cookieName: VERIFIED_EMAIL_COOKIE,
  email: {
    subject: "Your OneRead verification code",
    brandLine: "OneRead",
    productName: "OneRead",
    intro: "Your OneRead verification code is:",
    textIntro: "Your OneRead code is:",
    support:
      "Use this code to finish setting up your OneArticle reading language. Your choice is saved only after this email is verified.",
    theme: {
      background: "#F6F5F1",
      surface: "#FFFFFF",
      accent: "#2B2B2B",
      border: "#E4E1D8",
    },
  },
};

const instance = createVerification(descriptor);

export const requestVerificationCode = instance.requestVerificationCode;
export const confirmVerificationCode = instance.confirmVerificationCode;
export const setVerifiedEmailCookie = instance.setVerifiedEmailCookie;
export const clearVerifiedEmailCookie = instance.clearVerifiedEmailCookie;
export const getVerifiedEmailSession = instance.getVerifiedEmailSession;
export const hasVerifiedEmail = instance.hasVerifiedEmail;

export {
  emailVerificationSecretConfigured,
  hashMeta,
} from "@/lib/verification/core";
