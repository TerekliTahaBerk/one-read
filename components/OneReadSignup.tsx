"use client";

import { useState, type FormEvent } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { SUMMARY_LANGUAGES, isLikelyEmail } from "@/lib/options";
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

  return <main className="min-h-svh bg-[#f6f5f1] px-5 py-6 text-ink sm:px-6">
    <header className="relative flex justify-center"><BackButton href="/" label="Back to OneRead" /><Logo href="/" /></header>
    <section className="mx-auto flex min-h-[78vh] w-full max-w-3xl flex-col items-center justify-center py-10">
      {step === "plan" && <Step title="Choose what deserves your time" support="Annual billing is selected by default. You can switch to monthly.">
        <div role="radiogroup" aria-label="Choose a OneRead plan" className="grid w-full gap-3 md:grid-cols-3">
          {OFFER_KEYS.map((key) => <button key={key} type="button" role="radio" aria-checked={offer === key} onClick={() => { setOffer(key); trackEvent("offer_selected", { offer: key }); }} className={`focus-ring rounded-2xl border p-5 text-left ${offer === key ? "border-ink bg-white ring-2 ring-ink" : "border-black/15 bg-white/60"}`}><strong className="font-serif text-xl">{OFFERS[key].displayName}</strong><span className="mt-2 block text-sm text-ash">{OFFERS[key].tagline}</span><span className="mt-4 block text-xs font-medium uppercase tracking-wide text-fog">{CADENCE[key]}</span></button>)}
        </div>
        <Interval value={interval} onChange={(value) => { setInterval(value); trackEvent("billing_interval_selected", { interval: value, offer }); }} />
        <button className={primary} onClick={() => setStep("email")}>Continue with {OFFERS[offer].displayName}</button>
      </Step>}
      {step === "email" && <Step title={`Start ${OFFERS[offer].displayName}`} support={`${CADENCE[offer]}. $${price.amountUsd} USD / ${interval === "annual" ? "year" : "month"}. No trial; see a full sample before subscribing.`}><form onSubmit={requestCode} className="flex w-full max-w-sm flex-col gap-3"><label htmlFor="signup-email" className="text-sm">Email address</label><input id="signup-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required className={input} /><button disabled={busy} className={primary}>Email me a code</button></form></Step>}
      {step === "verify" && <Step title="Check your inbox" support={`We sent a six-digit code to ${email}.`}><form onSubmit={verify} className="flex flex-col items-center gap-3"><label htmlFor="signup-code" className="sr-only">Verification code</label><input id="signup-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${input} max-w-48 text-center tracking-[.3em]`} /><button disabled={busy} className={primary}>Verify email</button></form></Step>}
      {step === "language" && <Step title="Choose your reading language" support={offer === "one-read" ? "One choice applies to both OneArticle and OneNews." : `One choice for ${OFFERS[offer].displayName}.`}><form onSubmit={saveLanguage} className="flex flex-col items-center gap-5"><div className="flex flex-wrap justify-center gap-2">{SUMMARY_LANGUAGES.map((item) => <button type="button" key={item} aria-pressed={language === item} onClick={() => setLanguage(item)} className={`focus-ring min-h-11 rounded-full border px-4 ${language === item ? "border-ink bg-ink text-white" : "bg-white"}`}>{item}</button>)}</div><button disabled={busy} className={primary}>Continue</button></form></Step>}
      {step === "review" && <Step title="Review your subscription" support="Email delivery preferences can be changed later without cancelling billing."><div className="w-full max-w-md rounded-2xl border bg-white p-5 text-sm"><b>{OFFERS[offer].displayName}</b><p>{CADENCE[offer]}</p><p className="mt-3">{language}</p><p className="mt-3 text-lg font-semibold">${price.amountUsd} USD / {interval === "annual" ? "year" : "month"}</p><p className="mt-1 text-ash">Cancel anytime through the secure billing portal.</p></div><button disabled={busy} onClick={checkout} className={primary}>Continue to secure checkout</button></Step>}
      {step === "transition" && <Step title="Confirm your plan change" support={transitionMessage ?? "Review this change before continuing."}>{grandfathered && <label className="flex max-w-lg items-start gap-3 rounded-xl border border-amber-500 bg-amber-50 p-4 text-sm"><input type="checkbox" className="mt-1 size-5" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />I understand that switching plans gives up my grandfathered $1 price and it may not be restored.</label>}<button disabled={busy || (grandfathered && !acknowledged)} onClick={confirmTransition} className={primary}>Confirm plan change</button></Step>}
      {error && <p role="alert" aria-live="assertive" className="mt-5 text-sm text-red-700">{error}</p>}
    </section><Footer showBackHome /></main>;
}

function Step({ title, support, children }: { title: string; support: string; children: React.ReactNode }) { return <div className="flex w-full flex-col items-center gap-6"><div className="text-center"><h1 className="font-serif text-3xl font-medium sm:text-4xl">{title}</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ash">{support}</p></div>{children}</div>; }
function Interval({ value, onChange }: { value: BillingIntervalKey; onChange: (value: BillingIntervalKey) => void }) { return <fieldset className="my-5 flex gap-2 rounded-full bg-white p-1"><legend className="sr-only">Billing interval</legend>{(["annual", "monthly"] as const).map((item) => <button type="button" key={item} aria-pressed={value === item} onClick={() => onChange(item)} className={`focus-ring min-h-11 rounded-full px-5 text-sm ${value === item ? "bg-ink text-white" : "text-ash"}`}>{item === "annual" ? "Annual · save 25%" : "Monthly"}</button>)}</fieldset>; }
const input = "focus-ring h-12 w-full rounded-full border border-black/20 bg-white px-5";
const primary = "focus-ring mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-white disabled:opacity-50";
