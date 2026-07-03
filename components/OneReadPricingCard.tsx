import Link from "next/link";
import { ONEREAD_BILLING_LABEL, ONEREAD_PRICE_MONTHLY, ONEREAD_TRUST_NOTES } from "@/lib/oneread/config";

/**
 * OneRead umbrella pricing card. One subscription, one price, includes every
 * product in the OneRead family. Price is config-driven (lib/oneread/config.ts)
 * — never hardcode it elsewhere.
 */
export function OneReadPricingCard() {
  return (
    <div className="group relative w-full max-w-[25rem] mt-8 sm:mt-9 animate-rise-delayed-3">
      <div className="relative">
        <div className="px-1 py-0 text-center">
          <div className="mt-1" aria-live="polite">
            <div className="flex items-end justify-center gap-1.5">
              <span className="font-serif font-medium text-[1.5rem] leading-none text-ash translate-y-[-0.55rem]">
                $
              </span>
              <span className="font-serif font-medium text-[3.5rem] leading-[0.85] tracking-[-0.02em] text-ink tabular-nums">
                {ONEREAD_PRICE_MONTHLY}
              </span>
              <span className="font-sans text-[13.5px] text-ash pb-1.5">per month</span>
            </div>
            <p className="mt-3 font-serif italic text-[13.5px] leading-snug text-ash">
              One subscription. The whole OneRead family included.
            </p>
          </div>

          <div className="mt-7 h-px w-full bg-[var(--theme-border)]" aria-hidden="true" />

          <ul className="mt-6 space-y-3 text-left">
            {[
              "OneArticle — one article brief every weekday morning",
              "OneFilm — one film note every Saturday",
              "Edit your preferences anytime",
              "One-click cancel — no questions asked",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 font-sans text-[14px] leading-snug text-graphite"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[var(--theme-surface)] text-[var(--theme-accent)]"
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                    <path
                      d="M5 12.5l4.2 4.2L19 7"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/subscribe"
            className="
              focus-ring group/cta
              mt-8 inline-flex w-full h-12 items-center justify-center gap-2
              rounded-xl bg-[var(--theme-accent)] text-paper
              font-sans text-[15px] tracking-tight
              transition-[transform,background-color,opacity] duration-200
              hover:brightness-95
              active:scale-[0.99]
            "
          >
            Start OneRead for {ONEREAD_BILLING_LABEL.split(" / ")[0]}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
            >
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <div className="mt-4 space-y-1.5">
            {ONEREAD_TRUST_NOTES.map((note) => (
              <p key={note} className="font-sans text-[12.5px] text-fog">
                {note}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
