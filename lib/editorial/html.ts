/**
 * HTML escaping for editorial email output.
 *
 * Editorial fields are admin-controlled, but "trusted author" is not the same
 * as "safe to interpolate". Everything that reaches an email goes through
 * here, so a pasted snippet or a stray angle bracket cannot become markup.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Attribute values need the same escaping; the alias documents intent. */
export function escapeAttr(value: string): string {
  return escapeHtml(value);
}
