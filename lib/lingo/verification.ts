import { createVerification, type VerificationDescriptor } from "@/lib/verification/core";

/**
 * Email verification for the public OneLingo signup / preferences flow. A thin
 * product binding over the shared verification core. Proves email ownership
 * only — it never grants access. Polar remains the source of truth.
 */

export const LINGO_VERIFICATION_PURPOSES = {
  signup: "one-lingo-signup",
  preferences: "one-lingo-preferences",
} as const;
export type LingoVerificationPurpose =
  (typeof LINGO_VERIFICATION_PURPOSES)[keyof typeof LINGO_VERIFICATION_PURPOSES];

export const LINGO_VERIFIED_EMAIL_COOKIE = "one_lingo_verified_email";

const descriptor: VerificationDescriptor = {
  key: "one-lingo",
  purposes: LINGO_VERIFICATION_PURPOSES,
  cookieName: LINGO_VERIFIED_EMAIL_COOKIE,
  email: {
    subject: "Your OneLingo code",
    brandLine: "OneRead · OneLingo",
    intro: "Your OneLingo verification code is:",
    textIntro: "Your OneLingo code is:",
  },
};

const instance = createVerification(descriptor);

export {
  emailVerificationSecretConfigured,
  verificationEmailConfigured,
  hashMeta,
} from "@/lib/verification/core";

export const requestLingoVerificationCode = instance.requestVerificationCode;
export const confirmLingoVerificationCode = instance.confirmVerificationCode;
export const setLingoVerifiedEmailCookie = instance.setVerifiedEmailCookie;
export const clearLingoVerifiedEmailCookie = instance.clearVerifiedEmailCookie;
export const getLingoVerifiedEmailSession = instance.getVerifiedEmailSession;
export const hasVerifiedLingoEmail = instance.hasVerifiedEmail;
