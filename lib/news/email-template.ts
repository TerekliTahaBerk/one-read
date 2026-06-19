import type { NewsDailyIssue } from "@prisma/client";
import type { NewsIssueContent } from "./types";

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

export function renderNewsEmail(
  issue: Pick<NewsDailyIssue, "subject" | "previewText" | "contentJson">,
  ctx: NewsEmailContext,
): RenderedNewsEmail {
  const content = issue.contentJson as unknown as NewsIssueContent;
  const subject = issue.subject;
  const reason = `Prepared for your ${ctx.regionFocus} briefing in ${ctx.briefingLanguage}.`;

  const text = [
    "OneNews",
    "",
    ctx.date,
    reason,
    "",
    content.openingLine,
    "",
    "Today’s brief",
    ...content.topStories.flatMap((s) => [
      `• ${s.title} (${s.source})`,
      `  ${s.summary}`,
      ...(s.whyItMatters ? [`  Why it matters: ${s.whyItMatters}`] : []),
      `  ${s.url}`,
    ]),
    ...(content.oneStoryToWatch
      ? ["", "One story to watch", `• ${content.oneStoryToWatch.title}`, `  ${content.oneStoryToWatch.note}`]
      : []),
    ...(content.quietContext ? ["", "Quiet context", content.quietContext] : []),
    "",
    "Sources",
    ...content.sources.map((s) => `- ${s.source}: ${s.url}`),
    "",
    "You’re receiving OneNews from OneRead.",
    `Unsubscribe: ${ctx.links.unsubscribe}`,
  ].join("\n");

  const storyBlocks = content.topStories
    .map(
      (s) => `
      <div style="margin:0 0 22px 0;">
        <a href="${escapeAttr(s.url)}" style="color:#1B2430;text-decoration:none;font-family:ui-serif,Georgia,Cambria,serif;font-size:18px;line-height:1.35;font-weight:600;">${escapeHtml(s.title)}</a>
        <div style="margin-top:3px;font-size:11.5px;letter-spacing:0.04em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(s.source)}</div>
        <p style="margin:8px 0 0 0;color:#42505F;font-size:14px;line-height:1.65;">${escapeHtml(s.summary)}</p>
        ${s.whyItMatters ? `<p style="margin:6px 0 0 0;color:#5B6877;font-size:13.5px;line-height:1.6;"><strong style="color:#1B2430;">Why it matters.</strong> ${escapeHtml(s.whyItMatters)}</p>` : ""}
        <div style="margin-top:8px;"><a href="${escapeAttr(s.url)}" style="color:${ACCENT};font-size:12.5px;">Read the source →</a></div>
      </div>`,
    )
    .join("");

  const html = `
<!doctype html>
<html lang="${htmlLang(ctx.briefingLanguage)}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(issue.previewText ?? content.openingLine)}</div>
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#1B2430;">
    <div style="text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;font-size:12.5px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};">OneNews</div>
    <div style="text-align:center;margin-top:6px;font-size:12px;color:#7A8794;">${escapeHtml(ctx.date)}</div>
    <hr style="border:none;border-top:1px solid ${BORDER};margin:26px 0;" />
    <div style="font-size:12.5px;color:${ACCENT};margin-bottom:14px;">${escapeHtml(reason)}</div>
    <p style="margin:0 0 24px 0;font-family:ui-serif,Georgia,Cambria,serif;font-size:18px;line-height:1.5;color:#1B2430;">${escapeHtml(content.openingLine)}</p>
    <h2 style="margin:0 0 16px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">Today’s brief</h2>
    ${storyBlocks}
    ${
      content.oneStoryToWatch
        ? `<div style="border-left:3px solid ${ACCENT};padding-left:14px;margin:8px 0 22px 0;"><div style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:${ACCENT};">One story to watch</div><div style="margin-top:6px;font-family:ui-serif,Georgia,Cambria,serif;font-size:16px;color:#1B2430;">${escapeHtml(content.oneStoryToWatch.title)}</div><p style="margin:6px 0 0 0;color:#42505F;font-size:14px;line-height:1.6;">${escapeHtml(content.oneStoryToWatch.note)}</p></div>`
        : ""
    }
    ${
      content.quietContext
        ? `<div style="margin:0 0 22px 0;"><div style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:${ACCENT};">Quiet context</div><p style="margin:6px 0 0 0;color:#42505F;font-size:14px;line-height:1.65;">${escapeHtml(content.quietContext)}</p></div>`
        : ""
    }
    <h2 style="margin:24px 0 10px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">Sources</h2>
    <ul style="margin:0;padding-left:18px;color:#42505F;font-size:13px;line-height:1.7;">
      ${content.sources.map((s) => `<li><a href="${escapeAttr(s.url)}" style="color:${ACCENT};">${escapeHtml(s.source)}</a></li>`).join("")}
    </ul>
    <hr style="border:none;border-top:1px solid ${BORDER};margin:32px 0 18px 0;" />
    <div style="text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;color:#7A8794;font-size:13px;">The news, without a feed to fall into.</div>
    <div style="margin-top:10px;text-align:center;font-size:11.5px;color:#7A8794;">You’re receiving OneNews from OneRead.</div>
    <div style="margin-top:4px;text-align:center;font-size:11.5px;"><a href="${escapeAttr(ctx.links.unsubscribe)}" style="color:#7A8794;">Unsubscribe</a></div>
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
