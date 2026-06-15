"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import {
  SignupForm,
  type SignupPhase,
  type Preferences,
} from "@/components/SignupForm";
import { SuccessState } from "@/components/SuccessState";
import { Footer } from "@/components/Footer";

type Phase = SignupPhase | "success" | "canceled";

const COPY: Record<SignupPhase, { lead: string; accent: string; support: string }> = {
  email: {
    lead: "Start your morning with one article ",
    accent: "worth reading.",
    support:
      "Choose your interests and language preferences. Every morning at 7 AM, One Read sends you one curated article summary in your inbox.",
  },
  preferences: {
    lead: "Tell us ",
    accent: "what to read.",
    support:
      "Pick the topics you care about and your languages. We'll match each morning's article to you.",
  },
  payment: {
    lead: "One last step to ",
    accent: "secure your spot.",
    support:
      "Choose a plan and complete your subscription. Cancel anytime in one click — no questions asked.",
  },
  manage: {
    lead: "Welcome back — ",
    accent: "update your reading.",
    support:
      "Adjust your interests and languages, or cancel your subscription. Changes apply to tomorrow's One Read.",
  },
};

// Where the back arrow returns to from each step. Steps not listed have no
// back affordance (email is the entry point; success/canceled are terminal).
const BACK_TO: Partial<Record<Phase, Phase>> = {
  preferences: "email",
  payment: "preferences",
  manage: "email",
};

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  const backTo = BACK_TO[phase];

  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-6 sm:pt-7
        pb-5 sm:pb-6
      "
    >
      {/* Logo + back arrow */}
      <header className="relative w-full flex justify-center animate-rise">
        {backTo && (
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
              hover:text-ink hover:bg-cream/70
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
        )}
        <Logo />
      </header>

      {/* Hero + form */}
      <section
        className="
          flex-1 w-full
          flex flex-col items-center justify-center
          max-w-[38rem] mx-auto
          py-6 sm:py-8
        "
      >
        {phase !== "success" && phase !== "canceled" && (
          // Re-mount on phase change so the rise animations replay smoothly.
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
              onEmailSaved={({ subscribed, preferences: prefs }) => {
                setPreferences(prefs);
                setPhase(subscribed ? "manage" : "preferences");
              }}
              onPreferencesSaved={(prefs) => {
                setPreferences(prefs);
                setPhase("payment");
              }}
              onCompleted={() => setPhase("success")}
              onCanceled={() => setPhase("canceled")}
            />
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

      <Footer showPricing />
    </main>
  );
}
