"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FILM_SPOILER_PREFERENCES } from "@/lib/options";

/**
 * Manual OneFilm catalog entry. Factual metadata is admin-entered (or from a
 * verified provider). The generator writes original commentary on top but never
 * invents cast, awards, ratings, or availability.
 */
export function FilmCatalogForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    year: "",
    director: "",
    filmLanguage: "",
    runtimeMinutes: "",
    sourceUrl: "",
    adminNote: "",
    genres: "",
    moods: "",
    spoilerLevel: "spoiler-light",
  });

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  async function submit() {
    if (!form.title.trim()) {
      setMsg("Title is required.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/film/catalog/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: form.title,
          year: form.year ? Number(form.year) : null,
          director: form.director || null,
          filmLanguage: form.filmLanguage || null,
          runtimeMinutes: form.runtimeMinutes ? Number(form.runtimeMinutes) : null,
          sourceUrl: form.sourceUrl || null,
          adminNote: form.adminNote || null,
          genres: splitList(form.genres),
          moods: splitList(form.moods),
          spoilerLevel: form.spoilerLevel,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      setMsg("Film added to catalog.");
      setForm({ ...form, title: "", year: "", director: "", filmLanguage: "", runtimeMinutes: "", sourceUrl: "", adminNote: "", genres: "", moods: "" });
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
      <input className={input} placeholder="Film title (real)" value={form.title} onChange={(e) => set("title", e.target.value)} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <input className={input} placeholder="Year" inputMode="numeric" value={form.year} onChange={(e) => set("year", e.target.value)} />
        <input className={input} placeholder="Director" value={form.director} onChange={(e) => set("director", e.target.value)} />
        <input className={input} placeholder="Language" value={form.filmLanguage} onChange={(e) => set("filmLanguage", e.target.value)} />
        <input className={input} placeholder="Runtime (min)" inputMode="numeric" value={form.runtimeMinutes} onChange={(e) => set("runtimeMinutes", e.target.value)} />
      </div>
      <input className={input} placeholder="Source URL (optional)" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} />
      <textarea className={`${input} min-h-[64px]`} placeholder="Admin note / framing seed (original, not a copied review)" value={form.adminNote} onChange={(e) => set("adminNote", e.target.value)} />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <input className={input} placeholder="Genres (comma-separated)" value={form.genres} onChange={(e) => set("genres", e.target.value)} />
        <input className={input} placeholder="Moods (comma-separated)" value={form.moods} onChange={(e) => set("moods", e.target.value)} />
        <select className={input} value={form.spoilerLevel} onChange={(e) => set("spoilerLevel", e.target.value)}>
          {FILM_SPOILER_PREFERENCES.map((s) => (
            <option key={s} value={toLevel(s)}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button className={btn} disabled={busy} onClick={submit}>{busy ? "Adding..." : "Add to catalog"}</button>
        {msg && <span className="text-[12.5px] text-ash font-sans">{msg}</span>}
      </div>
    </div>
  );
}

function splitList(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function toLevel(pref: string): string {
  if (pref === "Spoiler-free") return "spoiler-free";
  if (pref === "Full analysis allowed") return "full";
  return "spoiler-light";
}
