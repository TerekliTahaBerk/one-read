"use client";

import { useState, type RefObject } from "react";

export function FormattingToolbar({
  textareaRef,
  value,
  onChange,
  disabled = false,
}: {
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  function apply(before: string, after = before, placeholder = "text") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + before.length;
      textarea.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const selected = value.slice(lineStart, end) || "List item";
    const nextBlock = selected
      .split("\n")
      .map((line, index) => (prefix === "1. " ? `${index + 1}. ${line}` : `${prefix}${line}`))
      .join("\n");
    onChange(`${value.slice(0, lineStart)}${nextBlock}${value.slice(end)}`);
    window.requestAnimationFrame(() => textarea.focus());
  }

  function addLink() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const url = window.prompt("Paste a secure link (https://)");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Use a complete http:// or https:// link.");
      return;
    }
    apply("[", `](${url})`, "link text");
  }

  const button =
    "h-8 min-w-8 rounded-md border border-admin-line bg-admin-surface px-2 text-[11.5px] font-medium text-admin-body transition hover:border-admin-line-strong hover:bg-admin-sink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-t-lg border border-b-0 border-admin-line bg-admin-sink/70 p-2"
      aria-label="Body formatting"
    >
      <button type="button" className={button} disabled={disabled} onClick={() => apply("## ", "", "Section heading")} title="Section heading">
        H2
      </button>
      <button type="button" className={button} disabled={disabled} onClick={() => apply("**", "**", "bold text")} title="Bold">
        <strong>B</strong>
      </button>
      <button type="button" className={button} disabled={disabled} onClick={() => apply("_", "_", "italic text")} title="Italic">
        <em>I</em>
      </button>
      <span className="mx-0.5 h-5 w-px bg-admin-line" />
      <button type="button" className={button} disabled={disabled} onClick={() => prefixLines("- ")} title="Bulleted list">
        • List
      </button>
      <button type="button" className={button} disabled={disabled} onClick={() => prefixLines("1. ")} title="Numbered list">
        1. List
      </button>
      <button type="button" className={button} disabled={disabled} onClick={() => prefixLines("> ")} title="Pull quote">
        “ Quote
      </button>
      <button type="button" className={button} disabled={disabled} onClick={addLink} title="Link">
        ↗ Link
      </button>
      <span className="ml-auto text-[10.5px] text-admin-muted">
        Formatting is email-safe
      </span>
    </div>
  );
}

export function EmailPreviewPanel({
  html,
  product,
  subject,
  previewText,
  language,
}: {
  html: string;
  product: "OneArticle" | "OneFilm";
  subject: string;
  previewText: string;
  language: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [expanded, setExpanded] = useState(false);
  const width = device === "mobile" ? "max-w-[390px]" : "max-w-full";
  const accent = product === "OneArticle" ? "bg-amber-300" : "bg-purple-200";

  const controls = (
    <div className="flex items-center gap-1">
      {(["desktop", "mobile"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setDevice(item)}
          className={`h-8 rounded-md px-2.5 text-[11px] capitalize transition ${
            device === item
              ? "bg-admin-ink text-white"
              : "border border-admin-line bg-admin-surface text-admin-muted hover:bg-admin-sink"
          }`}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="h-8 rounded-md border border-admin-line bg-admin-surface px-2.5 text-[11px] text-admin-muted hover:bg-admin-sink"
      >
        Expand
      </button>
    </div>
  );

  return (
    <>
      <aside className="xl:sticky xl:top-20 xl:self-start">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">
            Live delivery preview
          </span>
          {controls}
        </div>
        <div className="mb-3 rounded-xl border border-admin-line bg-admin-surface p-3 shadow-admin-sm">
          <div className="flex gap-3">
            <span className={`mt-1 h-9 w-9 shrink-0 rounded-lg ${accent}`} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <strong className="text-[12.5px] text-admin-ink">{product}</strong>
                <span className="text-[10.5px] text-admin-muted">now</span>
              </div>
              <p className="truncate text-[12px] font-medium text-admin-body">
                {subject.trim() || `${product} subject preview`}
              </p>
              <p className="truncate text-[11px] text-admin-muted">
                {previewText.trim() || "Preview text will appear here in supported inboxes."}
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-auto rounded-xl border border-admin-line bg-admin-sink p-2 shadow-admin-sm">
          <iframe
            title={`${product} email preview`}
            srcDoc={html}
            sandbox=""
            className={`mx-auto block h-[calc(100vh-17rem)] min-h-[520px] max-h-[760px] w-full rounded-lg bg-white transition-[max-width] ${width}`}
          />
        </div>
        <p className="mt-2 text-[11px] leading-5 text-admin-muted">
          {language} · this is the same renderer used by test and live delivery. Links are disabled.
        </p>
      </aside>

      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/45 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`${product} full email preview`}>
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-admin-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-admin-line px-4 py-3">
              <div>
                <div className="text-[12px] font-medium text-admin-ink">{product} preview</div>
                <div className="text-[11px] text-admin-muted">{language} · exact delivery renderer</div>
              </div>
              <div className="flex items-center gap-2">
                {controls}
                <button type="button" onClick={() => setExpanded(false)} className="h-8 rounded-md bg-admin-ink px-3 text-[11px] text-white">
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-admin-sink p-3 sm:p-6">
              <iframe
                title={`${product} expanded email preview`}
                srcDoc={html}
                sandbox=""
                className={`mx-auto block h-full min-h-[700px] w-full rounded-xl bg-white shadow-admin-sm ${width}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SchedulePresets({
  product,
  onSelect,
}: {
  product: "article" | "film";
  onSelect: (value: string) => void;
}) {
  const presets =
    product === "article"
      ? [
          { label: "Tomorrow · 07:00", day: "tomorrow" as const, hour: 7 },
          { label: "Tomorrow · 09:00", day: "tomorrow" as const, hour: 9 },
          { label: "Next weekday · 07:00", day: "weekday" as const, hour: 7 },
        ]
      : [
          { label: "Next Saturday · 10:00", day: "saturday" as const, hour: 10 },
          { label: "Next Saturday · 18:00", day: "saturday" as const, hour: 18 },
          { label: "Tomorrow · 20:00", day: "tomorrow" as const, hour: 20 },
        ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(nextIstanbulDateTime(preset.day, preset.hour))}
          className="rounded-md border border-admin-line bg-admin-bg px-2.5 py-1.5 text-[11px] text-admin-muted transition hover:border-admin-line-strong hover:text-admin-ink"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function nextIstanbulDateTime(
  target: "tomorrow" | "weekday" | "saturday",
  hour: number,
): string {
  const now = new Date();
  const istanbulNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }),
  );
  const date = new Date(istanbulNow);
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  if (target === "weekday") {
    while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
  }
  if (target === "saturday") {
    while (date.getDay() !== 6) date.setDate(date.getDate() + 1);
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00`;
}
