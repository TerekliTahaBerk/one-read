import type { OneArticleIssue } from "@prisma/client";
import { getEmailStrings, htmlLangFor, localeFor } from "@/lib/i18n";

export interface EditorialEmailLinks {
  unsubscribe: string;
}

export interface RenderedEditorialEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderEditorialEmail(
  issue: Pick<
    OneArticleIssue,
    | "readingLanguage"
    | "subject"
    | "previewText"
    | "headline"
    | "bodyText"
    | "bodyHtml"
    | "sourceTitle"
    | "sourceName"
    | "sourceUrl"
    | "ctaLabel"
    | "scheduledFor"
  >,
  links: EditorialEmailLinks,
): RenderedEditorialEmail {
  const t = getEmailStrings(issue.readingLanguage);
  const date = issue.scheduledFor ?? new Date();
  const dateLabel = date.toLocaleDateString(localeFor(issue.readingLanguage), {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Istanbul",
  });
  const sourceLine = [issue.sourceName, issue.sourceTitle].filter(Boolean).join(" · ");
  const readLabel = issue.ctaLabel?.trim() || t.readLabel;
  const safeBody = issue.bodyHtml?.trim() || paragraphsToHtml(issue.bodyText);

  const text = [
    "OneRead",
    dateLabel,
    "",
    issue.headline,
    sourceLine,
    "",
    issue.bodyText.trim(),
    "",
    issue.sourceUrl ? `${readLabel}: ${issue.sourceUrl}` : "",
    "",
    t.tagline,
    `${t.unsubscribeLabel}: ${links.unsubscribe}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const preview = issue.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(issue.previewText)}</div>`
    : "";
  const source = sourceLine
    ? `<div style="margin:0 0 10px;font:12px/1.5 ui-sans-serif,system-ui,sans-serif;color:#8A7D6B;letter-spacing:.05em;text-transform:uppercase;">${escapeHtml(sourceLine)}</div>`
    : "";
  const cta = issue.sourceUrl
    ? `<div style="margin-top:28px;"><a href="${escapeAttr(issue.sourceUrl)}" style="display:inline-block;border-radius:10px;background:#1B1612;color:#FDFBF5;padding:12px 18px;text-decoration:none;font:14px/1.2 ui-sans-serif,system-ui,sans-serif;">${escapeHtml(readLabel)} →</a></div>`
    : "";

  const html = `<!doctype html>
<html lang="${htmlLangFor(issue.readingLanguage)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(issue.subject)}</title></head>
<body style="margin:0;background:#F6F1E6;color:#1B1612;">
${preview}
<div style="max-width:540px;margin:0 auto;padding:32px 24px;font-family:ui-serif,Georgia,Cambria,serif;">
  <div style="text-align:center;font-size:12px;letter-spacing:.22em;text-transform:uppercase;font-style:italic;color:#6B5F50;">OneRead</div>
  <div style="margin-top:7px;text-align:center;font:12px/1.5 ui-sans-serif,system-ui,sans-serif;color:#9C8F7E;">${escapeHtml(dateLabel)}</div>
  <hr style="border:0;border-top:1px solid #E6DCC8;margin:28px 0;">
  ${source}
  <h1 style="margin:0 0 20px;font-size:28px;line-height:1.16;font-weight:500;letter-spacing:-.015em;">${escapeHtml(issue.headline)}</h1>
  <div style="font-size:15.5px;line-height:1.7;">${safeBody}</div>
  ${cta}
  <hr style="border:0;border-top:1px solid #E6DCC8;margin:34px 0 22px;">
  <div style="text-align:center;font-size:13px;font-style:italic;color:#9C8F7E;">${escapeHtml(t.tagline)}</div>
  <div style="margin-top:9px;text-align:center;font:11.5px/1.5 ui-sans-serif,system-ui,sans-serif;"><a href="${escapeAttr(links.unsubscribe)}" style="color:#9C8F7E;">${escapeHtml(t.unsubscribeLabel)}</a></div>
</div>
</body>
</html>`;

  return { subject: issue.subject.trim(), text, html };
}

function paragraphsToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
