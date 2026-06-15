"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { SignupForm, type SignupPhase } from "@/components/SignupForm";
import { SuccessState } from "@/components/SuccessState";
import { Footer } from "@/components/Footer";

type Phase = SignupPhase | "success";

const COPY: Record<
  Exclude<Phase, "success">,
  { eyebrow: string; lead: string; accent: string; support: string }
> = {
  email: {
    eyebrow: "Your morning, curated",
    lead: "Start your morning with one article ",
    accent: "worth reading.",
    support:
      "Choose your interests and language preferences. Every morning at 7\u00A0AM, One\u00A0Read sends you one curated article summary in your inbox.",
  },
  preferences: {
    eyebrow: "Tailored to you",
    lead: "Tell us ",
    accent: "what to read.",
    support:
      "Pick the topics you care about and your languages. We'll match each morning's article to you.",
  },
};

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");

  const copy = phase !== "success" ? COPY[phase] : null;

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
      {/* Logo */}
      <header className="w-full flex justify-center animate-rise">
        <Logo />
      </header>

      {/* Hero + form */}
      <section
        className="
          flex-1 w-full
          flex flex-col items-center justify-center
          max-w-[36rem] mx-auto
          py-3 sm:py-5
        "
      >
        {phase !== "success" && copy && (
          // Re-mount on phase change so the rise animations replay smoothly.
          <div key={phase} className="contents">
            <p
              className="
                font-sans text-[11px] sm:text-[11.5px]
                uppercase tracking-eyebrow
                text-fog text-center
                animate-rise-delayed
              "
            >
              {copy.eyebrow}
            </p>

            <h1
              className="
                font-serif font-medium
                text-[2.05rem] leading-[1.04]
                sm:text-[2.65rem] sm:leading-[1.02]
                tracking-[-0.02em]
                text-ink text-center text-balance
                mt-3 sm:mt-4
                max-w-[15ch]
                animate-rise-delayed-2
              "
            >
              {copy.lead}
              <em className="font-serif italic font-normal text-ink">
                {copy.accent}
              </em>
            </h1>

            <p
              className="
                font-sans
                text-[15px] sm:text-[15.5px] leading-[1.65]
                text-ash text-center text-pretty
                mt-4
                max-w-[42ch]
                animate-rise-delayed-3
              "
            >
              {copy.support}
            </p>

            <SignupForm
              className="mt-6 sm:mt-7"
              phase={phase}
              email={email}
              onEmailChange={setEmail}
              onEmailSaved={() => setPhase("preferences")}
              onCompleted={() => setPhase("success")}
            />
          </div>
        )}

        {phase === "success" && (
          <div className="mt-8 w-full">
            <SuccessState email={email || undefined} />
          </div>
        )}
      </section>

      <Footer showPricing />
    </main>
  );
}
