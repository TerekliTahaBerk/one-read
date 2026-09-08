"use client";

import { ProductPreferencesForm, topicLabel } from "./ProductPreferencesForm";
import { parseProductPreferences } from "@/lib/product-preferences";
import { READING_LANGUAGE_LABELS } from "@/lib/site-i18n";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { ProductMascot, productThemeKey, themeStyle } from "@/components/ProductIdentity";
import {
  FlowError,
  FlowStep,
  FlowWarning,
  SignupShell,
  codeInput,
  fieldInput,
  fieldLabel,
  primaryAction,
  secondaryAction,
  factLabel,
  sectionHeading,
} from "@/components/SignupShell";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { isLikelyEmail } from "@/lib/options";
import { PRODUCTS, PRODUCT_KEYS, type ProductKey } from "@/lib/products/registry";
import { trackEvent } from "@/lib/analytics";

type ProductState = { topics?: string[]; active: boolean; cadence: string; language: string | null; emailStatus: string };
type LookupResult = {
  state: string;
  billingManageable?: boolean;
  products: Record<"one-article" | "one-news", ProductState>;
  billing?: { plans: { plan: string; includes: string; billing: string; state: string; grandfathered: boolean; pendingChange?: { toOffer: string; toInterval: string } | null }[]; grandfathered: boolean; grandfatherWarning: string | null } | null;
};

/**
 * My OneRead — the account surface, drawn in the same system as signup.
 *
 * It shares the shell, the form language and the product identities with
 * `OneReadSignup`, so arriving here after checkout does not feel like landing
 * in a settings panel bolted onto the side of the site. What it must keep
 * saying plainly is the one distinction subscribers get wrong: editorial email
 * and billing are separate, and turning email off cancels nothing.
 *
 * Everything a product section states — its name, its cadence — is named by
 * the registry or returned by the lookup, never typed here.
 */
