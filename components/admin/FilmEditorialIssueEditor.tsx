"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FILM_EMAIL_LANGUAGES } from "@/lib/options";
import { renderFilmEditorialEmail } from "@/lib/film/editorial-email";
import { filmEditorialReadinessChecks, filmEditorialWordCount } from "@/lib/film/editorial-validation";

export type FilmEditorIssue = {
  id: string; version: number; status: string; emailLanguage: string; subject: string;
  previewText: string | null; filmTitle: string; bodyText: string; heroImageUrl: string | null;
  heroImageAlt: string | null; heroImageCredit: string | null; filmYear: number | null;
  director: string | null; filmLanguage: string | null; runtimeMinutes: number | null;
  sourceName: string | null; sourceUrl: string | null; ctaLabel: string | null;
  adminNotes: string | null; scheduledFor: string | null;
};
type Form = {
  emailLanguage: string; subject: string; previewText: string; filmTitle: string; bodyText: string;
  heroImageUrl: string; heroImageAlt: string; heroImageCredit: string; filmYear: string;
  director: string; filmLanguage: string; runtimeMinutes: string; sourceName: string;
  sourceUrl: string; ctaLabel: string; adminNotes: string;
};
type ApiResult = { ok?: boolean; error?: string; issue?: FilmEditorIssue };

const empty: Form = {
  emailLanguage: "English", subject: "", previewText: "", filmTitle: "", bodyText: "",
  heroImageUrl: "", heroImageAlt: "", heroImageCredit: "", filmYear: "", director: "",
  filmLanguage: "", runtimeMinutes: "", sourceName: "", sourceUrl: "", ctaLabel: "", adminNotes: "",
};

