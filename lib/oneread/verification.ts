import { productThemes } from "@/lib/product-themes";
import { createVerification, type VerificationDescriptor } from "@/lib/verification/core";

/**
 * Email verification for OneRead onboarding and account preferences.
 * verification core — see
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
    brandLine: "OneRead",
    productName: "OneRead",
    theme: { ...productThemes.read, surface: "#FFFFFF" },
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
