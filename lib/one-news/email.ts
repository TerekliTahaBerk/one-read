import { escapeAttr, escapeHtml } from "@/lib/editorial/html";
import { getEmailStrings } from "@/lib/i18n";
import { isSafeHttpUrl } from "@/lib/editorial/url-safety";
import type { OneNewsRenderModel } from "./render-model";

/**
 * OneNews email rendering.
 *
 * Both renderers consume the canonical render model, so the admin preview, a
 * future test send and a future production send cannot drift apart. The visual
 * language follows OneRead's existing editorial shell — table layout, inlined
 * conservative CSS, no scripts, no tracking widgets, no "related stories" and
 * no engagement furniture. Sections read as editorial sections, not cards.
 */

export interface OneNewsEmailLinks {
  /** Rendered as the footer link. Callers pass a real, per-recipient URL. */
  unsubscribe: string;
}

export interface RenderedOneNewsEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderOneNewsEmail(
  model: OneNewsRenderModel,
  links: OneNewsEmailLinks,
): RenderedOneNewsEmail {
  return {
    subject: model.subject,
    text: renderOneNewsText(model, links),
    html: renderOneNewsHtml(model, links),
  };
}

/**
 * A deliberately written plain-text edition, not a stripped copy of the HTML.
 * Optional sections simply do not appear; nothing leaves a hole behind.
 */
