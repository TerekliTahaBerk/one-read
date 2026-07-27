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
import { FILM_EMAIL_LANGUAGES } from "@/lib/options";
import { renderFilmEditorialEmail } from "@/lib/film/editorial-email";
import {
  filmEditorialReadinessChecks,
  filmEditorialWordCount,
} from "@/lib/film/editorial-validation";
import {
  EmailPreviewPanel,
  FormattingToolbar,
  SchedulePresets,
} from "@/components/admin/EditorialComposerTools";

export type FilmEditorIssue = {
  id: string;
  version: number;
  status: string;
  emailLanguage: string;
  subject: string;
  previewText: string | null;
  filmTitle: string;
  bodyText: string;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  heroImageCredit: string | null;
  filmYear: number | null;
  director: string | null;
  filmLanguage: string | null;
  runtimeMinutes: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  ctaLabel: string | null;
  adminNotes: string | null;
  scheduledFor: string | null;
};

type FilmForm = {
  emailLanguage: string;
  subject: string;
  previewText: string;
  filmTitle: string;
  bodyText: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroImageCredit: string;
  filmYear: string;
  director: string;
  filmLanguage: string;
  runtimeMinutes: string;
  sourceName: string;
  sourceUrl: string;
  ctaLabel: string;
  adminNotes: string;
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  issue?: FilmEditorIssue;
  messageId?: string | null;
};

const empty: FilmForm = {
  emailLanguage: "English",
  subject: "",
  previewText: "",
  filmTitle: "",
  bodyText: "",
  heroImageUrl: "",
  heroImageAlt: "",
  heroImageCredit: "",
  filmYear: "",
  director: "",
  filmLanguage: "",
  runtimeMinutes: "",
  sourceName: "",
  sourceUrl: "",
  ctaLabel: "",
  adminNotes: "",
};

