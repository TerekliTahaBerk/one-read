"use client";

import { useState, type FormEvent } from "react";

export function AdminLoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        next?: string;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setError(
          json.error === "admin_login_not_configured"
            ? "Admin login isn’t configured on this environment."
            : "That email or password isn’t right. Try again.",
        );
        setBusy(false);
        return;
      }

      window.location.assign(json.next ?? "/admin");
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="admin-email"
          className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted"
        >
          Email
        </label>
        <div className="group flex h-12 items-center gap-2.5 rounded-xl border border-admin-line bg-admin-bg px-3.5 transition-all duration-200 focus-within:border-admin-accent focus-within:shadow-[0_0_0_3px_rgba(17,17,17,0.06)]">
          <MailIcon className="shrink-0 text-admin-muted transition-colors duration-200 group-focus-within:text-admin-ink" />
          <input
            id="admin-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            placeholder="you@oneread.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            className="h-full w-full bg-transparent text-[14px] text-admin-ink placeholder:text-admin-muted/60 outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted"
        >
          Password
        </label>
        <div className="group flex h-12 items-center gap-2.5 rounded-xl border border-admin-line bg-admin-bg px-3.5 transition-all duration-200 focus-within:border-admin-accent focus-within:shadow-[0_0_0_3px_rgba(17,17,17,0.06)]">
          <LockIcon className="shrink-0 text-admin-muted transition-colors duration-200 group-focus-within:text-admin-ink" />
          <input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            className="h-full w-full bg-transparent text-[14px] text-admin-ink placeholder:text-admin-muted/60 outline-none"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="focus-ring -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-admin-muted transition-colors duration-200 hover:text-admin-ink"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-dawn/25 bg-dawn/[0.05] px-3.5 py-2.5 text-[12.5px] leading-snug text-dawn"
        >
          <AlertIcon className="mt-px shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-admin-accent px-6 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-admin-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy && <Spinner />}
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

/* ---- icons (inline, no external deps) --------------------------------- */

function MailIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="2.75" y="4.25" width="14.5" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="m3.5 5.5 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="4" y="8.5" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.75 8.5V6.5a3.25 3.25 0 0 1 6.5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M1.75 10S4.5 4.75 10 4.75 18.25 10 18.25 10 15.5 15.25 10 15.25 1.75 10 1.75 10Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7.5 5.2A7.7 7.7 0 0 1 10 4.75c5.5 0 8.25 5.25 8.25 5.25a13.9 13.9 0 0 1-2.3 2.86M4.2 6.15A13.8 13.8 0 0 0 1.75 10S4.5 15.25 10 15.25a7.6 7.6 0 0 0 2.6-.44" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m8.4 8.4a2.25 2.25 0 0 0 3.2 3.2M2.5 2.5l15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v3.25M8 10.75h.008" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
