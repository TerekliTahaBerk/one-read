export type UserJourneyStage =
  | "EMAIL_ONLY"
  | "UNVERIFIED"
  | "NO_PREFERENCES"
  | "PARTIAL_PREFERENCES"
  | "AWAITING_PAYMENT"
  | "TRIAL"
  | "ACTIVE"
  | "MANUAL_ACCESS"
  | "PAYMENT_ISSUE"
  | "INACTIVE";

export type UserPaymentState =
  | "NEVER_PAID"
  | "TRIAL"
  | "PAYING"
  | "PAYMENT_OVERDUE"
  | "CANCELED"
  | "FORMER_PAYER"
  | "MANUAL_ACCESS";

export type UserPreferenceState =
  | "NOT_STARTED"
  | "PARTIAL"
  | "COMPLETE"
  | "NOT_APPLICABLE";

export type UserVerificationState =
  | "NOT_REQUESTED"
  | "PENDING_VERIFICATION"
  | "VERIFIED";

export type UserSubscriptionSnapshot = {
  productKey: string;
  status: string;
  paymentProvider: string | null;
  providerSubscriptionId: string | null;
  paidAt: Date | null;
  adminOverride: boolean;
  preferences?: {
    summaryLanguage: string | null;
  } | null;
};

export type UserJourneyInput = {
  subscriptions: UserSubscriptionSnapshot[];
  verificationRequested: boolean;
  verified: boolean;
};

export type UserJourney = {
  stage: UserJourneyStage;
  payment: UserPaymentState;
  preferences: UserPreferenceState;
  verification: UserVerificationState;
  expectedPreferenceProducts: number;
  completedPreferenceProducts: number;
  missingPreferenceProducts: string[];
  hasSubscription: boolean;
  hasPaidEver: boolean;
};

const PAID_LIFECYCLE_STATUSES = new Set([
  "ACTIVE_PAID",
  "PAST_DUE",
  "CANCELED",
  "EXPIRED",
]);

export function analyzeUserJourney(input: UserJourneyInput): UserJourney {
  const subscriptions = input.subscriptions;
  const oneRead = subscriptions.find((sub) => sub.productKey === "one-read");
  const article = subscriptions.find((sub) => sub.productKey === "one-article");

  const articleExpected = Boolean(oneRead || article);
  const articleComplete = Boolean(article?.preferences?.summaryLanguage);
  const expectedPreferenceProducts = Number(articleExpected);
  const completedPreferenceProducts = Number(articleExpected && articleComplete);
  const missingPreferenceProducts = [
    articleExpected && !articleComplete ? "OneArticle" : null,
  ].filter((value): value is string => Boolean(value));

  let preferences: UserPreferenceState = "NOT_APPLICABLE";
  if (expectedPreferenceProducts > 0) {
    preferences = completedPreferenceProducts === 0
      ? "NOT_STARTED"
      : completedPreferenceProducts === expectedPreferenceProducts
        ? "COMPLETE"
        : "PARTIAL";
  }

  const verification: UserVerificationState = input.verified
    ? "VERIFIED"
    : input.verificationRequested
      ? "PENDING_VERIFICATION"
      : "NOT_REQUESTED";

  const accessStatuses = subscriptions.map((sub) => sub.status);
  const hasManualAccess = subscriptions.some(
    (sub) => sub.adminOverride || sub.status === "ADMIN_OVERRIDE",
  );
  const hasPaidEver = subscriptions.some(
    (sub) =>
      Boolean(sub.paidAt)
      || sub.status === "ACTIVE_PAID"
      || (Boolean(sub.providerSubscriptionId)
        && PAID_LIFECYCLE_STATUSES.has(sub.status)),
  );

  let payment: UserPaymentState = "NEVER_PAID";
  if (accessStatuses.includes("PAST_DUE")) payment = "PAYMENT_OVERDUE";
  else if (accessStatuses.includes("ACTIVE_PAID")) payment = "PAYING";
  else if (accessStatuses.includes("TRIALING")) payment = "TRIAL";
  else if (accessStatuses.includes("CANCELED")) payment = "CANCELED";
  else if (hasPaidEver) payment = "FORMER_PAYER";
  else if (hasManualAccess) payment = "MANUAL_ACCESS";

  let stage: UserJourneyStage;
  if (subscriptions.length === 0) {
    stage = input.verificationRequested && !input.verified ? "UNVERIFIED" : "EMAIL_ONLY";
  }
  else if (!input.verified && input.verificationRequested) stage = "UNVERIFIED";
  else if (preferences === "NOT_STARTED") stage = "NO_PREFERENCES";
  else if (preferences === "PARTIAL") stage = "PARTIAL_PREFERENCES";
  else if (payment === "PAYMENT_OVERDUE") stage = "PAYMENT_ISSUE";
  else if (payment === "PAYING") stage = "ACTIVE";
  else if (payment === "TRIAL") stage = "TRIAL";
  else if (payment === "MANUAL_ACCESS") stage = "MANUAL_ACCESS";
  else if (payment === "CANCELED" || payment === "FORMER_PAYER") stage = "INACTIVE";
  else stage = "AWAITING_PAYMENT";

  return {
    stage,
    payment,
    preferences,
    verification,
    expectedPreferenceProducts,
    completedPreferenceProducts,
    missingPreferenceProducts,
    hasSubscription: subscriptions.length > 0,
    hasPaidEver,
  };
}

export function userRole(email: string, adminEmails: readonly string[]): "ADMIN" | "USER" {
  const normalized = email.trim().toLowerCase();
  return adminEmails.some((adminEmail) => adminEmail.trim().toLowerCase() === normalized)
    ? "ADMIN"
    : "USER";
}
