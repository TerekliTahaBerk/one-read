"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  INTERESTS,
  SOURCE_LANGUAGES,
  SUMMARY_LANGUAGES,
  isLikelyEmail,
  type Interest,
  type SourceLanguage,
  type SummaryLanguage,
} from "@/lib/options";
import { InterestChip } from "./InterestChip";
import { LanguagePill } from "./LanguagePill";

export type SignupPhase = "email" | "preferences";

type Props = {
  phase: SignupPhase;
  email: string;
  onEmailChange: (email: string) => void;
  onEmailSaved: () => void;
  onCompleted: () => void;
  className?: string;
};

/**
 * Two-step signup form. The parent controls the active `phase` and the
 * canonical `email`; this component owns its own preferences state and
 * handles network calls + inline error/loading UI.
 */
export function SignupForm({
  phase,
  email,
  onEmailChange,
  onEmailSaved,
  onCompleted,
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
  return (
    <PreferencesStep
      email={email}
      onCompleted={onCompleted}
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
  onSaved: () => void;
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
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Couldn't save your email.");
      }
      onSaved();
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
          loadingLabel="Saving..."
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
        <p className="mt-3 text-center text-[12px] text-fog font-sans">
          One email a day. Unsubscribe in one click.
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Step 2 — Preferences                                                    */
/* ----------------------------------------------------------------------- */

function PreferencesStep({
  email,
  onCompleted,
  className = "",
}: {
  email: string;
  onCompleted: () => void;
  className?: string;
}) {
  const [interests, setInterests] = useState<Set<Interest>>(new Set());
  const [sourceLanguage, setSourceLanguage] =
    useState<SourceLanguage>("Any");
  const [summaryLanguage, setSummaryLanguage] =
    useState<SummaryLanguage>("English");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = interests.size > 0 && !loading;

  const toggleInterest = (interest: Interest) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(interest)) next.delete(interest);
      else next.add(interest);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signup/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          interests: Array.from(interests),
          sourceLanguage,
          summaryLanguage,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Couldn't save your preferences.");
      }
      onCompleted();
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
              selected={interests.has(interest)}
              onClick={() => toggleInterest(interest)}
            />
          ))}
        </div>
      </fieldset>

      {/* Languages */}
      <div className="mt-7 space-y-3 animate-rise-delayed-3">
        <LanguageRow
          label="Source language"
          options={SOURCE_LANGUAGES}
          value={sourceLanguage}
          onChange={(v) => setSourceLanguage(v as SourceLanguage)}
          name="source"
        />
        <LanguageRow
          label="Summary language"
          options={SUMMARY_LANGUAGES}
          value={summaryLanguage}
          onChange={(v) => setSummaryLanguage(v as SummaryLanguage)}
          name="summary"
        />
      </div>

      {/* Submit */}
      <div className="mt-8 animate-rise-delayed-4">
        <PrimaryButton
          loading={loading}
          disabled={!canSubmit}
          loadingLabel="Finishing..."
          label="Finish setup"
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
          One email a day. Unsubscribe in one click.
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Internal helpers                                                        */
/* ----------------------------------------------------------------------- */

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
