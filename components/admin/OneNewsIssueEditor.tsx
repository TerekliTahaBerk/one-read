"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SUMMARY_LANGUAGES } from "@/lib/options";
import { EmailPreviewPanel } from "@/components/admin/EditorialComposerTools";
import { buildOneNewsRenderModel } from "@/lib/one-news/render-model";
import { renderOneNewsEmail } from "@/lib/one-news/email";
import {
  ONE_NEWS_SOURCE_TYPES,
  ONE_NEWS_TARGET_WORDS,
  validateOneNewsIssue,
} from "@/lib/one-news/validation";
import { allowedTransitions } from "@/lib/one-news/lifecycle";

/**
 * The OneNews editorial surface.
 *
 * Preview is exact by construction: this component calls the same
 * `buildOneNewsRenderModel` + `renderOneNewsEmail` pair that a future
 * production send will call. There is no second, approximate preview renderer.
 *
 * There is deliberately no send or test-send control here — OneNews has no
 * delivery path in this milestone.
 */

export type OneNewsEditorIssue = {
  id: string;
  version: number;
  status: string;
  readingLanguage: string;
  timezone: string;
  subject: string;
  previewText: string | null;
  headline: string;
  dek: string;
  whatHappened: string;
  whyItMatters: string;
  whatsContested: string | null;
  whatToWatch: string;
  developing: boolean;
  asOf: string | null;
  adminNotes: string | null;
  scheduledFor: string | null;
  sources: OneNewsEditorSource[];
  corrections: OneNewsEditorCorrection[];
};

export type OneNewsEditorSource = {
  url: string;
  title: string;
  publication: string;
  sourceType: string;
  publishedAt: string | null;
  accessedAt: string | null;
  note: string | null;
  sortOrder: number;
};

export type OneNewsEditorCorrection = {
  id: string;
  type: string;
  note: string;
  createdBy: string;
  createdAt: string;
  versionBefore: number;
  versionAfter: number;
  correctionEmailRecommended: boolean;
  correctionEmailDecision: string;
};

type Form = {
  readingLanguage: string;
  subject: string;
  previewText: string;
  headline: string;
  dek: string;
  whatHappened: string;
  whyItMatters: string;
  whatsContested: string;
  whatToWatch: string;
  developing: boolean;
  asOf: string;
  adminNotes: string;
};

const EMPTY_SOURCE: OneNewsEditorSource = {
  url: "",
  title: "",
  publication: "",
  sourceType: "REPORTING",
  publishedAt: null,
  accessedAt: null,
  note: null,
  sortOrder: 0,
};

