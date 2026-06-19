import { createVerification, type VerificationDescriptor } from "@/lib/verification/core";

/**
 * Email verification for the public OneFilm signup / preferences flow. Proves
 * email ownership only — never grants access. Polar is the source of truth.
 */

export const FILM_VERIFICATION_PURPOSES = {
  signup: "one-film-signup",
  preferences: "one-film-preferences",
} as const;
export type FilmVerificationPurpose =
  (typeof FILM_VERIFICATION_PURPOSES)[keyof typeof FILM_VERIFICATION_PURPOSES];

export const FILM_VERIFIED_EMAIL_COOKIE = "one_film_verified_email";

const descriptor: VerificationDescriptor = {
  key: "one-film",
  purposes: FILM_VERIFICATION_PURPOSES,
  cookieName: FILM_VERIFIED_EMAIL_COOKIE,
  email: {
    subject: "Your OneFilm code",
    brandLine: "OneRead · OneFilm",
    productName: "OneFilm",
    intro: "Your OneFilm verification code is:",
    textIntro: "Your OneFilm code is:",
    support:
      "Use this code to set up your film preferences. Checkout is separate and happens only after preferences are saved.",
    theme: {
      background: "#F8F4FA",
      surface: "#FFFFFF",
      accent: "#7B5E8E",
      border: "#E3D6EA",
    },
  },
};

const instance = createVerification(descriptor);

export {
  emailVerificationSecretConfigured,
  verificationEmailConfigured,
  hashMeta,
} from "@/lib/verification/core";

export const requestFilmVerificationCode = instance.requestVerificationCode;
export const confirmFilmVerificationCode = instance.confirmVerificationCode;
export const setFilmVerifiedEmailCookie = instance.setVerifiedEmailCookie;
export const clearFilmVerifiedEmailCookie = instance.clearVerifiedEmailCookie;
export const getFilmVerifiedEmailSession = instance.getVerifiedEmailSession;
export const hasVerifiedFilmEmail = instance.hasVerifiedEmail;