export function FilmEditorialIssueEditor({
  issue,
  audienceByLanguage = {},
}: {
  issue?: FilmEditorIssue;
  audienceByLanguage?: Record<string, number>;
}) {
  const router = useRouter();
  const initialForm = useMemo<FilmForm>(
    () =>
      issue
        ? {
            emailLanguage: issue.emailLanguage,
            subject: issue.subject,
            previewText: issue.previewText ?? "",
            filmTitle: issue.filmTitle,
            bodyText: issue.bodyText,
            heroImageUrl: issue.heroImageUrl ?? "",
            heroImageAlt: issue.heroImageAlt ?? "",
            heroImageCredit: issue.heroImageCredit ?? "",
            filmYear: issue.filmYear?.toString() ?? "",
            director: issue.director ?? "",
            filmLanguage: issue.filmLanguage ?? "",
            runtimeMinutes: issue.runtimeMinutes?.toString() ?? "",
            sourceName: issue.sourceName ?? "",
            sourceUrl: issue.sourceUrl ?? "",
            ctaLabel: issue.ctaLabel ?? "",
            adminNotes: issue.adminNotes ?? "",
          }
        : empty,
    [issue],
  );
  const [form, setForm] = useState(initialForm);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
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
  const normalized = useMemo(
    () => ({
      ...form,
      filmYear: form.filmYear ? Number(form.filmYear) : null,
      runtimeMinutes: form.runtimeMinutes ? Number(form.runtimeMinutes) : null,
    }),
    [form],
  );
  const checks = useMemo(() => filmEditorialReadinessChecks(normalized), [normalized]);
  const ready = checks.every((check) => check.passed);
  const passedChecks = checks.filter((check) => check.passed).length;
  const readinessPercent = Math.round((passedChecks / checks.length) * 100);
  const testReady = Boolean(
    form.subject.trim() && form.filmTitle.trim() && form.bodyText.trim(),
  );
  const words = filmEditorialWordCount(form.bodyText);
  const readingMinutes = Math.max(1, Math.ceil(words / 220));
  const audience = audienceByLanguage[form.emailLanguage] ?? 0;

  const previewHtml = useMemo(
    () =>
      renderFilmEditorialEmail(
        {
          emailLanguage: form.emailLanguage,
          subject: form.subject || "OneFilm preview",
          previewText: form.previewText,
          filmTitle: form.filmTitle || "Your film title will appear here",
          bodyText:
            form.bodyText ||
            "Start writing the film note. The exact email layout will appear here as you type.",
          bodyHtml: null,
          heroImageUrl: form.heroImageUrl,
          heroImageAlt: form.heroImageAlt,
          heroImageCredit: form.heroImageCredit,
          filmYear: normalized.filmYear,
          director: form.director,
          filmLanguage: form.filmLanguage,
          runtimeMinutes: normalized.runtimeMinutes,
          sourceName: form.sourceName,
          sourceUrl: form.sourceUrl,
          ctaLabel: form.ctaLabel,
          scheduledFor: schedule
            ? new Date(istanbulDateTimeToIso(schedule))
            : new Date(),
        },
        { unsubscribe: "#" },
      ).html,
    [form, normalized.filmYear, normalized.runtimeMinutes, schedule],
  );

  const request = useCallback(
    async (
      actionName: string,
      extra: Record<string, unknown> = {},
      silent = false,
    ): Promise<ApiResult | null> => {
      setBusy(true);
      if (!silent) setMessage(null);
      const response = await fetch("/api/admin/film/editorial", {
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

  function set(key: keyof FilmForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("unsaved");
    setMessage(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const data = await persistCurrentDraft(false);
    if (!data) return;
    if (!issue && data.issue) {
      router.push(`/admin/one-film/issues/${data.issue.id}`);
      return;
    }
    setMessage("All changes saved.");
    router.refresh();
  }

  async function action(name: string, extra: Record<string, unknown> = {}) {
    if (
      name === "schedule" &&
      !window.confirm(
        `Schedule this ${form.emailLanguage} OneFilm edition for ${schedule} (Europe/Istanbul)?`,
      )
    ) return;
    if (name === "cancel" && !window.confirm("Cancel this edition?")) return;
    if (
      name === "retry" &&
      !window.confirm("Retry unresolved deliveries for this edition now?")
    ) return;

    if (
      issue &&
      editable &&
      dirty &&
      ["ready", "schedule", "test", "duplicate"].includes(name)
    ) {
      const saved = await persistCurrentDraft(true);
      if (!saved) return;
    }
    const data = await request(name, extra);
    if (!data) return;
    if (name === "duplicate" && data.issue) {
      router.push(`/admin/one-film/issues/${data.issue.id}`);
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
        <div className="rounded-xl border border-admin-line bg-admin-sink/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
                OneFilm editorial workspace
              </div>
              <div className="mt-1 text-[12.5px] text-admin-body">
                {words} words · about {readingMinutes} min read · {audience} eligible viewers
              </div>
            </div>
            <SaveIndicator state={dirty ? saveState : "saved"} isNew={!issue} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-admin-line">
              <div
                className={`h-full rounded-full transition-all ${ready ? "bg-emerald-500" : "bg-purple-500"}`}
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-admin-muted">
              {passedChecks}/{checks.length} ready
            </span>
          </div>
        </div>

        <EditorSection
          step="1"
          title="Delivery"
          description="Choose the audience language and polish how the edition appears in the inbox."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email language">
              <select
                className={input}
                value={form.emailLanguage}
                onChange={(event) => set("emailLanguage", event.target.value)}
                disabled={!editable}
              >
                {FILM_EMAIL_LANGUAGES.map((language) => (
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
                placeholder="A compelling reason to watch"
                onChange={(event) => set("subject", event.target.value)}
                disabled={!editable}
              />
            </Field>
          </div>
          <Field
            label="Preview text"
            help={`${form.previewText.length}/240 · complements the subject in supported inboxes`}
          >
            <input
              className={input}
              value={form.previewText}
              maxLength={240}
              placeholder="A spoiler-free promise for this edition"
              onChange={(event) => set("previewText", event.target.value)}
              disabled={!editable}
            />
          </Field>
        </EditorSection>

        <EditorSection
          step="2"
          title="Film note"
          description="Write one thoughtful, spoiler-controlled note with a clear editorial point of view."
        >
          <Field label="Film title">
            <input
              className={`${input} text-[15px] font-medium`}
              value={form.filmTitle}
              placeholder="The exact released title"
              onChange={(event) => set("filmTitle", event.target.value)}
              disabled={!editable}
            />
          </Field>
          <Field
            label="Body"
            htmlFor="one-film-body"
            help="Minimum 120 words before publishing. Use safe headings, emphasis, lists, quotes and links."
          >
            <FormattingToolbar
              textareaRef={bodyRef}
              value={form.bodyText}
              onChange={(value) => set("bodyText", value)}
              disabled={!editable}
            />
            <textarea
              id="one-film-body"
              ref={bodyRef}
              className={`${input} min-h-[380px] resize-y rounded-t-none font-serif text-[15px] leading-7`}
              value={form.bodyText}
              placeholder="Why is this film worth the reader's time?"
              onChange={(event) => set("bodyText", event.target.value)}
              disabled={!editable}
            />
          </Field>
          <div className="border-t border-admin-line pt-4">
            <div className="mb-3">
              <h3 className="text-[13px] font-medium text-admin-ink">Cover image</h3>
              <p className="mt-0.5 text-[11.5px] leading-5 text-admin-muted">
                Optional. Use a licensed, permanent HTTPS image and provide alternative text when included.
              </p>
            </div>
            <Field label="Image URL">
              <input
                type="url"
                className={input}
                value={form.heroImageUrl}
                placeholder="https://…"
                onChange={(event) => set("heroImageUrl", event.target.value)}
                disabled={!editable}
              />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Alternative text"
                help={`${form.heroImageAlt.length}/240 · required only with an image`}
              >
                <input
                  className={input}
                  value={form.heroImageAlt}
                  maxLength={240}
                  placeholder="What the image shows"
                  onChange={(event) => set("heroImageAlt", event.target.value)}
                  disabled={!editable}
                />
              </Field>
              <Field label="Image credit" help="Optional · studio, photographer or distributor">
                <input
                  className={input}
                  value={form.heroImageCredit}
                  placeholder="Image: …"
                  onChange={(event) => set("heroImageCredit", event.target.value)}
                  disabled={!editable}
                />
              </Field>
            </div>
          </div>
        </EditorSection>

        <EditorSection
          step="3"
          title="Grounded film facts"
          description="Give readers reliable context and a transparent reference path."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Director">
              <input className={input} value={form.director} onChange={(event) => set("director", event.target.value)} disabled={!editable} />
            </Field>
            <Field label="Release year">
              <input type="number" min="1888" max="2100" className={input} value={form.filmYear} onChange={(event) => set("filmYear", event.target.value)} disabled={!editable} />
            </Field>
            <Field label="Original language">
              <input className={input} value={form.filmLanguage} placeholder="e.g. Japanese" onChange={(event) => set("filmLanguage", event.target.value)} disabled={!editable} />
            </Field>
            <Field label="Runtime" help="Minutes">
              <input type="number" min="1" max="600" className={input} value={form.runtimeMinutes} onChange={(event) => set("runtimeMinutes", event.target.value)} disabled={!editable} />
            </Field>
            <Field label="Reference / studio">
              <input className={input} value={form.sourceName} onChange={(event) => set("sourceName", event.target.value)} disabled={!editable} />
            </Field>
            <Field label="Reference URL">
              <input type="url" className={input} value={form.sourceUrl} placeholder="https://…" onChange={(event) => set("sourceUrl", event.target.value)} disabled={!editable} />
            </Field>
          </div>
          <Field label="Button label" help="Optional; a translated default is used when blank">
            <input className={input} value={form.ctaLabel} placeholder="Where can the reader learn more?" onChange={(event) => set("ctaLabel", event.target.value)} disabled={!editable} />
          </Field>
          <Field label="Internal notes" help="Visible only to administrators; never included in the email">
            <textarea className={`${input} min-h-20 resize-y`} value={form.adminNotes} onChange={(event) => set("adminNotes", event.target.value)} disabled={!editable} />
          </Field>
        </EditorSection>

        <EditorSection
          step="4"
          title="Quality check"
          description="Every item must pass before the edition can be marked ready or scheduled."
        >
          <ul className="grid gap-2 sm:grid-cols-2">
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
        </EditorSection>

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
          <EditorSection
            step="5"
            title="Schedule"
            description="Choose an exact Europe/Istanbul delivery time or use a practical preset."
          >
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
            <SchedulePresets product="film" onSelect={setSchedule} />
          </EditorSection>
        )}

        {issue && (
          <EditorSection
            step="6"
            title="Test delivery"
            description="Send a working draft before every publishing check passes. A subject, film title and some body copy are enough."
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                className={input}
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="test@example.com"
              />
              <button
                type="button"
                disabled={busy || !testEmail || !testReady}
                title={!testReady ? "Add a subject, film title and body copy first" : undefined}
                onClick={() => action("test", { to: testEmail })}
                className={secondary}
              >
                Send test
              </button>
            </div>
          </EditorSection>
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

      <EmailPreviewPanel
        html={previewHtml}
        product="OneFilm"
        subject={form.subject}
        previewText={form.previewText}
        language={form.emailLanguage}
      />
    </div>
  );
}

function EditorSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={section}>
      <div className="flex gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-purple-100 text-[11px] font-medium text-purple-800">
          {step}
        </span>
        <div>
          <h2 className="text-[14px] font-medium text-admin-ink">{title}</h2>
          <p className="mt-0.5 text-[12px] leading-5 text-admin-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  help,
  htmlFor,
  children,
}: {
  label: string;
  help?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  if (htmlFor) {
    return (
      <div>
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted"
        >
          {label}
        </label>
        {children}
        {help && <span className="mt-1 block text-[11px] leading-4 text-admin-muted">{help}</span>}
      </div>
    );
  }
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

function snapshot(form: FilmForm): string {
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
    subject_required: "Add an email subject.",
    film_title_required: "Add the film title.",
    body_too_short: "The film note needs at least 120 words.",
    body_required_for_test: "Add some film-note copy before sending a test.",
    hero_image_alt_required: "Add cover image alternative text.",
    director_required: "Add the director.",
    film_year_required: "Add a valid release year.",
    source_url_required: "Add a reference URL.",
    invalid_source_url: "Use a valid http:// or https:// reference URL.",
    invalid_hero_image_url: "Use a permanent HTTPS cover image URL.",
    invalid_film_year: "Use a valid release year.",
    invalid_runtime: "Runtime must be between 1 and 600 minutes.",
    schedule_must_be_future: "Choose a future delivery time.",
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
  "block w-full rounded-lg border border-admin-line bg-admin-bg px-3 py-2.5 text-[13px] text-admin-ink outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:opacity-60";
const primary =
  "h-10 rounded-lg bg-purple-700 px-4 text-[12.5px] font-medium text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "h-10 rounded-lg border border-admin-line-strong bg-admin-surface px-4 text-[12.5px] text-admin-ink transition hover:bg-admin-sink disabled:cursor-not-allowed disabled:opacity-40";
const danger =
  "h-10 rounded-lg border border-rose-200 px-4 text-[12.5px] text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40";