export function OneNewsIssueEditor({ issue }: { issue?: OneNewsEditorIssue }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => initialForm(issue));
  const [sources, setSources] = useState<OneNewsEditorSource[]>(
    () => issue?.sources.map((source, index) => ({ ...source, sortOrder: index })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(
    () =>
      validateOneNewsIssue(
        { ...form, asOf: form.asOf ? new Date(form.asOf) : null },
        sources.map((source) => ({
          ...source,
          publishedAt: source.publishedAt ? new Date(source.publishedAt) : null,
          accessedAt: source.accessedAt ? new Date(source.accessedAt) : null,
        })),
      ),
    [form, sources],
  );

  const rendered = useMemo(() => {
    try {
      const model = buildOneNewsRenderModel(
        {
          readingLanguage: form.readingLanguage,
          timezone: issue?.timezone ?? "Europe/Istanbul",
          subject: form.subject,
          previewText: form.previewText || null,
          headline: form.headline || "Headline",
          dek: form.dek,
          whatHappened: form.whatHappened,
          whyItMatters: form.whyItMatters,
          whatsContested: form.whatsContested || null,
          whatToWatch: form.whatToWatch,
          developing: form.developing,
          asOf: form.asOf ? new Date(form.asOf) : null,
          scheduledFor: issue?.scheduledFor ? new Date(issue.scheduledFor) : null,
        },
        sources.map((source) => ({
          url: source.url,
          title: source.title,
          publication: source.publication,
          sourceType: source.sourceType,
          publishedAt: source.publishedAt ? new Date(source.publishedAt) : null,
          note: source.note,
          sortOrder: source.sortOrder,
        })),
        (issue?.corrections ?? []).map((correction) => ({
          type: correction.type,
          note: correction.note,
          createdAt: new Date(correction.createdAt),
        })),
      );
      // Opaque placeholder: no production unsubscribe token belongs in a preview.
      return renderOneNewsEmail(model, {
        unsubscribe: "https://oneread.email/unsubscribe?subscription=preview-token",
      });
    } catch {
      return null;
    }
  }, [form, sources, issue]);

  async function call(payload: Record<string, unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/one-news/editorial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string; issue?: { id: string } };
      if (!result.ok) {
        setError(result.error ?? "editorial_action_failed");
        return;
      }
      setMessage("Saved.");
      if (!issue && result.issue?.id) {
        router.push(`/admin/one-news/issues/${result.issue.id}`);
        return;
      }
      router.refresh();
    } catch {
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    const content = {
      ...form,
      whatsContested: form.whatsContested,
      asOf: form.asOf ? new Date(form.asOf).toISOString() : null,
    };
    if (!issue) {
      await call({ action: "create", ...content });
      return;
    }
    await call({ action: "update", issueId: issue.id, version: issue.version, ...content });
    await call({
      action: "sources",
      issueId: issue.id,
      sources: sources.map((source, index) => ({ ...source, sortOrder: index })),
    });
  }

  const transitions = allowedTransitions(issue?.status ?? "DRAFT");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Reading language">
            <select
              value={form.readingLanguage}
              onChange={(event) => setForm({ ...form, readingLanguage: event.target.value })}
              className={controlClass}
            >
              {SUMMARY_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email subject">
            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              className={controlClass}
            />
          </Field>
        </div>

        <Field label="Preview text (optional)">
          <input
            value={form.previewText}
            onChange={(event) => setForm({ ...form, previewText: event.target.value })}
            className={controlClass}
          />
        </Field>

        <Field label="Headline">
          <input
            value={form.headline}
            onChange={(event) => setForm({ ...form, headline: event.target.value })}
            className={controlClass}
          />
        </Field>

        <Field label="Dek — one sentence on what changed and why it deserves attention">
          <textarea
            value={form.dek}
            rows={2}
            onChange={(event) => setForm({ ...form, dek: event.target.value })}
            className={controlClass}
          />
        </Field>

        <Field label="What happened — verified facts only">
          <textarea
            value={form.whatHappened}
            rows={8}
            onChange={(event) => setForm({ ...form, whatHappened: event.target.value })}
            className={controlClass}
          />
        </Field>

        <Field label="Why it matters — context and consequence">
          <textarea
            value={form.whyItMatters}
            rows={6}
            onChange={(event) => setForm({ ...form, whyItMatters: event.target.value })}
            className={controlClass}
          />
        </Field>

        <Field label="What's contested — optional. Leave empty unless there is a real, material disagreement.">
          <textarea
            value={form.whatsContested}
            rows={5}
            onChange={(event) => setForm({ ...form, whatsContested: event.target.value })}
            className={controlClass}
          />
        </Field>

        <Field label="What to watch — what could materially change next">
          <textarea
            value={form.whatToWatch}
            rows={5}
            onChange={(event) => setForm({ ...form, whatToWatch: event.target.value })}
            className={controlClass}
          />
        </Field>

        <div className="rounded-xl border border-admin-line bg-admin-surface p-4">
          <label className="flex items-center gap-2 text-[13px] text-admin-ink">
            <input
              type="checkbox"
              checked={form.developing}
              onChange={(event) => setForm({ ...form, developing: event.target.checked })}
            />
            This story is still materially developing
          </label>
          <p className="mt-1 text-[11.5px] text-admin-muted">
            A developing story must carry an exact as-of time. It is never updated automatically.
          </p>
          <div className="mt-3">
            <Field label="Facts verified as of">
              <input
                type="datetime-local"
                value={form.asOf}
                onChange={(event) => setForm({ ...form, asOf: event.target.value })}
                className={controlClass}
              />
            </Field>
          </div>
        </div>

        <SourcesEditor sources={sources} onChange={setSources} />

        <Field label="Internal notes (never sent)">
          <textarea
            value={form.adminNotes}
            rows={3}
            onChange={(event) => setForm({ ...form, adminNotes: event.target.value })}
            className={controlClass}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-lg bg-admin-ink px-4 text-[12.5px] text-white disabled:opacity-50"
          >
            {issue ? "Save draft" : "Create draft"}
          </button>
          {issue && transitions.includes("READY") && (
            <button
              type="button"
              disabled={busy || !validation.valid}
              title={validation.valid ? undefined : "Resolve the blocking issues first"}
              onClick={() => call({ action: "ready", issueId: issue.id })}
              className="h-9 rounded-lg bg-admin-accent px-4 text-[12.5px] text-white disabled:opacity-40"
            >
              Mark ready
            </button>
          )}
          {issue && issue.status !== "DRAFT" && transitions.includes("DRAFT") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => call({ action: "draft", issueId: issue.id })}
              className="h-9 rounded-lg border border-admin-line px-4 text-[12.5px] text-admin-ink"
            >
              Return to draft
            </button>
          )}
          {message && <span className="text-[12px] text-emerald-700">{message}</span>}
          {error && <span className="text-[12px] text-red-700">{error}</span>}
        </div>
      </form>

      <div className="space-y-4">
        <ValidationPanel validation={validation} />
        {rendered ? (
          <>
            <EmailPreviewPanel
              html={rendered.html}
              product="OneNews"
              subject={form.subject}
              previewText={form.previewText}
              language={form.readingLanguage}
            />
            <details className="rounded-xl border border-admin-line bg-admin-surface p-3">
              <summary className="cursor-pointer text-[12px] text-admin-ink">
                Plain-text edition
              </summary>
              <pre className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-[11.5px] leading-5 text-admin-body">
                {rendered.text}
              </pre>
            </details>
          </>
        ) : (
          <p className="rounded-xl border border-admin-line bg-admin-surface p-4 text-[12px] text-red-700">
            Preview unavailable: a source link is unsafe. Fix it to see the edition.
          </p>
        )}
        {issue && issue.corrections.length > 0 && (
          <CorrectionsPanel corrections={issue.corrections} />
        )}
      </div>
    </div>
  );
}

