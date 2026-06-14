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

type Props = {
  onSubmitted: (payload: {
    email: string;
    interests: Interest[];
    sourceLanguage: SourceLanguage;
    summaryLanguage: SummaryLanguage;
  }) => void;
  className?: string;
};

export function SignupForm({ onSubmitted, className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<Set<Interest>>(new Set());
  const [sourceLanguage, setSourceLanguage] =
    useState<SourceLanguage>("Any");
  const [summaryLanguage, setSummaryLanguage] =
    useState<SummaryLanguage>("English");
  const [submitting, setSubmitting] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);

  const emailValid = useMemo(() => isLikelyEmail(email), [email]);
  const canSubmit = emailValid && interests.size > 0 && !submitting;

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
    setSubmitting(true);
    // Simulated request — wire to API/Supabase later.
    await new Promise((r) => setTimeout(r, 650));
    setSubmitting(false);
    onSubmitted({
      email: email.trim(),
      interests: Array.from(interests),
      sourceLanguage,
      summaryLanguage,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`w-full ${className}`}
      aria-label="Sign up to receive One Read"
    >
      {/* Email */}
      <div className="animate-rise-delayed-2">
        <label
          htmlFor="email"
          className="sr-only"
        >
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
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouchedEmail(true)}
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
          aria-invalid={touchedEmail && email.length > 0 && !emailValid}
        />
        {touchedEmail && email.length > 0 && !emailValid && (
          <p className="mt-2 text-xs text-dawn font-sans pl-1 animate-fade-in">
            Please enter a valid email address.
          </p>
        )}
      </div>

      {/* Interests */}
      <fieldset className="mt-7 animate-rise-delayed-3">
        <legend className="block text-[11px] font-sans uppercase tracking-eyebrow text-fog mb-3">
          What you’d like to read about
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
      <div className="mt-7 space-y-3 animate-rise-delayed-4">
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
        <button
          type="submit"
          disabled={!canSubmit}
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
              submitting ? "opacity-0" : "opacity-100"
            }`}
          >
            Get my morning read
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
          {submitting && (
            <span
              aria-live="polite"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="h-4 w-4 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />
            </span>
          )}
        </button>
        <p className="mt-3 text-center text-[12px] text-fog font-sans">
          One email a day. Unsubscribe in one click.
        </p>
      </div>
    </form>
  );
}

/* --- Internal helpers ------------------------------------------------- */

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
