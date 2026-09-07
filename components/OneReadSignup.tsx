"use client";

import { useState, type FormEvent } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import {
  OFFER_ROW_CLASS,
  OfferSummary,
  offerColumnClass,
} from "@/components/OfferSummary";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { SUMMARY_LANGUAGES, isLikelyEmail } from "@/lib/options";
import { OFFERS, OFFER_KEYS, type BillingIntervalKey, type OfferKey } from "@/lib/products/registry";
import { isBundleOffer, offerIncludesLabel } from "@/lib/products/terminology";
import {
  annualDiscountLabel,
  annualEquivalenceSentence,
  annualSavingClaim,
  offerCadenceLabel,
  offerContentsLine,
  offerPriceSentence,
} from "@/lib/products/pricing-copy";
import { trackEvent } from "@/lib/analytics";

type Step = "plan" | "email" | "verify" | "language" | "review" | "transition";

/**
 * The plan a step is acting on, in one line: the offer's name beside the price
 * and interval the registry gives for it.
 *
 * Every step from the plan card to the checkout button shows the same string,
 * because the verification code the server issues is bound to exactly this
 * (offer, interval) pair and checkout refuses any other. A buyer who cannot see
 * which plan they are confirming cannot notice that it changed.
 */
function planSummary(offer: OfferKey, interval: BillingIntervalKey): string {
  return `${OFFERS[offer].displayName} · ${offerPriceSentence(offer, interval)}`;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { response, data: await response.json().catch(() => ({})) as Record<string, unknown> };
}

