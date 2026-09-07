"use client";

import type { ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { themeStyle } from "@/components/ProductIdentity";
import type { ProductThemeKey } from "@/lib/product-themes";

/**
 * The page the acquisition and account flows are drawn on.
 *
 * /subscribe and /preferences used to own their own chrome — their own page
 * colour, their own header, their own idea of what a form control looks like —
 * which is why walking from the homepage into signup felt like leaving the
 * site. This is that chrome, once: the canonical white page, the same header
 * and footer as every public surface, one content column, and the product
 * theme variables the controls below read.
 *
 * It is presentation only, deliberately. No state, no fetches, no validation,
 * no offer or billing logic — those stay in `OneReadSignup` and
 * `OneReadPreferences`, which are the components that own them. What changes
 * between products here is the theme and the label in the header; the layout,
 * the type scale and the spacing do not change at all, because a buyer moving
 * from OneArticle to the bundle should feel that they changed plans, not that
 * they changed websites.
 */
export function SignupShell({
  themeKey,
  logoLabel,
  backHref = "/",
  backLabel,
  children,
}: {
  themeKey: ProductThemeKey;
  /** "OneRead" until a standalone product is being configured. */
  logoLabel: string;
  backHref?: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        bg-paper
        px-5 sm:px-6
        pt-5 sm:pt-6
        pb-4 sm:pb-5
      "
      style={themeStyle(themeKey)}
    >
      {/* The same header as the product pages: back on the left, the mark in
          the middle. The back affordance is never hidden — a flow a reader
          cannot leave is a trap, not a funnel. */}
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href={backHref} label={backLabel} />
        <Logo href="/" label={logoLabel} ariaLabel={logoLabel} />
      </header>

      <section className="mx-auto flex w-full max-w-[62rem] flex-1 flex-col items-center justify-center py-8 sm:py-10">
        {children}
      </section>

      <Footer showBackHome />
    </main>
  );
}

/**
 * One screen of a flow: an optional character, a serif question, a line of
 * support copy, and the control that answers it.
 *
 * Every step of signup and every state of the account page is this shape, so
 * the heading lands in the same place from the first screen to the last and
 * the page does not appear to redraw itself while someone is typing.
 */
export function FlowStep({
  identity,
  title,
  support,
  children,
  footnote,
  wide = false,
}: {
  identity?: ReactNode;
  title: string;
  support?: ReactNode;
  children: ReactNode;
  /** Quiet line under the control — a plan summary, a cancellation note. */
  footnote?: ReactNode;
  /** Lets the plan comparison use the full column instead of prose width. */
  wide?: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      {identity && <div className="mb-5 flex justify-center">{identity}</div>}

      <h1 className="max-w-[20ch] text-center font-serif text-[2rem] font-medium leading-[1.06] tracking-[-0.026em] text-ink text-balance sm:text-[2.6rem]">
        {title}
      </h1>

      {support && (
        <p className="mx-auto mt-4 max-w-[52ch] text-center font-sans text-[14px] leading-[1.65] text-ash text-pretty sm:text-[15px]">
          {support}
        </p>
      )}

      <div
        className={`mt-7 flex w-full flex-col items-center sm:mt-8 ${
          wide ? "" : "max-w-[30rem]"
        }`}
      >
        {children}
      </div>

      {footnote && (
        <p className="mt-6 max-w-[44ch] text-center font-sans text-[12.5px] leading-[1.6] text-fog">
          {footnote}
        </p>
      )}
    </div>
  );
}

/**
 * A failure, stated where the person is looking rather than in a corner.
 *
 * Errors keep their semantic red in every theme: a product accent that turned
 * a failure blue would be a prettier screen and a worse one.
 */
export function FlowError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      aria-live="assertive"
      className="mt-5 max-w-[44ch] text-center font-sans text-[13px] leading-[1.6] text-dawn"
    >
      {children}
    </p>
  );
}

/**
 * A real warning — the grandfathered-price disclosure, and nothing else.
 * Amber, not the product accent, for the same reason errors stay red.
 */
export function FlowWarning({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-2xl border border-amber-500 bg-amber-50 p-4 text-left font-sans text-[13px] leading-[1.6] text-amber-900">
      {children}
    </div>
  );
}

/* --------------------------- shared form language ------------------------- */

/** Label above a field, never beside it. */
export const fieldLabel =
  "font-sans text-[12.5px] font-medium tracking-[0.01em] text-ash";

/** A text field: 48px tall, one restrained hairline, product-aware focus. */
export const fieldInput =
  "focus-ring h-12 w-full rounded-full border border-line-strong bg-paper px-5 font-sans text-[14px] text-ink placeholder:text-fog hover:border-[var(--theme-border)]";

/**
 * The same field, holding a six-digit code. Styled as an OTP box — wide
 * tracking, centred, tabular — while staying the single input the verification
 * session is actually bound to.
 */
export const codeInput = `${fieldInput} h-14 max-w-[13rem] text-center font-serif text-[1.5rem] tracking-[0.4em] [font-variant-numeric:tabular-nums]`;

/** The action that advances the flow. Carries the product accent. */
export const primaryAction =
  "focus-ring inline-flex h-12 w-full min-w-[13rem] items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper transition-[filter,opacity] duration-200 hover:brightness-110 disabled:opacity-50 sm:w-auto";

/** Everything else: neutral, bordered, and just as visibly focusable. */
export const secondaryAction =
  "focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-paper px-5 font-sans text-[13.5px] text-ink transition-colors duration-200 hover:border-ink hover:bg-[var(--theme-surface)] disabled:opacity-50";

/** A pill in a set of choices — a language, a billing interval. */
export function choicePill(selected: boolean): string {
  return `focus-ring min-h-11 rounded-full border px-4 font-sans text-[13.5px] transition-colors duration-200 ${
    selected
      ? "border-[var(--theme-accent)] bg-[var(--theme-selected-surface)] font-medium text-ink"
      : "border-line text-ash hover:border-ink hover:text-ink"
  }`;
}

/**
 * The heading that opens a section of the account page, over the product's own
 * hairline. Serif and cased, not an uppercased eyebrow: these headings carry
 * product names, and "ONEARTICLE" is not how the product is written.
 */
export const sectionHeading =
  "border-t border-[var(--theme-border)] pt-5 font-serif text-[1.35rem] font-medium leading-tight tracking-[-0.015em] text-ink";

/** The small label above a single fact. */
export const factLabel = "font-sans text-[10.5px] uppercase tracking-eyebrow text-fog";