export function OneReadPreferences({ initialEmail = "" }: { initialEmail?: string }) {
  const [step, setStep] = useState<"email" | "verify" | "status">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const { dictionary, locale } = useSiteLanguage();
  const copy = dictionary.preferences;

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!isLikelyEmail(email)) return setError(copy.emailInvalid);
    setBusy(true);
    const response = await fetch("/api/oneread/verification/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, locale }) });
    setBusy(false);
    if (!response.ok) return setError(copy.emailFailed);
    setStep("verify");
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    const response = await fetch("/api/oneread/verification/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
    setBusy(false);
    if (!response.ok) return setError(copy.codeFailed);
    await load();
  }

  async function load() {
    setBusy(true);
    const response = await fetch("/api/oneread/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json().catch(() => ({})) as LookupResult & { ok?: boolean };
    setBusy(false);
    if (!response.ok || !data.ok) return setError(copy.lookupFailed);
    setResult(data); setStep("status");
  }

  async function setEmailPreference(product: "one-article" | "one-news" | "all", enabled: boolean) {
    setBusy(true); setError(null);
    const response = await fetch("/api/oneread/email-preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, product, enabled }) });
    const data = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (!response.ok) return setError(data.error === "email_suppressed" ? copy.suppressed : copy.updateFailed);
    trackEvent(enabled ? "product_email_resubscribed" : "product_email_unsubscribed", { product });
    await load();
  }

  async function manageBilling() {
    setBusy(true);
    const response = await fetch("/api/oneread/portal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json().catch(() => ({})) as { action?: string; url?: string };
    setBusy(false);
    if (response.ok && data.action === "redirect" && data.url) window.location.assign(data.url);
    else setError(copy.portalUnavailable);
  }

  return (
    <SignupShell themeKey="read" logoLabel="OneRead" backLabel={dictionary.common.backToOneRead}>
      {step === "email" && (
        <FlowStep title={copy.title} support={copy.lookupIntro} footnote={copy.separation}>
          <form onSubmit={requestCode} className="flex w-full max-w-sm flex-col gap-2">
            <label htmlFor="account-email" className={fieldLabel}>{copy.emailLabel}</label>
            <input id="account-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldInput} />
            <button disabled={busy} className={`${primaryAction} mt-4`}>{copy.emailCta}</button>
          </form>
        </FlowStep>
      )}

      {step === "verify" && (
        <FlowStep title={copy.verifyTitle} support={copy.verifyIntro.replace("{email}", email)}>
          {/* The same single field signup verifies with, so the two flows do
              not teach two different ways to type the same code. */}
          <form onSubmit={confirmCode} className="flex flex-col items-center gap-3">
            <label htmlFor="account-code" className="sr-only">{copy.codeLabel}</label>
            <input id="account-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className={codeInput} />
            <button disabled={busy} className={`${primaryAction} mt-3`}>{copy.codeCta}</button>
          </form>
        </FlowStep>
      )}

      {step === "status" && result && (
        <div className="w-full max-w-[40rem]">
          <h1 className="font-serif text-[2rem] font-medium leading-[1.06] tracking-[-0.026em] text-ink sm:text-[2.4rem]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-[46ch] font-sans text-[14px] leading-[1.65] text-ash">
            {copy.separation}
          </p>

          {/* One section per product, in its own accent. Nothing here is a
              dashboard: it is a short statement of what arrives, in which
              language, and whether email is on. */}
          {PRODUCT_KEYS.map((product) => (
            <ProductSection
              key={product}
              product={product}
              value={result.products?.[product] ?? { active: false, cadence: PRODUCTS[product].cadence, language: null, emailStatus: "UNSUBSCRIBED" }}
              busy={busy}
              copy={copy}
              onChange={setEmailPreference}
              email={email}
              onSaved={load}
            />
          ))}

          <section className="mt-10">
            <h2 className={sectionHeading}>{copy.billingHeading}</h2>
            {result.billing?.plans.map((plan, index) => (
              <div key={`${plan.plan}-${index}`} className="mt-5">
                <p className="font-sans text-[15px] font-medium text-ink">{plan.plan}</p>
                <dl className="mt-3 grid gap-3 font-sans text-[13px] leading-[1.55] sm:grid-cols-2">
                  <Fact label={dictionary.pricing.includedLabel} value={plan.includes} />
                  <Fact label={copy.intervalLabel} value={plan.billing} />
                  <Fact
                    label={copy.stateLabel}
                    value={
                      <>
                        {plan.state}
                        {plan.pendingChange && (
                          <span className="mt-0.5 block text-ash">
                            {copy.pendingChange
                              .replace("{offer}", plan.pendingChange.toOffer)
                              .replace("{interval}", plan.pendingChange.toInterval)}
                          </span>
                        )}
                      </>
                    }
                  />
                </dl>
                {/* A disclosure, not a promotion: amber, and never recoloured
                    by a product accent. */}
                {plan.grandfathered && (
                  <div className="mt-4">
                    <FlowWarning>{copy.grandfathered}</FlowWarning>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button disabled={busy} onClick={() => setEmailPreference("all", false)} className={secondaryAction}>
                {copy.turnOffAll}
              </button>
              {result.billingManageable && (
                <button disabled={busy} onClick={manageBilling} className={secondaryAction}>
                  {copy.manageBilling}
                </button>
              )}
              <Link href="/pricing" className={secondaryAction}>{copy.viewPlans}</Link>
            </div>
          </section>
        </div>
      )}

      <FlowError>{error}</FlowError>
    </SignupShell>
  );
}

/**
 * One product's standing: is it active, when does it arrive, in which
 * language, and is email on. The accent is the product's own, applied to the
 * hairline and the mascot's surroundings rather than to the whole block —
 * subtle enough that the two sections still read as one page.
 */
function ProductSection({
  product,
  value,
  busy,
  copy,
  onChange,
  email,
  onSaved,
}: {
  email: string;
  onSaved: () => Promise<void>;
  product: ProductKey;
  value: ProductState;
  busy: boolean;
  copy: PreferencesCopy;
  onChange: (product: "one-article" | "one-news", enabled: boolean) => void;
}) {
  const { dictionary, locale } = useSiteLanguage();
  const setupCopy = dictionary.productPreferences;
  const [editing, setEditing] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [language, setLanguage] = useState("English");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setSaveError(""); setMessage("");
    if (!parseProductPreferences({ topics, summaryLanguage: language })) return setSaveError(setupCopy.invalid);
    setSaving(true);
    try {
      const response = await fetch(`/api/oneread/${product === "one-article" ? "article" : "news"}-preferences`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, topics, summaryLanguage: language, context: "account" }),
      });
      if (!response.ok) return setSaveError(setupCopy.failed);
      trackEvent("product_preferences_saved", { product, topicCount: String(topics.length), language, context: "account" });
      setEditing(false); setMessage(setupCopy.saved); await onSaved();
    } catch { setSaveError(setupCopy.failed); }
    finally { setSaving(false); }
  }
  const on = value.emailStatus === "SUBSCRIBED";
  const suppressed = value.emailStatus === "SUPPRESSED";
  const emailLabel = suppressed ? copy.emailSuppressed : on ? copy.emailOn : copy.emailOff;

  return (
    <section className="mt-10" style={themeStyle(productThemeKey(product))}>
      <h2 className={sectionHeading}>{PRODUCTS[product].displayName}</h2>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <ProductMascot product={product} size="sm" />
          <div>
            <p className="font-sans text-[15px] font-medium text-ink">
              {value.active ? copy.active : copy.inactive}
            </p>
            <dl className="mt-3 grid gap-3 font-sans text-[13px] leading-[1.55]">
              <Fact label={copy.cadenceLabel} value={value.cadence} />
              <Fact label={setupCopy.topics} value={value.topics?.length ? value.topics.map((slug) => topicLabel(slug, locale)).join(" · ") : setupCopy.broad} />
              <Fact label={copy.languageLabel} value={value.language ? READING_LANGUAGE_LABELS[value.language] ?? value.language : copy.languageUnset} />
              <Fact label={copy.emailStatusLabel} value={emailLabel} />
            </dl>
          </div>
        </div>

        {value.active && (
          <button
            disabled={busy || suppressed}
            onClick={() => onChange(product, !on)}
            className={`${secondaryAction} shrink-0`}
          >
            {on ? copy.turnEmailOff : copy.resumeEmail}
          </button>
        )}
      </div>
      {value.active && !editing && <button type="button" className={`${secondaryAction} mt-4`} disabled={busy} onClick={() => {
        setTopics([...(value.topics ?? [])]); setLanguage(value.language ?? "English"); setEditing(true); setMessage(""); setSaveError("");
      }}>{setupCopy.edit}</button>}
      {editing && <form onSubmit={save} className="mt-6 space-y-5">
        <ProductPreferencesForm product={product} selectedTopics={topics} language={language} onTopicsChange={setTopics} onLanguageChange={setLanguage} disabled={saving} />
        <div className="flex flex-wrap gap-2">
          <button disabled={saving} className={primaryAction}>{setupCopy.save}</button>
          <button type="button" disabled={saving} className={secondaryAction} onClick={() => { setEditing(false); setSaveError(""); }}>{setupCopy.cancel}</button>
        </div>
      </form>}
      <FlowError>{saveError}</FlowError>
      <p role="status" className="mt-2 text-sm">{message}</p>
    </section>
  );
}

/** One labelled fact. Label above value, the same as every field in signup. */
function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className={factLabel}>{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

type PreferencesCopy = ReturnType<typeof useSiteLanguage>["dictionary"]["preferences"];
