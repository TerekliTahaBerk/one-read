"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Where an invited administrator chooses their own password.
 *
 * The password is typed here by the person it belongs to and posted straight to
 * the redeem endpoint — nobody else, including whoever sent the invitation,
 * ever sees or sets it. Policy failures are explained in words rather than
 * returned as codes, because the person hitting them has no other guidance.
 */
const ERRORS: Record<string, string> = {
  invite_invalid_or_expired:
    "This setup link is no longer valid. Ask an administrator for a new invitation.",
  password_too_short: "Use at least 12 characters.",
  password_too_long: "Use at most 128 characters.",
  password_not_strong_enough:
    "Mix at least three of: lowercase, uppercase, numbers, symbols.",
  password_contains_email: "Do not include your email name in the password.",
  invalid_request: "Something was missing from the request. Reload and try again.",
};

export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(ERRORS[json.error] ?? "Could not set the password.");
        return;
      }
      router.push(typeof json.next === "string" ? json.next : "/admin");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-admin-line bg-admin-surface px-3 py-2.5 text-[13.5px] text-admin-ink outline-none focus:border-admin-line-strong";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
          Account
        </span>
        <p className="mt-1.5 text-[13.5px] font-medium text-admin-ink">{email}</p>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
          New password
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
          Confirm password
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError(null);
          }}
          className={fieldClass}
        />
      </label>

      <p className="text-[12px] leading-[1.6] text-admin-muted">
        At least 12 characters, mixing at least three of lowercase, uppercase,
        numbers and symbols. It must not contain your email name.
      </p>

      {mismatch && (
        <p className="text-[12.5px] text-dawn">The two passwords do not match.</p>
      )}
      {error && <p className="text-[12.5px] text-dawn">{error}</p>}

      <button
        type="submit"
        disabled={busy || !password || mismatch}
        className="w-full rounded-xl bg-admin-ink px-4 py-2.5 text-[13.5px] font-medium text-white transition-opacity disabled:opacity-40"
      >
        {busy ? "Setting password…" : "Set password and sign in"}
      </button>
    </form>
  );
}