export function renderOneNewsText(
  model: OneNewsRenderModel,
  links: OneNewsEmailLinks,
): string {
  const t = getEmailStrings(model.language);
  const blocks: string[] = [];

  blocks.push(`${model.labels.product} · ${model.dateLabel} · ${model.readingLabel}`);
  blocks.push(model.headline.toUpperCase());
  blocks.push(model.dek);

  if (model.developing && model.asOfLabel) {
    blocks.push(`${model.developingNotice}\n${model.labels.asOf}: ${model.asOfLabel}`);
  } else if (model.asOfLabel) {
    blocks.push(`${model.labels.asOf}: ${model.asOfLabel}`);
  }

  for (const section of model.sections) {
    blocks.push(`${section.label}\n${section.text}`);
  }

  if (model.sources.length > 0) {
    const lines = model.sources.map((source) => {
      const heading = [
        `${source.position}. ${source.publication} — ${source.title}`,
        source.isPrimary ? `[${source.typeLabel}]` : null,
      ]
        .filter(Boolean)
        .join(" ");
      return [
        heading,
        `   ${source.url}`,
        source.dateLabel ? `   ${source.dateLabel}` : null,
        source.note ? `   ${source.note}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    });
    blocks.push(`${model.labels.sources}\n${lines.join("\n\n")}`);
  }

  if (model.corrections.length > 0) {
    const lines = model.corrections.map(
      (correction) => `${correction.label} · ${correction.dateLabel}\n${correction.note}`,
    );
    blocks.push(`${model.labels.corrections}\n${lines.join("\n\n")}`);
  }

  blocks.push(model.closing);
  blocks.push(`${model.labels.footer}\n${t.unsubscribeLabel}: ${links.unsubscribe}`);

  return blocks.join("\n\n");
}

export function renderOneNewsHtml(
  model: OneNewsRenderModel,
  links: OneNewsEmailLinks,
): string {
  const t = getEmailStrings(model.language);
  // The footer link is caller-supplied. It is still checked here so a
  // misconfigured caller cannot put a javascript: href in front of a reader.
  const unsubscribe = isSafeHttpUrl(links.unsubscribe) ? links.unsubscribe : "";

  const preheader = model.previewText
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent;">${escapeHtml(model.previewText)}${"&nbsp;&zwnj;".repeat(80)}</div>`
    : "";

  const developing = model.developing && model.asOfLabel
    ? `<tr>
          <td class="body-pad" style="padding:0 32px 22px;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFF8DC" style="width:100%;border:1px solid #E4D9A4;border-radius:10px;">
              <tr>
                <td style="padding:14px 16px;font:13px/1.6 Arial,Helvetica,sans-serif;color:#4A431F;">
                  <strong style="display:block;margin-bottom:4px;">${escapeHtml(model.developingNotice ?? "")}</strong>
                  ${escapeHtml(model.labels.asOf)}: <time datetime="${escapeAttr(model.asOfIso ?? "")}">${escapeHtml(model.asOfLabel)}</time>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : model.asOfLabel
      ? `<tr>
          <td class="body-pad" style="padding:0 32px 22px;font:12.5px/1.6 Arial,Helvetica,sans-serif;color:#6B6A63;">
            ${escapeHtml(model.labels.asOf)}: <time datetime="${escapeAttr(model.asOfIso ?? "")}">${escapeHtml(model.asOfLabel)}</time>
          </td>
        </tr>`
      : "";

  const sections = model.sections
    .map(
      (section) => `<tr>
          <td class="body-pad" style="padding:0 32px 26px;">
            <h2 style="margin:0 0 10px;font:700 12px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8A8880;">${escapeHtml(section.label)}</h2>
            <div style="font:16px/1.74 Arial,Helvetica,sans-serif;color:#2D2C28;">${section.html}</div>
          </td>
        </tr>`,
    )
    .join("");

  const sources = model.sources.length
    ? `<tr>
          <td class="body-pad" style="padding:6px 32px 26px;">
            <h2 style="margin:0 0 12px;font:700 12px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8A8880;">${escapeHtml(model.labels.sources)}</h2>
            <ol style="margin:0;padding-left:20px;font:14px/1.65 Arial,Helvetica,sans-serif;color:#3A3934;">
              ${model.sources
                .map(
                  (source) => `<li style="margin:0 0 14px;">
                    <a href="${escapeAttr(source.url)}" style="color:#171714;text-decoration:underline;">${escapeHtml(source.publication)} — ${escapeHtml(source.title)}</a>
                    <span style="display:block;margin-top:3px;font-size:12px;color:#77766F;">${escapeHtml(source.typeLabel)}${source.dateLabel ? ` · ${escapeHtml(source.dateLabel)}` : ""}</span>
                    ${source.note ? `<span style="display:block;margin-top:3px;font-size:12.5px;color:#5C5B55;">${escapeHtml(source.note)}</span>` : ""}
                  </li>`,
                )
                .join("")}
            </ol>
          </td>
        </tr>`
    : "";

  const corrections = model.corrections.length
    ? `<tr>
          <td class="body-pad" style="padding:0 32px 26px;">
            <h2 style="margin:0 0 10px;font:700 12px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8A8880;">${escapeHtml(model.labels.corrections)}</h2>
            ${model.corrections
              .map(
                (correction) => `<p style="margin:0 0 10px;font:13.5px/1.65 Arial,Helvetica,sans-serif;color:#3A3934;">
                  <strong>${escapeHtml(correction.label)}</strong> · ${escapeHtml(correction.dateLabel)}<br>${escapeHtml(correction.note)}
                </p>`,
              )
              .join("")}
          </td>
        </tr>`
    : "";

  return `<!doctype html>
<html lang="${escapeAttr(model.htmlLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(model.subject)}</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    table{border-collapse:collapse!important}
    @media screen and (max-width:680px){
      .page-pad{padding:0!important}
      .masthead{padding:24px 20px!important}
      .body-pad{padding-left:22px!important;padding-right:22px!important}
      .headline{font-size:30px!important;line-height:1.1!important}
      .email-shell{border-radius:0!important}
    }
  </style>
</head>
<body style="width:100%!important;margin:0!important;padding:0!important;background:#EFEEE9;color:#171714;">
${preheader}
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#EFEEE9">
  <tr>
    <td align="center" class="page-pad" style="padding:28px 20px 44px;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="email-shell" bgcolor="#FFFFFF" style="width:100%;max-width:680px;border:1px solid #D8D6CF;border-radius:18px;overflow:hidden;">
        <tr>
          <td class="masthead" bgcolor="#171714" style="padding:28px 32px 26px;color:#FFFFFF;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font:700 23px/1 Georgia,'Times New Roman',serif;letter-spacing:-.02em;color:#FFFFFF;">OneRead<span style="color:#FFE144;">.</span></td>
                <td align="right" style="font:700 10px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#B9B8B2;">${escapeHtml(model.labels.product)}</td>
              </tr>
            </table>
            <p style="margin:18px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#B9B8B2;">${escapeHtml(model.dateLabel)} · ${escapeHtml(model.readingLabel)}</p>
          </td>
        </tr>
        <tr>
          <td class="body-pad" style="padding:32px 32px 8px;">
            <h1 class="headline" style="margin:0 0 14px;font:700 38px/1.08 Georgia,'Times New Roman',serif;letter-spacing:-.03em;color:#171714;">${escapeHtml(model.headline)}</h1>
            <p style="margin:0 0 22px;font:17px/1.6 Georgia,'Times New Roman',serif;color:#4E4D47;">${escapeHtml(model.dek)}</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr><td width="52" height="4" bgcolor="#FFE144" style="width:52px;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
          </td>
        </tr>
        ${developing}
        ${sections}
        ${sources}
        ${corrections}
        <tr>
          <td class="body-pad" style="padding:4px 32px 30px;">
            <p style="margin:0;font:italic 15px/1.6 Georgia,'Times New Roman',serif;color:#66645D;">${escapeHtml(model.closing)}</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:22px 28px 30px;border-top:1px solid #E5E3DD;">
            <p style="margin:0;font:10.5px/1.65 Arial,Helvetica,sans-serif;color:#96948D;letter-spacing:.02em;">
              <strong style="color:#626159;">OneRead</strong> · ${escapeHtml(model.labels.footer)}
              <br><a href="${escapeAttr(unsubscribe)}" style="color:#77766F;text-decoration:underline;">${escapeHtml(t.unsubscribeLabel)}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
