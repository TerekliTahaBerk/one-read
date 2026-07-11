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
    const year = form.year ? Number(form.year) : null;
    const runtimeMinutes = form.runtimeMinutes ? Number(form.runtimeMinutes) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1888 || year > new Date().getFullYear() + 2)) { setMsg("Enter a valid release year."); return; }
    if (runtimeMinutes !== null && (!Number.isInteger(runtimeMinutes) || runtimeMinutes < 1 || runtimeMinutes > 600)) { setMsg("Runtime must be between 1 and 600 minutes."); return; }
    if (form.sourceUrl && !/^https?:\/\//i.test(form.sourceUrl)) { setMsg("Source URL must start with http:// or https://."); return; }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/film/catalog/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: form.title,
          year,
          director: form.director || null,
          filmLanguage: form.filmLanguage || null,
          runtimeMinutes,
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

  const input = "w-full rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-[13px] text-admin-ink";
  const btn = "rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-[12.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Film title *<input aria-label="Film title" className={`${input} mt-1 normal-case tracking-normal`} placeholder="e.g. Aftersun" value={form.title} onChange={(e) => set("title", e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <label className="text-[11px] text-admin-muted">Year<input aria-label="Release year" type="number" min="1888" max={new Date().getFullYear() + 2} className={`${input} mt-1`} value={form.year} onChange={(e) => set("year", e.target.value)} /></label>
        <label className="text-[11px] text-admin-muted">Director<input aria-label="Director" className={`${input} mt-1`} value={form.director} onChange={(e) => set("director", e.target.value)} /></label>
        <label className="text-[11px] text-admin-muted">Original language<input aria-label="Original language" className={`${input} mt-1`} value={form.filmLanguage} onChange={(e) => set("filmLanguage", e.target.value)} /></label>
        <label className="text-[11px] text-admin-muted">Runtime (minutes)<input aria-label="Runtime in minutes" type="number" min="1" max="600" className={`${input} mt-1`} value={form.runtimeMinutes} onChange={(e) => set("runtimeMinutes", e.target.value)} /></label>
      </div>
      <label className="text-[11px] text-admin-muted">Verification source URL <span className="normal-case">(recommended)</span><input aria-label="Verification source URL" type="url" className={`${input} mt-1`} placeholder="https://www.imdb.com/title/..." value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} /></label>
      <label className="text-[11px] text-admin-muted">Editorial framing seed<textarea aria-label="Editorial framing seed" className={`${input} mt-1 min-h-[80px]`} placeholder="Original note about why this film is worth choosing; do not paste a review." value={form.adminNote} onChange={(e) => set("adminNote", e.target.value)} /></label>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <input aria-label="Genres" className={input} placeholder="Genres (comma-separated)" value={form.genres} onChange={(e) => set("genres", e.target.value)} />
        <input aria-label="Moods" className={input} placeholder="Moods (comma-separated)" value={form.moods} onChange={(e) => set("moods", e.target.value)} />
        <select aria-label="Spoiler level" className={input} value={form.spoilerLevel} onChange={(e) => set("spoilerLevel", e.target.value)}>
          {FILM_SPOILER_PREFERENCES.map((s) => (
            <option key={s} value={toLevel(s)}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button className={btn} disabled={busy} onClick={submit}>{busy ? "Adding..." : "Add to catalog"}</button>
        {msg && <span role="status" aria-live="polite" className="text-[12.5px] text-admin-body font-sans">{msg}</span>}
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
