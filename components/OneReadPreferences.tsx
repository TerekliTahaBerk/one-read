"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { productThemes } from "@/lib/product-themes";
import { isLikelyEmail } from "@/lib/options";

type LookupResult = {
  state: string;
  daysLeft?: number;
  periodEndsAt?: string;
  articlePreferencesComplete: boolean;
  filmPreferencesComplete: boolean;
};

const STATE_LABEL: Record<string, string> = {
  new: "No OneRead account yet",
  incomplete: "Preferences not started",
  checkout_needed: "Checkout not started",
  trialing: "Trial active",
  trial_expired: "Trial expired",
  active_paid: "Active",
  canceled_active: "Canceled — active until period ends",
  expired: "Expired",
  past_due: "Payment needs attention",
  active_email_paused: "Active — emails paused",
  suppressed: "Emails suppressed (bounced)",
};

export function OneReadPreferences({ initialEmail = "" }: { initialEmail?: string }) {
  const theme = productThemes.read;
  const [email, setEmail] = useState(initialEmail);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLikelyEmail(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/oneread/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setResult(data);
  }

  async function manageBilling() {
    setBusy(true);
    const res = await fetch("/api/oneread/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data.action === "redirect" && data.url) {
      window.location.href = data.url;
    } else if (data.action === "needs_setup") {
      window.location.href = "/subscribe";
    }
  }

  return (
    <main
      className="relative min-h-svh w-full flex flex-col items-center px-5 sm:px-6 pt-7 sm:pt-9 pb-6 sm:pb-8"
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
        } as CSSProperties
      }
    >
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/" label="Back to OneRead" />
        <Logo href="/" ariaLabel="OneRead home" />
      </header>

      <section className="w-full flex flex-col items-center max-w-[30rem] mx-auto py-8 sm:py-10 my-auto">
        <h1 className="font-serif font-medium text-[1.9rem] sm:text-[2.3rem] leading-[1.08] text-ink text-center">
          Manage your OneRead account.
        </h1>
        <p className="mt-3 font-sans text-[14.5px] leading-[1.6] text-ash text-center max-w-[38ch]">
          Look up your subscription to check status or edit your OneArticle
          and OneFilm preferences.
        </p>

        <form onSubmit={lookup} className="mt-6 w-full flex flex-col items-center gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="focus-ring h-12 w-full rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink"
          />
          <button
            type="submit"
            disabled={busy}
            className="focus-ring inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 font-sans text-[14px] font-medium text-white hover:bg-ink/90 disabled:opacity-50"
          >
            {busy ? "Looking up…" : "Look up account"}
          </button>
          {error && <p className="font-sans text-[13px] text-red-600">{error}</p>}
        </form>

        {result && (
          <div className="mt-8 w-full rounded-2xl border border-[var(--theme-border)] bg-white p-5 font-sans text-[14px] text-ink">
            <p className="text-fog text-[12.5px]">OneRead status</p>
            <p className="mb-3">{STATE_LABEL[result.state] ?? result.state}</p>

            <p className="text-fog text-[12.5px]">OneArticle preferences</p>
            <p className="mb-3">{result.articlePreferencesComplete ? "Complete" : "Incomplete"}</p>

            <p className="text-fog text-[12.5px]">OneFilm preferences</p>
            <p className="mb-3">{result.filmPreferencesComplete ? "Complete" : "Incomplete"}</p>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/subscribe"
                className="focus-ring inline-flex h-10 items-center justify-center rounded-full border border-[var(--theme-accent)] px-4 font-sans text-[13px] font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-surface)]"
              >
                Edit preferences
              </Link>
              {(result.state === "trialing" ||
                result.state === "active_paid" ||
                result.state === "canceled_active" ||
                result.state === "active_email_paused" ||
                result.state === "past_due") && (
                <button
                  type="button"
                  onClick={manageBilling}
                  disabled={busy}
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 font-sans text-[13px] font-medium text-white hover:bg-ink/90 disabled:opacity-50"
                >
                  Manage billing
                </button>
              )}
              {(result.state === "checkout_needed" || result.state === "incomplete") && (
                <Link
                  href="/subscribe"
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 font-sans text-[13px] font-medium text-white hover:bg-ink/90"
                >
                  Start checkout
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      <Footer showBackHome backHref="/" backLabel="Back to OneRead" />
    </main>
  );
}
