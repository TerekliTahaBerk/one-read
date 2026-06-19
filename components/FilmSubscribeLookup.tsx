"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isLikelyEmail } from "@/lib/options";
import type { SubscribeState } from "@/lib/subscriptions";

interface LookupResult {
  state: SubscribeState;
  daysLeft?: number;
  periodEndsAt?: string;
}

function present(r: LookupResult): [string, string, string, string] {
  switch (r.state) {
    case "new":
      return ["Set up OneFilm first.", "Choose your film preferences before starting your free trial.", "Set up OneFilm", "/film"];
    case "incomplete":
      return ["Finish your setup.", "Complete your film preferences so OneFilm knows what to send.", "Finish setup", "/film"];
    case "checkout_needed":
      return ["Your preferences are ready.", "Start your 7-day free trial with Polar to begin receiving OneFilm.", "Start free trial", "checkout"];
    case "trialing":
      return [`Your OneFilm is active${r.daysLeft != null ? ` — ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"} left` : ""}.`, "You’re set to receive one thoughtful film note in your inbox.", "Manage billing", "portal"];
    case "active_paid":
      return ["Your OneFilm is active.", "You’re set to receive one thoughtful film note in your inbox.", "Manage billing", "portal"];
    case "active_email_paused":
      return ["Your emails are paused.", "Your subscription is active. Resume email delivery when you’re ready.", "Resume emails", "resume"];
    case "canceled_active":
      return [r.periodEndsAt ? `Active until ${new Date(r.periodEndsAt).toLocaleDateString()}.` : "Active until the end of the period.", "You’ll receive OneFilm until your current billing period ends.", "Manage billing", "portal"];
    case "past_due":
      return ["Payment needs attention.", "Update billing to keep receiving OneFilm.", "Manage billing", "portal"];
    case "suppressed":
      return ["We can’t email this address.", "Please contact support and we’ll sort it out.", "Contact support", "mailto:hello@oneread.app"];
    case "trial_expired":
    case "expired":
    default:
      return ["Your subscription has ended.", "Restart your subscription to receive OneFilm again.", "Restart subscription", "checkout"];
  }
}

export function FilmSubscribeLookup({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (initialEmail && isLikelyEmail(initialEmail)) void lookup(initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  async function lookup(value = email) {
    setLoading(true);
    setError(null);
    setResult(null);
    setResumed(false);
    try {
      const res = await fetch("/api/film/subscribe/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not look up subscription.");
      setResult({ state: data.state, daysLeft: data.daysLeft, periodEndsAt: data.periodEndsAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not look up subscription.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/film/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not start checkout.");
      if (data.action === "redirect" || data.action === "already_active") window.location.href = data.url;
      else if (data.action === "needs_setup_first") window.location.href = "/film";
      else if (data.action === "needs_setup") window.location.href = `/film?email=${encodeURIComponent(email)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setLoading(false);
    }
  }

  async function portal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/film/subscribe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.url) window.location.href = data.url;
      else throw new Error(data.error ?? "Could not open billing.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing.");
    } finally {
      setLoading(false);
    }
  }

  async function resume() {
    setLoading(true);
    try {
      const res = await fetch("/api/film/subscribe/resume-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setResumed(true);
    } finally {
      setLoading(false);
    }
  }

  const view = result ? present(result) : null;
  const primary = "rounded-xl bg-[var(--theme-accent)] px-5 py-2.5 text-[14.5px] font-medium text-white disabled:opacity-40";

  return (
    <div className="w-full">
      <form onSubmit={(e) => { e.preventDefault(); void lookup(); }} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          className="focus-ring h-12 flex-1 rounded-xl border border-[var(--theme-border)] bg-white/75 px-4 text-[16px] text-ink"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className={primary} disabled={!isLikelyEmail(email) || loading}>
          {loading ? "Checking..." : "Check status"}
        </button>
      </form>

      {view && (
        <div className="mt-5 rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-center">
          <h2 className="font-serif text-[26px] leading-tight text-ink">{view[0]}</h2>
          <p className="mt-2 text-[14px] leading-6 text-ash">{resumed ? "Emails are resumed." : view[1]}</p>
          <div className="mt-5">
            {view[3] === "checkout" ? (
              <button onClick={checkout} disabled={loading} className={primary}>{view[2]}</button>
            ) : view[3] === "portal" ? (
              <button onClick={portal} disabled={loading} className={primary}>{view[2]}</button>
            ) : view[3] === "resume" ? (
              <button onClick={resume} disabled={loading || resumed} className={primary}>{view[2]}</button>
            ) : (
              <Link href={view[3]} className={primary}>{view[2]}</Link>
            )}
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-center text-[12.5px] text-dawn">{error}</p>}
    </div>
  );
}
