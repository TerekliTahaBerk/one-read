"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

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

export function ManualOneArticleIssueForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    topic: "artificial-intelligence",
    sourceLanguage: "English",
    summaryLanguage: "English",
    title: "",
    sourceName: "Manual",
    subject: "",
    previewText: "",
    bodyText: "",
    adminNotes: "",
    acknowledgeNoSource: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/one-article/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create-manual-issue", ...form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      setMsg(`Manual issue created: ${json.result?.pickId ?? ""}`);
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Issue date">
          <input type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Topic">
          <select className={inputCls} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
            {TOPIC_SLUGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Source language">
          <select className={inputCls} value={form.sourceLanguage} onChange={(e) => set("sourceLanguage", e.target.value)}>
            <option>English</option>
            <option>Turkish</option>
          </select>
        </Field>
        <Field label="Summary language">
          <select className={inputCls} value={form.summaryLanguage} onChange={(e) => set("summaryLanguage", e.target.value)}>
            <option>English</option>
            <option>Turkish</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
          </select>
        </Field>
      </div>
      <Field label="Email title">
        <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </Field>
      <Field label="Subject">
        <input className={inputCls} value={form.subject} onChange={(e) => set("subject", e.target.value)} required />
      </Field>
      <Field label="Preview text">
        <input className={inputCls} value={form.previewText} onChange={(e) => set("previewText", e.target.value)} />
      </Field>
      <Field label="Body text">
        <textarea className={`${inputCls} h-56`} value={form.bodyText} onChange={(e) => set("bodyText", e.target.value)} required />
      </Field>
      <Field label="Admin notes">
        <textarea className={`${inputCls} h-20`} value={form.adminNotes} onChange={(e) => set("adminNotes", e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-[12.5px] text-ash font-sans">
        <input
          type="checkbox"
          checked={form.acknowledgeNoSource}
          onChange={(e) => set("acknowledgeNoSource", e.target.checked)}
        />
        Manual issue without source article
      </label>
      <button
        type="submit"
        disabled={busy || !form.acknowledgeNoSource}
        className="h-10 px-4 rounded-lg bg-ink text-paper font-sans text-[13px] disabled:opacity-40"
      >
        {busy ? "Creating..." : "Create manual issue"}
      </button>
      {msg && <p className="text-[12.5px] text-ash font-sans">{msg}</p>}
    </form>
  );
}

const inputCls =
  "block w-full rounded-lg bg-paper/80 border border-line px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-eyebrow text-fog font-sans mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
