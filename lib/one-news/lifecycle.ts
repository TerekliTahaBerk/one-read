/**
 * OneNews editorial lifecycle.
 *
 * The status vocabulary intentionally matches OneArticle's so operators read
 * one set of words across products — but the state machine is OneNews's own,
 * and the two products never share a row.
 *
 * Only the editorial transitions are reachable in this milestone. The
 * delivery-side transitions are declared so C4's dispatcher has a contract to
 * implement against; nothing in C3 calls them.
 */
export const ONE_NEWS_STATUSES = [
  "DRAFT",
  "READY",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "PARTIALLY_FAILED",
  "FAILED",
  "CANCELED",
] as const;

export type OneNewsStatus = (typeof ONE_NEWS_STATUSES)[number];

/** Transitions an editor may perform from the panel. */
const EDITORIAL_TRANSITIONS: Record<OneNewsStatus, readonly OneNewsStatus[]> = {
  DRAFT: ["READY", "CANCELED"],
  // Back to DRAFT is always allowed: an editor must be able to pull an
  // approved edition without inventing a reason the machine understands.
  READY: ["DRAFT", "SCHEDULED", "CANCELED"],
  // Reachable only while nothing has been dispatched. `claimedAt` is the
  // dispatcher's lock and is checked separately by the caller.
  SCHEDULED: ["DRAFT", "READY", "CANCELED"],
  SENDING: [],
  SENT: [],
  PARTIALLY_FAILED: [],
  FAILED: [],
  CANCELED: ["DRAFT"],
};

/**
 * Transitions the future dispatcher will own. Declared for C4 compatibility;
 * `canTransition` deliberately refuses them so nothing in this milestone can
 * move an edition into a delivery state by accident.
 */
export const DELIVERY_TRANSITIONS: Record<string, readonly OneNewsStatus[]> = {
  SCHEDULED: ["SENDING"],
  SENDING: ["SENT", "PARTIALLY_FAILED", "FAILED"],
  PARTIALLY_FAILED: ["SCHEDULED"],
  FAILED: ["SCHEDULED"],
};

export function isOneNewsStatus(value: string): value is OneNewsStatus {
  return (ONE_NEWS_STATUSES as readonly string[]).includes(value);
}

/** True only for transitions an editor is allowed to make in this milestone. */
export function canTransition(from: string, to: OneNewsStatus): boolean {
  if (!isOneNewsStatus(from)) return false;
  return EDITORIAL_TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: string): readonly OneNewsStatus[] {
  return isOneNewsStatus(from) ? EDITORIAL_TRANSITIONS[from] : [];
}

/** Throws with an explicit, loggable reason rather than silently no-op'ing. */
export function assertTransition(from: string, to: OneNewsStatus): void {
  if (!canTransition(from, to)) throw new Error("invalid_status_transition");
}

/** Content is editable only before an edition has entered delivery. */
export function isEditable(status: string): boolean {
  return status === "DRAFT" || status === "READY";
}

/** An edition that has been sent is the only kind a correction can describe. */
export function isPublished(status: string): boolean {
  return status === "SENT" || status === "PARTIALLY_FAILED";
}
