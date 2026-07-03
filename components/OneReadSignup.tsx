"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { InterestChip } from "@/components/InterestChip";
import { LanguagePill } from "@/components/LanguagePill";
import { productThemes, type ProductThemeKey } from "@/lib/product-themes";
import { ONEREAD_BILLING_LABEL } from "@/lib/oneread/config";
import {
  INTERESTS,
  SUMMARY_LANGUAGES,
  SOURCE_LANGUAGES,
  FILM_GENRES,
  FILM_EMAIL_LANGUAGES,
  isLikelyEmail,
} from "@/lib/options";

type Product = "article" | "film";

type Step = "email" | "verify" | "choose" | `${Product}-prefs` | "review" | "done";

const PRODUCT_LABEL: Record<Product, string> = {
  article: "OneArticle",
  film: "OneFilm",
};

/** Each product's own theme key — lets each step (and its ChoiceCard) "wear" that product's color. */
const PRODUCT_THEME_KEY: Record<Product, ProductThemeKey> = {
  article: "article",
  film: "film",
};

/** Steps take on the theme of the product they're currently configuring; everything else stays neutral. */
function themeForStep(step: Step) {
  if (step === "article-prefs") return productThemes.article;
  if (step === "film-prefs") return productThemes.film;
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

export function OneReadSignup() {
  const [step, setStep] = useState<Step>("email");
  const theme = themeForStep(step);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Products left to configure after the one currently on screen (drives the
  // "set up all" flow — one product's form at a time, then on to the next).
  const [queue, setQueue] = useState<Product[]>([]);

  const [done, setDone] = useState<Record<Product, boolean>>({
    article: false,
    film: false,
  });

  const [interests, setInterests] = useState<string[]>([]);
  const [summaryLanguage, setSummaryLanguage] = useState<string>("English");
  const [sourceLanguage, setSourceLanguage] = useState<string>("Any");

  const [filmEmailLanguage, setFilmEmailLanguage] = useState<string>("English");
  const [filmGenres, setFilmGenres] = useState<string[]>([]);

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLikelyEmail(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setBusy(true);
    const { ok, data } = await postJson("/api/oneread/verification/request", { email });
    setBusy(false);
    if (!ok && data.error && data.error !== "invalid_request") {
      setError("Something went wrong. Please try again.");
      return;
    }
    setStep("verify");
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code.");
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
          ? "That code isn't right. Try again."
          : data.error === "expired"
            ? "That code expired. Request a new one."
            : "Something went wrong. Please try again.",
      );
      return;
    }
    setDone({
      article: Boolean(data.articlePreferencesComplete),
      film: Boolean(data.filmPreferencesComplete),
    });
    setStep("choose");
  }

  /** Starts configuring one or more products, one form at a time. */
  function startFlow(products: Product[]) {
    if (products.length === 0) return;
    setQueue(products.slice(1));
    setStep(`${products[0]}-prefs`);
  }

  /** After a product's preferences save, move to the next queued one or review. */
  function advance(justCompleted: Product) {
    setDone((prev) => ({ ...prev, [justCompleted]: true }));
    setQueue((prevQueue) => {
      if (prevQueue.length > 0) {
        setStep(`${prevQueue[0]}-prefs`);
        return prevQueue.slice(1);
      }
      setStep("review");
      return prevQueue;
    });
  }

  async function submitArticlePreferences(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (interests.length === 0) {
      setError("Choose at least one interest.");
      return;
    }
    setBusy(true);
    const { ok } = await postJson("/api/oneread/article-preferences", {
      email,
      interests,
      secondaryInterests: interests,
      summaryLanguage,
      sourceLanguage,
    });
    setBusy(false);
    if (!ok) {
      setError("Something went wrong. Please try again.");
      return;
    }
    advance("article");
  }

  async function submitFilmPreferences(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (filmGenres.length === 0) {
      setError("Choose at least one genre.");
      return;
    }
    setBusy(true);
    const { ok } = await postJson("/api/oneread/film-preferences", {
      email,
      emailLanguage: filmEmailLanguage,
      preferredGenres: filmGenres,
      moods: [],
      decades: [],
      languages: [],
      platforms: [],
      spoilerPreference: "Spoiler-light",
      familiarity: "Mixed",
      runtimePreference: "Any",
    });
    setBusy(false);
    if (!ok) {
      setError("Something went wrong. Please try again.");
      return;
    }
    advance("film");
  }

  async function startCheckout() {
    setError(null);
    setBusy(true);
    const { ok, data } = await postJson("/api/oneread/checkout", { email });
    setBusy(false);
    if (!ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Something went wrong. Please try again.",
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
      setError("Please finish at least one product's preferences first.");
      setStep("choose");
    }
  }

  const anyDone = done.article || done.film;

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
      <header className="w-full flex justify-center animate-rise">
        <Logo href="/" ariaLabel="OneRead home" />
      </header>

      <section className="flex-1 w-full flex flex-col items-center justify-center max-w-[36rem] mx-auto py-6 sm:py-8">
        {step === "email" && (
          <StepShell
            title="Where should we send OneRead?"
            support="Enter your email and we'll send a 6-digit code before setting up your OneRead family preferences."
          >
            <form onSubmit={submitEmail} className="w-full flex flex-col items-center gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="focus-ring h-12 w-full max-w-[24rem] rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink"
              />
              <SubmitButton busy={busy}>Send verification code</SubmitButton>
              {error && <ErrorText>{error}</ErrorText>}
            </form>
          </StepShell>
        )}

        {step === "verify" && (
          <StepShell title="Check your inbox." support={`Enter the 6-digit code we sent to ${email} to continue setting up OneRead.`}>
            <form onSubmit={submitCode} className="w-full flex flex-col items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="focus-ring h-12 w-full max-w-[14rem] rounded-full border border-[var(--theme-border)] bg-white px-5 text-center font-sans text-[18px] tracking-[0.3em] text-ink"
              />
              <SubmitButton busy={busy}>Verify</SubmitButton>
              {error && <ErrorText>{error}</ErrorText>}
              <button
                type="button"
                onClick={() => setStep("email")}
                className="link-underline mt-1 font-sans text-[12.5px] text-fog"
              >
                Use a different email
              </button>
            </form>
          </StepShell>
        )}

        {step === "choose" && (
          <StepShell
            title="What would you like to set up?"
            support="Set up any product in the OneRead family — you can always add the others later."
          >
            <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row">
              <ChoiceCard
                title="OneArticle"
                description="A short article brief on weekdays."
                cta={done.article ? "Edit article preferences" : "Set article preferences"}
                themeKey={PRODUCT_THEME_KEY.article}
                onClick={() => startFlow(["article"])}
              />
              <ChoiceCard
                title="OneFilm"
                description="One thoughtful film note on Saturdays."
                cta={done.film ? "Edit film preferences" : "Set film preferences"}
                themeKey={PRODUCT_THEME_KEY.film}
                onClick={() => startFlow(["film"])}
              />
            </div>
            <button
              type="button"
              onClick={() => startFlow(["article", "film"])}
              className="focus-ring mt-4 font-sans text-[13.5px] text-ink link-underline"
            >
              Set up the whole family
            </button>
            {anyDone && (
              <button
                type="button"
                onClick={() => setStep("review")}
                className="focus-ring mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper hover:brightness-95"
              >
                Continue to review
              </button>
            )}
          </StepShell>
        )}

        {step === "article-prefs" && (
          <StepShell title="Choose your reading interests." support="Choose the topics and reading style for your weekday article brief.">
            <form onSubmit={submitArticlePreferences} className="w-full flex flex-col items-center gap-5">
              <div className="flex flex-wrap justify-center gap-2">
                {INTERESTS.map((label) => (
                  <InterestChip
                    key={label}
                    label={label}
                    selected={interests.includes(label)}
                    onClick={() =>
                      setInterests((prev) =>
                        prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label],
                      )
                    }
                  />
                ))}
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="font-sans text-[12.5px] text-fog">Summary language</p>
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
              <div className="flex flex-col items-center gap-2">
                <p className="font-sans text-[12.5px] text-fog">Source language</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SOURCE_LANGUAGES.map((lang) => (
                    <LanguagePill
                      key={lang}
                      label={lang}
                      selected={sourceLanguage === lang}
                      onClick={() => setSourceLanguage(lang)}
                    />
                  ))}
                </div>
              </div>
              <SubmitButton busy={busy}>Save article preferences</SubmitButton>
              {error && <ErrorText>{error}</ErrorText>}
            </form>
          </StepShell>
        )}

        {step === "film-prefs" && (
          <StepShell title="Choose the kind of films you want." support="Choose the kind of films you want OneRead to recommend on Saturdays.">
            <form onSubmit={submitFilmPreferences} className="w-full flex flex-col items-center gap-5">
              <div className="flex flex-wrap justify-center gap-2">
                {FILM_GENRES.map((genre) => (
                  <InterestChip
                    key={genre}
                    label={genre}
                    selected={filmGenres.includes(genre)}
                    onClick={() =>
                      setFilmGenres((prev) =>
                        prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
                      )
                    }
                  />
                ))}
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="font-sans text-[12.5px] text-fog">Email language</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {FILM_EMAIL_LANGUAGES.map((lang) => (
                    <LanguagePill
                      key={lang}
                      label={lang}
                      selected={filmEmailLanguage === lang}
                      onClick={() => setFilmEmailLanguage(lang)}
                    />
                  ))}
                </div>
              </div>
              <SubmitButton busy={busy}>Save film preferences</SubmitButton>
              {error && <ErrorText>{error}</ErrorText>}
            </form>
          </StepShell>
        )}

        {step === "review" && (
          <StepShell title="Review your OneRead setup." support="At least one product in the family should be set up before checkout.">
            <div className="w-full max-w-[22rem] rounded-2xl border border-[var(--theme-border)] bg-white p-5 font-sans text-[14px] text-ink">
              <p className="text-fog text-[12.5px]">Email</p>
              <p className="mb-3">{email}</p>
              {(["article", "film"] as Product[]).map((p) => (
                <div key={p}>
                  <p className="text-fog text-[12.5px]">{PRODUCT_LABEL[p]}</p>
                  <p className="mb-3">{done[p] ? "Preferences complete" : "Not set up yet"}</p>
                </div>
              ))}
              <p className="text-fog text-[12.5px]">Price</p>
              <p>{ONEREAD_BILLING_LABEL} — the whole OneRead family included</p>
            </div>
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="focus-ring mt-4 font-sans text-[13px] text-ash link-underline"
            >
              Edit preferences
            </button>
            <button
              type="button"
              onClick={startCheckout}
              disabled={busy || !anyDone}
              className="focus-ring mt-5 inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper hover:brightness-95 disabled:opacity-50"
            >
              {busy ? "Please wait…" : `Start OneRead for ${ONEREAD_BILLING_LABEL.split(" / ")[0]}`}
            </button>
            {error && <ErrorText>{error}</ErrorText>}
          </StepShell>
        )}
      </section>

      <Footer showBackHome backHref="/" backLabel="Back to OneRead" />
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

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="focus-ring inline-flex h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper transition-[filter] duration-200 hover:brightness-95 disabled:opacity-50"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 font-sans text-[13px] text-red-600">{children}</p>;
}

function ChoiceCard({
  title,
  description,
  cta,
  themeKey,
  onClick,
}: {
  title: string;
  description: string;
  cta: string;
  themeKey: ProductThemeKey;
  onClick: () => void;
}) {
  const cardTheme = productThemes[themeKey];
  return (
    <div
      className="flex-1 rounded-2xl border bg-white p-5 text-center"
      style={
        {
          borderColor: cardTheme.border,
          "--card-accent": cardTheme.accent,
          "--card-surface": cardTheme.surface,
        } as CSSProperties
      }
    >
      <p className="font-serif text-[1.1rem] font-medium text-ink">{title}</p>
      <p className="mt-2 font-sans text-[13px] leading-snug text-ash">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className="focus-ring mt-4 inline-flex h-10 items-center justify-center rounded-full border border-[var(--card-accent)] px-4 font-sans text-[13px] font-medium text-[var(--card-accent)] transition-colors duration-200 hover:bg-[var(--card-surface)]"
      >
        {cta}
      </button>
    </div>
  );
}
