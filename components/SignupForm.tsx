"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  INTERESTS,
  SOURCE_LANGUAGES,
  SUMMARY_LANGUAGES,
  PRICING,
  isLikelyEmail,
  type Interest,
  type SourceLanguage,
  type SummaryLanguage,
  type BillingInterval,
} from "@/lib/options";
import { InterestChip } from "./InterestChip";
import { LanguagePill } from "./LanguagePill";
import { BillingToggle } from "./BillingToggle";

export type SignupPhase = "email" | "preferences" | "payment" | "manage";

export type Preferences = {
  interests: string[];
  sourceLanguage: SourceLanguage;
  summaryLanguage: SummaryLanguage;
};

type Props = {
  phase: SignupPhase;
  email: string;
  initialPreferences?: Preferences | null;
  onEmailChange: (email: string) => void;
  onEmailSaved: (result: {
    subscribed: boolean;
    preferences: Preferences | null;
  }) => void;
  onPreferencesSaved: (preferences: Preferences) => void;
  onCompleted: () => void;
  onCanceled: () => void;
  className?: string;
};

/**
 * Multi-step signup form. The parent controls the active `phase` and the
 * canonical `email`; each step owns its own local state and handles network
 * calls + inline error/loading UI.
 *
 *   email → preferences → payment → (success, handled by parent)
 *   email → manage (for already-subscribed users)
 */
export function SignupForm({
  phase,
  email,
  initialPreferences,
  onEmailChange,
  onEmailSaved,
  onPreferencesSaved,
  onCompleted,
  onCanceled,
  className = "",
}: Props) {
  if (phase === "email") {
    return (
      <EmailStep
        email={email}
        onEmailChange={onEmailChange}
        onSaved={onEmailSaved}
        className={className}
      />
    );
  }
  if (phase === "preferences") {
    return (
      <PreferencesStep
        email={email}
        initialPreferences={initialPreferences ?? null}
        onSaved={onPreferencesSaved}
        className={className}
      />
    );
  }
  if (phase === "payment") {
    return (
      <PaymentStep
        email={email}
        onCompleted={onCompleted}
        className={className}
      />
    );
  }
  return (
    <ManageStep
      email={email}
      initialPreferences={initialPreferences ?? null}
      onCanceled={onCanceled}
      className={className}
    />
  );
}

/* ----------------------------------------------------------------------- */
/* Step 1 — Email                                                          */
/* ----------------------------------------------------------------------- */

