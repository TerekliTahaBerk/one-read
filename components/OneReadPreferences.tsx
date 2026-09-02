"use client";

import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { isLikelyEmail } from "@/lib/options";
import { productThemes } from "@/lib/product-themes";
import { trackEvent } from "@/lib/analytics";

type Step = "email" | "verify" | "status";
type LookupResult = {
  state: string;
  articlePreferencesComplete: boolean;
  billingManageable?: boolean;
};

export function OneReadPreferences({ initialEmail = "" }: { initialEmail?: string }) {
  const { dictionary } = useSiteLanguage();
  const t = dictionary.preferences;
  const signup = dictionary.signup;
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const theme = productThemes.read;

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isLikelyEmail(email)) return setError(t.errors.invalidEmail);
    setBusy(true);
    const response = await fetch("/api/oneread/verification/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    setBusy(false);
    if (!response.ok) return setError(t.errors.generic);
    trackEvent("verification_requested", { product: "one-article" });
    setStep("verify");
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) return setError(signup.errors.invalidCode);
    setBusy(true);
    const response = await fetch("/api/oneread/verification/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code: code.trim() }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(false);
      return setError(data.error === "incorrect" ? signup.errors.codeIncorrect : data.error === "expired" ? signup.errors.codeExpired : t.errors.generic);
    }
    trackEvent("email_verified", { product: "one-article" });
    await loadStatus();
  }

  async function loadStatus() {
    const response = await fetch("/api/oneread/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !data.ok) return setError(t.errors.generic);
    setResult(data);
    setStep("status");
  }

  async function manageBilling() {
    setBusy(true);
    const response = await fetch("/api/oneread/portal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (response.ok && data.action === "redirect" && data.url) window.location.assign(data.url);
    else if (data.action === "needs_setup" || data.action === "needs_checkout") window.location.assign(`/subscribe?email=${encodeURIComponent(email)}`);
    else if (!response.ok) setError(t.errors.generic);
  }

  async function resumeEmails() {
    setBusy(true);
    const response = await fetch("/api/oneread/resume-emails", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    if (!response.ok) {
      setBusy(false);
      return setError(t.errors.generic);
    }
    trackEvent("email_resubscribed", { product: "one-article" });
    await loadStatus();
  }

  return (
    <main className="relative min-h-svh w-full flex flex-col items-center px-5 sm:px-6 pt-7 sm:pt-9 pb-6 sm:pb-8" style={{ backgroundColor: theme.background, "--theme-accent": theme.accent, "--theme-border": theme.border, "--theme-surface": theme.surface } as CSSProperties}>
      <header className="relative w-full flex justify-center animate-rise"><BackButton href="/" label={dictionary.common.backToOneRead} /><Logo href="/" ariaLabel={dictionary.common.oneReadHome} /></header>
      <section className="w-full flex flex-col items-center max-w-[30rem] mx-auto py-8 sm:py-10 my-auto">
        <h1 className="font-serif font-medium text-[1.9rem] sm:text-[2.3rem] leading-[1.08] text-ink text-center">{t.title}</h1>
        <p className="mt-3 font-sans text-[14.5px] leading-[1.6] text-ash text-center max-w-[38ch]">{t.support}</p>

        {step === "email" && <form onSubmit={requestCode} className="mt-6 w-full flex flex-col items-center gap-3"><label className="sr-only" htmlFor="account-email">{t.placeholder}</label><input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.placeholder} autoComplete="email" required className={inputClass} /><button type="submit" disabled={busy} className={buttonClass}>{busy ? t.lookingUp : t.lookupCta}</button></form>}
        {step === "verify" && <form onSubmit={confirmCode} className="mt-6 w-full flex flex-col items-center gap-3"><p className="font-sans text-[13px] text-fog">{signup.verify.support.replace("{email}", email)}</p><label className="sr-only" htmlFor="account-code">{signup.verify.title}</label><input id="account-code" type="text" inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" autoComplete="one-time-code" maxLength={6} required className={`${inputClass} max-w-[14rem] text-center text-[18px] tracking-[.3em]`} /><button type="submit" disabled={busy} className={buttonClass}>{busy ? t.lookingUp : signup.verify.cta}</button></form>}
        {error && <p role="alert" aria-live="assertive" className="mt-3 font-sans text-[13px] text-red-600">{error}</p>}

        {step === "status" && result && <div className="mt-8 w-full rounded-2xl border border-[var(--theme-border)] bg-white p-5 font-sans text-[14px] text-ink">
          <p className="text-fog text-[12.5px]">{t.statusLabel}</p><p className="mb-3">{t.states[result.state as keyof typeof t.states] ?? result.state}</p>
          <p className="text-fog text-[12.5px]">{t.articleLabel}</p><p className="mb-3">{result.articlePreferencesComplete ? t.complete : t.incomplete}</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/subscribe?email=${encodeURIComponent(email)}`} className={outlineClass}>{t.editPreferences}</Link>
            {result.billingManageable && ["trialing", "active_paid", "canceled_active", "active_email_paused", "past_due"].includes(result.state) && <button type="button" onClick={manageBilling} disabled={busy} className={buttonClass}>{t.manageBilling}</button>}
            {result.state === "active_email_paused" && <button type="button" onClick={resumeEmails} disabled={busy} className={outlineClass}>{t.resumeEmails}</button>}
            {["checkout_needed", "incomplete", "trial_expired", "expired"].includes(result.state) && <Link href={`/subscribe?email=${encodeURIComponent(email)}`} className={buttonClass}>{t.startCheckout}</Link>}
          </div>
        </div>}
      </section>
      <Footer showBackHome backHref="/" backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}

const inputClass = "focus-ring h-12 w-full rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink";
const buttonClass = "focus-ring inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 font-sans text-[14px] font-medium text-white hover:bg-ink/90 disabled:opacity-50";
const outlineClass = "focus-ring inline-flex h-10 items-center justify-center rounded-full border border-[var(--theme-accent)] px-4 font-sans text-[13px] font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-surface)] disabled:opacity-50";
