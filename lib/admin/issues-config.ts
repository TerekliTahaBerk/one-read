/**
 * Whether the daily pipeline should only send admin-approved issues.
 *
 * When OFF (the default), behavior is unchanged: the pipeline sends any pick
 * the editorial flow marked READY/SENT. When ON, the pipeline additionally
 * requires `approvalStatus` to be APPROVED or SCHEDULED — so nothing reaches
 * subscribers until an admin approves it. This flag is the single switch that
 * gates that behavior, kept here so the pipeline and the admin UI agree.
 */
export function isApprovalRequired(): boolean {
  return process.env.ONE_ARTICLE_REQUIRE_APPROVAL === "true";
}

/** Approval statuses that the pipeline treats as "clear to send". */
export const SENDABLE_APPROVAL_STATUSES = ["APPROVED", "SCHEDULED"] as const;
