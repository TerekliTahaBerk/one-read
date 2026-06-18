"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
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

      router.replace(json.next ?? "/admin");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-fog">
          Email
        </span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block h-11 w-full rounded-lg border border-line bg-paper px-3 text-[14px] text-ink outline-none focus:border-ink"
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-fog">
          Password
        </span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block h-11 w-full rounded-lg border border-line bg-paper px-3 text-[14px] text-ink outline-none focus:border-ink"
          required
        />
      </label>

      {error && <p className="text-[12.5px] text-dawn">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-lg bg-ink px-4 text-[14px] font-medium text-paper disabled:opacity-50"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
