"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SUMMARY_LANGUAGES } from "@/lib/options";

type EditorIssue = {
  id: string;
  version: number;
  status: string;
  readingLanguage: string;
  subject: string;
  previewText: string | null;
  headline: string;
  bodyText: string;
  sourceTitle: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  ctaLabel: string | null;
  adminNotes: string | null;
  scheduledFor: string | null;
};

const empty = {
  readingLanguage: "English",
  subject: "",
  previewText: "",
  headline: "",
  bodyText: "",
  sourceTitle: "",
  sourceName: "",
  sourceUrl: "",
  ctaLabel: "",
  adminNotes: "",
};

export function EditorialIssueEditor({ issue }: { issue?: EditorIssue }) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...empty,
    ...(issue
      ? {
          readingLanguage: issue.readingLanguage,
          subject: issue.subject,
          previewText: issue.previewText ?? "",
          headline: issue.headline,
          bodyText: issue.bodyText,
          sourceTitle: issue.sourceTitle ?? "",
          sourceName: issue.sourceName ?? "",
          sourceUrl: issue.sourceUrl ?? "",
          ctaLabel: issue.ctaLabel ?? "",
          adminNotes: issue.adminNotes ?? "",
        }
      : {}),
  });
  const [version, setVersion] = useState(issue?.version ?? 1);
  const [schedule, setSchedule] = useState(
    issue?.scheduledFor ? toLocalDateTime(issue.scheduledFor) : "",
  );
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable = !issue || ["DRAFT", "READY"].includes(issue.status);

  const previewHtml = useMemo(
    () => `<!doctype html><html><body style="margin:0;background:#F6F1E6;color:#1B1612;font-family:Georgia,serif"><div style="max-width:520px;margin:auto;padding:32px 24px"><div style="text-align:center;letter-spacing:.2em;font-size:12px">ONEREAD</div><hr style="border:0;border-top:1px solid #e6dcc8;margin:28px 0"><div style="font:12px system-ui;color:#8A7D6B">${escapeHtml(form.sourceName)}</div><h1 style="font-size:28px;line-height:1.15">${escapeHtml(form.headline || "Your headline")}</h1>${form.bodyText.split(/\n{2,}/).map((p) => `<p style="font-size:15.5px;line-height:1.7">${escapeHtml(p)}</p>`).join("")}</div></body></html>`,
    [form.bodyText, form.headline, form.sourceName],
  );

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function request(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/one-article/editorial", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        issueId: issue?.id,
        version,
        ...form,
        ...extra,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !data.ok) {
      setMessage(`Error: ${data.error ?? "request_failed"}`);
      return null;
    }
    if (data.issue?.version) setVersion(data.issue.version);
    return data;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const data = await request(issue ? "update" : "create");
    if (!data) return;
    if (!issue) {
      router.push(`/admin/one-article/issues/${data.issue.id}`);
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  async function action(name: string, extra: Record<string, unknown> = {}) {
    if (
      name === "schedule" &&
      !window.confirm(
        `Schedule this ${form.readingLanguage} edition for ${schedule} Europe/Istanbul? It can be sent on the next cron check.`,
      )
    ) {
      return;
    }
    if (
      name === "cancel" &&
      !window.confirm("Cancel this edition? It will no longer be eligible for delivery.")
    ) {
      return;
    }
    if (
      name === "retry" &&
      !window.confirm("Retry unresolved deliveries for this edition now?")
    ) {
      return;
    }
    // Action buttons must operate on the text currently visible in the editor,
    // not an older saved version hidden behind unsaved form changes.
    if (
      issue &&
      editable &&
      ["ready", "schedule", "test", "duplicate"].includes(name)
    ) {
      const saved = await request("update");
      if (!saved) return;
    }
    const data = await request(name, extra);
    if (!data) return;
    if (name === "duplicate") {
      router.push(`/admin/one-article/issues/${data.issue.id}`);
      return;
    }
    setMessage(name === "test" ? "Test email sent." : "Updated.");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]">
      <form onSubmit={save} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Reading language">
            <select className={input} value={form.readingLanguage} onChange={(e) => set("readingLanguage", e.target.value)} disabled={!editable}>
              {SUMMARY_LANGUAGES.map((language) => <option key={language}>{language}</option>)}
            </select>
          </Field>
          <Field label="Email subject">
            <input className={input} value={form.subject} maxLength={160} onChange={(e) => set("subject", e.target.value)} disabled={!editable} />
          </Field>
        </div>
        <Field label="Preview text">
          <input className={input} value={form.previewText} maxLength={240} onChange={(e) => set("previewText", e.target.value)} disabled={!editable} />
        </Field>
        <Field label="Headline">
          <input className={input} value={form.headline} onChange={(e) => set("headline", e.target.value)} disabled={!editable} />
        </Field>
        <Field label="Body" help="Separate paragraphs with a blank line. HTML is escaped automatically.">
          <textarea className={`${input} min-h-[300px] resize-y`} value={form.bodyText} onChange={(e) => set("bodyText", e.target.value)} disabled={!editable} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Source name">
            <input className={input} value={form.sourceName} onChange={(e) => set("sourceName", e.target.value)} disabled={!editable} />
          </Field>
          <Field label="Source title">
            <input className={input} value={form.sourceTitle} onChange={(e) => set("sourceTitle", e.target.value)} disabled={!editable} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Source URL">
            <input type="url" className={input} value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} disabled={!editable} />
          </Field>
          <Field label="Button label">
            <input className={input} value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} disabled={!editable} />
          </Field>
        </div>
        <Field label="Internal notes">
          <textarea className={`${input} min-h-20`} value={form.adminNotes} onChange={(e) => set("adminNotes", e.target.value)} disabled={!editable} />
        </Field>

        <div className="flex flex-wrap items-center gap-2 border-t border-admin-line pt-5">
          {editable && <button type="submit" disabled={busy} className={primary}>{busy ? "Saving…" : issue ? "Save changes" : "Create draft"}</button>}
          {issue && editable && <button type="button" disabled={busy} onClick={() => action("ready")} className={secondary}>Mark ready</button>}
          {issue && <button type="button" disabled={busy} onClick={() => action("duplicate")} className={secondary}>Duplicate</button>}
          {issue && ["FAILED", "PARTIALLY_FAILED"].includes(issue.status) && <button type="button" disabled={busy} onClick={() => action("retry")} className={primary}>Retry failed deliveries</button>}
          {issue && !["SENT", "CANCELED"].includes(issue.status) && <button type="button" disabled={busy} onClick={() => action("cancel")} className={danger}>Cancel edition</button>}
        </div>

        {issue && !["SENT", "CANCELED"].includes(issue.status) && (
          <div className="rounded-xl border border-admin-line bg-admin-surface p-4">
            <div className="mb-3 text-[11px] uppercase tracking-eyebrow text-admin-muted">Schedule</div>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Europe/Istanbul time">
                <input type="datetime-local" className={input} value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              </Field>
              <button type="button" disabled={busy || !schedule} onClick={() => action("schedule", { scheduledFor: istanbulDateTimeToIso(schedule) })} className={primary}>Schedule edition</button>
            </div>
          </div>
        )}

        {issue && (
          <div className="rounded-xl border border-admin-line bg-admin-surface p-4">
            <div className="mb-3 text-[11px] uppercase tracking-eyebrow text-admin-muted">Test delivery</div>
            <div className="flex gap-2">
              <input type="email" className={input} placeholder="test@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <button type="button" disabled={busy || !testEmail} onClick={() => action("test", { to: testEmail })} className={secondary}>Send test</button>
            </div>
          </div>
        )}
        {message && <p className="text-[12.5px] text-admin-body">{message}</p>}
      </form>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Live preview</span>
          <span className="text-[11px] text-admin-muted">{form.readingLanguage}</span>
        </div>
        <iframe title="OneArticle email preview" srcDoc={previewHtml} sandbox="" className="h-[680px] w-full rounded-xl border border-admin-line bg-white" />
      </aside>
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted">{label}</span>{children}{help && <span className="mt-1 block text-[11px] text-admin-muted">{help}</span>}</label>;
}

function toLocalDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function istanbulDateTimeToIso(value: string): string {
  return new Date(`${value}:00+03:00`).toISOString();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const input = "block w-full rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-[13px] text-admin-ink outline-none focus:border-admin-accent disabled:opacity-60";
const primary = "h-10 rounded-lg bg-admin-accent px-4 text-[12.5px] font-medium text-white hover:bg-admin-accent-strong disabled:opacity-40";
const secondary = "h-10 rounded-lg border border-admin-line-strong bg-admin-surface px-4 text-[12.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40";
const danger = "h-10 rounded-lg border border-rose-200 px-4 text-[12.5px] text-rose-700 hover:bg-rose-50 disabled:opacity-40";
