"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { isLikelyEmail } from "@/lib/options";
import { LEGACY_SUBSCRIBE_DICTIONARIES, type LegacySubscribeDict } from "@/lib/legacy-subscribe-i18n";
import type { SubscribeState } from "@/lib/subscriptions";

interface LookupResult {
  state: SubscribeState;
  daysLeft?: number;
  periodEndsAt?: string;
}

function present(r: LookupResult, email: string, t: LegacySubscribeDict, locale: string) {
  const q = `?email=${encodeURIComponent(email)}`;
  switch (r.state) {
    case "new":
      return [t.states.new.title, t.states.new.body, t.cta.setupFirst, `/lingo`];
    case "incomplete":
      return [t.states.incomplete.title, t.states.incomplete.body, t.cta.finishSetup, `/lingo${q}`];
    case "checkout_needed":
      return [t.states.checkout_needed.title, t.states.checkout_needed.body, t.cta.startTrial, "checkout"];
    case "trialing":
      return [`${t.states.trialing.titleBase}${r.daysLeft != null ? t.states.trialing.daysSuffix(r.daysLeft) : ""}.`, t.states.trialing.body, t.cta.manageBilling, "portal"];
    case "active_paid":
      return [t.states.active_paid.title, t.states.active_paid.body, t.cta.manageBilling, "portal"];
    case "active_email_paused":
      return [t.states.active_email_paused.title, t.states.active_email_paused.body, t.cta.resumeEmails, "resume"];
    case "canceled_active":
      return [
        r.periodEndsAt ? t.states.canceled_active.titleUntil(new Date(r.periodEndsAt).toLocaleDateString(locale)) : t.states.canceled_active.titleFallback,
        t.states.canceled_active.body,
        t.cta.manageBilling,
        "portal",
      ];
    case "past_due":
      return [t.states.past_due.title, t.states.past_due.body, t.cta.manageBilling, "portal"];
    case "suppressed":
      return [t.states.suppressed.title, t.states.suppressed.body, t.cta.contactSupport, "mailto:hello@oneread.app"];
    case "trial_expired":
    case "expired":
      return [t.states.expired.title, t.states.expired.body, t.cta.restartSubscription, "checkout"];
  }
}

export function LingoSubscribeLookup({ initialEmail = "" }: { initialEmail?: string }) {
  const { locale } = useSiteLanguage();
  const t = LEGACY_SUBSCRIBE_DICTIONARIES.lingo[locale];
  const [email, setEmail] = useState(initialEmail);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (initialEmail && isLikelyEmail(initialEmail)) void lookup(initialEmail);
  }, [initialEmail]);

  async function lookup(value = email) {
    setLoading(true);
    setError(null);
    setResult(null);
    setResumed(false);
    try {
      const res = await fetch("/api/lingo/subscribe/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? t.couldNotLookup);
      setResult({ state: data.state, daysLeft: data.daysLeft, periodEndsAt: data.periodEndsAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.couldNotLookup);
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lingo/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? t.couldNotCheckout);
      if (data.action === "redirect" || data.action === "already_active") window.location.href = data.url;
      else if (data.action === "needs_setup_first") window.location.href = "/lingo";
      else if (data.action === "needs_setup") window.location.href = `/lingo?email=${encodeURIComponent(email)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.couldNotCheckout);
    } finally {
      setLoading(false);
    }
  }

  async function portal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lingo/subscribe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.action === "redirect") window.location.href = data.url;
      else if (data.action === "needs_checkout") await checkout();
      else if (data.action === "needs_setup_first") window.location.href = "/lingo";
      else throw new Error(data.error ?? t.couldNotOpenBilling);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.couldNotOpenBilling);
    } finally {
      setLoading(false);
    }
  }

  async function resume() {
    setLoading(true);
    try {
      const res = await fetch("/api/lingo/subscribe/resume-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.resumed) setResumed(true);
    } finally {
      setLoading(false);
    }
  }

  const view = result ? present(result, email, t, locale) : null;
  const primary = "rounded-xl bg-[var(--theme-accent)] px-5 py-2.5 text-[14.5px] font-medium text-white disabled:opacity-40";

  return (
    <div className="w-full">
      <form onSubmit={(e) => { e.preventDefault(); void lookup(); }} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          className="focus-ring h-12 flex-1 rounded-xl border border-[var(--theme-border)] bg-white/75 px-4 text-[16px] text-ink"
          placeholder={t.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className={primary} disabled={!isLikelyEmail(email) || loading}>
          {loading ? t.checking : t.checkStatus}
        </button>
      </form>

      {view && (
        <div className="mt-5 rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-center">
          <h2 className="font-serif text-[26px] leading-tight text-ink">{view[0]}</h2>
          <p className="mt-2 text-[14px] leading-6 text-ash">{resumed ? t.states.active_email_paused.resumedBody : view[1]}</p>
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
