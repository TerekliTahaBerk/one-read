"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { isLikelyEmail } from "@/lib/options";
import { trackEvent } from "@/lib/analytics";

type ProductState = { active: boolean; cadence: string; language: string | null; emailStatus: string };
type LookupResult = {
  state: string;
  billingManageable?: boolean;
  products: Record<"one-article" | "one-news", ProductState>;
  billing?: { plans: { plan: string; includes: string; billing: string; state: string; grandfathered: boolean; pendingChange?: { toOffer: string; toInterval: string } | null }[]; grandfathered: boolean; grandfatherWarning: string | null } | null;
};

export function OneReadPreferences({ initialEmail = "" }: { initialEmail?: string }) {
  const [step, setStep] = useState<"email" | "verify" | "status">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!isLikelyEmail(email)) return setError("Enter a valid email address.");
    setBusy(true);
    const response = await fetch("/api/oneread/verification/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    setBusy(false);
    if (!response.ok) return setError("We could not send a code.");
    setStep("verify");
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    const response = await fetch("/api/oneread/verification/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
    setBusy(false);
    if (!response.ok) return setError("That code could not be verified.");
    await load();
  }

  async function load() {
    setBusy(true);
    const response = await fetch("/api/oneread/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json().catch(() => ({})) as LookupResult & { ok?: boolean };
    setBusy(false);
    if (!response.ok || !data.ok) return setError("We could not load your account.");
    setResult(data); setStep("status");
  }

  async function setEmailPreference(product: "one-article" | "one-news" | "all", enabled: boolean) {
    setBusy(true); setError(null);
    const response = await fetch("/api/oneread/email-preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, product, enabled }) });
    const data = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (!response.ok) return setError(data.error === "email_suppressed" ? "This address is suppressed after a provider safety event. Contact support to review it." : "We could not update email delivery.");
    trackEvent(enabled ? "product_email_resubscribed" : "product_email_unsubscribed", { product });
    await load();
  }

  async function manageBilling() {
    setBusy(true);
    const response = await fetch("/api/oneread/portal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json().catch(() => ({})) as { action?: string; url?: string };
    setBusy(false);
    if (response.ok && data.action === "redirect" && data.url) window.location.assign(data.url);
    else setError("The billing portal is unavailable right now.");
  }

  return <main className="min-h-svh bg-[#f6f5f1] px-5 py-7 text-ink sm:px-6"><header className="relative flex justify-center"><BackButton href="/" label="Back to OneRead" /><Logo href="/" /></header><section className="mx-auto flex min-h-[78vh] w-full max-w-2xl flex-col items-center justify-center py-10"><h1 className="font-serif text-4xl font-medium">My OneRead</h1><p className="mt-3 text-center text-sm text-ash">Billing access and email delivery are separate. Turning off email never cancels a paid plan.</p>
    {step === "email" && <form onSubmit={requestCode} className="mt-7 flex w-full max-w-sm flex-col gap-3"><label htmlFor="account-email">Email address</label><input id="account-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /><button disabled={busy} className={primary}>Email me a code</button></form>}
    {step === "verify" && <form onSubmit={confirmCode} className="mt-7 flex flex-col items-center gap-3"><label htmlFor="account-code">Six-digit code</label><input id="account-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className={`${input} max-w-48 text-center tracking-[.3em]`} /><button disabled={busy} className={primary}>Verify</button></form>}
    {step === "status" && result && <div className="mt-8 w-full space-y-4">
      <ProductCard name="OneArticle" product="one-article" value={result.products["one-article"]} busy={busy} onChange={setEmailPreference} />
      <ProductCard name="OneNews" product="one-news" value={result.products["one-news"]} busy={busy} onChange={setEmailPreference} />
      {result.billing?.plans.map((plan, index) => <div key={`${plan.plan}-${index}`} className="rounded-2xl border bg-white p-5 text-sm"><b>{plan.plan}</b><p>{plan.includes} · {plan.billing}</p><p className="mt-1 text-ash">{plan.state}{plan.pendingChange ? ` · changing to ${plan.pendingChange.toOffer} ${plan.pendingChange.toInterval}` : ""}</p>{plan.grandfathered && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">Grandfathered $1 plan. OneArticle remains included; OneNews is not silently added.</p>}</div>)}
      <div className="flex flex-col gap-2 sm:flex-row"><button disabled={busy} onClick={() => setEmailPreference("all", false)} className={outline}>Turn off all editorial email</button>{result.billingManageable && <button disabled={busy} onClick={manageBilling} className={outline}>Manage billing</button>}<Link href="/pricing" className={outline}>View plans</Link></div>
    </div>}
    {error && <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-700">{error}</p>}
  </section><Footer showBackHome /></main>;
}

function ProductCard({ name, product, value, busy, onChange }: { name: string; product: "one-article" | "one-news"; value: ProductState; busy: boolean; onChange: (product: "one-article" | "one-news", enabled: boolean) => void }) {
  const on = value.emailStatus === "SUBSCRIBED";
  return <section className="rounded-2xl border bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-serif text-2xl">{name}</h2><p className="mt-1 text-sm">{value.active ? "Active" : "Inactive"} · {value.cadence}</p><p className="text-sm text-ash">Language: {value.language ?? "Not set"} · Email: {value.emailStatus === "SUPPRESSED" ? "Suppressed" : on ? "On" : "Off"}</p></div>{value.active && <button disabled={busy || value.emailStatus === "SUPPRESSED"} onClick={() => onChange(product, !on)} className={outline}>{on ? "Turn email off" : "Resume email"}</button>}</div></section>;
}
const input = "focus-ring h-12 w-full rounded-full border border-black/20 bg-white px-5";
const primary = "focus-ring min-h-12 rounded-full bg-ink px-6 text-sm font-medium text-white disabled:opacity-50";
const outline = "focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-black/20 bg-white px-4 text-sm disabled:opacity-50";
