import type { LingoDailyLesson } from "@prisma/client";
import type { LingoLessonContent } from "./types";

export interface LingoEmailContext {
  date: string;
  targetLanguage: string;
  nativeLanguage: string;
  level: string;
  links: {
    unsubscribe: string;
  };
}

export interface RenderedLingoEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderLingoEmail(
  lesson: Pick<LingoDailyLesson, "subject" | "previewText" | "contentJson">,
  ctx: LingoEmailContext,
): RenderedLingoEmail {
  const content = lesson.contentJson as unknown as LingoLessonContent;
  const subject = lesson.subject;
  const reason = `Prepared for your ${ctx.targetLanguage} practice at ${ctx.level} level.`;

  const text = [
    "OneLingo",
    "",
    ctx.date,
    reason,
    "",
    content.openingLine,
    "",
    content.lessonTitle,
    content.lessonIntro,
    "",
    "Useful words",
    ...content.words.map((w) => `- ${w.word}${w.pronunciation ? ` (${w.pronunciation})` : ""}: ${w.meaning}\n  ${w.example}`),
    "",
    "Phrase",
    ...content.phrases.map((p) => `- ${p.phrase}\n  ${p.translation}\n  ${p.whenToUse}`),
    "",
    `${content.grammarNote.title}: ${content.grammarNote.explanation}`,
    "",
    "Mini practice",
    ...content.exercises.map((e, i) => `${i + 1}. ${e.prompt}`),
    "",
    "Answer key",
    ...content.exercises.map((e, i) => `${i + 1}. ${e.answer}`),
    "",
    content.oneThingToRemember,
    content.tomorrowHint ?? "",
    "",
    `Unsubscribe: ${ctx.links.unsubscribe}`,
  ].filter(Boolean).join("\n");

  const html = `
<!doctype html>
<html lang="${htmlLang(ctx.nativeLanguage)}">
<head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F6F1E6;">
  <div style="max-width:540px;margin:0 auto;padding:32px 24px;font-family:ui-sans-serif,system-ui,sans-serif;color:#1B1612;">
    <div style="text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;font-size:12.5px;letter-spacing:0.22em;text-transform:uppercase;color:#6B5F50;">OneLingo</div>
    <div style="text-align:center;margin-top:6px;font-size:12px;color:#8A7D6B;">${escapeHtml(ctx.date)}</div>
    <hr style="border:none;border-top:1px solid #E6DCC8;margin:28px 0;" />
    <div style="font-size:12.5px;color:#7C5DB8;margin-bottom:16px;">${escapeHtml(reason)}</div>
    <p style="margin:0 0 18px 0;font-family:ui-serif,Georgia,Cambria,serif;font-size:18px;line-height:1.5;color:#1B1612;">${escapeHtml(content.openingLine)}</p>
    <h1 style="margin:0 0 8px 0;font-family:ui-serif,Georgia,Cambria,serif;font-size:26px;line-height:1.18;font-weight:500;">${escapeHtml(content.lessonTitle)}</h1>
    <p style="margin:0 0 24px 0;color:#5F5548;font-size:14px;line-height:1.65;">${escapeHtml(content.lessonIntro)}</p>
    ${section("Useful words", content.words.map((w) => `<li><strong>${escapeHtml(w.word)}</strong>${w.pronunciation ? ` <span style="color:#8A7D6B;">(${escapeHtml(w.pronunciation)})</span>` : ""}<br /><span style="color:#5F5548;">${escapeHtml(w.meaning)}</span><br /><em style="color:#6B5F50;">${escapeHtml(w.example)}</em></li>`).join(""))}
    ${section("Phrase", content.phrases.map((p) => `<li><strong>${escapeHtml(p.phrase)}</strong><br /><span style="color:#5F5548;">${escapeHtml(p.translation)}</span><br /><span style="color:#6B5F50;">${escapeHtml(p.whenToUse)}</span></li>`).join(""))}
    <div style="border-left:3px solid #7C5DB8;padding-left:14px;margin:24px 0;color:#5F5548;font-size:14px;line-height:1.6;"><strong style="color:#1B1612;">${escapeHtml(content.grammarNote.title)}</strong><br />${escapeHtml(content.grammarNote.explanation)}</div>
    ${section("Mini practice", content.exercises.map((e, i) => `<li>${i + 1}. ${escapeHtml(e.prompt)}</li>`).join(""))}
    ${section("Answer key", content.exercises.map((e, i) => `<li>${i + 1}. ${escapeHtml(e.answer)}</li>`).join(""))}
    <p style="margin:24px 0 0 0;color:#1B1612;font-size:14px;line-height:1.65;">${escapeHtml(content.oneThingToRemember)}</p>
    ${content.tomorrowHint ? `<p style="margin:12px 0 0 0;color:#8A7D6B;font-size:13px;line-height:1.55;">${escapeHtml(content.tomorrowHint)}</p>` : ""}
    <hr style="border:none;border-top:1px solid #E6DCC8;margin:32px 0 18px 0;" />
    <div style="text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;color:#8A7D6B;font-size:13px;">Small language practice, every morning.</div>
    <div style="margin-top:8px;text-align:center;font-size:11.5px;"><a href="${escapeAttr(ctx.links.unsubscribe)}" style="color:#8A7D6B;">Unsubscribe</a></div>
  </div>
</body>
</html>`.trim();

  return { subject, text, html };
}

function section(title: string, items: string): string {
  return `<h2 style="margin:24px 0 10px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7C5DB8;">${escapeHtml(title)}</h2><ul style="margin:0;padding-left:18px;color:#1B1612;font-size:14px;line-height:1.65;">${items}</ul>`;
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
