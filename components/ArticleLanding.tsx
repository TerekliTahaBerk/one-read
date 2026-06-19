"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import {
  SignupForm,
  type Preferences,
  type SignupPhase,
} from "@/components/SignupForm";
import { SampleEmailPreview } from "@/components/SampleEmailPreview";
import { SuccessState } from "@/components/SuccessState";
import { productThemes } from "@/lib/product-themes";

type Phase = SignupPhase | "success" | "canceled";

const COPY: Record<SignupPhase, { lead: string; accent: string; support: string }> = {
  email: {
    lead: "Where should we send ",
    accent: "your morning brief?",
    support:
      "Enter your email and we’ll send a 6-digit code before setting up OneArticle. One carefully chosen article brief, every morning at 7 AM.",
  },
  verify: {
    lead: "Check ",
    accent: "your inbox.",
    support:
      "Enter the 6-digit code we just sent to continue setting up OneArticle.",
  },
  preferences: {
    lead: "Choose your ",
    accent: "reading interests.",
    support:
      "Pick a few areas you want OneArticle to pay attention to. We’ll use them to choose better morning reads for you.",
  },
  payment: {
    lead: "You’re ",
    accent: "almost there.",
    support:
      "Your preferences are saved. Start your 7-day free trial with Polar to begin receiving OneArticle every morning.",
  },
  manage: {
    lead: "Your OneArticle ",
    accent: "is active.",
    support:
      "Update your interests and languages, or cancel anytime. Changes apply to tomorrow’s brief.",
  },
};

// Where the back arrow returns to from each step. The email step uses the same
// affordance to return to the OneRead umbrella homepage.
const BACK_TO: Partial<Record<Phase, Phase>> = {
  verify: "email",
  preferences: "email",
  payment: "preferences",
  manage: "email",
};

export function ArticleLanding() {
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  const backTo = BACK_TO[phase];
  const theme = productThemes.article;

  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-5 sm:pt-6
        pb-4 sm:pb-5
      "
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
          "--theme-selected-surface": theme.selectedSurface,
          "--theme-page": theme.background,
          "--theme-focus": theme.accent,
        } as CSSProperties
      }
    >
      <header className="relative w-full flex justify-center animate-rise">
        {backTo ? (
          <button
            type="button"
            onClick={() => setPhase(backTo)}
            aria-label="Go back"
            className="
              focus-ring
              absolute left-0 top-1/2 -translate-y-1/2
              inline-flex h-10 w-10 items-center justify-center
              rounded-full text-ash
              transition-colors duration-200
              hover:text-ink hover:bg-[var(--theme-surface)]
            "
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M12 7H2M6 3L2 7l4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : phase === "email" ? (
          <Link
            href="/"
            aria-label="Back to OneRead"
            className="
              focus-ring
              absolute left-0 top-1/2 -translate-y-1/2
              inline-flex h-10 w-10 items-center justify-center
              rounded-full text-ash
              transition-colors duration-200
              hover:text-ink hover:bg-[var(--theme-surface)]
            "
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M12 7H2M6 3L2 7l4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : null}
        <Logo label="OneArticle" href="/article" ariaLabel="OneArticle home" />
      </header>

      <section
        className="
          flex-1 w-full
          flex flex-col items-center justify-center
          max-w-[38rem] mx-auto
          py-4 sm:py-5
        "
      >
        {phase !== "success" && phase !== "canceled" && (
          <div key={phase} className="contents">
            <h1
              className="
                font-serif font-medium
                text-[2.5rem] leading-[1.02]
                sm:text-[3.6rem] sm:leading-[0.98]
                tracking-[-0.028em]
                text-ink text-center text-balance
                max-w-[15ch]
                animate-rise-delayed
              "
            >
              {COPY[phase].lead}
              <em className="font-serif italic font-normal text-ink">
                {COPY[phase].accent}
              </em>
            </h1>

            <p
              className="
                font-sans
                text-[15px] sm:text-[16px] leading-[1.65]
                text-ash text-center text-pretty
                mt-5 sm:mt-6
                max-w-[42ch]
                animate-rise-delayed-2
              "
            >
              {COPY[phase].support}
            </p>

            <SignupForm
              className="mt-7 sm:mt-8"
              phase={phase}
              email={email}
              initialPreferences={preferences}
              onEmailChange={setEmail}
              onCodeSent={() => setPhase("verify")}
              onVerified={({ subscribed, preferences: prefs }) => {
                setPreferences(prefs);
                setPhase(subscribed ? "manage" : "preferences");
              }}
              onChangeEmail={() => setPhase("email")}
              onPreferencesSaved={(prefs) => {
                setPreferences(prefs);
                setPhase("payment");
              }}
              onCompleted={() => setPhase("success")}
              onCanceled={() => setPhase("canceled")}
            />

            {phase === "email" && (
              <SampleEmailPreview className="mt-10 sm:mt-12 animate-rise-delayed-4" />
            )}
          </div>
        )}

        {phase === "success" && (
          <div className="mt-8 w-full">
            <SuccessState email={email || undefined} />
          </div>
        )}

        {phase === "canceled" && (
          <div className="mt-8 w-full">
            <SuccessState email={email || undefined} variant="canceled" />
          </div>
        )}
      </section>

      <Footer
        showPricing
        pricingHref="/article/pricing"
        tagline="No feed. No app. One good read before the day gets noisy."
        xAriaLabel="OneArticle on X"
      />
    </main>
  );
}
