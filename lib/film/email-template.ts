import type { FilmDailyIssue } from "@prisma/client";
import type { FilmIssueContent } from "./types";

export interface FilmEmailContext {
  date: string;
  emailLanguage: string;
  links: { unsubscribe: string };
}

export interface RenderedFilmEmail {
  subject: string;
  text: string;
  html: string;
}

const ACCENT = "#7B5E8E";
const BG = "#F8F4FA";
const BORDER = "#E3D6EA";

interface Labels {
  whyThisFilm: string;
  whatItFeelsLike: string;
  bestWatchedWhen: string;
  beforeYouPressPlay: string;
  runtimeUnit: (n: number) => string;
  footerTagline: string;
  footerFrom: string;
  unsubscribe: string;
}

function labelsFor(language: string): Labels {
  if (language === "Turkish") {
    return {
      whyThisFilm: "Neden bu film?",
      whatItFeelsLike: "Nasıl hissettiriyor?",
      bestWatchedWhen: "Ne zaman iyi gider?",
      beforeYouPressPlay: "Başlamadan önce",
      runtimeUnit: (n) => `${n} dk`,
      footerTagline: "OneFilm, OneRead ailesinden tek film notudur. Tek film, kısa bir not, izlemeye değer bir sebep.",
      footerFrom: "OneFilm’i OneRead üzerinden alıyorsun.",
      unsubscribe: "Aboneliği bırak",
    };
  }
  return {
    whyThisFilm: "Why this film",
    whatItFeelsLike: "What it feels like",
    bestWatchedWhen: "Best watched when",
    beforeYouPressPlay: "Before you press play",
    runtimeUnit: (n) => `${n} min`,
    footerTagline: "OneFilm is one film note from the OneRead family. One film, a short note, a reason worth watching.",
    footerFrom: "You’re receiving OneFilm from OneRead.",
    unsubscribe: "Unsubscribe",
  };
}

export function renderFilmEmail(
  issue: Pick<FilmDailyIssue, "subject" | "previewText" | "contentJson">,
  ctx: FilmEmailContext,
): RenderedFilmEmail {
  const content = issue.contentJson as unknown as FilmIssueContent;
  const subject = issue.subject;
  const L = labelsFor(ctx.emailLanguage);
  const greeting = content.greeting ?? content.openingLine ?? "";

  const metaLines = buildMetaLines(content.metadata, L);

  const text = [
    "OneFilm",
    "",
    ctx.date,
    ...(greeting ? ["", greeting] : []),
    "",
    content.filmTitle,
    ...metaLines.map((m) => m.replace(/<[^>]+>/g, "")),
    ...(content.greeting && content.openingLine ? ["", content.openingLine] : []),
    "",
    section(L.whyThisFilm, content.whyThisFilm),
    section(L.whatItFeelsLike, content.whatItFeelsLike),
    section(L.bestWatchedWhen, content.bestWatchedWhen),
    section(L.beforeYouPressPlay, content.beforeYouPressPlay),
    "",
    content.spoilerNote,
    "",
    L.footerTagline,
    `${L.unsubscribe}: ${ctx.links.unsubscribe}`,
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");

  const block = (title: string, body: string): string =>
    body
      ? `<h2 style="margin:22px 0 8px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(title)}</h2><p style="margin:0;color:#4A3F52;font-size:14px;line-height:1.7;">${escapeHtml(body)}</p>`
      : "";

  const html = `
<!doctype html>
<html lang="${htmlLang(ctx.emailLanguage)}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(issue.previewText ?? greeting)}</div>
  <div style="max-width:540px;margin:0 auto;padding:32px 24px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#241B29;">
    <div style="text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;font-size:12.5px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};">OneFilm</div>
    <div style="text-align:center;margin-top:6px;font-size:12px;color:#8A7E92;">${escapeHtml(ctx.date)}</div>
    <hr style="border:none;border-top:1px solid ${BORDER};margin:26px 0;" />
    ${greeting ? `<p style="margin:0 0 18px 0;font-family:ui-serif,Georgia,Cambria,serif;font-size:18px;line-height:1.5;">${escapeHtml(greeting)}</p>` : ""}
    <h1 style="margin:0 0 6px 0;font-family:ui-serif,Georgia,Cambria,serif;font-size:27px;line-height:1.18;font-weight:500;">${escapeHtml(content.filmTitle)}</h1>
    ${metaLines.length ? `<div style="margin:0 0 8px 0;color:#8A7E92;font-size:12.5px;">${metaLines.join(" · ")}</div>` : ""}
    ${content.greeting && content.openingLine ? `<p style="margin:8px 0 0 0;color:#4A3F52;font-size:14px;line-height:1.7;">${escapeHtml(content.openingLine)}</p>` : ""}
    ${block(L.whyThisFilm, content.whyThisFilm)}
    ${block(L.whatItFeelsLike, content.whatItFeelsLike)}
    ${block(L.bestWatchedWhen, content.bestWatchedWhen)}
    ${block(L.beforeYouPressPlay, content.beforeYouPressPlay)}
    ${content.spoilerNote ? `<div style="border-left:3px solid ${ACCENT};padding-left:14px;margin:22px 0 0 0;color:#6B5F73;font-size:13px;line-height:1.6;">${escapeHtml(content.spoilerNote)}</div>` : ""}
    <hr style="border:none;border-top:1px solid ${BORDER};margin:32px 0 18px 0;" />
    <div style="text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;color:#8A7E92;font-size:12.5px;line-height:1.6;">${escapeHtml(L.footerTagline)}</div>
    <div style="margin-top:10px;text-align:center;font-size:11.5px;color:#8A7E92;">${escapeHtml(L.footerFrom)}</div>
    <div style="margin-top:4px;text-align:center;font-size:11.5px;"><a href="${escapeAttr(ctx.links.unsubscribe)}" style="color:#8A7E92;">${escapeHtml(L.unsubscribe)}</a></div>
  </div>
</body>
</html>`.trim();

  return { subject, text, html };
}

function buildMetaLines(meta: FilmIssueContent["metadata"], L: Labels): string[] {
  if (!meta) return [];
  const parts: string[] = [];
  if (meta.year != null) parts.push(String(meta.year));
  if (meta.director) parts.push(escapeHtml(meta.director));
  if (meta.language) parts.push(escapeHtml(meta.language));
  if (meta.runtimeMinutes != null) parts.push(L.runtimeUnit(meta.runtimeMinutes));
  // whereToWatch is only ever shown when verified metadata explicitly provided it.
  if (meta.whereToWatch) parts.push(escapeHtml(meta.whereToWatch));
  return parts;
}

function section(title: string, body: string): string {
  return body ? `${title}\n${body}\n` : "";
}

function htmlLang(language: string): string {
  return language === "Turkish" ? "tr" : "en";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
