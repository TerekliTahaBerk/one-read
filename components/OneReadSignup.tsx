"use client";

import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { InterestChip } from "@/components/InterestChip";
import { LanguagePill } from "@/components/LanguagePill";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";
import { ONEREAD_BILLING_LABEL } from "@/lib/oneread/config";
import {
  FILM_EMAIL_LANGUAGES,
  FILM_GENRES,
  FILM_MOODS,
  FILM_DECADES,
  FILM_LANGUAGES,
  FILM_PLATFORMS,
  FILM_SPOILER_PREFERENCES,
  FILM_FAMILIARITIES,
  FILM_RUNTIME_PREFERENCES,
  INTERESTS,
  SOURCE_LANGUAGES,
  SUMMARY_LANGUAGES,
  isLikelyEmail,
} from "@/lib/options";

type Step = "email" | "verify" | "choose" | "language" | "film" | "review" | "active";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export function OneReadSignup({ initialEmail = "" }: { initialEmail?: string }) {
  const { dictionary } = useSiteLanguage();
  const t = dictionary.signup;
  const [step, setStep] = useState<Step>("email");
  const theme =
    step === "film"
      ? productThemes.film
      : step === "language"
        ? productThemes.article
        : productThemes.read;
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [readingLanguage, setReadingLanguage] = useState<string>("English");
  const [sourceLanguage, setSourceLanguage] = useState<string>("Any");
  const [articleInterests, setArticleInterests] = useState<string[]>([]);
  const [filmEmailLanguage, setFilmEmailLanguage] = useState<string>("English");
  const [filmGenres, setFilmGenres] = useState<string[]>([]);
  const [filmMoods, setFilmMoods] = useState<string[]>([]);
  const [filmDecades, setFilmDecades] = useState<string[]>([]);
  const [filmLanguages, setFilmLanguages] = useState<string[]>([]);
  const [filmPlatforms, setFilmPlatforms] = useState<string[]>([]);
  const [spoilerPreference, setSpoilerPreference] = useState<string>("Spoiler-light");
  const [familiarity, setFamiliarity] = useState<string>("Mixed");
  const [runtimePreference, setRuntimePreference] = useState<string>("Any");
  const [articleComplete, setArticleComplete] = useState(false);
  const [filmComplete, setFilmComplete] = useState(false);
  const [settingUpAll, setSettingUpAll] = useState(false);
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
    const article = result.data.articlePreferences;
    setArticleComplete(Boolean(result.data.articlePreferencesComplete));
    if (article) {
      setArticleInterests(article.interests ?? []);
      setSourceLanguage(article.sourceLanguage ?? "Any");
      setReadingLanguage(article.summaryLanguage ?? "English");
    }
    const film = result.data.filmPreferences;
    setFilmComplete(Boolean(result.data.filmPreferencesComplete));
    if (film) {
      setFilmEmailLanguage(film.emailLanguage ?? "English");
      setFilmGenres(film.preferredGenres ?? []);
      setFilmMoods(film.moods ?? []);
      setFilmDecades(film.decades ?? []);
      setFilmLanguages(film.languages ?? []);
      setFilmPlatforms(film.platforms ?? []);
      setSpoilerPreference(film.spoilerPreference ?? "Spoiler-light");
      setFamiliarity(film.familiarity ?? "Mixed");
      setRuntimePreference(film.runtimePreference ?? "Any");
    }
    setStep("choose");
  }

  async function saveLanguage(event: FormEvent) {
    event.preventDefault();
    if (articleInterests.length === 0) {
      setError(t.errors.chooseInterest);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await postJson("/api/oneread/article-preferences", {
      email,
      interests: articleInterests,
      sourceLanguage,
      summaryLanguage: readingLanguage,
    });
    setBusy(false);
    if (!result.ok) {
      setError(t.errors.generic);
      return;
    }
    setArticleComplete(true);
    if (settingUpAll && !filmComplete) {
      setStep("film");
      return;
    }
    setSettingUpAll(false);
    setStep("choose");
  }

  async function saveFilmPreferences(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (filmGenres.length === 0) {
      setError(t.errors.chooseGenre);
      return;
    }
    setBusy(true);
    const result = await postJson("/api/oneread/film-preferences", {
      email,
      emailLanguage: filmEmailLanguage,
      preferredGenres: filmGenres,
      moods: filmMoods,
      decades: filmDecades,
      languages: filmLanguages,
      platforms: filmPlatforms,
      spoilerPreference,
      familiarity,
      runtimePreference,
    });
    setBusy(false);
    if (!result.ok) {
      setError(t.errors.generic);
      return;
    }
    setFilmComplete(true);
    if (settingUpAll && !articleComplete) {
      setStep("language");
      return;
    }
    if (settingUpAll) {
      setSettingUpAll(false);
      setStep("review");
      return;
    }
    setStep("choose");
  }

  function startFullSetup() {
    setError(null);
    setSettingUpAll(true);
    if (!articleComplete) {
      setStep("language");
      return;
    }
    if (!filmComplete) {
      setStep("film");
      return;
    }
    setSettingUpAll(false);
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
    if (result.data.action === "redirect" && result.data.url) {
      window.location.href = result.data.url;
      return;
    }
    if (result.data.action === "already_active") {
      setStep("active");
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

      <section
        className={`flex-1 w-full flex flex-col items-center justify-center mx-auto py-8 ${
          step === "choose" ? "max-w-[40rem]" : "max-w-[34rem]"
        }`}
      >
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

        {step === "choose" && (
          <StepShell title={t.choose.title} support={t.choose.support}>
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              <ProductChoiceCard
                name="OneArticle"
                description={t.choose.articleDescription}
                complete={articleComplete}
                completeLabel={dictionary.preferences.complete}
                actionLabel={articleComplete ? t.choose.articleCtaEdit : t.choose.articleCta}
                accent={productThemes.article.accent}
                surface={productThemes.article.surface}
                border={productThemes.article.border}
                onClick={() => {
                  setSettingUpAll(false);
                  setStep("language");
                }}
              />
              <ProductChoiceCard
                name="OneFilm"
                description={t.choose.filmDescription}
                complete={filmComplete}
                completeLabel={dictionary.preferences.complete}
                actionLabel={filmComplete ? t.choose.filmCtaEdit : t.choose.filmCta}
                accent={productThemes.film.accent}
                surface={productThemes.film.surface}
                border={productThemes.film.border}
                onClick={() => {
                  setSettingUpAll(false);
                  setStep("film");
                }}
              />
            </div>
            <div className="mt-6 flex w-full flex-col items-center gap-3">
              {articleComplete && filmComplete ? (
                <button type="button" onClick={() => setStep("review")} className={primaryButtonClass}>
                  {t.choose.continueReview}
                </button>
              ) : (
                <button type="button" onClick={startFullSetup} className={primaryButtonClass}>
                  {t.choose.setupAll}
                </button>
              )}
            </div>
          </StepShell>
        )}

        {step === "language" && (
          <StepShell title={t.articlePrefs.title} support={t.articlePrefs.support}>
            <form onSubmit={saveLanguage} className="w-full flex flex-col items-center gap-6">
              <PreferenceGroup label="Interests">
                {INTERESTS.map((interest) => (
                  <InterestChip
                    key={interest}
                    label={interest}
                    selected={articleInterests.includes(interest)}
                    onClick={() => setArticleInterests(toggleValue(articleInterests, interest))}
                  />
                ))}
              </PreferenceGroup>
              <PreferenceGroup label={t.articlePrefs.sourceLanguage}>
                {SOURCE_LANGUAGES.map((language) => (
                  <LanguagePill key={language} label={language} selected={sourceLanguage === language} onClick={() => setSourceLanguage(language)} />
                ))}
              </PreferenceGroup>
              <PreferenceGroup label={t.articlePrefs.summaryLanguage}>
              <div className="flex flex-wrap justify-center gap-2">
                {SUMMARY_LANGUAGES.map((language) => (
                  <LanguagePill key={language} label={language} selected={readingLanguage === language} onClick={() => setReadingLanguage(language)} />
                ))}
              </div>
              </PreferenceGroup>
              <Submit busy={busy} wait={t.pleaseWait}>{t.articlePrefs.cta}</Submit>
              {!settingUpAll && (
                <button type="button" onClick={() => setStep("choose")} className={secondaryButtonClass}>
                  ← {t.choose.title}
                </button>
              )}
            </form>
          </StepShell>
        )}

        {step === "film" && (
          <StepShell title={t.filmPrefs.title} support={t.filmPrefs.support}>
            <form onSubmit={saveFilmPreferences} className="w-full flex flex-col items-center gap-6">
              <div className="flex flex-wrap justify-center gap-2">
                {FILM_GENRES.map((genre) => (
                  <InterestChip
                    key={genre}
                    label={genre}
                    selected={filmGenres.includes(genre)}
                    onClick={() => setFilmGenres(toggleValue(filmGenres, genre))}
                  />
                ))}
              </div>
              <ChipGroup label="Moods" options={FILM_MOODS} selected={filmMoods} onChange={setFilmMoods} />
              <ChipGroup label="Decades" options={FILM_DECADES} selected={filmDecades} onChange={setFilmDecades} />
              <ChipGroup label="Original languages" options={FILM_LANGUAGES} selected={filmLanguages} onChange={setFilmLanguages} />
              <ChipGroup label="Platforms" options={FILM_PLATFORMS} selected={filmPlatforms} onChange={setFilmPlatforms} />
              <PillGroup label={t.filmPrefs.emailLanguage} options={FILM_EMAIL_LANGUAGES} selected={filmEmailLanguage} onChange={setFilmEmailLanguage} />
              <PillGroup label="Spoiler preference" options={FILM_SPOILER_PREFERENCES} selected={spoilerPreference} onChange={setSpoilerPreference} />
              <PillGroup label="Discovery style" options={FILM_FAMILIARITIES} selected={familiarity} onChange={setFamiliarity} />
              <PillGroup label="Runtime" options={FILM_RUNTIME_PREFERENCES} selected={runtimePreference} onChange={setRuntimePreference} />
              <Submit busy={busy} wait={t.pleaseWait}>{t.filmPrefs.cta}</Submit>
              {!settingUpAll && (
                <button type="button" onClick={() => setStep("choose")} className={secondaryButtonClass}>
                  ← {t.choose.title}
                </button>
              )}
            </form>
          </StepShell>
        )}

        {step === "review" && (
          <StepShell title={t.review.title} support={t.review.support}>
            <div className="w-full rounded-2xl border border-[var(--theme-border)] bg-white p-5">
              <ReviewRow label="Products" value="OneArticle + OneFilm" />
              <ReviewRow label={t.articlePrefs.summaryLanguage} value={readingLanguage} />
              <ReviewRow label="Article interests" value={articleInterests.join(", ")} />
              <ReviewRow label={t.articlePrefs.sourceLanguage} value={sourceLanguage} />
              <ReviewRow label={t.filmPrefs.emailLanguage} value={filmEmailLanguage} />
              <ReviewRow label="Film genres" value={filmGenres.join(", ")} />
              <ReviewRow label="Film moods" value={filmMoods.join(", ") || "Any"} />
              <ReviewRow label="Plan" value={ONEREAD_BILLING_LABEL} />
              <p className="mt-5 border-t border-[var(--theme-border)] pt-4 text-center font-sans text-[12.5px] leading-relaxed text-fog">
                One subscription includes OneArticle and OneFilm. Cancel anytime.
              </p>
            </div>
            <button type="button" onClick={startCheckout} disabled={busy} className="focus-ring mt-5 inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-7 font-sans text-[14px] font-medium text-white disabled:opacity-50">
              {busy ? t.pleaseWait : t.review.cta.replace("{price}", ONEREAD_BILLING_LABEL.split(" / ")[0])}
            </button>
            <button type="button" onClick={() => setStep("choose")} className={secondaryButtonClass}>
              {t.review.editPreferences}
            </button>
          </StepShell>
        )}

        {step === "active" && (
          <StepShell
            title={dictionary.preferences.states.active_paid}
            support={t.review.support}
          >
            <div className="flex w-full flex-col items-center gap-3">
              <Link
                href={`/preferences?email=${encodeURIComponent(email)}`}
                className={primaryButtonClass}
              >
                {dictionary.preferences.editPreferences}
              </Link>
              <Link href="/" className={secondaryButtonClass}>
                {dictionary.common.backToOneRead}
              </Link>
            </div>
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
      <h1 className="max-w-[22ch] text-balance font-serif text-[2rem] font-medium leading-[1.07] tracking-[-.015em] text-ink sm:text-[2.5rem]">{title}</h1>
      <p className="mt-4 mb-7 max-w-[42ch] font-sans text-[14.5px] leading-[1.65] text-ash">{support}</p>
      {children}
    </div>
  );
}

function Submit({ busy, wait, children }: { busy: boolean; wait: string; children: ReactNode }) {
  return <button type="submit" disabled={busy} className="focus-ring inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-7 font-sans text-[14px] font-medium text-white disabled:opacity-50">{busy ? wait : children}</button>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-5 border-b border-[var(--theme-border)] py-3 font-sans text-[14px] last:border-0"><span className="shrink-0 text-fog">{label}</span><span className="text-right font-medium text-ink">{value}</span></div>;
}

const inputClass = "focus-ring h-12 w-full max-w-[24rem] rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink";
const primaryButtonClass = "focus-ring inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 font-sans text-[14px] font-medium text-white hover:bg-ink/90";
const secondaryButtonClass = "focus-ring inline-flex h-10 items-center justify-center rounded-full px-4 font-sans text-[13px] text-fog hover:text-ink";

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function PreferenceGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="font-sans text-[11px] uppercase tracking-eyebrow text-fog">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <PreferenceGroup label={label}>
      {options.map((option) => (
        <InterestChip key={option} label={option} selected={selected.includes(option)} onClick={() => onChange(toggleValue(selected, option))} />
      ))}
    </PreferenceGroup>
  );
}

function PillGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <PreferenceGroup label={label}>
      {options.map((option) => (
        <LanguagePill key={option} label={option} selected={selected === option} onClick={() => onChange(option)} />
      ))}
    </PreferenceGroup>
  );
}

function ProductChoiceCard({
  name,
  description,
  complete,
  completeLabel,
  actionLabel,
  accent,
  surface,
  border,
  onClick,
}: {
  name: string;
  description: string;
  complete: boolean;
  completeLabel: string;
  actionLabel: string;
  accent: string;
  surface: string;
  border: string;
  onClick: () => void;
}) {
  return (
    <div
      className="flex min-h-[13.5rem] flex-col rounded-3xl border p-5 text-left sm:min-h-[14rem] sm:p-6"
      style={{ borderColor: border, backgroundColor: surface }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="font-serif text-[1.55rem] font-medium leading-none text-ink">{name}</h2>
        {complete && (
          <span
            className="whitespace-nowrap rounded-full bg-white/80 px-2.5 py-1.5 font-sans text-[9.5px] uppercase tracking-[.14em]"
            style={{ color: accent }}
          >
            {completeLabel}
          </span>
        )}
      </div>
      <p className="mt-4 max-w-[28ch] font-sans text-[13.5px] leading-relaxed text-ash">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className="focus-ring mt-auto inline-flex min-h-11 items-center justify-center rounded-full px-4 font-sans text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
