import type { NewsDailyIssue } from "@prisma/client";
import type { NewsAgendaItem, NewsIssueContent } from "./types";

export interface NewsEmailContext {
  date: string;
  briefingLanguage: string;
  regionFocus: string;
  links: { unsubscribe: string };
}

export interface RenderedNewsEmail {
  subject: string;
  text: string;
  html: string;
}

const ACCENT = "#53647A";
const BG = "#F5F7FA";
const BORDER = "#DCE3EA";

interface Labels {
  agenda: string;
  alsoToday: string;
  weekend: string;
  sources: string;
  why: string;
  readSource: string;
  footerTagline: string;
  footerFrom: string;
  unsubscribe: string;
}

function labelsFor(language: string): Labels {
  if (language === "Turkish") {
    return {
      agenda: "Bugünün gündemi",
      alsoToday: "Bugün ayrıca",
      weekend: "Hafta sonu eki",
      sources: "Kaynaklar",
      why: "Neden önemli?",
      readSource: "Kaynağı oku →",
      footerTagline: "OneNews, OneRead ailesinin reklamsız sabah gündem özetidir.",
      footerFrom: "OneNews’i OneRead’den alıyorsun.",
      unsubscribe: "Aboneliği bırak",
    };
  }
  return {
    agenda: "Today’s agenda",
    alsoToday: "Also today",
    weekend: "Weekend extra",
    sources: "Sources",
    why: "Why it matters",
    readSource: "Read the source →",
    footerTagline: "OneNews is the ad-free morning brief from the OneRead family.",
    footerFrom: "You’re receiving OneNews from OneRead.",
    unsubscribe: "Unsubscribe",
  };
}

/**
 * Normalizes stored content into the 5-minute-brief shape. Old records only have
 * `topStories`/`openingLine`; new records have `agendaItems`/`greeting`/etc.
 */
function normalize(content: NewsIssueContent): {
  greeting: string;
  mainHeadline: string;
  mainSummary: string;
  agenda: NewsAgendaItem[];
  alsoToday: string[];
  weekend: NonNullable<NewsIssueContent["weekendExtra"]>;
  sources: { source: string; url: string }[];
} {
  const agenda: NewsAgendaItem[] =
    content.agendaItems && content.agendaItems.length > 0
      ? content.agendaItems
      : (content.topStories ?? []).map((s) => ({
          category: "",
          title: s.title,
          summary: s.summary,
          whyItMatters: s.whyItMatters || undefined,
          source: s.source,
          url: s.url,
        }));
  return {
    greeting: content.greeting ?? "",
    mainHeadline: content.mainHeadline ?? "",
    mainSummary: content.mainSummary ?? content.openingLine ?? "",
    agenda,
    alsoToday: content.alsoToday ?? [],
    weekend: content.weekendExtra ?? [],
    sources: content.sources ?? [],
  };
}

