"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";
import { isLikelyEmail } from "@/lib/options";

type LookupResult = {
  state: string;
  daysLeft?: number;
  periodEndsAt?: string;
  articlePreferencesComplete: boolean;
};

export function OneReadPreferences({ initialEmail = "" }: { initialEmail?: string }) {
  const { dictionary } = useSiteLanguage();
  const t = dictionary.preferences;
  const signup = dictionary.signup;
  const theme = productThemes.read;
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "verify" | "status">("email");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLikelyEmail(email)) {
      setError(t.errors.invalidEmail);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/oneread/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(t.errors.generic);
      return;
    }
    setStep("verify");
  }

  async function confirmCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError(signup.errors.invalidCode);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/oneread/verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setBusy(false);
      setError(
        data.error === "incorrect"
          ? signup.errors.codeIncorrect
          : data.error === "expired"
            ? signup.errors.codeExpired
            : t.errors.generic,
      );
      return;
    }
    await loadStatus();
  }

  async function loadStatus() {
    const res = await fetch("/api/oneread/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(t.errors.generic);
      return;
    }
    setResult(data);
    setStep("status");
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

  async function resumeEmails() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/oneread/resume-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setBusy(false);
      setError(t.errors.generic);
      return;
    }
    await loadStatus();
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
        <BackButton href="/" label={dictionary.common.backToOneRead} />
        <Logo href="/" ariaLabel={dictionary.common.oneReadHome} />
      </header>

      <section className="w-full flex flex-col items-center max-w-[30rem] mx-auto py-8 sm:py-10 my-auto">
        <h1 className="font-serif font-medium text-[1.9rem] sm:text-[2.3rem] leading-[1.08] text-ink text-center">
          {t.title}
        </h1>
        <p className="mt-3 font-sans text-[14.5px] leading-[1.6] text-ash text-center max-w-[38ch]">
          {t.support}
        </p>

        {step === "email" && (
          <form onSubmit={requestCode} className="mt-6 w-full flex flex-col items-center gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.placeholder}
              autoComplete="email"
              className="focus-ring h-12 w-full rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink"
            />
            <button
              type="submit"
              disabled={busy}
              className="focus-ring inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 font-sans text-[14px] font-medium text-white hover:bg-ink/90 disabled:opacity-50"
            >
              {busy ? t.lookingUp : signup.email.cta}
            </button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={confirmCode} className="mt-6 w-full flex flex-col items-center gap-3">
            <p className="font-sans text-[13px] text-fog">
              {signup.verify.support.replace("{email}", email)}
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="focus-ring h-12 w-full max-w-[14rem] rounded-full border border-[var(--theme-border)] bg-white px-5 text-center font-sans text-[18px] tracking-[.3em] text-ink"
            />
            <button
              type="submit"
              disabled={busy}
              className="focus-ring inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 font-sans text-[14px] font-medium text-white hover:bg-ink/90 disabled:opacity-50"
            >
              {busy ? t.lookingUp : signup.verify.cta}
            </button>
          </form>
        )}
        {error && <p className="mt-3 font-sans text-[13px] text-red-600">{error}</p>}

        {step === "status" && result && (
          <div className="mt-8 w-full rounded-2xl border border-[var(--theme-border)] bg-white p-5 font-sans text-[14px] text-ink">
            <p className="text-fog text-[12.5px]">{t.statusLabel}</p>
            <p className="mb-3">{t.states[result.state as keyof typeof t.states] ?? result.state}</p>

            <p className="text-fog text-[12.5px]">{t.articleLabel}</p>
            <p className="mb-3">{result.articlePreferencesComplete ? t.complete : t.incomplete}</p>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/subscribe"
                className="focus-ring inline-flex h-10 items-center justify-center rounded-full border border-[var(--theme-accent)] px-4 font-sans text-[13px] font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-surface)]"
              >
                {t.editPreferences}
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
                  {t.manageBilling}
                </button>
              )}
              {result.state === "active_email_paused" && (
                <button
                  type="button"
                  onClick={resumeEmails}
                  disabled={busy}
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-full border border-[var(--theme-accent)] px-4 font-sans text-[13px] font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-surface)] disabled:opacity-50"
                >
                  {t.resumeEmails}
                </button>
              )}
              {(result.state === "checkout_needed" || result.state === "incomplete") && (
                <Link
                  href="/subscribe"
                  className="focus-ring inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 font-sans text-[13px] font-medium text-white hover:bg-ink/90"
                >
                  {t.startCheckout}
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      <Footer showBackHome backHref="/" backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}
