"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  INTERESTS,
  SOURCE_LANGUAGES,
  SUMMARY_LANGUAGES,
  PRICING,
  isLikelyEmail,
  type Interest,
  type SourceLanguage,
  type SummaryLanguage,
} from "@/lib/options";
import { InterestChip } from "./InterestChip";
import { LanguagePill } from "./LanguagePill";

export type SignupPhase =
  | "email"
  | "verify"
  | "preferences"
  | "payment"
  | "manage";

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
  /** Email accepted and a verification code was sent → move to the verify step. */
  onCodeSent: () => void;
  /** Code verified → branch to preferences setup or manage. */
  onVerified: (result: {
    subscribed: boolean;
    preferences: Preferences | null;
  }) => void;
  /** "Use a different email" from the verify step. */
  onChangeEmail: () => void;
  onPreferencesSaved: (preferences: Preferences) => void;
  onCompleted: () => void;
  onCanceled: () => void;
  className?: string;
};

function prefersSameTabExternalRedirect(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}

/**
 * Multi-step signup form. The parent controls the active `phase` and the
 * canonical `email`; each step owns its own local state and handles network
 * calls + inline error/loading UI.
 *
 *   email → preferences → Polar checkout
 *   email → manage (for already-subscribed users)
 */
export function SignupForm({
  phase,
  email,
  initialPreferences,
  onEmailChange,
  onCodeSent,
  onVerified,
  onChangeEmail,
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
        onCodeSent={onCodeSent}
        className={className}
      />
    );
  }
  if (phase === "verify") {
    return (
      <VerifyStep
        email={email}
        onVerified={onVerified}
        onChangeEmail={onChangeEmail}
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
  onCodeSent,
  className = "",
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onCodeSent: () => void;
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
      const res = await fetch("/api/one-article/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        retryAfterSeconds?: number;
      };
      if (res.status === 503) {
        throw new Error("Email verification isn't available right now.");
      }
      if (res.status === 429) {
        const secs = data.retryAfterSeconds ?? 60;
        throw new Error(`Please wait ${secs}s before requesting another code.`);
      }
      if (!res.ok || !data.ok) {
        throw new Error("Couldn't send a code. Please try again.");
      }
      // Generic success — we never reveal whether the email already exists.
      onCodeSent();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't send a code. Please try again.",
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
            bg-white/75
            border border-[var(--theme-border)]
            text-[16px] sm:text-[15.5px] text-ink placeholder:text-fog
            transition-colors duration-200
            hover:border-[var(--theme-accent)]
            focus:border-[var(--theme-accent)] focus:bg-white
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
          loadingLabel="Sending code..."
          label="Send code"
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
          We&apos;ll email a 6-digit code to confirm it&apos;s you.
          <br />
          Already a member? Verify your email to change your preferences or
          cancel.
        </p>
        <p className="mt-3 text-center text-[12px] text-fog font-sans leading-[1.6]">
          By continuing, you agree to the{" "}
          <Link
            href="/terms"
            className="link-underline transition-colors duration-200 hover:text-ink"
          >
            Terms
          </Link>{" "}
          and acknowledge the{" "}
          <Link
            href="/privacy"
            className="link-underline transition-colors duration-200 hover:text-ink"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Step 1b — Verify 6-digit code                                           */
/* ----------------------------------------------------------------------- */

function VerifyStep({
  email,
  onVerified,
  onChangeEmail,
  className = "",
}: {
  email: string;
  onVerified: (result: {
    subscribed: boolean;
    preferences: Preferences | null;
  }) => void;
  onChangeEmail: () => void;
  className?: string;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedFor = useRef<string | null>(null);

  // Countdown for the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSubmit = code.length === 6 && !loading;

  const verify = async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/one-article/verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: value }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        subscribed?: boolean;
        preferences?: Preferences | null;
      };
      if (!res.ok || !data.ok) {
        submittedFor.current = null;
        setCode("");
        throw new Error(confirmErrorMessage(data.error));
      }
      onVerified({
        subscribed: Boolean(data.subscribed),
        preferences: data.preferences ?? null,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That code is not correct. Try again.",
      );
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) {
      setError("Please enter the 6-digit code.");
      return;
    }
    void verify(code);
  };

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setResent(false);
    // Auto-submit once a full, clean 6-digit code is present.
    if (digits.length === 6 && submittedFor.current !== digits && !loading) {
      submittedFor.current = digits;
      void verify(digits);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setResent(false);
    try {
      const res = await fetch("/api/one-article/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        retryAfterSeconds?: number;
      };
      if (res.status === 429) {
        setCooldown(data.retryAfterSeconds ?? 60);
      } else {
        setCooldown(60);
        setResent(true);
        setCode("");
        submittedFor.current = null;
      }
    } catch {
      setError("Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`w-full ${className}`}
      aria-label="Enter your verification code"
    >
      <div className="animate-rise-delayed-2">
        <p className="mb-4 text-center text-[13px] font-sans leading-[1.6] text-ash">
          Enter the 6-digit code we sent to{" "}
          <span className="text-ink">{email}</span>.
        </p>
        <label htmlFor="code" className="sr-only">
          6-digit verification code
        </label>
        <input
          id="code"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          spellCheck={false}
          placeholder="• • • • • •"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className="
            focus-ring
            block w-full
            h-14 px-4
            rounded-xl
            bg-white/75
            border border-[var(--theme-border)]
            text-center font-sans text-[26px] tracking-[0.4em] text-ink placeholder:text-fog placeholder:tracking-[0.3em]
            transition-colors duration-200
            hover:border-[var(--theme-accent)]
            focus:border-[var(--theme-accent)] focus:bg-white
          "
        />
      </div>

      <div className="mt-5 animate-rise-delayed-3">
        <PrimaryButton
          loading={loading}
          disabled={!canSubmit}
          loadingLabel="Verifying..."
          label="Verify email"
        />
        {error && (
          <p
            role="alert"
            className="mt-3 text-center text-[12.5px] text-dawn font-sans animate-fade-in"
          >
            {error}
          </p>
        )}
        {resent && !error && (
          <p className="mt-3 text-center text-[12.5px] text-ash font-sans animate-fade-in">
            A new code is on its way.
          </p>
        )}

        <div className="mt-4 flex flex-col items-center gap-1.5 text-[12px] font-sans text-fog">
          {cooldown > 0 ? (
            <span>You can request a new code in {cooldown}s.</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="focus-ring rounded link-underline transition-colors hover:text-ink disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend code"}
            </button>
          )}
          <button
            type="button"
            onClick={onChangeEmail}
            className="focus-ring rounded link-underline transition-colors hover:text-ink"
          >
            Use a different email
          </button>
        </div>
      </div>
    </form>
  );
}

function confirmErrorMessage(error: string | undefined): string {
  switch (error) {
    case "expired":
      return "This code has expired. Request a new one.";
    case "too_many":
      return "Too many attempts. Request a new code.";
    case "invalid_code_format":
      return "Please enter the 6-digit code.";
    case "verification_not_configured":
      return "Email verification isn't available right now.";
    case "incorrect":
    case "invalid":
    default:
      return "That code is not correct. Try again.";
  }
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
/* Step 3 — Polar checkout                                                 */
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = PRICING.monthly;
  const period = "month";

  const canSubmit = !loading;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const sameTabRedirect = prefersSameTabExternalRedirect();
    const checkoutWindow = sameTabRedirect ? null : window.open("about:blank", "_blank");
    if (checkoutWindow) checkoutWindow.opener = null;
    let redirected = false;
    try {
      const res = await fetch("/api/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan: "monthly", productKey: "one-article" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        action?: string;
        url?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Checkout couldn't be started.");
      }
      if ((data.action === "redirect" || data.action === "already_active") && data.url) {
        redirected = true;
        if (checkoutWindow) {
          checkoutWindow.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
        return;
      }
      if (data.action === "needs_setup" || data.action === "needs_setup_first") {
        throw new Error("Please finish setup before checkout.");
      }
      onCompleted();
    } catch (err) {
      checkoutWindow?.close();
      setError(
        err instanceof Error
          ? err.message
          : "Checkout couldn't be started. Please try again.",
      );
    } finally {
      if (!redirected) checkoutWindow?.close();
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
      <div className="text-center animate-rise-delayed-2" aria-live="polite">
        <span className="font-serif font-medium text-[2rem] leading-none text-ink">
          ${amount}
        </span>
        <span className="font-sans text-[14px] text-ash"> / {period}</span>
      </div>

      <p className="mt-6 text-center font-sans text-[14px] leading-[1.6] text-ash animate-rise-delayed-3">
        Checkout opens in Polar. The 7-day trial starts there, and OneArticle
        emails begin after Polar confirms the subscription.
      </p>

      <div className="mt-7 animate-rise-delayed-4">
        <PrimaryButton
          subtle
          loading={loading}
          disabled={!canSubmit}
          loadingLabel="Opening checkout..."
          label="Start 7-day free trial"
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
          Secure checkout by Polar. Cancel anytime in the billing portal.
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
        action?: string;
        error?: string;
      };
      if (res.ok && data.ok && data.action === "canceled") {
        onCanceled();
        return;
      }
      if (data.action === "needs_setup_first") {
        window.location.href = "/article";
        return;
      }
      if (data.action === "needs_setup") {
        window.location.href = `/article?email=${encodeURIComponent(email)}`;
        return;
      }
      if (data.action === "needs_checkout" || data.action === "no_active_subscription") {
        window.location.href = `/article/subscribe?email=${encodeURIComponent(email)}`;
        return;
      }
      throw new Error(data.error ?? "Couldn't cancel your subscription.");
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
            Saved. Your next OneArticle will reflect this.
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
        <div className="mt-6 pt-5 border-t border-[var(--theme-border)] text-center">
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
                Cancel your subscription? You’ll keep access until the paid period ends.
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={canceling}
                  className="focus-ring h-9 px-4 rounded-full border border-[var(--theme-border)] text-[13px] font-sans text-ash hover:text-ink hover:border-[var(--theme-accent)] transition-colors disabled:opacity-40"
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
          Choose your reading interests
        </legend>
        <p className="mx-auto mb-4 max-w-[36ch] text-center font-sans text-[12.5px] leading-[1.55] text-fog">
          Pick a few areas you’d like OneArticle to pay attention to. You can
          keep it broad or make it specific.
        </p>
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
          bg-white/75
          border border-[var(--theme-border)]
          text-[16px] sm:text-[15px] text-ink placeholder:text-fog
          transition-colors duration-200
          hover:border-[var(--theme-accent)]
          focus:border-[var(--theme-accent)] focus:bg-white
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
  subtle = false,
}: {
  loading: boolean;
  disabled: boolean;
  label: string;
  loadingLabel: string;
  subtle?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={loading}
      className={[
        "focus-ring",
        "relative w-full h-12 rounded-xl",
        "font-sans text-[15px] tracking-tight",
        "transition-[transform,background-color,border-color,color,opacity] duration-200",
        subtle
          ? "bg-white/65 text-ash border border-[var(--theme-border)] hover:text-ink hover:border-[var(--theme-accent)] hover:bg-white/85"
          : "bg-[var(--theme-accent)] text-paper hover:brightness-95",
        "active:scale-[0.99]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100",
      ].join(" ")}
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
          <span
            className={`h-4 w-4 rounded-full border-2 animate-spin ${
              subtle
                ? "border-ash/30 border-t-ash"
                : "border-paper/40 border-t-paper"
            }`}
          />
          <span
            className={`text-[14px] ${subtle ? "text-ash" : "text-paper/85"}`}
          >
            {loadingLabel}
          </span>
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
      <span className="text-[11px] font-sans uppercase tracking-eyebrow text-fog">
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