function EmailStep({
  email,
  onEmailChange,
  onSaved,
  className = "",
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onSaved: (result: {
    subscribed: boolean;
    preferences: Preferences | null;
  }) => void;
  className?: string;
}) {
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = useMemo(() => isLikelyEmail(email), [email]);
  const canSubmit = emailValid && !loading;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        subscribed?: boolean;
        preferences?: Preferences | null;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Couldn't save your email.");
      }
      onSaved({
        subscribed: Boolean(data.subscribed),
        preferences: data.preferences ?? null,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't save your email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`w-full ${className}`}
      aria-label="Enter your email to start"
    >
      <div className="animate-rise-delayed-2">
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="you@morning.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onBlur={() => setTouched(true)}
          autoFocus
          className="
            focus-ring
            block w-full
            h-12 px-4
            rounded-xl
            bg-paper/80
            border border-line
            text-[15.5px] text-ink placeholder:text-fog
            transition-colors duration-200
            hover:border-line-strong
            focus:border-ink focus:bg-paper
          "
          aria-invalid={touched && email.length > 0 && !emailValid}
        />
        {touched && email.length > 0 && !emailValid && (
          <p className="mt-2 text-xs text-dawn font-sans pl-1 animate-fade-in">
            Please enter a valid email address.
          </p>
        )}
      </div>

      <div className="mt-5 animate-rise-delayed-3">
        <PrimaryButton
          loading={loading}
          disabled={!canSubmit}
          loadingLabel="Checking..."
          label="Continue"
        />
        {error && (
          <p
            role="alert"
            className="mt-3 text-center text-[12.5px] text-dawn font-sans animate-fade-in"
          >
            {error}
          </p>
        )}
        <p className="mt-3 text-center text-[12px] text-fog font-sans leading-[1.6]">
          One email a day. Cancel in one click.
          <br />
          Already a member? Enter your email to change your preferences or
          cancel.
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Step 2 — Preferences (first-time setup)                                 */
/* ----------------------------------------------------------------------- */

function PreferencesStep({
  email,
  initialPreferences,
  onSaved,
  className = "",
}: {
  email: string;
  initialPreferences: Preferences | null;
  onSaved: (preferences: Preferences) => void;
  className?: string;
}) {
  const prefs = usePreferencesState(initialPreferences);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = prefs.interests.size > 0 && !loading;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await savePreferences(email, prefs);
      onSaved({
        interests: Array.from(prefs.interests),
        sourceLanguage: prefs.sourceLanguage,
        summaryLanguage: prefs.summaryLanguage,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't save your preferences. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`w-full ${className}`}
      aria-label="Choose your interests and language preferences"
    >
      <PreferenceControls prefs={prefs} />

      <div className="mt-8 animate-rise-delayed-4">
        <PrimaryButton
          loading={loading}
          disabled={!canSubmit}
          loadingLabel="Saving..."
          label="Continue to payment"
        />
        {error && (
          <p
            role="alert"
            className="mt-3 text-center text-[12.5px] text-dawn font-sans animate-fade-in"
          >
            {error}
          </p>
        )}
        <p className="mt-3 text-center text-[12px] text-fog font-sans">
          One email a day. Cancel in one click.
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Step 3 — Payment (simulated)                                            */
/* ----------------------------------------------------------------------- */

function PaymentStep({
  email,
  onCompleted,
  className = "",
}: {
  email: string;
  onCompleted: () => void;
  className?: string;
}) {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnnual = interval === "annual";
  const amount = isAnnual ? PRICING.annual : PRICING.monthly;
  const period = isAnnual ? "year" : "month";

  const cardComplete =
    cardName.trim().length > 1 &&
    cardNumber.replace(/\s/g, "").length >= 15 &&
    /^\d{2}\s*\/\s*\d{2}$/.test(expiry) &&
    cvc.replace(/\D/g, "").length >= 3;
  const canSubmit = cardComplete && !loading;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signup/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, billingInterval: interval }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Payment couldn't be completed.");
      }
      onCompleted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment couldn't be completed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`w-full ${className}`}
      aria-label="Choose a plan and pay"
    >
      {/* Plan selector */}
      <div className="flex justify-center animate-rise-delayed-2">
        <BillingToggle
          value={interval}
          onChange={setInterval}
          annualBadge={`Save ${PRICING.annualSavingsPct}%`}
        />
      </div>

      <div
        key={interval}
        className="mt-4 text-center animate-fade-in"
        aria-live="polite"
      >
        <span className="font-serif font-medium text-[2rem] leading-none text-ink">
          ${amount}
        </span>
        <span className="font-sans text-[14px] text-ash"> / {period}</span>
      </div>

      {/* Card fields */}
      <div className="mt-6 space-y-3 animate-rise-delayed-3">
        <CardInput
          label="Cardholder name"
          placeholder="Ada Lovelace"
          value={cardName}
          autoComplete="cc-name"
          onChange={setCardName}
        />
        <CardInput
          label="Card number"
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={19}
          onChange={(v) => setCardNumber(formatCardNumber(v))}
        />
        <div className="flex gap-3">
          <CardInput
            label="Expiry"
            placeholder="MM / YY"
            value={expiry}
            inputMode="numeric"
            autoComplete="cc-exp"
            maxLength={7}
            onChange={(v) => setExpiry(formatExpiry(v))}
            className="flex-1"
          />
          <CardInput
            label="CVC"
            placeholder="123"
            value={cvc}
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            onChange={(v) => setCvc(v.replace(/\D/g, ""))}
            className="flex-1"
          />
        </div>
      </div>

      <div className="mt-7 animate-rise-delayed-4">
        <PrimaryButton
          loading={loading}
          disabled={!canSubmit}
          loadingLabel="Processing..."
          label={`Pay $${amount} & finish`}
        />
        {error && (
          <p
            role="alert"
            className="mt-3 text-center text-[12.5px] text-dawn font-sans animate-fade-in"
          >
            {error}
          </p>
        )}
        <p className="mt-3 text-center text-[12px] text-fog font-sans">
          Secure checkout. Cancel anytime in one click.
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Manage — for already-subscribed users                                   */
/* ----------------------------------------------------------------------- */

function ManageStep({
  email,
  initialPreferences,
  onCanceled,
  className = "",
}: {
  email: string;
  initialPreferences: Preferences | null;
  onCanceled: () => void;
  className?: string;
}) {
  const prefs = usePreferencesState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const canSave = prefs.interests.size > 0 && !saving;

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await savePreferences(email, prefs);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't save your changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch("/api/signup/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Couldn't cancel your subscription.");
      }
      onCanceled();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't cancel your subscription. Please try again.",
      );
      setCanceling(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      noValidate
      className={`w-full ${className}`}
      aria-label="Manage your subscription"
    >
      <PreferenceControls prefs={prefs} onChange={() => setSaved(false)} />

      <div className="mt-8 animate-rise-delayed-4">
        <PrimaryButton
          loading={saving}
          disabled={!canSave}
          loadingLabel="Saving..."
          label="Save changes"
        />
        {saved && (
          <p className="mt-3 text-center text-[12.5px] text-ash font-sans animate-fade-in">
            Saved. Your next One Read will reflect this.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 text-center text-[12.5px] text-dawn font-sans animate-fade-in"
          >
            {error}
          </p>
        )}

        {/* Cancel subscription — low emphasis with inline confirm */}
        <div className="mt-6 pt-5 border-t border-line text-center">
          {!confirmingCancel ? (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="focus-ring rounded text-[13px] font-sans text-fog underline underline-offset-4 hover:text-ash transition-colors"
            >
              Cancel subscription
            </button>
          ) : (
            <div className="animate-fade-in">
              <p className="text-[13px] font-sans text-ash">
                Cancel your subscription? Daily emails will stop.
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={canceling}
                  className="focus-ring h-9 px-4 rounded-full border border-line text-[13px] font-sans text-ash hover:text-ink hover:border-line-strong transition-colors disabled:opacity-40"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={canceling}
                  aria-busy={canceling}
                  className="focus-ring h-9 px-4 rounded-full border border-dawn text-[13px] font-sans text-dawn hover:bg-dawn hover:text-paper transition-colors disabled:opacity-40"
                >
                  {canceling ? "Canceling..." : "Yes, cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Shared preference state + controls                                      */
/* ----------------------------------------------------------------------- */

type PreferencesState = {
  interests: Set<Interest>;
  toggleInterest: (interest: Interest) => void;
  sourceLanguage: SourceLanguage;
  setSourceLanguage: (v: SourceLanguage) => void;
  summaryLanguage: SummaryLanguage;
  setSummaryLanguage: (v: SummaryLanguage) => void;
};

function usePreferencesState(initial: Preferences | null): PreferencesState {
  const allowed = useMemo(() => new Set<string>(INTERESTS), []);
  const initialInterests = useMemo(
    () =>
      new Set<Interest>(
        (initial?.interests ?? []).filter((i): i is Interest =>
          allowed.has(i),
        ),
      ),
    [initial, allowed],
  );

  const [interests, setInterests] = useState<Set<Interest>>(initialInterests);
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>(
    initial?.sourceLanguage ?? "Any",
  );
  const [summaryLanguage, setSummaryLanguage] = useState<SummaryLanguage>(
    initial?.summaryLanguage ?? "English",
  );

  const toggleInterest = (interest: Interest) =>
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(interest)) next.delete(interest);
      else next.add(interest);
      return next;
    });

  return {
    interests,
    toggleInterest,
    sourceLanguage,
    setSourceLanguage,
    summaryLanguage,
    setSummaryLanguage,
  };
}

async function savePreferences(email: string, prefs: PreferencesState) {
  const res = await fetch("/api/signup/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      interests: Array.from(prefs.interests),
      sourceLanguage: prefs.sourceLanguage,
      summaryLanguage: prefs.summaryLanguage,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "Couldn't save your preferences.");
  }
}

function PreferenceControls({
  prefs,
  onChange,
}: {
  prefs: PreferencesState;
  onChange?: () => void;
}) {
  return (
    <>
      {/* Interests */}
      <fieldset className="animate-rise-delayed-2">
        <legend className="block text-[11px] font-sans uppercase tracking-eyebrow text-fog mb-3 text-center w-full">
          What you'd like to read about
        </legend>
        <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-center">
          {INTERESTS.map((interest) => (
            <InterestChip
              key={interest}
              label={interest}
              selected={prefs.interests.has(interest)}
              onClick={() => {
                prefs.toggleInterest(interest);
                onChange?.();
              }}
            />
          ))}
        </div>
      </fieldset>

      {/* Languages */}
      <div className="mt-7 space-y-3 animate-rise-delayed-3">
        <LanguageRow
          label="Source language"
          options={SOURCE_LANGUAGES}
          value={prefs.sourceLanguage}
          onChange={(v) => {
            prefs.setSourceLanguage(v as SourceLanguage);
            onChange?.();
          }}
          name="source"
        />
        <LanguageRow
          label="Summary language"
          options={SUMMARY_LANGUAGES}
          value={prefs.summaryLanguage}
          onChange={(v) => {
            prefs.setSummaryLanguage(v as SummaryLanguage);
            onChange?.();
          }}
          name="summary"
        />
      </div>
    </>
  );
}

/* ----------------------------------------------------------------------- */
/* Internal helpers                                                        */
/* ----------------------------------------------------------------------- */

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function CardInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  autoComplete,
  maxLength,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text";
  autoComplete?: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-sans uppercase tracking-eyebrow text-fog mb-1.5">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        spellCheck={false}
        className="
          focus-ring
          block w-full h-11 px-3.5
          rounded-xl
          bg-paper/80
          border border-line
          text-[15px] text-ink placeholder:text-fog
          transition-colors duration-200
          hover:border-line-strong
          focus:border-ink focus:bg-paper
        "
      />
    </label>
  );
}

function PrimaryButton({
  loading,
  disabled,
  label,
  loadingLabel,
}: {
  loading: boolean;
  disabled: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={loading}
      className="
        focus-ring
        relative w-full h-12 rounded-xl
        bg-ink text-paper
        font-sans text-[15px] tracking-tight
        transition-[transform,background-color,opacity] duration-200
        hover:bg-graphite
        active:scale-[0.99]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink
      "
    >
      <span
        className={`inline-flex items-center justify-center gap-2 transition-opacity duration-200 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        {label}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 7h10M8 3l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {loading && (
        <span
          aria-live="polite"
          className="absolute inset-0 flex items-center justify-center gap-2"
        >
          <span className="h-4 w-4 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />
          <span className="text-paper/85 text-[14px]">{loadingLabel}</span>
        </span>
      )}
    </button>
  );
}

type LanguageRowProps<T extends string> = {
  label: string;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

function LanguageRow<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: LanguageRowProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="
        flex flex-col items-center gap-2
        sm:flex-row sm:items-center sm:justify-between sm:gap-4
      "
    >
      <span className="text-[12.5px] sm:text-[13px] font-sans text-ash sm:text-ink/85 tracking-tight">
        {label}
      </span>
      <div className="flex flex-wrap gap-2 justify-center">
        {options.map((option) => (
          <LanguagePill
            key={`${name}-${option}`}
            label={option}
            selected={value === option}
            onClick={() => onChange(option)}
          />
        ))}
      </div>
    </div>
  );
}
