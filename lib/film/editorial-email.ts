import type { OneFilmIssue } from "@prisma/client";
import {
  editorialTextToHtml,
  editorialTextToPlainText,
} from "@/lib/editorial/formatting";

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
  const opening = tr
    ? "Bu hafta sonu için — zaman ayırmaya değer, özenle seçilmiş tek bir film."
    : "For this weekend — one carefully chosen film worth making time for.";
  const footer = tr
    ? "Daha düşünceli bir izleme listesi için OneRead tarafından hazırlandı."
    : "Composed by OneRead for a more thoughtful watchlist.";
  const words = wordCount(issue.bodyText);
  const readingMinutes = Math.max(1, Math.ceil(words / 220));
  const readingLabel = tr ? `${readingMinutes} dk okuma` : `${readingMinutes} min read`;
  const meta = [
    issue.filmYear ? String(issue.filmYear) : "",
    issue.director?.trim() ?? "",
    issue.filmLanguage?.trim() ?? "",
    issue.runtimeMinutes ? (tr ? `${issue.runtimeMinutes} dk` : `${issue.runtimeMinutes} min`) : "",
  ].filter(Boolean).join(" · ");
  const safeBody = issue.bodyHtml?.trim() || editorialTextToHtml(issue.bodyText);

  const text = [
    dateLabel, "OneFilm", "", `${label} · ${readingLabel}`, issue.filmTitle, meta,
    issue.previewText?.trim() ?? "", "", issue.heroImageCredit?.trim() ?? "",
    editorialTextToPlainText(issue.bodyText), "", issue.sourceUrl ? `${readLabel}: ${issue.sourceUrl}` : "",
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
<html lang="${tr ? "tr" : "en"}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(issue.subject)}</title>
<style>
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0;mso-table-rspace:0}table{border-collapse:collapse!important}img{-ms-interpolation-mode:bicubic}
@media screen and (max-width:680px){
.page-pad{padding:0!important}.masthead{padding:24px 20px!important}.intro-copy,.card-copy{padding-left:22px!important;padding-right:22px!important}
.headline{font-size:34px!important;line-height:1.04!important}.email-shell{border-radius:0!important}
}
</style>
</head>
<body style="width:100%!important;margin:0!important;padding:0!important;background:#EEEAF0;color:#241B29;">${preview}
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#EEEAF0">
<tr><td align="center" class="page-pad" style="padding:28px 20px 44px;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="email-shell" bgcolor="#FFFFFF" style="width:100%;max-width:680px;border:1px solid #D9CFDE;border-radius:18px;overflow:hidden;">
<tr><td class="masthead" bgcolor="#241B29" style="padding:28px 32px 27px;color:#FFFFFF;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
<td style="font:700 23px/1 Georgia,'Times New Roman',serif;letter-spacing:-.02em;color:#FFFFFF;">OneRead<span style="color:#DCC6E8;">.</span></td>
<td align="right" style="font:700 10px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#C5B8CC;">OneFilm</td>
</tr></table>
<p style="margin:18px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#C5B8CC;">${escapeHtml(dateLabel)} · ${escapeHtml(readingLabel)}</p>
</td></tr>
<tr><td class="intro-copy" style="padding:30px 32px 20px;"><p style="margin:0;font:italic 16px/1.55 Georgia,'Times New Roman',serif;color:#6B5F73;">${escapeHtml(opening)}</p></td></tr>
<tr><td style="padding:0 16px 16px;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FAF7FC" style="width:100%;border:1px solid #E3D6EA;border-radius:14px;overflow:hidden;">
<tr><td style="padding:20px 18px 15px;"><span style="display:inline-block;padding:7px 11px;border-radius:999px;background:#DCC6E8;color:#241B29;font:bold 10px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(label)}</span><span style="float:right;padding-top:6px;font:10px/1.2 Arial,Helvetica,sans-serif;color:#8A7E92;letter-spacing:.08em;text-transform:uppercase;">Curated by OneRead</span></td></tr>
${image}
<tr><td class="card-copy" style="padding:28px 38px 38px;">
<h1 class="headline" style="margin:0 0 10px;font:700 43px/1.02 Georgia,'Times New Roman',serif;letter-spacing:-.04em;color:#241B29;">${escapeHtml(issue.filmTitle)}</h1>
${meta ? `<p style="margin:0 0 18px;font:10.5px/1.55 Arial,Helvetica,sans-serif;color:#8A7E92;text-transform:uppercase;letter-spacing:.09em;">${escapeHtml(meta)}</p>` : ""}
${issue.previewText ? `<p style="margin:0 0 22px;font:17px/1.55 Georgia,'Times New Roman',serif;color:#62546A;">${escapeHtml(issue.previewText)}</p>` : ""}
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr><td width="52" height="4" bgcolor="#7B5E8E" style="width:52px;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
<div style="font:16px/1.76 Arial,Helvetica,sans-serif;color:#342A39;">${safeBody}</div>
${issue.sourceName ? `<p style="margin:24px 0 0;font:10.5px/1.55 Arial,Helvetica,sans-serif;color:#8A7E92;text-transform:uppercase;letter-spacing:.09em;">${escapeHtml(issue.sourceName)}</p>` : ""}
${cta}
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:24px 28px 30px;border-top:1px solid #E8E0EB;">
<p style="margin:0 0 8px;font:italic 13px/1.55 Georgia,'Times New Roman',serif;color:#6B5F73;">${escapeHtml(tagline)}</p>
<p style="margin:0;font:10.5px/1.65 Arial,Helvetica,sans-serif;color:#9A8FA0;letter-spacing:.02em;"><strong style="color:#6B5F73;">OneRead</strong> · ${escapeHtml(footer)}<br><a href="${escapeAttr(links.unsubscribe)}" style="color:#7B6A84;text-decoration:underline;">${escapeHtml(unsubscribe)}</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject: issue.subject.trim(), text, html };
}

function wordCount(value: string): number { const clean = value.trim(); return clean ? clean.split(/\s+/u).length : 0; }
function escapeHtml(value: string): string { return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function escapeAttr(value: string): string { return escapeHtml(value); }
