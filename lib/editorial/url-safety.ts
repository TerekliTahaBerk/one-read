/**
 * Link safety for editorial content.
 *
 * This is a scheme/shape check, not a reputation service: it answers "can this
 * string safely become an href", never "is this publication trustworthy".
 * Judging a source stays with the human editor.
 */

/** http(s) only. Rejects javascript:, data:, mailto:, file: and malformed input. */
export function isSafeHttpUrl(value: string | null | undefined): boolean {
  const url = parseUrl(value);
  if (!url) return false;
  return url.protocol === "http:" || url.protocol === "https:";
}

/** https only, for content OneRead embeds rather than links out to. */
export function isSafeHttpsUrl(value: string | null | undefined): boolean {
  return parseUrl(value)?.protocol === "https:";
}

/**
 * Publisher-ish host label used to reason about source independence. Two
 * sources sharing this label are treated as one voice, not two.
 */
export function sourceHostLabel(value: string | null | undefined): string | null {
  const url = parseUrl(value);
  if (!url?.hostname) return null;
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function parseUrl(value: string | null | undefined): URL | null {
  const raw = value?.trim();
  if (!raw) return null;
  // Whitespace or control characters inside a link mean it was mangled in
  // transit. The parser tolerates some of them; editorial output should not.
  if (/\s/u.test(raw)) return null;
  const hasControlChar = Array.from(raw).some((char) => {
    const code = char.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
  if (hasControlChar) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}
