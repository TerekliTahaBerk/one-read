"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  FILM_EMAIL_LANGUAGES,
  FILM_GENRES,
  FILM_MOODS,
  FILM_DECADES,
  FILM_LANGUAGES,
  FILM_PLATFORMS,
  FILM_SPOILER_PREFERENCES,
  FILM_FAMILIARITIES,
  FILM_RUNTIME_PREFERENCES,
  isLikelyEmail,
} from "@/lib/options";

type Phase = "email" | "verify" | "preferences" | "payment" | "manage";

interface FilmPrefs {
  emailLanguage: string;
  preferredGenres: string[];
  moods: string[];
  decades: string[];
  languages: string[];
  platforms: string[];
  spoilerPreference: string;
  familiarity: string;
  runtimePreference: string;
}

const DEFAULT_PREFS: FilmPrefs = {
  emailLanguage: "English",
  preferredGenres: ["Drama"],
  moods: ["Thoughtful"],
  decades: [],
  languages: [],
  platforms: [],
  spoilerPreference: "Spoiler-light",
  familiarity: "Mixed",
  runtimePreference: "Any",
};

export function FilmSignupForm({ className = "" }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [prefs, setPrefs] = useState<FilmPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = useMemo(() => isLikelyEmail(email), [email]);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    if (!emailValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/film/verification/request", {
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
      const res = await fetch("/api/film/verification/confirm", {
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
      const res = await fetch("/api/film/preferences", {
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
      const res = await fetch("/api/film/subscribe/checkout", {
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

  const toggle = (key: keyof FilmPrefs, item: string) => {
    const list = prefs[key] as string[];
    const selected = list.includes(item);
    setPrefs({
      ...prefs,
      [key]: selected ? list.filter((x) => x !== item) : [...list, item],
    });
  };

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
          <p className="mb-3 text-center text-[13px] leading-6 text-ash">
            Enter the 6-digit code we sent to {email} to continue setting up OneFilm.
          </p>
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
            <Select label="Email language" value={prefs.emailLanguage} options={FILM_EMAIL_LANGUAGES} onChange={(v) => setPrefs({ ...prefs, emailLanguage: v })} className={select} />
            <Select label="Spoilers" value={prefs.spoilerPreference} options={FILM_SPOILER_PREFERENCES} onChange={(v) => setPrefs({ ...prefs, spoilerPreference: v })} className={select} />
            <Select label="Familiarity" value={prefs.familiarity} options={FILM_FAMILIARITIES} onChange={(v) => setPrefs({ ...prefs, familiarity: v })} className={select} />
            <Select label="Runtime" value={prefs.runtimePreference} options={FILM_RUNTIME_PREFERENCES} onChange={(v) => setPrefs({ ...prefs, runtimePreference: v })} className={select} />
          </div>
          <ChipGroup label="Genres" options={FILM_GENRES} selected={prefs.preferredGenres} onToggle={(i) => toggle("preferredGenres", i)} />
          <ChipGroup label="Moods" options={FILM_MOODS} selected={prefs.moods} onToggle={(i) => toggle("moods", i)} />
          <ChipGroup label="Decades" options={FILM_DECADES} selected={prefs.decades} onToggle={(i) => toggle("decades", i)} />
          <ChipGroup label="Languages" options={FILM_LANGUAGES} selected={prefs.languages} onToggle={(i) => toggle("languages", i)} />
          <ChipGroup label="Platforms" options={FILM_PLATFORMS} selected={prefs.platforms} onToggle={(i) => toggle("platforms", i)} />
          <button className={primary} disabled={prefs.preferredGenres.length === 0 || loading}>
            {loading ? "Saving..." : "Save preferences"}
          </button>
        </form>
      )}

      {phase === "payment" && (
        <div className="text-center">
          <h2 className="font-serif text-[24px] text-ink">You’re almost there.</h2>
          <p className="mt-2 text-[13.5px] leading-6 text-ash">
            Your film preferences are saved. Start your 7-day free trial with Polar to receive OneFilm in your inbox.
          </p>
          <button onClick={checkout} className={`${primary} mt-4`} disabled={loading}>
            {loading ? "Opening checkout..." : "Start your 7-day free trial"}
          </button>
        </div>
      )}

      {phase === "manage" && (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-center">
          <h2 className="font-serif text-[24px] text-ink">Your OneFilm is active.</h2>
          <p className="mt-2 text-[14px] leading-6 text-ash">
            You’re set to receive one thoughtful film note in your inbox.
          </p>
          <Link href={`/film/subscribe?email=${encodeURIComponent(email)}`} className={`${primary} mt-4 inline-flex items-center justify-center`}>
            Manage subscription
          </Link>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-center text-[12.5px] text-dawn">{error}</p>}
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[12px] uppercase tracking-[0.14em] text-ash">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((item) => {
          const isSel = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] ${isSel ? "border-[var(--theme-accent)] bg-[var(--theme-surface)] text-ink" : "border-[var(--theme-border)] bg-white/60 text-ash"}`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </fieldset>
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
