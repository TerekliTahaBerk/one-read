"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { SignupForm, type SignupPhase } from "@/components/SignupForm";
import { SuccessState } from "@/components/SuccessState";
import { Footer } from "@/components/Footer";

type Phase = SignupPhase | "success";

const COPY: Record<
  Exclude<Phase, "success">,
  { lead: string; accent: string; support: string }
> = {
  email: {
    lead: "Start your morning with one article ",
    accent: "worth reading.",
    support:
      "Choose your interests and language preferences. Every morning at 7\u00A0AM, One\u00A0Read sends you one curated article summary in your inbox.",
  },
  preferences: {
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
          max-w-[38rem] mx-auto
          py-6 sm:py-8
        "
      >
        {phase !== "success" && copy && (
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
              {copy.lead}
              <em className="font-serif italic font-normal text-ink">
                {copy.accent}
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
              {copy.support}
            </p>

            <SignupForm
              className="mt-7 sm:mt-8"
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
