"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { LanguagePill } from "@/components/LanguagePill";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { SUMMARY_LANGUAGES, isLikelyEmail } from "@/lib/options";
import { productThemes } from "@/lib/product-themes";
import { OFFERS, OFFER_KEYS, type BillingIntervalKey, type OfferKey } from "@/lib/products/registry";
import { trackEvent } from "@/lib/analytics";

type Step = "plan" | "email" | "verify" | "language" | "review" | "transition";
const CADENCE: Record<OfferKey, string> = {
  "one-article": "Weekday mornings",
  "one-news": "Mon / Wed / Fri during beta",
  "one-read": "OneArticle + OneNews",
};

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { response, data: await response.json().catch(() => ({})) as Record<string, unknown> };
}

export function OneReadSignup(props: { initialEmail?: string; initialOffer?: string; initialInterval?: string }) {
  const { dictionary } = useSiteLanguage();
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
  const price = OFFERS[offer].prices[interval];

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!isLikelyEmail(email)) return setError("Enter a valid email address.");
    setBusy(true);
    const { response } = await postJson("/api/oneread/verification/request", { email });
    setBusy(false);
    if (!response.ok) return setError("We could not send a code. Please try again.");
    setStep("verify");
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the six-digit code.");
    setBusy(true);
    const { response, data } = await postJson("/api/oneread/verification/confirm", { email, code: code.trim() });
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
    if (!response.ok) { trackEvent("checkout_failed", { offer, interval }); return setError(String(data.error ?? "Checkout is unavailable.")); }
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

  const theme = step === "language" && offer === "one-article" ? productThemes.article : productThemes.read;

  return <main
    className="relative flex min-h-svh w-full flex-col items-center px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6"
    style={{ backgroundColor: theme.background, "--theme-accent": theme.accent, "--theme-border": theme.border, "--theme-surface": theme.surface, "--theme-selected-surface": "selectedSurface" in theme ? theme.selectedSurface : theme.surface, "--theme-page": theme.background, "--theme-focus": theme.accent } as CSSProperties}
  >
    <header className="relative flex w-full justify-center animate-rise">
      <BackButton href="/" label={dictionary.common.backToOneRead} />
      <Logo href="/" ariaLabel={dictionary.common.oneReadHome} />
    </header>
    <section className={`mx-auto flex min-h-[78vh] w-full flex-1 flex-col items-center justify-center py-6 sm:py-8 ${step === "plan" ? "max-w-[48rem]" : "max-w-[36rem]"}`}>
      {step === "plan" && <StepShell title="Choose what deserves your time" support="Annual billing is selected by default. You can switch to monthly.">
        <div role="radiogroup" aria-label="Choose a OneRead plan" className="grid w-full gap-3 sm:grid-cols-3">
          {OFFER_KEYS.map((key) => <button key={key} type="button" role="radio" aria-checked={offer === key} onClick={() => { setOffer(key); trackEvent("offer_selected", { offer: key }); }} className={`focus-ring flex min-h-[9.5rem] flex-col rounded-2xl border p-5 text-left transition-colors ${offer === key ? "border-[var(--theme-accent)] bg-[var(--theme-selected-surface)]" : "border-[var(--theme-border)] bg-white hover:bg-[var(--theme-surface)]"}`}><strong className="font-serif text-[1.2rem] font-medium text-ink">{OFFERS[key].displayName}</strong><span className="mt-2 block font-sans text-[13px] leading-[1.55] text-ash">{OFFERS[key].tagline}</span><span className="mt-auto block pt-4 font-sans text-[10.5px] font-medium uppercase tracking-[0.1em] text-fog">{CADENCE[key]}</span></button>)}
        </div>
        <Interval value={interval} onChange={(value) => { setInterval(value); trackEvent("billing_interval_selected", { interval: value, offer }); }} />
        <ActionButton onClick={() => setStep("email")}>Continue with {OFFERS[offer].displayName}</ActionButton>
      </StepShell>}
      {step === "email" && <StepShell title={`Start ${OFFERS[offer].displayName}`} support={`${CADENCE[offer]}. $${price.amountUsd} USD / ${interval === "annual" ? "year" : "month"}. No trial; see a full sample before subscribing.`}><form onSubmit={requestCode} className="flex w-full flex-col items-center gap-3"><label htmlFor="signup-email" className="sr-only">Email address</label><input id="signup-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required className={input} /><SubmitButton busy={busy}>Email me a code</SubmitButton></form></StepShell>}
      {step === "verify" && <StepShell title="Check your inbox" support={`We sent a six-digit code to ${email}.`}><form onSubmit={verify} className="flex w-full flex-col items-center gap-3"><label htmlFor="signup-code" className="sr-only">Verification code</label><input id="signup-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={6} className={`${input} max-w-[14rem] text-center text-[18px] tracking-[.3em]`} /><SubmitButton busy={busy}>Verify email</SubmitButton><button type="button" onClick={() => setStep("email")} className="focus-ring link-underline mt-1 rounded-sm font-sans text-[12.5px] text-fog">Use a different email</button></form></StepShell>}
      {step === "language" && <StepShell title="Choose your reading language" support={offer === "one-read" ? "One choice applies to both OneArticle and OneNews." : `One choice for ${OFFERS[offer].displayName}.`}><form onSubmit={saveLanguage} className="flex w-full flex-col items-center gap-5"><div className="flex flex-wrap justify-center gap-2">{SUMMARY_LANGUAGES.map((item) => <LanguagePill key={item} label={item} selected={language === item} onClick={() => setLanguage(item)} />)}</div><SubmitButton busy={busy}>Continue</SubmitButton></form></StepShell>}
      {step === "review" && <StepShell title="Review your subscription" support="Email delivery preferences can be changed later without cancelling billing."><div className="w-full max-w-[22rem] rounded-2xl border border-[var(--theme-border)] bg-white p-5 font-sans text-[14px] text-ink"><p className="text-[12.5px] text-fog">Plan</p><p className="mb-3">{OFFERS[offer].displayName}</p><p className="text-[12.5px] text-fog">Delivery</p><p className="mb-3">{CADENCE[offer]}</p><p className="text-[12.5px] text-fog">Reading language</p><p className="mb-3">{language}</p><p className="text-[12.5px] text-fog">Price</p><p>${price.amountUsd} USD / {interval === "annual" ? "year" : "month"}</p><p className="mt-3 text-[12.5px] leading-5 text-ash">Cancel anytime through the secure billing portal.</p></div><ActionButton disabled={busy} onClick={checkout}>Continue to secure checkout</ActionButton></StepShell>}
      {step === "transition" && <StepShell title="Confirm your plan change" support={transitionMessage ?? "Review this change before continuing."}>{grandfathered && <label className="flex max-w-lg items-start gap-3 rounded-2xl border border-amber-500 bg-amber-50 p-4 font-sans text-[13px] leading-5"><input type="checkbox" className="mt-0.5 size-5" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />I understand that switching plans gives up my grandfathered $1 price and it may not be restored.</label>}<ActionButton disabled={busy || (grandfathered && !acknowledged)} onClick={confirmTransition}>Confirm plan change</ActionButton></StepShell>}
      {error && <p role="alert" aria-live="assertive" className="mt-5 font-sans text-[13px] text-red-600">{error}</p>}
    </section>
    <Footer showBackHome backHref="/" backLabel={dictionary.common.backToOneRead} />
  </main>;
}

function StepShell({ title, support, children }: { title: string; support: string; children: React.ReactNode }) { return <div className="flex w-full flex-col items-center animate-rise-delayed"><h1 className="max-w-[20ch] text-center font-serif text-[2rem] font-medium leading-[1.06] tracking-[-0.02em] text-ink sm:text-[2.5rem]">{title}</h1><p className="mt-4 max-w-[42ch] text-center font-sans text-[15px] leading-[1.65] text-ash">{support}</p><div className="mt-7 flex w-full flex-col items-center">{children}</div></div>; }
function Interval({ value, onChange }: { value: BillingIntervalKey; onChange: (value: BillingIntervalKey) => void }) { return <fieldset className="my-5 flex rounded-full border border-[var(--theme-border)] bg-white p-1"><legend className="sr-only">Billing interval</legend>{(["annual", "monthly"] as const).map((item) => <button type="button" key={item} aria-pressed={value === item} onClick={() => onChange(item)} className={`focus-ring min-h-11 rounded-full px-5 font-sans text-[13px] ${value === item ? "bg-[var(--theme-accent)] text-paper" : "text-ash"}`}>{item === "annual" ? "Annual · save 25%" : "Monthly"}</button>)}</fieldset>; }
function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) { return <button type="submit" disabled={busy} className={primary}>{busy ? "Please wait…" : children}</button>; }
function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button type="button" {...props} className={primary}>{children}</button>; }
const input = "focus-ring h-12 w-full max-w-[24rem] rounded-full border border-[var(--theme-border)] bg-white px-5 font-sans text-[15px] text-ink";
const primary = "focus-ring mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper transition-[filter] duration-200 hover:brightness-95 disabled:opacity-50";
