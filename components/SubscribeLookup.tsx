"use client";

import { useState } from "react";
import Link from "next/link";
import { isLikelyEmail, type BillingInterval } from "@/lib/options";
import type { SubscribeState } from "@/lib/subscriptions";

interface LookupResult {
  state: SubscribeState;
  daysLeft?: number;
  periodEndsAt?: string;
}

type Cta =
  | { kind: "link"; label: string; href: string; primary?: boolean }
  | { kind: "resume-emails"; label: string; primary?: boolean }
  | { kind: "checkout"; label: string; plan?: BillingInterval; primary?: boolean }
  | { kind: "portal"; label: string; primary?: boolean };

/**
 * Copy + CTAs for each resolved lifecycle state (cases A–J in the plan).
 *
 * When billing is available (mock in dev, real provider later) the checkout /
 * portal CTAs call the billing endpoints. When it isn't, they degrade to a
 * link to the pricing page so the page never dead-ends.
 */
function present(
  r: LookupResult,
  email: string,
  billingEnabled: boolean,
): { title: string; body: string; ctas: Cta[] } {
  const q = `?email=${encodeURIComponent(email)}`;
  const pricing = `/article/pricing${q}`;
  // A checkout CTA when billing is on; otherwise a link to pricing.
  const buy = (label: string, plan: BillingInterval = "monthly", primary?: boolean): Cta =>
    billingEnabled ? { kind: "checkout", label, plan, primary } : { kind: "link", label, href: pricing, primary };
  const manage = (label: string, primary?: boolean): Cta =>
    billingEnabled ? { kind: "portal", label, primary } : { kind: "link", label, href: pricing, primary };

  switch (r.state) {
    case "new":
      return {
        title: "Start your setup first.",
        body: "We don’t have a OneArticle setup for this email yet. Save your preferences first, then start the 7-day trial through Polar.",
        ctas: [{ kind: "link", label: "Start setup", href: `/article`, primary: true }],
      };
    case "incomplete":
      return {
        title: "Finish your setup to start your trial.",
        body: "Your email is registered, but your preferences aren’t finished. Complete setup, then start the 7-day trial in checkout.",
        ctas: [{ kind: "link", label: "Finish setup", href: `/article${q}`, primary: true }],
      };
    case "checkout_needed":
      return {
        title: "Start your 7-day free trial.",
        body: "Your preferences are saved. Polar handles the trial and subscription, so emails begin after checkout is confirmed.",
        ctas: [buy("Start 7-day free trial", "monthly", true)],
      };
    case "trialing":
      return {
        title: `You’re in your free trial${
          r.daysLeft != null ? ` — ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"} left` : ""
        }.`,
        body: "Your Polar-confirmed trial is active and your daily emails are on.",
        ctas: [manage("Manage billing", true), { kind: "link", label: "Go to One Article", href: `/article` }],
      };
    case "trial_expired":
      return {
        title: "Your free trial has ended.",
        body: "Subscribe to keep receiving One Article — $2/month or $18/year.",
        ctas: [buy("Subscribe $2/mo", "monthly", true), buy("Subscribe $18/yr", "annual")],
      };
    case "active_paid":
      return {
        title: "You’re already subscribed.",
        body: "Your subscription is active and your daily emails are on.",
        ctas: [manage("Manage billing", true), { kind: "link", label: "Go to One Article", href: `/article` }],
      };
    case "canceled_active":
      return {
        title: r.periodEndsAt
          ? `Your subscription is active until ${new Date(r.periodEndsAt).toLocaleDateString()}.`
          : "Your subscription is active until the end of the period.",
        body: "You’ve canceled, but you’ll keep receiving One Article until your paid period ends.",
        ctas: [manage("Resume subscription", true), manage("Manage billing")],
      };
    case "expired":
      return {
        title: "Your subscription has ended.",
        body: "Subscribe again any time to start receiving One Article.",
        ctas: [buy("Subscribe again", "monthly", true)],
      };
    case "past_due":
      return {
        title: "Payment needs attention.",
        body: "We couldn’t process your latest payment. Update your payment method to keep your subscription active.",
        ctas: [manage("Update payment", true)],
      };
    case "active_email_paused":
      return {
        title: "Your subscription is active, but emails are paused.",
        body: "Billing is fine — you just unsubscribed from the daily email. Turn it back on whenever you like.",
        ctas: [{ kind: "resume-emails", label: "Resume emails", primary: true }, manage("Manage billing")],
      };
    case "suppressed":
      return {
        title: "We can’t set up email for this address.",
        body: "Something’s preventing delivery to this inbox. Please contact support and we’ll sort it out.",
        ctas: [{ kind: "link", label: "Contact support", href: "mailto:hello@oneread.app", primary: true }],
      };
  }
}

export function SubscribeLookup({ billingEnabled = false }: { billingEnabled?: boolean }) {
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

  async function onCheckout(plan: BillingInterval) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not start checkout.");
      } else if (data.action === "redirect" || data.action === "already_active") {
        window.location.href = data.url;
      } else if (data.action === "needs_setup_first") {
        window.location.href = "/article";
      } else if (data.action === "needs_setup") {
        window.location.href = `/article?email=${encodeURIComponent(email)}`;
      }
    } catch {
      setError("Could not start checkout.");
    } finally {
      setLoading(false);
    }
  }

  async function onPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.action === "redirect") {
        window.location.href = data.url;
      } else if (data.action === "needs_setup_first") {
        window.location.href = "/article";
      } else {
        setError(data.error ?? "Could not open billing.");
      }
    } catch {
      setError("Could not open billing.");
    } finally {
      setLoading(false);
    }
  }

  const view = result ? present(result, email, billingEnabled) : null;
  const emailsResumed = resumed && result?.state === "active_email_paused";

  const primaryBtn =
    "rounded-xl px-5 py-2.5 font-sans text-[14.5px] font-medium bg-[var(--theme-accent)] text-white disabled:opacity-40";
  const secondaryBtn =
    "rounded-xl px-5 py-2.5 font-sans text-[14.5px] font-medium border border-[var(--theme-border)] text-ink disabled:opacity-40";

  function renderCta(cta: Cta) {
    const cls = cta.primary ? primaryBtn : secondaryBtn;
    switch (cta.kind) {
      case "link":
        return (
          <Link key={cta.label} href={cta.href} className={cls}>
            {cta.label}
          </Link>
        );
      case "resume-emails":
        return (
          <button key={cta.label} onClick={onResumeEmails} disabled={loading} className={cls}>
            {cta.label}
          </button>
        );
      case "checkout":
        return (
          <button key={cta.label} onClick={() => onCheckout(cta.plan ?? "monthly")} disabled={loading} className={cls}>
            {cta.label}
          </button>
        );
      case "portal":
        return (
          <button key={cta.label} onClick={onPortal} disabled={loading} className={cls}>
            {cta.label}
          </button>
        );
    }
  }

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
          className="flex-1 rounded-xl border border-[var(--theme-border)] bg-white px-4 py-3 font-sans text-[15px] text-ink outline-none focus:border-[var(--theme-focus)]"
          aria-label="Your email"
        />
        <button type="submit" disabled={!canSubmit} className={primaryBtn}>
          {loading ? "Checking…" : "Check status"}
        </button>
      </form>

      {error ? <p className="font-sans text-[14px] text-red-600 mt-4">{error}</p> : null}

      {view ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-7 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-7 animate-fade-in"
        >
          <h2 className="font-serif font-medium text-[1.4rem] leading-[1.2] text-ink">{view.title}</h2>
          <p className="font-sans text-[15px] leading-[1.6] text-ash mt-3">
            {emailsResumed ? "Done — your daily emails are back on." : view.body}
          </p>

          {!emailsResumed ? (
            <div className="flex flex-wrap gap-3 mt-6">{view.ctas.map(renderCta)}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
