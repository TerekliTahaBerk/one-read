"use client";

import { ActionButton } from "./ActionButton";

/**
 * The admin action set for one subscription, shown on the user detail page.
 * Which buttons appear depends on current state so the operator only sees
 * applicable actions. Destructive / access-granting actions are confirmed.
 */
export function UserActionsBar({
  subId,
  email,
  emailDeliveryStatus,
  adminOverride,
}: {
  subId: string;
  email: string;
  emailDeliveryStatus: string;
  adminOverride: boolean;
}) {
  const suppressed = emailDeliveryStatus === "SUPPRESSED";
  const isTestEmail = /(@example\.com|^mock-fixture-|@test\.|@example\.org)/i.test(email);

  return (
    <div className="flex flex-wrap gap-2">
      {!suppressed && emailDeliveryStatus === "SUBSCRIBED" && (
        <ActionButton subId={subId} action="pause" label="Pause emails" />
      )}
      {!suppressed && emailDeliveryStatus === "UNSUBSCRIBED" && (
        <ActionButton subId={subId} action="resume" label="Resume emails" />
      )}

      {!suppressed ? (
        <ActionButton
          subId={subId}
          action="suppress"
          label="Suppress"
          danger
          confirm="Suppression blocks all delivery to this address until you deliberately clear it. Billing and access are unchanged."
        />
      ) : (
        <ActionButton
          subId={subId}
          action="unsuppress"
          label="Unsuppress"
          confirm="This returns the subscriber to SUBSCRIBED and allows delivery again."
        />
      )}

      {!adminOverride ? (
        <ActionButton
          subId={subId}
          action="set-override"
          label="Set admin override"
          danger
          confirm="Admin override grants access regardless of payment — this subscriber will become eligible for daily emails. Use only for comped / founder accounts."
        />
      ) : (
        <ActionButton
          subId={subId}
          action="remove-override"
          label="Remove override"
          danger
          confirm="This removes the override and drops the subscription to PENDING_CHECKOUT (no access). A real Polar subscription, if any, will restore paid access via webhook."
        />
      )}

      <ActionButton
        subId={subId}
        action="set-note"
        label="Edit note"
        promptField="note"
        promptLabel="Admin note (empty to clear)"
      />

      {isTestEmail && (
        <ActionButton
          subId={subId}
          action="hard-delete"
          label="Hard delete (test)"
          danger
          confirm="Permanently deletes this test contact and all its data. Only test/mock addresses are allowed."
          promptField="email"
          promptLabel="Confirm email"
          requireExact={email}
        />
      )}
    </div>
  );
}