function SourcesEditor({
  sources,
  onChange,
}: {
  sources: OneNewsEditorSource[];
  onChange: (next: OneNewsEditorSource[]) => void;
}) {
  const update = (index: number, patch: Partial<OneNewsEditorSource>) =>
    onChange(sources.map((source, i) => (i === index ? { ...source, ...patch } : source)));

  return (
    <div className="rounded-xl border border-admin-line bg-admin-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
          Sources &amp; notes
        </span>
        <button
          type="button"
          onClick={() => onChange([...sources, { ...EMPTY_SOURCE, sortOrder: sources.length }])}
          className="h-8 rounded-md border border-admin-line px-2.5 text-[11.5px] text-admin-ink"
        >
          + Add source
        </button>
      </div>
      {sources.length === 0 && (
        <p className="text-[12px] text-admin-muted">
          No sources yet. OneNews needs at least two independent sources, and a primary source
          whenever one exists.
        </p>
      )}
      <div className="space-y-3">
        {sources.map((source, index) => (
          <div key={index} className="rounded-lg border border-admin-line p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={source.publication}
                placeholder="Publication"
                onChange={(event) => update(index, { publication: event.target.value })}
                className={controlClass}
              />
              <select
                value={source.sourceType}
                onChange={(event) => update(index, { sourceType: event.target.value })}
                className={controlClass}
              >
                {ONE_NEWS_SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={source.title}
              placeholder="Title"
              onChange={(event) => update(index, { title: event.target.value })}
              className={`${controlClass} mt-2`}
            />
            <input
              value={source.url}
              placeholder="https://…"
              onChange={(event) => update(index, { url: event.target.value })}
              className={`${controlClass} mt-2`}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] text-admin-muted">
                Published
                <input
                  type="date"
                  value={source.publishedAt?.slice(0, 10) ?? ""}
                  onChange={(event) =>
                    update(index, { publishedAt: event.target.value || null })
                  }
                  className={controlClass}
                />
              </label>
              <label className="text-[11px] text-admin-muted">
                Accessed
                <input
                  type="date"
                  value={source.accessedAt?.slice(0, 10) ?? ""}
                  onChange={(event) => update(index, { accessedAt: event.target.value || null })}
                  className={controlClass}
                />
              </label>
            </div>
            <input
              value={source.note ?? ""}
              placeholder="Note (optional)"
              onChange={(event) => update(index, { note: event.target.value || null })}
              className={`${controlClass} mt-2`}
            />
            <button
              type="button"
              onClick={() => onChange(sources.filter((_, i) => i !== index))}
              className="mt-2 text-[11.5px] text-red-700 underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationPanel({
  validation,
}: {
  validation: ReturnType<typeof validateOneNewsIssue>;
}) {
  return (
    <div className="rounded-xl border border-admin-line bg-admin-surface p-4">
      <div className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
        Editorial checks
      </div>
      <p className="mt-2 text-[12px] text-admin-body">
        {validation.wordCount} words · about {validation.readingMinutes} min ·{" "}
        {validation.sourceCount} sources ({validation.independentSourceCount} independent)
        {validation.hasPrimarySource ? " · primary source cited" : ""}
      </p>
      <p className="mt-1 text-[11px] text-admin-muted">
        Guidance: {ONE_NEWS_TARGET_WORDS.min}–{ONE_NEWS_TARGET_WORDS.max} words. Length never
        blocks approval.
      </p>
      {validation.errors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {validation.errors.map((entry, index) => (
            <li key={`${entry.code}-${index}`} className="text-[12px] text-red-700">
              ● {entry.message}
            </li>
          ))}
        </ul>
      )}
      {validation.warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {validation.warnings.map((entry, index) => (
            <li key={`${entry.code}-${index}`} className="text-[12px] text-amber-700">
              ▲ {entry.message}
            </li>
          ))}
        </ul>
      )}
      {validation.valid && validation.errors.length === 0 && (
        <p className="mt-3 text-[12px] text-emerald-700">
          Nothing blocks approval. A human editor still has to mark this ready.
        </p>
      )}
    </div>
  );
}

function CorrectionsPanel({ corrections }: { corrections: OneNewsEditorCorrection[] }) {
  return (
    <div className="rounded-xl border border-admin-line bg-admin-surface p-4">
      <div className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Corrections</div>
      <ul className="mt-2 space-y-2">
        {corrections.map((correction) => (
          <li key={correction.id} className="text-[12px] text-admin-body">
            <strong>{correction.type === "MATERIAL" ? "Material" : "Minor"}</strong> ·{" "}
            {new Date(correction.createdAt).toLocaleString()} · {correction.createdBy} · v
            {correction.versionBefore} → v{correction.versionAfter}
            <div className="text-admin-muted">{correction.note}</div>
            {correction.correctionEmailRecommended && (
              <div className="text-[11px] text-amber-700">
                Correction email decision: {correction.correctionEmailDecision.toLowerCase()}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-eyebrow text-admin-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

const controlClass =
  "w-full rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-[13px] text-admin-ink outline-none focus:border-admin-ink";

function initialForm(issue?: OneNewsEditorIssue): Form {
  return {
    readingLanguage: issue?.readingLanguage ?? "English",
    subject: issue?.subject ?? "",
    previewText: issue?.previewText ?? "",
    headline: issue?.headline ?? "",
    dek: issue?.dek ?? "",
    whatHappened: issue?.whatHappened ?? "",
    whyItMatters: issue?.whyItMatters ?? "",
    whatsContested: issue?.whatsContested ?? "",
    whatToWatch: issue?.whatToWatch ?? "",
    developing: issue?.developing ?? false,
    asOf: issue?.asOf ? issue.asOf.slice(0, 16) : "",
    adminNotes: issue?.adminNotes ?? "",
  };
}
