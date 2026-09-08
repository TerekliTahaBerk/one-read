"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminAccountRow {
  email: string;
  origin: "deployment" | "panel";
  active: boolean;
  invitePending: boolean;
  inviteExpiresAt: string | null;
  createdBy: string | null;
  removable: boolean;
}

const ERRORS: Record<string, string> = {
  invalid_email: "That does not look like an email address.",
  already_an_admin: "That address is already an administrator.",
  already_a_deployment_admin:
    "That address is configured in the deployment and is already an administrator.",
  cannot_remove_deployment_admin:
    "Deployment-configured administrators are removed by changing the deployment, not here.",
  cannot_remove_last_admin:
    "This is the only administrator who can sign in. Add another one first.",
  admin_not_found: "That administrator no longer exists.",
  admin_mutations_disabled: "Admin actions are disabled in this environment.",
};

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/admins/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.ok === true, json } as const;
}

/**
 * Add and remove panel administrators.
 *
 * Inviting does not set a password: it returns a one-time setup link, shown
 * once, that the invitee uses to choose their own. So this screen can grant
 * access without any administrator ever handling another's password — the same
 * rule the change-password form follows.
 */
export function AdminAccountsManager({ accounts }: { accounts: AdminAccountRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInvite(null);
    setCopied(false);
    const { ok, json } = await post({ action: "invite", email });
    setBusy(false);
    if (!ok) {
      setError(ERRORS[json.error] ?? json.error ?? "Could not create the invitation.");
      return;
    }
    setInvite({ email: json.email, url: json.setupUrl, expiresAt: json.expiresAt });
    setEmail("");
    router.refresh();
  }

  async function revoke(target: string) {
    if (!window.confirm(
      `Remove ${target} as an administrator? Their session ends immediately and they lose access to this panel.`,
    )) return;
    setBusy(true);
    setError(null);
    const { ok, json } = await post({ action: "revoke", email: target });
    setBusy(false);
    if (!ok) {
      setError(ERRORS[json.error] ?? json.error ?? "Could not remove the administrator.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-admin-line">
        {accounts.map((account) => (
          <li key={account.email} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-admin-ink">{account.email}</div>
              <div className="mt-0.5 text-[12px] text-admin-muted">
                {account.origin === "deployment"
                  ? "Configured in the deployment"
                  : account.invitePending
                    ? `Invitation outstanding${account.inviteExpiresAt ? ` · expires ${new Date(account.inviteExpiresAt).toLocaleString("en-GB")}` : ""}`
                    : `Added from this panel${account.createdBy ? ` by ${account.createdBy}` : ""}`}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] tracking-eyebrow ${
                  account.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-admin-line bg-admin-sink text-admin-muted"
                }`}
              >
                {account.active ? "Can sign in" : "Not activated"}
              </span>
              {account.removable ? (
                <button
                  type="button"
                  onClick={() => revoke(account.email)}
                  disabled={busy}
                  className="rounded-lg border border-admin-line-strong bg-admin-surface px-2.5 py-1.5 text-[12px] text-admin-ink transition-colors hover:bg-admin-sink disabled:opacity-40"
                >
                  Remove
                </button>
              ) : (
                <span className="text-[11.5px] text-admin-muted">Deployment</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={submitInvite} className="flex flex-wrap items-end gap-2 border-t border-admin-line pt-5">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
            Invite an administrator
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="person@example.com"
            className="w-64 rounded-lg border border-admin-line-strong bg-admin-surface px-2.5 py-1.5 text-[12.5px] text-admin-ink"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !email}
          className="rounded-lg bg-admin-ink px-3 py-1.5 text-[12.5px] text-white transition-opacity disabled:opacity-40"
        >
          {busy ? "Working…" : "Create invitation"}
        </button>
      </form>

      {error && <p className="text-[12.5px] text-dawn">{error}</p>}

      {invite && (
        <div className="rounded-xl border border-admin-line-strong bg-admin-sink p-4">
          <p className="text-[12.5px] leading-5 text-admin-body">
            <strong className="font-medium text-admin-ink">
              Setup link for {invite.email}
            </strong>{" "}
            — shown once and never stored. Send it to them over a channel you trust; it
            expires {new Date(invite.expiresAt).toLocaleString("en-GB")} and works a single
            time. They choose their own password; you will not see it.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 font-mono text-[11.5px] text-admin-ink">
              {invite.url}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite.url);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="rounded-lg border border-admin-line-strong bg-admin-surface px-2.5 py-1.5 text-[12px] text-admin-ink hover:bg-admin-surface/70"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