export function OneReadSignup(props: { initialEmail?: string; initialOffer?: string; initialInterval?: string }) {
  const initialOffer = (OFFER_KEYS as readonly string[]).includes(props.initialOffer ?? "") ? props.initialOffer as OfferKey : null;
  const [step, setStep] = useState<Step>(initialOffer ? "email" : "plan");
  const [offer, setOffer] = useState<OfferKey>(initialOffer ?? "one-read");
  const [interval, setInterval] = useState<BillingIntervalKey>(props.initialInterval === "monthly" ? "monthly" : "annual");
  const [email, setEmail] = useState(props.initialEmail ?? "");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("English");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const [grandfathered, setGrandfathered] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  // Only the two column labels are read from the dictionary here: this flow is
  // not localised yet, and they have to match the pricing page word for word.
  const copy = useSiteLanguage().dictionary.pricing;

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!isLikelyEmail(email)) return setError("Enter a valid email address.");
    setBusy(true);
    const { response } = await postJson("/api/oneread/verification/request", { email, offer, interval });
    setBusy(false);
    if (!response.ok) return setError("We could not send a code. Please try again.");
    setStep("verify");
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the six-digit code.");
    setBusy(true);
    // The plan on screen is verified together with the email: the session the
    // server issues is bound to exactly this offer and interval, and checkout
    // refuses anything else.
    const { response, data } = await postJson("/api/oneread/verification/confirm", { email, code: code.trim(), offer, interval });
    setBusy(false);
    if (!response.ok) return setError(data.error === "incorrect" ? "That code is not correct." : "The code could not be verified.");
    setStep("language");
  }

  async function saveLanguage(event: FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    const { response } = await postJson("/api/oneread/article-preferences", { email, offer, summaryLanguage: language });
    setBusy(false);
    if (!response.ok) return setError("We could not save your reading language.");
    setStep("review");
  }

  async function checkout() {
    setBusy(true); setError(null);
    trackEvent("checkout_started", { offer, interval, language });
    const { response, data } = await postJson("/api/billing/checkout", { email, offer, interval });
    setBusy(false);
    if (!response.ok) {
      trackEvent("checkout_failed", { offer, interval });
      if (data.error === "verification_intent_mismatch" || data.error === "email_not_verified") {
        setStep("verify"); setCode("");
        return setError("Your plan changed since you verified. Please confirm a new code for this plan.");
      }
      return setError(String(data.error ?? "Checkout is unavailable."));
    }
    if (data.action === "redirect" && typeof data.url === "string") return window.location.assign(data.url);
    if (data.action === "already_active") return window.location.assign("/preferences");
    if (data.action === "transition_required") await previewTransition();
  }

  async function previewTransition() {
    setBusy(true);
    const { response, data } = await postJson("/api/billing/plan-change", { email, offer, interval });
    setBusy(false); setStep("transition");
    if (data.refusal === "grandfather_acknowledgement_required") {
      setGrandfathered(true);
      setTransitionMessage("Your current $1 plan is grandfathered. If you switch plans, this legacy price may not be available again.");
      return;
    }
    if (!response.ok) return setError(String(data.error ?? "This plan change is not available."));
    const plan = data.plan as { effective?: string } | undefined;
    setTransitionMessage(plan?.effective === "period_end" ? "This change will take effect at the end of your current billing period." : "Polar will confirm the timing and any exact charge before applying this change.");
  }

  async function confirmTransition() {
    if (grandfathered && !acknowledged) return setError("Confirm that you understand the grandfathered price will be lost.");
    setBusy(true); setError(null);
    const { response, data } = await postJson("/api/billing/plan-change", { email, offer, interval, confirm: true, acknowledgeGrandfatherLoss: acknowledged });
    setBusy(false);
    if (!response.ok) return setError(String(data.error ?? "The plan change could not be completed."));
    window.location.assign("/preferences");
  }

  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-5 sm:pt-6
        pb-4 sm:pb-5
      "
    >
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/" label="Back to OneRead" />
        <Logo href="/" />
      </header>

      <section className="mx-auto flex w-full max-w-[62rem] flex-1 flex-col items-center justify-center py-8 sm:py-10">
        {step === "plan" && (
          <Step
            title="Choose what deserves your time"
            support={`Annual billing ${annualSavingClaim()} and is selected by default; it is charged once a year. You can switch to monthly.`}
          >
            <Interval
              value={interval}
              onChange={(value) => {
                setInterval(value);
                trackEvent("billing_interval_selected", { interval: value, offer });
              }}
            />
            {/* The same three columns the pricing page shows, in the same
                order and the same hierarchy — this is the screen a buyer
                reaches by clicking through from there, so it must not look
                like a different site. Here each column is the control that
                selects the plan rather than a link to it. */}
            <div role="radiogroup" aria-label="Choose a OneRead plan" className={`mt-7 w-full ${OFFER_ROW_CLASS}`}>
              {OFFER_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={offer === key}
                  onClick={() => { setOffer(key); trackEvent("offer_selected", { offer: key }); }}
                  className={`focus-ring transition-colors duration-200 ${offerColumnClass(offer === key)} ${offer === key ? "ring-1 ring-inset ring-ink/70" : "hover:bg-cream/40"}`}
                >
                  <OfferSummary
                    offer={key}
                    interval={interval}
                    includedLabel={copy.includedLabel}
                    cadenceLabel={copy.cadenceLabel}
                    emphasised={offer === key}
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-6 inline-flex h-12 w-full shrink-0 items-center justify-center rounded-full px-5 font-sans text-[14px] font-medium ${offer === key ? "bg-ink text-paper" : "border border-line-strong text-ash"}`}
                  >
                    {offer === key ? "Selected" : `Choose ${OFFERS[key].displayName}`}
                  </span>
                </button>
              ))}
            </div>
            <button className={primary} onClick={() => setStep("email")}>Continue with {OFFERS[offer].displayName}</button>
          </Step>
        )}
        {step === "email" && <Step title={`Start ${OFFERS[offer].displayName}`} support={`${offerContentsLine(offer) ?? ""} ${offerCadenceLabel(offer)}. ${offerPriceSentence(offer, interval)}. No trial; see a full sample before subscribing.`}><form onSubmit={requestCode} className="flex w-full max-w-sm flex-col gap-3"><label htmlFor="signup-email" className="font-sans text-[13px] text-ash">Email address</label><input id="signup-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required className={input} /><button disabled={busy} className={primary}>Email me a code</button></form></Step>}
        {step === "verify" && <Step title="Check your inbox" support={`We sent a six-digit code to ${email}. It confirms ${planSummary(offer, interval)} — change the plan and you will need a new code.`}><form onSubmit={verify} className="flex flex-col items-center gap-3"><label htmlFor="signup-code" className="sr-only">Verification code</label><input id="signup-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${input} max-w-48 text-center tracking-[.3em]`} /><button disabled={busy} className={primary}>Verify email</button></form></Step>}
        {step === "language" && <Step title="Choose your reading language" support={isBundleOffer(offer) ? `One choice applies to ${offerIncludesLabel(offer, " and ")}.` : `One choice for ${OFFERS[offer].displayName}.`}><form onSubmit={saveLanguage} className="flex flex-col items-center gap-5"><div className="flex flex-wrap justify-center gap-2">{SUMMARY_LANGUAGES.map((item) => <button type="button" key={item} aria-pressed={language === item} onClick={() => setLanguage(item)} className={`focus-ring min-h-11 rounded-full border px-4 font-sans text-[13.5px] transition-colors duration-200 ${language === item ? "border-ink bg-ink text-paper" : "border-line text-ash hover:border-ink hover:text-ink"}`}>{item}</button>)}</div><button disabled={busy} className={primary}>Continue</button></form></Step>}
        {step === "review" && (
          <Step title="Review your subscription" support="Email delivery preferences can be changed later without cancelling billing.">
            <div className="w-full max-w-[26rem] border-y border-line py-6 text-center">
              <OfferSummary
                offer={offer}
                interval={interval}
                includedLabel={copy.includedLabel}
                cadenceLabel={copy.cadenceLabel}
                emphasised
                showPrice={false}
              />
              <p className="mt-5 font-sans text-[13px] leading-[1.6] text-ash">{language}</p>
              {/* The charge, stated once and in full, immediately above the
                  button that starts it. */}
              <p className="mt-3 font-serif text-[1.5rem] font-medium leading-none tracking-[-0.02em] text-ink">{offerPriceSentence(offer, interval)}</p>
              {interval === "annual" && <p className="mt-2 font-sans text-[12px] leading-[1.6] text-fog">{annualEquivalenceSentence(offer)}</p>}
              <p className="mt-2 font-sans text-[12px] leading-[1.6] text-fog">Cancel anytime through the secure billing portal.</p>
            </div>
            <button disabled={busy} onClick={checkout} className={primary}>Continue to secure checkout</button>
          </Step>
        )}
        {step === "transition" && <Step title="Confirm your plan change" support={transitionMessage ?? "Review this change before continuing."}>{grandfathered && <label className="flex max-w-lg items-start gap-3 rounded-xl border border-amber-500 bg-amber-50 p-4 font-sans text-[13px] leading-[1.6]"><input type="checkbox" className="mt-1 size-5" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />I understand that switching plans gives up my grandfathered $1 price and it may not be restored.</label>}<button disabled={busy || (grandfathered && !acknowledged)} onClick={confirmTransition} className={primary}>Confirm plan change</button></Step>}
        {error && <p role="alert" aria-live="assertive" className="mt-5 font-sans text-[13px] text-dawn">{error}</p>}
      </section>

      <Footer showBackHome />
    </main>
  );
}

