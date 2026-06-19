"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  NEWS_TOPICS,
  NEWS_REGION_FOCUS,
  NEWS_BRIEFING_LANGUAGES,
} from "@/lib/options";

/**
 * Manual OneNews source-story entry. The admin enters REAL headlines + source
 * URLs only. OneNews never invents news — this is the safest launch source.
 */
export function NewsSourceForm({ defaultDateIso }: { defaultDateIso: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    headline: "",
    sourceName: "",
    sourceUrl: "",
    excerpt: "",
    topic: NEWS_TOPICS[0] as string,
    region: NEWS_REGION_FOCUS[0] as string,
    language: NEWS_BRIEFING_LANGUAGES[0] as string,
    storyDate: defaultDateIso,
  });

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  async function submit() {
    if (!form.headline.trim() || !form.sourceName.trim() || !form.sourceUrl.trim()) {
      setMsg("Headline, source name, and source URL are required.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/news/sources/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      setMsg("Source story added.");
      setForm({ ...form, headline: "", sourceName: "", sourceUrl: "", excerpt: "" });
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink";
  const btn = "rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2.5">
      <input className={input} placeholder="Headline (real)" value={form.headline} onChange={(e) => set("headline", e.target.value)} />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input className={input} placeholder="Source name (e.g. Reuters)" value={form.sourceName} onChange={(e) => set("sourceName", e.target.value)} />
        <input className={input} placeholder="https://source-url" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} />
      </div>
      <textarea className={`${input} min-h-[64px]`} placeholder="Short excerpt or admin note (no full articles)" value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <select className={input} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
          {NEWS_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={input} value={form.region} onChange={(e) => set("region", e.target.value)}>
          {NEWS_REGION_FOCUS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className={input} value={form.language} onChange={(e) => set("language", e.target.value)}>
          {NEWS_BRIEFING_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <input className={input} type="date" value={form.storyDate} onChange={(e) => set("storyDate", e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <button className={btn} disabled={busy} onClick={submit}>{busy ? "Adding..." : "Add source story"}</button>
        {msg && <span className="text-[12.5px] text-ash font-sans">{msg}</span>}
      </div>
    </div>
  );
}
