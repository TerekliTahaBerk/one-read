"use client";

import { FormEvent, useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  current_password_incorrect: "Current password is incorrect.",
  password_unchanged: "Choose a password different from your current one.",
  password_too_short: "Use at least 12 characters.",
  password_too_long: "Use no more than 128 characters.",
  password_not_strong_enough:
    "Use at least three of: lowercase, uppercase, number, and symbol.",
  password_contains_email: "Do not include your email name in the password.",
  password_fields_required: "Complete every password field.",
  invalid_origin: "This request could not be verified. Refresh and try again.",
  unauthorized: "Your session expired. Sign in again.",
};

export function ChangePasswordForm({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmation) {
      setError("New passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !json.ok) {
        setError(ERROR_MESSAGES[json.error ?? ""] ?? "Password could not be changed.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-admin-line bg-admin-sink px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-eyebrow text-admin-muted">
          Signed in as
        </div>
        <div className="mt-1 font-mono text-[12.5px] text-admin-ink">{email}</div>
      </div>

      <PasswordField
        id="current-password"
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
        />
      </div>

      <p className="text-[11.5px] leading-5 text-admin-muted">
        Minimum 12 characters and at least three character types. Saving signs
        this admin out on every other device.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-admin-ink px-4 py-2.5 text-[12.5px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Changing…" : "Change password"}
        </button>
        {success && (
          <span role="status" className="text-[12px] text-emerald-700">
            Password changed. Other sessions were signed out.
          </span>
        )}
        {error && (
          <span role="alert" className="text-[12px] text-dawn">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-eyebrow text-admin-muted">
        {label}
      </span>
      <input
        id={id}
        type="password"
        required
        minLength={12}
        maxLength={128}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-admin-line bg-admin-bg px-3 py-2.5 text-[13px] text-admin-ink outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-admin-accent-tint"
      />
    </label>
  );
}