export function renderNewsEmail(
  issue: Pick<NewsDailyIssue, "subject" | "previewText" | "contentJson">,
  ctx: NewsEmailContext,
): RenderedNewsEmail {
  const content = issue.contentJson as unknown as NewsIssueContent;
  const subject = issue.subject;
  const L = labelsFor(ctx.briefingLanguage);
  const c = normalize(content);

  /* --------------------------- plain text --------------------------- */
  const text = [
    "OneNews",
    "",
    ctx.date,
    ...(c.greeting ? ["", c.greeting] : []),
    ...(c.mainHeadline ? ["", c.mainHeadline] : []),
    ...(c.mainSummary ? ["", c.mainSummary] : []),
    "",
    L.agenda,
    ...c.agenda.flatMap((a) => [
      `• ${a.category ? `[${a.category}] ` : ""}${a.title} (${a.source})`,
      `  ${a.summary}`,
      ...(a.whyItMatters ? [`  ${L.why} ${a.whyItMatters}`] : []),
      `  ${a.url}`,
    ]),
    ...(c.alsoToday.length ? ["", L.alsoToday, ...c.alsoToday.map((x) => `• ${x}`)] : []),
    ...(c.weekend.length
      ? ["", L.weekend, ...c.weekend.flatMap((w) => [`• ${w.title} (${w.source})`, `  ${w.summary}`, `  ${w.url}`])]
      : []),
    "",
    L.sources,
    ...c.sources.map((s) => `- ${s.source}: ${s.url}`),
    "",
    L.footerTagline,
    `${L.unsubscribe}: ${ctx.links.unsubscribe}`,
  ].join("\n");

  /* ------------------------------ html ------------------------------ */
  const agendaBlocks = c.agenda
    .map(
      (a) => `
      <div style="margin:0 0 20px 0;">
        ${a.category ? `<div style="margin-bottom:3px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(a.category)}</div>` : ""}
        <a href="${escapeAttr(a.url)}" style="color:#1B2430;text-decoration:none;font-family:ui-serif,Georgia,Cambria,serif;font-size:17px;line-height:1.35;font-weight:600;">${escapeHtml(a.title)}</a>
        <div style="margin-top:2px;font-size:11px;letter-spacing:0.03em;text-transform:uppercase;color:#7A8794;">${escapeHtml(a.source)}</div>
        <p style="margin:7px 0 0 0;color:#42505F;font-size:14px;line-height:1.6;">${escapeHtml(a.summary)}</p>
        ${a.whyItMatters ? `<p style="margin:5px 0 0 0;color:#5B6877;font-size:13px;line-height:1.55;"><strong style="color:#1B2430;">${escapeHtml(L.why)}</strong> ${escapeHtml(a.whyItMatters)}</p>` : ""}
        <div style="margin-top:7px;"><a href="${escapeAttr(a.url)}" style="color:${ACCENT};font-size:12px;">${escapeHtml(L.readSource)}</a></div>
      </div>`,
    )
    .join("");

  const alsoTodayBlock = c.alsoToday.length
    ? `<div style="margin:0 0 22px 0;">
        <h2 style="margin:0 0 8px 0;font-size:12.5px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(L.alsoToday)}</h2>
        <ul style="margin:0;padding-left:18px;color:#42505F;font-size:13.5px;line-height:1.7;">
          ${c.alsoToday.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
        </ul>
      </div>`
    : "";

  const weekendBlock = c.weekend.length
    ? `<div style="border-left:3px solid ${ACCENT};padding-left:14px;margin:0 0 22px 0;">
        <div style="font-size:12.5px;letter-spacing:0.06em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(L.weekend)}</div>
        ${c.weekend
          .map(
            (w) => `<div style="margin-top:8px;">
              <a href="${escapeAttr(w.url)}" style="color:#1B2430;text-decoration:none;font-family:ui-serif,Georgia,Cambria,serif;font-size:15px;">${escapeHtml(w.title)}</a>
              <p style="margin:4px 0 0 0;color:#42505F;font-size:13.5px;line-height:1.55;">${escapeHtml(w.summary)}</p>
            </div>`,
          )
          .join("")}
      </div>`
    : "";

  const html = `
<!doctype html>
<html lang="${htmlLang(ctx.briefingLanguage)}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(issue.previewText ?? c.mainHeadline ?? "")}</div>
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#1B2430;">
    <div style="text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;font-size:12.5px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};">OneNews</div>
    <div style="text-align:center;margin-top:6px;font-size:12px;color:#7A8794;">${escapeHtml(ctx.date)}</div>
    <hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0;" />
    ${c.greeting ? `<p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:${ACCENT};">${escapeHtml(c.greeting)}</p>` : ""}
    ${c.mainHeadline ? `<h1 style="margin:0 0 12px 0;font-family:ui-serif,Georgia,Cambria,serif;font-size:23px;line-height:1.3;font-weight:600;color:#1B2430;">${escapeHtml(c.mainHeadline)}</h1>` : ""}
    ${c.mainSummary ? `<p style="margin:0 0 26px 0;font-size:15px;line-height:1.65;color:#34414F;">${escapeHtml(c.mainSummary)}</p>` : ""}
    <h2 style="margin:0 0 16px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(L.agenda)}</h2>
    ${agendaBlocks}
    ${alsoTodayBlock}
    ${weekendBlock}
    <h2 style="margin:24px 0 10px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(L.sources)}</h2>
    <ul style="margin:0;padding-left:18px;color:#42505F;font-size:13px;line-height:1.7;">
      ${c.sources.map((s) => `<li><a href="${escapeAttr(s.url)}" style="color:${ACCENT};">${escapeHtml(s.source)}</a></li>`).join("")}
    </ul>
    <hr style="border:none;border-top:1px solid ${BORDER};margin:32px 0 18px 0;" />
    <div style="text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;color:#7A8794;font-size:12.5px;line-height:1.6;">${escapeHtml(L.footerTagline)}</div>
    <div style="margin-top:10px;text-align:center;font-size:11.5px;color:#7A8794;">${escapeHtml(L.footerFrom)}</div>
    <div style="margin-top:4px;text-align:center;font-size:11.5px;"><a href="${escapeAttr(ctx.links.unsubscribe)}" style="color:#7A8794;">${escapeHtml(L.unsubscribe)}</a></div>
  </div>
</body>
</html>`.trim();

  return { subject, text, html };
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
