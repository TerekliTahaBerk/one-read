"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Posts a single admin action to /api/admin/users/action and refreshes the
 * page on success. Dangerous actions show a confirm dialog first; actions that
 * need a value (a note, or the email for a hard delete) prompt for it inline.
 */
export interface ActionButtonProps {
  action: string;
  subId?: string;
  label: string;
  /** Confirmation copy. When set, a dialog is shown before the request. */
  confirm?: string;
  /** Visual emphasis for destructive/grant actions. */
  danger?: boolean;
  /** Prompt for a free-text value, sent as `field`. */
  promptLabel?: string;
  promptField?: "note" | "email";
  /** When set, the typed value must equal this before the action enables. */
  requireExact?: string;
  /** Extra static body fields. */
  extra?: Record<string, unknown>;
}

export function ActionButton({
  action,
  subId,
  label,
  confirm,
  danger,
  promptLabel,
  promptField,
  requireExact,
  extra,
}: ActionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsDialog = Boolean(confirm || promptField);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { action, subId, ...extra };
      if (promptField) body[promptField] = value;
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "request_failed");
        setBusy(false);
        return;
      }
      setOpen(false);
      setBusy(false);
      setValue("");
      router.refresh();
    } catch {
      setError("network_error");
      setBusy(false);
    }
  }

  const buttonClass = danger
    ? "rounded-lg border border-dawn/50 bg-admin-surface px-3 py-1.5 text-[12.5px] text-dawn hover:bg-dawn/5"
    : "rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-[12.5px] text-admin-ink hover:bg-admin-sink";

  const exactOk = !requireExact || value.trim().toLowerCase() === requireExact.toLowerCase();
  const promptOk = !promptField || (value.trim().length > 0 && exactOk);

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => (needsDialog ? setOpen(true) : run())}
        disabled={busy}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-admin-ink/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-admin-line-strong bg-admin-surface p-5 shadow-admin-md">
            <h3 className="font-serif text-[17px] text-admin-ink">{label}</h3>
            {confirm && (
              <p className="mt-2 font-sans text-[13px] text-admin-body">{confirm}</p>
            )}
            {promptField && (
              <label className="mt-3 block">
                <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
                  {promptLabel ?? promptField}
                </span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-admin-line bg-admin-bg px-2.5 py-1.5 text-[13px] text-admin-ink outline-none focus:border-admin-amber"
                  autoFocus
                />
                {requireExact && (
                  <span className="mt-1 block text-[11.5px] text-admin-muted">
                    Type <code className="font-mono">{requireExact}</code> to confirm.
                  </span>
                )}
              </label>
            )}
            {error && (
              <p className="mt-3 font-sans text-[12.5px] text-dawn">Error: {error}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                className="rounded-lg px-3 py-1.5 text-[12.5px] text-admin-body hover:text-admin-ink"
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={run}
                disabled={busy || !promptOk}
                className={`rounded-lg border px-3 py-1.5 text-[12.5px] disabled:opacity-40 ${
                  danger
                    ? "border-dawn/50 text-dawn hover:bg-dawn/5"
                    : "border-transparent bg-admin-amber text-white hover:bg-admin-amber-strong"
                }`}
              >
                {busy ? "Working…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !open && (
        <span className="text-[11.5px] text-dawn">{error}</span>
      )}
    </>
  );
}
