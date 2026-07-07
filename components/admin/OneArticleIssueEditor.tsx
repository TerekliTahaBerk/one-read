"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function OneArticleIssueEditor({
  pickId,
  summaryId,
  initialSubject,
  initialPreviewText,
  initialBodyText,
  initialAdminNotes,
}: {
  pickId: string;
  summaryId: string;
  initialSubject: string;
  initialPreviewText: string;
  initialBodyText: string;
  initialAdminNotes: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [previewText, setPreviewText] = useState(initialPreviewText);
  const [bodyText, setBodyText] = useState(initialBodyText);
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/issues/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "edit-content",
          pickId,
          summaryId,
          subjectOverride: subject,
          previewTextOverride: previewText,
          bodyTextOverride: bodyText,
          adminNotes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      setMsg("Saved. Review preview before approval or send.");
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field label="Subject override">
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Preview text override">
          <input className={inputCls} value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
        </Field>
      </div>
      <Field label="Body text override">
        <textarea className={`${inputCls} h-56`} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
      </Field>
      <Field label="Admin notes">
        <textarea className={`${inputCls} h-24`} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-admin-accent px-4 py-1.5 text-[12.5px] text-white hover:bg-admin-accent-strong disabled:opacity-40"
        >
          {busy ? "Saving..." : "Save manual edits"}
        </button>
        {msg && <span className="text-[12.5px] text-admin-body font-sans">{msg}</span>}
      </div>
      <p className="text-[11.5px] text-admin-muted font-sans">
        Saves as overrides. This does not approve, schedule, or send the issue.
      </p>
    </form>
  );
}

const inputCls =
  "block w-full rounded-lg bg-admin-surface/80 border border-admin-line px-3 py-2 text-[13px] text-admin-ink focus:border-admin-ink focus:outline-none";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-eyebrow text-admin-muted font-sans mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
