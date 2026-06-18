"use client";

import { useState, type FormEvent } from "react";

const TOPIC_SLUGS = [
  "artificial-intelligence",
  "startups",
  "business",
  "technology",
  "software-engineering",
  "science",
  "psychology",
  "health",
  "finance",
  "economics",
  "design",
  "productivity",
  "education",
  "culture",
  "history",
  "philosophy",
  "climate",
  "future-of-work",
  "marketing",
  "media",
  "creativity",
  "personal-growth",
];

type Result =
  | { kind: "ok"; deduped: boolean; articleId: string; note?: string }
  | { kind: "error"; message: string };

/**
 * Admin-only manual article entry. Auth is handled by the httpOnly admin
 * session cookie. Lets us test editorial quality before real RSS/LLM providers
 * are configured.
 */
export function ManualArticleForm() {
  const [form, setForm] = useState({
    title: "",
    url: "",
    sourceName: "",
    sourceLanguage: "English",
    topic: "artificial-intelligence",
    subtopics: "",
    excerpt: "",
    cleanedText: "",
    publishedAt: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/manual-article", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !data.ok) {
        setResult({
          kind: "error",
          message: (data.error as string) ?? `Request failed (${res.status}).`,
        });
      } else {
        setResult({
          kind: "ok",
          deduped: !!data.deduped,
          articleId: data.articleId as string,
          note: data.note as string | undefined,
        });
        if (!data.deduped) {
          setForm((f) => ({ ...f, title: "", url: "", excerpt: "", cleanedText: "" }));
        }
      }
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <Field label="Title *">
        <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </Field>
      <Field label="URL *">
        <input className={inputCls} value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" required />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Source name">
          <input className={inputCls} value={form.sourceName} onChange={(e) => set("sourceName", e.target.value)} placeholder="Manual" />
        </Field>
        <Field label="Source language">
          <select className={inputCls} value={form.sourceLanguage} onChange={(e) => set("sourceLanguage", e.target.value)}>
            <option>English</option>
            <option>Turkish</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Topic *">
          <select className={inputCls} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
            {TOPIC_SLUGS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Subtopics (comma-separated)">
          <input className={inputCls} value={form.subtopics} onChange={(e) => set("subtopics", e.target.value)} placeholder="llms, ai-research" />
        </Field>
      </div>

      <Field label="Excerpt">
        <textarea className={`${inputCls} h-20`} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
      </Field>
      <Field label="Article body / cleaned text (≥ 600 chars to score)">
        <textarea className={`${inputCls} h-48`} value={form.cleanedText} onChange={(e) => set("cleanedText", e.target.value)} />
      </Field>
      <Field label="Published at (optional, ISO date)">
        <input className={inputCls} value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} placeholder="2026-06-14" />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="h-11 px-5 rounded-xl bg-ink text-paper font-sans text-[14px] disabled:opacity-40"
      >
        {loading ? "Saving…" : "Save article"}
      </button>

      {result?.kind === "ok" && (
        <p className="text-[13px] text-ink font-sans">
          {result.deduped
            ? "Already existed (deduped by URL) — "
            : "Saved as PENDING — "}
          <span className="font-mono text-[11.5px] text-ash">{result.articleId}</span>
          {result.note ? <span className="block text-fog mt-1">{result.note}</span> : null}
        </p>
      )}
      {result?.kind === "error" && (
        <p className="text-[13px] text-dawn font-sans">Error: {result.message}</p>
      )}
    </form>
  );
}

const inputCls =
  "block w-full rounded-lg bg-paper/80 border border-line px-3 py-2 text-[14px] text-ink focus:border-ink focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-eyebrow text-fog font-sans mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
