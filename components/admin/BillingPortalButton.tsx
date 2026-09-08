"use client";

import { useState } from "react";

/**
 * Opens a Polar customer-portal session for one subscription.
 *
 * Unlike the other admin actions this changes nothing and refreshes nothing —
 * it hands the operator a URL. It still confirms first, because the portal it
 * opens belongs to a real subscriber and can cancel their subscription; and it
 * shows the link rather than navigating on its own, so an operator who
 * clicked by accident is not dropped into someone's billing account.
 */
export function BillingPortalButton({ subId, email }: { subId: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ERRORS: Record<string, string> = {
    not_a_polar_subscription: "This subscription is not billed through Polar.",
    no_billing_account: "No billing account is linked to this subscription yet.",
    billing_portal_unavailable: "Polar could not open a portal session. Try again shortly.",
    subscription_not_found: "This subscription no longer exists.",
    admin_mutations_disabled: "Admin actions are disabled in this environment.",
  };

  async function open() {
    if (!window.confirm(
      `Open the billing portal for ${email}? This is that subscriber's own billing account — anything you do there, including cancelling, applies to them. The action is recorded in the audit log.`,
    )) return;
    setBusy(true);
    setError(null);
    setUrl(null);
    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "open-billing-portal", subId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok || !json.url) {
        setError(ERRORS[json.error] ?? json.error ?? "Could not open the billing portal.");
        return;
      }
      setUrl(json.url as string);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 font-sans text-[12.5px] text-admin-ink transition-colors hover:bg-admin-sink disabled:opacity-40"
      >
        {busy ? "Opening…" : "Open billing portal"}
      </button>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="font-sans text-[12.5px] text-admin-ink underline underline-offset-2"
        >
          Portal session ready — open in a new tab →
        </a>
      )}
      {error && <span className="font-sans text-[11.5px] text-dawn">{error}</span>}
    </span>
  );
}