export function FilmEditorialIssueEditor({
  issue, audienceByLanguage = {},
}: { issue?: FilmEditorIssue; audienceByLanguage?: Record<string, number> }) {
  const router = useRouter();
  const initial = useMemo<Form>(() => issue ? {
    emailLanguage: issue.emailLanguage, subject: issue.subject, previewText: issue.previewText ?? "",
    filmTitle: issue.filmTitle, bodyText: issue.bodyText, heroImageUrl: issue.heroImageUrl ?? "",
    heroImageAlt: issue.heroImageAlt ?? "", heroImageCredit: issue.heroImageCredit ?? "",
    filmYear: issue.filmYear?.toString() ?? "", director: issue.director ?? "",
    filmLanguage: issue.filmLanguage ?? "", runtimeMinutes: issue.runtimeMinutes?.toString() ?? "",
    sourceName: issue.sourceName ?? "", sourceUrl: issue.sourceUrl ?? "", ctaLabel: issue.ctaLabel ?? "",
    adminNotes: issue.adminNotes ?? "",
  } : empty, [issue]);
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const version = useRef(issue?.version ?? 1);
  const [schedule, setSchedule] = useState(issue?.scheduledFor ? toLocalDateTime(issue.scheduledFor) : "");
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable = !issue || ["DRAFT", "READY"].includes(issue.status);
  const dirty = JSON.stringify(form) !== saved;
  const normalized = {
    ...form,
    filmYear: form.filmYear ? Number(form.filmYear) : null,
    runtimeMinutes: form.runtimeMinutes ? Number(form.runtimeMinutes) : null,
  };
  const checks = filmEditorialReadinessChecks(normalized);
  const ready = checks.every((check) => check.passed);
  const words = filmEditorialWordCount(form.bodyText);
  const previewHtml = useMemo(() => renderFilmEditorialEmail({
    emailLanguage: form.emailLanguage, subject: form.subject || "OneFilm preview",
    previewText: form.previewText, filmTitle: form.filmTitle || "Your film title will appear here",
    bodyText: form.bodyText || "Start writing the film note. The exact email layout will appear here as you type.",
    bodyHtml: null, heroImageUrl: form.heroImageUrl, heroImageAlt: form.heroImageAlt,
    heroImageCredit: form.heroImageCredit, filmYear: form.filmYear ? Number(form.filmYear) : null,
    director: form.director, filmLanguage: form.filmLanguage,
    runtimeMinutes: form.runtimeMinutes ? Number(form.runtimeMinutes) : null,
    sourceName: form.sourceName, sourceUrl: form.sourceUrl, ctaLabel: form.ctaLabel,
    scheduledFor: schedule ? new Date(istanbulDateTimeToIso(schedule)) : new Date(),
  }, { unsubscribe: "#" }).html, [form, schedule]);

  function set(key: keyof Form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }
  async function request(action: string, extra: Record<string, unknown> = {}): Promise<ApiResult | null> {
    setBusy(true); setMessage(null);
    const response = await fetch("/api/admin/film/editorial", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, issueId: issue?.id, version: version.current, ...form, ...extra }),
    });
    const data = await response.json().catch(() => ({})) as ApiResult;
    setBusy(false);
    if (!response.ok || !data.ok) { setMessage(humanError(data.error ?? "request_failed")); return null; }
    if (data.issue?.version) version.current = data.issue.version;
    return data;
  }
  async function persist(): Promise<ApiResult | null> {
    const data = await request(issue ? "update" : "create");
    if (data) setSaved(JSON.stringify(form));
    return data;
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const data = await persist();
    if (!data) return;
    if (!issue && data.issue) router.push(`/admin/one-film/issues/${data.issue.id}`);
    else { setMessage("All changes saved."); router.refresh(); }
  }
  async function action(name: string, extra: Record<string, unknown> = {}) {
    if (name === "schedule" && !window.confirm(`Schedule this ${form.emailLanguage} OneFilm edition for ${schedule} (Europe/Istanbul)?`)) return;
    if (name === "cancel" && !window.confirm("Cancel this edition?")) return;
    if (name === "retry" && !window.confirm("Retry unresolved deliveries now?")) return;
    if (issue && editable && ["ready", "schedule", "test", "duplicate"].includes(name) && dirty) {
      if (!await persist()) return;
    }
    const data = await request(name, extra);
    if (!data) return;
    if (name === "duplicate" && data.issue) { router.push(`/admin/one-film/issues/${data.issue.id}`); return; }
    setMessage(name === "test" ? "Test email sent." : name === "schedule" ? "Edition scheduled." : "Edition updated.");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.82fr)]">
      <form onSubmit={save} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-admin-line bg-admin-sink/60 px-4 py-3">
          <div><div className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Manual OneFilm workspace</div><div className="mt-1 text-[12.5px] text-admin-body">{words} words · about {Math.max(1, Math.ceil(words / 220))} min read · {audienceByLanguage[form.emailLanguage] ?? 0} eligible viewers</div></div>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] ${dirty ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{dirty ? "Unsaved changes" : issue ? "All changes saved" : "Not created yet"}</span>
        </div>
        <EditorSection step="1" title="Delivery" description="Choose the language and inbox copy.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email language"><select className={input} value={form.emailLanguage} onChange={(e) => set("emailLanguage", e.target.value)} disabled={!editable}>{FILM_EMAIL_LANGUAGES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Email subject" help={`${form.subject.length}/160`}><input className={input} value={form.subject} maxLength={160} onChange={(e) => set("subject", e.target.value)} disabled={!editable} /></Field>
          </div>
          <Field label="Preview text" help={`${form.previewText.length}/240`}><input className={input} value={form.previewText} maxLength={240} onChange={(e) => set("previewText", e.target.value)} disabled={!editable} /></Field>
        </EditorSection>
        <EditorSection step="2" title="Film note" description="Write one complete, spoiler-controlled editorial note.">
          <Field label="Film title"><input className={`${input} text-[15px] font-medium`} value={form.filmTitle} onChange={(e) => set("filmTitle", e.target.value)} disabled={!editable} /></Field>
          <Field label="Body" help="Minimum 120 words. Separate paragraphs with a blank line."><textarea className={`${input} min-h-[380px] resize-y font-serif text-[15px] leading-7`} value={form.bodyText} onChange={(e) => set("bodyText", e.target.value)} disabled={!editable} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cover image URL"><input type="url" className={input} value={form.heroImageUrl} onChange={(e) => set("heroImageUrl", e.target.value)} disabled={!editable} placeholder="https://…" /></Field>
            <Field label="Image credit"><input className={input} value={form.heroImageCredit} onChange={(e) => set("heroImageCredit", e.target.value)} disabled={!editable} /></Field>
          </div>
          <Field label="Image alternative text" help={`${form.heroImageAlt.length}/240`}><input className={input} maxLength={240} value={form.heroImageAlt} onChange={(e) => set("heroImageAlt", e.target.value)} disabled={!editable} /></Field>
        </EditorSection>
        <EditorSection step="3" title="Grounded film facts" description="Only include facts you can verify.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Director"><input className={input} value={form.director} onChange={(e) => set("director", e.target.value)} disabled={!editable} /></Field>
            <Field label="Release year"><input type="number" min="1888" max="2100" className={input} value={form.filmYear} onChange={(e) => set("filmYear", e.target.value)} disabled={!editable} /></Field>
            <Field label="Original language"><input className={input} value={form.filmLanguage} onChange={(e) => set("filmLanguage", e.target.value)} disabled={!editable} /></Field>
            <Field label="Runtime (minutes)"><input type="number" min="1" max="600" className={input} value={form.runtimeMinutes} onChange={(e) => set("runtimeMinutes", e.target.value)} disabled={!editable} /></Field>
            <Field label="Reference / studio"><input className={input} value={form.sourceName} onChange={(e) => set("sourceName", e.target.value)} disabled={!editable} /></Field>
            <Field label="Reference URL"><input type="url" className={input} value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} disabled={!editable} /></Field>
          </div>
          <Field label="Button label"><input className={input} value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} disabled={!editable} /></Field>
          <Field label="Internal notes"><textarea className={`${input} min-h-20`} value={form.adminNotes} onChange={(e) => set("adminNotes", e.target.value)} disabled={!editable} /></Field>
        </EditorSection>
        <EditorSection step="4" title="Quality check" description="Every item must pass before scheduling.">
          <ul className="grid gap-2 sm:grid-cols-2">{checks.map((check) => <li key={check.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] ${check.passed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-admin-line bg-admin-bg text-admin-muted"}`}><span>{check.passed ? "✓" : "○"}</span>{check.label}</li>)}</ul>
        </EditorSection>
        <div className="flex flex-wrap gap-2 border-t border-admin-line pt-5">
          {editable && <button type="submit" disabled={busy || (!dirty && Boolean(issue))} className={primary}>{busy ? "Working…" : issue ? "Save changes" : "Create draft"}</button>}
          {issue && editable && <button type="button" disabled={busy || !ready} onClick={() => action("ready")} className={secondary}>Mark ready</button>}
          {issue && <button type="button" disabled={busy} onClick={() => action("duplicate")} className={secondary}>Duplicate</button>}
          {issue && ["FAILED","PARTIALLY_FAILED"].includes(issue.status) && <button type="button" disabled={busy} onClick={() => action("retry")} className={primary}>Retry failed</button>}
          {issue && !["SENT","CANCELED"].includes(issue.status) && <button type="button" disabled={busy} onClick={() => action("cancel")} className={danger}>Cancel edition</button>}
        </div>
        {issue && !["SENT","CANCELED"].includes(issue.status) && <EditorSection step="5" title="Schedule" description="Europe/Istanbul time."><div className="flex flex-wrap items-end gap-2"><Field label="Delivery time"><input type="datetime-local" className={input} value={schedule} onChange={(e) => setSchedule(e.target.value)} /></Field><button type="button" disabled={busy || !schedule || !ready} onClick={() => action("schedule", { scheduledFor: istanbulDateTimeToIso(schedule) })} className={primary}>Schedule edition</button></div></EditorSection>}
        {issue && <EditorSection step="6" title="Test delivery" description="Send the exact live renderer to one address."><div className="flex gap-2"><input type="email" className={input} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" /><button type="button" disabled={busy || !testEmail || !ready} onClick={() => action("test", { to: testEmail })} className={secondary}>Send test</button></div></EditorSection>}
        {message && <p className="rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-[12.5px] text-admin-body">{message}</p>}
      </form>
      <aside className="xl:sticky xl:top-20 xl:self-start"><div className="mb-2 flex justify-between text-[11px] uppercase tracking-eyebrow text-admin-muted"><span>Exact email preview</span><span>{form.emailLanguage}</span></div><iframe title="OneFilm email preview" srcDoc={previewHtml} sandbox="" className="h-[calc(100vh-11rem)] min-h-[480px] max-h-[760px] w-full rounded-xl border border-admin-line bg-white shadow-admin-sm" /><p className="mt-2 text-[11px] leading-5 text-admin-muted">Panel preview, test sends and live delivery use this same renderer.</p></aside>
    </div>
  );
}

function EditorSection({ step, title, description, children }: { step: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-xl border border-admin-line bg-admin-surface p-4 sm:p-5"><div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-admin-accent-tint text-[11px] font-medium text-admin-accent-strong">{step}</span><div><h2 className="text-[14px] font-medium text-admin-ink">{title}</h2><p className="mt-0.5 text-[12px] leading-5 text-admin-muted">{description}</p></div></div>{children}</section>;
}
function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted">{label}</span>{children}{help && <span className="mt-1 block text-[11px] text-admin-muted">{help}</span>}</label>;
}
function toLocalDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const p = (type: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === type)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}`;
}
function istanbulDateTimeToIso(value: string): string { return new Date(`${value}:00+03:00`).toISOString(); }
function humanError(error: string): string {
  const messages: Record<string,string> = {
    subject_required:"Add an email subject.",film_title_required:"Add the film title.",body_too_short:"The film note needs at least 120 words.",
    hero_image_url_required:"Add a cover image.",hero_image_alt_required:"Add cover image alternative text.",director_required:"Add the director.",
    film_year_required:"Add a valid release year.",source_url_required:"Add a reference URL.",invalid_source_url:"Use a valid reference URL.",
    invalid_hero_image_url:"Use a permanent HTTPS cover image URL.",invalid_film_year:"Use a valid release year.",invalid_runtime:"Runtime must be between 1 and 600 minutes.",
    schedule_must_be_future:"Choose a future delivery time.",version_conflict:"Another administrator changed this edition. Reload first.",
  }; return messages[error] ?? `The action could not be completed (${error}).`;
}
const input = "block w-full rounded-lg border border-admin-line bg-admin-bg px-3 py-2.5 text-[13px] text-admin-ink outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-admin-accent-tint disabled:opacity-60";
const primary = "h-10 rounded-lg bg-admin-accent px-4 text-[12.5px] font-medium text-white disabled:opacity-40";
const secondary = "h-10 rounded-lg border border-admin-line-strong bg-admin-surface px-4 text-[12.5px] text-admin-ink disabled:opacity-40";
const danger = "h-10 rounded-lg border border-rose-200 px-4 text-[12.5px] text-rose-700 disabled:opacity-40";