/** One step of the flow: a serif question, a line of support copy, a control. */
function Step({ title, support, children }: { title: string; support: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center">
      <h1 className="max-w-[20ch] text-center font-serif text-[2rem] font-medium leading-[1.06] tracking-[-0.026em] text-ink text-balance sm:text-[2.6rem] animate-rise-delayed">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-[52ch] text-center font-sans text-[14px] leading-[1.65] text-ash text-pretty sm:text-[15px] animate-rise-delayed-2">
        {support}
      </p>
      <div className="mt-7 flex w-full flex-col items-center animate-rise-delayed-3 sm:mt-8">{children}</div>
    </div>
  );
}

/**
 * The billing interval, drawn exactly as the pricing page draws it. The
 * discount beside "Annual" is derived, never typed.
 */
function Interval({ value, onChange }: { value: BillingIntervalKey; onChange: (value: BillingIntervalKey) => void }) {
  return (
    <fieldset className="flex flex-col items-center">
      <legend className="sr-only">Billing interval</legend>
      <div className="flex rounded-full border border-line p-1">
        {(["annual", "monthly"] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={value === item}
            onClick={() => onChange(item)}
            className={`focus-ring min-h-11 rounded-full px-5 font-sans text-[13.5px] transition-colors duration-200 sm:px-6 ${value === item ? "bg-ink text-paper" : "text-ash hover:text-ink"}`}
          >
            {item === "annual" ? `Annual · ${annualDiscountLabel()}` : "Monthly"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const input = "focus-ring h-12 w-full rounded-full border border-line-strong bg-paper px-5 font-sans text-[14px] text-ink";
const primary = "focus-ring mt-7 inline-flex h-12 min-w-[13rem] items-center justify-center rounded-full bg-ink px-6 font-sans text-[14px] font-medium text-paper transition-colors duration-200 hover:bg-ink/90 disabled:opacity-50";
