"use client";

import Link from "next/link";
import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { InterestChip } from "@/components/InterestChip";
import { LanguagePill } from "@/components/LanguagePill";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { ONEREAD_BILLING_LABEL } from "@/lib/oneread/config";
import { INTERESTS, SOURCE_LANGUAGES, SUMMARY_LANGUAGES, isLikelyEmail } from "@/lib/options";
import { productThemes } from "@/lib/product-themes";

type Step = "email" | "verify" | "preferences" | "review" | "active";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: response.ok, data: await response.json().catch(() => ({})) };
}

export function OneReadSignup({ initialEmail = "" }: { initialEmail?: string }) {
  const { dictionary } = useSiteLanguage();
  const t = dictionary.signup;
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [readingLanguage, setReadingLanguage] = useState("English");
  const [sourceLanguage, setSourceLanguage] = useState("Any");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isLikelyEmail(email)) return setError(t.errors.invalidEmail);
    setBusy(true);
    const result = await postJson("/api/oneread/verification/request", { email });
    setBusy(false);
    if (!result.ok) return setError(t.errors.generic);
    setStep("verify");
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) return setError(t.errors.invalidCode);
    setBusy(true);
    const result = await postJson("/api/oneread/verification/confirm", { email, code: code.trim() });
    setBusy(false);
    if (!result.ok) {
      return setError(result.data.error === "incorrect" ? t.errors.codeIncorrect : result.data.error === "expired" ? t.errors.codeExpired : t.errors.generic);
    }
    const preferences = result.data.articlePreferences;
    if (preferences) {
      setInterests(preferences.interests ?? []);
      setSourceLanguage(preferences.sourceLanguage ?? "Any");
      setReadingLanguage(preferences.summaryLanguage ?? "English");
    }
    setStep("preferences");
  }

  async function savePreferences(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (interests.length === 0) return setError(t.errors.chooseInterest);
    setBusy(true);
    const result = await postJson("/api/oneread/article-preferences", {
      email,
      interests,
      sourceLanguage,
      summaryLanguage: readingLanguage,
    });
    setBusy(false);
    if (!result.ok) return setError(t.errors.generic);
    setStep("review");
  }

  async function startCheckout() {
    setBusy(true);
    setError(null);
    const result = await postJson("/api/oneread/checkout", { email });
    setBusy(false);
    if (!result.ok) return setError(t.errors.generic);
    if (result.data.action === "redirect" && result.data.url) {
      window.location.assign(result.data.url);
      return;
    }
    if (result.data.action === "already_active") return setStep("active");
    setError(t.errors.needsSetup);
  }

  return (
    <main className="relative min-h-svh w-full flex flex-col items-center px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5" style={{ backgroundColor: productThemes.read.background, "--theme-accent": productThemes.article.accent, "--theme-border": productThemes.article.border, "--theme-surface": productThemes.article.surface, "--theme-focus": productThemes.article.accent } as CSSProperties}>
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/" label={dictionary.common.backToOneRead} />
        <Logo href="/" ariaLabel={dictionary.common.oneReadHome} />
      </header>
      <section className="flex-1 w-full max-w-[36rem] flex flex-col items-center justify-center py-8">
        {step === "email" && <StepShell title={t.email.title} support={t.email.support}>
          <form onSubmit={submitEmail} className="w-full flex flex-col items-center gap-3">
            <label className="sr-only" htmlFor="signup-email">{t.email.placeholder}</label>
            <input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.email.placeholder} autoComplete="email" required className={inputClass} />
            <Submit busy={busy} wait={t.pleaseWait}>{t.email.cta}</Submit>
          </form>
        </StepShell>}

        {step === "verify" && <StepShell title={t.verify.title} support={t.verify.support.replace("{email}", email)}>
          <form onSubmit={submitCode} className="w-full flex flex-col items-center gap-3">
            <label className="sr-only" htmlFor="verification-code">{t.verify.title}</label>
            <input id="verification-code" type="text" inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" autoComplete="one-time-code" maxLength={6} required className={`${inputClass} max-w-[14rem] text-center text-[18px] tracking-[.3em]`} />
            <Submit busy={busy} wait={t.pleaseWait}>{t.verify.cta}</Submit>
            <button type="button" onClick={() => { setCode(""); setStep("email"); }} className={secondaryButtonClass}>{t.verify.useDifferentEmail}</button>
          </form>
        </StepShell>}

        {step === "preferences" && <StepShell title={t.articlePrefs.title} support={t.articlePrefs.support}>
          <form onSubmit={savePreferences} className="w-full flex flex-col items-center gap-6">
            <PreferenceGroup label="Interests">{INTERESTS.map((interest) => <InterestChip key={interest} label={interest} selected={interests.includes(interest)} onClick={() => setInterests(toggleValue(interests, interest))} />)}</PreferenceGroup>
            <PreferenceGroup label={t.articlePrefs.sourceLanguage}>{SOURCE_LANGUAGES.map((language) => <LanguagePill key={language} label={language} selected={sourceLanguage === language} onClick={() => setSourceLanguage(language)} />)}</PreferenceGroup>
            <PreferenceGroup label={t.articlePrefs.summaryLanguage}>{SUMMARY_LANGUAGES.map((language) => <LanguagePill key={language} label={language} selected={readingLanguage === language} onClick={() => setReadingLanguage(language)} />)}</PreferenceGroup>
            <Submit busy={busy} wait={t.pleaseWait}>{t.articlePrefs.cta}</Submit>
          </form>
        </StepShell>}

        {step === "review" && <StepShell title={t.review.title} support={t.review.support}>
          <div className="w-full rounded-2xl border border-[var(--theme-border)] bg-white p-5">
            <ReviewRow label="Product" value="OneArticle" />
            <ReviewRow label={t.articlePrefs.summaryLanguage} value={readingLanguage} />
            <ReviewRow label="Interests" value={interests.join(", ")} />
            <ReviewRow label={t.articlePrefs.sourceLanguage} value={sourceLanguage} />
            <ReviewRow label={t.review.priceLabel} value={ONEREAD_BILLING_LABEL} />
            <p className="mt-5 border-t border-[var(--theme-border)] pt-4 text-center font-sans text-[12.5px] leading-relaxed text-fog">{t.review.priceIncluded}</p>
          </div>
          <button type="button" onClick={startCheckout} disabled={busy} className="focus-ring mt-5 inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-7 font-sans text-[14px] font-medium text-white disabled:opacity-50">{busy ? t.pleaseWait : t.review.cta.replace("{price}", ONEREAD_BILLING_LABEL.split(" / ")[0])}</button>
          <button type="button" onClick={() => setStep("preferences")} className={secondaryButtonClass}>{t.review.editPreferences}</button>
        </StepShell>}

        {step === "active" && <StepShell title={dictionary.preferences.states.active_paid} support={dictionary.preferences.support}>
          <Link href={`/preferences?email=${encodeURIComponent(email)}`} className={primaryButtonClass}>{dictionary.preferences.editPreferences}</Link>
        </StepShell>}
        {error && <p role="alert" aria-live="assertive" className="mt-4 font-sans text-[13px] text-red-600">{error}</p>}
      </section>
      <Footer showBackHome backHref="/" backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}

