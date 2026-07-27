import type { OneArticleIssue } from "@prisma/client";
import { getEmailStrings, htmlLangFor, localeFor } from "@/lib/i18n";
import {
  editorialTextToHtml,
  editorialTextToPlainText,
} from "@/lib/editorial/formatting";

export interface EditorialEmailLinks {
  unsubscribe: string;
}

export interface RenderedEditorialEmail {
  subject: string;
  text: string;
  html: string;
}

type EmailIssue = Pick<
  OneArticleIssue,
  | "readingLanguage"
  | "subject"
  | "previewText"
  | "headline"
  | "bodyText"
  | "bodyHtml"
  | "heroImageUrl"
  | "heroImageAlt"
  | "heroImageCredit"
  | "sourceTitle"
  | "sourceName"
  | "sourceUrl"
  | "ctaLabel"
  | "scheduledFor"
>;

/**
 * The single renderer used by panel preview, test delivery and live delivery.
 *
 * The visual grammar is inspired by a modern editorial newsletter—date line,
 * high-contrast section chip, image-led card and generous reading rhythm—but
 * is deliberately reduced to OneArticle's promise: one article, not a feed.
 */
export function renderEditorialEmail(
  issue: EmailIssue,
  links: EditorialEmailLinks,
): RenderedEditorialEmail {
  const t = getEmailStrings(issue.readingLanguage);
  const labels = formatLabels(issue.readingLanguage);
  const date = issue.scheduledFor ?? new Date();
  const dateLabel = date.toLocaleDateString(localeFor(issue.readingLanguage), {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Istanbul",
  });
  const sourceLine = [issue.sourceName, issue.sourceTitle].filter(Boolean).join(" · ");
  const readLabel = issue.ctaLabel?.trim() || t.readLabel;
  const safeBody = issue.bodyHtml?.trim() || editorialTextToHtml(issue.bodyText);
  const readingMinutes = Math.max(1, Math.ceil(wordCount(issue.bodyText) / 220));
  const readingLabel = labels.readingTime(readingMinutes);

  const text = [
    dateLabel,
    "OneArticle",
    "",
    `${labels.article} · ${readingLabel}`,
    issue.headline,
    issue.previewText?.trim() ?? "",
    "",
    issue.heroImageCredit?.trim() ?? "",
    sourceLine,
    "",
    editorialTextToPlainText(issue.bodyText),
    "",
    issue.sourceUrl ? `${readLabel}: ${issue.sourceUrl}` : "",
    "",
    t.tagline,
    `${t.unsubscribeLabel}: ${links.unsubscribe}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const preview = issue.previewText
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent;">${escapeHtml(issue.previewText)}${preheaderPad()}</div>`
    : "";
  const image = issue.heroImageUrl
    ? `<tr>
        <td style="padding:0 16px 0;">
          <img src="${escapeAttr(issue.heroImageUrl)}" alt="${escapeAttr(issue.heroImageAlt ?? "")}" width="608" style="display:block;width:100%;max-width:608px;height:auto;border:0;border-radius:12px;line-height:100%;outline:none;text-decoration:none;" />
        </td>
      </tr>
      ${
        issue.heroImageCredit
          ? `<tr><td style="padding:8px 18px 0;font:11px/1.4 Arial,Helvetica,sans-serif;color:#8A8A86;">${escapeHtml(issue.heroImageCredit)}</td></tr>`
          : ""
      }`
    : "";
  const deck = issue.previewText
    ? `<p style="margin:0 0 20px;font:16px/1.55 Arial,Helvetica,sans-serif;color:#565653;">${escapeHtml(issue.previewText)}</p>`
    : "";
  const source = sourceLine
    ? `<p style="margin:22px 0 0;font:11.5px/1.55 Arial,Helvetica,sans-serif;color:#8A8A86;text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(labels.source)} · ${escapeHtml(sourceLine)}</p>`
    : "";
  const cta = issue.sourceUrl
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top:26px;">
        <tr>
          <td bgcolor="#FFE144" style="border-radius:999px;">
            <a href="${escapeAttr(issue.sourceUrl)}" style="display:inline-block;padding:12px 18px;font:bold 13px/1.2 Arial,Helvetica,sans-serif;color:#090909;text-decoration:none;">${escapeHtml(readLabel)} ↗</a>
          </td>
        </tr>
      </table>`
    : "";

  const html = `<!doctype html>
<html lang="${htmlLangFor(issue.readingLanguage)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(issue.subject)}</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    table{border-collapse:collapse!important}
    img{-ms-interpolation-mode:bicubic}
    @media screen and (max-width:680px){
      .page-pad{padding:0!important}
      .masthead{padding:24px 20px!important}
      .intro-copy,.card-copy{padding-left:22px!important;padding-right:22px!important}
      .headline{font-size:31px!important;line-height:1.08!important}
      .email-shell{border-radius:0!important}
    }
  </style>
</head>
<body style="width:100%!important;margin:0!important;padding:0!important;background:#EFEEE9;color:#171714;">
${preview}
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#EFEEE9">
  <tr>
    <td align="center" class="page-pad" style="padding:28px 20px 44px;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="email-shell" bgcolor="#FFFFFF" style="width:100%;max-width:680px;border:1px solid #D8D6CF;border-radius:18px;overflow:hidden;">
        <tr>
          <td class="masthead" bgcolor="#171714" style="padding:28px 32px 26px;color:#FFFFFF;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font:700 23px/1 Georgia,'Times New Roman',serif;letter-spacing:-.02em;color:#FFFFFF;">OneRead<span style="color:#FFE144;">.</span></td>
                <td align="right" style="font:700 10px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#B9B8B2;">OneArticle</td>
              </tr>
            </table>
            <p style="margin:18px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#B9B8B2;">${escapeHtml(dateLabel)} · ${escapeHtml(readingLabel)}</p>
          </td>
        </tr>
        <tr>
          <td class="intro-copy" style="padding:30px 32px 20px;">
            <p style="margin:0;font:italic 16px/1.55 Georgia,'Times New Roman',serif;color:#626159;">${escapeHtml(labels.opening)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 16px 16px;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FBFBF8" style="width:100%;border:1px solid #DEDDD7;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:20px 18px 15px;">
                  <span style="display:inline-block;padding:7px 11px;border-radius:999px;background:#FFE144;color:#171714;font:bold 10px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(labels.article)}</span>
                  <span style="float:right;padding-top:6px;font:10px/1.2 Arial,Helvetica,sans-serif;color:#77766F;letter-spacing:.08em;text-transform:uppercase;">Curated by OneRead</span>
                </td>
              </tr>
              ${image}
              <tr>
                <td class="card-copy" style="padding:28px 38px 38px;">
                  <h1 class="headline" style="margin:0 0 16px;font:700 40px/1.04 Georgia,'Times New Roman',serif;letter-spacing:-.035em;color:#171714;">${escapeHtml(issue.headline)}</h1>
                  ${deck}
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr><td width="52" height="4" bgcolor="#FFE144" style="width:52px;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
                  <div style="font:16px/1.76 Arial,Helvetica,sans-serif;color:#2D2C28;">${safeBody}</div>
                  ${source}
                  ${cta}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 28px 30px;border-top:1px solid #E5E3DD;">
            <p style="margin:0 0 8px;font:italic 13px/1.55 Georgia,'Times New Roman',serif;color:#66645D;">${escapeHtml(t.tagline)}</p>
            <p style="margin:0;font:10.5px/1.65 Arial,Helvetica,sans-serif;color:#96948D;letter-spacing:.02em;">
              <strong style="color:#626159;">OneRead</strong> · ${escapeHtml(labels.footer)}
              <br><a href="${escapeAttr(links.unsubscribe)}" style="color:#77766F;text-decoration:underline;">${escapeHtml(t.unsubscribeLabel)}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject: issue.subject.trim(), text, html };
}

function formatLabels(language: string) {
  switch (language) {
    case "Turkish":
      return {
        article: "Makale",
        source: "Kaynak",
        opening: "Günaydın — tüm dikkatinizi hak eden tek bir fikir.",
        footer: "Daha sakin bir gelen kutusu için özenle seçildi.",
        readingTime: (minutes: number) => `${minutes} dk okuma`,
      };
    case "Spanish":
      return {
        article: "Artículo",
        source: "Fuente",
        opening: "Buenos días — una idea que merece toda tu atención.",
        footer: "Elegido con cuidado para una bandeja de entrada más tranquila.",
        readingTime: (minutes: number) => `${minutes} min de lectura`,
      };
    case "French":
      return {
        article: "Article",
        source: "Source",
        opening: "Bonjour — une idée qui mérite toute votre attention.",
        footer: "Choisi avec soin pour une boîte de réception plus calme.",
        readingTime: (minutes: number) => `${minutes} min de lecture`,
      };
    case "German":
      return {
        article: "Artikel",
        source: "Quelle",
        opening: "Guten Morgen — eine Idee, die Ihre volle Aufmerksamkeit verdient.",
        footer: "Sorgfältig ausgewählt für einen ruhigeren Posteingang.",
        readingTime: (minutes: number) => `${minutes} Min. Lesezeit`,
      };
    default:
      return {
        article: "Article",
        source: "Source",
        opening: "Good morning — one idea worth your full attention.",
        footer: "Chosen with care for a quieter inbox.",
        readingTime: (minutes: number) => `${minutes} min read`,
      };
  }
}

function wordCount(value: string): number {
  const clean = value.trim();
  return clean ? clean.split(/\s+/u).length : 0;
}

function preheaderPad(): string {
  return "&nbsp;&zwnj;".repeat(80);
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
