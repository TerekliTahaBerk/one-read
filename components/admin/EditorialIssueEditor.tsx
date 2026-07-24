"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { SUMMARY_LANGUAGES } from "@/lib/options";
import { renderEditorialEmail } from "@/lib/one-article/editorial-email";
import {
  editorialReadinessChecks,
  editorialWordCount,
} from "@/lib/one-article/editorial-validation";

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

type EditorialForm = {
  readingLanguage: string;
  subject: string;
  previewText: string;
  headline: string;
  bodyText: string;
  sourceTitle: string;
  sourceName: string;
  sourceUrl: string;
  ctaLabel: string;
  adminNotes: string;
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  issue?: EditorIssue;
  messageId?: string | null;
};

const empty: EditorialForm = {
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

export function EditorialIssueEditor({
  issue,
  audienceByLanguage = {},
}: {
  issue?: EditorIssue;
  audienceByLanguage?: Record<string, number>;
}) {
  const router = useRouter();
  const initialForm = useMemo<EditorialForm>(
    () => ({
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
    }),
    [issue],
  );
  const [form, setForm] = useState(initialForm);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(initialForm));
  const versionRef = useRef(issue?.version ?? 1);
  const [schedule, setSchedule] = useState(
    issue?.scheduledFor ? toLocalDateTime(issue.scheduledFor) : "",
  );
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving" | "error">(
    "saved",
  );
  const [message, setMessage] = useState<string | null>(null);
  const editable = !issue || ["DRAFT", "READY"].includes(issue.status);
  const dirty = snapshot(form) !== savedSnapshot;
  const checks = useMemo(() => editorialReadinessChecks(form), [form]);
  const ready = checks.every((check) => check.passed);
  const words = editorialWordCount(form.bodyText);
  const readingMinutes = Math.max(1, Math.ceil(words / 220));
  const audience = audienceByLanguage[form.readingLanguage];

  const previewHtml = useMemo(
    () =>
      renderEditorialEmail(
        {
          readingLanguage: form.readingLanguage,
          subject: form.subject || "OneArticle preview",
          previewText: form.previewText,
          headline: form.headline || "Your headline will appear here",
          bodyText:
            form.bodyText ||
            "Start writing the edition. The exact email layout will appear here as you type.",
          bodyHtml: null,
          sourceTitle: form.sourceTitle,
          sourceName: form.sourceName,
          sourceUrl: form.sourceUrl,
          ctaLabel: form.ctaLabel,
          scheduledFor: schedule ? new Date(istanbulDateTimeToIso(schedule)) : new Date(),
        },
        { unsubscribe: "#" },
      ).html,
    [form, schedule],
  );

  const request = useCallback(
    async (
      actionName: string,
      extra: Record<string, unknown> = {},
      silent = false,
    ): Promise<ApiResult | null> => {
      setBusy(true);
      if (!silent) setMessage(null);
      const response = await fetch("/api/admin/one-article/editorial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: actionName,
          issueId: issue?.id,
          version: versionRef.current,
          ...form,
          ...extra,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as ApiResult;
      setBusy(false);
      if (!response.ok || !data.ok) {
        setSaveState("error");
        setMessage(humanError(data.error ?? "request_failed"));
        return null;
      }
      if (data.issue?.version) versionRef.current = data.issue.version;
      return data;
    },
    [form, issue?.id],
  );

  const persistCurrentDraft = useCallback(
    async (silent = false): Promise<ApiResult | null> => {
      setSaveState("saving");
      const data = await request(issue ? "update" : "create", {}, silent);
      if (data) {
        setSavedSnapshot(snapshot(form));
        setSaveState("saved");
      }
      return data;
    },
    [form, issue, request],
  );

  useEffect(() => {
    if (!issue || !editable || !dirty || busy) return;
    setSaveState("unsaved");
    const timer = window.setTimeout(() => {
      void persistCurrentDraft(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [busy, dirty, editable, form, issue, persistCurrentDraft]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (editable && !busy) void persistCurrentDraft(false);
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  }, [busy, editable, persistCurrentDraft]);

  function set(key: keyof EditorialForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("unsaved");
    setMessage(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const data = await persistCurrentDraft(false);
    if (!data) return;
    if (!issue && data.issue) {
      router.push(`/admin/one-article/issues/${data.issue.id}`);
      return;
    }
    setMessage("All changes saved.");
    router.refresh();
  }

  async function action(name: string, extra: Record<string, unknown> = {}) {
    if (
      name === "schedule" &&
      !window.confirm(
        `Schedule this ${form.readingLanguage} edition for ${schedule} (Europe/Istanbul)? Cron can deliver it after this time.`,
      )
    ) return;
    if (
      name === "cancel" &&
      !window.confirm("Cancel this edition? It will no longer be eligible for delivery.")
    ) return;
    if (
      name === "retry" &&
      !window.confirm("Retry unresolved deliveries for this edition now?")
    ) return;

    if (issue && editable && ["ready", "schedule", "test", "duplicate"].includes(name)) {
      const saved = await persistCurrentDraft(true);
      if (!saved) return;
    }
    const data = await request(name, extra);
    if (!data) return;
    if (name === "duplicate" && data.issue) {
      router.push(`/admin/one-article/issues/${data.issue.id}`);
      return;
    }
    setMessage(
      name === "test"
        ? "Test email sent."
        : name === "schedule"
          ? "Edition scheduled."
          : name === "ready"
            ? "Edition marked ready."
            : "Edition updated.",
    );
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.82fr)]">
      <form onSubmit={save} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-admin-line bg-admin-sink/60 px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
              Manual editorial workspace
            </div>
            <div className="mt-1 text-[12.5px] text-admin-body">
              {words} words · about {readingMinutes} min read
              {typeof audience === "number" ? ` · ${audience} eligible readers` : ""}
            </div>
          </div>
          <SaveIndicator state={dirty ? saveState : "saved"} isNew={!issue} />
        </div>

        <section className={section}>
          <SectionHeading
            step="1"
            title="Delivery"
            description="Choose who receives this language-specific edition."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Reading language">
              <select
                className={input}
                value={form.readingLanguage}
                onChange={(event) => set("readingLanguage", event.target.value)}
                disabled={!editable}
              >
                {SUMMARY_LANGUAGES.map((language) => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Email subject"
              help={`${form.subject.length}/160 · aim for 35–60 characters`}
            >
              <input
                className={input}
                value={form.subject}
                maxLength={160}
                placeholder="A clear reason to open today's email"
                onChange={(event) => set("subject", event.target.value)}
                disabled={!editable}
              />
            </Field>
          </div>
          <Field
            label="Preview text"
            help={`${form.previewText.length}/240 · shown beside the subject in many inboxes`}
          >
            <input
              className={input}
              value={form.previewText}
              maxLength={240}
              placeholder="One sentence that complements the subject"
              onChange={(event) => set("previewText", event.target.value)}
              disabled={!editable}
            />
          </Field>
        </section>

        <section className={section}>
          <SectionHeading
            step="2"
            title="Edition"
            description="Write the complete OneArticle text. Drafts may be incomplete."
          />
          <Field label="Headline">
            <input
              className={`${input} text-[15px] font-medium`}
              value={form.headline}
              placeholder="The promise of this edition"
              onChange={(event) => set("headline", event.target.value)}
              disabled={!editable}
            />
          </Field>
          <Field
            label="Body"
            help="Minimum 120 words before publishing. Separate paragraphs with a blank line; HTML is escaped."
          >
            <textarea
              className={`${input} min-h-[380px] resize-y font-serif text-[15px] leading-7`}
              value={form.bodyText}
              placeholder="Write the edition here…"
              onChange={(event) => set("bodyText", event.target.value)}
              disabled={!editable}
            />
          </Field>
        </section>

        <section className={section}>
          <SectionHeading
            step="3"
            title="Original article"
            description="Give readers a transparent path to the source."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Publication / author">
              <input
                className={input}
                value={form.sourceName}
                placeholder="e.g. The Atlantic"
                onChange={(event) => set("sourceName", event.target.value)}
                disabled={!editable}
              />
            </Field>
            <Field label="Original article title">
              <input
                className={input}
                value={form.sourceTitle}
                onChange={(event) => set("sourceTitle", event.target.value)}
                disabled={!editable}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="Original article URL">
              <input
                type="url"
                className={input}
                value={form.sourceUrl}
                placeholder="https://…"
                onChange={(event) => set("sourceUrl", event.target.value)}
                disabled={!editable}
              />
            </Field>
            <Field label="Button label" help="Optional; translated default is used if blank">
              <input
                className={input}
                value={form.ctaLabel}
                onChange={(event) => set("ctaLabel", event.target.value)}
                disabled={!editable}
              />
            </Field>
          </div>
          <Field label="Internal notes" help="Visible only to administrators; never included in email">
            <textarea
              className={`${input} min-h-20 resize-y`}
              value={form.adminNotes}
              onChange={(event) => set("adminNotes", event.target.value)}
              disabled={!editable}
            />
          </Field>
        </section>

        <section className={section}>
          <SectionHeading
            step="4"
            title="Quality check"
            description="Every item must pass before the edition can be marked ready or scheduled."
          />
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checks.map((check) => (
              <li
                key={check.key}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] ${
                  check.passed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-admin-line bg-admin-bg text-admin-muted"
                }`}
              >
                <span aria-hidden>{check.passed ? "✓" : "○"}</span>
                {check.label}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-2 border-t border-admin-line pt-5">
          {editable && (
            <button type="submit" disabled={busy || (!dirty && Boolean(issue))} className={primary}>
              {busy ? "Working…" : issue ? "Save changes" : "Create draft"}
            </button>
          )}
          {issue && editable && (
            <button
              type="button"
              disabled={busy || !ready}
              title={!ready ? "Complete the quality check first" : undefined}
              onClick={() => action("ready")}
              className={secondary}
            >
              Mark ready
            </button>
          )}
          {issue && (
            <button type="button" disabled={busy} onClick={() => action("duplicate")} className={secondary}>
              Duplicate
            </button>
          )}
          {issue && ["FAILED", "PARTIALLY_FAILED"].includes(issue.status) && (
            <button type="button" disabled={busy} onClick={() => action("retry")} className={primary}>
              Retry failed deliveries
            </button>
          )}
          {issue && !["SENT", "CANCELED"].includes(issue.status) && (
            <button type="button" disabled={busy} onClick={() => action("cancel")} className={danger}>
              Cancel edition
            </button>
          )}
          <span className="ml-auto text-[11px] text-admin-muted">⌘/Ctrl + S to save</span>
        </div>

        {issue && !["SENT", "CANCELED"].includes(issue.status) && (
          <section className={section}>
            <SectionHeading
              step="5"
              title="Schedule"
              description="Times are always interpreted in Europe/Istanbul (UTC+3)."
            />
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Delivery time">
                <input
                  type="datetime-local"
                  className={input}
                  value={schedule}
                  onChange={(event) => setSchedule(event.target.value)}
                />
              </Field>
              <button
                type="button"
                disabled={busy || !schedule || !ready}
                title={!ready ? "Complete the quality check first" : undefined}
                onClick={() =>
                  action("schedule", { scheduledFor: istanbulDateTimeToIso(schedule) })
                }
                className={primary}
              >
                Schedule edition
              </button>
            </div>
          </section>
        )}

        {issue && (
          <section className={section}>
            <SectionHeading
              step="6"
              title="Test delivery"
              description="Send the exact email below to one address. No recipient delivery record is created."
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                className={input}
                placeholder="test@example.com"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
              />
              <button
                type="button"
                disabled={busy || !testEmail || !ready}
                onClick={() => action("test", { to: testEmail })}
                className={secondary}
              >
                Send test
              </button>
            </div>
          </section>
        )}

        <div aria-live="polite" className="min-h-5">
          {message && (
            <p
              className={`rounded-lg border px-3 py-2 text-[12.5px] ${
                saveState === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </form>

      <aside className="xl:sticky xl:top-20 xl:self-start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
            Exact email preview
          </span>
          <span className="text-[11px] text-admin-muted">
            {form.readingLanguage} · desktop
          </span>
        </div>
        <iframe
          title="OneArticle email preview"
          srcDoc={previewHtml}
          sandbox=""
          className="h-[calc(100vh-11rem)] min-h-[480px] max-h-[760px] w-full rounded-xl border border-admin-line bg-white shadow-admin-sm"
        />
        <p className="mt-2 text-[11px] leading-5 text-admin-muted">
          This preview uses the same renderer as test and live delivery. Links are disabled here.
        </p>
      </aside>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted">
        {label}
      </span>
      {children}
      {help && <span className="mt-1 block text-[11px] leading-4 text-admin-muted">{help}</span>}
    </label>
  );
}

function SectionHeading({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-admin-accent-tint text-[11px] font-medium text-admin-accent-strong">
        {step}
      </span>
      <div>
        <h2 className="text-[14px] font-medium text-admin-ink">{title}</h2>
        <p className="mt-0.5 text-[12px] leading-5 text-admin-muted">{description}</p>
      </div>
    </div>
  );
}

function SaveIndicator({
  state,
  isNew,
}: {
  state: "saved" | "unsaved" | "saving" | "error";
  isNew: boolean;
}) {
  const label = isNew
    ? "Not created yet"
    : state === "saving"
      ? "Saving…"
      : state === "unsaved"
        ? "Unsaved changes"
        : state === "error"
          ? "Save failed"
          : "All changes saved";
  const tone =
    state === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : state === "unsaved"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tone}`} aria-live="polite">
      {label}
    </span>
  );
}

function snapshot(form: EditorialForm): string {
  return JSON.stringify(form);
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

function humanError(error: string): string {
  const messages: Record<string, string> = {
    subject_required: "Add an email subject before publishing.",
    headline_required: "Add a headline before publishing.",
    body_too_short: "The edition needs at least 120 words before publishing.",
    source_title_required: "Add the original article title before publishing.",
    source_url_required: "Add the original article link before publishing.",
    invalid_source_url: "Use a valid http:// or https:// source link.",
    subject_too_long: "The email subject is too long.",
    preview_too_long: "The preview text is too long.",
    schedule_must_be_future: "Choose a delivery time in the future.",
    invalid_schedule: "Choose a valid delivery time.",
    version_conflict:
      "Another administrator changed this edition. Reload the page before continuing.",
    issue_not_editable: "This edition can no longer be edited in its current status.",
    email_delivery_not_configured: "Email delivery is not configured.",
    invalid_email: "Enter a valid test email address.",
  };
  return messages[error] ?? `The action could not be completed (${error}).`;
}

const section = "space-y-4 rounded-xl border border-admin-line bg-admin-surface p-4 sm:p-5";
const input =
  "block w-full rounded-lg border border-admin-line bg-admin-bg px-3 py-2.5 text-[13px] text-admin-ink outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-admin-accent-tint disabled:cursor-not-allowed disabled:opacity-60";
const primary =
  "h-10 rounded-lg bg-admin-accent px-4 text-[12.5px] font-medium text-white transition hover:bg-admin-accent-strong disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "h-10 rounded-lg border border-admin-line-strong bg-admin-surface px-4 text-[12.5px] text-admin-ink transition hover:bg-admin-sink disabled:cursor-not-allowed disabled:opacity-40";
const danger =
  "h-10 rounded-lg border border-rose-200 px-4 text-[12.5px] text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40";
