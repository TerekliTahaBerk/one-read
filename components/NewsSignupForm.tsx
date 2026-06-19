"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  NEWS_BRIEFING_LANGUAGES,
  NEWS_REGION_FOCUS,
  NEWS_TONES,
  NEWS_DEPTHS,
  NEWS_SOURCE_PREFERENCES,
  NEWS_EXCLUDED_TOPICS,
  isLikelyEmail,
} from "@/lib/options";

type Phase = "email" | "verify" | "preferences" | "payment" | "manage";

interface NewsPrefs {
  briefingLanguage: string;
  regionFocus: string;
  excludedTopics: string[];
  tone: string;
  depth: string;
  sourcePreference: string;
  wantsWorld: boolean;
  wantsBusiness: boolean;
  wantsTechnology: boolean;
  wantsCulture: boolean;
  wantsScience: boolean;
  wantsSports: boolean;
}

const DEFAULT_PREFS: NewsPrefs = {
  briefingLanguage: "English",
  regionFocus: "Global",
  excludedTopics: [],
  tone: "Calm",
  depth: "Short",
  sourcePreference: "Balanced",
  wantsWorld: true,
  wantsBusiness: true,
  wantsTechnology: true,
  wantsCulture: false,
  wantsScience: false,
  wantsSports: false,
};

export function NewsSignupForm({ className = "" }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [prefs, setPrefs] = useState<NewsPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = useMemo(() => isLikelyEmail(email), [email]);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    if (!emailValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news/verification/request", {
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
      const res = await fetch("/api/news/verification/confirm", {
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
      const res = await fetch("/api/news/preferences", {
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
      const res = await fetch("/api/news/subscribe/checkout", {
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

  const sections: [keyof NewsPrefs, string][] = [
    ["wantsWorld", "World"],
    ["wantsBusiness", "Business"],
    ["wantsTechnology", "Technology"],
    ["wantsCulture", "Culture"],
    ["wantsScience", "Science"],
    ["wantsSports", "Sports"],
  ];

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
            Enter the 6-digit code we sent to {email} to continue setting up OneNews.
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
            <Select label="Briefing language" value={prefs.briefingLanguage} options={NEWS_BRIEFING_LANGUAGES} onChange={(v) => setPrefs({ ...prefs, briefingLanguage: v })} className={select} />
            <Select label="Region focus" value={prefs.regionFocus} options={NEWS_REGION_FOCUS} onChange={(v) => setPrefs({ ...prefs, regionFocus: v })} className={select} />
            <Select label="Tone" value={prefs.tone} options={NEWS_TONES} onChange={(v) => setPrefs({ ...prefs, tone: v })} className={select} />
            <Select label="Depth" value={prefs.depth} options={NEWS_DEPTHS} onChange={(v) => setPrefs({ ...prefs, depth: v })} className={select} />
            <Select label="Sources" value={prefs.sourcePreference} options={NEWS_SOURCE_PREFERENCES} onChange={(v) => setPrefs({ ...prefs, sourcePreference: v })} className={`${select} sm:col-span-2`} />
          </div>
          <fieldset>
            <legend className="mb-2 text-[12px] uppercase tracking-[0.14em] text-ash">Sections you want</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sections.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-white/50 px-3 py-2 text-[12.5px] text-ash">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[key])}
                    onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[12px] uppercase tracking-[0.14em] text-ash">Topics to avoid</legend>
            <div className="flex flex-wrap gap-2">
              {NEWS_EXCLUDED_TOPICS.map((item) => {
                const selected = prefs.excludedTopics.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        excludedTopics: selected
                          ? prefs.excludedTopics.filter((x) => x !== item)
                          : [...prefs.excludedTopics, item],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-[12.5px] ${selected ? "border-[var(--theme-accent)] bg-[var(--theme-surface)] text-ink" : "border-[var(--theme-border)] bg-white/60 text-ash"}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <button className={primary} disabled={loading}>
            {loading ? "Saving..." : "Save preferences"}
          </button>
        </form>
      )}

      {phase === "payment" && (
        <div className="text-center">
          <h2 className="font-serif text-[24px] text-ink">You’re almost there.</h2>
          <p className="mt-2 text-[13.5px] leading-6 text-ash">
            Your briefing preferences are saved. Start your 7-day free trial with Polar to receive OneNews every morning.
          </p>
          <button onClick={checkout} className={`${primary} mt-4`} disabled={loading}>
            {loading ? "Opening checkout..." : "Start your 7-day free trial"}
          </button>
        </div>
      )}

      {phase === "manage" && (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-center">
          <h2 className="font-serif text-[24px] text-ink">Your OneNews briefing is active.</h2>
          <p className="mt-2 text-[14px] leading-6 text-ash">
            You’re set to receive a calm morning briefing at 7 AM.
          </p>
          <Link href={`/news/subscribe?email=${encodeURIComponent(email)}`} className={`${primary} mt-4 inline-flex items-center justify-center`}>
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
