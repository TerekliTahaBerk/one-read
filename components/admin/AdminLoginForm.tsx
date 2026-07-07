"use client";

import { useState, type FormEvent } from "react";

export function AdminLoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            ? "Admin login is not configured."
            : "Invalid email or password.",
        );
        setBusy(false);
        return;
      }

      window.location.assign(json.next ?? "/admin");
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted">
          Email
        </span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block h-11 w-full rounded-lg border border-admin-line bg-admin-bg px-3 text-[14px] text-admin-ink outline-none focus:border-admin-amber"
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted">
          Password
        </span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block h-11 w-full rounded-lg border border-admin-line bg-admin-bg px-3 text-[14px] text-admin-ink outline-none focus:border-admin-amber"
          required
        />
      </label>

      {error && <p className="text-[12.5px] text-dawn">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="h-12 w-full rounded-full bg-admin-ink px-6 text-[14px] font-medium text-white transition-colors hover:bg-admin-ink/90 disabled:opacity-50"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
