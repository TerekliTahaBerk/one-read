"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  OFFER_ROW_CLASS,
  OfferSummary,
  offerColumnClass,
} from "@/components/OfferSummary";
import { OfferMascots, offerThemeKey, themeStyle } from "@/components/ProductIdentity";
import {
  FlowError,
  FlowStep,
  FlowWarning,
  SignupShell,
  choicePill,
  codeInput,
  fieldInput,
  fieldLabel,
  primaryAction,
} from "@/components/SignupShell";
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
 * The OneRead signup flow.
 *
 * Presentation lives in `SignupShell` — the page, the header, the type scale,
 * the form controls — and product identity in `ProductIdentity`, so this file
 * keeps only what it is actually responsible for: the step machine, the four
 * API calls, and the (offer, interval) pair every one of them carries.
 *
 * That pair is the thing to be careful with. The verification code the server
 * issues is bound to exactly the offer and interval on screen, and checkout
 * refuses any other pair, so every step from the plan columns to the checkout
 * button states the plan it is acting on. A buyer who cannot see which plan
 * they are confirming cannot notice that it changed.
 *
 * The flow does not collect article interests. The OneArticle product stopped
 * personalising around them and the preferences endpoint stores the historical
 * columns empty; adding the step back here would be a product change wearing a
 * redesign's clothes.
 */

/** Fills `{token}` placeholders in a dictionary string. */
function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

