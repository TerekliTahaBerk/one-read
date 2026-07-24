"use client";

import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { LanguagePill } from "@/components/LanguagePill";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";
import { ONEREAD_BILLING_LABEL } from "@/lib/oneread/config";
import { SUMMARY_LANGUAGES, isLikelyEmail } from "@/lib/options";

type Step = "email" | "verify" | "language" | "review";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export function OneReadSignup() {
  const { dictionary } = useSiteLanguage();
  const t = dictionary.signup;
  const theme = productThemes.article;
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [readingLanguage, setReadingLanguage] = useState<string>("English");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isLikelyEmail(email)) {
      setError(t.errors.invalidEmail);
      return;
    }
    setBusy(true);
    const result = await postJson("/api/oneread/verification/request", { email });
    setBusy(false);
    if (!result.ok && result.data.error !== "invalid_request") {
      setError(t.errors.generic);
      return;
    }
    setStep("verify");
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t.errors.invalidCode);
      return;
    }
    setBusy(true);
    const result = await postJson("/api/oneread/verification/confirm", {
      email,
      code: code.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(
        result.data.error === "incorrect"
          ? t.errors.codeIncorrect
          : result.data.error === "expired"
            ? t.errors.codeExpired
            : t.errors.generic,
      );
      return;
    }
    setStep("language");
  }

  async function saveLanguage(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await postJson("/api/oneread/article-preferences", {
      email,
      summaryLanguage: readingLanguage,
    });
    setBusy(false);
    if (!result.ok) {
      setError(t.errors.generic);
      return;
    }
    setStep("review");
  }

  async function startCheckout() {
    setBusy(true);
    setError(null);
    const result = await postJson("/api/oneread/checkout", { email });
    setBusy(false);
    if (!result.ok) {
      setError(typeof result.data.error === "string" ? result.data.error : t.errors.generic);
      return;
    }
    if ((result.data.action === "redirect" || result.data.action === "already_active") && result.data.url) {
      window.location.href = result.data.url;
      return;
    }
    setError(t.errors.needsSetup);
  }

  return (
    <main
      className="relative min-h-svh w-full flex flex-col items-center px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5"
      style={{
        backgroundColor: productThemes.read.background,
        "--theme-accent": theme.accent,
        "--theme-border": theme.border,
        "--theme-surface": theme.surface,
        "--theme-focus": theme.accent,
      } as CSSProperties}
    >
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/" label={dictionary.common.backToOneRead} />
        <Logo href="/" ariaLabel={dictionary.common.oneReadHome} />
      </header>

      <section className="flex-1 w-full flex flex-col items-center justify-center max-w-[34rem] mx-auto py-8">
        {step === "email" && (
          <StepShell title={t.email.title} support={t.email.support}>
            <form onSubmit={submitEmail} className="w-full flex flex-col items-center gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.email.placeholder} autoComplete="email" className={inputClass} />
              <Submit busy={busy} wait={t.pleaseWait}>{t.email.cta}</Submit>
            </form>
          </StepShell>
        )}

        {step === "verify" && (
          <StepShell title={t.verify.title} support={t.verify.support.replace("{email}", email)}>
            <form onSubmit={submitCode} className="w-full flex flex-col items-center gap-3">
              <input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} className={`${inputClass} max-w-[14rem] text-center text-[18px] tracking-[.3em]`} />
              <Submit busy={busy} wait={t.pleaseWait}>{t.verify.cta}</Submit>
            </form>
          </StepShell>
        )}

        {step === "language" && (
          <StepShell title={t.articlePrefs.title} support={t.articlePrefs.support}>
            <form onSubmit={saveLanguage} className="w-full flex flex-col items-center gap-6">
              <div className="flex flex-wrap justify-center gap-2">
                {SUMMARY_LANGUAGES.map((language) => (
                  <LanguagePill key={language} label={language} selected={readingLanguage === language} onClick={() => setReadingLanguage(language)} />
                ))}
              </div>
              <Submit busy={busy} wait={t.pleaseWait}>{t.articlePrefs.cta}</Submit>
            </form>
          </StepShell>
        )}

        {step === "review" && (
          <StepShell title={t.review.title} support={t.review.support}>
            <div className="w-full rounded-2xl border border-[var(--theme-border)] bg-white p-5">
              <ReviewRow label="Product" value="OneArticle" />
              <ReviewRow label={t.articlePrefs.summaryLanguage} value={readingLanguage} />
              <ReviewRow label="Plan" value={ONEREAD_BILLING_LABEL} />
              <p className="mt-5 border-t border-[var(--theme-border)] pt-4 text-center font-sans text-[12.5px] leading-relaxed text-fog">
                OneRead currently includes OneArticle only. Cancel anytime.
              </p>
            </div>
            <button type="button" onClick={startCheckout} disabled={busy} className="focus-ring mt-5 inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-7 font-sans text-[14px] font-medium text-white disabled:opacity-50">
              {busy ? t.pleaseWait : t.review.cta.replace("{price}", ONEREAD_BILLING_LABEL.split(" / ")[0])}
            </button>
          </StepShell>
        )}
        {error && <p className="mt-4 font-sans text-[13px] text-red-600">{error}</p>}
      </section>
      <Footer showBackHome backHref="/" backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}

function StepShell({ title, support, children }: { title: string; support: string; children: ReactNode }) {
  return (
    <div className="w-full flex flex-col items-center text-center animate-rise">
      <h1 className="font-serif font-medium text-[2rem] sm:text-[2.5rem] leading-[1.07] tracking-[-.015em] text-ink max-w-[20ch]">{title}</h1>
      <p className="mt-4 mb-7 max-w-[42ch] font-sans text-[14.5px] leading-[1.65] text-ash">{support}</p>
      {children}
    </div>
  );
}

function Submit({ busy, wait, children }: { busy: boolean; wait: string; children: ReactNode }) {
  return <button type="submit" disabled={busy} className="focus-ring inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-7 font-sans text-[14px] font-medium text-white disabled:opacity-50">{busy ? wait : children}</button>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-[var(--theme-border)] py-3 font-sans text-[14px] last:border-0"><span className="text-fog">{label}</span><span className="font-medium text-ink">{value}</span></div>;
}

const inputClass = "focus-ring h-12 w-full max-w-[24rem] rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink";
