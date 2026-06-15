"use client";

export function SuccessState({ email }: { email?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full flex flex-col items-center text-center animate-fade-in"
    >
      {/* Drawn check inside a soft circle */}
      <div className="relative h-14 w-14 rounded-full bg-cream/80 border border-line flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 12.5l4.2 4.2L19 7"
            stroke="#1A1A1A"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="30"
            className="animate-draw-check"
          />
        </svg>
      </div>

      <h2 className="font-serif font-medium text-3xl sm:text-[40px] leading-[1.1] tracking-[-0.01em] text-ink mt-6 max-w-[18ch]">
        You’re in.
      </h2>

      <p className="font-sans text-[15px] sm:text-[15.5px] leading-[1.65] text-ash mt-4 max-w-[34ch]">
        Your first One Read arrives tomorrow at 7&nbsp;AM
        {email ? (
          <>
            {" "}
            at <span className="text-ink">{email}</span>
          </>
        ) : null}
        .
      </p>

      <p className="font-serif italic text-[13.5px] text-fog mt-8">
        Sleep well. We’ll handle the rest.
      </p>
    </div>
  );
}
