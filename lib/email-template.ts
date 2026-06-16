/**
 * One Read — daily email template.
 *
 * Two outputs: a plain-text version for deliverability and a small,
 * editorial HTML version that mirrors the website's quiet aesthetic.
 *
 * The personalization line is intentionally subtle:
 *   single interest  → "Picked for your interest in {Topic}."
 *   multiple         → "Picked from your {Topic} track today."
 *   Turkish          → "Yapay zekâ ilgin için seçildi." / "Bugün {Konu} hattından."
 *
 * When the LLM produced a structured summary we prefer its `subject`,
 * `displayTitle`, `oneLineHook`, and `whyThisArticle` over the raw RSS
 * title — that's how a Turkish subscriber whose source language is
 * English actually gets a Turkish email.
 */

import { topicBySlug } from "./topics";
import { getEmailStrings, localeFor, htmlLangFor } from "./i18n";
import type { StructuredSummary } from "./llm/types";

export interface DailyEmailContext {
  /** ISO date string the email is for, e.g. "2026-06-14". */
  date: string;
  /** Recipient's primary topic slug, used to frame the personalization line. */
  matchedTopic: string;
  /** True if the subscriber has more than one selected interest. */
  hasMultipleInterests: boolean;
  /** Summary language name (e.g. "English", "Turkish", "Spanish", "French",
   *  "German") — drives every chrome translation via `lib/i18n.ts`. */
  summaryLanguage: string;
  article: {
    title: string;
    url: string;
    sourceName: string;
  };
  summary: {
    bodyText: string;
    bodyHtml?: string;
    /** Optional structured fields from the LLM. */
    structured?: StructuredSummary;
  };
  /** Per-subscriber URLs; kept opaque here. */
  links: {
    feedbackLoved: string;
    feedbackLiked: string;
    feedbackMeh: string;
    feedbackDisliked: string;
    unsubscribe: string;
  };
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderDailyEmail(ctx: DailyEmailContext): RenderedEmail {
  const lang = ctx.summaryLanguage;
  const topic = topicBySlug(ctx.matchedTopic);
  const topicLabel = topic?.label ?? humanizeSlug(ctx.matchedTopic);
  const structured = ctx.summary.structured;

  // Display title: prefer the LLM's translated/edited title, fall back to
  // the raw RSS title. This is how Turkish subscribers reading English
  // sources see a Turkish headline above the article.
  const displayTitle =
    structured?.displayTitle?.trim() || ctx.article.title;

  // Subject: prefer the LLM's editorial subject. Otherwise use a calm
  // composed fallback.
  const llmSubject = structured?.subject?.trim();
  const subject = llmSubject
    ? `One Read · ${llmSubject}`
    : `One Read · ${topicLabel} — ${displayTitle}`;

  // Optional hook + why-this lines (only present from real LLM summaries).
  const hook = structured?.oneLineHook?.trim() ?? "";
  const whyThis = structured?.whyThisArticle?.trim() ?? "";
  const readingTime = structured?.readingTime?.trim() ?? "";

  const t = getEmailStrings(lang);

  const personalizationLine = t.personalizationLine(
    topicLabel,
    ctx.hasMultipleInterests,
  );

  const readLabel = t.readLabel;
  const reactionPrompt = t.reactionPrompt;
  const reactionLoved = t.reactionLoved;
  const reactionLiked = t.reactionLiked;
  const reactionMeh = t.reactionMeh;
  const reactionDisliked = t.reactionDisliked;
  const unsubscribeLabel = t.unsubscribeLabel;
  const tagline = t.tagline;
  const originalTitleLabel = t.originalTitleLabel;

  /* ------------------------------------------ Plain text version */
  const text = [
    "One · Read",
    "",
    formatDate(ctx.date, lang),
    readingTime ? `· ${readingTime}` : "",
    "",
    `— ${ctx.article.sourceName}`,
    personalizationLine,
    "",
    displayTitle,
    displayTitle !== ctx.article.title
      ? `(${originalTitleLabel}: ${ctx.article.title})`
      : "",
    "",
    whyThis,
    whyThis ? "" : "",
    ctx.summary.bodyText,
    "",
    `${readLabel}: ${ctx.article.url}`,
    "",
    `${reactionPrompt}`,
    `  ${reactionLoved}: ${ctx.links.feedbackLoved}`,
    `  ${reactionLiked}: ${ctx.links.feedbackLiked}`,
    `  ${reactionMeh}: ${ctx.links.feedbackMeh}`,
    `  ${reactionDisliked}: ${ctx.links.feedbackDisliked}`,
    "",
    tagline,
    "",
    `${unsubscribeLabel}: ${ctx.links.unsubscribe}`,
  ]
    .filter((line) => line !== "")
    .join("\n")
    // re-introduce blank-line breathing room between paragraphs.
    .replace(/(\n)(— |[A-ZÇĞİÖŞÜ])/g, "\n\n$2");

  /* ------------------------------------------ HTML version */
  const summaryHtml =
    ctx.summary.bodyHtml ??
    `<p style="margin:0;color:#1B1612;font-size:15.5px;line-height:1.65;">${escapeHtml(ctx.summary.bodyText)}</p>`;

  const whyThisBlock = whyThis
    ? `<div style="margin:0 0 16px 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;color:#6B5F50;line-height:1.55;">${escapeHtml(whyThis)}</div>`
    : "";

  const originalTitleBlock =
    displayTitle !== ctx.article.title
      ? `<div style="margin:6px 0 18px 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:11.5px;color:#9C8F7E;">${escapeHtml(originalTitleLabel)}: <span style="color:#6B5F50;">${escapeHtml(ctx.article.title)}</span></div>`
      : "";

  const readingTimeBlock = readingTime
    ? `<span style="margin-left:10px;color:#9C8F7E;">· ${escapeHtml(readingTime)}</span>`
    : "";

  const html = `
<!doctype html>
<html lang="${htmlLangFor(lang)}">
<head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F6F1E6;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;font-family:ui-serif,Georgia,Cambria,serif;color:#1B1612;">
    <div style="text-align:center;font-size:12.5px;letter-spacing:0.22em;text-transform:uppercase;font-style:italic;color:#6B5F50;">
      One&nbsp;·&nbsp;Read
    </div>
    <div style="text-align:center;margin-top:6px;font-size:12px;color:#9C8F7E;font-family:ui-sans-serif,system-ui,sans-serif;">
      ${escapeHtml(formatDate(ctx.date, lang))}${readingTimeBlock}
    </div>

    <hr style="border:none;border-top:1px solid #E6DCC8;margin:28px 0;" />

    <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#9C8F7E;letter-spacing:0.06em;text-transform:uppercase;">
      ${escapeHtml(ctx.article.sourceName)}
    </div>
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12.5px;color:#C97A2C;font-style:italic;margin-top:4px;">
      ${escapeHtml(personalizationLine)}
    </div>

    <h1 style="font-size:26px;line-height:1.18;margin:14px 0 14px 0;font-weight:500;letter-spacing:-0.012em;color:#1B1612;">
      ${escapeHtml(displayTitle)}
    </h1>
    ${originalTitleBlock}
    ${whyThisBlock}

    ${
      hook && !ctx.summary.bodyHtml
        ? `<div style="margin:0 0 18px 0;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;color:#6B5F50;font-size:15px;line-height:1.5;">${escapeHtml(hook)}</div>`
        : ""
    }

    <div>${summaryHtml}</div>

    <div style="margin-top:28px;">
      <a href="${escapeAttr(ctx.article.url)}" style="display:inline-block;background:#1B1612;color:#FDFBF5;text-decoration:none;padding:12px 18px;border-radius:10px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;">
        ${escapeHtml(readLabel)} →
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #E6DCC8;margin:32px 0 22px 0;" />

    <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12.5px;color:#6B5F50;text-align:center;">
      ${escapeHtml(reactionPrompt)}
    </div>
    <div style="text-align:center;margin-top:10px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12.5px;">
      <a href="${escapeAttr(ctx.links.feedbackLoved)}" style="color:#1B1612;text-decoration:none;margin:0 6px;">${escapeHtml(reactionLoved)}</a>
      <span style="color:#D4C8B0;">·</span>
      <a href="${escapeAttr(ctx.links.feedbackLiked)}" style="color:#1B1612;text-decoration:none;margin:0 6px;">${escapeHtml(reactionLiked)}</a>
      <span style="color:#D4C8B0;">·</span>
      <a href="${escapeAttr(ctx.links.feedbackMeh)}" style="color:#6B5F50;text-decoration:none;margin:0 6px;">${escapeHtml(reactionMeh)}</a>
      <span style="color:#D4C8B0;">·</span>
      <a href="${escapeAttr(ctx.links.feedbackDisliked)}" style="color:#6B5F50;text-decoration:none;margin:0 6px;">${escapeHtml(reactionDisliked)}</a>
    </div>

    <div style="margin-top:36px;text-align:center;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;color:#9C8F7E;font-size:13px;">
      ${escapeHtml(tagline)}
    </div>
    <div style="margin-top:8px;text-align:center;font-family:ui-sans-serif,system-ui,sans-serif;font-size:11.5px;color:#9C8F7E;">
      <a href="${escapeAttr(ctx.links.unsubscribe)}" style="color:#9C8F7E;">${escapeHtml(unsubscribeLabel)}</a>
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, text, html };
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  const locale = localeFor(lang);
  return d.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
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
