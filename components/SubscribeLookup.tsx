"use client";

import { useState } from "react";
import Link from "next/link";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { isLikelyEmail, type BillingInterval } from "@/lib/options";
import { LEGACY_SUBSCRIBE_DICTIONARIES, type LegacySubscribeDict } from "@/lib/legacy-subscribe-i18n";
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

function prefersSameTabExternalRedirect(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}

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
  t: LegacySubscribeDict,
  locale: string,
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
        title: t.states.new.title,
        body: t.states.new.body,
        ctas: [{ kind: "link", label: t.cta.setupFirst, href: `/article`, primary: true }],
      };
    case "incomplete":
      return {
        title: t.states.incomplete.title,
        body: t.states.incomplete.body,
        ctas: [{ kind: "link", label: t.cta.finishSetup, href: `/article${q}`, primary: true }],
      };
    case "checkout_needed":
      return {
        title: t.states.checkout_needed.title,
        body: t.states.checkout_needed.body,
        ctas: [buy(t.cta.startTrial, "monthly", true)],
      };
    case "trialing":
      return {
        title: `${t.states.trialing.titleBase}${r.daysLeft != null ? t.states.trialing.daysSuffix(r.daysLeft) : ""}.`,
        body: t.states.trialing.body,
        ctas: [manage(t.cta.manageBilling, true), { kind: "link", label: t.cta.goToProduct, href: `/article` }],
      };
    case "trial_expired":
      return {
        title: t.states.trial_expired.title,
        body: t.states.trial_expired.body,
        ctas: [buy(t.cta.restartSubscription, "monthly", true)],
      };
    case "active_paid":
      return {
        title: t.states.active_paid.title,
        body: t.states.active_paid.body,
        ctas: [manage(t.cta.manageBilling, true), { kind: "link", label: t.cta.goToProduct, href: `/article` }],
      };
    case "canceled_active":
      return {
        title: r.periodEndsAt
          ? t.states.canceled_active.titleUntil(new Date(r.periodEndsAt).toLocaleDateString(locale))
          : t.states.canceled_active.titleFallback,
        body: t.states.canceled_active.body,
        ctas: [manage(t.cta.manageBilling, true), manage(t.cta.resumeSubscription)],
      };
    case "expired":
      return {
        title: t.states.expired.title,
        body: t.states.expired.body,
        ctas: [buy(t.cta.restartSubscription, "monthly", true)],
      };
    case "past_due":
      return {
        title: t.states.past_due.title,
        body: t.states.past_due.body,
        ctas: [manage(t.cta.manageBilling, true)],
      };
    case "active_email_paused":
      return {
        title: t.states.active_email_paused.title,
        body: t.states.active_email_paused.body,
        ctas: [{ kind: "resume-emails", label: t.cta.resumeEmails, primary: true }, manage(t.cta.manageBilling)],
      };
    case "suppressed":
      return {
        title: t.states.suppressed.title,
        body: t.states.suppressed.body,
        ctas: [{ kind: "link", label: t.cta.contactSupport, href: "mailto:hello@oneread.app", primary: true }],
      };
  }
}

export function SubscribeLookup({ billingEnabled = false }: { billingEnabled?: boolean }) {
  const { locale } = useSiteLanguage();
  const t = LEGACY_SUBSCRIBE_DICTIONARIES.article[locale];
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
        setError(data.error ?? t.genericError);
      } else {
        setResult({ state: data.state, daysLeft: data.daysLeft, periodEndsAt: data.periodEndsAt });
      }
    } catch {
      setError(t.genericError);
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
    const sameTabRedirect = prefersSameTabExternalRedirect();
    const checkoutWindow = sameTabRedirect ? null : window.open("about:blank", "_blank");
    if (checkoutWindow) checkoutWindow.opener = null;
    let redirected = false;
    try {
      const res = await fetch("/api/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? t.couldNotCheckout);
      } else if (data.action === "redirect" || data.action === "already_active") {
        redirected = true;
        if (checkoutWindow) {
          checkoutWindow.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else if (data.action === "needs_setup_first") {
        window.location.href = "/article";
      } else if (data.action === "needs_setup") {
        window.location.href = `/article?email=${encodeURIComponent(email)}`;
      }
    } catch {
      checkoutWindow?.close();
      setError(t.couldNotCheckout);
    } finally {
      if (!redirected) checkoutWindow?.close();
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
      } else if (data.action === "needs_setup") {
        window.location.href = `/article?email=${encodeURIComponent(email)}`;
      } else if (data.action === "needs_checkout") {
        await onCheckout("monthly");
      } else {
        setError(data.error ?? t.couldNotOpenBilling);
      }
    } catch {
      setError(t.couldNotOpenBilling);
    } finally {
      setLoading(false);
    }
  }

  const view = result ? present(result, email, billingEnabled, t, locale) : null;
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
          placeholder={t.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-xl border border-[var(--theme-border)] bg-white px-4 py-3 font-sans text-[15px] text-ink outline-none focus:border-[var(--theme-focus)]"
          aria-label={t.emailAriaLabel}
        />
        <button type="submit" disabled={!canSubmit} className={primaryBtn}>
          {loading ? t.checking : t.checkStatus}
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
            {emailsResumed ? t.states.active_email_paused.resumedBody : view.body}
          </p>

          {!emailsResumed ? (
            <div className="flex flex-wrap gap-3 mt-6">{view.ctas.map(renderCta)}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