/**
 * The plan a step is acting on, in one line: the offer's name beside the price
 * and interval the registry gives for it.
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
  const { dictionary } = useSiteLanguage();
  const copy = dictionary.signup;
  // The two column labels have to match the pricing page word for word: the
  // columns themselves are the same component on both surfaces.
  const columns = dictionary.pricing;
  const offerName = OFFERS[offer].displayName;

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!isLikelyEmail(email)) return setError(copy.emailInvalid);
    setBusy(true);
    const { response } = await postJson("/api/oneread/verification/request", { email, offer, interval });
    setBusy(false);
    if (!response.ok) return setError(copy.emailFailed);
    setStep("verify");
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!/^\d{6}$/.test(code.trim())) return setError(copy.verifyInvalid);
    setBusy(true);
    // The plan on screen is verified together with the email: the session the
    // server issues is bound to exactly this offer and interval, and checkout
    // refuses anything else.
    const { response, data } = await postJson("/api/oneread/verification/confirm", { email, code: code.trim(), offer, interval });
    setBusy(false);
    if (!response.ok) return setError(data.error === "incorrect" ? copy.verifyIncorrect : copy.verifyFailed);
    setStep("language");
  }

  async function saveLanguage(event: FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    const { response } = await postJson("/api/oneread/article-preferences", { email, offer, summaryLanguage: language });
    setBusy(false);
    if (!response.ok) return setError(copy.languageFailed);
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
        return setError(copy.planChanged);
      }
      return setError(String(data.error ?? copy.checkoutUnavailable));
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
      setTransitionMessage(copy.grandfatherNotice);
      return;
    }
    if (!response.ok) return setError(String(data.error ?? copy.transitionUnavailable));
    const plan = data.plan as { effective?: string } | undefined;
    setTransitionMessage(plan?.effective === "period_end" ? copy.transitionPeriodEnd : copy.transitionProvider);
  }

  async function confirmTransition() {
    if (grandfathered && !acknowledged) return setError(copy.grandfatherRequired);
    setBusy(true); setError(null);
    const { response, data } = await postJson("/api/billing/plan-change", { email, offer, interval, confirm: true, acknowledgeGrandfatherLoss: acknowledged });
    setBusy(false);
    if (!response.ok) return setError(String(data.error ?? copy.transitionFailed));
    window.location.assign("/preferences");
  }

  /** The plan line every step after the columns repeats, under the control. */
  const planFootnote = (
    <>
      <span className="block text-ink">{planSummary(offer, interval)}</span>
      <span className="mt-1 block">{offerCadenceLabel(offer)}</span>
    </>
  );

  return (
    <SignupShell
      themeKey={offerThemeKey(offer)}
      // Until a plan is chosen this is the brand's own flow; afterwards it is
      // the product being configured, which for the bundle is OneRead again.
      logoLabel={step === "plan" ? "OneRead" : offerName}
      backLabel={dictionary.common.backToOneRead}
    >
      {step === "plan" && (
        <FlowStep
          wide
          title={copy.planTitle}
          support={fill(copy.planIntro, { saving: annualSavingClaim() })}
        >
          <Interval
            value={interval}
            legend={copy.billingLegend}
            annualLabel={`${columns.annual} · ${annualDiscountLabel()}`}
            monthlyLabel={columns.monthly}
            onChange={(value) => {
              setInterval(value);
              trackEvent("billing_interval_selected", { interval: value, offer });
            }}
          />

          {/* The same three columns the pricing page shows, in the same order
              and the same hierarchy — this is the screen a buyer reaches by
              clicking through from there, so it must not look like a different
              site. Here each column is the control that selects the plan
              rather than a link to it, and it is drawn in its own product's
              theme, so choosing OneNews turns this screen green. */}
          <div role="radiogroup" aria-label={copy.planGroupLabel} className={`mt-7 w-full ${OFFER_ROW_CLASS}`}>
            {OFFER_KEYS.map((key) => {
              const chosen = offer === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  style={themeStyle(offerThemeKey(key))}
                  onClick={() => { setOffer(key); trackEvent("offer_selected", { offer: key }); }}
                  className={`focus-ring transition-colors duration-200 ${offerColumnClass(false)} ${
                    chosen
                      ? "bg-[var(--theme-selected-surface)] ring-1 ring-inset ring-[var(--theme-accent)]"
                      : "hover:bg-[var(--theme-surface)]"
                  }`}
                >
                  <OfferSummary
                    offer={key}
                    interval={interval}
                    includedLabel={columns.includedLabel}
                    cadenceLabel={columns.cadenceLabel}
                    emphasised={chosen}
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-6 inline-flex h-12 w-full shrink-0 items-center justify-center rounded-full px-5 font-sans text-[14px] font-medium ${
                      chosen
                        ? "bg-[var(--theme-accent)] text-paper"
                        : "border border-line-strong text-ash"
                    }`}
                  >
                    {chosen ? copy.selected : fill(columns.choose, { name: OFFERS[key].displayName })}
                  </span>
                </button>
              );
            })}
          </div>

          <button className={`${primaryAction} mt-8`} onClick={() => setStep("email")}>
            {fill(copy.continueWith, { name: offerName })}
          </button>
        </FlowStep>
      )}

      {step === "email" && (
        <FlowStep
          identity={<OfferMascots offer={offer} />}
          title={fill(copy.emailTitle, { name: offerName })}
          support={copy.emailIntro}
          footnote={planFootnote}
        >
          <form onSubmit={requestCode} className="flex w-full max-w-sm flex-col gap-2">
            <label htmlFor="signup-email" className={fieldLabel}>{copy.emailLabel}</label>
            <input id="signup-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required className={fieldInput} />
            <button disabled={busy} className={`${primaryAction} mt-4`}>{copy.emailCta}</button>
          </form>
        </FlowStep>
      )}

      {step === "verify" && (
        <FlowStep
          identity={<OfferMascots offer={offer} />}
          title={copy.verifyTitle}
          support={
            <>
              {fill(copy.verifyIntro, { email })}
              <span className="mt-1 block">
                {fill(copy.verifyBinding, { plan: planSummary(offer, interval) })}
              </span>
            </>
          }
        >
          {/* One field, not six. The verification session is bound to this
              code together with the plan, and splitting it into six stateful
              boxes would buy a nicer screenshot at the cost of paste, autofill
              and the one-time-code hint below. */}
          <form onSubmit={verify} className="flex flex-col items-center gap-3">
            <label htmlFor="signup-code" className="sr-only">{copy.verifyLabel}</label>
            <input id="signup-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={codeInput} />
            <button disabled={busy} className={`${primaryAction} mt-3`}>{copy.verifyCta}</button>
          </form>
        </FlowStep>
      )}

      {step === "language" && (
        <FlowStep
          identity={<OfferMascots offer={offer} />}
          title={copy.languageTitle}
          support={
            isBundleOffer(offer)
              ? fill(copy.languageIntroBundle, { products: offerIncludesLabel(offer, " and ") })
              : fill(copy.languageIntroSingle, { name: offerName })
          }
        >
          <form onSubmit={saveLanguage} className="flex flex-col items-center gap-6">
            {/* Named by `aria-label` rather than a visually-hidden legend: the
                heading above already says this out loud, and a second copy of
                it in the accessibility tree is noise, not help. */}
            <fieldset aria-label={copy.languageLegend} className="flex flex-wrap justify-center gap-2">
              {SUMMARY_LANGUAGES.map((item) => (
                <button type="button" key={item} aria-pressed={language === item} onClick={() => setLanguage(item)} className={choicePill(language === item)}>
                  {item}
                </button>
              ))}
            </fieldset>
            <button disabled={busy} className={primaryAction}>{copy.continue}</button>
          </form>
        </FlowStep>
      )}

      {step === "review" && (
        <FlowStep
          title={copy.reviewTitle}
          support={copy.reviewIntro}
          footnote={copy.checkoutNote}
        >
          {/* The subscription as a short editorial statement rather than a
              vendor's order summary: who it is from, what arrives and when,
              in which language, and the charge — stated once, in full, and
              immediately above the button that starts it. */}
          <div className="w-full max-w-[26rem] border-y border-[var(--theme-border)] py-7 text-center">
            <OfferSummary
              offer={offer}
              interval={interval}
              includedLabel={columns.includedLabel}
              cadenceLabel={columns.cadenceLabel}
              emphasised
              showPrice={false}
            />
            <span className="mt-4 mx-auto block w-full max-w-[26ch] border-t border-line/80 pt-4 text-left font-sans">
              <span className="block text-[10.5px] uppercase tracking-eyebrow text-fog">
                {copy.reviewLanguageLabel}
              </span>
              <span className="mt-1 block text-[13px] leading-[1.55] text-ink">{language}</span>
            </span>
            <p className="mt-6 font-serif text-[1.5rem] font-medium leading-none tracking-[-0.02em] text-ink">
              {offerPriceSentence(offer, interval)}
            </p>
            {interval === "annual" && (
              <p className="mt-2 font-sans text-[12px] leading-[1.6] text-fog">{annualEquivalenceSentence(offer)}</p>
            )}
          </div>
          <button disabled={busy} onClick={checkout} className={`${primaryAction} mt-7`}>
            {copy.checkoutCta}
          </button>
        </FlowStep>
      )}

      {step === "transition" && (
        <FlowStep
          identity={<OfferMascots offer={offer} />}
          title={copy.transitionTitle}
          support={grandfathered ? copy.transitionIntro : transitionMessage ?? copy.transitionIntro}
        >
          {/* A real warning, in warning colours. The product accent never gets
              to describe losing a price. */}
          {grandfathered && (
            <FlowWarning>
              <p>{transitionMessage}</p>
              <label className="mt-3 flex items-start gap-3">
                <input type="checkbox" className="focus-ring mt-0.5 size-5 shrink-0 accent-amber-600" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                <span>{copy.grandfatherAcknowledge}</span>
              </label>
            </FlowWarning>
          )}
          <button disabled={busy || (grandfathered && !acknowledged)} onClick={confirmTransition} className={`${primaryAction} mt-7`}>
            {copy.transitionCta}
          </button>
        </FlowStep>
      )}

      <FlowError>{error}</FlowError>
    </SignupShell>
  );
}

/**
 * The billing interval, drawn exactly as the pricing page draws it. Annual is
 * the default and the discount beside it is derived, never typed.
 */
function Interval({
  value,
  legend,
  annualLabel,
  monthlyLabel,
  onChange,
}: {
  value: BillingIntervalKey;
  legend: string;
  annualLabel: ReactNode;
  monthlyLabel: ReactNode;
  onChange: (value: BillingIntervalKey) => void;
}) {
  return (
    <fieldset className="flex flex-col items-center">
      <legend className="sr-only">{legend}</legend>
      <div className="flex rounded-full border border-line p-1">
        {(["annual", "monthly"] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={value === item}
            onClick={() => onChange(item)}
            className={`focus-ring min-h-11 rounded-full px-5 font-sans text-[13.5px] transition-colors duration-200 sm:px-6 ${
              value === item ? "bg-ink text-paper" : "text-ash hover:text-ink"
            }`}
          >
            {item === "annual" ? annualLabel : monthlyLabel}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
