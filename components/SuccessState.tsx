"use client";

type Variant = "subscribed" | "canceled";

export function SuccessState({
  email,
  variant = "subscribed",
}: {
  email?: string;
  variant?: Variant;
}) {
  const isCanceled = variant === "canceled";

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full flex flex-col items-center text-center animate-fade-in"
    >
      {/* Drawn check inside a soft circle */}
      <div className="relative h-14 w-14 rounded-full bg-[var(--theme-surface)] border border-[var(--theme-border)] flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 12.5l4.2 4.2L19 7"
            stroke="var(--theme-accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="30"
            className="animate-draw-check"
          />
        </svg>
      </div>

      <p className="font-sans text-[11px] sm:text-[11.5px] uppercase tracking-eyebrow text-fog mt-6">
        {isCanceled ? "OneArticle" : "Welcome to OneArticle"}
      </p>

      {isCanceled ? (
        <>
          <h2 className="font-serif font-medium text-[2.1rem] sm:text-[3rem] leading-[1.04] tracking-[-0.02em] text-ink mt-3 max-w-[16ch] text-balance">
            You’re <em className="italic font-normal">all set.</em>
          </h2>
          <p className="font-sans text-[15px] sm:text-[15.5px] leading-[1.65] text-ash mt-4 max-w-[34ch]">
            Your subscription is canceled — no more emails will arrive
            {email ? (
              <>
                {" "}
                at <span className="text-ink">{email}</span>
              </>
            ) : null}
            . You can sign up again any morning.
          </p>
          <p className="font-serif italic text-[13.5px] text-fog mt-8">
            Thanks for reading with us.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-serif font-medium text-[2.1rem] sm:text-[3rem] leading-[1.04] tracking-[-0.02em] text-ink mt-3 max-w-[14ch] text-balance">
            You’re <em className="italic font-normal">all set.</em>
          </h2>
          <p className="font-sans text-[15px] sm:text-[15.5px] leading-[1.65] text-ash mt-4 max-w-[34ch]">
            Your 7-day free trial has started. Your first OneArticle arrives
            tomorrow at 7&nbsp;AM
            {email ? (
              <>
                {" "}
                at <span className="text-ink">{email}</span>
              </>
            ) : null}
            .
          </p>
          <p className="font-serif italic text-[13.5px] text-fog mt-8">
            Free for 7 days — we’ll remind you before it ends.
          </p>
        </>
      )}
    </div>
  );
}