function StepShell({ title, support, children }: { title: string; support: string; children: ReactNode }) {
  return <div className="w-full flex flex-col items-center text-center animate-rise"><h1 className="max-w-[22ch] text-balance font-serif text-[2rem] font-medium leading-[1.07] tracking-[-.015em] text-ink sm:text-[2.5rem]">{title}</h1><p className="mt-4 mb-7 max-w-[42ch] font-sans text-[14.5px] leading-[1.65] text-ash">{support}</p>{children}</div>;
}

function PreferenceGroup({ label, children }: { label: string; children: ReactNode }) {
  return <fieldset className="flex w-full flex-col items-center gap-3"><legend className="font-sans text-[11px] uppercase tracking-eyebrow text-fog">{label}</legend><div className="flex flex-wrap justify-center gap-2">{children}</div></fieldset>;
}

function Submit({ busy, wait, children }: { busy: boolean; wait: string; children: ReactNode }) {
  return <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? wait : children}</button>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-5 border-b border-[var(--theme-border)] py-3 font-sans text-[14px] last:border-0"><span className="shrink-0 text-fog">{label}</span><span className="text-right font-medium text-ink">{value}</span></div>;
}

function toggleValue(values: string[], value: string): string[] { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }

const inputClass = "focus-ring h-12 w-full max-w-[24rem] rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink";
const primaryButtonClass = "focus-ring inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 font-sans text-[14px] font-medium text-white hover:bg-ink/90 disabled:opacity-50";
const secondaryButtonClass = "focus-ring inline-flex h-10 items-center justify-center rounded-full px-4 font-sans text-[13px] text-fog hover:text-ink";
