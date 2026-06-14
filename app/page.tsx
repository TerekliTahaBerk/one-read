"use client";

import { useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { MorningIcon } from "@/components/MorningIcon";
import { SignupForm } from "@/components/SignupForm";
import { SuccessState } from "@/components/SuccessState";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const isSubmitted = submittedEmail !== null;

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
      {/* Wordmark */}
      <header className="w-full flex justify-center animate-rise">
        <Wordmark />
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

        {!isSubmitted ? (
          <>
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
              Start your morning with one article worth reading.
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
              Choose your interests and language preferences. Every morning at
              7&nbsp;AM, One&nbsp;Read sends you one curated article summary in
              your inbox.
            </p>

            <SignupForm
              className="mt-9 sm:mt-10"
              onSubmitted={({ email }) => setSubmittedEmail(email)}
            />
          </>
        ) : (
          <div className="mt-8 w-full">
            <SuccessState email={submittedEmail ?? undefined} />
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
