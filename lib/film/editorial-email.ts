import type { OneFilmIssue } from "@prisma/client";

export interface FilmEditorialEmailLinks { unsubscribe: string }
export interface RenderedFilmEditorialEmail { subject: string; text: string; html: string }

type EmailIssue = Pick<OneFilmIssue,
  "emailLanguage" | "subject" | "previewText" | "filmTitle" | "bodyText" | "bodyHtml" |
  "heroImageUrl" | "heroImageAlt" | "heroImageCredit" | "filmYear" | "director" |
  "filmLanguage" | "runtimeMinutes" | "sourceName" | "sourceUrl" | "ctaLabel" | "scheduledFor"
>;

export function renderFilmEditorialEmail(
  issue: EmailIssue,
  links: FilmEditorialEmailLinks,
): RenderedFilmEditorialEmail {
  const tr = issue.emailLanguage === "Turkish";
  const date = issue.scheduledFor ?? new Date();
  const dateLabel = date.toLocaleDateString(tr ? "tr-TR" : "en-GB", {
    weekday: "long", month: "long", day: "numeric", timeZone: "Europe/Istanbul",
  });
  const label = tr ? "Film" : "Film";
  const noteLabel = tr ? "film notu" : "film note";
  const readLabel = issue.ctaLabel?.trim() || (tr ? "Film hakkında daha fazla bilgi" : "Learn more about the film");
  const unsubscribe = tr ? "Aboneliği bırak" : "Unsubscribe";
  const tagline = tr ? "Tek film. Kısa bir not. İzlemeye değer bir sebep." : "One film. A short note. A reason worth watching.";
  const words = wordCount(issue.bodyText);
  const readingMinutes = Math.max(1, Math.ceil(words / 220));
  const readingLabel = tr ? `${readingMinutes} dk okuma` : `${readingMinutes} min read`;
  const meta = [
    issue.filmYear ? String(issue.filmYear) : "",
    issue.director?.trim() ?? "",
    issue.filmLanguage?.trim() ?? "",
    issue.runtimeMinutes ? (tr ? `${issue.runtimeMinutes} dk` : `${issue.runtimeMinutes} min`) : "",
  ].filter(Boolean).join(" · ");
  const safeBody = issue.bodyHtml?.trim() || paragraphsToHtml(issue.bodyText);

  const text = [
    dateLabel, "OneFilm", "", `${label} · ${readingLabel}`, issue.filmTitle, meta,
    issue.previewText?.trim() ?? "", "", issue.heroImageCredit?.trim() ?? "",
    issue.bodyText.trim(), "", issue.sourceUrl ? `${readLabel}: ${issue.sourceUrl}` : "",
    "", tagline, `${unsubscribe}: ${links.unsubscribe}`,
  ].filter(Boolean).join("\n");

  const preview = issue.previewText
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent;">${escapeHtml(issue.previewText)}${"&nbsp;&zwnj;".repeat(80)}</div>`
    : "";
  const image = issue.heroImageUrl ? `
    <tr><td style="padding:0 16px;"><img src="${escapeAttr(issue.heroImageUrl)}" alt="${escapeAttr(issue.heroImageAlt ?? "")}" width="608" style="display:block;width:100%;max-width:608px;height:auto;border:0;border-radius:12px;"></td></tr>
    ${issue.heroImageCredit ? `<tr><td style="padding:8px 18px 0;font:11px/1.4 Arial,Helvetica,sans-serif;color:#8A7E92;">${escapeHtml(issue.heroImageCredit)}</td></tr>` : ""}`
    : "";
  const cta = issue.sourceUrl ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top:26px;"><tr><td bgcolor="#DCC6E8" style="border-radius:999px;"><a href="${escapeAttr(issue.sourceUrl)}" style="display:inline-block;padding:12px 18px;font:bold 13px/1.2 Arial,Helvetica,sans-serif;color:#241B29;text-decoration:none;">${escapeHtml(readLabel)} ↗</a></td></tr></table>` : "";

  const html = `<!doctype html>
<html lang="${tr ? "tr" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(issue.subject)}</title>
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0;mso-table-rspace:0}table{border-collapse:collapse!important}img{-ms-interpolation-mode:bicubic}@media screen and (max-width:680px){.page-pad{padding-left:12px!important;padding-right:12px!important}.card-copy{padding-left:20px!important;padding-right:20px!important}.headline{font-size:30px!important}}</style></head>
<body style="width:100%!important;margin:0!important;padding:0!important;background:#fff;color:#241B29;">${preview}
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" class="page-pad" style="padding:16px 24px 36px;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;">
<tr><td style="padding:0 4px 14px;font:11px/1.5 Arial,Helvetica,sans-serif;color:#8A7E92;">${escapeHtml(dateLabel)}<span style="float:right;font-weight:bold;letter-spacing:.08em;color:#241B29;">OneFilm</span></td></tr>
<tr><td><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FAF7FC" style="width:100%;border:1px solid #E3D6EA;border-radius:15px;overflow:hidden;">
<tr><td style="padding:18px 16px 14px;"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#DCC6E8;color:#241B29;font:bold 12px/1 Arial,Helvetica,sans-serif;letter-spacing:.1em;text-transform:uppercase;">${label}</span><span style="float:right;padding-top:5px;font:11px/1.2 Arial,Helvetica,sans-serif;color:#8A7E92;text-transform:uppercase;">${escapeHtml(readingLabel)}</span></td></tr>
${image}
<tr><td class="card-copy" style="padding:24px 28px 30px;">
<h1 class="headline" style="margin:0 0 8px;font:700 36px/1.08 Georgia,'Times New Roman',serif;letter-spacing:-.02em;color:#241B29;">${escapeHtml(issue.filmTitle)}</h1>
${meta ? `<p style="margin:0 0 16px;font:12px/1.5 Arial,Helvetica,sans-serif;color:#8A7E92;text-transform:uppercase;letter-spacing:.05em;">${escapeHtml(meta)}</p>` : ""}
${issue.previewText ? `<p style="margin:0 0 20px;font:16px/1.55 Arial,Helvetica,sans-serif;color:#56495E;">${escapeHtml(issue.previewText)}</p>` : ""}
<div style="height:3px;width:42px;margin:0 0 22px;background:#7B5E8E;"></div>
<div style="font:15.5px/1.68 Arial,Helvetica,sans-serif;color:#342A39;">${safeBody}</div>
${issue.sourceName ? `<p style="margin:22px 0 0;font:11.5px/1.55 Arial,Helvetica,sans-serif;color:#8A7E92;text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(issue.sourceName)}</p>` : ""}
${cta}</td></tr></table></td></tr>
<tr><td height="14" style="height:14px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td bgcolor="#F2EFF4" style="padding:24px 22px 28px;border-radius:8px;"><p style="margin:0 0 12px;font:italic 13px/1.55 Georgia,'Times New Roman',serif;color:#6B5F73;">${escapeHtml(tagline)}</p><p style="margin:0;font:11.5px/1.6 Arial,Helvetica,sans-serif;color:#8A7E92;"><strong style="color:#56495E;">OneRead · OneFilm</strong><br><a href="${escapeAttr(links.unsubscribe)}" style="color:#8A7E92;text-decoration:underline;">${escapeHtml(unsubscribe)}</a></p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: issue.subject.trim(), text, html };
}

function paragraphsToHtml(text: string): string {
  return text.trim().split(/\n{2,}/).filter(Boolean).map((p) => `<p style="margin:0 0 18px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
}
function wordCount(value: string): number { const clean = value.trim(); return clean ? clean.split(/\s+/u).length : 0; }
function escapeHtml(value: string): string { return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function escapeAttr(value: string): string { return escapeHtml(value); }
