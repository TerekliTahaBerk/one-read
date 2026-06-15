"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { MorningIcon } from "@/components/MorningIcon";
import { SignupForm, type SignupPhase } from "@/components/SignupForm";
import { SuccessState } from "@/components/SuccessState";
import { Footer } from "@/components/Footer";

type Phase = SignupPhase | "success";

const COPY: Record<
  Exclude<Phase, "success">,
  { headline: string; support: string }
> = {
  email: {
    headline: "Start your morning with one article worth reading.",
    support:
      "Choose your interests and language preferences. Every morning at 7\u00A0AM, One\u00A0Read sends you one curated article summary in your inbox.",
  },
  preferences: {
    headline: "Tell us what to read.",
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
        pt-7 sm:pt-9
        pb-6 sm:pb-8
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
          py-8 sm:py-10
        "
      >
        <div className="animate-rise-delayed">
          <MorningIcon className="mx-auto" />
        </div>

        {phase !== "success" && copy && (
          // Re-mount on phase change so the rise animations replay smoothly.
          <div key={phase} className="contents">
            <h1
              className="
                font-serif font-medium
                text-[2rem] leading-[1.08]
                sm:text-[2.75rem] sm:leading-[1.06]
                tracking-[-0.012em]
                text-ink text-center
                mt-7 sm:mt-8
                max-w-[18ch]
                animate-rise-delayed
              "
            >
              {copy.headline}
            </h1>

            <p
              className="
                font-sans
                text-[15px] sm:text-[15.5px] leading-[1.65]
                text-ash text-center
                mt-5
                max-w-[40ch]
                animate-rise-delayed-2
              "
            >
              {copy.support}
            </p>

            <SignupForm
              className="mt-9 sm:mt-10"
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
