"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Posts a single admin action to /api/admin/users/action and refreshes the
 * page on success. Dangerous actions show a confirm dialog first; actions that
 * need a value (a note, or the email for a hard delete) prompt for it inline.
 */
export interface ActionButtonProps {
  token: string;
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
  token,
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
      const body: Record<string, unknown> = { token, action, subId, ...extra };
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
    ? "rounded-lg border border-dawn/50 bg-paper px-3 py-1.5 text-[12.5px] text-dawn hover:bg-dawn/5"
    : "rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-line-strong bg-paper p-5 shadow-lg">
            <h3 className="font-serif text-[17px] text-ink">{label}</h3>
            {confirm && (
              <p className="mt-2 text-[13px] text-ash font-sans">{confirm}</p>
            )}
            {promptField && (
              <label className="mt-3 block">
                <span className="text-[11px] uppercase tracking-eyebrow text-fog">
                  {promptLabel ?? promptField}
                </span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink"
                  autoFocus
                />
                {requireExact && (
                  <span className="mt-1 block text-[11.5px] text-fog">
                    Type <code className="font-mono">{requireExact}</code> to confirm.
                  </span>
                )}
              </label>
            )}
            {error && (
              <p className="mt-3 text-[12.5px] text-dawn font-sans">Error: {error}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                className="rounded-lg px-3 py-1.5 text-[12.5px] text-ash hover:text-ink"
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
                    : "border-line-strong text-ink hover:bg-cream"
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
