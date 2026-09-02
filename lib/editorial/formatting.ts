/**
 * Small, email-safe formatting language for editorial copy.
 *
 * Supports paragraphs, ## / ### headings, bullet/numbered lists, > pull
 * quotes, dividers, **bold**, _italic_, links and full-width inline images.
 * Arbitrary HTML is escaped before it reaches the email.
 */
import { escapeHtml } from "./html";

export function editorialTextToHtml(value: string): string {
  return value
    .trim()
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(renderBlock)
    .join("");
}

export function editorialTextToPlainText(value: string): string {
  return value
    .replace(
      /!\[([^\]]*)\]\((https:\/\/[^)\s]+)(?:\s+"([^"]*)")?\)/giu,
      (_match, alt: string, url: string, caption?: string) =>
        `[Image: ${alt || "Editorial image"}]${caption ? ` ${caption}` : ""} (${url})`,
    )
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/_([^_\n]+)_/gu, "$1")
    .replace(/^[ \t]*#{1,3}[ \t]+/gmu, "")
    .replace(/^[ \t]*>[ \t]?/gmu, "")
    .replace(/^[ \t]*[-*][ \t]+/gmu, "• ")
    .trim();
}

function renderBlock(block: string): string {
  const image = block.match(
    /^!\[([^\]]*)\]\((https:\/\/[^)\s]+)(?:\s+"([^"]*)")?\)$/iu,
  );
  if (image) {
    const [, alt, url, caption] = image;
    return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:26px 0 28px;">
      <tr><td><img src="${escapeHtml(url)}" alt="${escapeHtml(alt || "")}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:12px;line-height:100%;outline:none;text-decoration:none;"></td></tr>
      ${caption ? `<tr><td style="padding:8px 2px 0;font:11px/1.5 Arial,Helvetica,sans-serif;color:#8A8A86;">${escapeHtml(caption)}</td></tr>` : ""}
    </table>`;
  }
  if (block === "---") {
    return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td height="1" style="height:1px;background:#D8D8D3;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
  }
  if (block.startsWith("## ")) {
    return `<h2 style="margin:28px 0 12px;font:700 22px/1.25 Georgia,'Times New Roman',serif;color:inherit;">${inline(block.slice(3))}</h2>`;
  }
  if (block.startsWith("### ")) {
    return `<h3 style="margin:24px 0 10px;font:700 12px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:inherit;">${inline(block.slice(4))}</h3>`;
  }

  const lines = block.split("\n").map((line) => line.trim());
  if (lines.every((line) => /^[-*]\s+/.test(line))) {
    return `<ul style="margin:0 0 20px;padding-left:22px;">${lines
      .map((line) => `<li style="margin:0 0 8px;">${inline(line.replace(/^[-*]\s+/, ""))}</li>`)
      .join("")}</ul>`;
  }
  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    return `<ol style="margin:0 0 20px;padding-left:22px;">${lines
      .map((line) => `<li style="margin:0 0 8px;">${inline(line.replace(/^\d+\.\s+/, ""))}</li>`)
      .join("")}</ol>`;
  }
  if (lines.every((line) => line.startsWith(">"))) {
    const quote = lines.map((line) => line.replace(/^>\s?/, "")).join("\n");
    return `<blockquote style="margin:24px 0;padding:4px 0 4px 18px;border-left:3px solid currentColor;font:italic 17px/1.6 Georgia,'Times New Roman',serif;opacity:.82;">${inline(quote).replace(/\n/g, "<br>")}</blockquote>`;
  }

  return `<p style="margin:0 0 18px;">${inline(block).replace(/\n/g, "<br>")}</p>`;
}

function inline(value: string): string {
  const links: string[] = [];
  const withTokens = value.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu,
    (_match, label: string, url: string) => {
      const token = `\u0000LINK${links.length}\u0000`;
      links.push(
        `<a href="${escapeHtml(url)}" style="color:inherit;text-decoration:underline;">${escapeHtml(label)}</a>`,
      );
      return token;
    },
  );
  let rendered = escapeHtml(withTokens)
    .replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/gu, "<em>$1</em>");
  links.forEach((link, index) => {
    rendered = rendered.replace(`\u0000LINK${index}\u0000`, link);
  });
  return rendered;
}
