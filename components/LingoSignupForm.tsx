"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  LINGO_GOALS,
  LINGO_INTERESTS,
  LINGO_LEVELS,
  LINGO_NATIVE_LANGUAGES,
  LINGO_PRACTICE_STYLES,
  LINGO_TARGET_LANGUAGES,
  isLikelyEmail,
} from "@/lib/options";

type Phase = "email" | "verify" | "preferences" | "payment" | "manage";

interface LingoPreferences {
  targetLanguage: string;
  nativeLanguage: string;
  level: string;
  learningGoal: string;
  practiceStyle: string;
  interests: string[];
  minutesPerDay: number;
  wantsVocabulary: boolean;
  wantsPhrases: boolean;
  wantsGrammar: boolean;
  wantsMiniQuiz: boolean;
  wantsCultureNote: boolean;
}

const DEFAULT_PREFS: LingoPreferences = {
  targetLanguage: "Spanish",
  nativeLanguage: "English",
  level: "Beginner",
  learningGoal: "Conversation",
  practiceStyle: "Mixed",
  interests: ["Daily life"],
  minutesPerDay: 5,
  wantsVocabulary: true,
  wantsPhrases: true,
  wantsGrammar: true,
  wantsMiniQuiz: true,
  wantsCultureNote: false,
};

export function LingoSignupForm({ className = "" }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [prefs, setPrefs] = useState<LingoPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = useMemo(() => isLikelyEmail(email), [email]);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    if (!emailValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lingo/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not send a code.");
      setPhase("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lingo/verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "That code did not work.");
      if (data.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
      setPhase(data.subscribed ? "manage" : "preferences");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code did not work.");
    } finally {
      setLoading(false);
    }
  }

  async function savePrefs(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lingo/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...prefs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not save preferences.");
      setPhase("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lingo/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not start checkout.");
      if (data.action === "redirect" || data.action === "already_active") {
        window.location.href = data.url;
      } else if (data.action === "needs_setup_first") {
        setPhase("email");
      } else if (data.action === "needs_setup") {
        setPhase("preferences");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "focus-ring block w-full h-12 rounded-xl border border-[var(--theme-border)] bg-white/75 px-4 text-[16px] text-ink placeholder:text-fog focus:border-[var(--theme-accent)]";
  const select = `${input} appearance-none`;
  const primary =
    "focus-ring h-12 w-full rounded-xl bg-[var(--theme-accent)] px-5 text-[14.5px] font-medium text-white disabled:opacity-40";

  return (
    <div className={`w-full ${className}`}>
      {phase === "email" && (
        <form onSubmit={requestCode}>
          <input
            className={input}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className={`${primary} mt-4`} disabled={!emailValid || loading}>
            {loading ? "Sending code..." : "Send verification code"}
          </button>
          <p className="mt-3 text-center text-[12px] leading-5 text-fog">
            By continuing, you agree to the <Link className="link-underline" href="/terms">Terms</Link> and acknowledge the <Link className="link-underline" href="/privacy">Privacy Policy</Link>.
          </p>
        </form>
      )}

      {phase === "verify" && (
        <form onSubmit={verifyCode}>
          <input
            className={`${input} text-center tracking-[0.35em]`}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <button className={`${primary} mt-4`} disabled={code.length !== 6 || loading}>
            {loading ? "Checking..." : "Continue"}
          </button>
          <button type="button" onClick={() => setPhase("email")} className="mt-3 w-full text-[12px] text-ash">
            Use a different email
          </button>
        </form>
      )}

      {phase === "preferences" && (
        <form onSubmit={savePrefs} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Learn" value={prefs.targetLanguage} options={LINGO_TARGET_LANGUAGES} onChange={(v) => setPrefs({ ...prefs, targetLanguage: v })} className={select} />
            <Select label="Explain in" value={prefs.nativeLanguage} options={LINGO_NATIVE_LANGUAGES} onChange={(v) => setPrefs({ ...prefs, nativeLanguage: v })} className={select} />
            <Select label="Level" value={prefs.level} options={LINGO_LEVELS} onChange={(v) => setPrefs({ ...prefs, level: v })} className={select} />
            <Select label="Goal" value={prefs.learningGoal} options={LINGO_GOALS} onChange={(v) => setPrefs({ ...prefs, learningGoal: v })} className={select} />
            <Select label="Style" value={prefs.practiceStyle} options={LINGO_PRACTICE_STYLES} onChange={(v) => setPrefs({ ...prefs, practiceStyle: v })} className={`${select} sm:col-span-2`} />
          </div>
          <fieldset>
            <legend className="mb-2 text-[12px] uppercase tracking-[0.14em] text-ash">Interests</legend>
            <div className="flex flex-wrap gap-2">
              {LINGO_INTERESTS.map((item) => {
                const selected = prefs.interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        interests: selected
                          ? prefs.interests.filter((x) => x !== item)
                          : [...prefs.interests, item],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-[12.5px] ${selected ? "border-[var(--theme-accent)] bg-[var(--theme-selected-surface)] text-ink" : "border-[var(--theme-border)] bg-white/60 text-ash"}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["wantsVocabulary", "Vocabulary"],
              ["wantsPhrases", "Phrases"],
              ["wantsGrammar", "Grammar"],
              ["wantsMiniQuiz", "Mini quiz"],
              ["wantsCultureNote", "Culture"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-white/50 px-3 py-2 text-[12px] text-ash">
                <input
                  type="checkbox"
                  checked={Boolean(prefs[key as keyof LingoPreferences])}
                  onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <button className={primary} disabled={prefs.interests.length === 0 || loading}>
            {loading ? "Saving..." : "Save preferences"}
          </button>
        </form>
      )}

      {phase === "payment" && (
        <div className="text-center">
          <button onClick={checkout} className={primary} disabled={loading}>
            {loading ? "Opening checkout..." : "Start free trial"}
          </button>
          <p className="mt-3 text-[12.5px] leading-5 text-ash">
            You're almost there. Checkout starts your trial; preferences alone do not grant access.
          </p>
        </div>
      )}

      {phase === "manage" && (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-center">
          <h2 className="font-serif text-[24px] text-ink">Your OneLingo is active.</h2>
          <p className="mt-2 text-[14px] leading-6 text-ash">
            You can manage billing from the subscribe page.
          </p>
          <Link href={`/lingo/subscribe?email=${encodeURIComponent(email)}`} className={`${primary} mt-4 inline-flex items-center justify-center`}>
            Manage subscription
          </Link>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-center text-[12.5px] text-dawn">{error}</p>}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-ash">{label}</span>
      <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}
