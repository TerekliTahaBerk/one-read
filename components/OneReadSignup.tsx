"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { LanguagePill } from "@/components/LanguagePill";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";
import { ONEREAD_BILLING_LABEL } from "@/lib/oneread/config";
import {
  SUMMARY_LANGUAGES,
  isLikelyEmail,
} from "@/lib/options";
import { trackEvent } from "@/lib/analytics";

/** Only product the public signup sells today. */
const ONE_ARTICLE_PRODUCT = "one-article";

type Step = "email" | "verify" | "article-prefs" | "review";

/** Steps take on the theme of the product they're currently configuring; everything else stays neutral. */
function themeForStep(step: Step) {
  if (step === "article-prefs") return productThemes.article;
  return productThemes.read;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function OneReadSignup({ initialEmail = "" }: { initialEmail?: string }) {
  const { dictionary } = useSiteLanguage();
  const t = dictionary.signup;
  const [step, setStep] = useState<Step>("email");
  const theme = themeForStep(step);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [summaryLanguage, setSummaryLanguage] = useState<string>("English");


  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLikelyEmail(email)) {
      setError(t.errors.invalidEmail);
      return;
    }
    setBusy(true);
    const { ok, data } = await postJson("/api/oneread/verification/request", { email });
    setBusy(false);
    if (!ok && data.error && data.error !== "invalid_request") {
      setError(t.errors.generic);
      return;
    }
    trackEvent("verification_requested", { product: ONE_ARTICLE_PRODUCT });
    setStep("verify");
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t.errors.invalidCode);
      return;
    }
    setBusy(true);
    const { ok, data } = await postJson("/api/oneread/verification/confirm", {
      email,
      code: code.trim(),
    });
    setBusy(false);
    if (!ok) {
      setError(
        data.error === "incorrect"
          ? t.errors.codeIncorrect
          : data.error === "expired"
            ? t.errors.codeExpired
            : t.errors.generic,
      );
      return;
    }
    trackEvent("email_verified", { product: ONE_ARTICLE_PRODUCT });
    setStep(data.articlePreferencesComplete ? "review" : "article-prefs");
  }

  async function submitArticlePreferences(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { ok } = await postJson("/api/oneread/article-preferences", {
      email,
      summaryLanguage,
    });
    setBusy(false);
    if (!ok) {
      setError(t.errors.generic);
      return;
    }
    trackEvent("preferences_completed", {
      product: ONE_ARTICLE_PRODUCT,
      readingLanguage: summaryLanguage,
    });
    setStep("review");
  }

  async function startCheckout() {
    setError(null);
    trackEvent("checkout_started", {
      product: ONE_ARTICLE_PRODUCT,
      readingLanguage: summaryLanguage,
    });
    setBusy(true);
    const { ok, data } = await postJson("/api/oneread/checkout", { email });
    setBusy(false);
    if (!ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : t.errors.generic,
      );
      return;
    }
    if (data.action === "redirect" && data.url) {
      window.location.href = data.url;
      return;
    }
    if (data.action === "already_active" && data.url) {
      window.location.href = data.url;
      return;
    }
    if (data.action === "needs_setup") {
      setError(t.errors.needsSetup);
      setStep("article-prefs");
    }
  }

  return (
    <main
      className="relative min-h-svh w-full flex flex-col items-center px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5"
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
          "--theme-selected-surface": theme.surface,
          "--theme-page": theme.background,
          "--theme-focus": theme.accent,
        } as CSSProperties
      }
    >
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/" label={dictionary.common.backToOneRead} />
        <Logo href="/" ariaLabel={dictionary.common.oneReadHome} />
      </header>

      <section className="flex-1 w-full flex flex-col items-center justify-center max-w-[36rem] mx-auto py-6 sm:py-8">
        {step === "email" && (
          <StepShell
            title={t.email.title}
            support={t.email.support}
          >
            <form onSubmit={submitEmail} className="w-full flex flex-col items-center gap-3">
              <input
                aria-label={t.email.placeholder}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.email.placeholder}
                autoComplete="email"
                className="focus-ring h-12 w-full max-w-[24rem] rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink"
              />
              <SubmitButton busy={busy} waitLabel={t.pleaseWait}>{t.email.cta}</SubmitButton>
              {error && <ErrorText>{error}</ErrorText>}
            </form>
          </StepShell>
        )}

        {step === "verify" && (
          <StepShell title={t.verify.title} support={t.verify.support.replace("{email}", email)}>
            <form onSubmit={submitCode} className="w-full flex flex-col items-center gap-3">
              <input
                aria-label={t.verify.title}
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="focus-ring h-12 w-full max-w-[14rem] rounded-full border border-[var(--theme-border)] bg-white px-5 text-center font-sans text-[18px] tracking-[0.3em] text-ink"
              />
              <SubmitButton busy={busy} waitLabel={t.pleaseWait}>{t.verify.cta}</SubmitButton>
              {error && <ErrorText>{error}</ErrorText>}
              <button
                type="button"
                onClick={() => setStep("email")}
                className="link-underline mt-1 font-sans text-[12.5px] text-fog"
              >
                {t.verify.useDifferentEmail}
              </button>
            </form>
          </StepShell>
        )}

        {step === "article-prefs" && (
          <StepShell title={t.articlePrefs.title} support={t.articlePrefs.support}>
            <form onSubmit={submitArticlePreferences} className="w-full flex flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-2">
                <p className="font-sans text-[12.5px] text-fog">{t.articlePrefs.summaryLanguage}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUMMARY_LANGUAGES.map((lang) => (
                    <LanguagePill
                      key={lang}
                      label={lang}
                      selected={summaryLanguage === lang}
                      onClick={() => setSummaryLanguage(lang)}
                    />
                  ))}
                </div>
              </div>
              <SubmitButton busy={busy} waitLabel={t.pleaseWait}>{t.articlePrefs.cta}</SubmitButton>
              {error && <ErrorText>{error}</ErrorText>}
            </form>
          </StepShell>
        )}

        {step === "review" && (
          <StepShell title={t.review.title} support={t.review.support}>
            <div className="w-full max-w-[22rem] rounded-2xl border border-[var(--theme-border)] bg-white p-5 font-sans text-[14px] text-ink">
              <p className="text-fog text-[12.5px]">{t.review.emailLabel}</p>
              <p className="mb-3">{email}</p>
              <div>
                <p className="text-fog text-[12.5px]">OneArticle reading language</p>
                <p className="mb-3">{summaryLanguage}</p>
              </div>
              <p className="text-fog text-[12.5px]">{t.review.priceLabel}</p>
              <p>{ONEREAD_BILLING_LABEL} — {t.review.priceIncluded}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep("article-prefs")}
              className="focus-ring mt-4 font-sans text-[13px] text-ash link-underline"
            >
              {t.review.editPreferences}
            </button>
            <button
              type="button"
              onClick={startCheckout}
              disabled={busy}
              className="focus-ring mt-5 inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper hover:brightness-95 disabled:opacity-50"
            >
              {busy ? t.pleaseWait : t.review.cta.replace("{price}", ONEREAD_BILLING_LABEL.split(" / ")[0])}
            </button>
            {error && <ErrorText>{error}</ErrorText>}
          </StepShell>
        )}
      </section>

      <Footer showBackHome backHref="/" backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}

function StepShell({
  title,
  support,
  children,
}: {
  title: string;
  support: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex flex-col items-center animate-rise-delayed">
      <h1 className="font-serif font-medium text-[2rem] sm:text-[2.5rem] leading-[1.06] tracking-[-0.02em] text-ink text-center max-w-[20ch]">
        {title}
      </h1>
      <p className="mt-4 max-w-[42ch] font-sans text-[15px] leading-[1.65] text-ash text-center">
        {support}
      </p>
      <div className="mt-7 w-full flex flex-col items-center">{children}</div>
    </div>
  );
}

function SubmitButton({
  busy,
  waitLabel,
  children,
}: {
  busy: boolean;
  waitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="focus-ring inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper transition-[filter] duration-200 hover:brightness-95 disabled:opacity-50"
    >
      {busy ? waitLabel : children}
    </button>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 font-sans text-[13px] text-red-600">{children}</p>;
}
