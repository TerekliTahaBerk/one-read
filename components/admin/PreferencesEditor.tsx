"use client";

import { TOPIC_CATALOG } from "@/lib/topics";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PreferencesEditor({
  subId,
  summaryLanguages,
  current,
}: {
  subId: string;
  summaryLanguages: readonly string[];
  current: { summaryLanguage: string | null; topics?: string[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState(current.summaryLanguage ?? summaryLanguages[0]);
  const [topics, setTopics] = useState(current.topics ?? []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    const response = await fetch("/api/admin/users/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "update-preferences", subId, topics, summaryLanguage: language }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !data.ok) {
      setMessage(`Error: ${data.error ?? "failed"}`);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={button}>Edit topics & language</button>;
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <fieldset className="flex w-full flex-wrap gap-3"><legend>Topics (1–5; first selection is primary)</legend>{TOPIC_CATALOG.map((topic) => <label key={topic.slug}><input type="checkbox" checked={topics.includes(topic.slug)} disabled={!topics.includes(topic.slug) && topics.length >= 5} onChange={(e) => setTopics(e.target.checked ? [...topics, topic.slug] : topics.filter((slug) => slug !== topic.slug))} /> {topic.label}</label>)}</fieldset>
      <label><span className="mb-1 block text-[11px] uppercase tracking-eyebrow text-admin-muted">Reading language</span><select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-[13px] text-admin-ink">{summaryLanguages.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" onClick={save} disabled={busy} className={button}>{busy ? "Saving…" : "Save"}</button>
      <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[12.5px] text-admin-muted">Cancel</button>
      {message && <span className="text-[12px] text-rose-700">{message}</span>}
    </div>
  );
}

const button = "rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-[12.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40";
