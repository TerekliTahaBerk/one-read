"use client";

import { useState } from "react";
import Link from "next/link";
import { isLikelyEmail } from "@/lib/options";
import type { SubscribeState } from "@/lib/subscriptions";

interface LookupResult {
  state: SubscribeState;
  daysLeft?: number;
  periodEndsAt?: string;
}

type Cta =
  | { kind: "link"; label: string; href: string; primary?: boolean }
  | { kind: "action"; label: string; action: "resume-emails"; primary?: boolean };

/**
 * Copy + CTAs for each resolved lifecycle state (cases A–J in the plan).
 * Checkout / billing-portal CTAs route to the pricing page for now — the real
 * provider integration (Phase 5/6) will swap these hrefs for live sessions.
 */
function present(
  r: LookupResult,
  email: string,
): { title: string; body: string; ctas: Cta[] } {
  const q = `?email=${encodeURIComponent(email)}`;
  switch (r.state) {
    case "new":
      return {
        title: "Start your free trial first.",
        body: "We don’t have a subscription for this email yet. Start your 7-day free trial — no card required.",
        ctas: [{ kind: "link", label: "Start free trial", href: `/article`, primary: true }],
      };
    case "incomplete":
      return {
        title: "Finish your setup to start your trial.",
        body: "Your email is registered, but your preferences aren’t finished. Complete setup and your 7-day free trial begins.",
        ctas: [{ kind: "link", label: "Finish setup", href: `/article${q}`, primary: true }],
      };
    case "trialing":
      return {
        title: `You’re in your free trial${
          r.daysLeft != null ? ` — ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"} left` : ""
        }.`,
        body: "Keep enjoying One Article. Subscribe now and you won’t be charged until your trial ends.",
        ctas: [
          { kind: "link", label: "Subscribe now", href: `/article/pricing${q}`, primary: true },
          { kind: "link", label: "Continue trial", href: `/article` },
        ],
      };
    case "trial_expired":
      return {
        title: "Your free trial has ended.",
        body: "Subscribe to keep receiving One Article — $2/month or $18/year.",
        ctas: [{ kind: "link", label: "Subscribe", href: `/article/pricing${q}`, primary: true }],
      };
    case "active_paid":
      return {
        title: "You’re already subscribed.",
        body: "Your subscription is active and your daily emails are on.",
        ctas: [
          { kind: "link", label: "Manage billing", href: `/article/pricing${q}`, primary: true },
          { kind: "link", label: "Go to One Article", href: `/article` },
        ],
      };
    case "canceled_active":
      return {
        title: r.periodEndsAt
          ? `Your subscription is active until ${new Date(r.periodEndsAt).toLocaleDateString()}.`
          : "Your subscription is active until the end of the period.",
        body: "You’ve canceled, but you’ll keep receiving One Article until your paid period ends.",
        ctas: [
          { kind: "link", label: "Resume subscription", href: `/article/pricing${q}`, primary: true },
          { kind: "link", label: "Manage billing", href: `/article/pricing${q}` },
        ],
      };
    case "expired":
      return {
        title: "Your subscription has ended.",
        body: "Subscribe again any time to start receiving One Article.",
        ctas: [{ kind: "link", label: "Subscribe again", href: `/article/pricing${q}`, primary: true }],
      };
    case "past_due":
      return {
        title: "Payment needs attention.",
        body: "We couldn’t process your latest payment. Update your payment method to keep your subscription active.",
        ctas: [{ kind: "link", label: "Update payment", href: `/article/pricing${q}`, primary: true }],
      };
    case "active_email_paused":
      return {
        title: "Your subscription is active, but emails are paused.",
        body: "Billing is fine — you just unsubscribed from the daily email. Turn it back on whenever you like.",
        ctas: [
          { kind: "action", label: "Resume emails", action: "resume-emails", primary: true },
          { kind: "link", label: "Manage billing", href: `/article/pricing${q}` },
        ],
      };
    case "suppressed":
      return {
        title: "We can’t set up email for this address.",
        body: "Something’s preventing delivery to this inbox. Please contact support and we’ll sort it out.",
        ctas: [{ kind: "link", label: "Contact support", href: "mailto:hello@oneread.app", primary: true }],
      };
  }
}

export function SubscribeLookup() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  const canSubmit = isLikelyEmail(email) && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setResumed(false);
    try {
      const res = await fetch("/api/subscribe/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setResult({ state: data.state, daysLeft: data.daysLeft, periodEndsAt: data.periodEndsAt });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onResumeEmails() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe/resume-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.resumed) setResumed(true);
    } finally {
      setLoading(false);
    }
  }

  const view = result ? present(result, email) : null;

  return (
    <div className="w-full max-w-[34rem] mx-auto mt-8">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="
            flex-1 rounded-xl border border-[var(--theme-border)] bg-white
            px-4 py-3 font-sans text-[15px] text-ink
            outline-none focus:border-[var(--theme-focus)]
          "
          aria-label="Your email"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="
            rounded-xl px-5 py-3 font-sans text-[15px] font-medium
            bg-[var(--theme-accent)] text-white
            disabled:opacity-40
          "
        >
          {loading ? "Checking…" : "Check status"}
        </button>
      </form>

      {error ? (
        <p className="font-sans text-[14px] text-red-600 mt-4">{error}</p>
      ) : null}

      {view ? (
        <div
          role="status"
          aria-live="polite"
          className="
            mt-7 rounded-2xl border border-[var(--theme-border)]
            bg-[var(--theme-surface)] p-6 sm:p-7 animate-fade-in
          "
        >
          <h2 className="font-serif font-medium text-[1.4rem] leading-[1.2] text-ink">
            {view.title}
          </h2>
          <p className="font-sans text-[15px] leading-[1.6] text-ash mt-3">
            {resumed && result?.state === "active_email_paused"
              ? "Done — your daily emails are back on."
              : view.body}
          </p>

          {!(resumed && result?.state === "active_email_paused") ? (
            <div className="flex flex-wrap gap-3 mt-6">
              {view.ctas.map((cta) =>
                cta.kind === "link" ? (
                  <Link
                    key={cta.label}
                    href={cta.href}
                    className={
                      cta.primary
                        ? "rounded-xl px-5 py-2.5 font-sans text-[14.5px] font-medium bg-[var(--theme-accent)] text-white"
                        : "rounded-xl px-5 py-2.5 font-sans text-[14.5px] font-medium border border-[var(--theme-border)] text-ink"
                    }
                  >
                    {cta.label}
                  </Link>
                ) : (
                  <button
                    key={cta.label}
                    onClick={onResumeEmails}
                    disabled={loading}
                    className="rounded-xl px-5 py-2.5 font-sans text-[14.5px] font-medium bg-[var(--theme-accent)] text-white disabled:opacity-40"
                  >
                    {cta.label}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
