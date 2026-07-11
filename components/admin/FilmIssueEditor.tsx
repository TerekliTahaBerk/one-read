"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FilmIssueContent } from "@/lib/film/types";

const FIELDS: Array<[keyof FilmIssueContent, string]> = [
  ["greeting", "Greeting"], ["openingLine", "Opening line"], ["whyThisFilm", "Why this film"],
  ["whatItFeelsLike", "What it feels like"], ["bestWatchedWhen", "Best watched when"],
  ["beforeYouPressPlay", "Before you press play"], ["spoilerNote", "Spoiler note"],
];

export function FilmIssueEditor({ issueId, initialSubject, initialPreviewText, initialContent }: {
  issueId: string; initialSubject: string; initialPreviewText: string; initialContent: FilmIssueContent;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [previewText, setPreviewText] = useState(initialPreviewText);
  const [content, setContent] = useState(initialContent);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function save() {
    setState("saving");
    try {
      const response = await fetch("/api/admin/film/issues/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "edit-content", issueId, subject, previewText, content }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) throw new Error(json.error ?? "save_failed");
      setState("saved"); router.refresh();
    } catch { setState("error"); }
  }
  const input = "w-full rounded-lg border border-admin-line bg-white px-3 py-2 text-[13px] text-admin-ink";
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Subject<input className={`${input} mt-1 normal-case tracking-normal`} value={subject} maxLength={120} onChange={(e) => { setSubject(e.target.value); setState("idle"); }} /></label>
      <label className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Inbox preview<input className={`${input} mt-1 normal-case tracking-normal`} value={previewText} maxLength={180} onChange={(e) => { setPreviewText(e.target.value); setState("idle"); }} /></label>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      {FIELDS.map(([key, label]) => <label key={key} className="text-[11px] uppercase tracking-eyebrow text-admin-muted">{label}<textarea className={`${input} mt-1 min-h-24 normal-case tracking-normal`} value={String(content[key] ?? "")} maxLength={1800} onChange={(e) => { setContent({ ...content, [key]: e.target.value }); setState("idle"); }} /></label>)}
    </div>
    <div className="flex items-center gap-3">
      <button type="button" onClick={save} disabled={state === "saving" || !subject.trim()} className="rounded-lg bg-admin-accent px-4 py-2 text-[12.5px] text-white disabled:opacity-50">{state === "saving" ? "Saving…" : "Save and return to review"}</button>
      <span role="status" aria-live="polite" className={`text-[12px] ${state === "error" ? "text-dawn" : "text-admin-muted"}`}>{state === "saved" ? "Saved. Approval reset to pending." : state === "error" ? "Could not save; check required content." : ""}</span>
    </div>
  </div>;
}
